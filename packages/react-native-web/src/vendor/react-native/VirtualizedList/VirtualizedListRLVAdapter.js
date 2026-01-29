/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use client';

import * as React from 'react';
import View from '../../../exports/View';
import StyleSheet from '../../../exports/StyleSheet';
import ViewabilityHelper from '../ViewabilityHelper';
import memoizeOne from 'memoize-one';

// Lazy imports - only loaded when needed to support SSR/Next.js
let RecyclerListView, RLVDataProvider, RLVLayoutProvider;

function ensureRLVLoaded() {
  if (RecyclerListView) return;
  
  try {
    const rlv = require('recyclerlistview');
    RecyclerListView = rlv.RecyclerListView;
    RLVDataProvider = rlv.DataProvider;
    RLVLayoutProvider = rlv.LayoutProvider;
  } catch (e) {
    throw new Error(
      'RecyclerListView failed to load. This component requires recyclerlistview package.'
    );
  }
}

type Props = any; // VirtualizedList props
type State = {
  contentLength: number,
  visibleLength: number,
  offset: number,
  timestamp: number,
};

const DEFAULT_RENDER_AHEAD_OFFSET = 0;
const DEFAULT_MAX_TO_RENDER_PER_BATCH = 10;
const DEFAULT_INITIAL_NUM_TO_RENDER = 10;
const DEFAULT_WINDOW_SIZE = 21;

/**
 * Normalizes RecyclerListView scroll events to React Native Web format
 */
function normalizeScrollEvent(offset, contentSize, visibleSize) {
  return {
    nativeEvent: {
      contentOffset: {
        x: offset.x || 0,
        y: offset.y || 0,
      },
      contentSize: {
        height: contentSize.height || 0,
        width: contentSize.width || 0,
      },
      layoutMeasurement: {
        height: visibleSize.height || 0,
        width: visibleSize.width || 0,
      },
    },
    timeStamp: Date.now(),
  };
}

function getTotalSize(dataLength, hasHeader, hasFooter) {
  const hasData = dataLength > 0;
  let size = dataLength;
  if (hasHeader) size += 1;
  if (hasFooter) size += 1;
  if (!hasData) size += 1; // Empty placeholder
  return size;
}

function getItemMetaForIndex(index, dataLength, hasHeader, hasFooter) {
  const hasData = dataLength > 0;

  if (hasHeader && index === 0) {
    return { type: 'header', dataIndex: null };
  }

  if (hasData) {
    const dataStartIndex = hasHeader ? 1 : 0;
    const dataEndIndex = dataStartIndex + dataLength;

    if (index >= dataStartIndex && index < dataEndIndex) {
      return { type: 'item', dataIndex: index - dataStartIndex };
    }

    if (hasFooter && index === dataEndIndex) {
      return { type: 'footer', dataIndex: null };
    }

    return { type: 'empty', dataIndex: null };
  }

  const emptyIndex = hasHeader ? 1 : 0;
  if (index === emptyIndex) {
    return { type: 'empty', dataIndex: null };
  }

  if (hasFooter && index === emptyIndex + 1) {
    return { type: 'footer', dataIndex: null };
  }

  return { type: 'empty', dataIndex: null };
}

/**
 * DataProvider wrapper that bridges RNW data to RLV DataProvider
 * Uses index mapping for header/footer/items (no per-item wrapping)
 */
class RNWDataProvider {
  _data: any;
  _rowHasChanged: (r1: any, r2: any) => boolean;
  _rlvDataProvider: any;
  _hasHeader: boolean;
  _hasFooter: boolean;
  _dataLength: number;
  _prevData: any;
  _prevDataLength: number;
  _prevHasHeader: boolean;
  _prevHasFooter: boolean;
  _indexRows: any;

  constructor(data, rowHasChanged, hasHeader, hasFooter) {
    ensureRLVLoaded();

    this._data = data || [];
    this._rowHasChanged = rowHasChanged || ((r1, r2) => r1 !== r2);
    this._hasHeader = hasHeader;
    this._hasFooter = hasFooter;
    this._dataLength = Array.isArray(this._data) ? this._data.length : 0;
    this._prevData = this._data;
    this._prevDataLength = this._dataLength;
    this._prevHasHeader = hasHeader;
    this._prevHasFooter = hasFooter;
    this._indexRows = [];

    this._rlvDataProvider = new RLVDataProvider((r1, r2) => {
      const index = typeof r2 === 'number' ? r2 : r1;
      if (typeof index !== 'number') return false;

      const prevMeta = getItemMetaForIndex(
        index,
        this._prevDataLength,
        this._prevHasHeader,
        this._prevHasFooter,
      );

      const nextMeta = getItemMetaForIndex(
        index,
        this._dataLength,
        this._hasHeader,
        this._hasFooter,
      );

      if (prevMeta.type !== nextMeta.type) return true;
      if (nextMeta.type !== 'item') return false;

      const prevItem = Array.isArray(this._prevData)
        ? this._prevData[prevMeta.dataIndex]
        : undefined;
      const nextItem = Array.isArray(this._data)
        ? this._data[nextMeta.dataIndex]
        : undefined;

      return this._rowHasChanged(prevItem, nextItem);
    });

    this._updateData(data);
  }

  _updateData(data) {
    this._prevData = this._data;
    this._prevDataLength = this._dataLength;
    this._prevHasHeader = this._hasHeader;
    this._prevHasFooter = this._hasFooter;

    this._data = data || [];
    this._dataLength = Array.isArray(this._data) ? this._data.length : 0;

    const size = getTotalSize(this._dataLength, this._hasHeader, this._hasFooter);
    this._indexRows = new Array(size);
    for (let i = 0; i < size; i += 1) {
      this._indexRows[i] = i;
    }

    this._rlvDataProvider = this._rlvDataProvider.cloneWithRows(this._indexRows);
  }

  getSize() {
    return getTotalSize(this._dataLength, this._hasHeader, this._hasFooter);
  }

  getItem(index) {
    const meta = getItemMetaForIndex(
      index,
      this._dataLength,
      this._hasHeader,
      this._hasFooter,
    );

    if (meta.type === 'item') {
      return this._data[meta.dataIndex];
    }

    return { __rnwRLVType: meta.type };
  }

  getRLVDataProvider() {
    return this._rlvDataProvider;
  }

  cloneWithRows(data, rowHasChanged) {
    const newProvider = new RNWDataProvider(
      data,
      rowHasChanged || this._rowHasChanged,
      this._hasHeader,
      this._hasFooter,
    );
    return newProvider;
  }

  setHasHeader(hasHeader) {
    if (this._hasHeader !== hasHeader) {
      this._hasHeader = hasHeader;
      this._updateData(this._data);
    }
  }

  setHasFooter(hasFooter) {
    if (this._hasFooter !== hasFooter) {
      this._hasFooter = hasFooter;
      this._updateData(this._data);
    }
  }
}

/**
 * LayoutProvider wrapper for converting RNW getItemLayout to RLV format
 * Supports multiple layout types: 'header', 'item', 'footer'
 * Properly extends RLVLayoutProvider to work with RecyclerListView
 */
class RNWLayoutProvider {
  _getItemLayout: any;
  _getOriginalDataCount: () => number;
  _horizontal: boolean;
  _estimatedItemHeight: number;
  _estimatedItemWidth: number;
  _rlvLayoutProvider: any;
  _containerSize: { width: number, height: number };
  _layoutDimensions: Map<string, any>;
  _isLayoutProviderFormat: boolean;
  _hasHeader: boolean;
  _hasFooter: boolean;
  _dimensionCallback: any;

  constructor(
    getItemLayout,
    getOriginalDataCount,
    horizontal = false,
    estimatedItemHeight = 50,
    estimatedItemWidth = 50,
    containerSize = { width: 800, height: 600 },
    isLayoutProviderFormat = false,
    hasHeader = false,
    hasFooter = false,
    headerHeight = 250,
    footerHeight = 60,
  ) {
    ensureRLVLoaded();
    
    this._getItemLayout = getItemLayout;
    this._getOriginalDataCount = getOriginalDataCount;
    this._horizontal = horizontal;
    this._estimatedItemHeight = estimatedItemHeight;
    this._estimatedItemWidth = estimatedItemWidth;
    this._containerSize = containerSize;
    this._layoutDimensions = new Map();
    this._isLayoutProviderFormat = isLayoutProviderFormat;
    this._hasHeader = hasHeader;
    this._hasFooter = hasFooter;
    this._dimensionCallback = null;
    this._headerHeight = headerHeight;
    this._footerHeight = footerHeight;

    const self = this;

    // Create CustomRLVLayoutProvider subclass that extends RLVLayoutProvider
    class CustomRLVLayoutProvider extends RLVLayoutProvider {
      constructor(layoutType, dimension) {
        super(layoutType, dimension);
      }

      getLayoutForIndex(index) {
        return self.getLayoutForIndex(index);
      }

      getLayout(index) {
        if (super.getLayout) {
          return super.getLayout(index);
        }
        return this.getLayoutForIndex(index);
      }

      getLayoutTypeForIndex(index) {
        return super.getLayoutTypeForIndex ? super.getLayoutTypeForIndex(index) : self.getLayoutTypeForIndex(index);
      }

      getDimensionForType(type) {
        if (super.getDimensionForType) {
          return super.getDimensionForType(type);
        }
        return self.getDimensionForType(type);
      }

      getLayouts(startIndex, endIndex) {
        if (super.getLayouts) {
          return super.getLayouts(startIndex, endIndex);
        }
        return undefined;
      }
    }

    // Create instance with layoutTypeFunction that handles 3 types
    this._rlvLayoutProvider = new CustomRLVLayoutProvider(
      (index) => self.getLayoutTypeForIndex(index),  // Return 'header', 'item', or 'footer'
      (type, dim) => {
        // Dimension callback for each layout type
        const dimensions = self.getDimensionForType(type);
        dim.width = dimensions.width;
        dim.height = dimensions.height;
      }
    );
  }

  // Determine layout type based on index mapping
  getLayoutTypeForIndex(index) {
    const dataLength = this._getOriginalDataCount();
    const meta = getItemMetaForIndex(index, dataLength, this._hasHeader, this._hasFooter);
    return meta.type;
  }

  // Return dimensions for a given layout type
  getDimensionForType(type) {
    let width = this._containerSize.width || 50;
    let height = 50;

    // Header/footer heights come from measured components
    if (type === 'header') {
      return { width: this._containerSize.width, height: this._headerHeight };
    }
    if (type === 'footer') {
      return { width: this._containerSize.width, height: this._footerHeight };
    }

    // For regular items, use getItemLayout with index 0 (first real item)
    if (this._getItemLayout) {
      try {
        // For layoutProvider format: layoutProvider(index)
        // For getItemLayout format: getItemLayout(data, index)
        const result = this._isLayoutProviderFormat 
          ? this._getItemLayout(0)
          : this._getItemLayout(null, 0);
        if (result) {
          if (this._isLayoutProviderFormat) {
            if (result.width !== undefined) {
              if (typeof result.width === 'string' && result.width === '100%') {
                width = this._containerSize.width;
              } else if (typeof result.width === 'number') {
                width = result.width;
              }
            }
            if (result.height !== undefined) {
              height = result.height;
            }
          } else {
            if (result.width !== undefined) {
              if (typeof result.width === 'string' && result.width === '100%') {
                width = this._containerSize.width;
              } else if (typeof result.width === 'number') {
                width = result.width;
              }
            }
            if (result.length !== undefined) {
              height = result.length;
            } else if (result.height !== undefined) {
              height = result.height;
            }
          }
        }
      } catch (e) {
      }
    }

    // For empty state, calculate height to fill remaining space after header/footer
    if (type === 'empty') {
      const headerHeight = this._headerHeight || 0;
      const footerHeight = this._footerHeight || 0;
      const containerHeight = this._containerSize.height || 50;
      const emptyHeight = Math.max(containerHeight - headerHeight - footerHeight, 50);
      return { width: this._containerSize.width, height: emptyHeight };
    }

    return { 
      width: Math.max(width, 1), 
      height: Math.max(height, 1) 
    };
  }

  setContainerSize(width: number, height: number) {
    if (this._containerSize.width !== width || this._containerSize.height !== height) {
      this._containerSize = { width, height };
    }
  }

  setHasHeader(hasHeader: boolean) {
    if (this._hasHeader !== hasHeader) {
      this._hasHeader = hasHeader;
    }
  }

  setHasFooter(hasFooter: boolean) {
    if (this._hasFooter !== hasFooter) {
      this._hasFooter = hasFooter;
    }
  }

  _getItemLayoutProvider() {
    return this._rlvLayoutProvider;
  }
}

/**
 * VirtualizedListRLVAdapter: Bridges React Native Web's VirtualizedList API
 * to RecyclerListView for superior virtualization performance on web
 */
class VirtualizedListRLVAdapter extends React.PureComponent<Props, State> {
  _listRef: any;
  _dataProvider: RNWDataProvider;
  _layoutProvider: RNWLayoutProvider;
  _scrollEventLastTick: number = 0;
  _viewabilityHelper: any;
  _onViewableItemsChanged: any;
  _hasInteracted: boolean = false;
  _containerRef: any = null;
  _containerSize: { width: number, height: number } = { width: 0, height: 0 };
  _scrollMetrics: { contentLength: number, visibleLength: number, offset: number, timestamp: number } = {
    contentLength: 0,
    visibleLength: 0,
    offset: 0,
    timestamp: 0,
  };
  _headerRef: any = null;
  _footerRef: any = null;
  _headerHeight: number = 0;
  _footerHeight: number = 0;
  _headerMeasured: boolean = false;
  _footerMeasured: boolean = false;
  
  state = {
    hasContainerSize: false, // Track if we have measured container dimensions
  };

  constructor(props: Props) {
    super(props);

    // Initialize providers lazily - only on client side
    this._dataProvider = null;
    this._layoutProvider = null;
    this._scrollEventLastTick = 0;
    this._viewabilityHelper = null;
    this._onViewableItemsChanged = null;
    this._hasInteracted = false;
  }

  _ensureProvidersInitialized() {
    if (this._dataProvider) return; // Already initialized
    
    const {
      data,
      rowHasChanged,
      getItemLayout,
      layoutProvider,
      onViewableItemsChanged,
      viewabilityConfig,
      viewabilityConfigCallbackPairs,
      horizontal,
      ListHeaderComponent,
      ListFooterComponent,
    } = this.props;

    // Check if we have header/footer components to virtualize
    const hasHeader = !!ListHeaderComponent;
    const hasFooter = !!ListFooterComponent;

    // Initialize data provider with header/footer flags
    // Always virtualize header/footer; empty rows are always added when data is empty
    this._dataProvider = new RNWDataProvider(data, rowHasChanged, hasHeader, hasFooter);

    // Initialize layout provider with ORIGINAL data count (not wrapped)
    this._layoutProvider = new RNWLayoutProvider(
      getItemLayout || layoutProvider,
      () => (this._dataProvider ? this._dataProvider._dataLength : 0),
      horizontal,
      50,
      50,
      this._containerSize,
      layoutProvider ? true : false,
      hasHeader,
      hasFooter,
      this._headerHeight || 250,  // Measured or fallback
      this._footerHeight || 60,   // Measured or fallback
    );

    // Initialize viewability helper if needed
    if (onViewableItemsChanged || viewabilityConfigCallbackPairs) {
      const config =
        viewabilityConfig ||
        (viewabilityConfigCallbackPairs && viewabilityConfigCallbackPairs[0]
          ? viewabilityConfigCallbackPairs[0].viewabilityConfig
          : ViewabilityHelper.DEFAULT_VIEWABILITY_CONFIG);

      this._viewabilityHelper = new ViewabilityHelper(config);
      
      // Store callback for use in scroll handler
      if (onViewableItemsChanged) {
        this._onViewableItemsChanged = onViewableItemsChanged;
      } else if (viewabilityConfigCallbackPairs && viewabilityConfigCallbackPairs[0]) {
        this._onViewableItemsChanged = viewabilityConfigCallbackPairs[0].onViewableItemsChanged;
      }
    }
  }

  componentDidMount() {
    // Measure container dimensions on mount
    if (typeof window === 'undefined') return;
    this._measureContainer();
  }

  componentDidUpdate(prevProps: Props) {
    const {
      data,
      rowHasChanged,
      onViewableItemsChanged,
      viewabilityConfig,
      viewabilityConfigCallbackPairs,
    } = this.props;

    // Update data provider if data changed
    if (data !== prevProps.data || rowHasChanged !== prevProps.rowHasChanged) {
      this._dataProvider = this._dataProvider.cloneWithRows(
        data,
        rowHasChanged,
      );
    }

    // Update viewability if callbacks changed
    if (
      onViewableItemsChanged !== prevProps.onViewableItemsChanged ||
      viewabilityConfigCallbackPairs !== prevProps.viewabilityConfigCallbackPairs
    ) {
      if (onViewableItemsChanged) {
        this._onViewableItemsChanged = onViewableItemsChanged;
      } else if (
        viewabilityConfigCallbackPairs &&
        viewabilityConfigCallbackPairs[0]
      ) {
        this._onViewableItemsChanged =
          viewabilityConfigCallbackPairs[0].onViewableItemsChanged;
      }
    }
  }



  // Public ref methods
  scrollToIndex = (params: any) => {
    const { animated, index, viewOffset = 0, viewPosition = 0 } = params || {};

    if (this._listRef && index != null) {
      this._listRef.scrollToIndex(
        index,
        animated !== false,
        viewOffset,
        viewPosition,
      );
    }
  };

  scrollToOffset = (params: any) => {
    const { animated, offset } = params || {};

    if (this._listRef && offset != null) {
      this._listRef.scrollToOffset(
        this.props.horizontal ? offset : 0,
        this.props.horizontal ? 0 : offset,
        animated !== false,
      );
    }
  };

  scrollToEnd = (params: any = {}) => {
    const { animated = true } = params;
    const size = this._dataProvider.getSize();

    if (this._listRef && size > 0) {
      this._listRef.scrollToIndex(size - 1, animated);
    }
  };

  recordInteraction = () => {
    this._hasInteracted = true;
  };

  flashScrollIndicators = () => {
    // No-op on web
  };

  getScrollResponder = () => {
    return this._listRef;
  };

  getNativeScrollRef = () => {
    return this._listRef;
  };

  getScrollableNode = () => {
    if (this._listRef && this._listRef.getScrollableNode) {
      return this._listRef.getScrollableNode();
    }
    return null;
  };

  _handleScroll = (offsetX: number, offsetY: number, rawEvent: any) => {
    const {
      onScroll,
      scrollEventThrottle = 0,
      horizontal,
    } = this.props;

    const offset = horizontal ? offsetX : offsetY;
    const now = Date.now();

    // Update scroll metrics using ref (not state) to avoid re-renders
    this._scrollMetrics.offset = offset;
    this._scrollMetrics.timestamp = now;

    // Throttle scroll events
    if (scrollEventThrottle > 0) {
      if (now - this._scrollEventLastTick < scrollEventThrottle) {
        return;
      }
    }

    this._scrollEventLastTick = now;

    // Emit normalized scroll event
    if (onScroll) {
      const event = normalizeScrollEvent(
        { x: offsetX, y: offsetY },
        this._scrollMetrics,
        { 
          height: this._scrollMetrics.visibleLength,
          width: this._scrollMetrics.visibleLength,
        },
      );
      onScroll(event);
    }

    // Update viewability
    if (this._viewabilityHelper && this._onViewableItemsChanged) {
      const { viewableItems, changed } = this._viewabilityHelper.onScroll(
        offset,
        this._scrollMetrics.visibleLength,
        this._dataProvider.getSize(),
      );

      if (viewableItems && changed) {
        this._onViewableItemsChanged({ viewableItems, changed });
      }
    }
  };

  _rowRenderer = (type: any, rowData: any, rlvIndex: any) => {
    const {
      renderItem,
      ListItemComponent,
      ItemSeparatorComponent,
      ListHeaderComponent,
      ListFooterComponent,
      ListEmptyComponent,
    } = this.props;

    const dataLength = this._dataProvider._dataLength || 0;
    const hasHeader = this._layoutProvider._hasHeader;
    const hasFooter = this._layoutProvider._hasFooter;
    const meta = getItemMetaForIndex(rlvIndex, dataLength, hasHeader, hasFooter);

    // Handle synthetic header item
    if (meta.type === 'header') {
      return (
        <View style={styles.cellContainer}>
          {typeof ListHeaderComponent === 'function' ? (
            <ListHeaderComponent />
          ) : (
            ListHeaderComponent
          )}
        </View>
      );
    }

    // Handle synthetic footer item
    if (meta.type === 'footer') {
      return (
        <View style={styles.cellContainer}>
          {typeof ListFooterComponent === 'function' ? (
            <ListFooterComponent />
          ) : (
            ListFooterComponent
          )}
        </View>
      );
    }

    // Handle empty list indicator
    if (meta.type === 'empty') {
      return (
        <View style={styles.cellContainer}>
          {ListEmptyComponent ? (
            typeof ListEmptyComponent === 'function' ? (
              <ListEmptyComponent />
            ) : (
              ListEmptyComponent
            )
          ) : (
            // Default empty state if no ListEmptyComponent provided
            <View style={{ flex: 1 }} />
          )}
        </View>
      );
    }

    // Handle real data items
    const originalItemIndex = meta.dataIndex;
    const item = Array.isArray(this._dataProvider._data)
      ? this._dataProvider._data[originalItemIndex]
      : null;

    // Only render separator before items (not before header)
    const originalDataLength = this._dataProvider._dataLength || 0;
    const shouldRenderSeparator = ItemSeparatorComponent && originalItemIndex < originalDataLength - 1;

    let content = null;

    if (renderItem) {
      content = renderItem({
        item,
        index: originalItemIndex,
        separators: {
          highlight: () => {},
          unhighlight: () => {},
          updateProps: () => {},
        },
      });
    } else if (ListItemComponent) {
      content = <ListItemComponent item={item} index={originalItemIndex} />;
    }

    return (
      <View
        key={`item-${originalItemIndex}`}
        data-rnw-focusable={item?.isTVSelectable ? 'true' : undefined}
        style={styles.cellContainer}
      >
        {content}
        {shouldRenderSeparator && (
          <View style={styles.separator}>
            <ItemSeparatorComponent highlighted={false} />
          </View>
        )}
      </View>
    );
  };

  _captureRef = (ref: any) => {
    this._listRef = ref;
  };

  _captureContainerRef = (ref: any) => {
    this._containerRef = ref;
  };

  _handleContainerLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    this._containerSize = { width, height };

    // Update layout provider if dimensions changed
    if (this._layoutProvider) {
      this._layoutProvider.setContainerSize(width, height);
    }
    
    // Mark that we have container size
    if (!this.state.hasContainerSize && width > 0 && height > 0) {
      this.setState({ hasContainerSize: true });
    }
  };

  _measureHeaderFooterHeights = (hasHeader: boolean, hasFooter: boolean) => {
    if (hasHeader && this._headerRef && !this._headerMeasured) {
      try {
        const node = this._headerRef;
        if (node && node.getBoundingClientRect) {
          this._headerHeight = node.getBoundingClientRect().height;
          this._headerMeasured = true;
        }
      } catch (e) {
      }
    }

    if (hasFooter && this._footerRef && !this._footerMeasured) {
      try {
        const node = this._footerRef;
        if (node && node.getBoundingClientRect) {
          this._footerHeight = node.getBoundingClientRect().height;
          this._footerMeasured = true;
        }
      } catch (e) {
      }
    }
  };

  _measureContainer = () => {
    if (!this._containerRef || typeof window === 'undefined') return;
    
    try {
      const node = this._containerRef;
      if (node && node.getBoundingClientRect) {
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this._containerSize = { width: rect.width, height: rect.height };
          if (this._layoutProvider) {
            this._layoutProvider.setContainerSize(rect.width, rect.height);
          }

          // Mark that we have container size
          if (!this.state.hasContainerSize) {
            this.setState({ hasContainerSize: true });
          }
        }
      }
    } catch (e) {
    }
  };

  render(): React.Node {
    // Don't render on server side - RecyclerListView only works in browser
    if (typeof window === 'undefined') {
      // Return a simple placeholder for SSR
      return <View style={this.props.style} />;
    }
    
    // Ensure providers are initialized (only on client)
    this._ensureProvidersInitialized();
    ensureRLVLoaded();
    
    const hasHeader = this._layoutProvider._hasHeader;
    const hasFooter = this._layoutProvider._hasFooter;
    
    // Measure header/footer if needed  
    if ((hasHeader || hasFooter) && this.state.hasContainerSize) {
      this._measureHeaderFooterHeights(hasHeader, hasFooter);
    }
    
    const {
      style,
      contentContainerStyle,
      scrollEnabled = true,
      horizontal = false,
      inverted = false,
      ListEmptyComponent,
      ListHeaderComponent,
      ListFooterComponent,
      showsHorizontalScrollIndicator = true,
      showsVerticalScrollIndicator = true,
      nestedScrollEnabled = true,
      scrollEventThrottle,
    } = this.props;

    const dataProvider = this._dataProvider.getRLVDataProvider();
    const itemCount = this._dataProvider.getSize();

    // Show empty component if no items (only if no header/footer)
    // In RLV mode with header/footer, always render the list even if empty
    
    // Only show plain empty component in legacy mode (no header/footer, no virtualized empty row)
    // Actually, with our new approach, empty rows are always virtualized so this check is no longer needed
    // Legacy databases will have header/footer, so we never hit this path in practice.

    // Container style with flex: 1
    const containerStyle = [styles.container, style];
    
    const listContainerStyle = Object.assign(
      {},
      styles.listContainer,
      contentContainerStyle,
      { flex: 1 },
    );

    const scrollProps = {
      scrollEnabled,
      horizontal,
      inverted,
      showsHorizontalScrollIndicator,
      showsVerticalScrollIndicator,
      nestedScrollEnabled,
    };

    return (
      <View 
        ref={this._captureContainerRef}
        onLayout={this._handleContainerLayout}
        style={containerStyle}
      >
        {/* Offscreen header/footer for measurement - only render once until measured */}
        {hasHeader && ListHeaderComponent && !this._headerMeasured && (
          <View 
            ref={(ref) => { this._headerRef = ref; }}
            style={styles.measurementContainer}
          >
            {typeof ListHeaderComponent === 'function' ? (
              <ListHeaderComponent />
            ) : (
              ListHeaderComponent
            )}
          </View>
        )}
        {hasFooter && ListFooterComponent && !this._footerMeasured && (
          <View 
            ref={(ref) => { this._footerRef = ref; }}
            style={styles.measurementContainer}
          >
            {typeof ListFooterComponent === 'function' ? (
              <ListFooterComponent />
            ) : (
              ListFooterComponent
            )}
          </View>
        )}
        
        {!this.state.hasContainerSize ? (
          // Don't render RecyclerListView until we have container dimensions
          <View style={{ flex: 1 }} />
        ) : (
          <RecyclerListView
            key="rlv-with-size"
            ref={this._captureRef}
            dataProvider={dataProvider}
            layoutProvider={this._layoutProvider._rlvLayoutProvider}
            rowRenderer={this._rowRenderer}
            onScroll={this._handleScroll}
            scrollViewProps={scrollProps}
            extendedState={this.props.extraData}
            style={listContainerStyle}
            canChangeSize={false}
            renderAheadOffset={DEFAULT_RENDER_AHEAD_OFFSET}
            isHorizontal={horizontal}
          />
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  cellContainer: {
    width: '100%',
  },
  separator: {
    width: '100%',
  },
  measurementContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: -1000,
  },
});

export default VirtualizedListRLVAdapter;
