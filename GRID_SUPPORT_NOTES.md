# Grid Support Implementation Notes

## Current FlatList Grid Handling (numColumns)

**Data Transformation via `_getItem`:**
- When `numColumns > 1`: Groups raw items into arrays of size `numColumns`
- Returns: `[item1, item2, item3]` per "row" instead of individual items
- Example: 6 items with `numColumns=3` → returns 2 rows of 3 items each

**Item Count via `_getItemCount`:**
- When `numColumns > 1`: Returns `Math.ceil(dataLength / numColumns)` (row count, not item count)
- When `numColumns=1`: Returns actual data length

**Rendering via `_renderer`:**
- When `cols > 1`: 
  - Receives array of items (one row)
  - Wraps items in `<View style={[styles.row, columnWrapperStyle]}>`
  - Maps over each item in the row, re-indexes: `index * cols + kk`
  - Renders individual items inside the wrapper

**Key Extraction via `_keyExtractor`:**
- When `numColumns > 1`: Joins keys of all items in row with `:` separator
- Reconstructs original item indices: `index * numColumns + kk`

**ViewabilityHelper via `_pushMultiColumnViewable`:**
- Flattens multi-column ViewTokens back to individual item tokens
- Adjusts indices: `v.index * numColumns + ii`

---

## RLV Adapter Current State

- **Does NOT handle numColumns**: No references to numColumns in code
- **Receives data as-is**: Gets props directly from VirtualizedList/FlatList
- **Single item rendering**: `_rowRenderer` expects one item per row

---

## RecyclerListView Capabilities

- Supports variable layout types via `LayoutProvider`
- Can handle grid layouts with `layoutProvider` that returns different dimensions
- Example: `layoutProvider(index) => {width, height}` can vary dimensions per item
- No built-in multi-column grouping—RecyclerListView renders individual items

---

## What Needs to Happen for RLV Adapter Grid Support

1. **Data Grouping**: RLV adapter must receive pre-grouped data (rows of items)
2. **Layout Awareness**: Must know grid dimensions to calculate item sizing
3. **Index Mapping**: Must map between row-level indices and original item indices
4. **Rendering**: `_rowRenderer` must unwrap items from rows and render individually with proper grid CSS

---

## RNWDataProvider (Data Layer)

**Purpose**: Bridge between FlatList's flat data array and RecyclerListView's data provider

**Index Mapping System**:
- Uses `getItemMetaForIndex(index, dataLength, hasHeader, hasFooter)` to translate RLV indices to logical types
- RLV index → maps to → type: 'header' | 'item' | 'footer' | 'empty'
- For type='item' → extracts original data index via: `index - dataStartIndex`

**Example with Header+3items+Footer**:
```
RLV Index    Meta Type      Data Index    Actual Data
0            header         null          ListHeaderComponent
1            item           0             data[0]
2            item           1             data[1]
3            item           2             data[2]
4            footer         null          ListFooterComponent
```

**Data Flow**:
1. Receives raw flat array: `[item1, item2, item3]`
2. Creates `_indexRows = [0,1,2,3,4]` (one index per logical row including header/footer)
3. Passes to RLV's DataProvider for row identity tracking
4. RLV calls `getItem(index)` → adapter maps back to original data or header/footer markers

**Change Detection**:
- RLV's rowHasChanged callback uses `getItemMetaForIndex` to determine if item actually changed
- Only calls user's `rowHasChanged` for type='item' (ignores header/footer changes)

---

## RNWLayoutProvider (Layout Layer)

**Purpose**: Convert React Native's `getItemLayout` format to RLV's `LayoutProvider` format

**Dual Format Support**:
1. **getItemLayout** (RN standard): `(data, index) => {length, offset, index}`
   - `length` = size along scroll axis
   - App-provided, single format
2. **layoutProvider** (RLV format): `(index) => {width, height}` with type-based dimensions
   - More explicit, per-item

**Type-Based Layout System**:
- `getLayoutTypeForIndex(index)` → returns layout type string
  - 'header', 'footer', 'empty', or `item-${rlvIndex}`
- `getDimensionForType(type)` → returns `{width, height}` for that type

**Dimension Resolution**:
1. For 'header': Uses measured `_headerHeight`, container width
2. For 'footer': Uses measured `_footerHeight`, container width
3. For 'empty': Fills remaining space (containerHeight - headerHeight - footerHeight)
4. For 'item-N': Calls user's `getItemLayout` if provided, converts to width/height
   - Horizontal mode: length→width, height→containerHeight
   - Vertical mode: height←length, width→containerWidth

**RLV LayoutProvider Integration**:
- Creates CustomRLVLayoutProvider subclass
- Two-phase: type determination + dimension lookup
- RLV caches layouts internally; adapter recomputes only when needed

---

## Flow: From VirtualizedList Props to RLV

```
VirtualizedList Props
    ↓
_ensureProvidersInitialized()
    ↓
Create RNWDataProvider(data, rowHasChanged, hasHeader, hasFooter)
    ↓
Create RNWLayoutProvider(getItemLayout OR layoutProvider, ...)
    ↓
Pass to RecyclerListView:
  - dataProvider: RNWDataProvider.getRLVDataProvider()
  - layoutProvider: RNWLayoutProvider._rlvLayoutProvider
  - rowRenderer: adapter._rowRenderer (called per RLV index)
    ↓
_rowRenderer receives (type, rowData, rlvIndex)
  - Uses getItemMetaForIndex(rlvIndex) to decode type
  - Renders appropriate content (header/footer/item/empty)
  - For items: fetches from dataProvider._data using dataIndex
```

---

## Key Design: Index Translation vs Data Grouping

**NOT grouping data** (unlike FlatList numColumns):
- Data remains flat: `[item1, item2, item3]`
- RLV indices include header/footer/empty as separate virtual rows
- Rendering unwraps each RLV index to get actual item

---

## RecyclerListView Overview & Grid Support

**Performance Architecture**:
- "Cell recycling" — reuses DOM nodes that scroll off-screen instead of creating new ones
- Memory efficient: constant memory footprint as you scroll
- Cross-platform: works on React Native, Web, and ReactJS (via `recyclerlistview/web`)

**Core Concepts**:
1. **DataProvider**: Tracks data changes using a comparator `(r1, r2) => boolean`
2. **LayoutProvider**: Determines layout type and dimensions for each item
3. **rowRenderer**: Function that returns JSX for each item

### RecyclerListView Built-in Grid Support

**YES — RecyclerListView HAS native grid support via GridLayoutProvider**

#### GridLayoutProvider API
```typescript
class GridLayoutProvider extends LayoutProvider {
  constructor(
    maxSpan: number,                          // Grid columns/rows
    getLayoutType: (index: number) => string|number,  // Type for item
    getSpan: (index: number) => number,       // Span width for this item (1-maxSpan)
    getHeightOrWidth: (index: number) => number,      // Fixed height/width
    acceptableRelayoutDelta?: number          // Tolerance for relayout
  )
}
```

**How it Works**:
- `maxSpan` = number of columns (vertical scroll) or rows (horizontal scroll)
- Each item returns a `span` (1 to maxSpan) — how many columns it occupies
- Uses staggered/masonry algorithm: items fill grid positions automatically
- RecyclerListView handles multi-column layout natively

**Example**:
```javascript
// 3-column grid
const layoutProvider = new GridLayoutProvider(
  3,  // maxSpan: 3 columns
  (index) => 'item',  // All items same type
  (index) => {
    // Variable spans: some items take 2 columns
    return (index % 5 === 0) ? 2 : 1;
  },
  (index) => 100  // Fixed height
);
```

#### Layout Behavior
- Items are laid out left-to-right (or top-to-bottom if horizontal)
- When an item spans 2 columns, next item wraps to fill remaining space
- Creates optimal staggered/masonry layouts automatically
- Supports variable heights per item

#### Comparison to FlatList numColumns
| Feature | FlatList numColumns | RLV GridLayoutProvider |
|---------|-------------------|----------------------|
| **Data grouping** | Groups data into rows in advance | Flat data, layout computed at render |
| **Item spans** | All items = 1 column | Items can span 1 to maxSpan columns |
| **Layout type** | Simple grid | Staggered/masonry grids |
| **Flexibility** | Fixed layout | Per-item dimensions & spans |
| **Rendering** | Pre-groups with _getItem | Renders items individually |

---

## Current RLVAdapter Index Translation Model

**NOT using GridLayoutProvider yet** — still uses base LayoutProvider with index mapping:

```
Raw Data:  [item0, item1, item2, item3]
           ↓
RNWDataProvider groups with header/footer:
  _indexRows = [0, 1, 2, 3, 4]  (header, item0, item1, item2, item3)
           ↓
RNWLayoutProvider resolves per-index:
  index 0 → header
  index 1 → item-1 → getItemLayout(data, 0)
  index 2 → item-2 → getItemLayout(data, 1)
  ...
           ↓
rowRenderer gets called with (type, rowData, rlvIndex)
  Decodes: getItemMetaForIndex(rlvIndex) → {type: 'item', dataIndex: X}
  Renders: renderItem({item: data[dataIndex], index: dataIndex})
```

---

## What Needs to Change for Grid Support

**Option 1: Use GridLayoutProvider Directly** (Recommended)
- Replace base LayoutProvider with GridLayoutProvider in RNWLayoutProvider
- Pass `numColumns` from FlatList props to GridLayoutProvider's `maxSpan`
- No data transformation needed (stays flat)
- GridLayoutProvider handles multi-column layout automatically
- Need to handle: header/footer positioning, item separators

**Option 2: Keep Index Translation + Manual Span Logic**
- Stay with base LayoutProvider
- In `getDimensionForType()`, calculate grid layout manually
- More complex, reinventing what GridLayoutProvider already does

**Option 3: Group Data Like FlatList** (Not Recommended)
- Transform flat data into rows (like FlatList._getItem does)
- Loses RLV's per-item span flexibility
- Performance overhead grouping/ungrouping

---

## RLV LayoutProvider Base Class (for reference)

```typescript
class LayoutProvider {
  constructor(
    getLayoutType: (index: number) => string|number,
    getDimensionForType: (type: string|number, dim: Dimension) => void
  )
  
  newLayoutManager(
    renderWindowSize: Dimension,
    isHorizontal?: boolean,
    cachedLayouts?: Layout[]
  ): LayoutManager
}
```

**Key Points**:
- LayoutProvider is stateless
- Returns layout type from index
- Mutates `dim` object with dimensions for that type
- Caches layouts internally via LayoutManager

---

## Implementation Requirements (Agreed)

1. **Non-grid behavior must remain unchanged**
  - Only enable grid-specific logic when grid mode is detected.
  - Default (non-grid) flow must be identical to current behavior.

2. **`numColumns` is NOT passed to VirtualizedList**
  - FlatList strips `numColumns` before spreading `restProps` into VirtualizedList.
  - Adapter cannot rely on a `numColumns` prop.

3. **Grid mode detection via `getItem` / `getItemCount` (one-time use)**
  - Use `getItem(data, 0)` to determine if it returns an array (grid mode).
  - Derive `numColumns` from the returned array length.
  - `getItem`/`getItemCount` should be used ONLY for this grid detection step.
  - All other logic must continue using the existing adapter data flow.

4. **GridLayoutProvider span behavior**
  - Set `maxSpan = numColumns`.
  - Use `getSpan(index) = 1` for each item to achieve `numColumns` items per row.
  - Do NOT set `span = numColumns` unless the intent is a full-width item.

5. **Reuse app-provided layoutProvider for grid layout**
   - `getLayoutType(index)` for GridLayoutProvider must use the existing app layoutProvider flow
     (same logic as current `RNWLayoutProvider.getLayoutTypeForIndex`).
   - `getHeightOrWidth(index)` for GridLayoutProvider must use the existing app layoutProvider
     dimension resolution (same logic as `RNWLayoutProvider.getDimensionForType`).
   - Do not introduce a new layout calculation path; reuse current adapter logic.

6. **Primary test harness**
   - Use `packages/react-native-web-examples/pages/flatlist-optimized-grid/index.js`
     to validate legacy mode remains unchanged and RLV grid mode works.

---

## Assumptions to Confirm Before Implementation

1. **Grid mode detection**
   - Detect grid by calling `getItem(data, 0)` once and treating an array result as grid.

2. **Span strategy**
   - In GridLayoutProvider, use `maxSpan = numColumns` and `getSpan(index) = 1` for all items.

3. **Header/Footer handling**
   - Keep header/footer rendered outside of the grid (current behavior), not as grid items.

4. **Separators in grid mode**
   - Keep current separator behavior (no grid-aware row/column separators) for initial version.

5. **Item sizing fallback**
   - If app does not provide `layoutProvider` or `getItemLayout`, use existing fallback sizing.

