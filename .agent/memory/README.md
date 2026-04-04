# Context Memory System

This directory contains snapshots of the codebase context for AI agents and development continuity.

## Purpose
- **Context Preservation**: Maintain understanding across development sessions
- **Knowledge Base**: Store architectural decisions and implementation details
- **Troubleshooting**: Document solutions to complex problems
- **Onboarding**: Help new developers understand the codebase

## File Naming Convention
```
YYYY-MM-DD_topic-description.md
```

Examples:
- `2026-01-15_canvas-webcontainer-integration.md`
- `2026-02-01_authentication-system-refactor.md`
- `2026-03-10_supabase-provisioning-implementation.md`

## Content Guidelines

### Architecture Decisions
```markdown
# Architecture Decision: [Topic]

## Context
[What problem were we trying to solve?]

## Decision
[What approach did we choose and why?]

## Alternatives Considered
- Option 1: [Pros/Cons]
- Option 2: [Pros/Cons]

## Implementation
[Key code changes and technical details]

## Consequences
[What this means for future development]
```

### Problem Solutions
```markdown
# Problem: [Brief Description]

## Symptoms
[What was observed]

## Root Cause
[What was causing the issue]

## Solution
[How it was fixed]

## Prevention
[How to avoid similar issues]
```

### Feature Implementations
```markdown
# Feature: [Feature Name]

## Requirements
[What needed to be built]

## Implementation
[Technical approach and key components]

## Testing
[How it was validated]

## Deployment
[Rollout strategy and monitoring]
```

## Usage

### For AI Agents
- Reference these files for context when working on related features
- Update with new architectural decisions
- Use as examples for consistent documentation

### For Developers
- Read relevant context before making changes
- Add new entries for significant decisions
- Update existing entries when implementations change

## Maintenance

### Regular Tasks
- Review and update outdated information quarterly
- Archive old context files annually
- Ensure all major features have corresponding documentation

### Quality Standards
- Use clear, technical language
- Include code examples where relevant
- Link to related files and documentation
- Keep entries focused and actionable

## Integration with Skills

The memory system works alongside the specialized skills in `../skills/`:

- **Canvas Expert**: References WebContainer integration memories
- **Backend Logic**: Uses server architecture and API design memories
- **Workspace Expert**: Leverages OAuth and Google API implementation memories

This creates a comprehensive knowledge base for intelligent, context-aware development assistance.