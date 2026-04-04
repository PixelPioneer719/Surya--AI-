# UI/UX & Animation Standards

**Context**: This document dictates the design system, layout transitions, and animation physics for the main Surya AI application interface.

## 1. Tech Stack Constraints (CRITICAL)
- **Main App Frontend**: STRICTLY pure HTML, CSS, and Vanilla JavaScript.
- **Banned Frameworks**: DO NOT use React, Vue, Svelte, Tailwind, Bootstrap, or any other CSS/JS frameworks for the Surya AI UI.
- *Note: The AI is allowed to write React/Tailwind ONLY when generating code INSIDE the Canvas WebContainer, never for the app's own UI.*

## 2. Design System & Aesthetics
- **Accent Color**: Deep Orange (`var(--accent-orange)`). Use for primary CTAs, active states, and glowing effects.
- **Typography**: Clean, modern sans-serif fonts. Use `SF Pro Display` (Apple system font), `Inter`, or `system-ui`.
- **Aesthetic Vibe**: "Apple meets Emergent.ai". High-end, polished, minimalistic, with deliberate use of depth (glossy panels, subtle 3D transforms).

## 3. Layout Modes

### Mode 1: Chat Mode (The Default)
- **Inspiration**: Gemini / ChatGPT clean UI.
- **Layout**: Centered, single-column chat interface. Max-width container for readability.
- **Behavior**: Smooth scrolling, message bubbles that fade and slide up gently upon appearing.

### Mode 2: Canvas Mode (The IDE)
- **Inspiration**: Emergent.ai / Apple gloss / Lovable.
- **Layout**: 30% Chat (Left) / 70% App Preview & Code (Right).
- **Transition**: Must slide open seamlessly without layout jank. The 30/70 split must animate the `width` and `transform` properties smoothly.
- **Visuals**:
  - Canvas panels should have a subtle glossy effect (glassmorphism: `backdrop-filter: blur()`, semi-transparent borders).
  - 3D Preview Elements: Use `perspective` and `transform: rotateX/rotateY` for subtle 3D hovering or loading states.

## 4. Animation Physics (Apple-Tier Smoothness)
All animations must feel fluid, weighty, and premium. No linear transitions.

- **Standard Easing**: Use `cubic-bezier(0.16, 1, 0.3, 1)` for all layout shifts, panel slides, and hover states.
- **Performance**: Animate ONLY `transform` and `opacity` whenever possible to trigger GPU hardware acceleration. Avoid animating `width`, `height`, `top`, or `left` unless strictly necessary (like the Canvas split), and optimize them heavily.
- **Micro-interactions**:
  - Buttons should have a slight scale-down effect on `:active` (`transform: scale(0.98)`).
  - Use subtle CSS glow effects (`box-shadow`) with the Deep Orange accent when focusing inputs or generating code.

## 5. CSS Variable Blueprint
```css
:root {
  --accent-orange: #FF5722; /* Adjust to exact deep orange hex */
  --accent-orange-glow: rgba(255, 87, 34, 0.2);
  --bg-main: #000000; /* Assuming dark mode default */
  --panel-glass: rgba(255, 255, 255, 0.05);
  --border-glass: rgba(255, 255, 255, 0.1);
  --apple-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --radius-standard: 12px;
}
```

## 6. Component Design Patterns

### Welcome Screen
- **3D Orb Animation**: Concentric rings with smooth rotation and scaling
- **Staggered Text Reveal**: Word-by-word fade-in with subtle upward motion
- **Feature Pills**: Hover effects with gentle scaling and glow
- **CTA Button**: Gradient background with animated border and shadow

### Chat Interface
- **Message Bubbles**: Rounded corners with subtle shadows and smooth entry animations
- **User Messages**: Right-aligned with distinct styling from AI responses
- **AI Responses**: Left-aligned with streaming text animation and cursor
- **Code Blocks**: Syntax highlighting with copy/download buttons
- **Input Area**: Auto-expanding textarea with send button and tool selector

### Canvas Workspace
- **Split Panel**: Smooth width transitions between chat and preview
- **Terminal Pane**: Real-time output with syntax highlighting
- **Code View**: File browser with collapsible directories
- **Live Preview**: Iframe with loading states and error handling
- **Control Bar**: Project actions with hover states and tooltips

### Modal System
- **Authentication**: Clean forms with validation feedback
- **Settings**: Tabbed interface with smooth transitions
- **Connectors**: OAuth flow with loading states and success feedback
- **Action Confirmation**: Apple-style blur overlay with centered content

## 7. Color Palette & Theming

### Dark Theme (Default)
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-tertiary: #1a1a1a;
  --text-primary: #fafafa;
  --text-secondary: #c7c7c7;
  --text-muted: #8b8b8b;
  --border-primary: rgba(255, 255, 255, 0.1);
  --border-secondary: rgba(255, 255, 255, 0.05);
  --shadow-primary: rgba(0, 0, 0, 0.3);
  --shadow-secondary: rgba(0, 0, 0, 0.5);
}
```

### Light Theme (Optional)
```css
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border-primary: rgba(0, 0, 0, 0.1);
  --border-secondary: rgba(0, 0, 0, 0.05);
  --shadow-primary: rgba(0, 0, 0, 0.1);
  --shadow-secondary: rgba(0, 0, 0, 0.2);
}
```

## 8. Typography Scale

### Font Families
- **Primary**: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
- **Monospace**: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### Font Weights
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## 9. Spacing & Layout Grid

### Spacing Scale (8px Grid)
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Container Widths
```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

## 10. Component States & Interactions

### Button States
```css
.btn {
  transition: all var(--apple-ease) 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--accent-orange-glow);
}

.btn:active {
  transform: scale(0.98) translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Input States
```css
.input {
  transition: all var(--apple-ease) 0.2s;
  border: 1px solid var(--border-primary);
}

.input:focus {
  border-color: var(--accent-orange);
  box-shadow: 0 0 0 3px var(--accent-orange-glow);
}

.input:invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}
```

### Loading States
```css
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## 11. Responsive Design

### Breakpoints
```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Mobile-First Approach
```css
/* Mobile defaults */
.chat-container {
  padding: var(--space-4);
}

/* Tablet */
@media (min-width: 768px) {
  .chat-container {
    padding: var(--space-6);
    max-width: var(--container-md);
    margin: 0 auto;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .chat-container {
    padding: var(--space-8);
    max-width: var(--container-lg);
  }
}
```

## 12. Accessibility Standards

### Focus Management
- **Visible Focus**: All interactive elements must have visible focus indicators
- **Keyboard Navigation**: Full keyboard accessibility for all features
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG 2.1 AA compliance (4.5:1 ratio minimum)

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 13. Performance Guidelines

### CSS Optimization
- **Critical CSS**: Inline above-the-fold styles
- **CSS Variables**: Use for theming and consistent values
- **Minimal Specificity**: Avoid deep nesting and ID selectors
- **Hardware Acceleration**: Use transform and opacity for animations

### JavaScript Performance
- **Event Delegation**: Use for dynamic content
- **Debouncing**: For input handlers and resize events
- **Memory Management**: Clean up event listeners and timers
- **Progressive Enhancement**: Core functionality works without JavaScript

## 14. Implementation Checklist

### Pre-Development
- [ ] CSS custom properties defined and documented
- [ ] Component library established with consistent patterns
- [ ] Animation timings and easings standardized
- [ ] Responsive breakpoints defined and tested

### Development Phase
- [ ] All animations use GPU-accelerated properties
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] Keyboard navigation fully implemented
- [ ] Performance budget maintained (< 500KB total)

### Testing Phase
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness tested on multiple devices
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met

### Maintenance
- [ ] Design system documentation kept current
- [ ] Component usage patterns documented
- [ ] Breaking changes communicated to team
- [ ] Regular design system audits performed

---

This design system ensures Surya AI maintains a premium, polished aesthetic while delivering exceptional user experience through thoughtful animation and interaction design. All implementations must adhere to these standards to maintain consistency and quality across the application.