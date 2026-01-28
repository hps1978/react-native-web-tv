# SpatialManager Data & State Flow Diagrams

Visual reference for understanding how data flows through the orchestrator and its relationship with lrud.js.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Components                            │
│                                                                   │
│  ┌─────────────────────┐         ┌──────────────────────┐       │
│  │  View Component     │         │ TVFocusGuideView     │       │
│  │  (autoFocus prop)   │         │ (autoFocus prop)     │       │
│  └──────────┬──────────┘         └──────────┬───────────┘       │
│             │                               │                    │
│             │ useEffect(autoFocus)          │ useEffect          │
│             ├─────────────────────────────┬─┘                    │
│             ▼                             ▼                       │
│             determineFocus(container)     determineFocus        │
│             (isTVFocusGuide=false)        (isTVFocusGuide=true) │
└─────────────┬─────────────────────────────┬─────────────────────┘
              │                             │
              │ SpatialManager Orchestrator │
              ▼                             ▼
┌──────────────────────────────────────────────────────────────────┐
│         SpatialManager/index.js (STATE MANAGEMENT)               │
│                                                                   │
│  Global State:                                                   │
│  • isSpatialManagerReady: boolean                                │
│  • currentFocus: HTMLElement | null                             │
│  • spatialNavigationContainer: HTMLElement | null              │
│  • focusStateMap: WeakMap<HTMLElement, FocusState>             │
│  • focusCache: Map<string, CachedFocusables>                   │
│                                                                   │
│  Functions:                                                      │
│  • determineFocus() - Priority-based initial focus              │
│  • resolveNextFocus() - Arrow key + explicit nav + trapping     │
│  • shouldTrapFocus() - Validate trap conditions                 │
│  • getTreeOrderFocusables() - JSX order discovery               │
│  • getSpatialOrderFocusables() - Geometric order                │
│  • [+ 20+ other helper functions]                              │
└─────────────────────────────────────────────────────────────────┘
              │
              │ DOM Attributes
              │ (via createDOMProps)
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DOM Tree (HTML)                             │
│                                                                   │
│  <div class="lrud-container" data-autofocus="true" ...>         │
│    <button data-tv-preferred-focus="true">Preferred</button>    │
│    <button data-next-focus-right="btn2">Btn1</button>          │
│    <button id="btn2">Btn2</button>                              │
│    <button data-block-exit-right="true">Btn3</button>          │
│  </div>                                                          │
└─────────────────────────────────────────────────────────────────┘
              │
              │ readAttributes
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                  lrud.js Spatial Engine                          │
│                                                                   │
│  Pure Functions:                                                 │
│  • getNextFocus(current, direction, scope)                      │
│  • getDefaultFocus(scope)                                       │
│  • findAutofocus(container)                                     │
│                                                                   │
│  Algorithm:                                                      │
│  1. Find all focusable candidates                               │
│  2. Apply spatial algorithm (geometric distance)               │
│  3. Respect block-exit attributes                              │
│  4. Return next focus element                                  │
└──────────────────────────────────────────────────────────────────┘
              │
              │ Returns: HTMLElement | null
              ▼
              .focus() & currentFocus update
```

---

## 2. Focus Determination Priority Flow

```
┌─────────────────────────────────────────────────────────────┐
│         determineFocus(container, options)                  │
│         Called on component mount (autoFocus=true)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Level 1: HIGHEST     │
          │ hasTVPreferredFocus  │
          └──────────┬───────────┘
                     │
          querySelector('[data-tv-preferred-focus="true"]')
                     │
                  ┌──┴──┐
                  │     │
             FOUND│     │NOT FOUND
                  │     │
                  ▼     ▼
             ┌─────────────────────────────────────┐
             │ ✅ RETURN (immediate priority)     │
             └─────────────────────────────────────┘
                                          │
                                          ▼
          ┌──────────────────────┐
          │ Level 2: REDIRECT    │
          │ destinations         │
          │ (TVFocusGuideView)   │
          └──────────┬───────────┘
                     │
          Check data-destinations attribute
          Parse space-separated IDs
                     │
                  ┌──┴──┐
                  │     │
             FOUND│     │NOT FOUND
                  │     │
                  ▼     ▼
             ┌─────────────────────────────────────┐
             │ ✅ RETURN (second priority)        │
             └─────────────────────────────────────┘
                                          │
                                          ▼
          ┌──────────────────────┐
          │ Level 3: MEMORY      │
          │ lastFocusedChild     │
          │ + autoFocus          │
          └──────────┬───────────┘
                     │
          Check data-autofocus + focusStateMap
                     │
                  ┌──┴──┐
                  │     │
             VALID│     │INVALID/NOT FOUND
                  │     │
                  ▼     ▼
             ┌─────────────────────────────────────┐
             │ ✅ RETURN (restore memory)         │
             └─────────────────────────────────────┘
                                          │
                                          ▼
          ┌──────────────────────┐
          │ Level 4: SPATIAL     │
          │ First Focusable      │
          │ (TVFocusGuideView)   │
          └──────────┬───────────┘
                     │
          getBoundingClientRect() sort
          (top-left first position)
                     │
                  ┌──┴──┐
                  │     │
             FOUND│     │NOT FOUND
                  │     │
                  ▼     ▼
             ┌─────────────────────────────────────┐
             │ ✅ RETURN (spatial order)          │
             └─────────────────────────────────────┘
                                          │
                                          ▼
          ┌──────────────────────┐
          │ Level 5: TREE ORDER  │
          │ First Focusable      │
          │ (Normal View ONLY)   │
          └──────────┬───────────┘
                     │
          getTreeOrderFocusables()[0]
          (JSX declaration order)
                     │
                  ┌──┴──┐
                  │     │
             FOUND│     │NOT FOUND
                  │     │
                  ▼     ▼
             ┌─────────────────────────────────────┐
             │ ✅ RETURN (tree order)             │
             └─────────────────────────────────────┘
                                          │
                                          ▼
          ┌──────────────────────┐
          │ Level 6: DEFAULT     │
          │ Browser Default      │
          └──────────┬───────────┘
                     │
                ┌────┴─────┐
                │           │
           ✅ return null  │
           (browser handles)
```

---

## 3. Arrow Key Navigation Flow

```
┌────────────────────────────────────────────────────────┐
│  User presses ArrowDown on focused element            │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
   ┌────────────────────────┐
   │  keydown event fired   │
   │  setupSpatialNav       │
   │  listener catches it   │
   └────────────┬───────────┘
                │
                ▼
   ┌────────────────────────────────────────────┐
   │ resolveNextFocus(currentFocus, direction) │
   │ NEW WRAPPER around getNextFocus()         │
   └────────────┬─────────────────────────────┘
                │
         ┌──────┴──────┐
         │             │
         ▼             ▼
    ┌─────────────────────────────────────────┐
    │ Step 1: Check Explicit Navigation      │
    │ nextFocusDown attribute                 │
    └────────────┬──────────────────────────┘
                 │
           ┌─────┴─────┐
           │           │
       FOUND│           │NOT FOUND
           │           │
           ▼           ▼
    ┌──────────────────────────────────────────────┐
    │ ✅ Return target element (bypass spatial)   │
    └──────────────────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────┐
    │ Step 2: Check Focus Trapping           │
    │ shouldTrapFocus(element, 'down')       │
    │ Check trapFocusDown attribute          │
    └────────────┬──────────────────────────┘
                 │
           ┌─────┴──────┐
           │            │
       TRAPPED│        NOT TRAPPED
           │            │
           ▼            ▼
    ┌──────────────────────────────────────────────┐
    │ ✅ Return currentFocus (stay in place)      │
    └──────────────────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────┐
    │ Step 3: Fallback to Spatial Algorithm  │
    │ getNextFocus(currentFocus, 'down', ..) │
    │ lrud.js spatial calculation            │
    └────────────┬──────────────────────────┘
                 │
           ┌─────┴──────┐
           │            │
       FOUND│           │NOT FOUND
           │            │
           ▼            ▼
    ┌──────────────────────────────────────────┐
    │ ✅ Return next spatial element  OR return null
    └──────────────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────────────────┐
    │ Update Focus                                │
    │ currentFocus = nextFocus                    │
    │ focusStateMap[container].lastFocusedChild = nextFocus
    │ nextFocus.focus()                          │
    │ emit('focus') event                        │
    └──────────────────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────────────────┐
    │ event.preventDefault()                      │
    │ (prevent browser's default key handling)   │
    └──────────────────────────────────────────────┘
```

---

## 4. WeakMap Focus Memory State

```
┌────────────────────────────────────────────────────┐
│  focusStateMap: WeakMap<HTMLElement, FocusState>  │
│  Stores per-container focus tracking              │
└────────────────────┬───────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      │                             │
      ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│  Container A     │        │  Container B     │
│  (TVFocusGuide)  │        │  (normal View)   │
└────────┬─────────┘        └────────┬─────────┘
         │                          │
         ▼                          ▼
    FocusState {              FocusState {
      currentFocus: <Btn2>,     currentFocus: <Input>,
      lastFocusedChild: <Btn2>, lastFocusedChild: <Input>,
      isFocusGuide: true,       isFocusGuide: false,
      isAutoFocused: true,      isAutoFocused: true,
      focusMemory: WeakMap,     focusMemory: WeakMap,
      createdAt: 1706085600     createdAt: 1706085600
    }                         }


┌─────────────────────────────────────────────┐
│ Focus Flow with Memory                      │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    User focuses Btn2    focusStateMap updated
    on Container A            │
        │                     │
        ▼                     ▼
    [Btn2 focused]      focusStateMap[ContA] = {
    focus event fires    ...
                         lastFocusedChild: Btn2
    ┌──────────────────┐ }
    │ Then user moves  │
    │ focus to         │
    │ Container B      │
    └──────────────────┘
           │
           ▼
       [Btn2 loses focus]
       blur event fires
       focusStateMap[ContA].lastFocusedChild = Btn2 (SAVED)
           │
           ▼
       [ContA focus lost]
       Focus moves to Container B
           │
           ▼
       [User presses key]
       Arrow key on Container B
           │
           ▼
       Later: User moves focus back to Container A
           │
           ▼
       Container A gets focus event
           │
           ▼
       determineFocus(ContA, {skipMemory: false})
           │
           ▼
       Level 3: Check lastFocusedChild
       focusStateMap[ContA].lastFocusedChild = Btn2
           │
           ▼
       ✅ Return Btn2 (RESTORED)
       Btn2.focus() called
```

---

## 5. Focus Memory Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│         Focus Memory Lifecycle for Container           │
└────────────────────┬──────────────────────────────────┘
                     │
    ┌────────────────┴──────────────┐
    │                               │
    ▼                               ▼
Mount Component                 Mount Component
autoFocus=true                  autoFocus=false
    │                               │
    ├─ determineFocus()            └─ No initial focus
    ├─ Priority 1-6                  (User clicks later)
    ├─ Find first focusable             │
    ├─ .focus() called                  ▼
    │                             User clicks element
    ▼                                   │
Element focused                         ▼
focus event fires              focusStateMap created
focusStateMap[container] = {   focusStateMap[container] = {
  currentFocus: Element,         currentFocus: Element,
  lastFocusedChild: Element,     lastFocusedChild: Element,
  ...                            ...
}                              }
    │                               │
    ├─ User navigates              └─ User navigates
    ├─ ArrowKey pressed               ArrowKey pressed
    │                                 │
    ▼                                 ▼
resolveNextFocus()          resolveNextFocus()
getNextFocus() → NextElem   getNextFocus() → NextElem
    │                               │
    ├─ NextElem.focus()            ├─ NextElem.focus()
    │                               │
    └─ focusStateMap[container]    └─ focusStateMap[container]
        .lastFocusedChild              .lastFocusedChild
        = NextElem                     = NextElem
        │                               │
        └─ Focus saved for later ──────┴─ Focus saved for later
                                           │
                                           ▼
                                     User clicks OTHER container
                                           │
                                           ▼
                                     focusStateMap[oldContainer]
                                     .lastFocusedChild = saved
                                           │
                                           ▼
                                     User returns to original container
                                           │
                                           ▼
                                     determineFocus(container)
                                     Level 3: lastFocusedChild check
                                           │
                                           ▼
                                     ✅ RESTORE saved element
                                        .focus() called
```

---

## 6. Attribute-Driven Navigation Rules

```
┌──────────────────────────────────────────────────────┐
│         Attribute Decision Matrix                   │
│         (What attributes affect navigation?)        │
└────────────────┬─────────────────────────────────────┘
                 │
    ┌────────────┴────────────────┐
    │                             │
    ▼                             ▼
Initial Focus              Arrow Key Navigation
(determineFocus)           (resolveNextFocus)
    │                             │
    ├─ data-tv-preferred-focus   ├─ data-next-focus-*
    │  (Level 1: highest)         │  (Step 1: explicit)
    │                             │
    ├─ data-destinations         ├─ data-block-exit-*
    │  (Level 2: redirect)        │  (Step 2: trap)
    │                             │
    ├─ data-autofocus            ├─ (spatial algorithm)
    │  (Level 3: memory)          │  (Step 3: fallback)
    │                             │
    ├─ data-focus (memory map)   ├─ data-trap-focus-*
    │  (Level 3: restore)         │  (Equivalent to block-exit)
    │                             │
    └─ .lrud-container           └─ .lrud-container
       (Marks container)           (Scopes search)


┌──────────────────────────────────────────────────────┐
│  Attribute Priority Table                          │
│  (Which attributes win in conflicts?)               │
└──────────────────────────────────────────────────────┘

Initial Focus Priority:
  1. data-tv-preferred-focus ← ALWAYS wins
  2. data-destinations ← Override tree/spatial
  3. data-autofocus + data-focus (memory)
  4. Spatial order (calculated)
  5. Tree order (JSX order)
  6. Browser default

Arrow Navigation Priority:
  1. data-next-focus-${dir} ← Explicit override
  2. data-block-exit-${dir} ← Stop here, trap
  3. Spatial algorithm ← Fall back to geometry


┌──────────────────────────────────────────────────────┐
│  Attribute Interaction Examples                     │
└──────────────────────────────────────────────────────┘

Example 1: Explicit + Trap (conflicting)
  <button data-next-focus-down="otherButton"
          data-block-exit-down="true">
  Result: explicit wins → focus moves to otherButton
          (explicit override beats trap)

Example 2: Preferred + Destinations (conflicting)
  <div data-destinations="btn2" data-tv-preferred-focus>
    <button data-tv-preferred-focus="true">Btn1</button>
  </div>
  Result: preferred wins → focus Btn1
          (Level 1 beats Level 2)

Example 3: Memory + Destinations
  <div data-autofocus data-destinations="btn2">
    <button>Btn1</button> ← last focused
    <button id="btn2">Btn2</button>
  </div>
  Result (first time): destinations wins → Btn2
         (no memory yet)
  Result (second time): memory wins → Btn1
         (Level 2 destinations < Level 3 memory)
```

---

## 7. State Transitions Diagram

```
┌─────────────────────────────────────────────────┐
│         SpatialManager State Machine            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────┐
    │   NOT_INITIALIZED        │
    │ isSpatialManagerReady=F   │
    └────────┬─────────────────┘
             │
   setupSpatialNavigation()
   called
             │
             ▼
    ┌──────────────────────────┐
    │   INITIALIZED            │
    │ isSpatialManagerReady=T   │
    │ keyDownListener attached  │
    └────────┬─────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
Component      Arrow Key
Mount          Pressed
    │                 │
    │                 ▼
    │        ┌─────────────────────┐
    │        │ RESOLVING_NEXT      │
    │        │ resolveNextFocus()  │
    │        │ executing...        │
    │        └────────┬────────────┘
    │                 │
    │                 ▼
    │        ┌─────────────────────┐
    │        │ NEXT_FOUND          │
    │        │ nextFocus ready     │
    │        └────────┬────────────┘
    │                 │
    │                 ├─ .focus()
    │                 ├─ currentFocus = nextFocus
    │                 ├─ focusStateMap updated
    │                 │
    │                 ▼
    │        ┌─────────────────────┐
    │        │ FOCUSED             │
    │        │ Element has focus   │
    │        └─────────────────────┘
    │
    ▼
┌──────────────────────┐
│ DETERMINING_INITIAL  │
│ determineFocus()     │
│ Priority 1-6 check   │
└────────┬─────────────┘
         │
         ▼
    ┌─────────────────────┐
    │ FOCUS_SELECTED      │
    │ Element chosen      │
    └────────┬────────────┘
             │
             ├─ .focus()
             │
             ▼
    ┌─────────────────────┐
    │ FOCUSED             │
    │ Element has focus   │
    │ focusStateMap[cont] │
    │ .currentFocus =elem │
    │ .lastFocusedChild   │
    │ =elem               │
    └─────────────────────┘


             User leaves container
                     │
                     ▼
    ┌─────────────────────────┐
    │ FOCUS_LOST              │
    │ focus event on diff elem│
    │ blur event on old       │
    └────────┬────────────────┘
             │
             ├─ Save lastFocusedChild
             │  in focusStateMap
             │
             ▼
    ┌─────────────────────────┐
    │ OTHER_CONTAINER_FOCUSED │
    │ Different container now │
    │ has focus               │
    └─────────────────────────┘


             User returns to original container
                     │
                     ▼
    ┌─────────────────────────┐
    │ CONTAINER_RE_FOCUSED    │
    │ Focus event on same     │
    │ container or child      │
    └────────┬────────────────┘
             │
             ├─ determineFocus(container)
             ├─ Level 3: Check lastFocusedChild
             ├─ focusStateMap[container]
             │  .lastFocusedChild
             │
             ▼
    ┌─────────────────────────┐
    │ MEMORY_RESTORED         │
    │ Last element re-focused │
    └─────────────────────────┘
```

---

## 8. Debug Output Example

```
┌─────────────────────────────────────────────────────┐
│  DEBUG_API Output Example                          │
│  window.__SPATIAL_NAV__.getFocusState()            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼

{
  isSpatialManagerReady: true,
  currentFocus: {
    id: "button-primary",
    tagName: "BUTTON",
    className: "btn btn-primary"
  },
  spatialNavigationContainer: {
    id: "app-root",
    tagName: "DIV"
  },
  focusStateMap: [
    {
      container: "tv-menu",
      currentFocus: "menu-item-2",
      lastFocusedChild: "menu-item-2",
      isFocusGuide: false,
      isAutoFocused: true,
      createdAt: 1706085600123
    },
    {
      container: "content-area",
      currentFocus: "button-primary",
      lastFocusedChild: "button-primary",
      isFocusGuide: true,
      isAutoFocused: true,
      createdAt: 1706085610456
    }
  ]
}


┌─────────────────────────────────────────────────────┐
│  Console Logging Example                           │
│  config.debugMode = true                           │
└──────────────────────────────────────────────────────┘

[SpatialManager] setupSpatialNavigation called
[SpatialManager] keydown event: ArrowDown
[SpatialManager] resolveNextFocus called
[SpatialManager] Checking explicit nextFocusDown...
[SpatialManager] nextFocusDown not found
[SpatialManager] Checking trapFocusDown...
[SpatialManager] trapFocusDown not found
[SpatialManager] Falling back to spatial algorithm
[SpatialManager] getNextFocus returned: button-next
[SpatialManager] Focus memory: stored button-next as
               last focused in container
[SpatialManager] Next focus element: <button id="button-next">
```

---

## 9. Performance Profile

```
┌────────────────────────────────────────┐
│  Operation Timings                     │
└────────────────────────────────────────┘

determineFocus (first time):
  ├─ hasTVPreferredFocus search: 2ms
  ├─ getTreeOrderFocusables: 5ms
  ├─ getSpatialOrderFocusables: 4ms
  └─ TOTAL: ~11ms ✅ (< 16ms target)

determineFocus (cached):
  └─ TOTAL: ~1ms ✅ (cache hit)

resolveNextFocus (explicit nav):
  ├─ Attribute check: 0.5ms
  ├─ Trap check: 1ms
  ├─ Fallback not needed
  └─ TOTAL: ~1.5ms ✅

resolveNextFocus (spatial nav):
  ├─ Attribute check: 0.5ms
  ├─ Trap check: 1ms
  ├─ lrud.js spatial: 8ms
  └─ TOTAL: ~9.5ms ✅

Arrow key response (end-to-end):
  ├─ Event listener: 0.1ms
  ├─ resolveNextFocus: 1-9ms
  ├─ .focus() call: 1ms
  ├─ focus event handlers: 2-5ms
  └─ TOTAL: ~10-15ms ✅ (< 50ms target)


┌────────────────────────────────────────┐
│  Memory Profile                        │
└────────────────────────────────────────┘

Per Container (WeakMap):
  └─ ~200 bytes (FocusState object)

Per Cache Entry:
  └─ ~500 bytes (array of elements)

Max 100 containers + caches:
  └─ ~70KB ✅ (negligible)

WeakMap cleanup:
  └─ Auto-cleanup on element removal
     (no memory leaks)
```

---

## 10. Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│  Error & Warning Handling                             │
└────────────────────┬──────────────────────────────────┘
                     │
    ┌────────────────┴────────────────┐
    │                                 │
    ▼                                 ▼
Validation Error              Recovery Action
    │                                 │
    ├─ Element not focusable     ├─ Continue to next level
    │  WARN: "not focusable"      │
    │                             ├─ Fall back to spatial
    ├─ Target ID not found       │
    │  WARN: "ID not found"       ├─ Use browser default
    │                             │
    ├─ Container not found       ├─ Try document level
    │  WARN: "container invalid" │
    │                             ├─ Clear cache & retry
    ├─ Circular reference        │
    │  ERROR: "cycle detected"    ├─ Return null
    │                             │
    ├─ Memory leak suspected      ├─ Auto-cleanup
    │  ERROR: "WeakMap full"      │
    │                             └─ Escalate
    └─ Stack overflow
       ERROR: "recursion limit"
```

---

*Document Version*: 1.0  
*Last Updated*: January 24, 2026
