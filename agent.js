// ═══════════════════════════════════════════════════
//  SURYA AI AGENT — Server-side Planning Only
//  Execution happens in the frontend (window.open)
//  Works everywhere: deployed, mobile, any browser
// ═══════════════════════════════════════════════════

const https = require('https');

// InsForge API config
const INSFORGE_BASE = 'https://rme548ii.ap-southeast.insforge.app';
const INSFORGE_API_KEY = 'ik_7620eb1429dc9d3ac5cb459ba092e564';

const MODELS = {
  general: 'anthropic/claude-opus-4.6',
  code: 'anthropic/claude-opus-4.6',
  search: 'x-ai/grok-4.1-fast'
};

const SAFE_SITES = [
  'google.com', 'youtube.com', 'spotify.com', 'github.com',
  'stackoverflow.com', 'wikipedia.org', 'reddit.com',
  'twitter.com', 'x.com', 'linkedin.com', 'notion.so',
  'docs.google.com', 'drive.google.com', 'gmail.com',
  'open.spotify.com', 'music.youtube.com', 'soundcloud.com',
  'amazon.com', 'flipkart.com', 'maps.google.com',
  'translate.google.com', 'chat.openai.com', 'claude.ai',
  'codepen.io', 'replit.com', 'codesandbox.io', 'vercel.com',
  'netlify.com', 'figma.com', 'canva.com'
];

const BLOCKED_ACTIONS = [
  'delete', 'format', 'sudo', 'rm -rf', 'shutdown',
  'admin', 'password', 'credentials', 'credit card',
  'bank', 'payment'
];

function isSafeSite(url) {
  try {
    const hostname = new URL(url).hostname;
    return SAFE_SITES.some(s => hostname.includes(s));
  } catch { return false; }
}

function isBlockedAction(action) {
  const lower = action.toLowerCase();
  return BLOCKED_ACTIONS.some(b => lower.includes(b));
}

function callInsForge(model, systemPrompt, userMsg) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg }
      ],
      stream: false,
      maxTokens: 2000
    });

    const url = new URL(INSFORGE_BASE + '/api/ai/chat/completion');
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + INSFORGE_API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.text || data.content || '');
        } catch (e) { reject(new Error('Failed to parse AI response')); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function detectTaskType(task) {
  const t = task.toLowerCase();
  if (/\b(code|programming|javascript|python|html|css|react|node|api|debug|function|class|algorithm|compile|deploy|git)\b/.test(t)) return 'code';
  if (/\b(search|find|look up|what is|who is|latest|news|weather|current|trending)\b/.test(t)) return 'search';
  return 'general';
}

// Server only plans — frontend executes
async function handleAgentRequest(req, res, task) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  function sendSSE(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const taskType = detectTaskType(task);
    sendSSE({ phase: 'planning', message: `Analyzing task... (type: ${taskType})`, taskType });

    const model = MODELS[taskType] || MODELS.general;

    const systemPrompt = `You are Surya AI Agent Planner. Create a browser automation plan that runs in the user's browser.

Output ONLY a valid JSON array of steps. Each step:
- "action": one of "open_tab", "wait", "notify"
- "target": URL or message text
- "description": human-readable step description

IMPORTANT: The ONLY executable action is "open_tab" which opens a URL in a new browser tab.
Use "notify" to show a message to the user (e.g., instructions they need to follow manually).
Use "wait" for delays between steps.

RULES:
- ALWAYS use direct URLs with search queries built-in:
  - YouTube search: https://www.youtube.com/results?search_query=QUERY
  - YouTube video: https://www.youtube.com/watch?v=VIDEO_ID
  - Google search: https://www.google.com/search?q=QUERY
  - Spotify search: https://open.spotify.com/search/QUERY
  - GitHub search: https://github.com/search?q=QUERY
  - Wikipedia: https://en.wikipedia.org/wiki/TOPIC
  - Google Maps: https://www.google.com/maps/search/QUERY
  - Google Translate: https://translate.google.com/?sl=auto&tl=en&text=QUERY
  - Amazon search: https://www.amazon.com/s?k=QUERY
- Keep plans to 1-4 steps max
- Only use safe, well-known websites
- Never include login, password, or payment URLs
- For multi-site tasks, open multiple tabs
- If the user needs to do something manually (like click play), add a "notify" step

Example for "Open YouTube and search for lo-fi music":
[
  {"action":"open_tab","target":"https://www.youtube.com/results?search_query=lo-fi+music","description":"Open YouTube with lo-fi music search"}
]

Example for "Open Spotify and play chill vibes":
[
  {"action":"open_tab","target":"https://open.spotify.com/search/chill%20vibes","description":"Open Spotify search for chill vibes"},
  {"action":"notify","target":"Click on a playlist or song to start playing","description":"Play instruction"}
]

Example for "Search for React tutorials on Google and GitHub":
[
  {"action":"open_tab","target":"https://www.google.com/search?q=React+tutorials","description":"Search Google for React tutorials"},
  {"action":"open_tab","target":"https://github.com/search?q=react+tutorial&type=repositories","description":"Search GitHub for React tutorial repos"}
]

Output ONLY the JSON array.`;

    const response = await callInsForge(model, systemPrompt, task);

    let steps;
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) steps = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found');
    } catch (e) {
      throw new Error('Failed to plan steps: ' + e.message);
    }

    // Validate steps
    for (const step of steps) {
      if (step.action === 'open_tab' && !isSafeSite(step.target)) {
        step.blocked = true;
        step.reason = `Site not in safe list`;
      }
      if (isBlockedAction(step.description || '')) {
        step.blocked = true;
        step.reason = 'Action blocked by security policy';
      }
    }

    // Send plan to frontend — frontend will execute
    sendSSE({
      phase: 'execute',
      steps: steps,
      taskType
    });

    sendSSE({
      phase: 'complete',
      message: `Plan ready with ${steps.length} steps`,
      summary: { totalSteps: steps.length }
    });

  } catch (err) {
    sendSSE({ phase: 'error', message: `Agent error: ${err.message}` });
  }

  res.end();
}

module.exports = { handleAgentRequest };
