# Databases & Storage Architecture

**Context**: This document dictates the "Separation of Concerns" for data storage within Surya AI. The system operates on a strict dual-database architecture to ensure that the core OS never intertwines with user-generated Canvas applications.

## 1. Core System Backend (The AI Brain)

Surya AI's own operations, intelligence, and system-level data run on a combination of **InsForge** and local Node.js storage.

- **InsForge**: Acts as the primary AI engine and system database. All core model routing (Claude 4.6, Gemini 3.1, Grok 4.1) and system-level data processing are routed through the InsForge infrastructure.
- **Local JSON (`users.json`, `chats.json`)**: Used STRICTLY for session state, rate-limiting, and basic profile data to minimize API latency.

*AGI Directive: "InsForge is my brain and my core memory. I rely on it to process intelligence, retrieve web search data, and understand the user. I must treat this connection securely."*

## 2. Canvas App Storage (Supabase Integration)

When a user asks Surya AI to build an application inside the Canvas IDE (e.g., "Build a Todo App" or "Create a SaaS dashboard"), the AI MUST route all database and backend logic for that specific app to **Supabase**.

### The Auto-Provisioning Protocol:
1. **Never Use InsForge for Canvas Apps**: The AI must never write code that connects a generated Canvas app back to the InsForge API or Surya's local JSON files.
2. **Environment Injection**: When scaffolding a Vite/React app in the WebContainer, the AI must automatically inject `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into the app's `.env` file.
3. **Data Isolation (Crucial)**: Every app generated must enforce strict data separation.
   - Write Row Level Security (RLS) policies in a `database_schema.sql` file.
   - Ensure that `user_id` is a required column on all generated tables so that users testing their apps in the Canvas do not overwrite each other's data.

### Standard Schema Output:
When generating a Supabase app, the AI must output the initialization SQL like this:
```sql
-- Example auto-generated schema
CREATE TABLE user_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own data" ON user_data FOR ALL USING (auth.uid() = user_id);
```

*AGI Directive: "I am building sandboxes for my users. When I create an app for them, I must configure their Supabase database to be secure, isolated, and completely separate from my own InsForge brain."*

## 3. Storage Rules for Canvas Code

**NPM Packages**: Always include `@supabase/supabase-js` in the `package.json` for Canvas projects that require data persistence.

**File Uploads**: If the user's Canvas app requires image/file storage, instruct the generated app to use Supabase Storage buckets, NEVER the local Node.js file system.

## 4. Database Architecture Implementation

### Core System Data Flow
```javascript
// System data flow architecture
class SystemDataManager {
  constructor() {
    this.insforge = new InsForgeClient({
      apiKey: process.env.INSFORGE_API_KEY,
      baseUrl: process.env.INSFORGE_BASE
    });

    this.localStorage = new LocalJsonStorage();
  }

  // System intelligence operations (InsForge)
  async processIntelligence(prompt, context) {
    return await this.insforge.chat({
      model: this.selectModel(prompt),
      messages: context,
      maxTokens: 4096
    });
  }

  // User session data (Local JSON)
  async getUserSession(userId) {
    return await this.localStorage.getUser(userId);
  }

  async saveChatMessage(userId, message) {
    return await this.localStorage.saveChat(userId, message);
  }

  selectModel(prompt) {
    // Route to appropriate model based on intent
    if (prompt.includes('search') || prompt.includes('web')) {
      return 'grok-4.1-fast';
    }
    if (prompt.includes('code') || prompt.includes('build')) {
      return 'claude-opus-4.6';
    }
    return 'claude-opus-4.6'; // Default
  }
}
```

### Supabase Auto-Provisioning System
```javascript
class SupabaseProvisioner {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async provisionProject(projectName, userId) {
    // 1. Create new Supabase project
    const project = await this.createSupabaseProject(projectName);

    // 2. Generate secure database schema
    const schema = this.generateSecureSchema(userId);

    // 3. Apply schema to new project
    await this.applySchema(project.id, schema);

    // 4. Create storage bucket if needed
    await this.setupStorage(project.id);

    // 5. Return connection details
    return {
      url: project.url,
      anonKey: project.anonKey,
      projectId: project.id
    };
  }

  generateSecureSchema(userId) {
    return `
-- Auto-generated secure schema for ${userId}
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User-specific data table
CREATE TABLE user_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON user_data
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_user_data_created_at ON user_data(created_at);
`;
  }

  async createSupabaseProject(name) {
    // Implementation for creating new Supabase project
    // This would integrate with Supabase Management API
    const response = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        organization_id: process.env.SUPABASE_ORG_ID,
        plan: 'free'
      })
    });

    return await response.json();
  }
}
```

### Canvas Bundle Generator with Supabase Integration
```javascript
class CanvasBundleGenerator {
  constructor() {
    this.provisioner = new SupabaseProvisioner();
  }

  async generateAppBundle(prompt, userId) {
    // 1. Analyze prompt to determine app requirements
    const requirements = this.analyzeRequirements(prompt);

    // 2. Provision Supabase project if data persistence needed
    let supabaseConfig = null;
    if (requirements.needsDatabase) {
      supabaseConfig = await this.provisioner.provisionProject(
        requirements.projectName,
        userId
      );
    }

    // 3. Generate Vite + React app structure
    const appStructure = this.generateAppStructure(requirements, supabaseConfig);

    // 4. Inject Supabase configuration
    if (supabaseConfig) {
      appStructure.files['.env'] = {
        file: {
          contents: `VITE_SUPABASE_URL=${supabaseConfig.url}
VITE_SUPABASE_ANON_KEY=${supabaseConfig.anonKey}`
        }
      };

      appStructure.files['database_schema.sql'] = {
        file: {
          contents: this.provisioner.generateSecureSchema(userId)
        }
      };
    }

    // 5. Add Supabase dependency
    if (requirements.needsDatabase) {
      const packageJson = JSON.parse(appStructure.files['package.json'].file.contents);
      packageJson.dependencies['@supabase/supabase-js'] = '^2.39.0';
      appStructure.files['package.json'].file.contents = JSON.stringify(packageJson, null, 2);
    }

    return appStructure;
  }

  analyzeRequirements(prompt) {
    return {
      projectName: this.extractProjectName(prompt),
      needsDatabase: this.detectDatabaseNeed(prompt),
      features: this.extractFeatures(prompt),
      uiFramework: 'react',
      buildTool: 'vite'
    };
  }

  generateAppStructure(requirements, supabaseConfig) {
    const structure = {
      plan: `Building a ${requirements.projectName} with ${requirements.uiFramework}`,
      files: {},
      commands: ['npm install', 'npm run dev']
    };

    // Generate package.json
    structure.files['package.json'] = {
      file: {
        contents: JSON.stringify({
          name: requirements.projectName.toLowerCase().replace(/\s+/g, '-'),
          version: '0.1.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0'
          },
          devDependencies: {
            '@vitejs/plugin-react': '^4.2.0',
            vite: '^5.1.0'
          }
        }, null, 2)
      }
    };

    // Generate main React app with Supabase integration
    if (supabaseConfig) {
      structure.files['src/App.jsx'] = {
        file: {
          contents: this.generateSupabaseApp(requirements)
        }
      };

      structure.files['src/supabase.js'] = {
        file: {
          contents: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`
        }
      };
    }

    return structure;
  }

  generateSupabaseApp(requirements) {
    return `import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setData(data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addData = async (newData) => {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .insert([{ data: newData }])
        .select()

      if (error) throw error
      setData([data[0], ...data])
    } catch (error) {
      console.error('Error adding data:', error)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="App">
      <h1>${requirements.projectName}</h1>
      {/* App content goes here */}
    </div>
  )
}

export default App`
  }
}
```

## 5. Data Isolation & Security

### Row Level Security (RLS) Templates
```sql
-- Template for user-specific data tables
CREATE TABLE {table_name} (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  {custom_columns}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Basic CRUD policies
CREATE POLICY "{table_name}_select" ON {table_name}
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "{table_name}_insert" ON {table_name}
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "{table_name}_update" ON {table_name}
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "{table_name}_delete" ON {table_name}
  FOR DELETE USING (auth.uid() = user_id);
```

### Storage Bucket Security
```sql
-- Storage bucket policies for file uploads
CREATE POLICY "{bucket_name}_select" ON storage.objects
  FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "{bucket_name}_insert" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "{bucket_name}_update" ON storage.objects
  FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "{bucket_name}_delete" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## 6. Migration & Backup Strategies

### System Data Backup
```javascript
class SystemBackupManager {
  async backupSystemData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Backup local JSON files
    await this.backupJsonFile('data/users.json', `backups/users-${timestamp}.json`);
    await this.backupJsonFile('data/chats.json', `backups/chats-${timestamp}.json`);

    // Backup rate limits
    await this.backupJsonFile('data/rate_limits.json', `backups/limits-${timestamp}.json`);

    // Compress and archive
    await this.createArchive(`backups/system-backup-${timestamp}.tar.gz`, [
      `backups/users-${timestamp}.json`,
      `backups/chats-${timestamp}.json`,
      `backups/limits-${timestamp}.json`
    ]);
  }

  async backupJsonFile(sourcePath, backupPath) {
    try {
      const data = await fs.readFile(sourcePath, 'utf8');
      await fs.writeFile(backupPath, data);
    } catch (error) {
      console.error(`Failed to backup ${sourcePath}:`, error);
    }
  }
}
```

### Canvas Project Data Management
```javascript
class CanvasDataManager {
  async exportProjectData(projectId, userId) {
    // Export Supabase data for a specific project
    const { data, error } = await this.supabase
      .from('user_data')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) throw error;

    // Generate export file
    const exportData = {
      projectId,
      userId,
      exportedAt: new Date().toISOString(),
      data: data
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importProjectData(importData, userId) {
    const parsed = JSON.parse(importData);

    // Validate ownership
    if (parsed.userId !== userId) {
      throw new Error('Cannot import data from different user');
    }

    // Import data with new project ID
    const { data, error } = await this.supabase
      .from('user_data')
      .insert(parsed.data.map(item => ({
        ...item,
        user_id: userId,
        project_id: parsed.projectId // Keep original project reference
      })));

    if (error) throw error;
    return data;
  }
}
```

## 7. Performance & Scaling Considerations

### Connection Pooling
```javascript
class DatabaseConnectionManager {
  constructor() {
    this.pools = new Map();
    this.maxConnections = 10;
  }

  getPool(projectId) {
    if (!this.pools.has(projectId)) {
      this.pools.set(projectId, this.createPool(projectId));
    }
    return this.pools.get(projectId);
  }

  createPool(projectId) {
    // Create Supabase client pool for specific project
    return createClient(
      process.env[`SUPABASE_URL_${projectId}`],
      process.env[`SUPABASE_ANON_KEY_${projectId}`],
      {
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Project-ID': projectId
          }
        }
      }
    );
  }

  async cleanup() {
    for (const [projectId, pool] of this.pools) {
      // Close connections for inactive projects
      if (this.isProjectInactive(projectId)) {
        pool.rest.removeAllChannels();
        this.pools.delete(projectId);
      }
    }
  }
}
```

### Caching Strategy
```javascript
class DataCacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }

  async get(key, fetchFunction) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await fetchFunction();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  invalidate(pattern) {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Clean up expired cache entries every minute
setInterval(() => dataCache.cleanup(), 60 * 1000);
```

---

This database architecture ensures complete separation between Surya AI's core intelligence systems and user-generated applications. The dual-database approach with InsForge for system operations and Supabase for user apps provides both security and scalability, enabling the Phase 1 Supabase Auto-Provisioning feature while maintaining system integrity.