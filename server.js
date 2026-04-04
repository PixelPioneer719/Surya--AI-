require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
//  INSFORGE CONFIG (server-side proxy)
// ═══════════════════════════════════════════
const INSFORGE_BASE = process.env.INSFORGE_BASE;
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY;

// ═══════════════════════════════════════════
//  GOOGLE OAUTH CONFIG
// ═══════════════════════════════════════════
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_WORKSPACE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/spreadsheets'
].join(' ');

// ═══════════════════════════════════════════
//  GITHUB OAUTH CONFIG
// ═══════════════════════════════════════════
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// ═══════════════════════════════════════════
//  EMAIL VERIFICATION
// ═══════════════════════════════════════════
const pendingVerifications = {}; // { email: { code, name, salt, hash, expiresAt } }
const workspaceOauthStates = new Map(); // state -> { email, createdAt }

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
const CANVAS_PROMPT_FILE = path.join(__dirname, 'Surya_AI_Canvas.md');

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
  try {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
  } catch (e) {
    console.error('Failed to write chats:', e.message);
  }
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
function normalizeChildName(name) {
  return (name || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
}
function normalizeDob(dob) {
  return (dob || '').toString().trim();
}
function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

function findUserByAuthToken(token) {
  if (!token) return null;
  const users = readUsers();
  return users.find(u => u.token === token) || null;
}

function getTokenFromReq(req) {
  return (req.headers.authorization || '').replace('Bearer ', '');
}

function resolveUserFromRequest(req, payload = {}) {
  const token = getTokenFromReq(req);
  let users = readUsers();
  let user = users.find(u => u.token === token);
  if (user) return user;

  const emailFromClient = (
    payload.email ||
    payload.userEmail ||
    req.headers['x-surya-user-email'] ||
    ''
  ).toString().trim().toLowerCase();
  if (!emailFromClient) return null;

  user = users.find(u => (u.email || '').toLowerCase() === emailFromClient);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      email: emailFromClient,
      name: payload.name || emailFromClient.split('@')[0],
      avatar: null,
      provider: 'insforge',
      verified: true,
      token: token || null,
      createdAt: new Date().toISOString()
    };
    users.push(user);
  } else if (!user.token && token) {
    user.token = token;
  }
  writeUsers(users);
  return user;
}

// Parse JSON body from POST requests (10MB limit)
function parseBody(req, maxSize = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) { req.destroy(); reject(new Error('Request body too large')); return; }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function makeJsonResponse(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function httpsJsonRequest({ hostname, path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method, headers }, (resp) => {
      let raw = '';
      resp.on('data', c => raw += c);
      resp.on('end', () => {
        let json = null;
        try { json = raw ? JSON.parse(raw) : {}; } catch { json = null; }
        resolve({ statusCode: resp.statusCode || 0, data: json, raw });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function refreshGoogleWorkspaceToken(userEmail) {
  const users = readUsers();
  const user = users.find(u => (u.email || '').toLowerCase() === (userEmail || '').toLowerCase());
  if (!user || !user.googleWorkspace || !user.googleWorkspace.refreshToken) return null;

  const postBody = querystring.stringify({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: user.googleWorkspace.refreshToken
  });

  const tokenRes = await httpsJsonRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postBody)
    },
    body: postBody
  });

  if (tokenRes.statusCode < 200 || tokenRes.statusCode >= 300 || !tokenRes.data || !tokenRes.data.access_token) {
    return null;
  }

  user.googleWorkspace = {
    ...user.googleWorkspace,
    connected: true,
    accessToken: tokenRes.data.access_token,
    scope: tokenRes.data.scope || user.googleWorkspace.scope || GOOGLE_WORKSPACE_SCOPES,
    expiryDate: tokenRes.data.expires_in ? Date.now() + (tokenRes.data.expires_in * 1000) : user.googleWorkspace.expiryDate
  };
  writeUsers(users);
  return user.googleWorkspace.accessToken;
}

async function getValidGoogleWorkspaceToken(user) {
  const workspace = user && user.googleWorkspace;
  if (!workspace || !workspace.connected || !workspace.accessToken) return null;
  const expiry = workspace.expiryDate || 0;
  if (!expiry || expiry > (Date.now() + 60 * 1000)) {
    return workspace.accessToken;
  }
  return await refreshGoogleWorkspaceToken(user.email);
}

function extractGoogleDocId(inputText, kind) {
  if (!inputText) return null;
  const patterns = {
    docs: /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    slides: /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/
  };
  const direct = (patterns[kind] || patterns.docs).exec(inputText);
  if (direct && direct[1]) return direct[1];
  const generic = /(?:doc|document|slide|presentation)\s*(?:id)?\s*[:=]?\s*([a-zA-Z0-9_-]{20,})/i.exec(inputText);
  return generic && generic[1] ? generic[1] : null;
}

function extractTextFromGoogleDoc(doc) {
  const out = [];
  const body = doc && doc.body && doc.body.content ? doc.body.content : [];
  for (const block of body) {
    if (!block.paragraph || !block.paragraph.elements) continue;
    for (const el of block.paragraph.elements) {
      const t = el.textRun && el.textRun.content ? el.textRun.content.trim() : '';
      if (t) out.push(t);
    }
  }
  return out.join('\n').slice(0, 12000);
}

function extractTextFromGoogleSlides(deck) {
  const lines = [];
  const slides = deck && deck.slides ? deck.slides : [];
  for (const slide of slides) {
    const elements = slide.pageElements || [];
    for (const element of elements) {
      const textElements = element.shape && element.shape.text && element.shape.text.textElements
        ? element.shape.text.textElements
        : [];
      for (const te of textElements) {
        const run = te.textRun && te.textRun.content ? te.textRun.content.trim() : '';
        if (run) lines.push(run);
      }
    }
  }
  return lines.join('\n').slice(0, 12000);
}

function looksLikeGenericDrivePrompt(prompt) {
  const t = (prompt || '').toLowerCase();
  const generic = [
    'my drive',
    'google drive',
    'drive files',
    'list files',
    'show files',
    'workspace files',
    'show my files'
  ];
  return generic.some(k => t.includes(k));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const host = (req.headers.host || '').toString();
  const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  if (IS_PRODUCTION && !isLocalHost && forwardedProto && forwardedProto !== 'https') {
    res.writeHead(301, { Location: `https://${host}${req.url}` });
    res.end();
    return;
  }

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
  //  INSFORGE SERVER-SIDE PROXY (streaming)
  // ═══════════════════════════════════════════
  if (req.url === '/api/ai/chat/completion' && req.method === 'POST') {
    if (!INSFORGE_BASE || !INSFORGE_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing INSFORGE_BASE / INSFORGE_API_KEY in .env' }));
      return;
    }

    try {
      const payload = await parseBody(req);
      const target = new URL('/api/ai/chat/completion', INSFORGE_BASE);

      const upstream = https.request(
        {
          hostname: target.hostname,
          path: target.pathname + target.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${INSFORGE_API_KEY}`
          }
        },
        (up) => {
          // Pass through status + content type; keep streaming behavior.
          res.writeHead(up.statusCode || 200, {
            'Content-Type': up.headers['content-type'] || 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache'
          });
          up.pipe(res);
        }
      );

      upstream.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream request failed', detail: e.message }));
      });

      upstream.write(JSON.stringify(payload || {}));
      upstream.end();
      return;
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
      return;
    }
  }

  if (req.url === '/api/canvas/prompt' && req.method === 'GET') {
    try {
      const prompt = fs.readFileSync(CANVAS_PROMPT_FILE, 'utf8');
      makeJsonResponse(res, 200, { prompt });
    } catch (e) {
      makeJsonResponse(res, 500, { error: 'Failed to read canvas prompt', detail: e.message });
    }
    return;
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
    const state = parsedUrl.searchParams.get('state');
    const workspaceState = state ? workspaceOauthStates.get(state) : null;
    if (!code) {
      res.writeHead(302, { Location: workspaceState ? '/?workspace_error=no_code' : '/?auth_error=no_code' });
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
            res.writeHead(302, { Location: workspaceState ? '/?workspace_error=token_failed' : '/?auth_error=token_failed' });
            res.end();
            return;
          }

          if (workspaceState && workspaceState.email) {
            workspaceOauthStates.delete(state);
            const users = readUsers();
            const user = users.find(u => (u.email || '').toLowerCase() === workspaceState.email.toLowerCase());
            if (!user) {
              res.writeHead(302, { Location: '/?workspace_error=user_not_found' });
              res.end();
              return;
            }
            user.googleWorkspace = {
              connected: true,
              connectedAt: new Date().toISOString(),
              scope: tokens.scope || GOOGLE_WORKSPACE_SCOPES,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token || (user.googleWorkspace && user.googleWorkspace.refreshToken) || null,
              expiryDate: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
            };
            writeUsers(users);
            res.writeHead(302, { Location: '/?workspace_connected=1' });
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
          res.writeHead(302, { Location: workspaceState ? '/?workspace_error=token_parse_failed' : '/?auth_error=token_parse_failed' });
          res.end();
        }
      });
    });
    tokenReq.on('error', () => {
      res.writeHead(302, { Location: workspaceState ? '/?workspace_error=token_request_failed' : '/?auth_error=token_request_failed' });
      res.end();
    });
    tokenReq.write(tokenData);
    tokenReq.end();
    return;
  }

  // ═══════════════════════════════════════════
  //  GITHUB OAUTH
  // ═══════════════════════════════════════════

  // Step 1: Redirect to GitHub
  if (req.url === '/auth/github' && req.method === 'GET') {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const redirectUri = `${proto}://${req.headers.host}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'repo user:email',
      state: crypto.randomBytes(16).toString('hex')
    });
    res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
    res.end();
    return;
  }

  // Step 2: GitHub callback — exchange code for access token
  if (req.url.startsWith('/auth/github/callback') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const code = parsedUrl.searchParams.get('code');
    if (!code) {
      res.writeHead(302, { Location: '/?github_auth_error=no_code' });
      res.end();
      return;
    }

    const proto = req.headers['x-forwarded-proto'] || 'http';
    const redirectUri = `${proto}://${req.headers.host}/auth/github/callback`;
    const tokenBody = JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    });

    const tokenReq = https.request({
      hostname: 'github.com',
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(tokenBody)
      }
    }, tokenRes => {
      let data = '';
      tokenRes.on('data', c => data += c);
      tokenRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          const accessToken = json.access_token;
          if (!accessToken) throw new Error('no access_token');
          res.writeHead(302, { Location: `/?github_auth=${encodeURIComponent(accessToken)}` });
          res.end();
        } catch {
          res.writeHead(302, { Location: '/?github_auth_error=token_parse_failed' });
          res.end();
        }
      });
    });
    tokenReq.on('error', () => {
      res.writeHead(302, { Location: '/?github_auth_error=token_request_failed' });
      res.end();
    });
    tokenReq.write(tokenBody);
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

  // Child Sign Up (no email)
  if (req.url === '/api/auth/child/sign-up' && req.method === 'POST') {
    parseBody(req).then(({ name, dateOfBirth, password }) => {
      const normalizedName = normalizeChildName(name);
      const dob = normalizeDob(dateOfBirth);
      if (!normalizedName || !dob || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Name, dateOfBirth and password are required' }));
        return;
      }
      const users = readUsers();
      const alreadyExists = users.find(u =>
        u.accountType === 'child' &&
        normalizeChildName(u.childName) === normalizedName &&
        normalizeDob(u.childDob) === dob
      );
      if (alreadyExists) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Child account already exists. Please sign in.' }));
        return;
      }
      const { salt, hash } = hashPassword(password);
      const token = generateToken();
      const safeName = name.toString().trim().replace(/\s+/g, ' ');
      const user = {
        id: crypto.randomUUID(),
        accountType: 'child',
        childName: safeName,
        childDob: dob,
        name: safeName,
        email: null,
        avatar: null,
        provider: 'child-local',
        salt,
        hash,
        token,
        verified: true,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      writeUsers(users);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          accessToken: token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            accountType: user.accountType,
            childDob: user.childDob
          }
        }
      }));
    }).catch(e => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // Child Sign In (name + dateOfBirth + password)
  if (req.url === '/api/auth/child/sign-in' && req.method === 'POST') {
    parseBody(req).then(({ name, dateOfBirth, password }) => {
      const normalizedName = normalizeChildName(name);
      const dob = normalizeDob(dateOfBirth);
      if (!normalizedName || !dob || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Name, dateOfBirth and password are required' }));
        return;
      }
      const users = readUsers();
      const candidates = users.filter(u =>
        u.accountType === 'child' &&
        normalizeChildName(u.childName) === normalizedName &&
        normalizeDob(u.childDob) === dob
      );
      const user = candidates.find(u => verifyPassword(password, u.salt, u.hash));
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid child credentials' }));
        return;
      }
      user.token = generateToken();
      writeUsers(users);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          accessToken: user.token,
          user: {
            id: user.id,
            name: user.name || user.childName,
            email: user.email || null,
            avatar: user.avatar || null,
            accountType: user.accountType || 'child',
            childDob: user.childDob || null
          }
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
      data: {
        id: user.id,
        email: user.email || null,
        name: user.name || user.childName || 'User',
        avatar: user.avatar || null,
        accountType: user.accountType || 'adult',
        childDob: user.childDob || null
      }
    }));
    return;
  }

  if (req.url === '/api/connectors/google-workspace/start' && req.method === 'POST') {
    parseBody(req).then((payload) => {
      const user = resolveUserFromRequest(req, payload || {});
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not authenticated' }));
        return;
      }

      const proto = req.headers['x-forwarded-proto'] || 'http';
      const redirectUri = `${proto}://${req.headers.host}/auth/google/callback`;
      const state = crypto.randomBytes(24).toString('hex');
      workspaceOauthStates.set(state, { email: user.email, createdAt: Date.now() });
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: GOOGLE_WORKSPACE_SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        state
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}`
      }));
    }).catch(e => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  if (req.url === '/api/connectors/google-workspace/status' && req.method === 'GET') {
    const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    const connector = user.googleWorkspace || null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: Boolean(connector && connector.connected),
      connectedAt: connector && connector.connectedAt ? connector.connectedAt : null,
      scopes: connector && connector.scope ? connector.scope : ''
    }));
    return;
  }

  if (req.url === '/api/connectors/google-workspace/disconnect' && req.method === 'POST') {
    const token = getTokenFromReq(req);
    const users = readUsers();
    const user = users.find(u =>
      (token && u.token === token) ||
      ((u.email || '').toLowerCase() === ((req.headers['x-surya-user-email'] || '').toString().toLowerCase()))
    );
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    user.googleWorkspace = {
      connected: false,
      connectedAt: null,
      scope: '',
      accessToken: null,
      refreshToken: null,
      expiryDate: null
    };
    writeUsers(users);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // ═══════════════════════════════════════════════════
  //  SUPABASE CONNECTOR
  // ═══════════════════════════════════════════════════

  if (req.url === '/api/connectors/supabase/connect' && req.method === 'POST') {
    parseBody(req).then((payload) => {
      const user = resolveUserFromRequest(req, payload || {});
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not authenticated' }));
        return;
      }
      const url = (payload.url || '').trim();
      const anonKey = (payload.anonKey || '').trim();
      const accessToken = (payload.accessToken || '').trim();
      if (!url || !anonKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing url or anonKey' }));
        return;
      }
      if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid Supabase URL' }));
        return;
      }
      const projectRef = url.replace('https://', '').split('.')[0];
      const users = readUsers();
      const u = users.find(x => x.id === user.id) || user;
      u.supabase = {
        connected: true,
        connectedAt: new Date().toISOString(),
        url,
        anonKey,
        accessToken: accessToken || null,
        projectRef
      };
      writeUsers(users);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }).catch(() => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    });
    return;
  }

  if (req.url === '/api/connectors/supabase/status' && req.method === 'GET') {
    const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    const sb = user.supabase || null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: Boolean(sb && sb.connected),
      connectedAt: sb && sb.connectedAt ? sb.connectedAt : null,
      url: sb && sb.url ? sb.url : null,
      anonKey: sb && sb.anonKey ? sb.anonKey : null
    }));
    return;
  }

  if (req.url === '/api/connectors/supabase/disconnect' && req.method === 'POST') {
    const token = getTokenFromReq(req);
    const users = readUsers();
    const user = users.find(u =>
      (token && u.token === token) ||
      ((u.email || '').toLowerCase() === ((req.headers['x-surya-user-email'] || '').toString().toLowerCase()))
    );
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }
    user.supabase = {
      connected: false,
      connectedAt: null,
      url: null,
      anonKey: null,
      accessToken: null,
      projectRef: null
    };
    writeUsers(users);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (req.url === '/api/integrations/supabase/provision' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      const user = resolveUserFromRequest(req, payload || {});
      if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
      const sb = user.supabase;
      if (!sb || !sb.connected) return makeJsonResponse(res, 400, { error: 'Supabase not connected' });
      if (!sb.accessToken) return makeJsonResponse(res, 400, { error: 'Access Token required for auto-provisioning. Add it in Settings → Connectors → Supabase.' });
      const schema = (payload.schema || '').trim();
      if (!schema) return makeJsonResponse(res, 400, { error: 'No schema provided' });

      const body = JSON.stringify({ query: schema });
      const provisionRes = await httpsJsonRequest({
        hostname: 'api.supabase.com',
        path: `/v1/projects/${sb.projectRef}/database/query`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sb.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        body
      });

      if (provisionRes.statusCode >= 200 && provisionRes.statusCode < 300) {
        makeJsonResponse(res, 200, { success: true, result: provisionRes.data });
      } else {
        makeJsonResponse(res, provisionRes.statusCode || 500, {
          error: 'Provisioning failed',
          detail: provisionRes.data || provisionRes.raw
        });
      }
    } catch (e) {
      makeJsonResponse(res, 500, { error: 'Provisioning error', detail: e.message });
    }
    return;
  }

  // ═══════════════════════════════════════════════════
  //  MASTER MEMORY ENDPOINTS
  // ═══════════════════════════════════════════════════

  if (req.url === '/api/memory/list' && req.method === 'GET') {
    const user = findUserByAuthToken(getTokenFromReq(req));
    if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
    return makeJsonResponse(res, 200, { memories: user.memories || [] });
  }

  if (req.url === '/api/memory/save' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      const user = findUserByAuthToken(getTokenFromReq(req));
      if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
      const fact = (payload.fact || '').trim();
      if (!fact) return makeJsonResponse(res, 400, { error: 'No fact provided' });
      const users = readUsers();
      const u = users.find(x => x.email === user.email || (x.childName && x.childName === user.childName));
      if (!u) return makeJsonResponse(res, 404, { error: 'User not found' });
      if (!u.memories) u.memories = [];
      // Prevent duplicates
      if (u.memories.some(m => m.fact.toLowerCase() === fact.toLowerCase())) {
        return makeJsonResponse(res, 200, { success: true, message: 'Already saved' });
      }
      u.memories.push({ id: crypto.randomBytes(8).toString('hex'), fact, createdAt: new Date().toISOString() });
      writeUsers(users);
      return makeJsonResponse(res, 200, { success: true });
    } catch (e) {
      return makeJsonResponse(res, 500, { error: e.message });
    }
  }

  if (req.url === '/api/memory/delete' && req.method === 'DELETE') {
    try {
      const payload = await parseBody(req);
      const user = findUserByAuthToken(getTokenFromReq(req));
      if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
      const users = readUsers();
      const u = users.find(x => x.email === user.email || (x.childName && x.childName === user.childName));
      if (!u) return makeJsonResponse(res, 404, { error: 'User not found' });
      u.memories = (u.memories || []).filter(m => m.id !== payload.id);
      writeUsers(users);
      return makeJsonResponse(res, 200, { success: true });
    } catch (e) {
      return makeJsonResponse(res, 500, { error: e.message });
    }
  }

  if (req.url === '/api/memory/clear' && req.method === 'POST') {
    const user = findUserByAuthToken(getTokenFromReq(req));
    if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
    const users = readUsers();
    const u = users.find(x => x.email === user.email || (x.childName && x.childName === user.childName));
    if (!u) return makeJsonResponse(res, 404, { error: 'User not found' });
    u.memories = [];
    writeUsers(users);
    return makeJsonResponse(res, 200, { success: true });
  }

  if (req.url.startsWith('/api/google-workspace/drive/files') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
    if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
    const token = await getValidGoogleWorkspaceToken(user);
    if (!token) return makeJsonResponse(res, 401, { error: 'Google Workspace not connected' });

    const query = parsedUrl.searchParams.get('query') || '';
    const pageSize = Math.min(parseInt(parsedUrl.searchParams.get('pageSize') || '10', 10) || 10, 50);
    const q = query
      ? `name contains '${query.replace(/'/g, "\\'")}' and trashed=false`
      : 'trashed=false';
    const apiPath = `/drive/v3/files?pageSize=${pageSize}&orderBy=modifiedTime%20desc&q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName))`;
    const driveRes = await httpsJsonRequest({
      hostname: 'www.googleapis.com',
      path: apiPath,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (driveRes.statusCode < 200 || driveRes.statusCode >= 300) {
      return makeJsonResponse(res, 502, { error: 'Failed to fetch Drive files', detail: driveRes.data || driveRes.raw });
    }
    return makeJsonResponse(res, 200, { files: driveRes.data.files || [] });
  }

  if (req.url.startsWith('/api/google-workspace/docs/') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const docId = decodeURIComponent(parsedUrl.pathname.split('/').pop() || '');
    const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
    if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
    const token = await getValidGoogleWorkspaceToken(user);
    if (!token) return makeJsonResponse(res, 401, { error: 'Google Workspace not connected' });
    if (!docId) return makeJsonResponse(res, 400, { error: 'Missing doc id' });

    const docRes = await httpsJsonRequest({
      hostname: 'docs.googleapis.com',
      path: `/v1/documents/${encodeURIComponent(docId)}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (docRes.statusCode < 200 || docRes.statusCode >= 300) {
      return makeJsonResponse(res, 502, { error: 'Failed to fetch document', detail: docRes.data || docRes.raw });
    }
    return makeJsonResponse(res, 200, {
      id: docRes.data.documentId,
      title: docRes.data.title || 'Untitled document',
      content: extractTextFromGoogleDoc(docRes.data)
    });
  }

  if (req.url.startsWith('/api/google-workspace/slides/') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const presentationId = decodeURIComponent(parsedUrl.pathname.split('/').pop() || '');
    const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
    if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
    const token = await getValidGoogleWorkspaceToken(user);
    if (!token) return makeJsonResponse(res, 401, { error: 'Google Workspace not connected' });
    if (!presentationId) return makeJsonResponse(res, 400, { error: 'Missing presentation id' });

    const slideRes = await httpsJsonRequest({
      hostname: 'slides.googleapis.com',
      path: `/v1/presentations/${encodeURIComponent(presentationId)}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (slideRes.statusCode < 200 || slideRes.statusCode >= 300) {
      return makeJsonResponse(res, 502, { error: 'Failed to fetch presentation', detail: slideRes.data || slideRes.raw });
    }
    return makeJsonResponse(res, 200, {
      id: slideRes.data.presentationId,
      title: slideRes.data.title || 'Untitled presentation',
      content: extractTextFromGoogleSlides(slideRes.data)
    });
  }

  if (req.url === '/api/google-workspace/docs/create' && req.method === 'POST') {
    parseBody(req).then(async ({ title, content }) => {
      const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
      if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
      const token = await getValidGoogleWorkspaceToken(user);
      if (!token) return makeJsonResponse(res, 401, { error: 'Google Workspace not connected' });

      const safeTitle = (title || 'Surya AI Document').toString().slice(0, 120);
      const safeContent = (content || '').toString().slice(0, 40000);
      const createRes = await httpsJsonRequest({
        hostname: 'docs.googleapis.com',
        path: '/v1/documents',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: safeTitle })
      });
      if (createRes.statusCode < 200 || createRes.statusCode >= 300 || !createRes.data || !createRes.data.documentId) {
        return makeJsonResponse(res, 502, { error: 'Failed to create Google Doc', detail: createRes.data || createRes.raw });
      }

      const docId = createRes.data.documentId;
      if (safeContent.trim()) {
        await httpsJsonRequest({
          hostname: 'docs.googleapis.com',
          path: `/v1/documents/${encodeURIComponent(docId)}:batchUpdate`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: safeContent
                }
              }
            ]
          })
        });
      }
      return makeJsonResponse(res, 200, {
        id: docId,
        title: safeTitle,
        url: `https://docs.google.com/document/d/${docId}/edit`
      });
    }).catch(e => makeJsonResponse(res, 400, { error: e.message }));
    return;
  }

  // Create Google Slides presentation
  if (req.url === '/api/google-workspace/slides/create' && req.method === 'POST') {
    parseBody(req).then(async ({ title, slides }) => {
      const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
      if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
      const token = await getValidGoogleWorkspaceToken(user);
      if (!token) return makeJsonResponse(res, 401, { error: 'Google Workspace not connected' });

      const safeTitle = (title || 'Surya AI Presentation').toString().slice(0, 120);
      const slideList = Array.isArray(slides) ? slides.slice(0, 20) : [];

      // Create empty presentation
      const createRes = await httpsJsonRequest({
        hostname: 'slides.googleapis.com',
        path: '/v1/presentations',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: safeTitle })
      });
      if (createRes.statusCode < 200 || createRes.statusCode >= 300 || !createRes.data || !createRes.data.presentationId) {
        return makeJsonResponse(res, 502, { error: 'Failed to create presentation', detail: createRes.data || createRes.raw });
      }

      const presId = createRes.data.presentationId;
      const defaultSlideId = createRes.data.slides?.[0]?.objectId;

      // Build batch update requests
      const requests = [];

      // Style the default title slide — set dark background
      if (defaultSlideId) {
        requests.push({
          updatePageProperties: {
            objectId: defaultSlideId,
            pageProperties: {
              pageBackgroundFill: {
                solidFill: { color: { rgbColor: { red: 0.08, green: 0.08, blue: 0.12 } } }
              }
            },
            fields: 'pageBackgroundFill'
          }
        });

        // Find title placeholder on default slide and insert presentation title
        const defaultSlide = createRes.data.slides[0];
        if (defaultSlide?.pageElements) {
          for (const el of defaultSlide.pageElements) {
            const phType = el.shape?.placeholder?.type;
            if (phType === 'CENTER_TITLE' || phType === 'TITLE') {
              requests.push({ insertText: { objectId: el.objectId, text: safeTitle } });
              requests.push({
                updateTextStyle: {
                  objectId: el.objectId,
                  style: {
                    foregroundColor: { opaqueColor: { rgbColor: { red: 1, green: 1, blue: 1 } } },
                    fontSize: { magnitude: 36, unit: 'PT' },
                    bold: true,
                    fontFamily: 'Google Sans'
                  },
                  textRange: { type: 'ALL' },
                  fields: 'foregroundColor,fontSize,bold,fontFamily'
                }
              });
            }
            if (phType === 'SUBTITLE') {
              requests.push({ insertText: { objectId: el.objectId, text: 'Generated by Surya AI' } });
              requests.push({
                updateTextStyle: {
                  objectId: el.objectId,
                  style: {
                    foregroundColor: { opaqueColor: { rgbColor: { red: 0.6, green: 0.6, blue: 0.7 } } },
                    fontSize: { magnitude: 16, unit: 'PT' },
                    fontFamily: 'Google Sans'
                  },
                  textRange: { type: 'ALL' },
                  fields: 'foregroundColor,fontSize,fontFamily'
                }
              });
            }
          }
        }
      }

      // Add content slides
      for (let i = 0; i < slideList.length; i++) {
        const slide = slideList[i];
        const slideId = 'slide_' + i;
        const titleId = 'title_' + i;
        const bodyId = 'body_' + i;

        // Create slide
        requests.push({
          createSlide: {
            objectId: slideId,
            insertionIndex: i + 1,
            slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
            placeholderIdMappings: [
              { layoutPlaceholder: { type: 'TITLE' }, objectId: titleId },
              { layoutPlaceholder: { type: 'BODY', index: 0 }, objectId: bodyId }
            ]
          }
        });

        // Dark background for each slide
        requests.push({
          updatePageProperties: {
            objectId: slideId,
            pageProperties: {
              pageBackgroundFill: {
                solidFill: { color: { rgbColor: { red: 0.08, green: 0.08, blue: 0.12 } } }
              }
            },
            fields: 'pageBackgroundFill'
          }
        });

        // Insert and style title
        if (slide.title) {
          const titleText = slide.title.toString().slice(0, 200);
          requests.push({ insertText: { objectId: titleId, text: titleText } });
          requests.push({
            updateTextStyle: {
              objectId: titleId,
              style: {
                foregroundColor: { opaqueColor: { rgbColor: { red: 1, green: 1, blue: 1 } } },
                fontSize: { magnitude: 28, unit: 'PT' },
                bold: true,
                fontFamily: 'Google Sans'
              },
              textRange: { type: 'ALL' },
              fields: 'foregroundColor,fontSize,bold,fontFamily'
            }
          });
        }

        // Insert and style body
        if (slide.body) {
          const bodyText = slide.body.toString().slice(0, 3000);
          requests.push({ insertText: { objectId: bodyId, text: bodyText } });
          requests.push({
            updateTextStyle: {
              objectId: bodyId,
              style: {
                foregroundColor: { opaqueColor: { rgbColor: { red: 0.85, green: 0.85, blue: 0.9 } } },
                fontSize: { magnitude: 16, unit: 'PT' },
                fontFamily: 'Google Sans'
              },
              textRange: { type: 'ALL' },
              fields: 'foregroundColor,fontSize,fontFamily'
            }
          });
        }
      }

      // Send all requests in one batch
      if (requests.length > 0) {
        await httpsJsonRequest({
          hostname: 'slides.googleapis.com',
          path: `/v1/presentations/${encodeURIComponent(presId)}:batchUpdate`,
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests })
        });
      }

      return makeJsonResponse(res, 200, {
        id: presId,
        title: safeTitle,
        url: `https://docs.google.com/presentation/d/${presId}/edit`
      });
    }).catch(e => makeJsonResponse(res, 400, { error: e.message }));
    return;
  }

  // Create Google Sheets spreadsheet
  if (req.url === '/api/google-workspace/sheets/create' && req.method === 'POST') {
    parseBody(req).then(async ({ title, data }) => {
      const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
      if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
      const token = await getValidGoogleWorkspaceToken(user);
      if (!token) return makeJsonResponse(res, 401, { error: 'Google Workspace not connected' });

      const safeTitle = (title || 'Surya AI Spreadsheet').toString().slice(0, 120);
      const rows = Array.isArray(data) ? data.slice(0, 500) : [];

      // Create spreadsheet
      const createRes = await httpsJsonRequest({
        hostname: 'sheets.googleapis.com',
        path: '/v4/spreadsheets',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: { title: safeTitle },
          sheets: [{ properties: { title: 'Sheet1' } }]
        })
      });
      if (createRes.statusCode < 200 || createRes.statusCode >= 300 || !createRes.data || !createRes.data.spreadsheetId) {
        return makeJsonResponse(res, 502, { error: 'Failed to create spreadsheet', detail: createRes.data || createRes.raw });
      }

      const sheetId = createRes.data.spreadsheetId;

      // Populate data if provided
      if (rows.length > 0) {
        const values = rows.map(row => Array.isArray(row) ? row.map(cell => String(cell).slice(0, 1000)) : [String(row)]);
        await httpsJsonRequest({
          hostname: 'sheets.googleapis.com',
          path: `/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values })
        });
      }

      return makeJsonResponse(res, 200, {
        id: sheetId,
        title: safeTitle,
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
      });
    }).catch(e => makeJsonResponse(res, 400, { error: e.message }));
    return;
  }

  if (req.url.startsWith('/api/google-workspace/query?') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const prompt = (parsedUrl.searchParams.get('prompt') || '').trim();
    const user = resolveUserFromRequest(req, { userEmail: req.headers['x-surya-user-email'] || '' });
    if (!user) return makeJsonResponse(res, 401, { error: 'Not authenticated' });
    const token = await getValidGoogleWorkspaceToken(user);
    if (!token) return makeJsonResponse(res, 401, { error: 'Google Workspace not connected' });

    const lower = prompt.toLowerCase();
    const docId = extractGoogleDocId(prompt, 'docs');
    const slideId = extractGoogleDocId(prompt, 'slides');
    if ((lower.includes('doc') || lower.includes('document')) && docId) {
      const docRes = await httpsJsonRequest({
        hostname: 'docs.googleapis.com',
        path: `/v1/documents/${encodeURIComponent(docId)}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (docRes.statusCode < 200 || docRes.statusCode >= 300) {
        return makeJsonResponse(res, 502, { error: 'Failed to fetch document', detail: docRes.data || docRes.raw });
      }
      return makeJsonResponse(res, 200, {
        type: 'document',
        title: docRes.data.title || 'Untitled document',
        content: extractTextFromGoogleDoc(docRes.data)
      });
    }

    if ((lower.includes('slide') || lower.includes('presentation')) && slideId) {
      const slideRes = await httpsJsonRequest({
        hostname: 'slides.googleapis.com',
        path: `/v1/presentations/${encodeURIComponent(slideId)}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (slideRes.statusCode < 200 || slideRes.statusCode >= 300) {
        return makeJsonResponse(res, 502, { error: 'Failed to fetch presentation', detail: slideRes.data || slideRes.raw });
      }
      return makeJsonResponse(res, 200, {
        type: 'presentation',
        title: slideRes.data.title || 'Untitled presentation',
        content: extractTextFromGoogleSlides(slideRes.data)
      });
    }

    const useGenericList = !prompt || looksLikeGenericDrivePrompt(prompt);
    const q = useGenericList
      ? 'trashed=false'
      : `name contains '${prompt.replace(/'/g, "\\'")}' and trashed=false`;
    const driveRes = await httpsJsonRequest({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files?pageSize=10&orderBy=modifiedTime%20desc&q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName))`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (driveRes.statusCode < 200 || driveRes.statusCode >= 300) {
      return makeJsonResponse(res, 502, { error: 'Failed to fetch Drive files', detail: driveRes.data || driveRes.raw });
    }
    return makeJsonResponse(res, 200, {
      type: 'drive_files',
      files: driveRes.data.files || []
    });
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

  // Image generation API — InsForge proxy (keeps API key server-side)
  if (req.url === '/api/ai/image/generation' && req.method === 'POST') {
    if (!INSFORGE_BASE || !INSFORGE_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing INSFORGE_BASE / INSFORGE_API_KEY in .env' }));
      return;
    }
    try {
      const payload = await parseBody(req);
      const target = new URL('/api/ai/image/generation', INSFORGE_BASE);
      const body = JSON.stringify(payload || {});

      const upstream = https.request(
        {
          hostname: target.hostname,
          path: target.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': INSFORGE_API_KEY,
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (up) => {
          res.writeHead(up.statusCode || 200, {
            'Content-Type': up.headers['content-type'] || 'application/json',
            'Cache-Control': 'no-cache'
          });
          up.pipe(res);
        }
      );

      upstream.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image generation failed', detail: e.message }));
      });

      upstream.write(body);
      upstream.end();
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Image generation error', detail: e.message }));
    }
    return;
  }

  // DuckDuckGo search removed — using Grok's built-in web search instead

  // If a request reaches here and it's still an API route,
  // return JSON 404 instead of SPA fallback HTML.
  if (req.url.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API route not found', path: req.url }));
    return;
  }

  const frontendDist = path.join(__dirname, 'frontend', 'dist');
  const frontendDir = fs.existsSync(path.join(frontendDist, 'index.html'))
    ? frontendDist
    : path.join(__dirname, 'frontend', 'html');

  const parsedPath = url.parse(req.url).pathname;
  let filePath = parsedPath === '/' ? '/index.html' : parsedPath;
  filePath = path.join(frontendDir, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback
        fs.readFile(path.join(frontendDir, 'index.html'), (err2, fallback) => {
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

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
