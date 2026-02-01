# Architecture Diagrams & Visual Reference

## 1. Focus Selection Priority Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  FOCUS DETERMINATION ALGORITHM                │
└──────────────────────────────────────────────────────────────┘

                        START
                          │
                          ▼
              ┌─────────────────────────┐
              │ hasTVPreferredFocus=true?│
              └────────┬────────────────┘
                       │ YES
                       ▼
              ┌─────────────────────────┐
              │  Focus That Element     │  ⭐⭐⭐⭐⭐ HIGHEST PRIORITY
              │      (END)              │
              └─────────────────────────┘
                       │ NO
                       ▼
              ┌─────────────────────────┐
              │ destinations set?       │
              └────────┬────────────────┘
                       │ YES
                       ▼
              ┌─────────────────────────┐
              │ Focus first destination │  ⭐⭐⭐⭐ 
              │      (END)              │
              └─────────────────────────┘
                       │ NO
                       ▼
              ┌─────────────────────────┐
              │ autoFocus=true?         │
              └────────┬────────────────┘
                       │ YES
                       ▼
              ┌─────────────────────────┐
              │ lastFocusedChild exists?│
              └────────┬────────────────┘
                       │ YES
                       ▼
              ┌─────────────────────────┐
              │ Restore lastFocusChild  │  ⭐⭐⭐ Focus Memory
              │      (END)              │
              └─────────────────────────┘
                       │ NO
                       ▼
              ┌─────────────────────────┐
              │ In TVFocusGuideView?    │
              └────────┬────────────────┘
           YES         │         NO
              │        │        │
              ▼        ▼        ▼
         ┌────────┐ ┌─────────────────┐
         │ Spatial│ │ Tree Order      │
         │ First  │ │ First           │  ⭐ Tree as fallback
         └────────┘ └─────────────────┘
              │        │
              └────┬───┘
                   ▼
        ┌───────────────────────┐
        │ Focus That Element    │
        │      (END)            │
        └───────────────────────┘
```

---

## 2. Navigation Flow: Arrow Key Handling

```
┌──────────────────────────────────────────────────────────────┐
│              ARROW KEY EVENT HANDLING FLOW                     │
└──────────────────────────────────────────────────────────────┘

KeyDown Event (Arrow Key)
          │
          ▼
┌──────────────────────────────┐
│ Is it Arrow Up/Down/Left/Right?
└───────┬──────────────────────┘
        │ YES
        ▼
┌──────────────────────────────┐
│ Get currentFocus element     │
└───────┬──────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ nextFocus[Direction] set?    │
└───────┬──────────────────────┘
        │ YES
        ▼
┌──────────────────────────────┐
│ Find target by ID            │
└───────┬──────────────────────┘
        │ FOUND & FOCUSABLE
        ▼
┌──────────────────────────────┐
│ Focus target (END)           │
└──────────────────────────────┘
        │ NOT FOUND
        │
        ▼
┌──────────────────────────────┐
│ Use spatial algorithm        │  Falls back to spatial
└───────┬──────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ getNextFocus(              │
│   currentFocus,            │
│   direction,               │
│   container                │
│ )                          │
└───────┬──────────────────────┘
        │ RESULT
        ▼
┌──────────────────────────────┐
│ trapFocus[Direction]?        │
└───────┬──────────────────────┘
        │ YES (BLOCKED)
        ▼
┌──────────────────────────────┐
│ Stay in currentFocus (END)   │
└──────────────────────────────┘
        │ NO (ALLOWED)
        │
        ▼
┌──────────────────────────────┐
│ Focus next element (END)     │
└──────────────────────────────┘
```

---

## 3. Component Hierarchy: Normal View vs TVFocusGuideView

### Normal View (Linear Behavior)
```
View (tvFocusable)
├─ Button (tree order: 1st)  ← Initial focus (tree order)
├─ Button (tree order: 2nd)
└─ Button (tree order: 3rd)

Navigation: ← → between buttons (spatial order after initial)
```

### TVFocusGuideView (Spatial Behavior)
```
TVFocusGuideView (autoFocus + tvFocusable)
├─ Button (tree order: 1st, spatial: 3rd)
├─ Button (tree order: 2nd, spatial: 2nd)
└─ Button (tree order: 3rd, spatial: 1st)  ← Initial focus (spatial order)

Navigation: ← → between buttons (spatial order)
Focus Memory: Restores previously focused button on re-focus
```

---

## 4. TVFocusGuideView State Transitions

```
┌──────────────────────────────────────┐
│  TVFocusGuideView State Machine      │
└──────────────────────────────────────┘

         ┌─────────────────┐
         │   NOT FOCUSED   │
         │  (Collapsed)    │
         └────────┬────────┘
                  │
                  │ User navigates to this view
                  │
                  ▼
         ┌─────────────────┐
         │    FOCUSED      │
         │   (Expanded)    │◄────────────┐
         │   Shows child   │             │
         │   focus guide   │             │
         └────────┬────────┘             │
                  │                      │
                  │ User navigates      │
                  │ within children     │
                  │                    │
                  ▼                    │
         ┌─────────────────┐           │
         │ CHILD FOCUSED   │           │
         │ (autoFocus=true)│           │
         │ Saves child ref │           │
         └────────┬────────┘           │
                  │                    │
                  │ Focus leaves       │
                  │ this container     │
                  │                    │
                  ▼                    │
         ┌─────────────────┐           │
         │  NOT FOCUSED    │─────────► │ 
         │ Remember child  │    Re-focus
         │ (focus memory)  │ (restore child)
         └─────────────────┘
```

---

## 5. Spatial Navigation Algorithm (Simplified)

```
┌────────────────────────────────────────┐
│  Spatial Navigation Search (LRUD)      │
│  Using @bbc/tv-lrud-spatial library    │
└────────────────────────────────────────┘

INPUT:
  - currentFocus: Element (current focused element)
  - direction: 'up' | 'down' | 'left' | 'right'
  - scope: HTMLElement (search within this container)

ALGORITHM:
  1. Get position of currentFocus (x, y, width, height)
  2. Get all focusable candidates within scope
  3. Filter candidates in requested direction
     up:    elements above currentFocus (y < currentFocus.y)
     down:  elements below currentFocus (y > currentFocus.y)
     left:  elements left of currentFocus (x < currentFocus.x)
     right: elements right of currentFocus (x > currentFocus.x)
  4. For each candidate, calculate:
     - Distance from currentFocus
     - Alignment (perpendicular to direction)
     - Proximity score
  5. Return element with best score

OUTPUT:
  - nextFocus: Element (most likely next focus target)
  - OR null (no candidate found)

EXAMPLE: Direction=RIGHT from button at (100, 50, 50, 30)
  Candidates:
    ├─ Button A at (200, 40, 50, 30)    ← Best match
    │  (farther right, aligned top)
    ├─ Button B at (150, 100, 50, 30)   ← Diagonal
    │  (right & below)
    └─ Button C at (300, 50, 50, 30)    ← Too far
       (much farther right)
  Result: Button A
```

---

## 6. File Dependencies Map

```
┌─────────────────────────────────────────────────────────────┐
│              COMPONENT DEPENDENCY GRAPH                      │
└─────────────────────────────────────────────────────────────┘

View.tsx
  ├─ useFocusEffect() [NEW]
  │  └─ SpatialManager.determineFocus()
  │     ├─ getTreeOrderFocusables()
  │     ├─ getSpatialOrderFocusables()
  │     └─ findFocusableTarget()
  │
  ├─ createDOMProps()
  │  ├─ hasTVPreferredFocus → data-tv-preferred-focus
  │  ├─ nextFocusUp/Down/Left/Right → data-next-focus-*
  │  └─ autoFocus → data-autofocus
  │
  └─ forwardedProps.tvViewProps

TVFocusGuideView.tsx
  ├─ SpatialManager.setDestinations()
  ├─ useRef() for lastFocusedChild tracking [NEW]
  └─ View component (underlying)

SpatialManager/index.js [CORE]
  ├─ @bbc/tv-lrud-spatial
  │  ├─ setConfig()
  │  └─ getNextFocus()
  │
  ├─ determineFocus() [NEW]
  ├─ getTreeOrderFocusables() [NEW]
  ├─ getSpatialOrderFocusables() [NEW]
  ├─ resolveNextFocus() [NEW]
  ├─ shouldTrapFocus() [NEW]
  │
  └─ addEventListener()

createDOMProps/index.js
  ├─ tvFocusable handling [ENHANCED]
  ├─ nextFocus* forwarding [NEW]
  ├─ hasTVPreferredFocus forwarding [NEW]
  └─ trapFocus* handling [ENHANCED]

forwardedProps/index.js
  └─ tvViewProps [ENHANCED with new props]
```

---

## 7. Test Coverage Map

```
┌────────────────────────────────────────────┐
│       TEST SCENARIO COVERAGE MATRIX        │
└────────────────────────────────────────────┘

                        Unit    Integration  E2E
Scenario 1: Linear     [✓]       [✓]        [ ]
Scenario 2: Grid       [✓]       [✓]        [✓]
Scenario 3: Priority   [✓]       [✓]        [ ]
Scenario 4: Memory     [✓]       [✓]        [ ]
Scenario 5: Explicit   [✓]       [✓]        [ ]
Scenario 6: Trap       [✓]       [✓]        [ ]
Scenario 7: Nested     [ ]       [✓]        [✓]
Scenario 8: Dest       [ ]       [✓]        [ ]
Scenario 9: Order      [✓]       [✓]        [ ]
Scenario 10: Real-app  [ ]       [✓]        [✓]

Legend:
  [✓] = Create tests
  [ ] = Create tests (lower priority)

File Structure:
  __tests__/
  ├─ SpatialManager.test.js (Unit)
  ├─ TVFocusGuideView.test.js (Unit)
  ├─ View.test.js (Unit)
  ├─ Integration.test.js (Integration)
  └─ AndroidTV.compat.test.js (E2E scenarios)
```

---

## 8. Implementation Timeline Gantt Chart

```
┌──────────────────────────────────────────────────────────────┐
│           4-WEEK IMPLEMENTATION TIMELINE                      │
└──────────────────────────────────────────────────────────────┘

Week 1: Foundation (Jan 27 - Feb 2)
├─ Spike: @bbc/tv-lrud-spatial API ███░░░░ 40%
├─ determineFocus() function      ░░░░░░░░ 0%
├─ getTreeOrderFocusables()       ░░░░░░░░ 0%
└─ Unit tests (scenarios 1,2,3)   ░░░░░░░░ 0%

Week 2: Explicit Navigation (Feb 3 - Feb 9)
├─ resolveNextFocus() function    ░░░░░░░░ 0%
├─ nextFocus* prop forwarding     ░░░░░░░░ 0%
├─ Integration tests              ░░░░░░░░ 0%
└─ Buffer for unknowns            ░░░░░░░░ 0%

Week 3: Focus Guide (Feb 10 - Feb 16)
├─ hasTVPreferredFocus support    ░░░░░░░░ 0%
├─ Focus memory (lastFocusedChild)░░░░░░░░ 0%
├─ Collapse/reveal behavior       ░░░░░░░░ 0%
└─ Nested guide tests             ░░░░░░░░ 0%

Week 4: Integration & Docs (Feb 17 - Feb 23)
├─ Complete test suite            ░░░░░░░░ 0%
├─ Example app                    ░░░░░░░░ 0%
├─ Documentation                  ░░░░░░░░ 0%
├─ Backward compat verify         ░░░░░░░░ 0%
└─ Final review & polish          ░░░░░░░░ 0%

Parallel Track (Ongoing):
├─ Code review process            ░░░░░░░░ 0%
├─ Integration with main branch   ░░░░░░░░ 0%
└─ Stakeholder communication      ░░░░░░░░ 0%
```

---

## 9. Data Flow Diagram: Focus Update

```
┌──────────────────────────────────────────────────┐
│       FOCUS UPDATE DATA FLOW                      │
└──────────────────────────────────────────────────┘

User presses ArrowRight
        │
        ▼
KeyDown event in SpatialManager
        │
        ├─ Extract direction: RIGHT
        ├─ Get currentFocus: Element
        │
        ▼
    resolveNextFocus(currentFocus, RIGHT)
        │
        ├─ Check currentFocus.nextFocusRight
        │  │
        │  ├─ YES → findFocusableTarget(id)
        │  │        ├─ Found & focusable? YES → return
        │  │        └─ NOT found? → continue
        │  │
        │  └─ NO → continue
        │
        ├─ Call @bbc/tv-lrud-spatial.getNextFocus()
        │        ├─ Calculate spatial distance
        │        ├─ Filter by direction
        │        └─ return best match
        │
        ├─ Check trapFocus?
        │  ├─ YES (blocked) → return null
        │  └─ NO → continue
        │
        └─ return nextFocus element
                │
                ▼
        nextFocus.focus()
                │
                ▼
        DOM focus event triggered
                │
                └─► Component visual feedback
                    (CSS :focus selector)
```

---

## 10. Property Forwarding Pipeline

```
┌────────────────────────────────────────────────┐
│    PROP FORWARDING: React → DOM                 │
└────────────────────────────────────────────────┘

React Component Props:
  hasTVPreferredFocus={true}
  tvFocusable={true}
  nextFocusUp="upButtonId"
  trapFocusDown={true}
  autoFocus={true}
        │
        ▼
forwardedProps.tvViewProps
  (Whitelist props to forward)
        │
        ▼
createDOMProps()
  (Transform & augment)
        │
        ├─ tvFocusable → add lrud-container class
        ├─ hasTVPreferredFocus → data-tv-preferred-focus="true"
        ├─ nextFocusUp → data-next-focus-up="upButtonId"
        ├─ trapFocusDown → data-block-exit="down"
        ├─ autoFocus → data-autofocus="true"
        │
        ▼
DOM Element Attributes:
  <View
    class="lrud-container"
    data-tv-preferred-focus="true"
    data-next-focus-up="upButtonId"
    data-block-exit="down"
    data-autofocus="true"
    tabindex="-1"
  />
        │
        ▼
SpatialManager reads attributes
  (At focus time)
        │
        ├─ Uses data attributes to determine focus behavior
        ├─ Coordinates with @bbc/tv-lrud-spatial
        └─ Updates focus accordingly
```

---

## Summary

These diagrams show:
1. **Focus Selection** - How elements are chosen for focus
2. **Navigation** - How arrow keys trigger focus changes
3. **Component Structure** - How Normal Views differ from TVFocusGuideView
4. **State Transitions** - How TVFocusGuideView manages states
5. **Spatial Algorithm** - How LRUD calculates next focus
6. **Dependencies** - Which files depend on each other
7. **Test Coverage** - What scenarios need testing
8. **Timeline** - 4-week implementation plan
9. **Data Flow** - How focus updates propagate
10. **Prop Forwarding** - How React props become DOM attributes

Use these as reference when implementing or debugging spatial navigation.
