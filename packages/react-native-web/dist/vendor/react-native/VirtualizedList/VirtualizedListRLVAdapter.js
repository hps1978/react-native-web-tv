/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

'use client';

import * as React from 'react';
import View from '../../../exports/View';
import StyleSheet from '../../../exports/StyleSheet';
import ViewabilityHelper from '../ViewabilityHelper';
import memoizeOne from 'memoize-one';

// Lazy imports - only loaded when needed to support SSR/Next.js
var RecyclerListView, RLVDataProvider, RLVLayoutProvider;
var __DEV__ = process.env.NODE_ENV !== 'production';
function ensureRLVLoaded() {
  if (RecyclerListView) return;
  try {
    var rlv = require('recyclerlistview');
    RecyclerListView = rlv.RecyclerListView;
    RLVDataProvider = rlv.DataProvider;
    RLVLayoutProvider = rlv.LayoutProvider;
  } catch (e) {
    if (__DEV__) {
      console.warn('[RNW-RLV] Failed to load RecyclerListView:', e.message);
    }
    throw new Error('RecyclerListView failed to load. This component requires recyclerlistview package.');
  }
}

// VirtualizedList props

var DEFAULT_RENDER_AHEAD_OFFSET = 0;
var DEFAULT_MAX_TO_RENDER_PER_BATCH = 10;
var DEFAULT_INITIAL_NUM_TO_RENDER = 10;
var DEFAULT_WINDOW_SIZE = 21;

/**
 * Normalizes RecyclerListView scroll events to React Native Web format
 */
function normalizeScrollEvent(offset, contentSize, visibleSize) {
  return {
    nativeEvent: {
      contentOffset: {
        x: offset.x || 0,
        y: offset.y || 0
      },
      contentSize: {
        height: contentSize.height || 0,
        width: contentSize.width || 0
      },
      layoutMeasurement: {
        height: visibleSize.height || 0,
        width: visibleSize.width || 0
      }
    },
    timeStamp: Date.now()
  };
}

/**
 * DataProvider wrapper that bridges RNW data to RLV DataProvider
 * Wraps data with synthetic header and footer items for unified virtualization
 */
class RNWDataProvider {
  constructor(data, rowHasChanged, hasHeader, hasFooter) {
    if (hasHeader === void 0) {
      hasHeader = false;
    }
    if (hasFooter === void 0) {
      hasFooter = false;
    }
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
    var wrapped = [];

    // Always add synthetic header item at index 0 if present
    if (this._hasHeader) {
      wrapped.push({
        type: 'header',
        data: null
      });
    }

    // Add real items or empty placeholder
    if (Array.isArray(data) && data.length > 0) {
      // Add all real items
      data.forEach(item => {
        wrapped.push({
          type: 'item',
          data: item
        });
      });
    } else {
      // Always add empty row when data is empty, regardless of ListEmptyComponent
      wrapped.push({
        type: 'empty',
        data: null
      });
    }

    // Always add synthetic footer item at end if present
    if (this._hasFooter) {
      wrapped.push({
        type: 'footer',
        data: null
      });
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
    var newProvider = new RNWDataProvider(data, rowHasChanged || this._rowHasChanged, this._hasHeader, this._hasFooter);
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
  constructor(getItemLayout, getOriginalDataCount, horizontal, estimatedItemHeight, estimatedItemWidth, containerSize, isLayoutProviderFormat, hasHeader, hasFooter, dataProvider, headerHeight, footerHeight) {
    if (horizontal === void 0) {
      horizontal = false;
    }
    if (estimatedItemHeight === void 0) {
      estimatedItemHeight = 50;
    }
    if (estimatedItemWidth === void 0) {
      estimatedItemWidth = 50;
    }
    if (containerSize === void 0) {
      containerSize = {
        width: 800,
        height: 600
      };
    }
    if (isLayoutProviderFormat === void 0) {
      isLayoutProviderFormat = false;
    }
    if (hasHeader === void 0) {
      hasHeader = false;
    }
    if (hasFooter === void 0) {
      hasFooter = false;
    }
    if (dataProvider === void 0) {
      dataProvider = null;
    }
    if (headerHeight === void 0) {
      headerHeight = 250;
    }
    if (footerHeight === void 0) {
      footerHeight = 60;
    }
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
    var self = this;

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
    this._rlvLayoutProvider = new CustomRLVLayoutProvider(index => self.getLayoutTypeForIndex(index),
    // Return 'header', 'item', or 'footer'
    (type, dim) => {
      // Dimension callback for each layout type
      var dimensions = self.getDimensionForType(type);
      dim.width = dimensions.width;
      dim.height = dimensions.height;
      if (__DEV__) {
        console.log('[RNW-RLV] Dimensions set for type:', type, '->', {
          width: dim.width,
          height: dim.height
        });
      }
    });
    if (__DEV__) {
      console.log('[RNW-RLV] Layout provider created:', {
        isLayoutProviderFormat,
        containerSize,
        hasHeader,
        hasFooter
      });
    }
  }

  // Determine layout type based on index and header/footer flags
  getLayoutTypeForIndex(index) {
    // Check the wrapped data directly to determine type
    var wrappedData = this._dataProvider.getAllData();
    if (index >= 0 && index < wrappedData.length) {
      var wrappedItem = wrappedData[index];
      if (wrappedItem && wrappedItem.type) {
        return wrappedItem.type; // 'header', 'footer', 'item', or 'empty'
      }
    }

    // Fallback to old logic for compatibility
    if (this._hasHeader && index === 0) {
      return 'header';
    }
    var originalCount = this._getOriginalDataCount();
    var totalWrappedCount = (this._hasHeader ? 1 : 0) + originalCount + (this._hasFooter ? 1 : 0);
    if (this._hasFooter && index === totalWrappedCount - 1) {
      return 'footer';
    }
    return 'item';
  }

  // Return dimensions for a given layout type
  getDimensionForType(type) {
    var width = this._containerSize.width || 50;
    var height = 50;

    // Header/footer heights come from measured components
    if (type === 'header') {
      return {
        width: this._containerSize.width,
        height: this._headerHeight
      };
    }
    if (type === 'footer') {
      return {
        width: this._containerSize.width,
        height: this._footerHeight
      };
    }

    // For regular items, use getItemLayout with index 0 (first real item)
    if (this._getItemLayout) {
      try {
        // For layoutProvider format: layoutProvider(index)
        // For getItemLayout format: getItemLayout(data, index)
        var result = this._isLayoutProviderFormat ? this._getItemLayout(0) : this._getItemLayout(null, 0);
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
      var headerHeight = this._headerHeight || 0;
      var footerHeight = this._footerHeight || 0;
      var containerHeight = this._containerSize.height || 50;
      var emptyHeight = Math.max(containerHeight - headerHeight - footerHeight, 50);
      return {
        width: this._containerSize.width,
        height: emptyHeight
      };
    }
    return {
      width: Math.max(width, 1),
      height: Math.max(height, 1)
    };
  }
  setContainerSize(width, height) {
    if (this._containerSize.width !== width || this._containerSize.height !== height) {
      this._containerSize = {
        width,
        height
      };
      if (__DEV__) {
        console.log('[RNW-RLV] Container size updated:', {
          width,
          height
        });
      }
    }
  }
  setHasHeader(hasHeader) {
    if (this._hasHeader !== hasHeader) {
      this._hasHeader = hasHeader;
    }
  }
  setHasFooter(hasFooter) {
    if (this._hasFooter !== hasFooter) {
      this._hasFooter = hasFooter;
    }
  }
  setDataProvider(dataProvider) {
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
class VirtualizedListRLVAdapter extends React.PureComponent {
  constructor(props) {
    var _this;
    // Initialize providers lazily - only on client side
    super(props);
    _this = this;
    this._scrollEventLastTick = 0;
    this._hasInteracted = false;
    this._containerRef = null;
    this._containerSize = {
      width: 0,
      height: 0
    };
    this._scrollMetrics = {
      contentLength: 0,
      visibleLength: 0,
      offset: 0,
      timestamp: 0
    };
    this._headerRef = null;
    this._footerRef = null;
    this._headerHeight = 0;
    this._footerHeight = 0;
    this._headerMeasured = false;
    this._footerMeasured = false;
    this.state = {
      hasContainerSize: false // Track if we have measured container dimensions
    };
    // Public ref methods
    this.scrollToIndex = params => {
      var _ref = params || {},
        animated = _ref.animated,
        index = _ref.index,
        _ref$viewOffset = _ref.viewOffset,
        viewOffset = _ref$viewOffset === void 0 ? 0 : _ref$viewOffset,
        _ref$viewPosition = _ref.viewPosition,
        viewPosition = _ref$viewPosition === void 0 ? 0 : _ref$viewPosition;
      if (this._listRef && index != null) {
        this._listRef.scrollToIndex(index, animated !== false, viewOffset, viewPosition);
      }
    };
    this.scrollToOffset = params => {
      var _ref2 = params || {},
        animated = _ref2.animated,
        offset = _ref2.offset;
      if (this._listRef && offset != null) {
        this._listRef.scrollToOffset(this.props.horizontal ? offset : 0, this.props.horizontal ? 0 : offset, animated !== false);
      }
    };
    this.scrollToEnd = function (params) {
      if (params === void 0) {
        params = {};
      }
      var _params = params,
        _params$animated = _params.animated,
        animated = _params$animated === void 0 ? true : _params$animated;
      var size = _this._dataProvider.getSize();
      if (_this._listRef && size > 0) {
        _this._listRef.scrollToIndex(size - 1, animated);
      }
    };
    this.recordInteraction = () => {
      this._hasInteracted = true;
    };
    this.flashScrollIndicators = () => {
      // No-op on web
    };
    this.getScrollResponder = () => {
      return this._listRef;
    };
    this.getNativeScrollRef = () => {
      return this._listRef;
    };
    this.getScrollableNode = () => {
      if (this._listRef && this._listRef.getScrollableNode) {
        return this._listRef.getScrollableNode();
      }
      return null;
    };
    this._handleScroll = (offsetX, offsetY, rawEvent) => {
      var _this$props = this.props,
        onScroll = _this$props.onScroll,
        _this$props$scrollEve = _this$props.scrollEventThrottle,
        scrollEventThrottle = _this$props$scrollEve === void 0 ? 0 : _this$props$scrollEve,
        horizontal = _this$props.horizontal;
      var offset = horizontal ? offsetX : offsetY;
      var now = Date.now();

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
        var event = normalizeScrollEvent({
          x: offsetX,
          y: offsetY
        }, this._scrollMetrics, {
          height: this._scrollMetrics.visibleLength,
          width: this._scrollMetrics.visibleLength
        });
        onScroll(event);
      }

      // Update viewability
      if (this._viewabilityHelper && this._onViewableItemsChanged) {
        var _this$_viewabilityHel = this._viewabilityHelper.onScroll(offset, this._scrollMetrics.visibleLength, this._dataProvider.getSize()),
          viewableItems = _this$_viewabilityHel.viewableItems,
          changed = _this$_viewabilityHel.changed;
        if (viewableItems && changed) {
          this._onViewableItemsChanged({
            viewableItems,
            changed
          });
        }
      }
    };
    this._rowRenderer = (type, wrappedItem, rlvIndex) => {
      var _this$props2 = this.props,
        renderItem = _this$props2.renderItem,
        ListItemComponent = _this$props2.ListItemComponent,
        ItemSeparatorComponent = _this$props2.ItemSeparatorComponent,
        ListHeaderComponent = _this$props2.ListHeaderComponent,
        ListFooterComponent = _this$props2.ListFooterComponent;
      if (__DEV__) {
        if (rlvIndex === 0 || rlvIndex === this._dataProvider.getSize() - 1) {
          console.log('[RNW-RLV] _rowRenderer called for rlvIndex:', rlvIndex, 'type:', wrappedItem.type);
        }
      }

      // Handle synthetic header item
      if (wrappedItem.type === 'header') {
        return /*#__PURE__*/React.createElement(View, {
          style: styles.cellContainer
        }, typeof ListHeaderComponent === 'function' ? /*#__PURE__*/React.createElement(ListHeaderComponent, null) : ListHeaderComponent);
      }

      // Handle synthetic footer item
      if (wrappedItem.type === 'footer') {
        return /*#__PURE__*/React.createElement(View, {
          style: styles.cellContainer
        }, typeof ListFooterComponent === 'function' ? /*#__PURE__*/React.createElement(ListFooterComponent, null) : ListFooterComponent);
      }

      // Handle empty list indicator (always rendered when data is empty)
      var ListEmptyComponent = this.props.ListEmptyComponent;
      if (wrappedItem.type === 'empty') {
        return /*#__PURE__*/React.createElement(View, {
          style: styles.cellContainer
        }, ListEmptyComponent ? typeof ListEmptyComponent === 'function' ? /*#__PURE__*/React.createElement(ListEmptyComponent, null) : ListEmptyComponent :
        /*#__PURE__*/
        // Default empty state if no ListEmptyComponent provided
        React.createElement(View, {
          style: {
            flex: 1
          }
        }));
      }

      // Handle real data items
      // Calculate original item index: subtract 1 for header if present
      var hasHeader = this._layoutProvider._hasHeader;
      var originalItemIndex = hasHeader ? rlvIndex - 1 : rlvIndex;
      var item = wrappedItem.data;

      // Only render separator before items (not before header)
      var originalDataLength = item && this._dataProvider._data ? this._dataProvider._data.length : 0;
      var shouldRenderSeparator = ItemSeparatorComponent && originalItemIndex < originalDataLength - 1;
      var content = null;
      if (renderItem) {
        content = renderItem({
          item,
          index: originalItemIndex,
          separators: {
            highlight: () => {},
            unhighlight: () => {},
            updateProps: () => {}
          }
        });
      } else if (ListItemComponent) {
        content = /*#__PURE__*/React.createElement(ListItemComponent, {
          item: item,
          index: originalItemIndex
        });
      }
      return /*#__PURE__*/React.createElement(View, {
        key: "item-" + originalItemIndex,
        "data-rnw-focusable": item != null && item.isTVSelectable ? 'true' : undefined,
        style: styles.cellContainer
      }, content, shouldRenderSeparator && /*#__PURE__*/React.createElement(View, {
        style: styles.separator
      }, /*#__PURE__*/React.createElement(ItemSeparatorComponent, {
        highlighted: false
      })));
    };
    this._captureRef = ref => {
      this._listRef = ref;
    };
    this._captureContainerRef = ref => {
      this._containerRef = ref;
    };
    this._handleContainerLayout = event => {
      var _event$nativeEvent$la = event.nativeEvent.layout,
        width = _event$nativeEvent$la.width,
        height = _event$nativeEvent$la.height;
      this._containerSize = {
        width,
        height
      };
      if (__DEV__) {
        console.log('[RNW-RLV] Container layout:', {
          width,
          height
        });
      }

      // Update layout provider if dimensions changed
      if (this._layoutProvider) {
        this._layoutProvider.setContainerSize(width, height);
      }

      // Mark that we have container size
      if (!this.state.hasContainerSize && width > 0 && height > 0) {
        this.setState({
          hasContainerSize: true
        });
      }
    };
    this._measureHeaderFooterHeights = (hasHeader, hasFooter) => {
      if (hasHeader && this._headerRef && !this._headerMeasured) {
        try {
          var node = this._headerRef;
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
          var _node = this._footerRef;
          if (_node && _node.getBoundingClientRect) {
            this._footerHeight = _node.getBoundingClientRect().height;
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
    this._measureContainer = () => {
      if (!this._containerRef || typeof window === 'undefined') return;
      try {
        var node = this._containerRef;
        if (node && node.getBoundingClientRect) {
          var rect = node.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            this._containerSize = {
              width: rect.width,
              height: rect.height
            };
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
              this.setState({
                hasContainerSize: true
              });
            }
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[RNW-RLV] Failed to measure container:', e);
        }
      }
    };
    this._dataProvider = null;
    this._layoutProvider = null;
    this._scrollEventLastTick = 0;
    this._viewabilityHelper = null;
    this._onViewableItemsChanged = null;
    this._hasInteracted = false;
  }
  _ensureProvidersInitialized() {
    if (this._dataProvider) return; // Already initialized

    var _this$props3 = this.props,
      data = _this$props3.data,
      rowHasChanged = _this$props3.rowHasChanged,
      getItemLayout = _this$props3.getItemLayout,
      layoutProvider = _this$props3.layoutProvider,
      onViewableItemsChanged = _this$props3.onViewableItemsChanged,
      viewabilityConfig = _this$props3.viewabilityConfig,
      viewabilityConfigCallbackPairs = _this$props3.viewabilityConfigCallbackPairs,
      horizontal = _this$props3.horizontal,
      ListHeaderComponent = _this$props3.ListHeaderComponent,
      ListFooterComponent = _this$props3.ListFooterComponent;

    // Check if we have header/footer components to virtualize
    var hasHeader = !!ListHeaderComponent;
    var hasFooter = !!ListFooterComponent;

    // Initialize data provider with header/footer flags
    // Always virtualize header/footer; empty rows are always added when data is empty
    this._dataProvider = new RNWDataProvider(data, rowHasChanged, hasHeader, hasFooter);

    // Initialize layout provider with ORIGINAL data count (not wrapped)
    this._layoutProvider = new RNWLayoutProvider(getItemLayout || layoutProvider, () => data && Array.isArray(data) ? data.length : 0,
    // Original data count only
    horizontal, 50, 50, this._containerSize, layoutProvider ? true : false, hasHeader, hasFooter, this._dataProvider,
    // Pass data provider reference
    this._headerHeight || 250,
    // Measured or fallback
    this._footerHeight || 60) // Measured or fallback
    ;

    // Initialize viewability helper if needed
    if (onViewableItemsChanged || viewabilityConfigCallbackPairs) {
      var config = viewabilityConfig || (viewabilityConfigCallbackPairs && viewabilityConfigCallbackPairs[0] ? viewabilityConfigCallbackPairs[0].viewabilityConfig : ViewabilityHelper.DEFAULT_VIEWABILITY_CONFIG);
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
  componentDidUpdate(prevProps) {
    var _this$props4 = this.props,
      data = _this$props4.data,
      rowHasChanged = _this$props4.rowHasChanged,
      onViewableItemsChanged = _this$props4.onViewableItemsChanged,
      viewabilityConfig = _this$props4.viewabilityConfig,
      viewabilityConfigCallbackPairs = _this$props4.viewabilityConfigCallbackPairs;

    // Update data provider if data changed
    if (data !== prevProps.data || rowHasChanged !== prevProps.rowHasChanged) {
      this._dataProvider = this._dataProvider.cloneWithRows(data, rowHasChanged);
      // Update layout provider's data provider reference
      if (this._layoutProvider) {
        this._layoutProvider.setDataProvider(this._dataProvider);
      }
    }

    // Update viewability if callbacks changed
    if (onViewableItemsChanged !== prevProps.onViewableItemsChanged || viewabilityConfigCallbackPairs !== prevProps.viewabilityConfigCallbackPairs) {
      if (onViewableItemsChanged) {
        this._onViewableItemsChanged = onViewableItemsChanged;
      } else if (viewabilityConfigCallbackPairs && viewabilityConfigCallbackPairs[0]) {
        this._onViewableItemsChanged = viewabilityConfigCallbackPairs[0].onViewableItemsChanged;
      }
    }
  }
  render() {
    // Don't render on server side - RecyclerListView only works in browser
    if (typeof window === 'undefined') {
      // Return a simple placeholder for SSR
      return /*#__PURE__*/React.createElement(View, {
        style: this.props.style
      });
    }
    if (__DEV__) {
      console.log('[RNW-RLV] VirtualizedListRLVAdapter.render() starting');
    }

    // Ensure providers are initialized (only on client)
    this._ensureProvidersInitialized();
    ensureRLVLoaded();
    var hasHeader = this._layoutProvider._hasHeader;
    var hasFooter = this._layoutProvider._hasFooter;

    // Measure header/footer if needed  
    if ((hasHeader || hasFooter) && this.state.hasContainerSize) {
      this._measureHeaderFooterHeights(hasHeader, hasFooter);
    }
    if (__DEV__) {
      var _RecyclerListView;
      console.log('[RNW-RLV] RecyclerListView loaded:', {
        hasRecyclerListView: !!RecyclerListView,
        RecyclerListViewName: (_RecyclerListView = RecyclerListView) == null ? void 0 : _RecyclerListView.name
      });
    }
    var _this$props5 = this.props,
      style = _this$props5.style,
      contentContainerStyle = _this$props5.contentContainerStyle,
      _this$props5$scrollEn = _this$props5.scrollEnabled,
      scrollEnabled = _this$props5$scrollEn === void 0 ? true : _this$props5$scrollEn,
      _this$props5$horizont = _this$props5.horizontal,
      horizontal = _this$props5$horizont === void 0 ? false : _this$props5$horizont,
      _this$props5$inverted = _this$props5.inverted,
      inverted = _this$props5$inverted === void 0 ? false : _this$props5$inverted,
      ListEmptyComponent = _this$props5.ListEmptyComponent,
      ListHeaderComponent = _this$props5.ListHeaderComponent,
      ListFooterComponent = _this$props5.ListFooterComponent,
      _this$props5$showsHor = _this$props5.showsHorizontalScrollIndicator,
      showsHorizontalScrollIndicator = _this$props5$showsHor === void 0 ? true : _this$props5$showsHor,
      _this$props5$showsVer = _this$props5.showsVerticalScrollIndicator,
      showsVerticalScrollIndicator = _this$props5$showsVer === void 0 ? true : _this$props5$showsVer,
      _this$props5$nestedSc = _this$props5.nestedScrollEnabled,
      nestedScrollEnabled = _this$props5$nestedSc === void 0 ? true : _this$props5$nestedSc,
      scrollEventThrottle = _this$props5.scrollEventThrottle;
    var dataProvider = this._dataProvider.getRLVDataProvider();
    var itemCount = this._dataProvider.getSize();
    if (__DEV__) {
      var _this$_layoutProvider;
      console.log('[RNW-RLV] render() called with:', {
        itemCount,
        hasLayoutProvider: !!this._layoutProvider,
        hasRLVLayoutProvider: !!((_this$_layoutProvider = this._layoutProvider) != null && _this$_layoutProvider._rlvLayoutProvider),
        hasContainerSize: this.state.hasContainerSize,
        containerSize: this._containerSize
      });
    }

    // Show empty component if no items (only if no header/footer)
    // In RLV mode with header/footer, always render the list even if empty

    // Only show plain empty component in legacy mode (no header/footer, no virtualized empty row)
    // Actually, with our new approach, empty rows are always virtualized so this check is no longer needed
    // Legacy databases will have header/footer, so we never hit this path in practice.

    // Container style with flex: 1
    var containerStyle = [styles.container, style];
    var listContainerStyle = Object.assign({}, styles.listContainer, contentContainerStyle, {
      flex: 1
    });
    var scrollProps = {
      scrollEnabled,
      horizontal,
      inverted,
      showsHorizontalScrollIndicator,
      showsVerticalScrollIndicator,
      nestedScrollEnabled
    };
    return /*#__PURE__*/React.createElement(View, {
      ref: this._captureContainerRef,
      onLayout: this._handleContainerLayout,
      style: containerStyle
    }, hasHeader && ListHeaderComponent && !this._headerMeasured && /*#__PURE__*/React.createElement(View, {
      ref: _ref3 => {
        this._headerRef = _ref3;
      },
      style: styles.measurementContainer
    }, typeof ListHeaderComponent === 'function' ? /*#__PURE__*/React.createElement(ListHeaderComponent, null) : ListHeaderComponent), hasFooter && ListFooterComponent && !this._footerMeasured && /*#__PURE__*/React.createElement(View, {
      ref: _ref4 => {
        this._footerRef = _ref4;
      },
      style: styles.measurementContainer
    }, typeof ListFooterComponent === 'function' ? /*#__PURE__*/React.createElement(ListFooterComponent, null) : ListFooterComponent), !this.state.hasContainerSize ?
    /*#__PURE__*/
    // Don't render RecyclerListView until we have container dimensions
    React.createElement(View, {
      style: {
        flex: 1
      }
    }) : /*#__PURE__*/React.createElement(RecyclerListView, {
      key: "rlv-with-size",
      ref: this._captureRef,
      dataProvider: dataProvider,
      layoutProvider: this._layoutProvider._rlvLayoutProvider,
      rowRenderer: this._rowRenderer,
      onScroll: this._handleScroll,
      scrollViewProps: scrollProps,
      extendedState: this.props.extraData,
      style: listContainerStyle,
      canChangeSize: false,
      renderAheadOffset: DEFAULT_RENDER_AHEAD_OFFSET,
      isHorizontal: horizontal
    }));
  }
}
var styles = StyleSheet.create({
  container: {
    flex: 1
  },
  listContainer: {
    flex: 1
  },
  cellContainer: {
    width: '100%'
  },
  separator: {
    width: '100%'
  },
  measurementContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: -1000
  }
});
export default VirtualizedListRLVAdapter;