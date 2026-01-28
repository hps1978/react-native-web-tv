# Spatial Navigation Redesign Plan for Web TV

## Objective
Redesign spatial navigation for react-native-web-tv to follow **Android TV navigation semantics**, enabling developers to write React Native TV apps for Android TV and deploy them to web-based TV platforms (Samsung, LG, HiSense) with minimal configuration changes and identical navigation behavior.

## Current State Assessment

### Existing Implementation
- **SpatialManager**: Uses `@bbc/tv-lrud-spatial` for spatial navigation
  - Operates outside React tree via DOM APIs
  - Generates incremental IDs for unlabeled elements
  - Listens to arrow key events and computes next focus
  - Supports basic trapFocus blocking via `data-block-exit`

### Current Props Coverage
- `tvFocusable`: Marks container for spatial nav (adds `lrud-container` class)
- `hasTVPreferredFocus`: Highest priority initial focus flag
- `trapFocusUp/Down/Left/Right`: Direction-based focus blocking
- `autoFocus`: Auto-focus on mount
- `destinations`: Explicit focus redirection targets
- `nextFocusUp/Down/Left/Right`: Explicit next-focus specifications (defined but not implemented)

### Gaps vs. Android TV Model
1. **Initial Focus Selection**: Current model doesn't implement Android TV's tree-order fallback or proper spatial-vs-tree-order decision logic
2. **FocusGuide Behavior**: TVFocusGuideView doesn't fully implement collapsing/revealing behavior
3. **Explicit Navigation**: `nextFocus*` props are defined but not functionally implemented
4. **Focus Memory**: AutoFocus tracking exists but not fully integrated with spatial navigation
5. **Scoped Focus Management**: Trap focus works but doesn't properly scope FocusFinder to container boundaries
6. **Initial Focus Determination**: Missing proper sequencing (hasTVPreferredFocus → destinations → lastFocused → spatial first → tree first)

---

## Architecture Design

### 1. Enhanced Focus Model (Phased Implementation)

#### Phase 1: Core Focus Selection Algorithm
**Goal**: Implement Android TV's focus selection priority system

```
Priority Order for Setting Focus:
  1. hasTVPreferredFocus=true → Use that view (highest priority)
  2. destinations (TVFocusGuideView) → Redirect to first available
  3. autoFocus + lastFocusedElement → Restore if still mounted
  4. autoFocus + spatialFirstFocusable → Use spatial/geometric ordering
  5. treeFirstFocusable → Use JSX declaration order
  6. super.requestFocus() → Browser default
```

**Implementation Locations**:
- `SpatialManager/index.js`: Add `determineFocus()` function
- `View/index.js`: Call determineFocus during `useEffect` for autoFocus
- `TVFocusGuideView.js`: Implement focus determination sequence

#### Phase 2: Explicit Navigation (nextFocus* Props)
**Goal**: Allow developers to specify exact next-focus targets for each direction

```flow
nextFocusUp?: number | string      // Element ID or view ref
nextFocusDown?: number | string
nextFocusLeft?: number | string
nextFocusRight?: number | string
```

**How It Works**:
- When arrow key pressed and nextFocus[Direction] is set, jump directly to that element
- Bypass spatial algorithm entirely for that direction
- Falls back to spatial if target not found or not focusable

**Implementation Locations**:
- `SpatialManager/index.js`: Modify arrow key listener to check nextFocus* before calling getNextFocus
- `createDOMProps/index.js`: Forward nextFocus* props as data attributes
- `forwardedProps/index.js`: Add to tvViewProps

#### Phase 3: Spatial Ordering with Tree Fallback
**Goal**: Implement dual-mode focus ordering

```
Normal View (without TVFocusGuideView):
  ├─ On mount: Use tree order (JSX declaration order)
  └─ On arrow key: Use spatial order (geometric positioning)

TVFocusGuideView (with autoFocus):
  ├─ On mount: Use spatial order (geometric positioning)
  └─ On arrow key: Use spatial order
```

**Implementation Locations**:
- `SpatialManager/index.js`: Add `getTreeOrderFocusables()` function
- `SpatialManager/index.js`: Modify `setupSpatialNavigation()` to support tree-order discovery
- `View/index.js`: Use tree order for initial focus if not in TVFocusGuideView

#### Phase 4: Focus Guide Collapsing Behavior
**Goal**: Implement TVFocusGuideView as collapse/reveal container

```
Behavior:
  - When unfocused: Acts as single focus candidate (collapsed)
  - When focused: Reveals children and distributes focus (expanded)
  - Focus escape: Can trap or allow exit based on trapFocus*
```

**Implementation Locations**:
- `TVFocusGuideView.js`: Track internal focus state
- `SpatialManager/index.js`: Add container-aware focus logic
- `createDOMProps/index.js`: Set proper visibility for collapsing

---

## File-by-File Implementation Plan

### 1. SpatialManager (`src/modules/SpatialManager/index.js`)

**New Functions**:
```javascript
// Determine initial focus using priority order
determineFocus(container, options = {})
  → Returns: HTMLElement | null

// Get focusables in tree order (JSX declaration order)
getTreeOrderFocusables(container)
  → Returns: HTMLElement[]

// Get focusables in spatial order (geometric positioning)
getSpatialOrderFocusables(container)
  → Returns: HTMLElement[]

// Find focusable by ID or reference
findFocusableTarget(targetId, container)
  → Returns: HTMLElement | null

// Resolve next focus considering nextFocus* props
resolveNextFocus(currentFocus, direction, container)
  → Returns: HTMLElement | null

// Check if element should trap focus in direction
shouldTrapFocus(element, direction)
  → Returns: boolean
```

**Modifications**:
- Arrow key listener: Call `resolveNextFocus()` before `getNextFocus()`
- Container setup: Use `determineFocus()` for initial focus
- Track focus state: Maintain map of container → lastFocusedChild

### 2. TVFocusGuideView (`src/exports/TV/TVFocusGuideView.js`)

**Type Updates**:
```flow
type TVFocusGuideViewProps = {
  enabled?: boolean,
  destinations?: ComponentOrHandleType[],
  autoFocus?: boolean,
  trapFocusUp?: boolean,
  trapFocusDown?: boolean,
  trapFocusLeft?: boolean,
  trapFocusRight?: boolean,
  focusable?: boolean,
  hasTVPreferredFocus?: boolean,        // ADD: highest priority
  collapsable?: boolean,                // ADD: collapse/reveal behavior
  onFocusChanged?: (focused: boolean) => void  // ADD: callback on focus change
}
```

**Implementation Changes**:
- Implement `hasTVPreferredFocus` handling
- Add collapse/reveal CSS visibility logic
- Track internal focus state
- Implement focus memory (lastFocusedChild)
- Coordinate with SpatialManager for proper sequencing

### 3. View Props Types (`src/exports/TV/types.js`)

**Add Missing Props**:
```flow
// Already defined but not implemented:
nextFocusUp?: ?number,
nextFocusDown?: ?number,
nextFocusLeft?: ?number,
nextFocusRight?: ?number,

// Add new props:
hasTVPreferredFocus?: ?boolean,
onFocusChanged?: ?(focused: boolean) => void,
```

### 4. createDOMProps (`src/modules/createDOMProps/index.js`)

**Changes**:
- Forward `nextFocus*` props to DOM as `data-next-focus-*` attributes
- Forward `hasTVPreferredFocus` as `data-tv-preferred-focus`
- Forward `onFocusChanged` callback setup (via imperative handle)
- Ensure `data-autofocus` properly reflects initial focus intent

### 5. forwardedProps (`src/modules/forwardedProps/index.js`)

**Add to tvViewProps**:
```javascript
export const tvViewProps = {
  // ... existing props
  hasTVPreferredFocus: true,
  nextFocusUp: true,
  nextFocusDown: true,
  nextFocusLeft: true,
  nextFocusRight: true,
  onFocusChanged: true
};
```

### 6. View Component (`src/exports/View/index.js`)

**Changes**:
- Call `determineFocus()` during `useEffect` when autoFocus is true
- Handle `hasTVPreferredFocus` with immediate focus if in TVFocusGuideView
- Track and restore focus via `onFocusChanged` callback

---

## Data Structures & State Management

### FocusContext (New)
```javascript
// Track per-container focus state
const focusStateMap = Map<HTMLElement, {
  currentFocus: HTMLElement | null,
  lastFocusedChild: HTMLElement | null,
  isFocusGuide: boolean,
  trapFocusDirections: Set<'up' | 'down' | 'left' | 'right'>,
  focusMemory: WeakMap<HTMLElement, HTMLElement>  // container → lastChild
}>
```

### Focus Resolution Cache
```javascript
// Cache focus search results to minimize DOM traversals
const focusCache = Map<string, {
  timestamp: number,
  focusables: HTMLElement[],
  order: 'tree' | 'spatial'
}>
```

---

## Implementation Sequencing

### Week 1: Foundation
- [ ] Review @bbc/tv-lrud-spatial API deeply
- [ ] Create SpatialManager test suite with Android TV test cases
- [ ] Implement `determineFocus()` with all priority levels
- [ ] Add `getTreeOrderFocusables()` function

### Week 2: Explicit Navigation
- [ ] Implement `nextFocus*` prop handling in SpatialManager
- [ ] Update createDOMProps to forward nextFocus props
- [ ] Add tests for explicit navigation paths
- [ ] Verify behavior doesn't conflict with spatial navigation

### Week 3: Focus Guide Enhancement
- [ ] Implement `hasTVPreferredFocus` in TVFocusGuideView
- [ ] Add collapse/reveal behavior
- [ ] Implement focus memory (lastFocusedChild)
- [ ] Add focus state callbacks (`onFocusChanged`)

### Week 4: Integration & Testing
- [ ] Create comprehensive test suite for Android TV scenarios
- [ ] Build example app demonstrating all features
- [ ] Test on actual Samsung/LG/HiSense TV hardware simulators
- [ ] Documentation and migration guide

---

## Testing Strategy

### Unit Tests (Jest)
```javascript
// tests/SpatialManager.test.js
describe('SpatialManager', () => {
  describe('determineFocus', () => {
    it('prioritizes hasTVPreferredFocus over all else', () => {})
    it('uses destinations if set', () => {})
    it('restores lastFocusedChild if available', () => {})
    it('falls back to spatial first focusable', () => {})
    it('falls back to tree first focusable', () => {})
  })
  
  describe('nextFocus navigation', () => {
    it('jumps to nextFocusUp target if set', () => {})
    it('falls back to spatial if nextFocusUp not found', () => {})
    it('skips trapFocus boundaries', () => {})
  })
})

// tests/TVFocusGuideView.test.js
describe('TVFocusGuideView', () => {
  it('collapses when not focused', () => {})
  it('reveals children when focused', () => {})
  it('respects hasTVPreferredFocus from children', () => {})
  it('restores focus memory on re-focus', () => {})
})
```

### Integration Tests
```javascript
// tests/AndroidTVCompat.test.js
describe('Android TV Compatibility', () => {
  describe('Navigation Rules', () => {
    it('matches Android TV behavior for grid layout', () => {})
    it('matches Android TV behavior for list layout', () => {})
    it('matches Android TV behavior with nested focus guides', () => {})
  })
})
```

### E2E Tests with Example App
- Build demo app with common patterns (grid, list, nested containers)
- Record navigation traces and compare against expected paths
- Test on TV simulator / hardware

---

## Backward Compatibility

### Non-Breaking Changes
- All new props are optional (`?`)
- Existing `tvFocusable` behavior unchanged
- `trapFocus*` behavior enhanced but compatible
- Existing apps continue to work

### Migration Path for Developers
```javascript
// Old style (still works)
<TVFocusGuideView destinations={[ref1, ref2]} />

// New style (explicit navigation)
<View
  tvFocusable
  nextFocusUp={upTargetId}
  nextFocusDown={downTargetId}
  hasTVPreferredFocus
/>
```

---

## Success Criteria

1. **Feature Parity with Android TV**
   - Initial focus selection follows Android TV priority order ✓
   - Spatial navigation matches Android spatial algorithm ✓
   - Tree order fallback works correctly ✓
   - Focus trapping respects Android TV scoping rules ✓

2. **Developer Experience**
   - Developers can write once for Android TV + web TV ✓
   - Minimal configuration needed ✓
   - Clear error messages for focus issues ✓
   - Documentation with examples ✓

3. **Performance**
   - Focus search < 16ms (60fps) ✓
   - No memory leaks from focus tracking ✓
   - Focus cache effective for repeated navigation ✓

4. **Testing & Quality**
   - 90%+ code coverage ✓
   - All unit tests passing ✓
   - Integration tests with example app ✓
   - Hardware testing on Samsung/LG/HiSense ✓

---

## Open Questions & Decisions

1. **Focus Indicator Styling**: Should web TV apps use custom focus indicators or browser defaults?
   - *Decision*: Custom CSS via `.lrud-focused` class for consistency

2. **Focus Events**: What events should components listen to?
   - *Decision*: Use `onFocusChanged` callback + focus/blur DOM events

3. **Async Initial Focus**: Should determining initial focus support async operations?
   - *Decision*: No, keep synchronous for simplicity. Can be added later if needed.

4. **Nested TVFocusGuideView**: How do multiple levels of focus guides behave?
   - *Decision*: Inner guides take priority, focus respects nesting hierarchy

5. **Reference Resolution**: How should `nextFocus*` props resolve element references?
   - *Decision*: By ID string. If using refs, convert to ID in component.

---

## Risk Assessment & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|-----------|
| @bbc/tv-lrud-spatial API limitations | Medium | High | Early integration testing, fallback algorithm |
| Performance issues with large DOM | Medium | Medium | Implement focus cache, lazy evaluation |
| TV platform differences | High | Medium | Create platform-specific configs |
| Breaking existing apps | Low | High | Thorough backward compatibility testing |
| Developer confusion on proper usage | Medium | Medium | Comprehensive documentation + examples |

---

## References

- Android TV Focus Documentation: https://developer.android.com/training/tv/start/navigation
- React Native TV OS Implementation: https://github.com/react-native-tvos/react-native-tvos
- BBC LRUD Spatial Library: https://github.com/bbc/lrud-spatial
- W3C Spatial Navigation: https://drafts.csswg.org/mediaqueries-5/#spatial-navigation

---

## Next Steps

1. **Review & Approval**: Present this plan to team for feedback
2. **Create Epic & User Stories**: Break into Jira/GitHub issues
3. **Setup Development Branch**: Create `feat/spatial-nav-redesign` branch
4. **Begin Phase 1**: Start with SpatialManager foundation
