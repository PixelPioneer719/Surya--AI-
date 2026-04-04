# Surya AI Design System Implementation

## Component Library

### 1. Button Components

#### Primary Button
```html
<button class="btn btn-primary">
  <span class="btn-text">Get Started</span>
</button>
```

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-standard);
  font-weight: var(--font-medium);
  font-size: var(--text-base);
  line-height: 1.5;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all var(--apple-ease) 0.2s;
  position: relative;
  overflow: hidden;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent-orange), #ff7043);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 87, 34, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 87, 34, 0.4);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: var(--panel-glass);
  color: var(--text-primary);
  border: 1px solid var(--border-glass);
  backdrop-filter: blur(10px);
}

.btn-secondary:hover {
  background: var(--panel-glass-hover);
  border-color: var(--accent-orange);
}
```

### 2. Input Components

#### Text Input
```html
<div class="input-group">
  <input type="text" class="input" placeholder="Type your message..." />
  <button class="btn btn-icon">
    <svg class="icon">...</svg>
  </button>
</div>
```

```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-standard);
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: var(--text-base);
  transition: all var(--apple-ease) 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--accent-orange);
  box-shadow: 0 0 0 3px var(--accent-orange-glow);
}

.input::placeholder {
  color: var(--text-muted);
}
```

### 3. Message Components

#### Chat Message Bubble
```html
<div class="message message-user">
  <div class="message-content">
    <p>Hello, how can I help you today?</p>
  </div>
  <div class="message-avatar">
    <img src="user-avatar.jpg" alt="User" />
  </div>
</div>
```

```css
.message {
  display: flex;
  margin-bottom: var(--space-4);
  animation: messageSlideIn 0.4s var(--apple-ease);
}

.message-user {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-standard);
  background: var(--accent-orange);
  color: white;
  position: relative;
}

.message-user .message-content {
  background: var(--accent-orange);
  color: white;
}

.message-assistant .message-content {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 4. Modal Components

#### Modal Overlay
```html
<div class="modal-overlay" id="auth-modal">
  <div class="modal">
    <div class="modal-header">
      <h2>Welcome to Surya AI</h2>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Modal content -->
    </div>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: modalFadeIn 0.3s var(--apple-ease);
}

.modal {
  background: var(--bg-secondary);
  border-radius: var(--radius-standard);
  border: 1px solid var(--border-glass);
  box-shadow: 0 20px 40px var(--shadow-secondary);
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.4s var(--apple-ease);
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

### 5. Canvas Components

#### Split Panel Layout
```html
<div class="canvas-workspace">
  <div class="canvas-chat-panel">
    <!-- Chat interface -->
  </div>
  <div class="canvas-preview-panel">
    <iframe class="canvas-iframe" src="preview-url"></iframe>
    <div class="canvas-terminal">
      <!-- Terminal output -->
    </div>
  </div>
</div>
```

```css
.canvas-workspace {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: 30% 70%;
  gap: 0;
  transition: all var(--apple-ease) 0.4s;
}

.canvas-chat-panel {
  border-right: 1px solid var(--border-glass);
  overflow-y: auto;
  background: var(--bg-primary);
}

.canvas-preview-panel {
  display: grid;
  grid-template-rows: 1fr auto;
  background: var(--bg-secondary);
}

.canvas-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.canvas-terminal {
  height: 200px;
  border-top: 1px solid var(--border-glass);
  background: var(--bg-tertiary);
  font-family: 'SF Mono', monospace;
  font-size: var(--text-sm);
  overflow-y: auto;
  padding: var(--space-3);
}
```

## Animation Library

### Page Transitions
```css
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all var(--apple-ease) 0.3s;
}

.page-exit {
  opacity: 1;
  transform: translateX(0);
}

.page-exit-active {
  opacity: 0;
  transform: translateX(-20px);
  transition: all var(--apple-ease) 0.3s;
}
```

### Loading States
```css
.loading-dots {
  display: inline-flex;
  gap: 4px;
}

.loading-dots::after {
  content: '';
  animation: loadingDots 1.4s infinite ease-in-out;
}

@keyframes loadingDots {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
```

### Hover Effects
```css
.hover-lift {
  transition: transform var(--apple-ease) 0.2s;
}

.hover-lift:hover {
  transform: translateY(-2px);
}

.hover-glow {
  transition: box-shadow var(--apple-ease) 0.2s;
}

.hover-glow:hover {
  box-shadow: 0 0 20px var(--accent-orange-glow);
}
```

## JavaScript Utilities

### Animation Controller
```javascript
class AnimationController {
  static fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';

    requestAnimationFrame(() => {
      element.style.transition = `all ${duration}ms var(--apple-ease)`;
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  static slideIn(element, direction = 'up', duration = 400) {
    const transforms = {
      up: 'translateY(20px)',
      down: 'translateY(-20px)',
      left: 'translateX(20px)',
      right: 'translateX(-20px)'
    };

    element.style.opacity = '0';
    element.style.transform = transforms[direction];

    requestAnimationFrame(() => {
      element.style.transition = `all ${duration}ms var(--apple-ease)`;
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }
}
```

### Theme Manager
```javascript
class ThemeManager {
  static init() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    this.setTheme(savedTheme);
  }

  static setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Animate theme transition
    document.body.style.transition = 'background-color var(--apple-ease) 0.3s';
  }

  static toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
}
```

### Modal Manager
```javascript
class ModalManager {
  static open(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus management
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length) {
      focusableElements[0].focus();
    }
  }

  static close(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';

    // Restore body scroll
    document.body.style.overflow = '';

    // Return focus to trigger element
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
    }
  }
}
```

## Performance Optimization

### CSS Optimization
- **Critical CSS**: Inline above-the-fold styles
- **Font Loading**: Use `font-display: swap` for web fonts
- **Image Optimization**: Lazy loading and modern formats
- **CSS Containment**: Use `contain` property for isolated components

### JavaScript Optimization
- **Code Splitting**: Dynamic imports for large components
- **Event Delegation**: Single event listeners on parent elements
- **Debouncing**: Input handlers and scroll events
- **Memory Management**: Clean up timers and event listeners

### Animation Performance
- **GPU Acceleration**: Use `transform` and `opacity` only
- **Will-Change**: Hint browser about upcoming animations
- **RAF**: Use `requestAnimationFrame` for smooth animations
- **Reduce Motion**: Respect user preferences

## Testing Guidelines

### Visual Regression Testing
- **Screenshot Comparison**: Automated visual diff testing
- **Cross-browser Testing**: Consistent appearance across browsers
- **Responsive Testing**: Layout verification at all breakpoints

### Accessibility Testing
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader**: Proper ARIA implementation
- **Color Contrast**: Automated contrast ratio checking
- **Focus Management**: Visible focus indicators

### Performance Testing
- **Lighthouse**: Automated performance audits
- **Bundle Size**: Monitor JavaScript and CSS size
- **Runtime Performance**: Smooth 60fps animations
- **Memory Usage**: No memory leaks or excessive consumption

## Maintenance & Updates

### Version Control
- **Semantic Versioning**: Major.minor.patch for design system changes
- **Changelog**: Document all breaking changes and additions
- **Deprecation**: Clear migration path for deprecated components

### Documentation Updates
- **Component Documentation**: Keep usage examples current
- **Design Tokens**: Update CSS variables as needed
- **Implementation Guide**: Maintain comprehensive documentation

### Team Collaboration
- **Design Reviews**: Regular review of new component implementations
- **Consistency Checks**: Automated linting for design system compliance
- **Knowledge Sharing**: Regular team updates on design system changes

---

This implementation guide provides the technical foundation for building Surya AI's user interface. All components must follow these patterns to ensure consistency, performance, and maintainability across the application.