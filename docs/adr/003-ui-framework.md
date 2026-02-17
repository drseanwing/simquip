# ADR-003: UI Framework Selection -- Fluent UI v9

> Version: 1.0 | Date: 2026-02-18 | Author: SimQuip Team

## Status

Accepted

## Context

SimQuip requires a component library for building its user interface. The application runs as a Power Apps Code App hosted within the Microsoft Power Platform, which has its own visual identity and interaction patterns.

Key factors considered:

- **Power Platform consistency**: The Power Platform (Power Apps, Power Automate, Dynamics 365, Teams) uses Microsoft's Fluent design system. An application that visually matches its host environment feels native and reduces user confusion.
- **Component coverage**: SimQuip needs standard business application components -- forms, tables, navigation tabs, buttons, dialogs, spinners, badges, and input controls. The chosen library must provide these out of the box with production-quality accessibility.
- **React compatibility**: The application is built with React 19. The component library must support React 19 and work correctly with TypeScript strict mode.
- **Theming**: The application should inherit theming tokens from the host environment and support customisation without extensive CSS overrides.
- **Accessibility**: Hospital staff with varying abilities will use the application. WCAG 2.1 AA compliance is a baseline requirement.
- **Bundle size**: As a PWA, initial load performance matters. The library should support tree-shaking so only used components are included in the bundle.

Alternatives considered:

1. **Fluent UI v9 (`@fluentui/react-components`)**: Microsoft's current-generation design system library for React. Built with Griffel CSS-in-JS, design tokens, and tree-shakeable component exports.
2. **Fluent UI v8 (`@fluentui/react`)**: The previous generation. Still widely used but in maintenance mode. Larger bundle, less modern API patterns.
3. **Material UI (MUI)**: Popular and comprehensive, but follows Google's Material Design language, which would look out of place in the Power Platform.
4. **Ant Design**: Feature-rich but follows a different design language and is primarily maintained for the Chinese market with occasional localisation gaps.
5. **Custom component library**: Maximum control but requires significant upfront and ongoing investment in design, accessibility, and testing.

## Decision

SimQuip uses **Fluent UI v9** (`@fluentui/react-components` version 9.73+) as its component library.

The integration is structured as follows:

1. **FluentProvider** is mounted at the application root (`main.tsx`) with `webLightTheme`, wrapping the entire component tree. This provides design tokens (colours, spacing, typography, border radii) to all child components via React context.

2. **Component usage** follows Fluent UI v9 conventions:
   - `TabList` and `Tab` for primary navigation (AppShell).
   - `Spinner` for loading states (Suspense fallback).
   - `Title3` for page-level headings.
   - `makeStyles` for custom layout styles using Griffel, referencing `tokens` for consistent spacing and colours.
   - Standard form controls (Input, Dropdown, Button, Dialog, etc.) for CRUD forms.

3. **Styling approach** uses `makeStyles` with Fluent `tokens` rather than raw CSS values. This ensures all custom styles automatically adapt if the theme changes (e.g., switching to a dark theme or inheriting a host-provided theme).

4. **No CSS framework mixing**: The application does not use Tailwind, Bootstrap, or other CSS frameworks alongside Fluent UI. All styling is done through Fluent components and `makeStyles` to avoid specificity conflicts and maintain a single source of truth for the design system.

## Consequences

**Benefits:**
- The application visually matches the Power Platform host, providing a seamless experience for users who move between Power Apps, Teams, and SimQuip.
- Fluent UI v9 components are built with accessibility as a core concern (ARIA attributes, keyboard navigation, focus management, screen reader support), reducing the effort needed to meet WCAG 2.1 AA compliance.
- Design tokens (`tokens.colorNeutralBackground1`, `tokens.spacingHorizontalL`, etc.) provide a consistent visual language and make global theme changes straightforward.
- Tree-shakeable imports (e.g., `import { Tab, TabList } from '@fluentui/react-components'`) keep the production bundle lean -- only the components actually used are included.
- Griffel CSS-in-JS provides atomic CSS output with near-zero runtime overhead and no class name collisions.
- Active Microsoft maintenance and community support, with regular releases aligned to the broader Fluent ecosystem.

**Trade-offs:**
- Fluent UI v9 is a Microsoft-ecosystem library. If the application were ever migrated away from the Power Platform, the UI layer would need significant rework. This is considered an acceptable coupling given the platform commitment.
- Some advanced components available in other libraries (e.g., rich data grids with built-in sorting/filtering, drag-and-drop lists) may require additional implementation effort or third-party supplements on top of Fluent UI v9's component set.
- Developers unfamiliar with Fluent UI v9's API patterns (Griffel, slots, compound components) face a learning curve compared to more widely-adopted libraries like MUI. Documentation and code examples in the repository mitigate this.
- The `makeStyles` / Griffel approach differs from traditional CSS modules or Tailwind utility classes, which may be unfamiliar to some team members. Consistent usage patterns in the codebase (see `AppShell.tsx`) serve as reference implementations.
