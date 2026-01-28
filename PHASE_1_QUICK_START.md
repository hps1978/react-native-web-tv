# Phase 1 Implementation Quick Start Guide

**Version**: 1.0  
**Date**: January 24, 2026  
**Purpose**: Developer quick-reference for implementing Phase 1

---

## 30-Second Summary

**What**: Implement Android TV spatial navigation foundation  
**Where**: 4 files (createDOMProps, SpatialManager, View, TVFocusGuideView)  
**Time**: 16-22 hours  
**Success**: All 10 Android TV test scenarios pass

---

## The 5-Step Implementation Path

```
Step 1: createDOMProps (30 min) ← START HERE
  └─ Add nextFocus* prop destructuring
  └─ Add nextFocus* attribute forwarding

Step 2: SpatialManager State (2 hours)
  └─ Add focusMemory WeakMap
  └─ Add focusCache Map
  └─ Enhance setFocus() to track memory

Step 3: SpatialManager Routing (5 hours)
  └─ Implement resolveNextFocus()
  └─ Implement shouldTrapFocus()
  └─ Enhance handleArrowKey()

Step 4: SpatialManager Initialization (3 hours)
  └─ Implement determineFocus()
  └─ Implement helper functions

Step 5: Component Integration (3 hours)
  └─ Update View component
  └─ Update TVFocusGuideView component
  └─ Add imperative APIs

Step 6: Testing & Validation (4-5 hours)
  └─ Test all 10 Android TV scenarios
  └─ Performance validation
  └─ Code coverage check
```

---

## Step 1: createDOMProps Changes (30 minutes)

**File**: `/packages/react-native-web/src/modules/createDOMProps/index.js`

### Change 1a: Add Props to Destructuring

**Location**: Line ~130 (after `autoFocus`, before `trapFocusUp`)

```javascript
// Before:
const {
  // ...
  autoFocus,
  // destinations,
  trapFocusDown,
  trapFocusLeft,
  trapFocusRight,
  trapFocusUp,
  // ...

// After:
const {
  // ...
  autoFocus,
  // destinations,
  nextFocusUp,        // ← ADD
  nextFocusDown,      // ← ADD
  nextFocusLeft,      // ← ADD
  nextFocusRight,     // ← ADD
  trapFocusDown,
  trapFocusLeft,
  trapFocusRight,
  trapFocusUp,
  // ...
```

### Change 1b: Forward as DOM Attributes

**Location**: Line ~765 (after `data-autofocus` block)

```javascript
// After existing:
// 5. setup autoFocus: default is true
domProps['data-autofocus'] = autoFocus === 'false' ? 'false' : 'true';

// Add this:
// 6. setup nextFocus* attributes for explicit navigation
if (nextFocusUp != null) {
  domProps['data-next-focus-up'] = String(nextFocusUp);
}
if (nextFocusDown != null) {
  domProps['data-next-focus-down'] = String(nextFocusDown);
}
if (nextFocusLeft != null) {
  domProps['data-next-focus-left'] = String(nextFocusLeft);
}
if (nextFocusRight != null) {
  domProps['data-next-focus-right'] = String(nextFocusRight);
}
```

### Test It

```javascript
// Quick test in console:
const domProps = createDOMProps('button', {
  tvFocusable: true,
  nextFocusDown: 'submit-btn'
});
console.log(domProps['data-next-focus-down']);  // Should be 'submit-btn'
```

✅ **Step 1 Complete** - Move to Step 2

---

## Step 2: SpatialManager State Setup (2 hours)

**File**: `/packages/react-native-web/src/modules/SpatialManager/index.js`

### Add Module-Level State

**Location**: Top of file, after existing module-level variables

```javascript
// Before:
let isSpatialManagerReady = false;
let spatialNavigationContainer: HTMLElement | null = null;
let currentFocus: HTMLElement | null = null;
let keyDownListener: ((event: any) => void) | null = null;
const ID_LIMIT = 100000;
let id = 0;

// After:
let isSpatialManagerReady = false;
let spatialNavigationContainer: HTMLElement | null = null;
let currentFocus: HTMLElement | null = null;
let keyDownListener: ((event: any) => void) | null = null;
const ID_LIMIT = 100000;
let id = 0;

// ← ADD NEW STATE:
let focusMemory: WeakMap<HTMLElement, HTMLElement> = new WeakMap();
let focusCache: Map<string, any> = new Map();
const FOCUS_CACHE_TTL = 1000;  // 1 second
```

### Enhance setFocus() Function

**Location**: Existing setFocus() function (modify, don't replace)

```javascript
// Before:
export function setFocus(node) {
  if (node) {
    node.focus();
    currentFocus = node;
  }
}

// After:
export function setFocus(node) {
  if (!node) return;
  
  // Track focus memory for container
  const container = findFocusContainer(node);
  if (container) {
    focusMemory.set(container, node);  // ← ADD
  }
  
  // Update current focus
  currentFocus = node;
  
  // Actually focus
  node.focus();
  
  // Add focus class for styling
  node.classList.add('lrud-focused');
}

// Helper function (add to file):
function findFocusContainer(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;
  while (current) {
    if (current.classList.contains('lrud-container')) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}
```

### Update setupSpatialNavigation()

**Location**: Modify setupSpatialNavigation() to initialize state

```javascript
// Before:
export function setupSpatialNavigation(container?) {
  if (isSpatialManagerReady) {
    return;
  }
  // ... existing code ...
  isSpatialManagerReady = true;
}

// After:
export function setupSpatialNavigation(container?) {
  if (isSpatialManagerReady) {
    return;
  }
  
  // ← ADD: Initialize focus tracking
  focusMemory = new WeakMap();
  focusCache = new Map();
  
  // ... rest of existing code ...
  isSpatialManagerReady = true;
}
```

### Update teardownSpatialNavigation()

**Location**: Modify teardownSpatialNavigation() to cleanup state

```javascript
// Before:
export function teardownSpatialNavigation() {
  if (keyDownListener) {
    document.removeEventListener('keydown', keyDownListener);
    keyDownListener = null;
  }
  isSpatialManagerReady = false;
  spatialNavigationContainer = null;
  currentFocus = null;
}

// After:
export function teardownSpatialNavigation() {
  if (keyDownListener) {
    document.removeEventListener('keydown', keyDownListener);
    keyDownListener = null;
  }
  
  // ← ADD: Clear state
  focusMemory = new WeakMap();
  focusCache.clear();
  
  isSpatialManagerReady = false;
  spatialNavigationContainer = null;
  currentFocus = null;
}
```

✅ **Step 2 Complete** - Move to Step 3

---

## Step 3: resolveNextFocus() - Core Routing (5 hours)

**File**: `/packages/react-native-web/src/modules/SpatialManager/index.js`

### Add Core Function

**Location**: After existing functions, before module exports

```javascript
/**
 * Resolve next focus considering explicit navigation and spatial fallback.
 * Called when arrow key is pressed.
 * 
 * Priority:
 * 1. Check data-next-focus-{direction} attribute
 * 2. Validate target is focusable
 * 3. If not found, fall back to spatial algorithm
 */
function resolveNextFocus(
  element: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right'
): HTMLElement | null {
  if (!element) return null;

  // Step 1: Check explicit navigation
  const nextFocusAttr = `data-next-focus-${direction}`;
  const nextFocusId = element.getAttribute(nextFocusAttr);

  if (nextFocusId) {
    const target = document.getElementById(nextFocusId);
    if (target && isFocusableElement(target)) {
      return target;
    }
    // Target not found or not focusable - fall through to spatial
  }

  // Step 2: Check trap/blocking
  if (shouldTrapFocus(element, direction)) {
    return null;  // Can't navigate in this direction
  }

  // Step 3: Fall back to spatial algorithm
  const container = findFocusContainer(element) || element;
  if (window.lrud && window.lrud.getNextFocus) {
    return window.lrud.getNextFocus(element, direction, container) || null;
  }

  return null;
}

/**
 * Check if focus is trapped in a direction.
 */
function shouldTrapFocus(
  element: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean {
  const blockExit = element.getAttribute('data-block-exit');
  if (!blockExit) return false;

  const blockedDirs = blockExit.split(' ').map(d => d.trim());
  return blockedDirs.includes(direction);
}

/**
 * Check if element is focusable.
 */
function isFocusableElement(element: HTMLElement): boolean {
  if (!element) return false;
  if (element.classList.contains('lrud-ignore')) return false;
  if (element.hasAttribute('disabled')) return false;
  
  const tabIndex = element.getAttribute('tabindex');
  return tabIndex !== '-1';
}
```

### Update handleArrowKey()

**Location**: Modify existing arrow key handler

```javascript
// Replace existing arrow key handling with:
function handleArrowKey(event: KeyboardEvent) {
  const direction = keyToDirection(event.key);
  if (!direction) return;

  const current = document.activeElement;
  if (!current || !(current instanceof HTMLElement)) return;

  // ← USE NEW FUNCTION:
  const next = resolveNextFocus(current, direction);
  
  if (next && next !== current) {
    event.preventDefault();
    setFocus(next);
  }
}

// Helper to convert key to direction:
function keyToDirection(key: string): 'up' | 'down' | 'left' | 'right' | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}
```

✅ **Step 3 Complete** - Move to Step 4

---

## Step 4: determineFocus() - Initial Focus (3 hours)

**File**: `/packages/react-native-web/src/modules/SpatialManager/index.js`

### Add Initialization Function

**Location**: After resolveNextFocus(), before exports

```javascript
/**
 * Determine initial focus following Android TV priority:
 * 1. hasTVPreferredFocus (handled by View component)
 * 2. destinations attribute
 * 3. lastFocusedChild (focus memory)
 * 4. spatialFirstFocusable (lrud algorithm)
 * 5. treeFirstFocusable (TODO - Phase 2)
 * 6. browser default
 */
export function determineFocus(
  container: HTMLElement,
  options?: { isTVFocusGuide?: boolean }
): HTMLElement | null {
  if (!container) return null;

  // Level 2: Check destinations
  const destinationsAttr = container.getAttribute('data-destinations');
  if (destinationsAttr) {
    const destIds = destinationsAttr.split(' ');
    for (const id of destIds) {
      const dest = document.getElementById(id);
      if (dest && isFocusableElement(dest)) {
        return dest;
      }
    }
  }

  // Level 3: Check focus memory
  const lastFocused = focusMemory.get(container);
  if (lastFocused && document.contains(lastFocused) && isFocusableElement(lastFocused)) {
    return lastFocused;
  }

  // Level 4: Use spatial order (lrud)
  if (window.lrud && window.lrud.getDefaultFocus) {
    const spatialFirst = window.lrud.getDefaultFocus(container);
    if (spatialFirst && isFocusableElement(spatialFirst)) {
      return spatialFirst;
    }
  }

  // Level 5: TODO - Use tree order (Phase 2)
  // const treeFirst = getFirstFocusableInTreeOrder(container);
  // if (treeFirst) return treeFirst;

  // Level 6: Fallback to first focusable
  const focusables = container.querySelectorAll('[tabindex="0"], a, button, input, select, textarea');
  for (const el of focusables) {
    if (el instanceof HTMLElement && isFocusableElement(el)) {
      return el;
    }
  }

  return null;
}
```

### Export New Function

**Location**: At end of file with other exports

```javascript
export {
  setupSpatialNavigation,
  setFocus,
  setDestinations,
  teardownSpatialNavigation,
  determineFocus,  // ← ADD NEW EXPORT
  // ... other exports
};
```

✅ **Step 4 Complete** - Move to Step 5

---

## Step 5: Component Integration (3 hours)

### 5a: View Component Integration

**File**: `/packages/react-native-web/src/exports/View/index.js`

**Location**: In View component, in the useEffect section

```javascript
// Add new imports at top:
import { setFocus, determineFocus } from '../../modules/SpatialManager';

// In the View component, add these useEffects:
const { hasTVPreferredFocus, autoFocus, tvFocusable, ...rest } = props;

// Handle hasTVPreferredFocus (highest priority)
React.useEffect(() => {
  if (hasTVPreferredFocus && hostRef.current && Platform.isTV) {
    setFocus(hostRef.current);
  }
}, [hasTVPreferredFocus]);

// Handle autoFocus (determine initial focus)
React.useEffect(() => {
  if (autoFocus && hostRef.current && tvFocusable && Platform.isTV) {
    const initialFocus = determineFocus(hostRef.current, { isTVFocusGuide: false });
    if (initialFocus) {
      setFocus(initialFocus);
    }
  }
}, [autoFocus, tvFocusable]);
```

### 5b: TVFocusGuideView Integration

**File**: `/packages/react-native-web/src/exports/TV/TVFocusGuideView.js`

**Location**: In TVFocusGuideView component

```javascript
// Add new imports at top:
import { setFocus, determineFocus, setupSpatialNavigation } from '../../modules/SpatialManager';

// In component, add useEffect:
React.useEffect(() => {
  if (enabled && Platform.isTV) {
    setupSpatialNavigation();
    
    // Determine initial focus with spatial order priority
    if (autoFocus && hostRef.current) {
      const initialFocus = determineFocus(hostRef.current, { isTVFocusGuide: true });
      if (initialFocus) {
        setFocus(initialFocus);
      }
    }
  }
}, [enabled, autoFocus]);

// Add imperative method via useImperativeHandle:
React.useImperativeHandle(forwardedRef, () => ({
  setDestinations(dests) {
    if (hostRef.current && Array.isArray(dests)) {
      const ids = dests
        .map((d) => (d && d.id ? d.id : null))
        .filter((id) => id != null)
        .join(' ');
      hostRef.current.setAttribute('data-destinations', ids);
    }
  }
}));
```

✅ **Step 5 Complete** - Move to Step 6

---

## Step 6: Testing & Validation (4-5 hours)

### 6a: Run Existing Tests

```bash
cd /packages/react-native-web
npm run test -- --testPathPattern="SpatialManager|createDOMProps"
```

### 6b: Android TV Test Scenarios

Use the 10 scenarios from `ANDROID_TV_TEST_SCENARIOS.md`:

```bash
# Run all spatial nav tests
npm run test -- --testPathPattern="AndroidTV|SpatialNav"
```

### 6c: Manual Testing Checklist

- [ ] Horizontal button row: Left/Right navigation works
- [ ] Grid layout: 2D navigation works correctly
- [ ] hasTVPreferredFocus: Initial focus set correctly
- [ ] Focus memory: Returns to last focused after navigation away
- [ ] nextFocus*: Explicit navigation works
- [ ] Trap focus: Direction blocking works
- [ ] Nested guides: Nested containers work
- [ ] Arrow key response time: < 50ms

### 6d: Performance Test

```javascript
// In console:
const start = performance.now();
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
const end = performance.now();
console.log(`Response time: ${end - start}ms`);  // Should be < 50ms
```

### 6e: Code Coverage Check

```bash
npm run test -- --testPathPattern="SpatialManager" --coverage
```

Should see:
- ✅ resolveNextFocus: > 90% coverage
- ✅ determineFocus: > 90% coverage
- ✅ shouldTrapFocus: > 95% coverage
- ✅ Overall: > 90% for new functions

✅ **Phase 1 Complete!**

---

## Debugging Commands

### Check DOM Attributes

```javascript
// In DevTools console
const btn = document.querySelector('button');
console.log('Attributes:');
console.log('  data-next-focus-up:', btn.getAttribute('data-next-focus-up'));
console.log('  data-next-focus-down:', btn.getAttribute('data-next-focus-down'));
console.log('  data-next-focus-left:', btn.getAttribute('data-next-focus-left'));
console.log('  data-next-focus-right:', btn.getAttribute('data-next-focus-right'));
console.log('  data-block-exit:', btn.getAttribute('data-block-exit'));
```

### Check Focus State

```javascript
// Check current focus
console.log('Current focus:', document.activeElement);

// Check focus memory (requires exposing internal function)
console.log('Focus memory:', window.__SPATIAL_DEBUG__.focusMemory);
```

### Trace Navigation

```javascript
// Add temporary logging to resolveNextFocus:
console.log(`[Navigation] From: ${element.id} Direction: ${direction}`);
console.log(`[Navigation] Explicit target: ${nextFocusId}`);
console.log(`[Navigation] To: ${next?.id || 'none'}`);
```

---

## Common Issues & Fixes

### Issue 1: nextFocus attributes not appearing
**Cause**: createDOMProps not forwarding props  
**Fix**: Verify Step 1 changes (destructuring + attribute forwarding)  
**Test**: `console.log(domProps['data-next-focus-up'])`

### Issue 2: Arrow key not working
**Cause**: Event listener not set up  
**Fix**: Call `setupSpatialNavigation()` first  
**Test**: `console.log(keyDownListener)`

### Issue 3: Focus stays at wrong element
**Cause**: isFocusableElement() returning false  
**Fix**: Check tabindex attribute and disabled prop  
**Test**: `console.log(isFocusableElement(element))`

### Issue 4: Focus jumps unexpectedly
**Cause**: Spatial algorithm result different than expected  
**Fix**: Verify element positions with getBoundingClientRect()  
**Test**: `console.log(element.getBoundingClientRect())`

---

## Success Checklist

- [ ] createDOMProps changes in place
- [ ] All nextFocus* attributes render in DOM
- [ ] SpatialManager state tracking works
- [ ] resolveNextFocus() routes correctly
- [ ] determineFocus() selects right initial focus
- [ ] View.js integration complete
- [ ] TVFocusGuideView.js integration complete
- [ ] All 10 Android TV scenarios passing
- [ ] Arrow key response < 50ms
- [ ] No memory leaks
- [ ] 90%+ code coverage
- [ ] All tests passing
- [ ] Ready for Phase 2

---

## Resources

- **Architecture**: `SPATIALMANAGER_ARCHITECTURE_REVISED.md`
- **createDOMProps Details**: `CREATEDMPROPS_ANDROID_TV_ATTRIBUTES.md`
- **Test Scenarios**: `ANDROID_TV_TEST_SCENARIOS.md`
- **Feedback Summary**: `FEEDBACK_INTEGRATION_SUMMARY.md`

---

*This Quick Start is for developers implementing Phase 1*  
*Last Updated: January 24, 2026*  
*Estimated Time: 16-22 hours*
