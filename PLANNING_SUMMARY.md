# Spatial Navigation Planning - Executive Summary

**Date**: January 24, 2026  
**Status**: Planning Phase Complete ✅  
**Next Step**: Stakeholder Review & Approval

---

## Objective

Enable developers to **write React Native TV apps for Android TV and deploy them to web-based TV platforms (Samsung, LG, HiSense) with minimal configuration**, ensuring **identical navigation behavior** across all platforms.

---

## Current State

### What Works
- ✅ Basic spatial navigation via `@bbc/tv-lrud-spatial` library
- ✅ Focus trapping with `trapFocus*` props
- ✅ TVFocusGuideView with destinations
- ✅ Arrow key event handling

### What's Missing
- ⚠️ Android TV focus selection priority system (core logic now in `lrud.js`, pending React tree-aware integration)
- ❌ Tree order fallback for initial focus (still needs React tree discovery)
- ❌ Explicit navigation via `nextFocus*` props (defined but not implemented)
- ⚠️ Focus memory (lrud handles `data-focus` restore; needs View/SpatialManager wiring)
- ⚠️ Spatial vs tree order decision logic (lrud spatial path present; JSX tree ordering still missing)
- ❌ Comprehensive test suite

---

## Proposed Solution

### Three-Document Planning Framework

#### 1. **SPATIAL_NAVIGATION_PLAN.md** (17 pages)
The technical blueprint covering:
- Current state assessment with gaps analysis
- Complete architecture redesign with 4 phases
- File-by-file implementation details
- New functions, data structures, and APIs
- 4-week development timeline
- Risk assessment and mitigation strategies

**Key Innovation**: Implements Android TV's priority-based focus selection:
1. `hasTVPreferredFocus` (highest priority)
2. Explicit destinations
3. Focus memory + spatial ordering
4. Tree order fallback
5. Browser default

---

#### 2. **ANDROID_TV_TEST_SCENARIOS.md** (15 pages)
Validation framework with 10 comprehensive test scenarios:

| # | Scenario | Pattern | Priority |
|---|----------|---------|----------|
| 1 | Button Row | Linear horizontal nav | P0 |
| 2 | Grid | 2D spatial nav | P0 |
| 3 | hasTVPreferredFocus | Initial focus priority | P0 |
| 4 | Focus Memory | autoFocus restoration | P1 |
| 5 | nextFocus* | Explicit navigation | P1 |
| 6 | Trap Focus | Direction blocking | P1 |
| 7 | Nested Guides | Complex hierarchy | P2 |
| 8 | Destinations | Focus redirection | P2 |
| 9 | Spatial vs Tree | Order selection | P1 |
| 10 | Real-world App | Integration | P3 |

**Each scenario includes**:
- Expected behavior with ASCII layout
- Jest test code (copy-paste ready)
- Implementation validation approach

---

#### 3. **TV_NAVIGATION_API_REFERENCE.md** (12 pages)
Developer-facing API documentation:
- Complete prop reference with examples
- 7 layout patterns (linear, grid, nested, modal, etc.)
- Troubleshooting guide
- Performance optimization tips
- Migration path from React Native TV OS

**Key Props**:
- `tvFocusable`: Container marker
- `hasTVPreferredFocus`: Highest priority focus
- `autoFocus`: Auto-focus with memory
- `nextFocusUp/Down/Left/Right`: Explicit navigation
- `trapFocusUp/Down/Left/Right`: Direction blocking

---

### Supporting Documents

#### **IMPLEMENTATION_STATUS.md** (9 pages)
- Detailed progress tracking table
- Phase breakdown with effort estimates
- Architecture summary with diagrams
- Critical implementation details
- Team roles and collaboration plan
- Open decisions requiring stakeholder input

#### **.github/copilot-instructions.md** (Updated)
- Integrated planning references
- Focus selection priority model
- Key files and their roles
- Links to all planning documents

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal**: Core focus selection algorithm
- Add `determineFocus()` function implementing priority system
- Add `getTreeOrderFocusables()` for JSX order discovery
- ~300-400 lines of new code
- Focus: SpatialManager module

### Phase 2: Explicit Navigation (Week 2)
**Goal**: `nextFocus*` props support
- Implement `resolveNextFocus()` function
- Forward props as DOM attributes
- ~75-100 lines of new code
- Files: SpatialManager, createDOMProps, forwardedProps

### Phase 3: Focus Guide Enhancement (Week 3)
**Goal**: Focus memory and hasTVPreferredFocus
- Implement lastFocusedChild tracking
- Add collapse/reveal behavior
- ~100 lines of new code
- Files: TVFocusGuideView, View

### Phase 4: Integration & Testing (Week 4)
**Goal**: Validation and documentation
- Complete test suite (10 scenarios + edge cases)
- Example app with all patterns
- Documentation finalization

---

## Key Technical Decisions

### 1. Focus Selection Priority ✅
Follows Android TV model strictly:
```
hasTVPreferredFocus > destinations > autoFocus+lastFocused > spatial > tree > default
```

### 2. Spatial vs Tree Order ✅
- **Normal View**: Tree order (JSX) for initial, spatial for navigation
- **TVFocusGuideView**: Spatial order for both

### 3. Backward Compatibility ✅
- All new props are optional
- Existing apps continue to work unchanged
- No breaking changes required

### 4. State Management 🔄
- **Current**: Module-level global state
- **Recommended**: React Context (more testable)
- **Decision**: Start with module state, migrate to Context if needed

### 5. Explicit Navigation Targets 🔄
- **Approach**: String IDs (not refs)
- **Resolution**: Match target element by `id` attribute
- **Fallback**: Use spatial if target not found

---

## Resource Requirements

### Team Size: ~5 people
- **Architect** (1): Design, @bbc/tv-lrud-spatial expertise
- **Core Dev** (1): SpatialManager implementation
- **Component Dev** (1): View/TVFocusGuideView updates
- **QA** (1): Tests, TV hardware validation
- **Docs** (1): API docs, examples, migration guide

### Timeline: 4 weeks
- Week 1: Foundation
- Week 2: Explicit navigation
- Week 3: Focus guide enhancement
- Week 4: Integration & testing

### External Dependencies
- `@bbc/tv-lrud-spatial` (already included)
- Jest + React Testing Library (already in place)
- TV simulator access (optional, for validation)

---

## Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|-----------|
| @bbc/tv-lrud-spatial API limitations | Medium | High | Early integration testing, fallback algorithm |
| Performance issues with large DOM | Medium | Medium | Focus cache, lazy evaluation, profiling |
| TV platform differences | High | Medium | Platform-specific config, hardware testing |
| Breaking existing apps | Low | High | Thorough backward compat testing |
| Developer confusion on usage | Medium | Medium | Clear docs, working examples, patterns |

---

## Success Metrics

### Functional Completeness
- ✅ Focus selection matches Android TV behavior 100%
- ✅ All 10 test scenarios pass
- ✅ Zero regressions in existing functionality

### Code Quality
- ✅ 90%+ test coverage (critical paths)
- ✅ < 100ms focus search (60fps capable)
- ✅ Zero memory leaks in focus tracking
- ✅ No breaking changes

### Developer Experience
- ✅ Developers can copy Android TV code → web unchanged
- ✅ Common patterns require < 5 lines
- ✅ Clear error messages for misconfigurations
- ✅ Comprehensive documentation with examples

### Platform Coverage
- ✅ Samsung TV (Tizen 2018+)
- ✅ LG TV (webOS 2019+)
- ✅ HiSense TV (2020+)
- ✅ Web browsers (all modern)

---

## Comparison: Before vs After

### Before (Current)
```javascript
// Complex workarounds needed
<View tvFocusable>
  <Button /* focus behavior uncertain */ />
  <Button /* manual routing required */ />
</View>
```

### After (Proposed)
```javascript
// Android TV code works on web TV
<View tvFocusable>
  <Button hasTVPreferredFocus onPress={...} />
  <Button 
    nextFocusUp="up-button"
    nextFocusDown="down-button"
    onPress={...}
  />
</View>

// Focus "just works" - same as Android TV!
```

---

## Stakeholder Review Checklist

- [ ] **Architecture**: Is the priority system sound?
- [ ] **Phasing**: Does 4-week timeline work?
- [ ] **Scope**: Should we defer any phases?
- [ ] **Resources**: Can we allocate team?
- [ ] **Risks**: Are mitigations adequate?
- [ ] **Decisions**: Approve open decisions?
- [ ] **Timeline**: Ready to start Week 1?

---

## Next Steps

### Immediate (This Week)
1. ✅ Planning documents created (DONE)
2. ⏳ **Present to stakeholders** (In Progress)
3. ⏳ **Get approval** (Next)

### Week of Jan 27
4. Spike investigation: @bbc/tv-lrud-spatial API
5. Create GitHub issues / Jira tickets from plan
6. Create `feat/spatial-nav-redesign` branch

### Week of Feb 3 (Begin Phase 1)
7. Start SpatialManager implementation
8. Create test fixtures
9. Begin integration

---

## Questions for Stakeholders

1. **Timeline**: Can we commit 4 weeks and 5 people?
2. **Platforms**: Are Samsung/LG/HiSense our priority targets?
3. **State Management**: Module state or React Context?
4. **Browser Support**: Any < ES6 support needed?
5. **Rollout**: Beta period before GA release?
6. **Docs**: Who owns developer documentation?

---

## Document Navigation

All planning documents are stored in the repo root:

```
SPATIAL_NAVIGATION_PLAN.md          ← Main architecture
ANDROID_TV_TEST_SCENARIOS.md        ← Validation framework
TV_NAVIGATION_API_REFERENCE.md      ← Developer guide
IMPLEMENTATION_STATUS.md             ← Progress tracking
.github/copilot-instructions.md     ← AI agent knowledge base
```

**Start here**: [SPATIAL_NAVIGATION_PLAN.md](SPATIAL_NAVIGATION_PLAN.md)

---

## Contact & Support

- **Questions**: Comment on planning document
- **Architecture Decisions**: Tag @architect
- **Implementation Help**: Tag @core-dev
- **Test Coverage**: Tag @qa
- **Documentation**: Tag @docs

---

*Planning Phase Complete*  
*Ready for Stakeholder Review*  
*Target Start Date: February 3, 2026*
