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

const __DEV__ = process.env.NODE_ENV !== 'production';

function ensureRLVLoaded() {
  if (RecyclerListView) return;
  
  try {
    const rlv = require('recyclerlistview');
    RecyclerListView = rlv.RecyclerListView;
    RLVDataProvider = rlv.DataProvider;
    RLVLayoutProvider = rlv.LayoutProvider;
  } catch (e) {
    if (__DEV__) {
      console.warn('[RNW-RLV] Failed to load RecyclerListView:', e.message);
    }
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

/**
 * DataProvider wrapper that bridges RNW data to RLV DataProvider
 * Wraps data with synthetic header and footer items for unified virtualization
 */
class RNWDataProvider {
  _data: any;
  _rowHasChanged: (r1: any, r2: any) => boolean;
  _rlvDataProvider: any;
  _hasHeader: boolean;
  _hasFooter: boolean;
  _wrappedData: any;

  constructor(data, rowHasChanged, hasHeader = false, hasFooter = false) {
    ensureRLVLoaded();
    
    this._data = data || [];
    this._rowHasChanged = rowHasChanged || ((r1, r2) => r1 !== r2);
    this._hasHeader = hasHeader;
    this._hasFooter = hasFooter;
    this._wrappedData = [];

    // Create RLV DataProvider with comparator that handles synthetic items
    this._rlvDataProvider = new RLVDataProvider((r1, r2) => {
      // empty items never change (they're constant)
      if (r1.type === 'header' || r1.type === 'footer' || r1.type === 'empty') return false;
      if (r2.type === 'header' || r2.type === 'footer' || r2.type === 'empty') return false;
      // Real items use provided comparator
      return this._rowHasChanged(r1.data || r1, r2.data || r2);
    });

    // Initialize with data
    this._updateData(data);
  }

  _wrapData(data) {
    const wrapped = [];
    
    // Always add synthetic header item at index 0 if present
    if (this._hasHeader) {
      wrapped.push({ type: 'header', data: null });
    }
    
    // Add real items or empty placeholder
    if (Array.isArray(data) && data.length > 0) {
      // Add all real items
      data.forEach((item) => {
        wrapped.push({ type: 'item', data: item });
      });
    } else {
      // Always add empty row when data is empty, regardless of ListEmptyComponent
      wrapped.push({ type: 'empty', data: null });
    }
    
    // Always add synthetic footer item at end if present
    if (this._hasFooter) {
      wrapped.push({ type: 'footer', data: null });
    }
    
    return wrapped;
  }

  _updateData(data) {
    this._data = data || [];
    this._wrappedData = this._wrapData(this._data);
    // $FlowFixMe
    this._rlvDataProvider = this._rlvDataProvider.cloneWithRows(this._wrappedData);
  }

  getSize() {
    return this._wrappedData.length;
  }

  getItem(index) {
    return this._wrappedData[index];
  }

  getAllData() {
    return this._wrappedData;
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
  _dataProvider: any;

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
    dataProvider = null,
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
    this._dataProvider = dataProvider;
    this._headerHeight = headerHeight;
    this._footerHeight = footerHeight;

    const self = this;

    // Create CustomRLVLayoutProvider subclass that extends RLVLayoutProvider
    class CustomRLVLayoutProvider extends RLVLayoutProvider {
      constructor(layoutType, dimension) {
        super(layoutType, dimension);
        if (__DEV__) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider constructor called');
        }
      }

      getLayoutForIndex(index) {
        if (__DEV__) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider.getLayoutForIndex called for index:', index);
        }
        return self.getLayoutForIndex(index);
      }

      getLayout(index) {
        if (__DEV__) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider.getLayout called for index:', index);
        }
        if (super.getLayout) {
          return super.getLayout(index);
        }
        return this.getLayoutForIndex(index);
      }

      getLayoutTypeForIndex(index) {
        if (__DEV__ && index < 3) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider.getLayoutTypeForIndex called for index:', index);
        }
        return super.getLayoutTypeForIndex ? super.getLayoutTypeForIndex(index) : self.getLayoutTypeForIndex(index);
      }

      getDimensionForType(type) {
        if (__DEV__) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider.getDimensionForType called for type:', type);
        }
        if (super.getDimensionForType) {
          return super.getDimensionForType(type);
        }
        return self.getDimensionForType(type);
      }

      getLayouts(startIndex, endIndex) {
        if (__DEV__) {
          console.log('[RNW-RLV] getLayouts called for range:', startIndex, '-', endIndex);
        }
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
        
        if (__DEV__) {
          console.log('[RNW-RLV] Dimensions set for type:', type, '->', { width: dim.width, height: dim.height });
        }
      }
    );

    if (__DEV__) {
      console.log('[RNW-RLV] Layout provider created:', {
        isLayoutProviderFormat,
        containerSize,
        hasHeader,
        hasFooter,
      });
    }
  }

  // Determine layout type based on index and header/footer flags
  getLayoutTypeForIndex(index) {
    // Check the wrapped data directly to determine type
    const wrappedData = this._dataProvider.getAllData();
    if (index >= 0 && index < wrappedData.length) {
      const wrappedItem = wrappedData[index];
      if (wrappedItem && wrappedItem.type) {
        return wrappedItem.type; // 'header', 'footer', 'item', or 'empty'
      }
    }
    
    // Fallback to old logic for compatibility
    if (this._hasHeader && index === 0) {
      return 'header';
    }
    
    const originalCount = this._getOriginalDataCount();
    const totalWrappedCount = (this._hasHeader ? 1 : 0) + originalCount + (this._hasFooter ? 1 : 0);
    
    if (this._hasFooter && index === totalWrappedCount - 1) {
      return 'footer';
    }
    
    return 'item';
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
        if (__DEV__) {
          console.warn('[RNW-RLV] Error in getItemLayout:', e.message);
        }
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
      
      if (__DEV__) {
        console.log('[RNW-RLV] Container size updated:', { width, height });
      }
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

  setDataProvider(dataProvider: any) {
    this._dataProvider = dataProvider;
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
      () => (data && Array.isArray(data) ? data.length : 0),  // Original data count only
      horizontal,
      50,
      50,
      this._containerSize,
      layoutProvider ? true : false,
      hasHeader,
      hasFooter,
      this._dataProvider,  // Pass data provider reference
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
      // Update layout provider's data provider reference
      if (this._layoutProvider) {
        this._layoutProvider.setDataProvider(this._dataProvider);
      }
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

  _rowRenderer = (type: any, wrappedItem: any, rlvIndex: any) => {
    const {
      renderItem,
      ListItemComponent,
      ItemSeparatorComponent,
      ListHeaderComponent,
      ListFooterComponent,
    } = this.props;

    if (__DEV__) {
      if (rlvIndex === 0 || rlvIndex === this._dataProvider.getSize() - 1) {
        console.log('[RNW-RLV] _rowRenderer called for rlvIndex:', rlvIndex, 'type:', wrappedItem.type);
      }
    }

    // Handle synthetic header item
    if (wrappedItem.type === 'header') {
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
    if (wrappedItem.type === 'footer') {
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

    // Handle empty list indicator (always rendered when data is empty)
    const { ListEmptyComponent } = this.props;
    if (wrappedItem.type === 'empty') {
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
    // Calculate original item index: subtract 1 for header if present
    const hasHeader = this._layoutProvider._hasHeader;
    const originalItemIndex = hasHeader ? rlvIndex - 1 : rlvIndex;
    const item = wrappedItem.data;

    // Only render separator before items (not before header)
    const originalDataLength = item && this._dataProvider._data ? this._dataProvider._data.length : 0;
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
    
    if (__DEV__) {
      console.log('[RNW-RLV] Container layout:', { width, height });
    }
    
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
          if (__DEV__) {
            console.log('[RNW-RLV] Measured header height:', this._headerHeight);
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[RNW-RLV] Failed to measure header:', e);
        }
      }
    }

    if (hasFooter && this._footerRef && !this._footerMeasured) {
      try {
        const node = this._footerRef;
        if (node && node.getBoundingClientRect) {
          this._footerHeight = node.getBoundingClientRect().height;
          this._footerMeasured = true;
          if (__DEV__) {
            console.log('[RNW-RLV] Measured footer height:', this._footerHeight);
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[RNW-RLV] Failed to measure footer:', e);
        }
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
          
          if (__DEV__) {
            console.log('[RNW-RLV] Container measured:', { 
              width: rect.width, 
              height: rect.height 
            });
          }
          
          // Mark that we have container size
          if (!this.state.hasContainerSize) {
            this.setState({ hasContainerSize: true });
          }
        }
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[RNW-RLV] Failed to measure container:', e);
      }
    }
  };

  render(): React.Node {
    // Don't render on server side - RecyclerListView only works in browser
    if (typeof window === 'undefined') {
      // Return a simple placeholder for SSR
      return <View style={this.props.style} />;
    }
    
    if (__DEV__) {
      console.log('[RNW-RLV] VirtualizedListRLVAdapter.render() starting');
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
    
    if (__DEV__) {
      console.log('[RNW-RLV] RecyclerListView loaded:', {
        hasRecyclerListView: !!RecyclerListView,
        RecyclerListViewName: RecyclerListView?.name,
      });
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

    if (__DEV__) {
      console.log('[RNW-RLV] render() called with:', {
        itemCount,
        hasLayoutProvider: !!this._layoutProvider,
        hasRLVLayoutProvider: !!this._layoutProvider?._rlvLayoutProvider,
        hasContainerSize: this.state.hasContainerSize,
        containerSize: this._containerSize,
      });
    }

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
