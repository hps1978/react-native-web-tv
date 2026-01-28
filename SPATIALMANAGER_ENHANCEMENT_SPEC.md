# SpatialManager Enhancement Specification

**Document Purpose**: Detailed technical specification for enhancing the SpatialManager orchestrator to implement Android TV-compatible spatial navigation.

**Target Audience**: Lead architect, core development team

**Date**: January 24, 2026  
**Status**: Ready for Implementation (Phase 1)

---

## 1. Current State Analysis

### Current Architecture

```
SpatialManager/index.js (ORCHESTRATOR)
├─ State: Global module-level
│  ├─ isSpatialManagerReady: boolean
│  ├─ currentFocus: HTMLElement | null
│  ├─ spatialNavigationContainer: HTMLElement | null
│  └─ keyDownListener: (event) => void | null
│
├─ Setup Phase
│  └─ setupSpatialNavigation(container?)
│     ├─ Configures @bbc/tv-lrud-spatial via setConfig()
│     ├─ Sets spatialNavigationContainer = active element
│     └─ Attaches keydown listener to container
│
├─ Focus Setting
│  ├─ setFocus(node): Direct focus or container-based focus
│  │  ├─ Checks if node has 'lrud-container' class
│  │  ├─ If container: calls getNextFocus(null, 'ArrowDown', node) to find first focusable
│  │  └─ Updates currentFocus state
│  │
│  └─ setDestinations(host, destinations[]): Converts refs to IDs, sets data-destinations attribute
│
├─ Arrow Key Handling
│  └─ keydown listener in setupSpatialNavigation
│     ├─ Checks if key is arrow key (ArrowUp/Down/Left/Right)
│     ├─ Calls lrud.js: getNextFocus(currentFocus, keyCode, document)
│     ├─ Updates currentFocus state
│     └─ Calls nextFocus.focus() and prevents default
│
└─ Teardown
   └─ teardownSpatialNavigation(): Removes listener, clears state
```

### Exported API

```javascript
export {
  setupSpatialNavigation,     // Call once on app init
  setFocus,                   // Set focus to element or container
  teardownSpatialNavigation,  // Cleanup
  setDestinations             // Update destinations on container
};
```

### Current Gaps vs Android TV Model

| Gap | Current Behavior | Required Behavior | Impact |
|-----|------------------|-------------------|--------|
| **hasTVPreferredFocus** | Not checked in SpatialManager | Should be highest priority in determineFocus() | Initial focus on View with hasTVPreferredFocus is ignored |
| **Focus Memory** | No tracking of lastFocusedChild | Should restore on container re-focus | Users can't return to previously-focused element |
| **Explicit Navigation** | nextFocus* props defined but ignored | Should bypass spatial algorithm | Custom navigation flows don't work |
| **Tree Order Fallback** | Only spatial order available | Tree order for initial focus in normal View | Non-spatial layouts may focus wrong element |
| **Initial Focus Priority** | Direct focus() only, no priority logic | Full 6-level priority system | Can't implement Android TV semantics |
| **Trap Focus Checking** | Data attributes handled by lrud.js only | SpatialManager should validate before calling lrud.js | Edge cases not caught early |
| **State Export** | No internal state visibility | Should expose for debugging/testing | Hard to troubleshoot focus issues |

---

## 2. Enhanced State Management

### Focus State Map (WeakMap-based)

```javascript
// Track per-container focus state
const focusStateMap = new WeakMap<HTMLElement, {
  currentFocus: HTMLElement | null,
  lastFocusedChild: HTMLElement | null,    // For autoFocus restoration
  isFocusGuide: boolean,                   // TVFocusGuideView vs normal View
  isAutoFocused: boolean,                  // Track if autoFocus was set
  focusMemory: WeakMap<HTMLElement, HTMLElement>,  // child → parent tracking
  createdAt: number                        // For debugging stale state
}>
```

**Why WeakMap?**
- Auto-cleanup when HTMLElement is removed from DOM
- No memory leaks from detached containers
- Perfect for mapping DOM elements → state

### Global State Structure

```javascript
// Module-level state (to be enhanced)
let isSpatialManagerReady = false;
let spatialNavigationContainer: HTMLElement | null = null;
let currentFocus: HTMLElement | null = null;
let keyDownListener: ((event: any) => void) | null = null;

// NEW: Per-container state tracking
const focusStateMap = new WeakMap();

// NEW: Focus resolution cache (for performance)
const focusCache = new Map<string, {
  timestamp: number,
  focusables: HTMLElement[],
  order: 'tree' | 'spatial'
}>();

// NEW: Configuration & debugging
const config = {
  debugMode: false,
  cacheTimeout: 1000,  // ms before cache invalidates
  enableMemoryTracking: true,
  enablePriorityLogging: false
};
```

### State Lifecycle

```
ON APP START
  ├─ setupSpatialNavigation(rootContainer)
  │  └─ isSpatialManagerReady = true
  │  └─ Attach keydown listener
  │
ON COMPONENT MOUNT (View with autoFocus)
  ├─ View component calls SpatialManager.determineFocus()
  │  ├─ Get or create focusStateMap entry for container
  │  ├─ Run 6-level priority algorithm
  │  └─ Return focused element
  │
  └─ Element focused → currentFocus = element
     └─ Store in focusStateMap[container].lastFocusedChild
     └─ Emit focus event
     
ON ARROW KEY (e.g., ArrowDown)
  ├─ keydown listener fires
  ├─ Call resolveNextFocus(currentFocus, 'ArrowDown')
  │  ├─ Check nextFocusDown attribute
  │  ├─ Check trapFocusDown attribute
  │  └─ Fallback to lrud.js spatial
  │
  └─ Update currentFocus, store in focusStateMap[container].lastFocusedChild

ON FOCUS LOSS (focus moves outside container)
  ├─ Check if new focus is in different container
  └─ focusStateMap[oldContainer].lastFocusedChild = was focused

ON CONTAINER RE-FOCUS
  ├─ determineFocus() called again
  ├─ Check focusStateMap[container].lastFocusedChild
  ├─ If exists and still mounted: restore that element
  └─ Otherwise: run priority algorithm again

ON UNMOUNT
  ├─ WeakMap auto-cleanup when HTMLElement removed
  └─ No manual cleanup needed
```

---

## 3. New Functions Specification

### 3.1 `determineFocus(container, options)`

**Purpose**: Implement Android TV's 6-level focus selection priority

**Signature**:
```javascript
function determineFocus(
  container: HTMLElement,
  options?: {
    direction?: 'initial' | 'up' | 'down' | 'left' | 'right',
    skipMemory?: boolean,
    isTVFocusGuide?: boolean
  }
): HTMLElement | null
```

**Algorithm** (in priority order):

```
Level 1: hasTVPreferredFocus (highest priority)
  ├─ Find all descendants with data-tv-preferred-focus="true"
  ├─ Return first found (should only be one, but take first for safety)
  └─ If found: RETURN immediately, skip all other levels

Level 2: destinations (TVFocusGuideView only)
  ├─ Check if container has data-destinations attribute
  ├─ Parse space-separated IDs from attribute
  ├─ Try to find each destination in DOM by ID
  ├─ Return first found and focusable
  └─ If not found: CONTINUE to Level 3

Level 3: lastFocusedChild + autoFocus
  ├─ Check if container has data-autofocus="true"
  ├─ Check focusStateMap[container].lastFocusedChild
  ├─ If exists and still mounted and focusable: RETURN
  └─ If not valid: CONTINUE to Level 4

Level 4: spatialFirstFocusable
  ├─ Get all focusable descendants
  ├─ Sort by spatial order (top-left to bottom-right)
  ├─ Return first element
  └─ Use lrud.js or custom spatial sort

Level 5: treeFirstFocusable (normal View only, not TVFocusGuideView)
  ├─ Get all focusable descendants
  ├─ Return in JSX declaration order (tree order)
  ├─ This is the key difference for normal View
  └─ Skip this for TVFocusGuideView

Level 6: browser default
  ├─ Let browser find first focusable
  └─ Return null and let browser handle
```

**Behavior Details**:

```javascript
// Example: Normal View with multiple children
<View tvFocusable autoFocus>
  <Button>First (tree order)</Button>
  <Button>Second</Button>
  <Button hasTVPreferredFocus>Third</Button>
</View>

determineFocus(container)
  // Level 1: Check hasTVPreferredFocus
  // → Found! Return Third (even though it's 3rd in tree order)
  // (Result: Third gets focus)

// Example: TVFocusGuideView with autoFocus, repositioned children
<TVFocusGuideView autoFocus>
  <Button style={{position: 'absolute', top: 0, left: 0}}>TopLeft</Button>
  <Button style={{position: 'absolute', top: 0, right: 0}}>TopRight</Button>
</TVFocusGuideView>

determineFocus(container, { isTVFocusGuide: true })
  // Level 1: No hasTVPreferredFocus
  // Level 2: No destinations
  // Level 3: No lastFocusedChild (first time)
  // Level 4: Get spatial first
  // → TopLeft (geometric first position)
  // Level 5: SKIP (TVFocusGuideView uses spatial, not tree)
  // (Result: TopLeft gets focus)

// Example: Same view, normal View instead
<View tvFocusable autoFocus>
  <Button style={{position: 'absolute', top: 0, left: 0}}>TopLeft</Button>
  <Button style={{position: 'absolute', top: 0, right: 0}}>TopRight</Button>
</View>

determineFocus(container, { isTVFocusGuide: false })
  // Level 1: No hasTVPreferredFocus
  // Level 2: N/A (not a focus guide)
  // Level 3: No lastFocusedChild
  // Level 4: Would be TopLeft spatially... BUT
  // Level 5: Check tree order (JSX order)
  // → TopLeft (tree first, happens to match spatial)
  // (Result: TopLeft gets focus based on tree order)
```

**Implementation Outline**:

```javascript
function determineFocus(container, options = {}) {
  const {
    direction = 'initial',
    skipMemory = false,
    isTVFocusGuide = false
  } = options;
  
  // Level 1: hasTVPreferredFocus
  let preferred = container.querySelector('[data-tv-preferred-focus="true"]');
  if (preferred && isFocusable(preferred)) {
    log('determineFocus: Found hasTVPreferredFocus', preferred);
    return preferred;
  }
  
  // Level 2: destinations
  if (isTVFocusGuide) {
    let destinations = container.getAttribute('data-destinations')?.split(' ');
    if (destinations?.length) {
      for (let destId of destinations) {
        let dest = document.getElementById(destId);
        if (dest && isFocusable(dest)) {
          log('determineFocus: Using destination', dest);
          return dest;
        }
      }
    }
  }
  
  // Level 3: lastFocusedChild + autoFocus
  if (!skipMemory && container.hasAttribute('data-autofocus')) {
    let lastChild = getLastFocusedChild(container);
    if (lastChild && isFocusable(lastChild) && container.contains(lastChild)) {
      log('determineFocus: Restoring lastFocusedChild', lastChild);
      return lastChild;
    }
  }
  
  // Level 4: spatialFirstFocusable
  if (isTVFocusGuide) {
    let spatialFirst = getSpatialFirstFocusable(container);
    if (spatialFirst) {
      log('determineFocus: Using spatialFirstFocusable', spatialFirst);
      return spatialFirst;
    }
  }
  
  // Level 5: treeFirstFocusable (normal View only)
  if (!isTVFocusGuide) {
    let treeFirst = getTreeFirstFocusable(container);
    if (treeFirst) {
      log('determineFocus: Using treeFirstFocusable', treeFirst);
      return treeFirst;
    }
  }
  
  // Level 6: browser default or null
  log('determineFocus: No explicit focus found, using browser default');
  return null;
}
```

**Integration Points**:
- Called by View component in useEffect when `autoFocus={true}`
- Called by TVFocusGuideView in useEffect when `autoFocus={true}`
- Called by setFocus() for containers
- Results cached to avoid repeated DOM traversals

---

### 3.2 `getTreeOrderFocusables(container)`

**Purpose**: Discover focusable elements in JSX declaration order (tree order)

**Challenge**: React tree order ≠ DOM tree order due to Fragments, conditional rendering, etc.

**Signature**:
```javascript
function getTreeOrderFocusables(container: HTMLElement): HTMLElement[]
```

**Algorithm**:

```
1. Get all focusable descendants (normal DOM traversal)
2. Sort by DOM position in tree order (depth-first)
3. Return sorted array in JSX declaration order

Key insight: JSX order is preserved in DOM as rendered (React maintains order)
Exception: Fragments, keys, dynamic lists might reorder

Fallback: Use data-react-key or data-index attributes if component sets them
```

**Implementation Outline**:

```javascript
function getTreeOrderFocusables(container) {
  // Get all focusable elements
  let focusables = getFocusablesInContainer(container);
  
  // Sort by DOM tree order (depth-first traversal order)
  // This preserves JSX declaration order because React renders in order
  let treeOrder = [...focusables].sort((a, b) => {
    // Compare position in tree traversal
    let aPos = getTreePosition(container, a);
    let bPos = getTreePosition(container, b);
    return aPos - bPos;
  });
  
  return treeOrder;
}

function getTreePosition(root, element) {
  // Traversal counter: what index is this element in depth-first order?
  let position = 0;
  let found = false;
  
  function traverse(node) {
    if (found) return;
    if (node === element) {
      found = true;
      return;
    }
    position++;
    for (let child of node.children) {
      traverse(child);
      if (found) return;
    }
  }
  
  traverse(root);
  return position;
}
```

**Cache Strategy**:
- Cache result per container with TTL
- Invalidate on DOM mutation (use MutationObserver or React render cycles)
- Key: `tree-order-${containerId}`

---

### 3.3 `getSpatialOrderFocusables(container)`

**Purpose**: Get focusables sorted by spatial/geometric positioning

**Algorithm**:
```
Use @bbc/tv-lrud-spatial's internal sorting or custom sort by:
1. Top-left corner position (y, then x)
2. Spatial distance calculation
3. Directionality (left-to-right, top-to-bottom)
```

**Implementation**:

```javascript
function getSpatialOrderFocusables(container) {
  let focusables = getFocusablesInContainer(container);
  
  // Sort by spatial position (top-left first)
  let spatialOrder = [...focusables].sort((a, b) => {
    let aRect = a.getBoundingClientRect();
    let bRect = b.getBoundingClientRect();
    
    // Primary: top position (y)
    if (Math.abs(aRect.top - bRect.top) > 10) { // 10px tolerance
      return aRect.top - bRect.top;
    }
    
    // Secondary: left position (x)
    return aRect.left - bRect.left;
  });
  
  return spatialOrder;
}
```

**Note**: This can be improved by using @bbc/tv-lrud-spatial's spatial calculation algorithms.

---

### 3.4 `resolveNextFocus(currentFocus, direction, container)`

**Purpose**: Resolve next focus considering explicit navigation, trapping, and spatial fallback

**Signature**:
```javascript
function resolveNextFocus(
  currentFocus: HTMLElement | null,
  direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  container: HTMLElement
): HTMLElement | null
```

**Algorithm**:

```
Step 1: Check if currentFocus has explicit nextFocus* attribute
  ├─ If direction is ArrowUp → check data-next-focus-up
  ├─ Get target element by ID
  └─ If found and focusable: RETURN (bypass spatial)

Step 2: Check if currentFocus or any parent has trapFocus* set
  ├─ If direction is ArrowUp and trapFocusUp=true: return currentFocus (stay)
  ├─ If direction is ArrowDown and trapFocusDown=true: return currentFocus
  ├─ etc for all 4 directions
  └─ If trapped: RETURN currentFocus (no movement)

Step 3: Fallback to lrud.js spatial navigation
  ├─ Call getNextFocus(currentFocus, direction, scope)
  ├─ Return spatial algorithm's result
  └─ RETURN result (could be null if no valid next focus)
```

**Implementation Outline**:

```javascript
function resolveNextFocus(currentFocus, direction, container) {
  if (!currentFocus) {
    // No current focus, use determineFocus
    return determineFocus(container);
  }
  
  // Step 1: Check explicit nextFocus* attribute
  let nextFocusDir = directionalAttributeMap[direction]; // 'data-next-focus-up', etc
  let nextFocusId = currentFocus.getAttribute(nextFocusDir);
  
  if (nextFocusId) {
    let target = document.getElementById(nextFocusId);
    if (target && isFocusable(target)) {
      log(`resolveNextFocus: Using explicit ${nextFocusDir}`, target);
      return target;
    }
  }
  
  // Step 2: Check trapFocus* attribute
  if (shouldTrapFocus(currentFocus, direction)) {
    log(`resolveNextFocus: Blocked by trapFocus in direction ${direction}`);
    return currentFocus; // Stay focused
  }
  
  // Step 3: Fallback to spatial
  let nextSpatial = getNextFocus(currentFocus, direction, container);
  if (nextSpatial) {
    log(`resolveNextFocus: Using spatial algorithm`, nextSpatial);
    return nextSpatial;
  }
  
  // No valid next focus
  return null;
}
```

---

### 3.5 `shouldTrapFocus(element, direction)`

**Purpose**: Check if focus should be trapped in current direction

**Signature**:
```javascript
function shouldTrapFocus(
  element: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean
```

**Algorithm**:

```
1. Check element and all parents up to spatialNavigationContainer
2. If any ancestor has data-block-exit-${direction}="true": return true
3. If any ancestor has trapFocus${Direction}=true (from React prop): return true
4. Otherwise: return false
```

**Implementation**:

```javascript
function shouldTrapFocus(element, direction) {
  let current = element;
  
  while (current && current !== spatialNavigationContainer) {
    // Check for data-block-exit-${direction} (from lrud.js)
    let blockAttr = `data-block-exit-${direction}`;
    if (current.hasAttribute(blockAttr)) {
      log(`shouldTrapFocus: Trapped by ${blockAttr}`, current);
      return true;
    }
    
    // Check for React trapFocus* prop (forwarded as data-trap-focus-${direction})
    let trapAttr = `data-trap-focus-${direction}`;
    if (current.hasAttribute(trapAttr)) {
      log(`shouldTrapFocus: Trapped by ${trapAttr}`, current);
      return true;
    }
    
    current = current.parentElement;
  }
  
  return false;
}
```

---

### 3.6 `findFocusableTarget(targetId, container)`

**Purpose**: Find and validate a focusable element by ID

**Signature**:
```javascript
function findFocusableTarget(
  targetId: string,
  container?: HTMLElement
): HTMLElement | null
```

**Implementation**:

```javascript
function findFocusableTarget(targetId, container) {
  let target = document.getElementById(targetId);
  
  // Validate target exists
  if (!target) {
    warn(`findFocusableTarget: Element with id="${targetId}" not found`);
    return null;
  }
  
  // Validate target is focusable
  if (!isFocusable(target)) {
    warn(`findFocusableTarget: Element id="${targetId}" is not focusable`);
    return null;
  }
  
  // Optional: validate target is within container
  if (container && !container.contains(target)) {
    warn(`findFocusableTarget: Element id="${targetId}" is not in container`);
    return null;
  }
  
  return target;
}
```

---

### 3.7 Helper: `isFocusable(element)`

**Purpose**: Determine if element can receive focus

**Signature**:
```javascript
function isFocusable(element: HTMLElement): boolean
```

**Checks**:

```javascript
function isFocusable(element) {
  if (!element) return false;
  
  // Check visibility
  if (element.style.display === 'none') return false;
  if (element.style.visibility === 'hidden') return false;
  if (element.offsetParent === null && element !== document.body) return false;
  
  // Check focusable attribute
  if (element.hasAttribute('focusable')) {
    let focusable = element.getAttribute('focusable');
    if (focusable === 'false') return false;
  }
  
  // Check tabIndex
  let tabIndex = element.tabIndex;
  if (tabIndex < 0 && !element.hasAttribute('data-tv-focusable')) {
    return false;
  }
  
  // Check disabled
  if (element.hasAttribute('disabled')) return false;
  if (element.hasAttribute('aria-disabled') && element.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  
  // Check if marked for spatial nav
  if (!element.closest('[tvfocusable], [data-tv-focusable], .lrud-container')) {
    return false;
  }
  
  return true;
}
```

---

## 4. State Management & Focus Memory

### Focus Memory Tracking

```javascript
// On any element focus event
function handleElementFocus(element) {
  currentFocus = element;
  
  // Find the container this element belongs to
  let container = element.closest('[tvfocusable], .lrud-container');
  
  if (container) {
    // Get or create state for this container
    let state = focusStateMap.get(container) || {
      currentFocus: null,
      lastFocusedChild: null,
      isFocusGuide: container.classList.contains('lrud-focus-guide'),
      isAutoFocused: container.hasAttribute('data-autofocus'),
      focusMemory: new WeakMap(),
      createdAt: Date.now()
    };
    
    // Update state
    state.currentFocus = element;
    state.lastFocusedChild = element;
    
    // Store back
    focusStateMap.set(container, state);
    
    log(`Focus memory: stored ${element.id} as last focused in container`);
  }
}

function getLastFocusedChild(container) {
  let state = focusStateMap.get(container);
  return state?.lastFocusedChild || null;
}
```

### Focus Loss Handling

```javascript
// On blur event (element loses focus)
function handleElementBlur(element) {
  let container = element.closest('[tvfocusable], .lrud-container');
  
  if (container) {
    let state = focusStateMap.get(container);
    if (state) {
      // Check if focus moved to different container
      let newContainer = document.activeElement?.closest('[tvfocusable], .lrud-container');
      
      if (newContainer !== container) {
        // Focus moved away, save lastFocusedChild for restoration
        state.lastFocusedChild = element;
        focusStateMap.set(container, state);
        log(`Focus loss: saved ${element.id} as last focused for restoration`);
      }
    }
  }
}
```

### Cache Management

```javascript
// Invalidate cache on DOM mutation
let mutationObserver = new MutationObserver(() => {
  focusCache.clear();
  log('Focus cache cleared due to DOM mutation');
});

// Watch container for changes
mutationObserver.observe(spatialNavigationContainer, {
  childList: true,
  subtree: true,
  attributes: true
});
```

---

## 5. Integration with React Components

### View Component Integration

```javascript
// In View/index.js useEffect (when autoFocus={true})
useEffect(() => {
  if (autoFocus && isTV && isSpatialManagerReady) {
    // Let SpatialManager determine which element should be focused
    let focusElement = SpatialManager.determineFocus(ref.current, {
      isTVFocusGuide: false, // Normal View
      direction: 'initial'
    });
    
    if (focusElement) {
      focusElement.focus();
    }
  }
}, [autoFocus, isTV]);
```

### TVFocusGuideView Integration

```javascript
// In TVFocusGuideView.js
useEffect(() => {
  if (autoFocus && isTV && isSpatialManagerReady) {
    let focusElement = SpatialManager.determineFocus(guideRef.current, {
      isTVFocusGuide: true, // TVFocusGuideView
      direction: 'initial'
    });
    
    if (focusElement) {
      focusElement.focus();
    }
  }
}, [autoFocus, isTV, destinations]);
```

### Imperative Method: setDestinations

```javascript
// TVFocusGuideView imperative ref method
useImperativeHandle(ref, () => ({
  setDestinations: (newDestinations) => {
    SpatialManager.setDestinations(guideRef.current, newDestinations);
  }
}));
```

---

## 6. Arrow Key Event Handling Flow

### Before Enhancement

```
keydown event (ArrowDown)
  ↓
keydown listener in setupSpatialNavigation
  ↓
Call getNextFocus(currentFocus, 'ArrowDown', scope)  [lrud.js]
  ↓
Update currentFocus, call focus(), preventDefault()
```

**Problem**: No explicit nextFocus* checking, no trap validation, no determineFocus for initial

### After Enhancement

```
keydown event (ArrowDown)
  ↓
keydown listener in setupSpatialNavigation
  ↓
Call resolveNextFocus(currentFocus, 'ArrowDown', container)  [NEW]
  ├─ Check nextFocusDown attribute [NEW]
  ├─ Check trapFocusDown [NEW]
  ├─ Fallback to getNextFocus() [lrud.js]
  └─ Return next focus element
  ↓
If nextFocus found:
  ├─ Update currentFocus state
  ├─ Store in focusStateMap[container].lastFocusedChild  [NEW]
  ├─ Call nextFocus.focus()
  ├─ Emit focus event
  └─ preventDefault()
  ↓
Else: Allow browser default (no movement)
```

---

## 7. State Export for Debugging

### New Debug/Export API

```javascript
export const DEBUG_API = {
  // Get internal focus state
  getFocusState: () => ({
    isSpatialManagerReady,
    currentFocus,
    spatialNavigationContainer,
    focusStateMap: Array.from(focusStateMap.entries()).map(([container, state]) => ({
      container: container.id || container.className,
      currentFocus: state.currentFocus?.id,
      lastFocusedChild: state.lastFocusedChild?.id,
      isFocusGuide: state.isFocusGuide,
      isAutoFocused: state.isAutoFocused,
      createdAt: state.createdAt
    }))
  }),
  
  // Enable/disable debug logging
  setDebugMode: (enabled: boolean) => {
    config.debugMode = enabled;
  },
  
  // Get focusables in container
  getFocusables: (container) => ({
    tree: getTreeOrderFocusables(container).map(e => e.id),
    spatial: getSpatialOrderFocusables(container).map(e => e.id)
  }),
  
  // Manually trigger focus determination
  determineFocus: (container, options) => {
    return determineFocus(container, options)?.id || null;
  },
  
  // Clear caches
  clearCaches: () => {
    focusCache.clear();
  }
};

// Expose for debugging in DevTools console
window.__SPATIAL_NAV__ = DEBUG_API;
```

---

## 8. SpatialManager + lrud.js Contract

### What SpatialManager Passes to lrud.js

```javascript
getNextFocus(
  currentElement,                    // HTMLElement | null (current focused element)
  direction,                         // 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  scope                             // HTMLElement | Document (search within this scope)
) → HTMLElement | null
```

### What lrud.js Returns

```javascript
{
  // The next element to focus, or null if no valid next element
  nextElement: HTMLElement | null,
  
  // Why it was selected (for debugging)
  reason?: string  // 'spatial', 'explicit', 'wrapped', etc
}
```

### Attributes lrud.js Reads

```
.lrud-container          → Marks as spatial navigation container
.lrud-focusable          → Marks as focusable candidate
.lrud-ignore             → Skip this element
data-destinations        → Space-separated IDs of redirect targets
data-block-exit-up       → Block exit upward
data-block-exit-down     → Block exit downward
data-block-exit-left     → Block exit leftward
data-block-exit-right    → Block exit rightward
data-autofocus           → This container should auto-focus
data-focus               → Last focused child (for memory restoration)
[NEW] data-next-focus-up         → Explicit next focus (up)
[NEW] data-next-focus-down       → Explicit next focus (down)
[NEW] data-next-focus-left       → Explicit next focus (left)
[NEW] data-next-focus-right      → Explicit next focus (right)
[NEW] data-tv-preferred-focus    → Highest priority focus
[NEW] data-trap-focus-up         → Trap focus (up) [redundant with block-exit, for clarity]
[NEW] data-trap-focus-down       → Trap focus (down)
[NEW] data-trap-focus-left       → Trap focus (left)
[NEW] data-trap-focus-right      → Trap focus (right)
```

### Integration Flow

```
React Component                           SpatialManager                    lrud.js
       │                                        │                             │
       │                                        │                             │
       ├─ useEffect(autoFocus)                 │                             │
       │                                        │                             │
       │──determineFocus(container)──→          │                             │
       │                             ├─(getTreeOrderFocusables)              │
       │                             ├─(getSpatialOrderFocusables)           │
       │                             └──return focusElement ──→ .focus()     │
       │                                        │                             │
       │                                        │                             │
       │ [User presses ArrowDown]               │                             │
       │                                        │                             │
       │                              keydown listener                        │
       │                                        │                             │
       │                             resolveNextFocus                        │
       │                             ├─(check nextFocusDown attr)           │
       │                             ├─(check trapFocusDown attr)           │
       │                             └─getNextFocus(...)─────────────────→  │
       │                                        │ ← return nextElement ────  │
       │                                        │                             │
       │                                  .focus()                           │
       │                                        │                             │
       │ [focus event fires]                    │                             │
       │                                  focusStateMap updated             │
       │                                        │                             │
       ├─ onFocusChanged callback               │                             │
       │                                        │                             │
```

---

## 9. Error Handling & Validation

### Validation Checks

```javascript
function validateFocusElement(element, context) {
  if (!element) {
    warn(`Validation: No focus element provided in context: ${context}`);
    return false;
  }
  
  if (!isFocusable(element)) {
    warn(`Validation: Element ${element.id} is not focusable in context: ${context}`);
    return false;
  }
  
  if (element.offsetParent === null && element !== document.body) {
    warn(`Validation: Element ${element.id} is hidden (offsetParent is null)`);
    return false;
  }
  
  return true;
}
```

### Logging Strategy

```javascript
function log(message, data) {
  if (config.debugMode || config.enablePriorityLogging) {
    console.log(`[SpatialManager] ${message}`, data);
  }
}

function warn(message, data) {
  console.warn(`[SpatialManager] ${message}`, data);
}

function error(message, data) {
  console.error(`[SpatialManager] ${message}`, data);
}
```

---

## 10. Performance Considerations

### Cache Strategy

```javascript
const focusCache = new Map<string, {
  timestamp: number,
  focusables: HTMLElement[],
  order: 'tree' | 'spatial'
}>();

function getCachedFocusables(container, order) {
  let key = `${container.id || container.className}-${order}`;
  let cached = focusCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < config.cacheTimeout) {
    return cached.focusables;
  }
  
  // Cache miss or expired, recalculate
  let focusables = order === 'tree' 
    ? getTreeOrderFocusables(container)
    : getSpatialOrderFocusables(container);
  
  focusCache.set(key, {
    timestamp: Date.now(),
    focusables,
    order
  });
  
  return focusables;
}
```

### Performance Targets

- Focus determination: < 16ms (60fps)
- Arrow key response: < 50ms
- No memory leaks from WeakMap
- Focus cache hit ratio > 80%

---

## 11. Transition Plan from Current

### Phase 1A: State Infrastructure (Non-breaking)

```javascript
// Add WeakMap state management without changing existing functions
const focusStateMap = new WeakMap();

// Keep existing exports, add internal state
let isSpatialManagerReady = false;
// ... existing state vars ...
// ... add new state ...
```

### Phase 1B: New Functions (Non-breaking)

```javascript
// Add new internal functions
function determineFocus(container, options) { ... }
function getTreeOrderFocusables(container) { ... }
// ... etc ...

// Keep existing exports unchanged
export {
  setupSpatialNavigation,
  setFocus,
  teardownSpatialNavigation,
  setDestinations
};
```

### Phase 2: Enhanced keydown Handler (Drop-in replacement)

```javascript
// In setupSpatialNavigation, update keydown listener
// From: getNextFocus(currentFocus, keyCode, ...)
// To: resolveNextFocus(currentFocus, keyCode, ...)
```

### Phase 3: Export DEBUG_API (Debugging)

```javascript
export const DEBUG_API = { ... };
window.__SPATIAL_NAV__ = DEBUG_API;
```

### Phase 4: Component Integration

```javascript
// View.js calls SpatialManager.determineFocus()
// TVFocusGuideView.js calls SpatialManager.determineFocus()
// Both components must forward: isTVFocusGuide, autoFocus flags
```

---

## 12. Summary of Changes

| Item | Current | Enhanced | Impact |
|------|---------|----------|--------|
| **State** | Global vars | Global vars + WeakMap | Focus memory tracking |
| **Functions** | 4 exported | 4 exported + 6 internal helpers | Android TV semantics |
| **Initial Focus** | Direct setFocus() | determineFocus() priority | Proper focus selection |
| **Arrow Keys** | Direct getNextFocus() | resolveNextFocus() wrapper | Explicit nav + trap checking |
| **Focus Memory** | None | WeakMap per container | autoFocus restoration |
| **Debugging** | Limited | DEBUG_API export | Easier troubleshooting |
| **Performance** | No caching | focusCache with TTL | Faster repeated nav |

---

## 13. Success Criteria

- ✅ hasTVPreferredFocus takes absolute priority
- ✅ Focus memory restores on container re-focus
- ✅ Explicit nextFocus* navigation works
- ✅ Tree order used for initial focus in normal View
- ✅ Spatial order used for initial focus in TVFocusGuideView
- ✅ Arrow key response time < 50ms
- ✅ No memory leaks from WeakMap tracking
- ✅ All 10 test scenarios pass

---

## References

- SPATIAL_NAVIGATION_PLAN.md - Overall architecture
- ANDROID_TV_TEST_SCENARIOS.md - Test cases to validate
- TV_NAVIGATION_API_REFERENCE.md - Developer API
- lrud.js - Spatial algorithm implementation
- @bbc/tv-lrud-spatial - Upstream library

---

*Document Version*: 1.0  
*Status*: Ready for Phase 1 Implementation  
*Next Step*: Begin implementing determineFocus() function
