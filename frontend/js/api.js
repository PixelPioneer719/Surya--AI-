// ═══════════════════════════════════════════════════
//  API.JS - API Calls & Backend Communication
// ═══════════════════════════════════════════════════

// InsForge API Configuration
const INSFORGE_API_KEY = 'ik_7620eb1429dc9d3ac5cb459ba092e564';
const INSFORGE_BASE = 'https://rme548ii.ap-southeast.insforge.app';

// InsForge Auth Endpoints
const INSFORGE_AUTH_ENDPOINTS = {
  'sign-up': '/api/auth/users',
  'sign-in': '/api/auth/sessions',
  'verify': '/api/auth/email/verify',
  'resend-code': '/api/auth/email/send-verification'
};

// InsForge Models
const MODELS = {
  'surya-pro': {
    id: 'anthropic/claude-opus-4.6',
    name: 'Surya Pro',
    desc: 'Reasoning, coding & general tasks',
    provider: 'Claude Opus 4.6',
    color: '#8b5cf6',
    badge: 'PRO'
  },
  'surya-code': {
    id: 'anthropic/claude-opus-4.6',
    name: 'Surya Code',
    desc: 'Expert coding & architecture',
    provider: 'Claude Opus 4.6',
    color: '#3b82f6',
    badge: 'CODE'
  },
  'surya-creative': {
    id: 'google/gemini-3.1-pro-preview',
    name: 'Surya Creative',
    desc: 'Image generation & creative tasks',
    provider: 'Gemini 3.1 Pro',
    color: '#10b981',
    badge: 'CREATIVE'
  },
  'surya-search': {
    id: 'x-ai/grok-4.1-fast',
    name: 'Surya Search',
    desc: 'Realtime web search & news',
    provider: 'Grok 4.1',
    color: '#f59e0b',
    badge: 'SEARCH'
  }
};

// Auth API Functions
async function insforgeAuth(endpoint, body) {
  if (INSFORGE_AUTH_ENDPOINTS[endpoint]) {
    let mappedBody = { ...body };
    if (endpoint === 'verify') {
      mappedBody = { email: body.email, otp: body.code || body.otp };
    }
    const res = await fetch(`${INSFORGE_BASE}${INSFORGE_AUTH_ENDPOINTS[endpoint]}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': INSFORGE_API_KEY
      },
      body: JSON.stringify(mappedBody)
    });
    return await res.json();
  }
  // Delete account goes to local server
  const res = await fetch(`/api/auth/${endpoint}`, {
    method: endpoint === 'delete-account' ? 'DELETE' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function insforgeGet(endpoint, token) {
  if (endpoint === '/api/auth/me' || endpoint === 'me') {
    const res = await fetch(`${INSFORGE_BASE}/api/auth/sessions/current`, {
      headers: {
        'Authorization': 'Bearer ' + (token || ''),
        'x-api-key': INSFORGE_API_KEY
      }
    });
    return await res.json();
  }
  const url = endpoint.startsWith('/') ? endpoint : `/api/auth/${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + (token || '') }
  });
  return await res.json();
}

// Auth Session Management
function handleAuthSession(result) {
  const session = result.data || result;
  if (session.accessToken || session.access_token) {
    const token = session.accessToken || session.access_token;
    localStorage.setItem('surya_auth_token', token);
    document.cookie = `surya_auth_token=${token}; path=/; max-age=${30*24*60*60}; SameSite=Lax`;
    if (session.refreshToken || session.refresh_token) {
      localStorage.setItem('surya_refresh_token', session.refreshToken || session.refresh_token);
    }
    if (session.user) {
      currentUser = session.user;
      localStorage.setItem('surya_user', JSON.stringify(session.user));
      document.cookie = `surya_user=${encodeURIComponent(JSON.stringify(session.user))}; path=/; max-age=${30*24*60*60}; SameSite=Lax`;
    }
  }
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function clearAuthCookies() {
  document.cookie = 'surya_auth_token=; path=/; max-age=0';
  document.cookie = 'surya_user=; path=/; max-age=0';
}

// Auth Functions
async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  const btn = document.getElementById('authBtn');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = authMode === 'signin' ? 'Signing in...' : 'Sending code...';
  errorEl.style.display = 'none';

  try {
    let result;
    if (authMode === 'signup') {
      const name = document.getElementById('authName').value.trim();
      result = await insforgeAuth('sign-up', { email, password, name: name || undefined });

      if (result.error || result.statusCode >= 400) {
        throw new Error(result.message || result.error || 'Sign up failed');
      }

      if (result.requireEmailVerification || !result.accessToken) {
        pendingEmail = email;
        document.getElementById('authCard').style.display = 'none';
        document.getElementById('verifyCard').style.display = 'block';
        document.getElementById('verifySubtitle').textContent = `We sent a 6-digit code to ${email}`;
        document.getElementById('otpInput1').focus();
        return;
      }
      handleAuthSession(result);
      onAuthSuccess();
      return;
    } else {
      result = await insforgeAuth('sign-in', { email, password });
    }

    if (result.error || result.statusCode >= 400) {
      throw new Error(result.message || result.error || 'Authentication failed');
    }
    handleAuthSession(result);
    onAuthSuccess();
  } catch (e) {
    const msg = e.message === 'Failed to fetch'
      ? 'Server is temporarily unavailable. Please try again in a moment.'
      : e.message;
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
  }
}

let pendingEmail = '';

async function verifyCode() {
  const code = getOtpCode();
  const errorEl = document.getElementById('verifyError');
  const btn = document.getElementById('verifyBtn');

  if (code.length !== 6) {
    errorEl.textContent = 'Please enter the full 6-digit code';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verifying...';
  errorEl.style.display = 'none';

  try {
    const result = await insforgeAuth('verify', { email: pendingEmail, code });
    if (result.error || result.statusCode >= 400) {
      throw new Error(result.message || result.error || 'Verification failed');
    }
    handleAuthSession(result);
    onAuthSuccess();
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify & Create Account';
  }
}

function getOtpCode() {
  let code = '';
  for (let i = 1; i <= 6; i++) {
    code += document.getElementById('otpInput' + i).value;
  }
  return code;
}

async function resendCode() {
  const link = document.getElementById('resendLink');
  link.textContent = 'Sending...';
  link.style.pointerEvents = 'none';
  try {
    await insforgeAuth('resend-code', { email: pendingEmail });
    link.textContent = 'Code sent!';
    setTimeout(() => {
      link.textContent = 'Resend';
      link.style.pointerEvents = 'auto';
    }, 30000);
  } catch (e) {
    link.textContent = 'Resend';
    link.style.pointerEvents = 'auto';
  }
}

function backToSignup() {
  document.getElementById('verifyCard').style.display = 'none';
  document.getElementById('authCard').style.display = 'block';
  for (let i = 1; i <= 6; i++) {
    document.getElementById('otpInput' + i).value = '';
  }
}

function oauthLogin(provider) {
  if (provider === 'google') {
    window.location.href = '/auth/google';
    return;
  }
}

async function forgotPassword() {
  const email = document.getElementById('authEmail').value.trim();
  const errorEl = document.getElementById('authError');
  if (!email) {
    errorEl.textContent = 'Enter your email first, then click Forgot Password';
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';
  try {
    const res = await fetch(`${INSFORGE_BASE}/api/auth/email/send-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': INSFORGE_API_KEY },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message || data.error);
    errorEl.style.color = '#22c55e';
    errorEl.textContent = 'Password reset link sent to your email!';
    errorEl.style.display = 'block';
    setTimeout(() => { errorEl.style.color = ''; }, 5000);
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.style.display = 'block';
  }
}

function updateUserUI() {
  const avatar = document.getElementById('avatarBtn');
  const nameEl = document.getElementById('userMenuName');
  const emailEl = document.getElementById('userMenuEmail');
  const authItem = document.getElementById('userMenuAuth');
  const signOutItem = document.getElementById('userMenuSignOut');

  if (currentUser) {
    const initials = (currentUser.name || currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase();
    avatar.textContent = initials;
    avatar.style.background = 'var(--accent)';
    avatar.style.color = '#fff';
    nameEl.textContent = currentUser.name || currentUser.displayName || 'User';
    emailEl.textContent = currentUser.email || '';
    authItem.style.display = 'none';
    signOutItem.style.display = 'flex';
  } else {
    avatar.textContent = 'S';
    avatar.style.background = '';
    avatar.style.color = '';
    nameEl.textContent = 'Surya AI';
    emailEl.textContent = 'Sign in to continue';
    authItem.style.display = 'flex';
    signOutItem.style.display = 'none';
  }
}

async function signOut() {
  const token = localStorage.getItem('surya_auth_token');
  if (token) {
    try {
      await fetch(`${INSFORGE_BASE}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'x-api-key': INSFORGE_API_KEY
        }
      });
    } catch (e) {}
  }
  localStorage.removeItem('surya_auth_token');
  localStorage.removeItem('surya_refresh_token');
  localStorage.removeItem('surya_user');
  clearAuthCookies();
  currentUser = null;
  conversations = {};
  updateUserUI();
  renderChatHistory();
  closeUserMenu();
  authOverlay.classList.remove('hidden');
}

async function restoreSession() {
  let token = localStorage.getItem('surya_auth_token') || getCookie('surya_auth_token');
  let savedUser = localStorage.getItem('surya_user');
  if (!savedUser) {
    const cookieUser = getCookie('surya_user');
    if (cookieUser) savedUser = decodeURIComponent(cookieUser);
  }
  if (token && !localStorage.getItem('surya_auth_token')) {
    localStorage.setItem('surya_auth_token', token);
  }
  if (savedUser && !localStorage.getItem('surya_user')) {
    localStorage.setItem('surya_user', savedUser);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token') || urlParams.get('token');
  const authSuccess = urlParams.get('auth_success');

  if (authSuccess) {
    try {
      const session = JSON.parse(decodeURIComponent(authSuccess));
      if (session.accessToken) {
        localStorage.setItem('surya_auth_token', session.accessToken);
        if (session.user) {
          currentUser = session.user;
          localStorage.setItem('surya_user', JSON.stringify(session.user));
        }
      }
    } catch (e) {}
    window.history.replaceState({}, '', '/');
    onAuthSuccess();
    return;
  }

  if (accessToken) {
    localStorage.setItem('surya_auth_token', accessToken);
    window.history.replaceState({}, '', '/');
    try {
      const res = await fetch(`${INSFORGE_BASE}/api/auth/me`, {
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'x-api-key': INSFORGE_API_KEY
        }
      });
      const userData = await res.json();
      if (userData && !userData.error) {
        currentUser = userData.data || userData;
        localStorage.setItem('surya_user', JSON.stringify(currentUser));
      }
    } catch (e) {}
    onAuthSuccess();
    return;
  }

  const authError = urlParams.get('auth_error');
  if (authError) {
    window.history.replaceState({}, '', '/');
    const errorEl = document.getElementById('authError');
    errorEl.textContent = decodeURIComponent(authError);
    errorEl.style.display = 'block';
  }

  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashToken = hashParams.get('access_token');
    if (hashToken) {
      localStorage.setItem('surya_auth_token', hashToken);
      window.history.replaceState({}, '', '/');
      try {
        const res = await fetch(`${INSFORGE_BASE}/api/auth/me`, {
          headers: {
            'Authorization': 'Bearer ' + hashToken,
            'x-api-key': INSFORGE_API_KEY
          }
        });
        const userData = await res.json();
        if (userData && !userData.error) {
          currentUser = userData.data || userData;
          localStorage.setItem('surya_user', JSON.stringify(currentUser));
        }
      } catch (e) {}
      onAuthSuccess();
      return;
    }
  }

  if (token && savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      try {
        const userData = await insforgeGet('/api/auth/me', token);
        if (userData && !userData.error && (userData.data || userData.id)) {
          currentUser = userData.data || userData;
          localStorage.setItem('surya_user', JSON.stringify(currentUser));
        }
      } catch (e) {
        try {
          const localRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          const localData = await localRes.json();
          const user = localData.data || localData;
          if (user && !localData.error && (user.id || user.email)) {
            currentUser = user;
            localStorage.setItem('surya_user', JSON.stringify(currentUser));
          }
        } catch (e2) {}
      }
      if (currentUser) {
        loadUserConversations();
        renderChatHistory();
        updateUserUI();
        authOverlay.classList.add('hidden');
        syncChatsFromDB();
      }
    } catch (e) {
      currentUser = null;
    }
  }
}

function onAuthSuccess() {
  authOverlay.classList.add('hidden');
  loadUserConversations();
  renderChatHistory();
  syncChatsFromDB();
  const name = currentUser?.name || currentUser?.displayName || '';
  const firstName = name.split(' ')[0];
  if (firstName) {
    messageInput.placeholder = `Ask Surya AI, ${firstName}...`;
  }
}

// Chat API Functions
async function saveChatsToDb() {
  const token = localStorage.getItem('surya_auth_token');
  if (!token || !currentUser) return;
  let saved = false;

  try {
    const res = await fetch(`${INSFORGE_BASE}/api/database/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'x-api-key': INSFORGE_API_KEY
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        conversations: JSON.stringify(conversations),
        updated_at: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) saved = true;
  } catch (e) {}

  if (!saved) {
    try {
      await fetch('/api/chats/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ chats: conversations })
      });
    } catch (e) {
      console.warn('Failed to sync chats to DB:', e);
    }
  }
}

async function syncChatsFromDB() {
  const token = localStorage.getItem('surya_auth_token');
  if (!token || !currentUser) return;
  let dbConvs = null;

  try {
    const res = await fetch(`${INSFORGE_BASE}/api/database/chats?user_id=eq.${currentUser.id}&select=*&limit=1`, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'x-api-key': INSFORGE_API_KEY
      },
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data && data.length > 0 && data[0].conversations) {
      dbConvs = JSON.parse(data[0].conversations);
    }
  } catch (e) {}

  if (!dbConvs) {
    try {
      const res = await fetch('/api/chats/load', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (data && data.chats && Object.keys(data.chats).length > 0) {
        dbConvs = data.chats;
      }
    } catch (e) {
      console.warn('Failed to sync chats from DB:', e);
    }
  }

  if (dbConvs) {
    const localConvs = { ...conversations };
    const merged = { ...localConvs };
    for (const [id, conv] of Object.entries(dbConvs)) {
      if (!merged[id] || (conv.updatedAt && (!merged[id].updatedAt || conv.updatedAt > merged[id].updatedAt))) {
        merged[id] = conv;
      }
    }
    conversations = merged;
    saveConversationsToStorage();
    renderChatHistory();
  }
}

async function uploadToStorage(file) {
  const token = localStorage.getItem('surya_auth_token');
  if (!token) return null;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${INSFORGE_BASE}/api/storage/uploads/upload`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    });
    const data = await res.json();
    if (data.data && data.data.url) return data.data.url;
    if (data.url) return data.url;
    return null;
  } catch (e) {
    console.warn('Storage upload failed:', e);
    return null;
  }
}

async function checkAPIHealth() {
  const avatar = document.getElementById('avatarBtn');
  try {
    const res = await fetch(`${INSFORGE_BASE}/auth/v1/`, {
      headers: { 'Authorization': `Bearer ${INSFORGE_API_KEY}` },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok || res.status === 200) {
      avatar.dataset.health = 'green';
      avatar.title = 'Surya AI: Connected';
    } else {
      avatar.dataset.health = 'yellow';
      avatar.title = 'Surya AI: Degraded (' + res.status + ')';
    }
  } catch (e) {
    avatar.dataset.health = 'red';
    avatar.title = 'Surya AI: Offline';
  }
}

// Chat Storage Functions
function getConvStorageKey() {
  if (currentUser && currentUser.id) return 'surya_conversations_' + currentUser.id;
  return null;
}

function loadUserConversations() {
  const key = getConvStorageKey();
  if (!key) { conversations = {}; currentConvId = null; messages = []; return; }
  conversations = JSON.parse(localStorage.getItem(key) || '{}');
  currentConvId = null;
  messages = [];
}

function saveConversationsToStorage() {
  const key = getConvStorageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(conversations));
}

function saveCurrentConversation() {
  if (!currentConvId || messages.length === 0) return;
  conversations[currentConvId] = {
    id: currentConvId,
    title: messages[0]?.content?.substring(0, 40) || 'New Chat',
    messages: messages,
    model: currentModel,
    updatedAt: Date.now()
  };
  saveConversationsToStorage();
  if (currentUser) saveChatsToDb();
}

function loadConversation(convId) {
  saveCurrentConversation();
  const conv = conversations[convId];
  if (!conv) return;

  currentConvId = convId;
  messages = conv.messages || [];
  if (conv.model && MODELS[conv.model]) {
    currentModel = conv.model;
  }

  welcomeScreen.style.display = 'none';
  const container = chatContainer;
  container.style.display = 'flex';
  container.innerHTML = '';

  for (const msg of messages) {
    if (msg.role === 'user') {
      appendUserMsg(msg.content, null, false);
    } else if (msg.role === 'assistant') {
      const el = createAIBubble(false);
      el.innerHTML = renderMd(msg.content);
      highlightAllCode(el);
    }
  }

  scrollToBottom();
  renderChatHistory();

  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

function deleteConversation(convId, e) {
  e.stopPropagation();
  delete conversations[convId];
  saveConversationsToStorage();
  if (currentConvId === convId) newChat();
  else renderChatHistory();
}

function renderChatHistory() {
  const history = document.getElementById('chatHistory');
  const sorted = Object.values(conversations).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (sorted.length === 0) {
    history.innerHTML = '<div style="padding:24px 12px;text-align:center;"><div style="font-size:13px;color:var(--text-tertiary);margin-bottom:12px;">No conversations yet</div><button class="build-app-btn" style="margin:0 auto;width:auto;font-size:13px;padding:8px 16px;" onclick="startCanvasProject()"><span class="material-symbols-outlined" style="font-size:16px;">dashboard_customize</span> Start building</button></div>';
    return;
  }

  let html = '';
  for (const conv of sorted) {
    const isActive = conv.id === currentConvId;
    const title = conv.title || 'New Chat';
    html += `
      <div class="history-item ${isActive ? 'active' : ''}" onclick="loadConversation('${conv.id}')">
        <span class="history-label">${esc(title)}</span>
        <button class="delete-chat" onclick="deleteConversation('${conv.id}', event)" title="Delete">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `;
  }
  history.innerHTML = html;
}</content>
<parameter name="filePath">/Volumes/Prabhas SSD/Devoloper/Surya AI/frontend/js/api.js