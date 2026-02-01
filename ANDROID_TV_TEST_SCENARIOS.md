# Android TV Navigation Test Scenarios

## Overview
This document defines test cases that verify our spatial navigation implementation matches Android TV behavior across common UI patterns.

---

## Test Scenario 1: Simple Button Row (Horizontal Linear)

### Layout
```
┌─────────────────────────────┐
│ [Btn1] [Btn2] [Btn3] [Btn4] │
└─────────────────────────────┘
```

### Expected Navigation
```
Initial Focus: Btn1 (tree order - first in JSX)
Right: Btn1 → Btn2 → Btn3 → Btn4 → (wrap)
Left:  Btn4 → Btn3 → Btn2 → Btn1 → (wrap)
Up/Down: No movement (no targets)
```

### Implementation Test
```javascript
test('Horizontal button row navigation', () => {
  render(
    <View tvFocusable>
      <Button testID="btn1" ref={btn1Ref} />
      <Button testID="btn2" ref={btn2Ref} />
      <Button testID="btn3" ref={btn3Ref} />
      <Button testID="btn4" ref={btn4Ref} />
    </View>
  );
  
  expect(document.activeElement).toBe(btn1Ref.current);
  pressKey('ArrowRight');
  expect(document.activeElement).toBe(btn2Ref.current);
  pressKey('ArrowRight');
  expect(document.activeElement).toBe(btn3Ref.current);
  pressKey('ArrowLeft');
  expect(document.activeElement).toBe(btn2Ref.current);
});
```

---

## Test Scenario 2: Grid Layout (2D Navigation)

### Layout
```
┌─────────────────────────────┐
│ [B1]  [B2]  [B3]  [B4]      │
│ [B5]  [B6]  [B7]  [B8]      │
│ [B9]  [B10] [B11] [B12]     │
└─────────────────────────────┘
```

### Expected Navigation
```
Initial Focus: B1 (tree order)
From B1:
  Right: B1 → B2 (closest horizontal match)
  Down:  B1 → B5 (closest vertical match)

From B6 (center):
  Up:    B6 → B2 (closest vertical)
  Down:  B6 → B10 (closest vertical)
  Left:  B6 → B5 (closest horizontal)
  Right: B6 → B7 (closest horizontal)

From B4 (corner):
  Left:  B4 → B3
  Down:  B4 → B8
  Right: No movement (edge)
  Up:    No movement (edge)
```

### Implementation Test
```javascript
test('Grid layout 2D navigation', () => {
  const buttons = [];
  render(
    <View tvFocusable style={{ flexDirection: 'column' }}>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4].map(i => (
          <Button 
            key={i} 
            ref={r => buttons[i-1] = r}
            testID={`btn${i}`}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {[5, 6, 7, 8].map(i => (
          <Button 
            key={i} 
            ref={r => buttons[i-1] = r}
            testID={`btn${i}`}
          />
        ))}
      </View>
    </View>
  );
  
  expect(document.activeElement).toBe(buttons[0]); // B1
  pressKey('ArrowDown');
  expect(document.activeElement).toBe(buttons[4]); // B5
  pressKey('ArrowRight');
  expect(document.activeElement).toBe(buttons[5]); // B6
  pressKey('ArrowUp');
  expect(document.activeElement).toBe(buttons[1]); // B2
});
```

---

## Test Scenario 3: Initial Focus Priority (hasTVPreferredFocus)

### Layout
```
┌─────────────────────────┐
│ [Btn1] [Btn2*] [Btn3]   │  (* = hasTVPreferredFocus)
└─────────────────────────┘
```

### Expected Behavior
```
JSX Tree Order: Btn1, Btn2, Btn3
Initial Focus: Btn2 (because hasTVPreferredFocus=true)
```

### Implementation Test
```javascript
test('hasTVPreferredFocus sets initial focus', () => {
  render(
    <View tvFocusable>
      <Button testID="btn1" ref={btn1Ref} />
      <Button testID="btn2" ref={btn2Ref} hasTVPreferredFocus />
      <Button testID="btn3" ref={btn3Ref} />
    </View>
  );
  
  expect(document.activeElement).toBe(btn2Ref.current);
});

test('hasTVPreferredFocus overrides tree order in TVFocusGuideView', () => {
  render(
    <TVFocusGuideView autoFocus>
      <Button testID="btn1" ref={btn1Ref} />
      <Button testID="btn2" ref={btn2Ref} />
      <Button testID="btn3" ref={btn3Ref} hasTVPreferredFocus />
    </TVFocusGuideView>
  );
  
  expect(document.activeElement).toBe(btn3Ref.current);
});
```

---

## Test Scenario 4: Focus Memory (autoFocus Restoration)

### Layout
```
Container (autoFocus)
  ├─ Btn1 ← (was focused, then navigated away)
  ├─ Btn2 ← (current focus)
  └─ Btn3
```

### Expected Behavior
```
1. Initial focus: Btn1 (first child)
2. Navigate Right → Btn2 (now focused)
3. Navigate Down → Btn1 (from Btn2, should go down, but wraps to Btn1)
4. Focus returns to container
5. Auto-Focus re-activates → Btn2 (lastFocusedChild)
```

### Implementation Test
```javascript
test('autoFocus restores last focused child', () => {
  const container = render(
    <TVFocusGuideView autoFocus>
      <Button testID="btn1" ref={btn1Ref} />
      <Button testID="btn2" ref={btn2Ref} />
      <Button testID="btn3" ref={btn3Ref} />
    </TVFocusGuideView>
  );
  
  // Initially Btn1
  expect(document.activeElement).toBe(btn1Ref.current);
  
  // Navigate to Btn2
  pressKey('ArrowRight');
  expect(document.activeElement).toBe(btn2Ref.current);
  
  // Focus moves outside container (e.g., to sibling)
  otherButton.focus();
  expect(document.activeElement).not.toBe(btn2Ref.current);
  
  // Re-focus container → should restore Btn2
  container.focus();
  expect(document.activeElement).toBe(btn2Ref.current);
});
```

---

## Test Scenario 5: Explicit Navigation (nextFocus Props)

### Layout
```
      [Up Target]
             ↑
[Left] ← [Center] → [Right]
             ↓
      [Down Target]
```

### Expected Behavior
```
From Center:
  Up:    Center → Up Target (explicit, not spatial)
  Down:  Center → Down Target (explicit, not spatial)
  Left:  Center → Left (explicit, not spatial)
  Right: Center → Right (explicit, not spatial)
```

### Implementation Test
```javascript
test('nextFocus* props override spatial navigation', () => {
  render(
    <View tvFocusable>
      <Button testID="up" ref={upRef} />
      <Button testID="left" ref={leftRef} />
      <Button 
        testID="center" 
        ref={centerRef}
        nextFocusUp="up"
        nextFocusDown="down"
        nextFocusLeft="left"
        nextFocusRight="right"
      />
      <Button testID="right" ref={rightRef} />
      <Button testID="down" ref={downRef} />
    </View>
  );
  
  centerRef.current.focus();
  pressKey('ArrowUp');
  expect(document.activeElement).toBe(upRef.current);
  
  pressKey('ArrowDown');
  expect(document.activeElement).toBe(downRef.current);
  
  pressKey('ArrowLeft');
  expect(document.activeElement).toBe(leftRef.current);
  
  pressKey('ArrowRight');
  expect(document.activeElement).toBe(rightRef.current);
});
```

---

## Test Scenario 6: Trap Focus (Direction Blocking)

### Layout
```
          [Top]
            ↑
[Left] ← [Container*] → [Right]  (* = trapFocus enabled)
            ↓
        [Bottom]
```

### Expected Behavior
```
trapFocusUp=true:   Cannot navigate up (Up blocked)
trapFocusDown=true:  Cannot navigate down (Down blocked)
trapFocusLeft=true:  Cannot navigate left (Left blocked)
trapFocusRight=true: Cannot navigate right (Right blocked)

When blocked: Focus stays in container or goes to next child
```

### Implementation Test
```javascript
test('trapFocusUp blocks upward navigation', () => {
  render(
    <View tvFocusable>
      <Button testID="top" ref={topRef} />
      <View 
        tvFocusable 
        trapFocusUp
        ref={containerRef}
      >
        <Button testID="child1" ref={child1Ref} />
        <Button testID="child2" ref={child2Ref} />
      </View>
      <Button testID="bottom" ref={bottomRef} />
    </View>
  );
  
  child1Ref.current.focus();
  pressKey('ArrowUp');
  // Should NOT reach topRef, stays in container or wraps to child2
  expect(document.activeElement).not.toBe(topRef.current);
});

test('trapFocusAll blocks all directions', () => {
  render(
    <View 
      tvFocusable
      trapFocusUp
      trapFocusDown
      trapFocusLeft
      trapFocusRight
    >
      <Button testID="btn" ref={btnRef} />
    </View>
  );
  
  btnRef.current.focus();
  const originalFocus = document.activeElement;
  
  pressKey('ArrowUp');
  expect(document.activeElement).toBe(originalFocus);
  pressKey('ArrowDown');
  expect(document.activeElement).toBe(originalFocus);
  pressKey('ArrowLeft');
  expect(document.activeElement).toBe(originalFocus);
  pressKey('ArrowRight');
  expect(document.activeElement).toBe(originalFocus);
});
```

---

## Test Scenario 7: Nested TVFocusGuideView

### Layout
```
Outer Guide (autoFocus)
  ├─ [OuterBtn1*]  (* = hasTVPreferredFocus)
  ├─ Inner Guide (autoFocus)
  │  ├─ [InnerBtn1]
  │  ├─ [InnerBtn2*]  (* = hasTVPreferredFocus)
  │  └─ [InnerBtn3]
  └─ [OuterBtn2]
```

### Expected Behavior
```
Initial Focus: InnerBtn2 (inner hasTVPreferredFocus takes priority)
From InnerBtn2:
  Right: InnerBtn2 → InnerBtn3
  Left:  InnerBtn3 → InnerBtn2 → InnerBtn1
  Down:  InnerBtn2 → OuterBtn2 (exit inner guide, go to outer)
  Up:    InnerBtn2 → InnerBtn1
```

### Implementation Test
```javascript
test('Nested TVFocusGuideView respects inner hasTVPreferredFocus', () => {
  render(
    <TVFocusGuideView autoFocus testID="outer">
      <Button testID="outerBtn1" ref={outerBtn1Ref} hasTVPreferredFocus />
      <TVFocusGuideView autoFocus testID="inner">
        <Button testID="innerBtn1" ref={innerBtn1Ref} />
        <Button testID="innerBtn2" ref={innerBtn2Ref} hasTVPreferredFocus />
        <Button testID="innerBtn3" ref={innerBtn3Ref} />
      </TVFocusGuideView>
      <Button testID="outerBtn2" ref={outerBtn2Ref} />
    </TVFocusGuideView>
  );
  
  expect(document.activeElement).toBe(innerBtn2Ref.current);
});

test('Navigation escapes inner guide at boundaries', () => {
  render(
    <TVFocusGuideView autoFocus testID="outer">
      <Button testID="outerBtn1" ref={outerBtn1Ref} />
      <TVFocusGuideView autoFocus testID="inner">
        <Button testID="innerBtn1" ref={innerBtn1Ref} />
        <Button testID="innerBtn2" ref={innerBtn2Ref} />
      </TVFocusGuideView>
      <Button testID="outerBtn2" ref={outerBtn2Ref} />
    </TVFocusGuideView>
  );
  
  innerBtn2Ref.current.focus();
  pressKey('ArrowDown');
  expect(document.activeElement).toBe(outerBtn2Ref.current);
});
```

---

## Test Scenario 8: Destinations Override (TVFocusGuideView)

### Layout
```
TVFocusGuideView (destinations=[targetBtn])
  ├─ [ChildBtn1]
  ├─ [ChildBtn2]
  └─ [TargetBtn]
```

### Expected Behavior
```
When TVFocusGuideView focused, focus redirects to TargetBtn
(destinations takes priority over normal child focus)
```

### Implementation Test
```javascript
test('destinations redirects focus on TVFocusGuideView mount', () => {
  render(
    <TVFocusGuideView autoFocus destinations={[targetBtnRef]}>
      <Button testID="child1" ref={childBtn1Ref} />
      <Button testID="child2" ref={childBtn2Ref} />
      <Button testID="target" ref={targetBtnRef} />
    </TVFocusGuideView>
  );
  
  expect(document.activeElement).toBe(targetBtnRef.current);
});
```

---

## Test Scenario 9: Spatial Ordering in TVFocusGuideView

### Layout (Note: Physical positions differ from JSX order)
```
JSX Order: Btn1, Btn2, Btn3, Btn4

Physical Layout:
  ┌─────────────────┐
  │ [Btn3]  [Btn1]  │
  │ [Btn4]  [Btn2]  │
  └─────────────────┘
```

### Expected Behavior
```
TVFocusGuideView + autoFocus:
  Initial Focus: Btn3 (spatial first - top-left position)
  NOT Btn1 (tree order)

Normal View (without TVFocusGuideView):
  Initial Focus: Btn1 (tree order)
```

### Implementation Test
```javascript
test('TVFocusGuideView uses spatial order for initial focus', () => {
  render(
    <TVFocusGuideView autoFocus>
      {/* JSX order: 1, 2, 3, 4 */}
      <Button 
        testID="btn1" 
        ref={btn1Ref} 
        style={{ position: 'absolute', top: 0, right: 0 }}
      />
      <Button 
        testID="btn2" 
        ref={btn2Ref} 
        style={{ position: 'absolute', bottom: 0, right: 0 }}
      />
      <Button 
        testID="btn3" 
        ref={btn3Ref} 
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <Button 
        testID="btn4" 
        ref={btn4Ref} 
        style={{ position: 'absolute', bottom: 0, left: 0 }}
      />
    </TVFocusGuideView>
  );
  
  // Should be Btn3 (top-left, spatial first)
  expect(document.activeElement).toBe(btn3Ref.current);
});

test('Normal View uses tree order for initial focus', () => {
  render(
    <View tvFocusable>
      {/* JSX order: 1, 2, 3, 4 */}
      <Button 
        testID="btn1" 
        ref={btn1Ref}
        style={{ position: 'absolute', top: 0, right: 0 }}
      />
      {/* ... rest same as above ... */}
    </View>
  );
  
  // Should be Btn1 (tree order, even though physically not first)
  expect(document.activeElement).toBe(btn1Ref.current);
});
```

---

## Test Scenario 10: Complex Real-World App (Netflix-like)

### Layout
```
Header (non-focusable)
  ├─ Title
  └─ Info

Row 1: Categories [TV] [Movies] [Originals] [Search]
Row 2: Featured [Movie Poster with Play Button]
Row 3: Row of 5 Titles [T1] [T2] [T3] [T4] [T5]
Row 4: Row of 5 Titles [T6] [T7] [T8] [T9] [T10]
```

### Expected Navigation Paths
```
Start: [TV] (first focusable)
Right: [TV] → [Movies] → [Originals] → [Search]
Down:  [TV] → [Play Button] (featured)
Down:  [Play Button] → [T1] (row 3)
Right: [T1] → [T2] → [T3] → [T4] → [T5]
Down:  [T1] → [T6]
```

### Implementation Test
```javascript
test('Netflix-like navigation pattern', () => {
  const { getByTestId } = render(
    <View tvFocusable>
      {/* Row 1 */}
      <View style={{ flexDirection: 'row' }}>
        <Button testID="tv" ref={tvRef} />
        <Button testID="movies" ref={moviesRef} />
        <Button testID="originals" ref={originalsRef} />
        <Button testID="search" ref={searchRef} />
      </View>
      
      {/* Row 2 */}
      <View>
        <Button testID="play" ref={playRef} />
      </View>
      
      {/* Row 3 */}
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Button key={i} testID={`t${i}`} ref={titleRefs[i-1]} />
        ))}
      </View>
      
      {/* Row 4 */}
      <View style={{ flexDirection: 'row' }}>
        {[6, 7, 8, 9, 10].map(i => (
          <Button key={i} testID={`t${i}`} ref={titleRefs[i-1]} />
        ))}
      </View>
    </View>
  );
  
  expect(document.activeElement).toBe(tvRef.current);
  pressKey('ArrowRight');
  expect(document.activeElement).toBe(moviesRef.current);
  pressKey('ArrowDown');
  expect(document.activeElement).toBe(playRef.current);
  pressKey('ArrowDown');
  expect(document.activeElement).toBe(titleRefs[0].current); // T1
});
```

---

## Test Categories Summary

| # | Scenario | Focus Area | Priority |
|---|----------|-----------|----------|
| 1 | Button Row | Linear navigation | P0 |
| 2 | Grid Layout | 2D spatial nav | P0 |
| 3 | hasTVPreferredFocus | Initial focus | P0 |
| 4 | Focus Memory | autoFocus restoration | P1 |
| 5 | nextFocus* | Explicit navigation | P1 |
| 6 | Trap Focus | Direction blocking | P1 |
| 7 | Nested Guides | Complex hierarchy | P2 |
| 8 | Destinations | Focus redirection | P2 |
| 9 | Spatial vs Tree | Order selection | P1 |
| 10 | Real-world App | Integration | P3 |

---

## Running the Tests

```bash
# Run all spatial navigation tests
npm run test -- --testPathPattern="SpatialNavigation|TVFocus|AndroidTV"

# Run specific scenario
npm run test -- --testNamePattern="Horizontal button row navigation"

# Run with coverage
npm run test -- --testPathPattern="SpatialNavigation" --coverage

# Watch mode for development
npm run test -- --testPathPattern="SpatialNavigation" --watch
```

---

## Debugging Navigation Issues

### Enable Focus Logging
```javascript
// In SpatialManager/index.js
const DEBUG = true;

function log(msg, data) {
  if (DEBUG) {
    console.log(`[SpatialNav] ${msg}`, data);
  }
}
```

### Inspect Focus State
```javascript
// In DevTools console
window.__SPATIAL_NAV__.getFocusState()
// Output: { currentFocus: HTMLElement, lastFocused: HTMLElement, ... }

window.__SPATIAL_NAV__.getNextFocus(currentDirection)
// Shows which element would be focused next
```

### Visual Debug Overlay
```javascript
// Highlight focusable elements
document.querySelectorAll('.lrud-focusable').forEach(el => {
  el.style.border = '2px solid green';
});

// Highlight current focus
document.activeElement.style.border = '2px solid red';
```
