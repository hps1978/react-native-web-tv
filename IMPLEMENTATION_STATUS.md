# Spatial Navigation Implementation Status

## Current Date
January 25, 2026

## Status Overview

| Component | Current | Target | Progress | Notes |
|-----------|---------|--------|----------|-------|
| SpatialManager | Basic | Feature-rich | 35% | lrud updated with destinations/autoFocus memory/priority; nextFocus* + React-tree integration still pending |
| Focus Selection | Partial | Full Android TV semantics | 50% | lrud covers destinations + autofocus + lastFocused; React tree order and View-level init still missing |
| Explicit Navigation | Defined | Implemented | 5% | nextFocus* props defined but not functional |
| Focus Trapping | Partial | Full scoped trapping | 60% | trapFocus works via data-block-exit attributes |
| TVFocusGuideView | Basic | Full collapsing behavior | 40% | destinations work, missing focus memory & reveal logic |
| Focus Memory | Planned | Implemented | 40% | lrud now restores data-focus in containers; SpatialManager/View wiring not complete |
| Tests | None | Comprehensive | 0% | 10+ scenarios planned |

---

## Planning Documents Created

### 1. **SPATIAL_NAVIGATION_PLAN.md** (Core Strategy)
- Complete architecture redesign plan
- 4-phase implementation approach
- File-by-file implementation details
- 4-week development timeline
- Risk assessment & mitigation

**Key Sections**:
- ✅ Current state assessment
- ✅ Architecture design with focus model
- ✅ Data structures & state management
- ✅ Implementation sequencing
- ✅ Backward compatibility strategy
- ✅ Success criteria

**Use This To**:
- Understand the big picture
- Plan development sprints
- Make architectural decisions
- Estimate resource allocation

---

### 2. **ANDROID_TV_TEST_SCENARIOS.md** (Validation Framework)
- 10 detailed test scenarios covering all navigation patterns
- Each scenario includes:
  - Expected behavior (iOS/Android TV reference)
  - Jest test code (copy-paste ready)
  - Common pitfalls
  - Debugging tips

**Scenarios**:
1. Simple Button Row (Linear horizontal)
2. Grid Layout (2D spatial)
3. Initial Focus Priority (hasTVPreferredFocus)
4. Focus Memory (autoFocus restoration)
5. Explicit Navigation (nextFocus* props)
6. Trap Focus (Direction blocking)
7. Nested TVFocusGuideView
8. Destinations Override
9. Spatial vs Tree Order
10. Complex Real-world App

**Use This To**:
- Validate implementation against Android TV behavior
- Create regression tests
- Debug navigation issues
- Train team on expected behavior

---

### 3. **TV_NAVIGATION_API_REFERENCE.md** (Developer Guide)
- Complete API documentation for end users
- Props reference with examples
- 7 common layout patterns with code
- Troubleshooting guide
- Performance optimization tips
- Migration guide from React Native TV OS

**Use This To**:
- Document the public API
- Provide examples to developers
- Guide troubleshooting
- Support migration from TVOS

---

## Quick Reference: What Needs Implementation

### Phase 1: Foundation (Week 1)
**Files to Modify**:
- `src/modules/SpatialManager/index.js` (60% of code)
  - Add `determineFocus()` function
  - Add `getTreeOrderFocusables()` function
  - Refactor focus initialization
  
**New Code Estimate**: 300-400 lines

**Tests Needed**: Basic focus selection, tree vs spatial ordering

---

### Phase 2: Explicit Navigation (Week 2)
**Files to Modify**:
- `src/modules/SpatialManager/index.js` (50 lines)
  - Add `resolveNextFocus()` function
  - Check nextFocus* before spatial fallback
- `src/modules/createDOMProps/index.js` (20 lines)
  - Forward nextFocus* as data attributes
- `src/modules/forwardedProps/index.js` (5 lines)
  - Add nextFocus* to tvViewProps

**New Code Estimate**: 75-100 lines

**Tests Needed**: Explicit navigation paths, fallback behavior

---

### Phase 3: Focus Guide Enhancement (Week 3)
**Files to Modify**:
- `src/exports/TV/TVFocusGuideView.js` (80 lines)
  - Add hasTVPreferredFocus handling
  - Implement collapse/reveal behavior
  - Track lastFocusedChild
- `src/exports/View/index.js` (20 lines)
  - Call determineFocus during useEffect

**New Code Estimate**: 100 lines

**Tests Needed**: Focus memory, hasTVPreferredFocus, nested guides

---

### Phase 4: Integration & Testing (Week 4)
**Deliverables**:
- Complete test suite (10 main scenarios + edge cases)
- Example app demonstrating all features
- Documentation updates
- Backward compatibility verification

---

## Architecture Summary

### Focus Selection Priority (Android TV Model)

```
┌─────────────────────────────────────────┐
│ Focus Selection Priority (Highest First) │
├─────────────────────────────────────────┤
│ 1. hasTVPreferredFocus=true             │  ⭐ Highest priority
│ 2. destinations (TVFocusGuideView)      │
│ 3. autoFocus + lastFocusedChild         │  Focus memory
│ 4. autoFocus + spatialFirstFocusable    │  Geometric ordering
│ 5. treeFirstFocusable (normal View)     │  JSX declaration order
│ 6. browser default focus                │  Fallback
└─────────────────────────────────────────┘
```

### Key Differences: Normal View vs TVFocusGuideView

```
Normal View (without TVFocusGuideView):
  └─ Initial Focus: Tree order (JSX declaration)
  └─ Subsequent Navigation: Spatial order (geometric positioning)

TVFocusGuideView (with autoFocus):
  └─ Initial Focus: Spatial order (geometric positioning)
  └─ Subsequent Navigation: Spatial order
  └─ Focus Memory: Restore lastFocusedChild on re-focus
```

---

## Critical Implementation Details

### 1. Tree Order Discovery
Need algorithm to traverse React tree in JSX declaration order:
```javascript
function getTreeOrderFocusables(container) {
  // Depth-first traversal following React tree structure
  // NOT DOM tree (different order!)
  // Return focusables in JSX order
}
```

**Why This Matters**: React tree order ≠ DOM tree order due to Fragments, conditional rendering, etc.

---

### 2. Spatial Ordering with LRUD
The `@bbc/tv-lrud-spatial` library provides:
```javascript
getNextFocus(currentFocus, direction, scope)
```

But we need to:
- Set it up correctly on first navigation (not component render)
- Create IDs for unlabeled elements (already done)
- Handle focus outside tree (DOM-based)
- Cache results for performance

---

### 3. Focus Memory Implementation
Track which child was last focused:
```javascript
const focusMemory = new WeakMap<HTMLElement, HTMLElement>();
// container → lastFocusedChild

// On child focus: focusMemory.set(container, child)
// On container re-focus: get child from focusMemory
```

**Why WeakMap**: Auto-cleanup when elements are removed

---

### 4. Trap Focus Scoping
Current implementation uses `data-block-exit` attribute. Need to:
- Verify @bbc/tv-lrud-spatial respects this
- Test all 4 directions individually
- Test combinations (trapFocusUp + trapFocusRight)
- Ensure child navigation still works

---

## State Management Approach

### Option A: Module-level State (Current)
```javascript
// SpatialManager/index.js
let currentFocus = null;
let isSpatialManagerReady = false;
```

**Pros**: Simple, minimal overhead
**Cons**: Single global state, harder to debug

### Option B: React Context (Recommended)
```javascript
<FocusProvider>
  <App />
</FocusProvider>

// Access focus state from any component
const { currentFocus, setFocus } = useFocusContext();
```

**Pros**: Testable, debuggable, works with React
**Cons**: More overhead

---

## External Dependencies

### Current
- `@bbc/tv-lrud-spatial`: Spatial navigation algorithm
- `react`: ^18.0 || ^19.0

### Potential Additions
- `react-window` or `react-virtualized`: For large lists (optional)
- `performance-observer`: For perf monitoring (optional)
- `@testing-library/react`: For testing (dev)

---

## Browser Compatibility

### Required
- ✅ Chrome 49+
- ✅ Firefox 91+
- ✅ Safari 10+
- ✅ Edge 94+

### TV Platform Specific
- Samsung SmartTV (Tizen OS)
- LG SmartTV (webOS)
- HiSense (Android TV based)

---

## Rollout Strategy

### Pre-Release (Internal Testing)
1. Build on master branch (non-breaking changes only)
2. Test with internal TV emulators
3. Get feedback from team

### Beta Release
1. Publish as `@beta` tag on npm
2. Request external developer feedback
3. Iterate based on real-world usage

### GA Release
1. Full documentation
2. Migration guide
3. Announcement
4. Version bump to 0.22.x

---

## Success Metrics

### Code Quality
- ✅ 90%+ test coverage (critical paths)
- ✅ No breaking changes to existing apps
- ✅ Zero memory leaks (focus tracking)
- ✅ < 100ms focus search (16fps @ 4k)

### Developer Experience
- ✅ Developers can copy Android TV code → web with no changes
- ✅ Common patterns require < 5 lines of code
- ✅ Clear error messages for focus issues
- ✅ Working examples for all patterns

### Platform Coverage
- ✅ Samsung TV (2018+)
- ✅ LG TV (2019+)
- ✅ HiSense TV (2020+)
- ✅ Web browsers (all supporting TV nav)

---

## Team Collaboration

### Roles Needed
1. **Architect** (1): Design decisions, @bbc/tv-lrud-spatial expertise
2. **Core Dev** (1): SpatialManager implementation
3. **Component Dev** (1): View/TVFocusGuideView updates
4. **QA** (1): Test suite, TV hardware testing
5. **Docs** (1): API reference, examples, migration guide

### Knowledge Transfer
1. This planning document (overview)
2. Android TV navigation deep-dive (external resources)
3. Code review process for architecture
4. Weekly sync on progress & blockers

---

## Open Decisions

| Question | Options | Current | Owner |
|----------|---------|---------|-------|
| Tree order discovery | Traverse React tree vs DOM tree | Undecided | Architect |
| Focus state mgmt | Module state vs React Context | Module state (for now) | Core Dev |
| Performance monitoring | Enable by default or opt-in | Opt-in | Core Dev |
| Backward compat | Strict (no breaking changes) or relaxed | Strict | Architect |
| nextFocus* API | String IDs or refs | String IDs | API Design |

---

## Resources

### Documentation
- [Android TV Focus Training](https://developer.android.com/training/tv/start/navigation)
- [React Native TV OS Docs](https://github.com/react-native-tvos/react-native-tvos)
- [BBC LRUD Spatial Repo](https://github.com/bbc/lrud-spatial)
- [W3C Spatial Navigation](https://drafts.csswg.org/mediaqueries-5/)

### Code References
- `src/modules/SpatialManager/index.js` - Current implementation
- `src/exports/TV/TVFocusGuideView.js` - Focus guide
- `src/modules/createDOMProps/index.js` - DOM attribute forwarding
- Test files (to be created)

---

## Next Steps (Immediate)

- [ ] **Review & Approval**: Get sign-off on this plan
- [ ] **Spike**: Investigate @bbc/tv-lrud-spatial API limitations
- [ ] **Create Tickets**: Break plan into Jira/GitHub issues
- [ ] **Setup Branch**: `feat/spatial-nav-redesign`
- [ ] **Start Phase 1**: SpatialManager foundation

---

## Questions & Feedback

Please provide feedback on:
1. Is the architecture sound?
2. Any concerns with the phased approach?
3. Do we need additional test scenarios?
4. Should we add React Context for state management?
5. Any platform-specific concerns?

---

*Document Version: 1.0*  
*Last Updated: January 24, 2026*  
*Status: Ready for Implementation*
