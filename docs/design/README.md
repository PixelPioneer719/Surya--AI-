# Surya AI Design Documentation

This directory contains the comprehensive design system and implementation guidelines for Surya AI's user interface.

## 📁 Directory Structure

```
docs/design/
├── ui-ux-standards.md      # Core design principles and standards
├── implementation-guide.md  # Component library and technical implementation
└── README.md               # This file - navigation guide
```

## 🎨 Design System Overview

Surya AI follows a "Apple meets Emergent.ai" aesthetic with premium, polished interactions and deliberate use of depth through glossy panels and subtle 3D transforms.

### Core Principles
- **Vanilla Technologies**: Pure HTML, CSS, and JavaScript only (no frameworks)
- **Performance First**: GPU-accelerated animations using transform and opacity
- **Accessibility**: WCAG 2.1 AA compliance with full keyboard navigation
- **Consistency**: Strict adherence to design tokens and component patterns

## 📋 Key Documents

### [UI/UX Standards](ui-ux-standards.md)
**What it covers:**
- Tech stack constraints and framework restrictions
- Design system aesthetics and color palette
- Layout modes (Chat vs Canvas)
- Animation physics and performance guidelines
- CSS variable blueprint and theming

**When to reference:**
- Starting new UI components
- Making design decisions
- Understanding animation requirements
- Setting up CSS architecture

### [Implementation Guide](implementation-guide.md)
**What it covers:**
- Complete component library with code examples
- Animation utilities and JavaScript helpers
- Performance optimization techniques
- Testing guidelines and maintenance procedures

**When to reference:**
- Building new components
- Implementing animations
- Optimizing performance
- Writing tests for UI components

## 🚀 Quick Start

### 1. CSS Setup
```css
/* Import design system variables */
@import url('css/variables.css');
@import url('css/components.css');

/* Use design tokens */
.my-component {
  background: var(--bg-secondary);
  border-radius: var(--radius-standard);
  transition: all var(--apple-ease) 0.2s;
}
```

### 2. Component Usage
```html
<!-- Use established component patterns -->
<button class="btn btn-primary">
  <span class="btn-text">Get Started</span>
</button>

<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2>Title</h2>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      Content here
    </div>
  </div>
</div>
```

### 3. Animation Implementation
```javascript
// Use animation utilities
AnimationController.fadeIn(element);
AnimationController.slideIn(element, 'up');

// Or direct CSS animations
element.style.transition = 'all var(--apple-ease) 0.3s';
element.style.transform = 'translateY(-10px)';
```

## 🎯 Component Categories

### Layout Components
- **Canvas Workspace**: Split-panel layout with smooth transitions
- **Modal System**: Blur overlays with centered content
- **Grid System**: Responsive layouts with consistent spacing

### Interactive Components
- **Buttons**: Primary, secondary, and icon variants
- **Inputs**: Text fields with validation states
- **Messages**: Chat bubbles with streaming animations

### Feedback Components
- **Loading States**: Spinners, pulses, and progress indicators
- **Notifications**: Toast messages and status updates
- **Tooltips**: Contextual help and information

## 🔧 Development Workflow

### 1. Design Phase
- Review UI/UX standards for requirements
- Check existing component library
- Define new design tokens if needed

### 2. Implementation Phase
- Use established CSS variables and classes
- Follow component patterns from implementation guide
- Implement GPU-accelerated animations

### 3. Testing Phase
- Visual regression testing
- Accessibility audit
- Performance benchmarking
- Cross-browser compatibility

### 4. Documentation Phase
- Update component library if new patterns added
- Document any new design tokens
- Update implementation examples

## 📊 Performance Metrics

### Animation Performance
- **60 FPS**: All animations must maintain smooth frame rate
- **GPU Acceleration**: 100% of animations use transform/opacity
- **Bundle Size**: < 500KB total CSS + JavaScript

### Accessibility Compliance
- **WCAG 2.1 AA**: All color contrast ratios meet standards
- **Keyboard Navigation**: Full functionality without mouse
- **Screen Reader**: Proper ARIA labels and semantic HTML

### Cross-Platform Compatibility
- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Chrome Mobile
- **Responsive**: All breakpoints from 320px to 2560px

## 🤝 Contributing

### Adding New Components
1. **Design Review**: Ensure component fits design system
2. **Implementation**: Follow established patterns
3. **Documentation**: Add to implementation guide
4. **Testing**: Include accessibility and performance tests

### Modifying Existing Components
1. **Impact Assessment**: Check for breaking changes
2. **Backward Compatibility**: Maintain existing API
3. **Migration Guide**: Document transition path
4. **Update Documentation**: Reflect changes in guides

## 📞 Support

### For Designers
- **Design System Questions**: Reference UI/UX standards
- **New Component Requests**: Create detailed specifications
- **Design Reviews**: Schedule with development team

### For Developers
- **Implementation Questions**: Check implementation guide
- **Performance Issues**: Review animation and optimization sections
- **Accessibility Concerns**: Follow WCAG guidelines in standards

## 🔄 Version History

### v2.0.0 (Current)
- Complete design system overhaul
- Canvas IDE integration
- Performance optimizations
- Accessibility improvements

### v1.0.0
- Initial design system
- Basic component library
- Chat interface design

---

## 📚 Additional Resources

- **[CLAUDE.md](../CLAUDE.md)**: Project architecture and development guidelines
- **[API Reference](../api/index.md)**: Backend API documentation
- **[Canvas Engine](../arch/canvas-engine.md)**: Technical deep-dive on WebContainer integration
- **[Roadmap](../roadmap/index.md)**: Development phases and future plans

For questions or contributions to the design system, please reference the relevant documentation or create an issue in the project repository.