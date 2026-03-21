const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const https = require('https');
const url = require('url');
const querystring = require('querystring');
const nodemailer = require('nodemailer');
const { handleAgentRequest } = require('./agent.js');

// ═══════════════════════════════════════════
//  GOOGLE OAUTH CONFIG
// ═══════════════════════════════════════════
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// ═══════════════════════════════════════════
//  EMAIL VERIFICATION
// ═══════════════════════════════════════════
const pendingVerifications = {}; // { email: { code, name, salt, hash, expiresAt } }

// Email transporter (using Gmail SMTP — set env vars SMTP_EMAIL and SMTP_PASS)
// For Gmail: enable "App Passwords" at https://myaccount.google.com/apppasswords
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

async function sendVerificationEmail(email, code) {
  // Send real email via Gmail SMTP
  try {
    await emailTransporter.sendMail({
      from: `"Surya AI" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `${code} is your Surya AI verification code`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px; color: white;">☀</span>
            </div>
            <h2 style="margin: 16px 0 4px; color: #1a1a1a;">Verify your email</h2>
            <p style="color: #666; font-size: 14px;">Enter this code in Surya AI to complete sign up</p>
          </div>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #f97316;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `
    });
    console.log(`[VERIFY] Email sent to ${email}`);
  } catch (err) {
    console.log(`[VERIFY] Email failed for ${email}, error: ${err.message}`);
  }
  // Always log to console as fallback
  console.log(`[VERIFY] Code for ${email}: ${code}`);
}

// ═══════════════════════════════════════════
//  AUTH: Simple JSON file-based user database
// ═══════════════════════════════════════════
const DB_PATH = path.join(__dirname, 'data');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const CHATS_FILE = path.join(DB_PATH, 'chats.json');

// Ensure data directory exists
if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(CHATS_FILE)) fs.writeFileSync(CHATS_FILE, '{}');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function readChats() {
  try { return JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8')); } catch { return {}; }
}
function writeChats(chats) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const test = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return test === hash;
}
function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

// Parse JSON body from POST requests
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  // CORS headers for all API routes
  if (req.url.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
  }

  // ═══════════════════════════════════════════
  //  GOOGLE OAUTH ROUTES
  // ═══════════════════════════════════════════

  // Step 1: Redirect to Google
  if (req.url === '/auth/google' && req.method === 'GET') {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const redirectUri = `${proto}://${req.headers.host}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    res.end();
    return;
  }

  // Step 2: Google callback — exchange code for token and get user info
  if (req.url.startsWith('/auth/google/callback') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const code = parsedUrl.searchParams.get('code');
    if (!code) {
      res.writeHead(302, { Location: '/?auth_error=no_code' });
      res.end();
      return;
    }

    const proto = req.headers['x-forwarded-proto'] || 'http';
    const redirectUri = `${proto}://${req.headers.host}/auth/google/callback`;

    // Exchange code for tokens
    const tokenData = querystring.stringify({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenReq = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenData)
      }
    }, (tokenRes) => {
      let body = '';
      tokenRes.on('data', c => body += c);
      tokenRes.on('end', () => {
        try {
          const tokens = JSON.parse(body);
          if (!tokens.access_token) {
            res.writeHead(302, { Location: '/?auth_error=token_failed' });
            res.end();
            return;
          }

          // Get user info from Google
          const userReq = https.request({
            hostname: 'www.googleapis.com',
            path: '/oauth2/v2/userinfo',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
          }, (userRes) => {
            let uBody = '';
            userRes.on('data', c => uBody += c);
            userRes.on('end', () => {
              try {
                const gUser = JSON.parse(uBody);
                // Create or find user in our local DB
                const users = readUsers();
                let user = users.find(u => u.email === gUser.email);
                const token = generateToken();

                if (!user) {
                  user = {
                    id: crypto.randomUUID(),
                    email: gUser.email,
                    name: gUser.name || gUser.email.split('@')[0],
                    avatar: gUser.picture || null,
                    provider: 'google',
                    verified: true,
                    token,
                    createdAt: new Date().toISOString()
                  };
                  users.push(user);
                } else {
                  user.token = token;
                  user.avatar = gUser.picture || user.avatar;
                  user.name = gUser.name || user.name;
                }
                writeUsers(users);

                // Redirect back with auth data
                const authData = encodeURIComponent(JSON.stringify({
                  accessToken: token,
                  user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
                }));
                res.writeHead(302, { Location: `/?auth_success=${authData}` });
                res.end();
              } catch (e) {
                res.writeHead(302, { Location: '/?auth_error=user_fetch_failed' });
                res.end();
              }
            });
          });
          userReq.on('error', () => {
            res.writeHead(302, { Location: '/?auth_error=user_fetch_failed' });
            res.end();
          });
          userReq.end();
        } catch (e) {
          res.writeHead(302, { Location: '/?auth_error=token_parse_failed' });
          res.end();
        }
      });
    });
    tokenReq.on('error', () => {
      res.writeHead(302, { Location: '/?auth_error=token_request_failed' });
      res.end();
    });
    tokenReq.write(tokenData);
    tokenReq.end();
    return;
  }

  // ═══════════════════════════════════════════
  //  AUTH ENDPOINTS (Email — local server)
  // ═══════════════════════════════════════════

  // Sign Up — Step 1: Send verification code
  if (req.url === '/api/auth/sign-up' && req.method === 'POST') {
    parseBody(req).then(async ({ email, password, name }) => {
      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email and password are required' }));
        return;
      }
      const users = readUsers();
      if (users.find(u => u.email === email.toLowerCase())) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'An account with this email already exists' }));
        return;
      }
      // Generate OTP and store pending verification
      const code = generateOTP();
      const { salt, hash } = hashPassword(password);
      pendingVerifications[email.toLowerCase()] = {
        code,
        name: name || email.split('@')[0],
        salt, hash,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
      };

      // Send verification email
      try {
        await sendVerificationEmail(email, code);
      } catch (e) {
        console.log(`[VERIFY] Email send failed for ${email}, code: ${code}`);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ needsVerification: true, email: email.toLowerCase() }));
    }).catch(e => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // Sign Up — Step 2: Verify code and create account
  if (req.url === '/api/auth/verify' && req.method === 'POST') {
    parseBody(req).then(({ email, code }) => {
      if (!email || !code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email and code are required' }));
        return;
      }
      const pending = pendingVerifications[email.toLowerCase()];
      if (!pending) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No pending verification. Please sign up again.' }));
        return;
      }
      if (Date.now() > pending.expiresAt) {
        delete pendingVerifications[email.toLowerCase()];
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Verification code expired. Please sign up again.' }));
        return;
      }
      if (pending.code !== code.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid verification code' }));
        return;
      }

      // Code matches — create the user
      const users = readUsers();
      const token = generateToken();
      const user = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        name: pending.name,
        avatar: null,
        salt: pending.salt,
        hash: pending.hash,
        token,
        verified: true,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      writeUsers(users);
      delete pendingVerifications[email.toLowerCase()];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          accessToken: token,
          user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
        }
      }));
    }).catch(e => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // Resend verification code
  if (req.url === '/api/auth/resend-code' && req.method === 'POST') {
    parseBody(req).then(async ({ email }) => {
      const pending = pendingVerifications[email.toLowerCase()];
      if (!pending) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No pending verification. Please sign up again.' }));
        return;
      }
      const code = generateOTP();
      pending.code = code;
      pending.expiresAt = Date.now() + 10 * 60 * 1000;
      try {
        await sendVerificationEmail(email, code);
      } catch (e) {
        console.log(`[VERIFY] Resend failed for ${email}, code: ${code}`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }).catch(e => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // Sign In
  if (req.url === '/api/auth/sign-in' && req.method === 'POST') {
    parseBody(req).then(({ email, password }) => {
      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email and password are required' }));
        return;
      }
      const users = readUsers();
      const user = users.find(u => u.email === email.toLowerCase());
      if (!user || !verifyPassword(password, user.salt, user.hash)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }
      // Generate new token on login
      user.token = generateToken();
      writeUsers(users);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          accessToken: user.token,
          user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
        }
      }));
    }).catch(e => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // Delete Account — permanently removes user and all their data
  if (req.url === '/api/auth/delete-account' && req.method === 'DELETE') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    const users = readUsers();
    const userIndex = users.findIndex(u => u.token === token);
    if (userIndex === -1) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }
    const userId = users[userIndex].id;
    // Remove user from users list
    users.splice(userIndex, 1);
    writeUsers(users);
    // Remove user's chats
    const chats = readChats();
    if (chats[userId]) {
      delete chats[userId];
      writeChats(chats);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Account permanently deleted' }));
    return;
  }

  // Sign Out
  if (req.url === '/api/auth/sign-out' && req.method === 'POST') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (token) {
      const users = readUsers();
      const user = users.find(u => u.token === token);
      if (user) {
        user.token = null;
        writeUsers(users);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Get current user
  if (req.url === '/api/auth/me' && req.method === 'GET') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const users = readUsers();
    const user = users.find(u => u.token === token);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }
    }));
    return;
  }


  // ═══════════════════════════════════════════
  //  CHAT SYNC ENDPOINTS
  // ═══════════════════════════════════════════

  // Save chats
  if (req.url === '/api/chats/save' && req.method === 'POST') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const users = readUsers();
    const user = users.find(u => u.token === token);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    parseBody(req).then(({ chats }) => {
      const allChats = readChats();
      allChats[user.id] = chats;
      writeChats(allChats);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }).catch(e => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // Load chats
  if (req.url === '/api/chats/load' && req.method === 'GET') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const users = readUsers();
    const user = users.find(u => u.token === token);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    const allChats = readChats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ chats: allChats[user.id] || {} }));
    return;
  }
  // AI Agent API — SSE endpoint for browser automation
  if (req.url.startsWith('/api/agent?')) {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const task = urlParams.searchParams.get('task') || '';
    if (!task) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing task' }));
      return;
    }
    handleAgentRequest(req, res, task);
    return;
  }

  // Image generation API — uses Stable Horde (free, reliable)
  if (req.url.startsWith('/api/image?')) {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const prompt = urlParams.searchParams.get('prompt') || 'beautiful landscape';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // Step 1: Submit generation request
    const postData = JSON.stringify({
      prompt: prompt + ', high quality, detailed, 4k',
      params: { width: 512, height: 512, steps: 25 },
      nsfw: false,
      censor_nsfw: true
    });

    const submitReq = https.request({
      hostname: 'stablehorde.net',
      path: '/api/v2/generate/async',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '0000000000',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (submitRes) => {
      let body = '';
      submitRes.on('data', d => body += d);
      submitRes.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data.id) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to submit', detail: body }));
            return;
          }
          // Return the job ID — frontend will poll for status
          res.writeHead(200);
          res.end(JSON.stringify({ id: data.id, status: 'processing' }));
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Parse error' }));
        }
      });
    });
    submitReq.on('error', (e) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    submitReq.write(postData);
    submitReq.end();
    return;
  }

  // Image generation status check
  if (req.url.startsWith('/api/image-status?')) {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const jobId = urlParams.searchParams.get('id');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (!jobId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing job ID' }));
      return;
    }

    https.get(`https://stablehorde.net/api/v2/generate/status/${jobId}`, (statusRes) => {
      let body = '';
      statusRes.on('data', d => body += d);
      statusRes.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.done && data.generations && data.generations.length > 0) {
            res.writeHead(200);
            res.end(JSON.stringify({
              done: true,
              imageUrl: data.generations[0].img
            }));
          } else {
            res.writeHead(200);
            res.end(JSON.stringify({
              done: false,
              waitTime: data.wait_time || 0,
              queuePosition: data.queue_position || 0
            }));
          }
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Parse error' }));
        }
      });
    }).on('error', (e) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // DuckDuckGo search removed — using Grok's built-in web search instead

  const parsedPath = url.parse(req.url).pathname;
  let filePath = parsedPath === '/' ? '/index.html' : parsedPath;
  filePath = path.join(__dirname, 'frontend', filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback
        fs.readFile(path.join(__dirname, 'frontend', 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(500);
            res.end('Server Error');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallback);
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Surya AI running at http://localhost:${PORT}`);
});
