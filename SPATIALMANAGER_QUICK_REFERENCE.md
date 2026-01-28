# SpatialManager Quick Reference Guide

**For**: Developers implementing Phase 1 foundation  
**Purpose**: Quick lookup during coding sessions  
**Last Updated**: January 24, 2026

---

## Function Quick Reference

### determineFocus(container, options?) → HTMLElement | null

**Purpose**: Select initial focus using 6-level Android TV priority

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

**Priority Order**:
1. `data-tv-preferred-focus="true"` → RETURN immediately
2. `data-destinations` (if isTVFocusGuide) → RETURN first found
3. `lastFocusedChild` + `data-autofocus` → RETURN if valid
4. Spatial first (if isTVFocusGuide) → RETURN first
5. Tree first (if NOT isTVFocusGuide) → RETURN first
6. Return null (browser default)

**Used By**:
- View.js: `useEffect(() => { if (autoFocus) determineFocus(ref, {isTVFocusGuide: false}) })`
- TVFocusGuideView.js: `useEffect(() => { if (autoFocus) determineFocus(ref, {isTVFocusGuide: true}) })`

**Example**:
```javascript
// Component mount - determine which element to focus
const element = SpatialManager.determineFocus(containerRef, {
  isTVFocusGuide: false  // Normal View
});
if (element) element.focus();
```

---

### resolveNextFocus(currentFocus, direction, container) → HTMLElement | null

**Purpose**: Resolve next focus for arrow key navigation

**Signature**:
```javascript
function resolveNextFocus(
  currentFocus: HTMLElement | null,
  direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  container: HTMLElement | Document
): HTMLElement | null
```

**Steps**:
1. Check `data-next-focus-${dir}` → Return if found
2. Check `shouldTrapFocus()` → Return currentFocus if trapped
3. Call `lrud.getNextFocus()` → Return spatial result

**Used By**:
- keydown listener in setupSpatialNavigation()

**Example**:
```javascript
// User presses ArrowDown
keyDownListener = addEventListener(container, 'keydown', (event) => {
  if (event.key === 'ArrowDown') {
    const nextFocus = resolveNextFocus(currentFocus, 'ArrowDown', container);
    if (nextFocus) {
      nextFocus.focus();
      event.preventDefault();
    }
  }
});
```

---

### getTreeOrderFocusables(container) → HTMLElement[]

**Purpose**: Get focusable elements in JSX declaration order

**Algorithm**:
```
1. Get all focusable descendants
2. Sort by tree traversal position (depth-first)
3. Return array in JSX order
```

**Key Insight**: React renders in JSX order, so DOM order = tree order

**Used By**:
- determineFocus() Level 5 (normal View)
- For caching: `focusCache['tree-order-${id}']`

**Example**:
```javascript
const focusables = getTreeOrderFocusables(container);
const treeFirst = focusables[0];  // First element in JSX
```

---

### getSpatialOrderFocusables(container) → HTMLElement[]

**Purpose**: Get focusables sorted by spatial/geometric position

**Algorithm**:
```
1. Get all focusable descendants
2. Sort by (top, left) position using getBoundingClientRect()
3. Return array with top-left first
```

**Used By**:
- determineFocus() Level 4 (TVFocusGuideView)
- For caching: `focusCache['spatial-order-${id}']`

**Example**:
```javascript
const spatialOrder = getSpatialOrderFocusables(container);
const topLeftFirst = spatialOrder[0];  // Geometric first
```

---

### shouldTrapFocus(element, direction) → boolean

**Purpose**: Check if focus should be trapped in given direction

**Logic**:
```
Walk up element → parents → spatialNavigationContainer
  ├─ Check: data-block-exit-${direction}
  ├─ Check: data-trap-focus-${direction}
  └─ If any found: return true (trapped)
Return false (not trapped)
```

**Used By**:
- resolveNextFocus() Step 2 (trap validation)

**Example**:
```javascript
// User presses ArrowUp in modal
if (shouldTrapFocus(currentFocus, 'up')) {
  return currentFocus;  // Don't move, stay in modal
}
```

---

### isFocusable(element) → boolean

**Purpose**: Determine if element can receive focus

**Checks**:
```
✓ Not null/undefined
✓ Not display: none
✓ Not visibility: hidden
✓ offsetParent exists (visible)
✓ Not disabled
✓ Not aria-disabled="true"
✓ tabIndex >= 0 OR has data-tv-focusable
✓ Within [tvfocusable] container
```

**Used By**:
- All validators (determineFocus, findFocusableTarget, etc)

**Example**:
```javascript
if (isFocusable(element)) {
  element.focus();  // Safe to focus
}
```

---

### findFocusableTarget(targetId, container?) → HTMLElement | null

**Purpose**: Find and validate focusable element by ID

**Validates**:
1. Element exists: `document.getElementById(id)`
2. Element is focusable: `isFocusable(element)`
3. Element in container (optional): `container.contains(element)`

**Used By**:
- resolveNextFocus() Step 1 (explicit nav lookup)
- determineFocus() Level 2 (destinations lookup)

**Example**:
```javascript
// User set data-next-focus-down="nextButton"
const target = findFocusableTarget("nextButton", container);
if (target) {
  return target;  // Found and valid
}
```

---

## State Management Quick Ref

### WeakMap focusStateMap

**Purpose**: Track focus state per container

**Structure**:
```javascript
focusStateMap: WeakMap<HTMLElement, {
  currentFocus: HTMLElement | null,
  lastFocusedChild: HTMLElement | null,
  isFocusGuide: boolean,
  isAutoFocused: boolean,
  focusMemory: WeakMap<>,
  createdAt: number
}>
```

**Get/Set**:
```javascript
// Get state for container
let state = focusStateMap.get(container);
if (!state) {
  state = {
    currentFocus: null,
    lastFocusedChild: null,
    isFocusGuide: false,
    isAutoFocused: false,
    focusMemory: new WeakMap(),
    createdAt: Date.now()
  };
}

// Update state
state.lastFocusedChild = element;
focusStateMap.set(container, state);
```

**Auto-Cleanup**:
- When element removed from DOM → WeakMap entry auto-deleted
- No memory leaks ✅
- No manual .delete() needed ✅

---

### Map focusCache

**Purpose**: Cache focusables discovery results (performance)

**Keys**:
```javascript
'tree-order-${containerId}' → TreeOrderFocusables[]
'spatial-order-${containerId}' → SpatialOrderFocusables[]
```

**TTL**: 1000ms (configurable)

**Get/Set**:
```javascript
// Check cache
const key = 'tree-order-' + container.id;
let cached = focusCache.get(key);
if (cached && Date.now() - cached.timestamp < 1000) {
  return cached.focusables;  // Hit ✅
}

// Cache miss - recalculate
const focusables = getTreeOrderFocusables(container);
focusCache.set(key, {
  timestamp: Date.now(),
  focusables,
  order: 'tree'
});
return focusables;
```

**Invalidation**:
```javascript
// Clear all on DOM mutation
const observer = new MutationObserver(() => {
  focusCache.clear();
});
observer.observe(spatialNavigationContainer, {
  childList: true,
  subtree: true,
  attributes: true
});
```

---

## Attribute Reference

### What Each Attribute Does

| Attribute | Set By | Read By | Effect |
|-----------|--------|---------|--------|
| `data-tv-preferred-focus="true"` | React prop | SpatialManager L1 | Highest priority focus |
| `data-destinations="id1 id2"` | imperative API | SpatialManager L2 | Redirect focus targets |
| `data-autofocus="true"` | React prop | SpatialManager L3 | Enable focus memory |
| `data-next-focus-down="id"` | React prop | SpatialManager S1 | Explicit nav (arrow down) |
| `data-block-exit-down="true"` | React prop | SpatialManager S2 + lrud.js | Trap focus (down) |
| `data-trap-focus-down="true"` | React prop | SpatialManager S2 | Same as block-exit |
| `.lrud-container` | CSS class | lrud.js | Container marker |
| `.lrud-focusable` | CSS class | lrud.js | Focusable marker |
| `tabIndex` | HTML attr | lrud.js | Focus capability |
| `disabled` | HTML attr | isFocusable() | Can't focus |

### Priority When Multiple Set

```
Explicit navigation (data-next-focus-*) wins over trap
  └─ Example: Have both data-next-focus-down AND data-block-exit-down
     → data-next-focus-down wins, element moves

hasTVPreferredFocus (Level 1) wins over destinations (Level 2)
  └─ Example: Both set on TVFocusGuideView
     → hasTVPreferredFocus wins immediately

lastFocusedChild (Level 3) wins over spatial (Level 4)
  └─ Example: Both options available
     → lastFocusedChild wins (UX continuity)

Trap blocks all directions equally
  └─ Cannot be selectively overridden
     → All 4 directions blocked if any trapFocus* set
```

---

## Integration Checklist

### For View Component

```javascript
// In useEffect
if (autoFocus && isTVApp) {
  const element = SpatialManager.determineFocus(
    ref.current,
    { isTVFocusGuide: false }
  );
  if (element) element.focus();
}
```

**Attributes needed**:
- ✓ data-autofocus="true"
- ✓ data-tv-preferred-focus (on children)
- ✓ data-next-focus-* (on children)
- ✓ data-block-exit-* (on children)

---

### For TVFocusGuideView Component

```javascript
// In useEffect
if (autoFocus && isTVApp) {
  const element = SpatialManager.determineFocus(
    guideRef.current,
    { isTVFocusGuide: true }
  );
  if (element) element.focus();
}

// Imperative method
useImperativeHandle(ref, () => ({
  setDestinations: (destinations) => {
    SpatialManager.setDestinations(guideRef.current, destinations);
  }
}));
```

**Attributes needed**:
- ✓ data-autofocus="true"
- ✓ data-destinations="id1 id2" (set via setDestinations)
- ✓ data-tv-preferred-focus (on children)
- ✓ data-next-focus-* (on children)
- ✓ data-block-exit-* (on children)

---

### For createDOMProps

```javascript
export const tvProps = {
  autoFocus: (value) => value ? { 'data-autofocus': 'true' } : {},
  hasTVPreferredFocus: (value) => value ? { 'data-tv-preferred-focus': 'true' } : {},
  nextFocusUp: (value) => value ? { 'data-next-focus-up': value } : {},
  nextFocusDown: (value) => value ? { 'data-next-focus-down': value } : {},
  nextFocusLeft: (value) => value ? { 'data-next-focus-left': value } : {},
  nextFocusRight: (value) => value ? { 'data-next-focus-right': value } : {},
  trapFocusUp: (value) => value ? { 'data-block-exit-up': 'true', 'data-trap-focus-up': 'true' } : {},
  // ... repeat for down/left/right
};
```

---

## Debugging Checklist

### Enable Debug Logging

```javascript
// In DevTools console
window.__SPATIAL_NAV__.setDebugMode(true);

// Then perform navigation
// Watch console for [SpatialManager] log messages
```

### Check Focus State

```javascript
window.__SPATIAL_NAV__.getFocusState();
// Returns:
// {
//   isSpatialManagerReady: true,
//   currentFocus: HTMLElement,
//   focusStateMap: [
//     { container: "id", currentFocus: "btn", lastFocusedChild: "btn" },
//     ...
//   ]
// }
```

### Compare Focus Orders

```javascript
const container = document.getElementById('menu');
const state = window.__SPATIAL_NAV__.getFocusables(container);
console.log('Tree order:', state.tree.map(e => e.id));
console.log('Spatial order:', state.spatial.map(e => e.id));

// Difference indicates layout positioning
```

### Manual Focus Determination

```javascript
const container = document.getElementById('menu');
const element = window.__SPATIAL_NAV__.determineFocus(
  container,
  { isTVFocusGuide: false }
);
console.log('Would focus:', element.id);
```

### Check Focusability

```javascript
const element = document.getElementById('button');

// Visual check
element.style.border = '3px solid red';  // Mark element

// Check attributes
console.log('tabIndex:', element.tabIndex);
console.log('disabled:', element.disabled);
console.log('display:', window.getComputedStyle(element).display);
console.log('offsetParent:', element.offsetParent);
```

---

## Common Patterns

### Pattern 1: Initial Focus with hasTVPreferredFocus

```jsx
<TVFocusGuideView autoFocus>
  <Button>Option 1</Button>
  <Button hasTVPreferredFocus>Option 2 (FOCUSED)</Button>
  <Button>Option 3</Button>
</TVFocusGuideView>

// Result: Option 2 focused on mount (Level 1 priority)
```

### Pattern 2: Focus Memory

```jsx
<TVFocusGuideView autoFocus>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</TVFocusGuideView>

// User focuses Button 2
// User navigates away to another component
// User returns to TVFocusGuideView
// Result: Button 2 focused again (Level 3 memory)
```

### Pattern 3: Explicit Navigation

```jsx
<View tvFocusable>
  <Button id="up" nextFocusDown="center">Up</Button>
  <Button id="center" nextFocusUp="up" nextFocusDown="down">Center</Button>
  <Button id="down" nextFocusUp="center">Down</Button>
</View>

// User presses ArrowDown on "up"
// Result: Jumps to "center" (explicit nextFocusDown)
```

### Pattern 4: Modal Trapping

```jsx
<View tvFocusable trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
  <Text>Confirm action?</Text>
  <Button>Yes</Button>
  <Button>No</Button>
</View>

// User presses any arrow key
// Result: Focus stays within modal (trap blocks exit)
```

### Pattern 5: Tree Order (Normal View)

```jsx
// JSX order: Btn1, Btn2, Btn3
<View tvFocusable autoFocus>
  <Button style={{position: 'absolute', right: 0}}>Btn1</Button>
  <Button style={{position: 'absolute', left: 0}}>Btn2</Button>
  <Button style={{position: 'absolute', bottom: 0}}>Btn3</Button>
</View>

// Result: Btn1 focused initially (JSX tree order)
// NOT Btn2 (spatial/geometric would be different)
```

### Pattern 6: Spatial Order (TVFocusGuideView)

```jsx
// JSX order: TopLeft, TopRight
<TVFocusGuideView autoFocus>
  <Button style={{position: 'absolute', right: 0}}>TopRight</Button>
  <Button style={{position: 'absolute', left: 0}}>TopLeft</Button>
</TVFocusGuideView>

// Result: TopLeft focused initially (spatial/geometric)
// Even though it's second in JSX
```

---

## Performance Tips

### Optimize focusables discovery

```javascript
// ❌ Bad: Query every time
for (let i = 0; i < 1000; i++) {
  const focusables = getTreeOrderFocusables(container);
}

// ✅ Good: Cache result
const focusables = getCachedFocusables(container, 'tree');
// Next call within 1s returns cached version
```

### Minimize re-determinations

```javascript
// ❌ Bad: Call determineFocus every re-render
useEffect(() => {
  determineFocus(ref);
}, []);  // No deps, runs on every render

// ✅ Good: Only on autoFocus change
useEffect(() => {
  if (autoFocus) determineFocus(ref);
}, [autoFocus]);  // Only when autoFocus changes
```

### Batch DOM queries

```javascript
// ❌ Bad: Multiple queries
const treeOrder = getTreeOrderFocusables(container);
const spatialOrder = getSpatialOrderFocusables(container);

// ✅ Good: Single query, sort twice
const focusables = getFocusablesInContainer(container);
const treeOrder = sortByTreeOrder(focusables);
const spatialOrder = sortBySpatialOrder(focusables);
```

---

## Troubleshooting

### Focus not moving on arrow key

**Check**:
1. Is element focusable? → `isFocusable(element)` in console
2. Is container marked? → Check for `class="lrud-container"` or `tvfocusable`
3. Is direction trapped? → Check `data-block-exit-*` attributes
4. Is spatial nav setup? → Check `isSpatialManagerReady` in console

**Fix**:
```javascript
// Manually test navigation
const next = window.__SPATIAL_NAV__.getNextFocus(
  currentElement,
  'ArrowDown'
);
console.log('Next would be:', next);
```

### Wrong element focused initially

**Check**:
1. Is hasTVPreferredFocus set? → Highest priority, check it first
2. Is focus memory working? → Check `focusStateMap` state
3. Is tree/spatial order wrong? → Compare orders in console
4. Are hidden elements interfering? → Check visibility

**Fix**:
```javascript
const focus = window.__SPATIAL_NAV__.determineFocus(container);
console.log('Should focus:', focus.id);
```

### Memory usage growing

**Check**:
1. WeakMap cleanup working? → Remove and re-add element to test
2. focusCache clearing? → Check cache size over time
3. Circular references? → Review state structure

**Fix**:
```javascript
// Clear caches manually
window.__SPATIAL_NAV__.clearCaches();

// Check WeakMap entry count
const state = window.__SPATIAL_NAV__.getFocusState();
console.log('Active containers:', state.focusStateMap.length);
```

---

## References

- **SPATIALMANAGER_ENHANCEMENT_SPEC.md** - Full specification
- **SPATIALMANAGER_FLOWS_DIAGRAMS.md** - Visual flows
- **SPATIALMANAGER_LRUD_CONTRACT.md** - API contracts
- **SPATIALMANAGER_ORCHESTRATOR_ANALYSIS.md** - Detailed analysis
- **SPATIAL_NAVIGATION_PLAN.md** - Overall architecture
- **ANDROID_TV_TEST_SCENARIOS.md** - Test cases

---

**Quick Link**: Start with SPATIALMANAGER_ENHANCEMENT_SPEC.md → then this guide for coding

**Version**: 1.0  
**Status**: Ready for Implementation
