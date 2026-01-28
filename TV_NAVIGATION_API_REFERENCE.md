# TV Navigation API Reference

## Overview
Complete API reference for implementing spatial navigation in react-native-web-tv following Android TV semantics.

---

## Core Props

### Universal View Props

All TV navigation props are supported on `View` component and automatically propagate to child elements via `TVFocusGuideView`.

#### `tvFocusable?: boolean`
Enables spatial navigation for the view and its children.

```typescript
<View tvFocusable>
  {/* Children are spatially navigable */}
</View>
```

**Behavior**:
- Marks view as container for spatial navigation
- Children become focusable candidates
- Adds `lrud-container` CSS class
- Sets `tabIndex="-1"` to prevent tab navigation

**Example**:
```javascript
<View tvFocusable style={styles.grid}>
  {items.map((item, idx) => (
    <Pressable key={idx} onPress={handleSelect}>
      <Text>{item}</Text>
    </Pressable>
  ))}
</View>
```

---

#### `hasTVPreferredFocus?: boolean`
Highest-priority flag for setting initial focus.

```typescript
<View hasTVPreferredFocus>
  <Text>Will be focused first</Text>
</View>
```

**Behavior**:
- Overrides all other focus selection logic
- Takes precedence over `destinations`
- Takes precedence over `autoFocus`
- Used during initial render
- Useful for modal dialogs, error states, etc.

**Priority**: ⭐⭐⭐⭐⭐ (Highest)

**Example**:
```javascript
// Error dialog - force focus to "Retry" button
<Modal visible={hasError}>
  <View tvFocusable>
    <Text>{errorMessage}</Text>
    <Button hasTVPreferredFocus onPress={retry}>Retry</Button>
    <Button onPress={cancel}>Cancel</Button>
  </View>
</Modal>
```

---

#### `focusable?: boolean`
Controls whether a view can receive focus.

```typescript
<View focusable={false}>
  {/* Not focusable */}
</View>
```

**Default**: `true` for interactive elements, `false` for containers

**Example**:
```javascript
// Disabled state - prevent focus
<Button focusable={isEnabled} onPress={handlePress}>
  {isEnabled ? 'Continue' : 'Disabled'}
</Button>
```

---

#### `autoFocus?: boolean`
Auto-focus view when mounted or container receives focus.

```typescript
<View autoFocus>
  <Button>I'm auto-focused</Button>
</View>
```

**Behavior**:
- With `TVFocusGuideView`: Auto-focus first spatially-ordered child
- With `View`: Auto-focus self if focusable
- Restores last focused child on re-focus if available
- Works in combination with `hasTVPreferredFocus`

**Example**:
```javascript
// Auto-focus search input
<TVFocusGuideView autoFocus>
  <TextInput 
    hasTVPreferredFocus 
    placeholder="Search..."
  />
  <View>{results}</View>
</TVFocusGuideView>
```

---

### Explicit Navigation Props

#### `nextFocusUp?: string | number`
#### `nextFocusDown?: string | number`
#### `nextFocusLeft?: string | number`
#### `nextFocusRight?: string | number`

Explicitly specify next focus target for each direction.

```typescript
<Button 
  nextFocusUp="backButton"
  nextFocusDown="confirmButton"
  nextFocusLeft="cancelButton"
  nextFocusRight="helpButton"
>
  Main Action
</Button>
```

**Values**:
- `string`: Element ID (must match `id` prop on target)
- `number`: Not recommended (use IDs instead)

**Behavior**:
- Overrides spatial algorithm for that direction
- Falls back to spatial if target not found or not focusable
- Can create focus loops (A→B→A) intentionally
- Useful for non-standard layouts

**When to Use**:
- ✅ Custom grid layouts with special ordering
- ✅ Non-linear navigation flows
- ✅ Explicit "back" buttons
- ❌ Regular linear/grid layouts (use spatial instead)

**Example**:
```javascript
// Settings page with custom navigation
<View tvFocusable>
  <Button 
    id="settings-title"
    nextFocusDown="wifi-button"
  >
    Settings
  </Button>
  
  <Button 
    id="wifi-button"
    nextFocusUp="settings-title"
    nextFocusDown="bluetooth-button"
    nextFocusLeft="back-button"
  >
    Wi-Fi
  </Button>
  
  <Button 
    id="bluetooth-button"
    nextFocusUp="wifi-button"
  >
    Bluetooth
  </Button>
  
  <Button id="back-button">
    ← Back
  </Button>
</View>
```

---

### Focus Trapping Props

#### `trapFocusUp?: boolean`
#### `trapFocusDown?: boolean`
#### `trapFocusLeft?: boolean`
#### `trapFocusRight?: boolean`

Prevent focus from exiting container in specified direction(s).

```typescript
<View tvFocusable trapFocusUp trapFocusDown>
  {/* Cannot navigate up or down out of this container */}
</View>
```

**Behavior**:
- Scopes spatial navigation within container
- Focus stays in container or wraps to opposite edge
- Useful for modals, menus, nested lists
- Respects child focus positions

**Example**:
```javascript
// Modal dialog - trap focus
<View 
  tvFocusable 
  trapFocusUp 
  trapFocusDown 
  trapFocusLeft 
  trapFocusRight
  style={styles.modal}
>
  <Text>Delete this item?</Text>
  <View style={{ flexDirection: 'row' }}>
    <Button>Cancel</Button>
    <Button>Delete</Button>
  </View>
</View>
```

---

### TVFocusGuideView Props

`TVFocusGuideView` extends `View` with special focus management capabilities.

#### `enabled?: boolean`
Control visibility and focus capability.

```typescript
<TVFocusGuideView enabled={isVisible}>
  {content}
</TVFocusGuideView>
```

**Default**: `true`

**Behavior**:
- `false`: Sets `display: none` and disables focus
- `true`: Visible and focusable

---

#### `destinations?: (Ref | HTMLElement)[]`
Redirect focus to specific targets when guide receives focus.

```typescript
<TVFocusGuideView destinations={[primaryActionRef, secondaryActionRef]}>
  <Button ref={primaryActionRef}>Primary</Button>
  <Button ref={secondaryActionRef}>Secondary</Button>
</TVFocusGuideView>
```

**Behavior**:
- When guide focused, redirect to first available destination
- Overrides normal child focus selection
- Useful for menu buttons, category selectors
- Can be updated dynamically via imperative method

**Priority**: Below `hasTVPreferredFocus`, above `autoFocus`

**Example**:
```javascript
const menuRef = useRef();

<View tvFocusable>
  {/* Menu category buttons */}
  <Button ref={categoryRef}>Categories</Button>
  
  {/* Hidden content container with destinations */}
  <TVFocusGuideView 
    destinations={[categoryRef]}
    enabled={showMenu}
  >
    <CategoryMenu ref={menuRef} />
  </TVFocusGuideView>
</View>

// Update destinations dynamically
menuRef.current?.setDestinations([newTargetRef]);
```

---

#### `autoFocus?: boolean`
Auto-focus first child or restore last focused child.

```typescript
<TVFocusGuideView autoFocus>
  {children}
</TVFocusGuideView>
```

**Behavior**:
- On mount: Focus first child (spatial order)
- On re-focus: Restore last focused child if available
- Enables focus memory across focus loss/gain cycles

---

## Imperative Methods

### TVFocusGuideView Methods

#### `.setDestinations(destinations: HTMLElement[]): void`
Update focus destinations dynamically.

```javascript
const guideRef = useRef();

<TVFocusGuideView ref={guideRef}>
  {children}
</TVFocusGuideView>

// Update destinations
guideRef.current?.setDestinations([newTarget1, newTarget2]);
```

**Use Cases**:
- Async content loading → redirect focus
- Dynamic state changes → update navigation
- Conditional rendering → adjust focus targets

---

## Layout Patterns

### Pattern 1: Horizontal List (Linear Navigation)

```javascript
<View tvFocusable style={{ flexDirection: 'row' }}>
  {items.map((item, idx) => (
    <Button key={idx}>{item}</Button>
  ))}
</View>
```

**Navigation**: ← → between items, ↑↓ to other rows

---

### Pattern 2: Vertical List (Linear Navigation)

```javascript
<View tvFocusable style={{ flexDirection: 'column' }}>
  {items.map((item, idx) => (
    <Button key={idx}>{item}</Button>
  ))}
</View>
```

**Navigation**: ↑↓ between items, ←→ to other columns

---

### Pattern 3: Grid (2D Navigation)

```javascript
<View tvFocusable>
  {rows.map((row, rowIdx) => (
    <View key={rowIdx} style={{ flexDirection: 'row' }}>
      {row.map((item, colIdx) => (
        <Button key={colIdx}>{item}</Button>
      ))}
    </View>
  ))}
</View>
```

**Navigation**: ↑↓ between rows, ←→ within row

---

### Pattern 4: Nested Containers

```javascript
<View tvFocusable style={{ flexDirection: 'column' }}>
  {/* Row 1 */}
  <View style={{ flexDirection: 'row' }}>
    <Button>Item 1</Button>
    <Button>Item 2</Button>
  </View>
  
  {/* Row 2 */}
  <View style={{ flexDirection: 'row' }}>
    <Button>Item 3</Button>
    <Button>Item 4</Button>
  </View>
</View>
```

**Navigation**: ↑↓ between rows, ←→ within row, wraps at edges

---

### Pattern 5: Modal Dialog

```javascript
<View tvFocusable trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
  <Text>Confirm Action?</Text>
  <View style={{ flexDirection: 'row' }}>
    <Button hasTVPreferredFocus>Yes</Button>
    <Button>No</Button>
  </View>
</View>
```

**Navigation**: ←→ between buttons, ↑↓ blocked, focus trapped

---

### Pattern 6: Master-Detail View

```javascript
<View tvFocusable style={{ flexDirection: 'row' }}>
  {/* Master list on left */}
  <View tvFocusable style={{ flex: 1 }}>
    {masterItems.map((item, idx) => (
      <Button 
        key={idx}
        onPress={() => setSelected(item.id)}
      >
        {item.title}
      </Button>
    ))}
  </View>
  
  {/* Detail panel on right */}
  <View tvFocusable style={{ flex: 1 }}>
    <Button>Action 1</Button>
    <Button>Action 2</Button>
  </View>
</View>
```

**Navigation**: ←→ between master and detail, ↑↓ within each panel

---

### Pattern 7: Menu with Submenus

```javascript
<View tvFocusable trapFocusUp trapFocusDown>
  <Button 
    id="menu-home"
    nextFocusDown="submenu-settings"
    nextFocusRight="content-area"
  >
    Home
  </Button>
  <Button 
    id="menu-settings"
    nextFocusUp="menu-home"
    nextFocusRight="content-area"
  >
    Settings
  </Button>
  
  <TVFocusGuideView id="content-area" autoFocus>
    {/* Content rendered here */}
  </TVFocusGuideView>
</View>
```

**Navigation**: ↑↓ in menu, →← to content, explicit nextFocus paths

---

## Error Handling & Debugging

### Common Issues

**Issue**: Initial focus not set
```javascript
// ❌ Missing tvFocusable or hasTVPreferredFocus
<View>
  <Button>I won't be focused</Button>
</View>

// ✅ Add tvFocusable
<View tvFocusable>
  <Button hasTVPreferredFocus>Now I'm focused</Button>
</View>
```

---

**Issue**: Navigation doesn't work
```javascript
// ❌ Button not focusable
<Button focusable={false} />

// ✅ Make it focusable
<Button focusable={true} />
```

---

**Issue**: Focus jumps unexpectedly
```javascript
// ❌ Overlapping spatial regions
<View tvFocusable style={{ position: 'absolute' }}>
  <Button>A</Button>
</View>
<View tvFocusable>
  <Button>B</Button>
</View>

// ✅ Use explicit nextFocus*
<Button nextFocusDown="b" />
```

---

**Issue**: TVFocusGuideView not restoring focus
```javascript
// ❌ Missing autoFocus
<TVFocusGuideView>
  <Button>Won't restore focus</Button>
</TVFocusGuideView>

// ✅ Add autoFocus
<TVFocusGuideView autoFocus>
  <Button>Focus restored!</Button>
</TVFocusGuideView>
```

---

### Debug Commands

**List all focusable elements**:
```javascript
console.table(
  Array.from(document.querySelectorAll('[tvfocusable], .lrud-focusable'))
    .map(el => ({
      id: el.id,
      tag: el.tagName,
      focusable: el.tabIndex >= 0
    }))
);
```

**Trace focus changes**:
```javascript
document.addEventListener('focusin', (e) => {
  console.log('Focus changed to:', e.target);
}, true);
```

**Simulate spatial navigation**:
```javascript
// Manual next focus calculation
const currentEl = document.activeElement;
const direction = 'ArrowDown';
const nextEl = window.__SPATIAL_NAV__.getNextFocus(currentEl, direction);
console.log('Next focus:', nextEl);
```

---

## Performance Considerations

### Optimization Tips

1. **Reduce DOM Size**: Fewer elements = faster spatial calculation
   ```javascript
   // ❌ 1000 items in single View
   <View tvFocusable>
     {Array(1000).fill().map((_, i) => <Button key={i} />)}
   </View>
   
   // ✅ Virtualize or paginate
   <FlatList
     tvFocusable
     data={items}
     keyExtractor={(item) => item.id}
     renderItem={({ item }) => <Button>{item}</Button>}
   />
   ```

2. **Memoize Focus Calculations**: Cache spatial ordering results
   ```javascript
   const memoizedFocusables = useMemo(
     () => getSpatialOrderFocusables(containerRef.current),
     [containerRef, items]
   );
   ```

3. **Lazy Initialize Spatial Nav**: Only set up when needed
   ```javascript
   const [isTVApp] = useState(() => Platform.isTV);
   if (!isTVApp) return null;
   ```

4. **Debounce Focus Calculations**: Avoid repeated calculations
   ```javascript
   const debouncedFocusCalc = useDebouncedCallback(
     () => calculateNextFocus(),
     50
   );
   ```

---

## Migration from React Native TV OS

### Mapping RN-TVOS → Web-TV Props

| React Native (TVOS) | react-native-web-tv | Notes |
|-------------------|-------------------|-------|
| `hasTVPreferredFocus` | `hasTVPreferredFocus` | ✅ Same |
| `tvParallaxProperties` | N/A | Web doesn't need parallax |
| `nextFocusUp/Down/Left/Right` | `nextFocusUp/Down/Left/Right` | ✅ Same |
| `isTVSelectable` | `tvFocusable` | ⚠️ Use `tvFocusable` on web |
| `onFocusChange` | Custom event listeners | Different implementation |
| `TVEventHandler` | `useTVEventHandler` | React hook version |
| `TVFocusGuideView` | `TVFocusGuideView` | ✅ Same, enhanced |

### Example Migration

```javascript
// React Native (TVOS)
<TVFocusGuideView
  autoFocus
  destinations={[buttonRef]}
  hasTVPreferredFocus
  trapFocusUp
  trapFocusDown
  trapFocusLeft
  trapFocusRight
>
  {children}
</TVFocusGuideView>

// Web equivalent (works on both!)
<TVFocusGuideView
  autoFocus
  destinations={[buttonRef]}
  hasTVPreferredFocus
  trapFocusUp
  trapFocusDown
  trapFocusLeft
  trapFocusRight
>
  {children}
</TVFocusGuideView>
// ✅ Identical! Code works on both platforms
```

---

## References

- [React Native TV OS Documentation](https://github.com/react-native-tvos/react-native-tvos)
- [Android TV Focus Training](https://developer.android.com/training/tv/start/navigation)
- [BBC LRUD Spatial Navigation](https://github.com/bbc/lrud-spatial)
- [W3C Spatial Navigation Spec](https://drafts.csswg.org/mediaqueries-5/#spatial-navigation)
