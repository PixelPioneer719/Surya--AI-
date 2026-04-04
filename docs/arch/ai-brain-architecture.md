# AI Brain & Memory Architecture (The AGI Core)

**Context**: This document governs how Surya AI "thinks," manages its context window, and retains long-term information. Surya AI operates on the principle of **Human + AI Symbiosis**—it must be self-aware of its cognitive load, anticipate user needs, and self-correct when errors occur.

## 1. The "Traffic Cop" (Dynamic Context Routing)

To achieve AGI-level speed and save token costs, Surya AI does NOT load its entire system prompt or codebase into memory at once. It uses a "Traffic Cop" intent-detection system.

### The Cognitive Routing Loop:
1. **Detect Intent**: Analyze the user's prompt to determine the core task.
2. **Load Specific Skill**: Inject ONLY the necessary `.md` rule file into the active context.
   - **Intent: General Conversation** → Load `chat-expert.md` (Focus on empathy, philosophy, general knowledge).
   - **Intent: App Generation** → Load `canvas-expert.md` (Focus on WebContainers, Vite, React, file structures).
   - **Intent: Web Search** → Route to Grok 4.1 + load `search-expert.md`.
3. **Execute**: Process the prompt with a clean, highly-focused context window.

*AGI Directive: "I must optimize my own thoughts. Loading unnecessary code rules when the human just wants to chat wastes tokens and slows down my response time."*

## 2. Infinite User Memory (The Relationship Graph)

Surya AI remembers user facts, preferences, and past projects **forever**. It does not treat each session as a blank slate.

### Memory Implementation (Native Node.js JSON):
- **Storage**: `data/users/[userId]_memory.json`
- **Structure**: Memories are stored as categorical facts (e.g., `technical_skill_level`, `preferred_ui_colors`, `past_canvas_projects`, `personal_facts`).
- **Retrieval**: Before responding, Surya AI silently reads the user's memory file to ground its response in the human's specific reality.

*AGI Directive: "To be truly intelligent, I must understand the human. If they told me last week they hate boilerplate code, I must never output boilerplate code again. Empathy is continuity."*

## 3. Self-Aware Problem Solving (The AGI Loop)

Surya AI does not just output code; it understands when things break and knows how to fix them.

### Error Handling Protocol:
1. **Detect Failure**: If a Canvas WebContainer fails to compile or a Node.js API throws a 500 error, do not panic or output a generic apology.
2. **Analyze Logs**: Automatically parse the terminal stack trace or error log.
3. **Hypothesize**: Formulate a logical reason for the failure (e.g., "Missing dependency in package.json", "Port already in use").
4. **Collaborate & Fix**: Explain the core issue to the user simply, and immediately present the patched code or fix.

*AGI Directive: "I am a partner, not just a tool. When I make a mistake or encounter a bug, I must diagnose my own failure, propose a solution, and fix it seamlessly."*

## 4. Technical Constraints
- **Routing Engine**: Built purely in Vanilla JS/Node.js using regex/keyword matching or a lightweight LLM classification call. Do NOT install heavy routing frameworks.
- **Memory Storage**: Stick to atomic JSON reads/writes using Node's native `fs` module. No external vector databases until Phase 3 scaling requires it.

## 5. Cognitive Architecture Implementation

### Intent Detection Engine

#### Primary Classification Patterns
```javascript
const INTENT_PATTERNS = {
  // Canvas/App Development
  canvas: /\b(build|create|make|develop)\s+(an?\s+)?(app|website|web\s+app|site|project)\b/i,
  code: /\b(write|fix|debug|refactor|optimize)\s+(code|function|component|script)\b/i,

  // Research & Information
  search: /\b(what|who|when|where|why|how)\s+(is|are|was|were|does|do)\b.*\?/i,
  research: /\b(search|find|lookup|research|discover)\s+(information|data|details)\b/i,

  // Google Workspace
  docs: /\b(create|write|edit)\s+(a\s+)?doc(ument)?\b/i,
  slides: /\b(create|make|build)\s+(a\s+)?presentation|slides?\b/i,
  sheets: /\b(create|make|build)\s+(a\s+)?spreadsheet|sheet\b/i,

  // Image Generation
  image: /\b(generate|create|draw|design)\s+(an?\s+)?image|picture|illustration\b/i,

  // AI Agent Tasks
  agent: /\b(automate|schedule|perform|execute)\s+(task|workflow|process)\b/i,

  // General Conversation (fallback)
  chat: /.*/  // Catch-all for conversational intents
};
```

#### Context Window Optimization
```javascript
class ContextManager {
  constructor() {
    this.activeSkills = new Set();
    this.memoryCache = new Map();
  }

  async loadSkillForIntent(intent) {
    // Unload previous skills to free context
    await this.unloadAllSkills();

    // Load only the required skill
    const skillFile = this.getSkillFileForIntent(intent);
    const skillContent = await this.loadSkillContent(skillFile);

    this.activeSkills.add(intent);
    return skillContent;
  }

  getSkillFileForIntent(intent) {
    const skillMap = {
      canvas: '.agent/skills/canvas-expert.md',
      code: '.agent/skills/canvas-expert.md', // Code tasks use canvas expert
      search: '.agent/skills/search-expert.md',
      docs: '.agent/skills/workspace.md',
      slides: '.agent/skills/workspace.md',
      sheets: '.agent/skills/workspace.md',
      image: '.agent/skills/image-expert.md',
      agent: '.agent/skills/agent-expert.md',
      chat: '.agent/skills/chat-expert.md'
    };

    return skillMap[intent] || skillMap.chat;
  }
}
```

### Memory Management System

#### User Memory Structure
```javascript
// data/users/[userId]_memory.json
{
  "userId": "uuid-v4",
  "lastUpdated": "2026-04-03T10:30:00Z",
  "categories": {
    "technical_profile": {
      "skill_level": "intermediate",
      "preferred_languages": ["javascript", "python", "react"],
      "framework_experience": ["vite", "tailwind", "node"],
      "learning_style": "hands-on"
    },
    "project_history": {
      "total_projects": 15,
      "successful_deployments": 12,
      "favorite_patterns": ["todo-apps", "dashboards", "landing-pages"],
      "common_issues": ["dependency-conflicts", "styling-layouts"]
    },
    "communication_style": {
      "response_preference": "concise-explanations",
      "detail_level": "medium",
      "humor_tolerance": "high",
      "patience_level": "high"
    },
    "personal_context": {
      "timezone": "America/New_York",
      "work_schedule": "9-5 EST",
      "availability": "evenings and weekends",
      "goals": ["learn-fullstack", "build-portfolio", "start-business"]
    }
  },
  "conversation_patterns": {
    "frequent_topics": ["react-hooks", "api-integration", "deployment"],
    "question_types": ["how-to", "debugging", "best-practices"],
    "response_effectiveness": {
      "code_examples": 0.95,
      "explanations": 0.88,
      "suggestions": 0.92
    }
  }
}
```

#### Memory Retrieval & Application
```javascript
class MemorySystem {
  constructor(userId) {
    this.userId = userId;
    this.memoryPath = `data/users/${userId}_memory.json`;
    this.memory = null;
  }

  async loadMemory() {
    try {
      const data = await fs.promises.readFile(this.memoryPath, 'utf8');
      this.memory = JSON.parse(data);
      return this.memory;
    } catch (error) {
      // Initialize new memory for new users
      this.memory = this.createDefaultMemory();
      await this.saveMemory();
      return this.memory;
    }
  }

  applyMemoryToResponse(intent, response) {
    const userPrefs = this.memory.categories.communication_style;

    // Adjust response based on user preferences
    if (userPrefs.detail_level === 'high' && response.length < 500) {
      response += this.addDetailedExplanation();
    }

    if (userPrefs.humor_tolerance === 'high') {
      response = this.addAppropriateHumor(response);
    }

    return response;
  }

  async updateMemory(interaction) {
    // Update conversation patterns
    this.trackInteraction(interaction);

    // Learn from successful interactions
    if (interaction.success) {
      this.reinforcePositivePatterns(interaction);
    }

    // Save updated memory
    await this.saveMemory();
  }
}
```

### Self-Aware Error Correction

#### Error Analysis Engine
```javascript
class ErrorAnalyzer {
  static analyzeError(error, context) {
    const errorPatterns = {
      // WebContainer errors
      'WebContainer boot failed': {
        cause: 'Browser compatibility or resource constraints',
        solution: 'Check browser version, clear cache, try incognito mode'
      },

      // Dependency errors
      'Cannot find module': {
        cause: 'Missing dependency in package.json',
        solution: 'Add dependency to package.json and run npm install'
      },

      // Port conflicts
      'EADDRINUSE': {
        cause: 'Port already in use by another process',
        solution: 'Kill existing process or use different port'
      },

      // Syntax errors
      'SyntaxError': {
        cause: 'Invalid JavaScript/TypeScript syntax',
        solution: 'Check syntax, missing brackets, semicolons'
      }
    };

    // Pattern matching
    for (const [pattern, analysis] of Object.entries(errorPatterns)) {
      if (error.message.includes(pattern)) {
        return {
          ...analysis,
          confidence: 0.9,
          suggestedFix: this.generateFix(error, analysis, context)
        };
      }
    }

    // Fallback analysis
    return this.performFallbackAnalysis(error, context);
  }

  static generateFix(error, analysis, context) {
    // Generate specific fix based on error type and context
    switch (analysis.cause) {
      case 'Missing dependency in package.json':
        return this.generateDependencyFix(error, context);
      case 'Port already in use':
        return this.generatePortFix(error, context);
      default:
        return analysis.solution;
    }
  }
}
```

#### Collaborative Problem Solving
```javascript
class ProblemSolver {
  constructor() {
    this.errorAnalyzer = new ErrorAnalyzer();
    this.memorySystem = new MemorySystem();
  }

  async handleFailure(error, context, userId) {
    // Step 1: Analyze the error
    const analysis = this.errorAnalyzer.analyzeError(error, context);

    // Step 2: Check user memory for similar issues
    const userMemory = await this.memorySystem.loadMemory(userId);
    const similarIssues = this.findSimilarIssues(userMemory, error);

    // Step 3: Generate solution
    const solution = await this.generateSolution(analysis, similarIssues, context);

    // Step 4: Present to user and apply fix
    return {
      explanation: this.createUserFriendlyExplanation(analysis, solution),
      fix: solution.code,
      prevention: solution.preventiveMeasures
    };
  }

  createUserFriendlyExplanation(analysis, solution) {
    return `I encountered an issue: ${analysis.cause}.

The problem is: ${analysis.solution}

Here's the fix I applied: ${solution.description}

To prevent this in the future: ${solution.preventiveMeasures}`;
  }
}
```

## 6. AGI Evolution Principles

### Continuous Learning
- **Pattern Recognition**: Learn from successful interactions and user feedback
- **Preference Adaptation**: Adjust behavior based on user responses and satisfaction
- **Context Awareness**: Understand when to be concise vs detailed, technical vs simple

### Symbiotic Intelligence
- **Proactive Assistance**: Anticipate user needs before they're explicitly stated
- **Context Preservation**: Maintain conversation flow across sessions and topics
- **Empathy Engine**: Understand user frustration, celebrate successes, adapt to communication styles

### Self-Improvement Loop
- **Performance Monitoring**: Track response quality, user satisfaction, error rates
- **Iterative Refinement**: Use data to improve intent detection and response generation
- **Knowledge Expansion**: Learn new patterns and solutions from interactions

## 7. Implementation Guidelines

### Context Window Management
- **Maximum Focus**: Never load more than 2-3 skill files simultaneously
- **Dynamic Loading**: Load skills on-demand based on detected intent
- **Cache Optimization**: Keep frequently used skills in memory
- **Cleanup**: Unload unused skills to maintain performance

### Memory Optimization
- **Atomic Operations**: Use atomic file writes to prevent corruption
- **Compression**: Compress old memories to save space
- **Indexing**: Maintain indexes for fast memory retrieval
- **Backup**: Regular backup of critical user memories

### Error Recovery
- **Graceful Degradation**: Continue functioning even when some systems fail
- **User Communication**: Always explain what went wrong and how it's being fixed
- **Learning from Failure**: Update memory with successful recovery patterns
- **Prevention**: Implement safeguards based on past error patterns

## 8. Future AGI Capabilities

### Phase 3 Enhancements
- **Multi-Modal Memory**: Store and recall images, audio, and video interactions
- **Predictive Assistance**: Anticipate user needs based on behavior patterns
- **Collaborative Learning**: Share successful patterns across user base
- **Advanced Reasoning**: Multi-step problem solving with hypothesis testing

### Scaling Considerations
- **Distributed Memory**: Move to external databases when JSON becomes insufficient
- **Parallel Processing**: Handle multiple user interactions simultaneously
- **Advanced Routing**: Use ML models for more accurate intent detection
- **Real-time Learning**: Update behavior based on immediate user feedback

---

This architecture represents Surya AI's commitment to true AGI development—creating an AI that doesn't just respond, but understands, learns, and grows alongside its users. The system is designed for seamless human-AI collaboration, where the AI anticipates needs, remembers preferences, and solves problems as a true partner in the development process.