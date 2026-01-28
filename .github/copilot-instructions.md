# AI Agent Instructions for react-native-web-tv

## Project Overview

This monorepo implements **React Native for Web with TV support**, allowing React Native components to run on web browsers with specialized enhancements for TV/Smart TV platforms.

### Architecture Highlights

- **Monorepo structure** (npm workspaces): Core package `react-native-web` plus supporting packages (babel-plugin, docs, examples, benchmarks, DOM testing library)
- **TV extension**: Additional TV-specific components and spatial navigation APIs built on `@bbc/tv-lrud-spatial` library
- **Compilation strategy**: Source uses Flow types and ES modules; transpiled to CommonJS and ES5 via Babel

## Quick Start Commands

```bash
# Install dependencies (requires Node.js >= 16.0)
npm install

# Build specific package
npm run build -w <package-name>

# Watch/develop mode for a package
npm run dev -w <package-name>

# Run all tests (lint + flow + format + unit tests)
npm run test

# Individual test types
npm run lint          # ESLint
npm run flow          # Flow type checking
npm run format        # Prettier check
npm run unit          # Jest tests (DOM + Node)
```

## Core Concepts

### React Native → Web Mapping

Components map React Native APIs to DOM/web equivalents:
- `View` → `<div>` with CSS styling via `StyleSheet.create()`
- `Text` → semantic HTML with text styling
- `ScrollView`, `FlatList` → virtualized web lists
- `Pressable`, `Touchable*` → gesture responder system translated to DOM events

**Key file**: `/packages/react-native-web/src/exports/` contains each component and API export.

### Babel Plugin Transform

The `babel-plugin-react-native-web` rewrites imports at build time:
```javascript
// Input: import { View } from 'react-native'
// Output: import View from 'react-native-web/dist/exports/View'
```

The plugin uses `/packages/babel-plugin-react-native-web/src/moduleMap.js` (auto-generated from main index.js exports). **Auto-update this via**: `npm run build` runs a pre-commit hook that regenerates it.

### StyleSheet Compilation

`StyleSheet.create()` statically compiles styles at module load time using the `styleq` library. Styles are atomic (individual CSS rules) and inserted into a virtual stylesheet (`/packages/react-native-web/src/exports/StyleSheet/`):

- `compiler.js`: Converts React Native styles → CSS rules (handles vendor prefixes, responsive behavior)
- `dom.js`: Manages virtual stylesheet insertion
- `validate.js`: Runtime warnings for invalid style properties

**Pattern**: Always use `StyleSheet.create()` for static styles; avoid inline objects in render for performance.

### TV/Spatial Navigation System

Unique to this fork:

- **SpatialManager** (`/modules/SpatialManager/`): Manages focus navigation using arrow keys on TV remotes
  - Uses external `@bbc/tv-lrud-spatial` library for spatial algorithm
  - Operates on DOM directly (outside React tree)
  - Setup happens on first navigation interaction
  
- **TV Components** (`/exports/TV/`):
  - `TVFocusGuideView`: Invisible container that directs focus to specified destinations
  - `TVEventHandler` / `useTVEventHandler`: Hook for remote control events (menu, back, play, etc.)
  - `TVEventControl`: Lower-level event management
  - `TVParallaxProperties`: Parallax scrolling support for TV

- **Focus Props** (on all views):
  - `autoFocus`: Auto-focus on mount
  - `trapFocusUp/Down/Left/Right`: Prevent focus escape
  - `isTVSelectable`: Mark as focus-capable
  - `tvFocusable`: Enable spatial navigation

## Development Patterns

### Component Structure

Each component lives in `/exports/<ComponentName>/` with:
- `index.js`: Main export with default implementation
- `types.js`: Flow type definitions
- Tests colocated with `__tests__/` subdirectories

**Pattern**: Use `React.forwardRef()` to expose DOM refs; attach imperative methods via ref callback if needed (e.g., `TVFocusGuideView.setDestinations()`).

### Using Platform Detection

```javascript
import Platform from 'react-native-web/exports/Platform';

if (Platform.isTV) {
  // TV-specific code (uses @bbc/tv-lrud-spatial)
}
if (Platform.OS === 'web') {
  // Web-specific code
}
```

### Testing

- **Jest configuration**: `/configs/jest.config.js` (DOM environment) and `jest.config.node.js`
- **Test file naming**: `**/__tests__/**/?(*-)+(spec|test).[jt]s?(x)`
- **Libraries**: `@testing-library/react` for component testing
- **Snapshots**: Stored in `__snapshots__/` directories

**Pattern**: Test both normal and TV-specific rendering paths when modifying components with TV props.

### Modules Patterns

`/modules/` contains utilities reused across exports:

- **Refs**: `useMergeRefs` (combine multiple refs), `usePlatformMethods` (attach imperative methods)
- **Events**: `usePressEvents` (gesture detection), `useResponderEvents` (touch responder API)
- **Layout**: `useElementLayout` (measure dimensions), `getBoundingClientRect` (DOM measurements)
- **Styling**: `createDOMProps` (build final DOM attributes), `setValueForStyles` (CSS application)
- **TV**: `SpatialManager` (focus navigation)

**Pattern**: Reuse these utilities in new components rather than reimplementing.

## Key Files & Directories

| Path | Purpose |
|------|---------|
| `/packages/react-native-web/src/exports/` | Component/API implementations |
| `/packages/react-native-web/src/modules/` | Shared utilities and hooks |
| `/packages/react-native-web/src/exports/TV/` | TV-specific components |
| `/packages/react-native-web/src/modules/SpatialManager/` | Spatial navigation (TV focus) |
| `/packages/babel-plugin-react-native-web/src/` | Babel transform plugin |
| `/packages/react-native-web-examples/pages/` | Example components (can test locally) |
| `/configs/` | Babel, Jest, ESLint configs |
| `/.github/CONTRIBUTING.md` | Detailed contributing guide |

## Spatial Navigation Implementation

### Current Initiative (Active Planning Phase)

This codebase is implementing **Android TV-compatible spatial navigation** to allow developers to write React Native TV apps once and deploy them to web-based TV platforms (Samsung, LG, HiSense) with minimal changes.

**Key Planning Documents** (read in order):
1. **[SPATIAL_NAVIGATION_PLAN.md](../SPATIAL_NAVIGATION_PLAN.md)** - Complete architecture redesign with 4-phase implementation
2. **[ANDROID_TV_TEST_SCENARIOS.md](../ANDROID_TV_TEST_SCENARIOS.md)** - 10 test scenarios with code examples  
3. **[TV_NAVIGATION_API_REFERENCE.md](../TV_NAVIGATION_API_REFERENCE.md)** - Developer API documentation
4. **[IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md)** - Current status, progress tracking, open decisions

**Focus Selection Priority** (Android TV model to implement):
```
1. hasTVPreferredFocus=true              (⭐ Highest priority)
2. destinations (TVFocusGuideView)
3. autoFocus + lastFocusedChild          (Focus memory)
4. autoFocus + spatialFirstFocusable     (Geometric ordering)
5. treeFirstFocusable (normal View)      (JSX declaration order)
6. browser default focus                 (Fallback)
```

**Key Architectural Decisions**:
- Normal View: Use tree order (JSX) for initial focus, spatial order for navigation
- TVFocusGuideView: Use spatial order for both initial focus and navigation
- Explicit navigation: `nextFocusUp/Down/Left/Right` props for custom flow
- Focus trapping: `trapFocus*` props for modal behavior

**Core Implementation Files to Modify**:
- `src/modules/SpatialManager/index.js` - Add focus priority logic, tree order discovery
- `src/exports/TV/TVFocusGuideView.js` - Implement focus memory, collapse/reveal
- `src/exports/View/index.js` - Call focus determination during autoFocus
- `src/modules/createDOMProps/index.js` - Forward nextFocus* and hasTVPreferredFocus props

## Code Quality Standards

- **Type system**: Flow types required (add `// @flow` comment at module top)
- **Formatting**: Prettier (single quotes, trailing commas off) via `npm run format:fix`
- **Linting**: ESLint via `npm run lint:fix`
- **Pre-commit hooks**: Husky auto-runs format/lint on staged files
- **Exports validation**: Main `index.js` exports must be reflected in babel moduleMap (auto-updated on build)

## Common Tasks

### Adding a new component
1. Create `/exports/NewComponent/index.js` with Flow types
2. Export in `/exports/index.js`
3. Run `npm run build -w react-native-web` to update moduleMap
4. Add tests in `__tests__/` subdirectory
5. Test with examples app: `npm run dev -w react-native-web-examples`

### Adding TV-specific feature
1. Add prop to component's types (e.g., `tvFocusable?: boolean`)
2. Handle in `createDOMProps()` if it affects DOM attributes
3. Add logic in SpatialManager if it affects focus behavior
4. Add conditional rendering behind `Platform.isTV` check
5. Test with example: `/packages/react-native-web-examples/pages/view-tv/`

### Debugging builds
- Check `/packages/react-native-web/dist/` for compiled output (ES and CommonJS)
- Babel issues: verify `configs/babel.config.js` and Flow stripping
- Import resolution: check `packages/babel-plugin-react-native-web/src/moduleMap.js` matches `src/index.js` exports

## Project-Specific Conventions

- **No direct react-dom imports**: Use abstraction layer (StyleSheet, Platform, etc.)
- **Responsive design**: Use `Dimensions` API for viewport detection, avoid media queries in source
- **RTL support**: Check `I18nManager.isRTL` and flip directions as needed
- **Accessibility**: Semantic HTML + ARIA attributes via forwardedProps
- **TV focus**: Use `isTVSelectable`/`tvFocusable` props for remote control nav; avoid visible focus indicators being dependent on browser defaults
