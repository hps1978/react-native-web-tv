# createDOMProps Enhancement: Android TV Attribute Mapping

**Version**: 1.0  
**Date**: January 24, 2026  
**Focus**: Precise specification of what createDOMProps must set as DOM attributes

---

## Overview

`createDOMProps` is the **central decision point** where:
- React component props are RECEIVED
- Android TV rules are TRANSLATED
- DOM attributes are SET for lrud.js to READ

**File**: `/packages/react-native-web/src/modules/createDOMProps/index.js`

---

## Attribute Mapping: React Props → DOM Attributes

### Core TV Navigation Attributes

| React Prop | DOM Attribute | Type | Purpose | Current | Required |
|-----------|--------------|------|---------|---------|----------|
| `tvFocusable` | `lrud-container` (class) | boolean | Mark element as spatial nav container | ✅ | ✅ |
| `tvFocusable` | `tabIndex="-1"` | - | Prevent container from being directly focusable | ✅ | ✅ |
| `tvFocusable` | `data-lrud-prioritise-children` | string | Control LRUD child prioritization | ✅ | ✅ |
| `trapFocusUp/Down/Left/Right` | `data-block-exit` | string | Specify which directions are blocked | ✅ | ✅ |
| `autoFocus` | `data-autofocus` | string | Indicate initial focus intent | ✅ | ✅ |
| `nextFocusUp` | `data-next-focus-up` | string (ID) | Explicit target when navigating up | ❌ | ✅ MISSING |
| `nextFocusDown` | `data-next-focus-down` | string (ID) | Explicit target when navigating down | ❌ | ✅ MISSING |
| `nextFocusLeft` | `data-next-focus-left` | string (ID) | Explicit target when navigating left | ❌ | ✅ MISSING |
| `nextFocusRight` | `data-next-focus-right` | string (ID) | Explicit target when navigating right | ❌ | ✅ MISSING |
| `destinations` | `data-destinations` | space-separated IDs | TVFocusGuideView initial focus targets | ⚠️ COMMENTED | ⚠️ PARTIAL* |
| `focusable` | `tabIndex="0"` or `"-1"` | - | Mark element as focusable | ✅ | ✅ |

**\*** destinations: Partially handled. The imperative `setDestinations()` method is preferred, but attribute support should remain.

---

## Detailed Implementation Spec

### Change 1: Props Destructuring

**Location**: `/packages/react-native-web/src/modules/createDOMProps/index.js`  
**Line**: ~110-145 (props destructuring section)

**Current State**:
```javascript
const createDOMProps = (elementType, props, options) => {
  // ... ARIA props destructuring ...
  
  const {
    // ... aria/accessibility props ...
    
    dataSet,
    focusable,
    id,
    nativeID,
    pointerEvents,
    style,
    tabIndex,
    testID,
    // TV View props
    autoFocus,
    // destinations,
    trapFocusDown,
    trapFocusLeft,
    trapFocusRight,
    trapFocusUp,
    tvFocusable,
    isContainer,
    // Rest
    ...domProps
  } = props;
```

**Required Change**:
```diff
  const {
    // ... aria/accessibility props ...
    
    dataSet,
    focusable,
    id,
    nativeID,
    pointerEvents,
    style,
    tabIndex,
    testID,
    // TV View props
    autoFocus,
    // destinations,
+   nextFocusUp,
+   nextFocusDown,
+   nextFocusLeft,
+   nextFocusRight,
    trapFocusDown,
    trapFocusLeft,
    trapFocusRight,
    trapFocusUp,
    tvFocusable,
    isContainer,
    // Rest
    ...domProps
  } = props;
```

**Why**: These props need to be extracted from the incoming props object so they can be forwarded as DOM attributes.

---

### Change 2: Forward nextFocus* as Data Attributes

**Location**: `/packages/react-native-web/src/modules/createDOMProps/index.js`  
**Line**: ~740-765 (TV View section, after trapFocus* handling)

**Current State**:
```javascript
  // TV View
  if (tvFocusable) {
    // setup attributes and classes for tv focusable elements
    // based on @bbc/@bbc/tv-lrud-spatial library requirements
    // consider this element a container if tvFocusable is true

    // Update tabIndex so that the container itself is not focusable
    // This does not stop it's children to be focusable based on their focusable prop
    domProps.tabIndex = '-1';

    // 1. add lrud-container class
    if (domProps.className) {
      domProps.className += ' lrud-container';
    } else {
      domProps.className = 'lrud-container';
    }

    // 2. setup focusable
    if (focusable === false) {
      domProps.className += ' lrud-ignore';
    }

    // 3. setup data-block-exit attributes for trapFocus* props
    const trapFocusString = `${trapFocusUp ? 'up' : ''}${
      trapFocusDown ? ' down' : ''
    }${trapFocusLeft ? ' left' : ''}${trapFocusRight ? ' right' : ''}`;
    if (trapFocusString.trim().length > 0) {
      domProps['data-lrud-prioritise-children'] = 'true';
      domProps['data-block-exit'] = trapFocusString;
    } else {
      domProps['data-lrud-prioritise-children'] = 'false';
    }

    // 4. setup destinations attribute
    // each destination in array is an element, extract all ids
    // NOTE: Not done here as the ids may need to be setup
    // if (destinations && Array.isArray(destinations)) {
    //   const destinationIDs = destinations
    //     .map((dest) => (dest && dest.id ? dest.id : null))
    //     .filter((id) => id != null);
    //   if (destinationIDs.length > 0) {
    //     domProps['data-destinations'] = destinationIDs.join(' ');
    //   }
    // }

    // 5. setup autoFocus: default is true
    domProps['data-autofocus'] = autoFocus === 'false' ? 'false' : 'true';
  }
```

**Required Change** (Add after line ~765, after autoFocus handling):
```javascript
    // 6. setup nextFocus* attributes for explicit navigation
    // Each direction can have an explicit target ID
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

**Why**: These attributes tell SpatialManager which element to focus when arrow keys are pressed. They are read by `resolveNextFocus()` function in SpatialManager.

**Example Output**:
```html
<!-- Before: -->
<button nextFocusRight="submit-btn">Cancel</button>

<!-- After processing: -->
<button data-next-focus-right="submit-btn" tabindex="0">Cancel</button>

<!-- SpatialManager reads: -->
const target = element.getAttribute('data-next-focus-right');
// Returns: "submit-btn"
```

---

## Attribute Reference: Complete TV Navigation Matrix

```javascript
// Example component with all TV props:
<View
  tvFocusable                    // Container for spatial nav
  autoFocus                      // Determine initial focus
  trapFocusUp                    // Block upward navigation
  trapFocusDown                  // Block downward navigation  
  trapFocusLeft                  // Block leftward navigation
  trapFocusRight                 // Block rightward navigation
  nextFocusUp="element-id-1"     // Explicit target when going up
  nextFocusDown="element-id-2"   // Explicit target when going down
  nextFocusLeft="element-id-3"   // Explicit target when going left
  nextFocusRight="element-id-4"  // Explicit target when going right
/>

// Result in DOM:
<div 
  class="lrud-container"
  data-lrud-prioritise-children="true"
  data-block-exit="up down left right"
  data-autofocus="true"
  data-next-focus-up="element-id-1"
  data-next-focus-down="element-id-2"
  data-next-focus-left="element-id-3"
  data-next-focus-right="element-id-4"
  tabindex="-1"
/>
```

---

## How lrud.js Reads These Attributes

```javascript
// In SpatialManager.resolveNextFocus():
function resolveNextFocus(element, direction) {
  // Step 1: Check explicit navigation
  const nextAttr = `data-next-focus-${direction}`;
  const targetId = element.getAttribute(nextAttr);  // ← Reads DOM attribute
  
  if (targetId) {
    const target = document.getElementById(targetId);
    if (target && isFocusable(target)) {
      return target;  // Use explicit target
    }
  }
  
  // Step 2: Fall back to spatial algorithm
  // lrud.js reads these attributes:
  const blockExit = element.getAttribute('data-block-exit');  // ← For trap logic
  // ... calls lrud.getNextFocus() which reads:
  // - Element positions (getBoundingClientRect)
  // - Class: lrud-container
  // - data-destinations
  // - data-block-exit
}
```

---

## Non-Changes: What createDOMProps Does NOT Need to Handle

### 1. hasTVPreferredFocus
❌ **NOT** handled by createDOMProps  
✅ **Handled** by View component directly:

```javascript
// In View.js:
if (hasTVPreferredFocus && hostRef.current) {
  setFocus(hostRef.current);  // Direct SpatialManager call
}
```

**Why**: hasTVPreferredFocus is only relevant at component mount time, and the View component already has access to this prop. It doesn't need to be an attribute.

### 2. destinations (Partially)
⚠️ **Partially** handled by createDOMProps  
✅ **Better** handled by imperative API:

```javascript
// Instead of props:
<TVFocusGuideView destinations={[ref1, ref2]} />

// Use imperative method:
guideRef.current.setDestinations([ref1, ref2]);

// This method updates the DOM attribute directly
```

**Why**: destinations are refs, not string IDs. The setDestinations() imperative method is cleaner and more flexible.

### 3. React Props Inspection
❌ createDOMProps does NOT inspect:
- Component type (View vs TVFocusGuideView)
- Other React state
- Focus logic decisions

✅ It ONLY:
- Destructures props
- Maps to attributes
- Returns domProps object

---

## Implementation Steps (Phase 1)

### Step 1a: Update destructuring (5 minutes)
```bash
# Edit createDOMProps/index.js
# Add nextFocus* to line ~130 destructuring
```

### Step 1b: Add attribute forwarding (10 minutes)
```bash
# Edit createDOMProps/index.js  
# Add nextFocus* attribute block after line ~765
```

### Step 1c: Test attribute emission (15 minutes)
```javascript
// Quick test:
const props = {
  tvFocusable: true,
  nextFocusUp: "btn-1",
  nextFocusDown: "btn-2",
  nextFocusLeft: "btn-3",
  nextFocusRight: "btn-4"
};

const domProps = createDOMProps('div', props);

console.log(domProps['data-next-focus-up']);    // Should be "btn-1"
console.log(domProps['data-next-focus-down']);  // Should be "btn-2"
console.log(domProps['data-next-focus-left']);  // Should be "btn-3"
console.log(domProps['data-next-focus-right']); // Should be "btn-4"
```

**Total Time**: ~30 minutes for all createDOMProps changes

---

## Testing Verification

### Test 1: Attributes appear in DOM
```javascript
test('nextFocus attributes are rendered in DOM', () => {
  const { container } = render(
    <View
      tvFocusable
      nextFocusUp="btn-up"
      nextFocusDown="btn-down"
      nextFocusLeft="btn-left"
      nextFocusRight="btn-right"
    />
  );
  
  const div = container.querySelector('div');
  
  expect(div.getAttribute('data-next-focus-up')).toBe('btn-up');
  expect(div.getAttribute('data-next-focus-down')).toBe('btn-down');
  expect(div.getAttribute('data-next-focus-left')).toBe('btn-left');
  expect(div.getAttribute('data-next-focus-right')).toBe('btn-right');
});
```

### Test 2: Backward compatibility
```javascript
test('View without nextFocus props still works', () => {
  const { container } = render(
    <View tvFocusable>
      <Text>Hello</Text>
    </View>
  );
  
  const div = container.querySelector('div');
  
  // Should NOT have nextFocus attributes
  expect(div.getAttribute('data-next-focus-up')).toBeNull();
  expect(div.getAttribute('data-next-focus-down')).toBeNull();
  expect(div.getAttribute('data-next-focus-left')).toBeNull();
  expect(div.getAttribute('data-next-focus-right')).toBeNull();
  
  // But SHOULD have other TV attributes
  expect(div.classList.contains('lrud-container')).toBe(true);
});
```

### Test 3: Complex scenario
```javascript
test('Complex navigation grid renders correct attributes', () => {
  const { container } = render(
    <View tvFocusable>
      <Button
        id="btn-1"
        nextFocusRight="btn-2"
        nextFocusDown="btn-4"
      />
      <Button
        id="btn-2"
        nextFocusLeft="btn-1"
        nextFocusDown="btn-3"
      />
      <Button
        id="btn-3"
        nextFocusUp="btn-2"
      />
    </View>
  );
  
  // Verify each button has correct nextFocus attributes
  const btn1 = container.querySelector('[id="btn-1"]');
  expect(btn1.getAttribute('data-next-focus-right')).toBe('btn-2');
  expect(btn1.getAttribute('data-next-focus-down')).toBe('btn-4');
  
  const btn2 = container.querySelector('[id="btn-2"]');
  expect(btn2.getAttribute('data-next-focus-left')).toBe('btn-1');
  expect(btn2.getAttribute('data-next-focus-down')).toBe('btn-3');
});
```

---

## Edge Cases & Handling

### Edge Case 1: nextFocus value is null/undefined
```javascript
// Props: nextFocusUp: undefined
// Expected: Attribute NOT set (or ignored by lrud)
if (nextFocusUp != null) {  // This check prevents setting null
  domProps['data-next-focus-up'] = String(nextFocusUp);
}
// Result: data-next-focus-up not in domProps
```

### Edge Case 2: nextFocus value is number (invalid)
```javascript
// Props: nextFocusUp: 123
// Expected: Converted to string "123"
domProps['data-next-focus-up'] = String(nextFocusUp);  // "123"
// SpatialManager will try to find element with id="123"
// This is valid (element IDs can be numeric strings)
```

### Edge Case 3: nextFocus targets non-existent element
```javascript
// Props: nextFocusUp: "missing-btn"
// Expected: SpatialManager gracefully falls back to spatial nav
if (nextFocusId) {
  const target = document.getElementById(nextFocusId);  // Returns null
  if (target && isFocusable(target)) {  // This fails
    return target;
  }
  // Falls through to spatial algorithm
}
```

### Edge Case 4: Multiple trapFocus props
```javascript
// Props: trapFocusUp=true, trapFocusDown=true, trapFocusLeft=false
// Result in data-block-exit:
const trapFocusString = `${trapFocusUp ? 'up' : ''}${
  trapFocusDown ? ' down' : ''
}${trapFocusLeft ? ' left' : ''}${trapFocusRight ? ' right' : ''}`;

// trapFocusUp=true, trapFocusDown=true, trapFocusLeft=false, trapFocusRight=false
// trapFocusString = 'up' + ' down' + '' + ''
// Final: trapFocusString.trim() = 'up down'
// Result: data-block-exit="up down"

// SpatialManager.shouldTrapFocus checks:
const blockedDirs = 'up down'.split(' ');  // ['up', 'down']
blockedDirs.includes('left');  // false → can go left
blockedDirs.includes('up');    // true → cannot go up
```

---

## Integration Checklist

- [ ] Add nextFocus* props to destructuring (line ~130)
- [ ] Add nextFocus* attribute forwarding (line ~765)
- [ ] Test: Attributes appear in rendered HTML
- [ ] Test: Backward compatibility (works without nextFocus props)
- [ ] Test: Edge cases (null, undefined, non-existent targets)
- [ ] Update Flow types to include nextFocus* props
- [ ] Update existing tests in createDOMProps/__tests__/

---

## References

- **File**: `/packages/react-native-web/src/modules/createDOMProps/index.js`
- **Type Definitions**: `/packages/react-native-web/src/exports/TV/types.js`
- **Related**: SpatialManager resolveNextFocus() function
- **lrud.js**: Reads these attributes from DOM

---

*Document Version: 1.0*  
*Date: January 24, 2026*  
*Status: Ready for implementation*
