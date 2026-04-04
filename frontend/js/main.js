// ═══════════════════════════════════════════════════
//  MAIN.JS - Event Listeners & Core Functionality
// ═══════════════════════════════════════════════════

// Global state
let currentUser = null;
let authMode = 'signin';
let currentModel = 'surya-pro';
let conversations = {};
let currentConvId = null;
let messages = [];
let attachedFile = null;
let activeTool = null;
let isLoading = false;
let abortController = null;
let canvasSystemPrompt = '';
let activeCanvasBundle = null;
let activeCanvasPreviewUrl = '';
let splitCodeVisible = false;
let theme = localStorage.getItem('surya_theme') || 'dark';
let userRole = localStorage.getItem('surya_user_role') || 'general';
let userMemories = [];
let gwConnected = false;
let supabaseConnected = false;
let supabaseConfig = null;

// DOM elements
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
const avatarBtn = document.getElementById('avatarBtn');
const userMenuDropdown = document.getElementById('userMenuDropdown');
const authOverlay = document.getElementById('authOverlay');
const settingsOverlay = document.getElementById('settingsOverlay');
const welcomePage = document.getElementById('welcomePage');
const mainApp = document.getElementById('mainApp');
const chatContainer = document.getElementById('chatContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const canvasWorkspace = document.getElementById('canvas-workspace');
const canvasSplitPanel = document.getElementById('canvas-split-panel');

// Initialize theme
document.documentElement.setAttribute('data-theme', theme);

// Event listeners
document.addEventListener('DOMContentLoaded', init);
messageInput.addEventListener('input', toggleSend);
messageInput.addEventListener('keydown', handleKey);
avatarBtn.addEventListener('click', toggleUserMenu);
document.addEventListener('click', closeUserMenuOutside);
document.addEventListener('keydown', handleKeyboardShortcuts);

// Initialize application
function init() {
  applyTheme(theme);
  initAppsGallery();
  renderChatHistory();
  messageInput.focus();

  // Load saved model preference
  const savedModel = localStorage.getItem('surya_model');
  if (savedModel && MODELS[savedModel]) {
    currentModel = savedModel;
  }

  // Initialize canvas buttons
  initCanvasButtons();

  // Check API health
  checkAPIHealth();

  // Restore auth session
  restoreSession();

  // Load user memories
  loadUserMemories();

  // Health check interval
  setInterval(checkAPIHealth, 30000);

  // Auto-save chats
  setInterval(() => {
    if (currentUser) saveChatsToDb();
  }, 30000);
}

// Theme functions
function applyTheme(t) {
  theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('surya_theme', t);

  // Update settings modal switch
  const switchIcon = document.getElementById('switchIcon');
  const switchLabel = document.getElementById('switchLabel');
  if (switchIcon) switchIcon.textContent = t === 'dark' ? 'dark_mode' : 'light_mode';
  if (switchLabel) switchLabel.textContent = t === 'dark' ? 'Dark' : 'Light';

  // Update highlight.js theme
  const hljsLink = document.getElementById('hljs-theme');
  hljsLink.href = t === 'dark'
    ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
    : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
}

function toggleTheme() {
  applyTheme(theme === 'dark' ? 'light' : 'dark');
}

// Sidebar functions
function toggleSidebar() {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

// User menu functions
function toggleUserMenu() {
  userMenuDropdown.classList.toggle('open');
  if (userMenuDropdown.classList.contains('open')) {
    setTimeout(() => {
      document.addEventListener('click', closeUserMenuOutside, { once: true });
    }, 0);
  }
}

function closeUserMenuOutside(e) {
  if (userMenuDropdown && !userMenuDropdown.contains(e.target) && !avatarBtn.contains(e.target)) {
    userMenuDropdown.classList.remove('open');
  }
}

function closeUserMenu() {
  userMenuDropdown.classList.remove('open');
}

// Settings functions
function openSettings() {
  settingsOverlay.classList.add('open');
  const deleteSection = document.getElementById('deleteAccountSection');
  if (deleteSection) {
    deleteSection.style.display = isGuest() ? 'none' : 'block';
  }
  const connectorsSection = document.getElementById('connectorsSection');
  if (connectorsSection) {
    connectorsSection.style.display = isGuest() ? 'none' : 'block';
    if (!isGuest()) {
      checkGoogleWorkspaceStatus();
      checkSupabaseStatus();
    }
  }
  const roleSelect = document.getElementById('userRoleSelect');
  if (roleSelect) roleSelect.value = userRole;
  loadUserMemories().then(() => renderMemoryList());
}

function closeSettings() {
  settingsOverlay.classList.remove('open');
}

// Auth functions
function showAuthOverlay() {
  authOverlay.classList.remove('hidden');
  closeUserMenu();
}

function toggleAuthMode() {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  document.getElementById('authTitle').textContent = authMode === 'signin' ? 'Welcome to Surya AI' : 'Create Account';
  document.getElementById('authSubtitle').textContent = authMode === 'signin' ? 'Sign in to sync your chats across devices' : 'Create a free account to get started';
  document.getElementById('authBtn').textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
  document.getElementById('authNameField').style.display = authMode === 'signup' ? 'block' : 'none';
  document.getElementById('forgotPasswordLink').style.display = authMode === 'signin' ? 'block' : 'none';
  document.getElementById('authToggle').innerHTML = authMode === 'signin'
    ? 'Don\'t have an account? <a onclick="toggleAuthMode()">Sign Up</a>'
    : 'Already have an account? <a onclick="toggleAuthMode()">Sign In</a>';
  document.getElementById('authError').style.display = 'none';
}

// Chat functions
function newChat() {
  saveCurrentConversation();
  currentConvId = null;
  messages = [];
  attachedFile = null;
  activeTool = null;
  isLoading = false;
  removeFile();
  removeTool(null);
  chatContainer.style.display = 'none';
  chatContainer.innerHTML = '';
  welcomeScreen.style.display = 'flex';
  messageInput.value = '';
  stopBtn.classList.remove('visible');
  toggleSend();
  renderChatHistory();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

function startCanvasProject() {
  newChat();
  selectTool('Canvas', 'dashboard_customize');
  messageInput.focus();
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

// Apps functions
let appsExpanded = true;
function toggleAppsSection() {
  appsExpanded = !appsExpanded;
  const gallery = document.getElementById('appsGallery');
  const icon = document.getElementById('appsToggleIcon');
  if (appsExpanded) {
    gallery.style.display = 'block';
    icon.textContent = 'expand_more';
  } else {
    gallery.style.display = 'none';
    icon.textContent = 'expand_less';
  }
}

function initAppsGallery() {
  const gallery = document.getElementById('appsGallery');
  const icon = document.getElementById('appsToggleIcon');
  if (gallery && icon) {
    gallery.style.display = 'block';
    icon.textContent = 'expand_more';
  }
}

function createAppFromTemplate(template) {
  const templates = {
    todo: 'Create a todo app with React, TypeScript, and Tailwind CSS. Include features for adding, editing, deleting, and marking tasks as complete. Use local storage to persist data.',
    weather: 'Build a weather app using React and a weather API. Show current weather, 5-day forecast, and allow users to search for cities. Include geolocation support.',
    calculator: 'Create a calculator app with a clean UI. Support basic arithmetic operations, memory functions, and calculation history.',
    notes: 'Build a notes app with search functionality. Allow creating, editing, deleting notes with rich text support. Include categories/tags.',
    timer: 'Create a timer app with countdown, stopwatch, and alarm features. Include customizable timers and notification sounds.',
    blog: 'Build a simple blog template with post listing, individual post pages, and a clean, responsive design.'
  };

  newChat();
  const prompt = templates[template];
  messageInput.value = prompt;
  selectTool('Canvas', 'dashboard_customize');
  sendMessage();

  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

// Input functions
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function toggleSend() {
  const hasContent = messageInput.value.trim() || attachedFile;
  sendBtn.classList.toggle('active', !!hasContent);
  sendBtn.disabled = !hasContent;
  const upgradeBtn = document.getElementById('upgradeBtn');
  if (upgradeBtn) {
    upgradeBtn.style.display = messageInput.value.trim().length > 3 ? 'flex' : 'none';
  }
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Cmd/Ctrl + Shift + N = New Chat
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
    e.preventDefault();
    newChat();
  }
  // Escape = Close popups / Stop generating
  if (e.key === 'Escape') {
    document.getElementById('toolsPopup').classList.remove('open');
    closeSettings();
    if (isLoading) stopGeneration();
  }
}

// Canvas functions
function initCanvasButtons() {
  const canvasBackBtn = document.getElementById('canvasBackBtn');
  const canvasDownloadBtn = document.getElementById('canvasDownloadBtn');
  const canvasSplitRefreshBtn = document.getElementById('canvasSplitRefreshBtn');
  const canvasSplitNewTabBtn = document.getElementById('canvasSplitNewTabBtn');
  const canvasSplitDeployBtn = document.getElementById('canvasSplitDeployBtn');
  const canvasSplitExportBtn = document.getElementById('canvasSplitExportBtn');
  const canvasSplitCodeBtn = document.getElementById('canvasSplitCodeBtn');

  if (canvasBackBtn) canvasBackBtn.addEventListener('click', closeCanvasWorkspace);
  if (canvasDownloadBtn) canvasDownloadBtn.addEventListener('click', downloadActiveCanvasApp);
  if (canvasSplitRefreshBtn) canvasSplitRefreshBtn.addEventListener('click', refreshCanvasSplitPreview);
  if (canvasSplitNewTabBtn) canvasSplitNewTabBtn.addEventListener('click', openCanvasSplitInNewTab);
  if (canvasSplitDeployBtn) canvasSplitDeployBtn.addEventListener('click', () => showNotification('Deployment pipeline coming soon.', 'info'));
  if (canvasSplitExportBtn) canvasSplitExportBtn.addEventListener('click', downloadActiveCanvasApp);
  if (canvasSplitCodeBtn) canvasSplitCodeBtn.addEventListener('click', () => setCanvasSplitCodeMode(!splitCodeVisible));
}

// Welcome page functions
function dismissWelcome() {
  welcomePage.classList.add('exit');
  localStorage.setItem('surya_welcome_seen', 'true');
  setTimeout(() => {
    welcomePage.style.display = 'none';
    mainApp.style.display = '';
    init();
  }, 700);
}

// Utility functions
function esc(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function isGuest() {
  return !currentUser;
}

function showNotification(message, type = 'info') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  const icons = { warning: 'warning', error: 'error', success: 'check_circle', info: 'info' };
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `<span class="material-symbols-outlined toast-icon">${icons[type] || 'info'}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getDeviceType() {
  const w = window.innerWidth;
  if (w <= 768) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}</content>
<parameter name="filePath">/Volumes/Prabhas SSD/Devoloper/Surya AI/frontend/js/main.js