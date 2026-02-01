# RLV Adapter Implementation Status

## Overview

**Purpose:** Bridge React Native `FlatList` → `VirtualizedList` → `RecyclerListView` for high-performance web virtualization with TV support.

**Component:** `VirtualizedListRLVAdapter`  
**Current Phase:** Core implementation complete; TV features pending  
**Last Updated:** February 1, 2026  
**Key Dependencies:** 
- `recyclerlistview` - High-performance list virtualization engine
- `StyleSheet` - React Native Web styling system

---

## Architectural Overview

```
FlatList (React Native)
    ↓
VirtualizedList (RNW adapter)
    ↓
VirtualizedListRLVAdapter (This file)
    ├─ RNWDataProvider (wraps data for RLV)
    ├─ RNWLayoutProvider (converts RN layout to RLV format) -> Uses GridLayoutProvider for grid
    └─ RecyclerListView (core virtualization engine)
```

**Data Flow:**
1. Props accepted from parent (FlatList or VirtualizedList)
2. Data/Layout providers normalize to RecyclerListView API
3. RLV renders visible items via rowRenderer callback
4. Scroll/viewability events normalized back to React Native format

---

## Implementation Status by Prop

### Data Management

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `data` | `array` | ✅ Full | Stored in RNWDataProvider; supports any array |
| `rowHasChanged` | `(r1, r2) => boolean` | ✅ Full | Custom change detection; defaults to `r1 !== r2`. Added only for RLV for better App control on data change  |
| `getItem` | `(data, index) => item` | ✅ Full | Direct array access; `getItem(data, i) = data[i]` |
| `getItemCount` | `(data) => number` | ✅ Full | Returns `data.length` or 0 |
| `extraData` | `any` | ✅ Full | Passed to RLV as `extendedState` for re-render triggers |

**Implementation Details:**
- `RNWDataProvider` wraps raw data with header/footer markers
- Index mapping: `getItemMetaForIndex()` translates RLV indices to data items
- Header/footer are synthetic items (not in original data array)
- Empty state: Renders synthetic empty item when `data.length === 0`

---

### Layout & Sizing

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `getItemLayout` | `(data, index) => {length, offset}` | ✅ Full | Converted to RLV dimension format |
| `layoutProvider` | `RLVLayoutProvider` | ✅ Full | **Preferred** over `getItemLayout`; full RLV API support. Added only for RLV for better layout feature support |
| `rowHasChanged` | `(r1, r2) => boolean` | ✅ Full |  Added only for RLV to allow better App control over data change. Falls back to r1 !== r1 |
| `_numColumns` | `number` | ✅ Grid | Enables `GridLayoutProvider` when `> 1` |
| `horizontal` | `boolean` | ✅ Full | Passed to RLV; affects layout direction & scroll axis |

**Implementation Details:**
- `RNWLayoutProvider` extends/wraps RecyclerListView layout classes
- **Format conversion:** RN's `{length, offset}` → RLV's `{width, height}`
  - **Vertical (default):** `length` = height along scroll axis; width = container width
  - **Horizontal:** `length` = width along scroll axis; height = container height
- **Grid mode:** `_numColumns > 1` activates `GridLayoutProvider` with per-column span logic
- **Header/Footer measurement:** Heights captured via `getBoundingClientRect()` post-render

---

### Rendering & Content

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `renderItem` | `({item, index, separators}) => ReactNode` | ✅ Full | Wrapped by `_rowRenderer` for RLV compatibility |
| `ListItemComponent` | `Component` | ✅ Full | Fallback when `renderItem` not provided |
| `ListHeaderComponent` | `Component \| function` | ✅ Full | Virtualized as synthetic header; measured on mount |
| `ListFooterComponent` | `Component \| function` | ✅ Full | Virtualized as synthetic footer; measured on mount |
| `ListEmptyComponent` | `Component \| function` | ✅ Full | Renders when `data.length === 0` |
| `ItemSeparatorComponent` | `Component` | ✅ Full | Rendered between items (excludes header/footer) |

**Implementation Details:**
- `_rowRenderer()` dispatches based on `type` (header/footer/item/empty)
- Header/footer rendered once, measured via offscreen container
- Separators attached to each item in `_rowRenderer`, not virtualized separately
- Empty component wrapped in full-height `View` to fill container

---

### Scroll Behavior

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `horizontal` | `boolean` | ✅ Full | Passed to RLV & scroll props |
| `scrollEnabled` | `boolean` | ⚠️ To be tested | Passed to `scrollViewProps` |
| `inverted` | `boolean` | ⚠️ To be tested | Passed to `scrollViewProps` |
| `onScroll` | `(event) => void` | ✅ Full | Normalized & throttled event emission |
| `scrollEventThrottle` | `number` | ✅ Full | Throttles scroll event fires (ms) |
| `showsHorizontalScrollIndicator` | `boolean` | ✅ Full | Passed to `scrollViewProps` |
| `showsVerticalScrollIndicator` | `boolean` | ✅ Full | Passed to `scrollViewProps` |
| `nestedScrollEnabled` | `boolean` | ⚠️ To be tested | Passed to `scrollViewProps` |

**Implementation Details:**
- `_handleScroll()` receives RLV offset events, normalizes to React Native format
- Throttle: Skip events if `now - lastTick < scrollEventThrottle`
- Event normalization: `{nativeEvent: {contentOffset, contentSize, layoutMeasurement}}`
- Scroll metrics stored in ref (not state) to avoid re-renders

---

### Viewability & Item Visibility

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `onViewableItemsChanged` | `(info: {viewableItems, changed}) => void` | ⚠️ Partial | Implemented but needs refinement |
| `viewabilityConfig` | `{itemVisiblePercentThreshold: number, ...}` | ⚠️ Partial | Uses `ViewabilityHelper`; may not align perfectly with RLV behavior |
| `viewabilityConfigCallbackPairs` | `Array<{viewabilityConfig, onViewableItemsChanged}>` | ⚠️ Partial | First pair only; multiple callbacks untested |

**Implementation Details:**
- `ViewabilityHelper` called on scroll to determine visible items
- Fallback to `DEFAULT_VIEWABILITY_CONFIG` if not provided
- **Caveat:** RLV's item lifecycle may differ from React Native's; viewability calculation may be approximate

---

### Styling & Container

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `style` | `StyleObj` | ✅ Full | Applied to outer `View` container |
| `columnWrapperStyle` | `StyleObj` | ⚠️ Not implemented | Challenges on how this can be implemented |

**Implementation Details:**
- Container has `flex: 1` by default
- RLV wrapper also has `flex: 1` to fill parent

---

### TV & Focus Features

**Implementation Details:**
- No direct change required for handling focus

---

## Server-Side Rendering (SSR)

| Aspect | Status | Notes |
|--------|--------|-------|
| Initial Render | ✅ Pass | Renders placeholder `<View>` on server |
| Client Hydration | ✅ Pass | RLV initializes after mount; SSR mismatch acceptable |
| Next.js Compatibility | ✅ Pass | Lazy `require()` prevents RLV load on server |

**Implementation Details:**
- `if (typeof window === 'undefined')` guard in render; returns empty `View`
- `ensureRLVLoaded()` uses try-catch for safe lazy loading
- RecyclerListView only activates on client side

---

## Known Limitations & Open Issues

### Current Limitations

1. **Viewability Calculation** – Simplified; may not perfectly match React Native behavior on all edge cases
2. **Header/Footer Measurement** – Causes layout shift on first render (header/footer measured post-mount)
3. **Multiple Viewability Callbacks** – Only first pair in `viewabilityConfigCallbackPairs` is used
4. **Scroll Position Restoration** – Not yet implemented for list unmount/remount
5. **Sticky Headers** – Not supported by current RLV integration

### Planned Improvements (Phase 2)

- [ ] Scroll position memory for navigation back to list
- [ ] Multiple viewability callback pairs support
- [ ] Sticky header support (if RLV provides)
- [ ] Accessibility improvements (ARIA labels, semantic HTML)

---

## Testing Status

| Scenario | Status | Notes |
|----------|--------|-------|
| Basic list virtualization | ✅ Pass | Items render & unmount correctly |
| Grid layout (numColumns > 1) | ✅ Pass | GridLayoutProvider active; columns render |
| Header/Footer virtualization | ✅ Pass | Measured and cached; appears in correct position |
| Scroll events | ✅ Pass | Normalized events match React Native format |
| Throttled scroll | ✅ Pass | Events throttled per `scrollEventThrottle` |
| Empty state | ✅ Pass | `ListEmptyComponent` renders when data.length === 0 |
| Separator rendering | ✅ Pass | Separators between items; excluded from header/footer |
| Item key stability | ⚠️ Partial | Uses index-based keys; may cause issues with dynamic data |
| Large datasets (2k+ items) | ⚠️ Partial | Profiling available through performance test examples |
| Complex nested layouts | ⏳ TBD | Real-world testing needed |
| Horizontal scroll | ⏳ TBD | Basic support present; edge cases untested |

---

## Implementation Files

| File / Class | Purpose |
|------|---------|
| `VirtualizedListRLVAdapter.js` | Main adapter class; props bridge & RLV integration |
| `RNWDataProvider` (inner class) | Wraps data for RLV; handles header/footer indexing |
| `RNWLayoutProvider` (inner class) | Converts RN layout format to RLV dimensions |
| `getItemMetaForIndex()` (helper) | Maps RLV index to data/header/footer/empty |
| `normalizeScrollEvent()` (helper) | Converts RLV scroll format to React Native |
| `getTotalSize()` (helper) | Calculates total virtualized items (data + header + footer + empty) |

---

## Grid specific notes:
Grid Layout implementation using RLV grid feature requried exposure to additional props (already available to FlatList):
        
1. _originalRenderItem: props.renderItem 
2. _numColumns: numColumns
3. _columnWrapperStyle: columnWrapperStyle ⚠️ Not utilized yet so will have visual impacts if App provides it 


## Usage Examples

### Basic FlatList with RLV Adapter

```javascript
<FlatList
  data={items}
  renderItem={({item}) => <ItemView item={item} />}
  keyExtractor={(item, idx) => idx}
  ListHeaderComponent={<HeaderView />}
  ListFooterComponent={<FooterView />}
/>
```

### Grid Layout

```javascript
<FlatList
  data={items}
  renderItem={({item}) => <GridCell item={item} />}
  numColumns={3}
  layoutProvider={() => ({
      getLayoutTypeForIndex: (index) => return 'item',
      getDimensionForType: () => ({
        width: itemWidth,
        height: ITEM_HEIGHT
      })
    })}
/>
```

---

