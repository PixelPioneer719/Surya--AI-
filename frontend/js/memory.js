// ═══════════════════════════════════════════════════
//  MEMORY.JS - Memory Management & Database Operations
// ═══════════════════════════════════════════════════

// Memory Management
let memory = {
  conversations: {},
  settings: {},
  userPreferences: {}
};

function loadMemory() {
  try {
    const saved = localStorage.getItem('surya_memory');
    if (saved) {
      memory = { ...memory, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load memory:', e);
  }
}

function saveMemory() {
  try {
    localStorage.setItem('surya_memory', JSON.stringify(memory));
  } catch (e) {
    console.warn('Failed to save memory:', e);
  }
}

function updateMemory(key, value) {
  memory[key] = value;
  saveMemory();
}

function getMemory(key) {
  return memory[key];
}

// Supabase Integration
let supabaseClient = null;

async function initSupabase() {
  if (supabaseClient) return supabaseClient;

  try {
    // Try to get Supabase config from environment or settings
    const config = await getSupabaseConfig();
    if (config && config.url && config.key) {
      supabaseClient = window.supabase.createClient(config.url, config.key);
      console.log('Supabase initialized');
      return supabaseClient;
    }
  } catch (e) {
    console.warn('Supabase initialization failed:', e);
  }

  return null;
}

async function getSupabaseConfig() {
  // Check if configured in settings
  const connectors = getMemory('connectors') || {};
  if (connectors.supabase && connectors.supabase.url && connectors.supabase.key) {
    return {
      url: connectors.supabase.url,
      key: connectors.supabase.key
    };
  }

  // Try to fetch from server
  try {
    const res = await fetch('/api/connectors/supabase/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  return null;
}

async function provisionSupabaseDatabase(schema) {
  const client = await initSupabase();
  if (!client) {
    throw new Error('Supabase not configured. Please connect Supabase in Settings → Connectors.');
  }

  try {
    // Execute schema SQL
    const { error } = await client.rpc('exec_sql', { sql: schema });
    if (error) throw error;

    console.log('Database provisioned successfully');
    return { success: true };
  } catch (e) {
    console.error('Database provisioning failed:', e);
    throw e;
  }
}

async function saveToSupabase(table, data) {
  const client = await initSupabase();
  if (!client) return null;

  try {
    const { data: result, error } = await client
      .from(table)
      .insert(data)
      .select();

    if (error) throw error;
    return result;
  } catch (e) {
    console.error('Supabase save failed:', e);
    return null;
  }
}

async function loadFromSupabase(table, query = {}) {
  const client = await initSupabase();
  if (!client) return null;

  try {
    let queryBuilder = client.from(table).select('*');

    if (query.where) {
      for (const [column, value] of Object.entries(query.where)) {
        queryBuilder = queryBuilder.eq(column, value);
      }
    }

    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }

    if (query.orderBy) {
      queryBuilder = queryBuilder.order(query.orderBy.column, { ascending: query.orderBy.ascending !== false });
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Supabase load failed:', e);
    return null;
  }
}

async function updateInSupabase(table, id, data) {
  const client = await initSupabase();
  if (!client) return null;

  try {
    const { data: result, error } = await client
      .from(table)
      .update(data)
      .eq('id', id)
      .select();

    if (error) throw error;
    return result;
  } catch (e) {
    console.error('Supabase update failed:', e);
    return null;
  }
}

async function deleteFromSupabase(table, id) {
  const client = await initSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Supabase delete failed:', e);
    return false;
  }
}

// Canvas Database Integration
async function saveCanvasProject(projectData) {
  const client = await initSupabase();
  if (!client) {
    // Fallback to local storage
    const projects = getMemory('canvas_projects') || [];
    projects.push({ ...projectData, id: Date.now().toString(), createdAt: new Date().toISOString() });
    updateMemory('canvas_projects', projects);
    return projects[projects.length - 1];
  }

  try {
    const { data, error } = await client
      .from('canvas_projects')
      .insert({
        ...projectData,
        user_id: currentUser?.id,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (e) {
    console.error('Failed to save canvas project:', e);
    return null;
  }
}

async function loadCanvasProjects() {
  const client = await initSupabase();
  if (!client) {
    return getMemory('canvas_projects') || [];
  }

  try {
    const { data, error } = await client
      .from('canvas_projects')
      .select('*')
      .eq('user_id', currentUser?.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to load canvas projects:', e);
    return [];
  }
}

async function updateCanvasProject(id, updates) {
  const client = await initSupabase();
  if (!client) {
    const projects = getMemory('canvas_projects') || [];
    const index = projects.findIndex(p => p.id === id);
    if (index >= 0) {
      projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
      updateMemory('canvas_projects', projects);
      return projects[index];
    }
    return null;
  }

  try {
    const { data, error } = await client
      .from('canvas_projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (e) {
    console.error('Failed to update canvas project:', e);
    return null;
  }
}

async function deleteCanvasProject(id) {
  const client = await initSupabase();
  if (!client) {
    const projects = getMemory('canvas_projects') || [];
    const filtered = projects.filter(p => p.id !== id);
    updateMemory('canvas_projects', filtered);
    return true;
  }

  try {
    const { error } = await client
      .from('canvas_projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Failed to delete canvas project:', e);
    return false;
  }
}

// Settings & Preferences
function saveSettings(settings) {
  updateMemory('settings', { ...getMemory('settings'), ...settings });
}

function getSettings() {
  return getMemory('settings') || {};
}

function saveUserPreferences(preferences) {
  updateMemory('userPreferences', { ...getMemory('userPreferences'), ...preferences });
}

function getUserPreferences() {
  return getMemory('userPreferences') || {};
}

// Connectors Management
async function connectSupabase(url, key) {
  try {
    // Test connection
    const testClient = window.supabase.createClient(url, key);
    const { data, error } = await testClient.from('test').select('*').limit(1);
    if (error && !error.message.includes('relation "public.test" does not exist')) {
      throw error;
    }

    // Save connection
    const connectors = getMemory('connectors') || {};
    connectors.supabase = { url, key, connected: true, connectedAt: new Date().toISOString() };
    updateMemory('connectors', connectors);

    // Initialize client
    supabaseClient = testClient;

    return { success: true };
  } catch (e) {
    console.error('Supabase connection failed:', e);
    return { success: false, error: e.message };
  }
}

async function disconnectSupabase() {
  const connectors = getMemory('connectors') || {};
  if (connectors.supabase) {
    connectors.supabase = { ...connectors.supabase, connected: false, disconnectedAt: new Date().toISOString() };
    updateMemory('connectors', connectors);
  }
  supabaseClient = null;
}

function getConnectorsStatus() {
  return getMemory('connectors') || {};
}

// Google Workspace Integration
async function connectGoogleWorkspace() {
  try {
    const res = await fetch('/api/connectors/google-workspace/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.authUrl) {
      window.open(data.authUrl, '_blank');
    }
    return data;
  } catch (e) {
    console.error('Google Workspace connection failed:', e);
    return { error: e.message };
  }
}

async function checkGoogleWorkspaceStatus() {
  try {
    const res = await fetch('/api/connectors/google-workspace/status');
    return await res.json();
  } catch (e) {
    return { connected: false };
  }
}

async function disconnectGoogleWorkspace() {
  try {
    const res = await fetch('/api/connectors/google-workspace/disconnect', {
      method: 'POST'
    });
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function queryGoogleWorkspace(prompt) {
  try {
    const res = await fetch('/api/google-workspace/query', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

// Image Generation
async function generateImage(prompt) {
  try {
    const res = await fetch('/api/image', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.id) {
      return pollImageStatus(data.id);
    }
    return data;
  } catch (e) {
    return { error: e.message };
  }
}

async function pollImageStatus(id) {
  return new Promise((resolve) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/image-status?id=${id}`);
        const data = await res.json();
        if (data.done) {
          resolve(data);
        } else {
          setTimeout(poll, 2000);
        }
      } catch (e) {
        resolve({ error: e.message });
      }
    };
    poll();
  });
}

// Agent Task Planning
async function planAgentTask(task) {
  try {
    const res = await fetch(`/api/agent?task=${encodeURIComponent(task)}`);
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

// Initialize memory on load
loadMemory();</content>
<parameter name="filePath">/Volumes/Prabhas SSD/Devoloper/Surya AI/frontend/js/memory.js