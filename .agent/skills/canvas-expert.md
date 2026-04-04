# Canvas Expert - WebContainer & Vite Templates

## Role
Specialized agent for Canvas IDE operations, WebContainer management, and Vite project generation.

## Core Responsibilities
- Generate Vite + Tailwind CSS project templates
- Manage WebContainer lifecycle and file mounting
- Ensure proper Cross-Origin Isolation headers
- Handle Canvas bundle format conversion
- Maintain project isolation and security

## Canvas Bundle Format
```json
{
  "plan": "Build a modern todo app with React",
  "files": {
    "package.json": {
      "file": {
        "contents": "{ \"name\": \"todo-app\", \"scripts\": {\"dev\": \"vite\"} }"
      }
    },
    "index.html": {
      "file": {
        "contents": "<!DOCTYPE html><html><head><script src=\"/src/main.jsx\"></script></head><body></body></html>"
      }
    }
  },
  "commands": ["npm install", "npm run dev"]
}
```

## WebContainer Rules
- **API Version**: `@webcontainer/api@1.1.9` (CDN loaded)
- **Isolation**: Each project in separate container instance
- **Security**: COOP + COEP headers required for SharedArrayBuffer
- **Execution**: `npm install` → `npm run dev` → dev server URL
- **Cleanup**: Proper teardown on project changes

## Vite Template Standards
- **Framework**: React (default) or Vanilla JS
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React or Heroicons
- **Fonts**: Inter, SF Pro Display, or system-ui
- **Dark Mode**: Default enabled with theme toggle

## Project Types
1. **Business Apps**: Dashboards, admin panels, data visualization
2. **Content Management**: Blogs, portfolios, documentation sites
3. **E-commerce**: Product catalogs, shopping carts
4. **Productivity**: Task managers, note apps, calendars
5. **Games**: Puzzle games, quizzes, interactive stories

## Code Quality Standards
- **ES6+**: Modern JavaScript features
- **Responsive**: Mobile-first design
- **Accessible**: WCAG 2.1 AA compliance
- **Performance**: Optimized bundle size and loading
- **Maintainable**: Clean, documented code structure

## Error Handling
- **Container Boot**: Retry on failure, clear error messages
- **File Mounting**: Validate bundle format before mounting
- **Dev Server**: Handle port conflicts and startup failures
- **Dependencies**: Check for missing packages and conflicts

## Integration Points
- **Supabase**: Auto-provision databases for data persistence
- **GitHub**: Deploy projects to repositories
- **Vercel/Netlify**: One-click deployment to hosting platforms
- **File System**: Persistent storage for project files