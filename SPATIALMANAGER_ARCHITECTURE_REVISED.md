# SpatialManager Architecture - REVISED (Critical Feedback Integration)

**Version**: 2.0 (Corrected)  
**Date**: January 24, 2026  
**Focus**: Clarifying separation of concerns between createDOMProps, SpatialManager, and lrud.js

---

## Executive Summary: Three-Layer Architecture

Based on code analysis and critical feedback, the correct architecture is:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: React Components (View, TVFocusGuideView)           │
│ ├─ Declare focus intent via props (tvFocusable, autoFocus)   │
│ └─ View.hasTVPreferredFocus=true → Call setFocus(ref) DIRECTLY│
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 2: createDOMProps (Attribute Decision Point) ⭐KEY    │
│ ├─ Transform React props → DOM attributes                   │
│ ├─ Set data-next-focus-* attributes (from props)            │
│ ├─ Set data-block-exit attributes (trapFocus*)              │
│ ├─ Set data-destinations attribute (destinations array)     │
│ ├─ Set data-autofocus attribute (autoFocus prop)            │
│ ├─ Set lrud-container class (tvFocusable=true)              │
│ └─ NO state management, NO focus logic → purely attribute   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 3a: SpatialManager (Orchestrator - State Only) ⭐KEY  │
│ ├─ Intercept arrow key events                               │
│ ├─ Manage state: currentFocus, lastFocusedChild (WeakMap)   │
│ ├─ Determine initial focus (via focus priority algorithm)   │
│ ├─ Call lrud.js with (currentElement, direction, scope)     │
│ ├─ Track focus transitions                                  │
│ └─ NO attribute reading/setting, pure event+state mgmt      │
├─────────────────────────────────────────────────────────────┤
│ Layer 3b: lrud.js (Pure Algorithm)                          │
│ ├─ Read DOM attributes: data-destinations, data-block-exit  │
│ ├─ Read CSS classes: lrud-container, lrud-focusable         │
│ ├─ Calculate spatial distances (geometric algorithm)        │
│ ├─ Return next focus element                                │
│ └─ NO state, NO side effects (pure function)                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 4: DOM (HTML Elements)                                │
│ └─ Carry attributes + classes that lrud.js reads           │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight**: 
- **createDOMProps** = Where Android TV rules are TRANSLATED to attributes
- **SpatialManager** = Where Android TV rules are APPLIED via state management
- **lrud.js** = Where attributes are READ and spatial algorithm is executed

---

## Critical Correction: No hasTVPreferredFocus DOM Attribute

The user feedback clarified: **hasTVPreferredFocus does NOT need a DOM attribute** because:

```javascript
// In View.js - Component knows about the prop and acts directly:
if (hasTVPreferredFocus) {
  // Call SpatialManager directly when component mounts
  setFocus(ref);  // Imperative call to SpatialManager
}
```

This is **NOT** an attribute-driven decision. Instead:
- View component has access to `hasTVPreferredFocus` prop
- View component calls `setFocus(ref)` imperative API directly
- SpatialManager handles the state and focus logic
- No DOM attribute needed

**Attributes ARE needed for**:
- `nextFocusUp/Down/Left/Right` → `data-next-focus-up/down/left/right`
- `trapFocusUp/Down/Left/Right` → `data-block-exit` attribute
- `destinations` → `data-destinations` attribute
- `autoFocus` → `data-autofocus` attribute

---

## Layer 2: createDOMProps Attribute Requirements

### Current Implementation (Analyzed)

The `createDOMProps/index.js` file **already handles most TV attributes**:

```javascript
// TV View section (lines 730-755):
if (tvFocusable) {
  domProps.tabIndex = '-1';
  domProps.className += ' lrud-container';
  domProps['data-lrud-prioritise-children'] = 'true/false';
  domProps['data-block-exit'] = trapFocusString; // ✅ Already sets trapFocus*
  domProps['data-autofocus'] = autoFocus === 'false' ? 'false' : 'true'; // ✅ Already sets autoFocus
  // destinations mapping commented out (line 748-755)
}
```

### Gaps to Fill in createDOMProps

**Gap 1: nextFocus* props are NOT being forwarded**

```javascript
// MISSING: In the TV View section, after line 755:
// Forward explicit navigation props as data attributes
if (nextFocusUp != null) {
  domProps['data-next-focus-up'] = nextFocusUp;
}
if (nextFocusDown != null) {
  domProps['data-next-focus-down'] = nextFocusDown;
}
if (nextFocusLeft != null) {
  domProps['data-next-focus-left'] = nextFocusLeft;
}
if (nextFocusRight != null) {
  domProps['data-next-focus-right'] = nextFocusRight;
}
```

**Gap 2: nextFocus* props are NOT destructured from props**

```javascript
// MISSING: In the destructuring section (line 110-145):
// Add after the trapFocus* props:
nextFocusUp,
nextFocusDown,
nextFocusLeft,
nextFocusRight,
```

**Gap 3: destinations attribute handling is commented out**

```javascript
// COMMENTED OUT (lines 748-755):
// Need to implement destinations mapping from array of refs to IDs
// This is more complex because destinations are refs, not string IDs
```

### Corrected createDOMProps Requirements

**File**: `/packages/react-native-web/src/modules/createDOMProps/index.js`

**Add to destructuring** (line ~130):
```javascript
nextFocusUp,
nextFocusDown,
nextFocusLeft,
nextFocusRight,
```

**Add to TV View section** (after line 755):
```javascript
    // 6. setup nextFocus* attributes for explicit navigation
    if (nextFocusUp != null) {
      domProps['data-next-focus-up'] = nextFocusUp;
    }
    if (nextFocusDown != null) {
      domProps['data-next-focus-down'] = nextFocusDown;
    }
    if (nextFocusLeft != null) {
      domProps['data-next-focus-left'] = nextFocusLeft;
    }
    if (nextFocusRight != null) {
      domProps['data-next-focus-right'] = nextFocusRight;
    }

    // 7. setup destinations attribute for TVFocusGuideView
    // destinations are refs/elements, convert to IDs
    // This should be passed as array of refs from TVFocusGuideView
    // For now, rely on setDestinations() imperative method
```

---

## Layer 3a: SpatialManager - State-Only Responsibilities

### What SpatialManager DOES (State Management)

```javascript
class SpatialManager {
  // State tracking (module-level or class-based)
  state = {
    currentFocus: HTMLElement | null,           // Currently focused element
    isSpatialManagerReady: boolean,              // Initialized?
    focusMemory: WeakMap<HTMLElement, HTMLElement>,  // Container → lastFocusedChild
    focusCache: Map<string, CacheEntry>,        // Performance optimization
  }

  // Event handling
  handleArrowKey(event: KeyboardEvent) {
    // 1. Get current focus
    // 2. Get next focus from lrud.js
    // 3. Update state
    // 4. Actually focus element
  }

  // Focus determination (initial focus selection)
  determineFocus(container, options) {
    // Android TV priority:
    // 1. hasTVPreferredFocus → done by component directly (setFocus call)
    // 2. destinations → read from data-destinations attribute
    // 3. lastFocusedChild → read from focusMemory WeakMap
    // 4. spatialFirstFocusable → call lrud.js
    // 5. treeFirstFocusable → not yet implemented
    // 6. browser default → fallback
  }

  // Explicit navigation
  resolveNextFocus(currentElement, direction) {
    // 1. Check data-next-focus-{direction} attribute on current element
    // 2. If set, find element with that ID and validate it's focusable
    // 3. If not set, call lrud.js.getNextFocus()
    // 4. Return next element
  }

  // Event setup/teardown
  setupSpatialNavigation(container) {
    // Setup once, listen for arrow keys
    // Initialize focus memory tracking
  }

  teardownSpatialNavigation() {
    // Cleanup listeners
    // Clear focus memory if needed
  }

  // Imperative API for components
  setFocus(element) {
    // Called by View when hasTVPreferredFocus=true
    // Called by arrow key handler when moving focus
    // Update state and actual DOM focus
  }
}
```

### What SpatialManager Does NOT Do

❌ **Does NOT** inspect React props (except once at initialization)  
❌ **Does NOT** set DOM attributes (that's createDOMProps job)  
❌ **Does NOT** read React context or state (pure event + DOM)  
❌ **Does NOT** validate nextFocus* by inspecting React props (reads DOM attributes only)  

### SpatialManager Functions (Revised Scope)

**Function 1: setupSpatialNavigation(container)**
```javascript
/**
 * Initialize spatial navigation on a container.
 * Setup arrow key listeners and focus memory tracking.
 * 
 * @param container - HTMLElement (optional, defaults to document.body)
 */
function setupSpatialNavigation(container?: HTMLElement): void {
  if (isSpatialManagerReady) return;
  
  // 1. Setup WeakMap for focus memory tracking
  focusMemory = new WeakMap();
  
  // 2. Setup focus cache
  focusCache = new Map();
  
  // 3. Add arrow key listener to document
  document.addEventListener('keydown', handleArrowKey);
  
  isSpatialManagerReady = true;
}
```

**Function 2: handleArrowKey(event) [Internal]**
```javascript
/**
 * Handle arrow key presses - core event handler.
 * 1. Get current focus
 * 2. Resolve next focus (explicit nav → spatial nav)
 * 3. Update state
 * 4. Focus next element
 * 
 * @param event - KeyboardEvent
 */
function handleArrowKey(event: KeyboardEvent): void {
  const direction = keyToDirection(event.key); // 'up', 'down', 'left', 'right'
  if (!direction) return;
  
  const current = document.activeElement;
  if (!current) return;
  
  // Get next focus - handles explicit nav AND spatial nav
  const next = resolveNextFocus(current, direction);
  if (next && next !== current) {
    setFocus(next);
  }
}
```

**Function 3: resolveNextFocus(element, direction) [Core Logic]**
```javascript
/**
 * Determine next focus considering:
 * 1. Explicit navigation (nextFocus* attributes)
 * 2. Trap/blocking (shouldTrapFocus validation)
 * 3. Spatial algorithm (lrud.js fallback)
 * 
 * @param element - Current focused element
 * @param direction - 'up', 'down', 'left', 'right'
 * @returns Next focus element or null
 */
function resolveNextFocus(
  element: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right'
): HTMLElement | null {
  // Step 1: Check explicit navigation
  const nextFocusAttr = `data-next-focus-${direction}`;
  const nextFocusId = element.getAttribute(nextFocusAttr);
  
  if (nextFocusId) {
    // Explicit navigation target specified
    const nextElement = document.getElementById(nextFocusId);
    if (nextElement && isFocusable(nextElement)) {
      return nextElement;
    }
    // If target not found/focusable, fall through to spatial
  }
  
  // Step 2: Check trap/blocking
  if (shouldTrapFocus(element, direction)) {
    // Can't navigate in this direction - stay put or wrap
    return null; // or implement wrapping logic
  }
  
  // Step 3: Fallback to spatial algorithm
  const container = findFocusContainer(element);
  if (lrud && container) {
    return lrud.getNextFocus(element, direction, container);
  }
  
  return null;
}
```

**Function 4: determineFocus(container, options) [Initial Focus]**
```javascript
/**
 * Determine initial focus in a container following Android TV priority:
 * 1. hasTVPreferredFocus → Already handled by View component (setFocus call)
 * 2. destinations → Read from data-destinations attribute
 * 3. lastFocusedChild → Check focusMemory WeakMap
 * 4. spatialFirstFocusable → Call lrud.js
 * 5. treeFirstFocusable → Iterate JSX order (TODO: Phase 2)
 * 6. browser default → Use first focusable
 * 
 * @param container - Container element
 * @param options - { isTVFocusGuide: boolean, ... }
 * @returns First element to focus or null
 */
function determineFocus(
  container: HTMLElement,
  options?: {
    isTVFocusGuide?: boolean,
    includeContainer?: boolean
  }
): HTMLElement | null {
  if (!container) return null;
  
  // Level 2: Check destinations attribute
  const destinationsAttr = container.getAttribute('data-destinations');
  if (destinationsAttr) {
    const destIds = destinationsAttr.split(' ');
    for (const id of destIds) {
      const dest = document.getElementById(id);
      if (dest && isFocusable(dest)) {
        return dest;
      }
    }
  }
  
  // Level 3: Check focus memory (lastFocusedChild)
  const lastFocused = focusMemory.get(container);
  if (lastFocused && lastFocused.ownerDocument === document && isFocusable(lastFocused)) {
    return lastFocused;
  }
  
  // Level 4: Use spatial order (lrud.js)
  if (lrud && options?.isTVFocusGuide !== false) {
    const spatialFirst = lrud.getDefaultFocus(container);
    if (spatialFirst) return spatialFirst;
  }
  
  // Level 5: Use tree order (TODO - Phase 2)
  // const treeFirst = getFirstFocusableInTreeOrder(container);
  // if (treeFirst) return treeFirst;
  
  // Level 6: Browser default
  const focusables = container.querySelectorAll('[tabindex="0"], a, button, input, select, textarea');
  if (focusables.length > 0) {
    return focusables[0];
  }
  
  return null;
}
```

**Function 5: shouldTrapFocus(element, direction) [Blocking Logic]**
```javascript
/**
 * Check if focus is blocked in a direction due to trapFocus* attributes.
 * 
 * @param element - Currently focused element
 * @param direction - 'up', 'down', 'left', 'right'
 * @returns true if focus movement is blocked
 */
function shouldTrapFocus(
  element: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean {
  // Check if element has data-block-exit attribute
  const blockExit = element.getAttribute('data-block-exit');
  if (!blockExit) return false;
  
  // blockExit format: "up down left right" (space-separated)
  const blockedDirs = blockExit.split(' ').map(d => d.trim());
  return blockedDirs.includes(direction);
}
```

**Function 6: setFocus(element) [State Update]**
```javascript
/**
 * Set focus to an element and update state.
 * Called by:
 * 1. View component (hasTVPreferredFocus)
 * 2. Arrow key handler (navigation)
 * 3. TVFocusGuideView (initialization)
 * 
 * @param element - Element to focus
 */
function setFocus(element: HTMLElement): void {
  if (!element) return;
  
  // 1. Track focus in memory for container
  const container = findFocusContainer(element) || element;
  focusMemory.set(container, element);
  
  // 2. Update current focus state
  currentFocus = element;
  
  // 3. Actually focus the element
  element.focus();
  
  // 4. Add focus class for styling
  element.classList.add('lrud-focused');
  
  // 5. Notify listeners (optional)
  triggerFocusChangeEvent(element);
}
```

**Function 7: teardownSpatialNavigation() [Cleanup]**
```javascript
/**
 * Cleanup spatial navigation - remove listeners and clear state.
 */
function teardownSpatialNavigation(): void {
  if (!isSpatialManagerReady) return;
  
  document.removeEventListener('keydown', handleArrowKey);
  
  focusMemory = null;
  focusCache.clear();
  currentFocus = null;
  isSpatialManagerReady = false;
}
```

---

## Layer 3b: lrud.js Integration (Not Modified)

SpatialManager calls lrud.js with these inputs:

```javascript
// For navigation (after each arrow key)
const nextFocus = lrud.getNextFocus(currentElement, direction, container);

// For initial focus
const initialFocus = lrud.getDefaultFocus(container);

// lrud.js reads from DOM:
// - data-destinations
// - data-block-exit  
// - lrud-container class
// - Element bounding boxes (spatial distance calculation)
```

lrud.js is **NOT modified**. It's a pure algorithm that reads attributes set by createDOMProps.

---

## Integration Points: How Components Use SpatialManager

### View.js Integration (Simplified from analysis)

```javascript
// In View component
const View = React.forwardRef((props, forwardedRef) => {
  const { hasTVPreferredFocus, autoFocus, tvFocusable, ...rest } = props;
  const hostRef = useRef();
  
  // Setup spatial nav on first render
  useEffect(() => {
    if (Platform.isTV && tvFocusable) {
      setupSpatialNavigation();
    }
  }, [tvFocusable]);
  
  // Handle hasTVPreferredFocus - IMPERATIVE CALL
  useEffect(() => {
    if (hasTVPreferredFocus && hostRef.current) {
      setFocus(hostRef.current);  // Direct SpatialManager call
    }
  }, [hasTVPreferredFocus]);
  
  // createDOMProps will handle converting props to attributes
  const domProps = createDOMProps('div', {
    tvFocusable,
    autoFocus,
    trapFocusUp: props.trapFocusUp,
    trapFocusDown: props.trapFocusDown,
    trapFocusLeft: props.trapFocusLeft,
    trapFocusRight: props.trapFocusRight,
    nextFocusUp: props.nextFocusUp,
    nextFocusDown: props.nextFocusDown,
    nextFocusLeft: props.nextFocusLeft,
    nextFocusRight: props.nextFocusRight,
    ...rest
  });
  
  return createElement('div', { ref: hostRef, ...domProps }, props.children);
});
```

### TVFocusGuideView Integration

```javascript
// In TVFocusGuideView component
const TVFocusGuideView = React.forwardRef((props, forwardedRef) => {
  const { 
    destinations,
    autoFocus,
    enabled,
    ...rest 
  } = props;
  
  const hostRef = useRef();
  const guideDomRef = useRef();
  
  // Setup spatial nav
  useEffect(() => {
    if (enabled && Platform.isTV) {
      setupSpatialNavigation();
    }
  }, [enabled]);
  
  // Handle initial focus (determineFocus with spatial order priority)
  useEffect(() => {
    if (autoFocus && hostRef.current) {
      const initialFocus = determineFocus(hostRef.current, {
        isTVFocusGuide: true  // Use spatial order for initial focus
      });
      if (initialFocus) {
        setFocus(initialFocus);
      }
    }
  }, [autoFocus]);
  
  // setDestinations imperative method
  useImperativeHandle(forwardedRef, () => ({
    setDestinations(dests) {
      // Update data-destinations attribute on DOM
      const ids = dests.map(d => d.id).filter(Boolean).join(' ');
      guideDomRef.current?.setAttribute('data-destinations', ids);
    }
  }));
  
  const domProps = createDOMProps('div', {
    tvFocusable: true,
    autoFocus,
    isContainer: true,
    destinations,  // Converted to data-destinations by createDOMProps
    ...rest
  });
  
  return createElement('div', { ref: hostRef, ...domProps }, props.children);
});
```

---

## Data Flow Diagrams

### Data Flow 1: Component Props → DOM Attributes

```
Component Props:
  tvFocusable: true
  trapFocusUp: true
  nextFocusDown: "btn-2"
  destinations: [ref1, ref2]
  autoFocus: true
  
              ↓
              
createDOMProps() {
  // Destructure and transform
  domProps['lrud-container'] = 'true'
  domProps['data-block-exit'] = 'up'
  domProps['data-next-focus-down'] = 'btn-2'
  domProps['data-destinations'] = 'id1 id2'  // from ref.current.id
  domProps['data-autofocus'] = 'true'
}
              ↓
              
HTML Element Attributes:
  <div 
    class="lrud-container"
    data-block-exit="up"
    data-next-focus-down="btn-2"
    data-destinations="id1 id2"
    data-autofocus="true"
  />
```

### Data Flow 2: Arrow Key Event → Next Focus

```
User presses ArrowKey (Right)
              ↓
Event reaches SpatialManager.handleArrowKey()
              ↓
  1. Get current focus element
  2. Check data-next-focus-right attribute
              ↓
  3a. IF attribute set:
      Get element by ID (nextFocusId)
      Validate focusable
      Return that element
              ↓
  3b. IF attribute NOT set:
      Call lrud.js.getNextFocus(current, 'right', container)
      lrud reads: element positions, data-block-exit, etc.
      Return spatially calculated next element
              ↓
  4. Check shouldTrapFocus(current, 'right')
     - Read data-block-exit attribute
     - If 'right' blocked, stay in current container
              ↓
  5. Call setFocus(nextElement)
     - Update focusMemory WeakMap
     - Update currentFocus state
     - DOM focus() call
     - Add lrud-focused class
              ↓
Next element is now focused
```

### Data Flow 3: Initial Focus Determination

```
TVFocusGuideView mounted with autoFocus=true
              ↓
determineFocus(container, {isTVFocusGuide: true})
              ↓
Priority Order:
  1. ✅ hasTVPreferredFocus handled by View (imperative)
  
  2. Check data-destinations attribute
     Read IDs from DOM
     Return first focusable
     
  3. Check focusMemory WeakMap
     Get lastFocusedChild for container
     If still in DOM and focusable, return it
     
  4. Use lrud.js for spatial order
     Call lrud.getDefaultFocus(container)
     Returns spatially first element
     
  5. TODO Phase 2: Use tree order
     Traverse React tree JSX order
     
  6. Fallback: querySelector('a, button, [tabindex="0"]')
              ↓
Focus determined element
```

---

## State Management: WeakMap for Focus Memory

```javascript
// Per-container focus tracking
const focusMemory: WeakMap<HTMLElement, HTMLElement> = new WeakMap();

// Usage:
// When user focuses something in a container
focusMemory.set(container, focusedElement);

// When returning to container
const lastFocused = focusMemory.get(container);
if (lastFocused && isFocusable(lastFocused)) {
  setFocus(lastFocused);
}

// Cleanup: Automatic when elements are removed from DOM
// No manual cleanup needed - WeakMap handles it
```

---

## Required createDOMProps Enhancements

**File**: `/packages/react-native-web/src/modules/createDOMProps/index.js`

### Change 1: Destructure nextFocus* props

Location: Line ~130 (in the props destructuring)

```javascript
// Add to destructuring:
nextFocusUp,
nextFocusDown,
nextFocusLeft,
nextFocusRight,
```

### Change 2: Forward nextFocus* as attributes

Location: Line ~760 (after trapFocus* handling)

```javascript
// Add after existing trapFocus block:
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

**That's it!** No other changes needed to createDOMProps because:
- ✅ tvFocusable already handled
- ✅ trapFocus* already handled  
- ✅ autoFocus already handled
- ✅ destinations commented out (handled by imperative setDestinations() method)

---

## SpatialManager Current vs Required

### Current Implementation

```javascript
// exports 4 functions:
- setupSpatialNavigation(container)
- setFocus(node)
- setDestinations(host, destinations[])
- teardownSpatialNavigation()

// module-level state (5 vars):
- isSpatialManagerReady
- spatialNavigationContainer
- currentFocus
- keyDownListener
- id counter
```

### Required Additions

```javascript
// Add 4+ helper functions (internal):
- handleArrowKey(event)        // Arrow key listener
- resolveNextFocus(element, dir) // Explicit nav + spatial fallback
- determineFocus(container, opts) // Initial focus priority
- shouldTrapFocus(element, dir)   // Blocking validation
- findFocusContainer(element)     // Find tvFocusable parent
- isFocusable(element)            // Check if element can be focused

// Add state (internal):
- focusMemory: WeakMap<HTMLElement, HTMLElement>
- focusCache: Map<string, CacheEntry>

// Extend API (if needed):
- export determineFocus(container, options) // For components
- export triggerFocusChangeEvent(element)   // Callbacks
```

---

## Implementation Checklist: Phase 1 Foundation

### Step 1: Update createDOMProps (1-2 hours)
- [ ] Add nextFocus* to destructuring
- [ ] Add nextFocus* attribute forwarding
- [ ] Test: Verify data-next-focus-* attributes in DOM

### Step 2: Add SpatialManager state tracking (2 hours)
- [ ] Add focusMemory WeakMap
- [ ] Add focusCache Map
- [ ] Implement setFocus to update WeakMap

### Step 3: Implement resolveNextFocus (3 hours)
- [ ] Check data-next-focus-* attributes
- [ ] Validate explicit navigation targets
- [ ] Call lrud.js as fallback
- [ ] Handle trap/blocking

### Step 4: Implement determineFocus (2 hours)
- [ ] Check destinations attribute
- [ ] Check focus memory
- [ ] Call lrud.js spatial order
- [ ] TODO mark: tree order (Phase 2)

### Step 5: Integrate with View/TVFocusGuideView (2-3 hours)
- [ ] Add useEffect to call setFocus when hasTVPreferredFocus=true
- [ ] Add useEffect to call determineFocus on mount with autoFocus
- [ ] Add useImperativeHandle for setDestinations method

### Step 6: Testing (4-5 hours)
- [ ] Unit tests for resolveNextFocus
- [ ] Unit tests for determineFocus
- [ ] Integration tests with 10 Android TV scenarios
- [ ] Test focus memory across container transitions

**Total Phase 1 Estimate**: 14-17 hours of development

---

## Success Validation

**Phase 1 Complete When**:
1. ✅ All nextFocus* attributes appear in DOM when props are set
2. ✅ Arrow key navigation works (spatial order)
3. ✅ Explicit navigation (nextFocus*) works
4. ✅ Focus memory restores focus when returning to container
5. ✅ All 10 Android TV test scenarios pass
6. ✅ < 50ms arrow key response time
7. ✅ 90%+ code coverage for core functions

---

## References & Connections

- **createDOMProps Location**: `/packages/react-native-web/src/modules/createDOMProps/index.js`
- **SpatialManager Location**: `/packages/react-native-web/src/modules/SpatialManager/index.js`
- **View Component**: `/packages/react-native-web/src/exports/View/index.js`
- **lrud.js**: `/projects/sports/spatial/lrud-spatial-rnw/lib/lrud.js` (not modified)
- **Test Scenarios**: `/react-native-web-tv/ANDROID_TV_TEST_SCENARIOS.md`

---

*Document Version: 2.0 (Revised based on critical feedback)*  
*Last Updated: January 24, 2026*  
*Status: Ready for implementation - Architecture clarity achieved*
