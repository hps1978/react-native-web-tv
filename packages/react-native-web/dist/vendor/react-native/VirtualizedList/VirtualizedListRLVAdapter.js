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
function ensureRLVLoaded() {
  if (RecyclerListView) return;
  try {
    var rlv = require('recyclerlistview');
    RecyclerListView = rlv.RecyclerListView;
    RLVDataProvider = rlv.DataProvider;
    RLVLayoutProvider = rlv.LayoutProvider;
  } catch (e) {
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
function getTotalSize(dataLength, hasHeader, hasFooter) {
  var hasData = dataLength > 0;
  var size = dataLength;
  if (hasHeader) size += 1;
  if (hasFooter) size += 1;
  if (!hasData) size += 1; // Empty placeholder
  return size;
}
function getItemMetaForIndex(index, dataLength, hasHeader, hasFooter) {
  var hasData = dataLength > 0;
  var headerIndex = hasHeader ? 0 : -1;
  var dataStartIndex = hasHeader ? 1 : 0;
  var dataEndIndex = dataStartIndex + dataLength;
  var footerIndex = hasFooter ? dataEndIndex : -1;
  var emptyIndex = hasData ? -1 : dataStartIndex;
  if (index === headerIndex) {
    return {
      type: 'header',
      dataIndex: null
    };
  }
  if (index >= dataStartIndex && index < dataEndIndex) {
    return {
      type: 'item',
      dataIndex: index - dataStartIndex
    };
  }
  if (index === footerIndex) {
    return {
      type: 'footer',
      dataIndex: null
    };
  }
  if (index === emptyIndex) {
    return {
      type: 'empty',
      dataIndex: null
    };
  }
  return {
    type: 'empty',
    dataIndex: null
  };
}

/**
 * DataProvider wrapper that bridges RNW data to RLV DataProvider
 * Uses index mapping for header/footer/items (no per-item wrapping)
 */
class RNWDataProvider {
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
      var index = typeof r2 === 'number' ? r2 : r1;
      if (typeof index !== 'number') return false;
      var prevMeta = getItemMetaForIndex(index, this._prevDataLength, this._prevHasHeader, this._prevHasFooter);
      var nextMeta = getItemMetaForIndex(index, this._dataLength, this._hasHeader, this._hasFooter);
      if (prevMeta.type !== nextMeta.type) return true;
      if (nextMeta.type !== 'item') return false;
      var prevItem = Array.isArray(this._prevData) ? this._prevData[prevMeta.dataIndex] : undefined;
      var nextItem = Array.isArray(this._data) ? this._data[nextMeta.dataIndex] : undefined;
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
    var size = getTotalSize(this._dataLength, this._hasHeader, this._hasFooter);
    this._indexRows = new Array(size);
    for (var i = 0; i < size; i += 1) {
      this._indexRows[i] = i;
    }
    this._rlvDataProvider = this._rlvDataProvider.cloneWithRows(this._indexRows);
  }
  getSize() {
    return getTotalSize(this._dataLength, this._hasHeader, this._hasFooter);
  }
  getItem(index) {
    var meta = getItemMetaForIndex(index, this._dataLength, this._hasHeader, this._hasFooter);
    if (meta.type === 'item') {
      return this._data[meta.dataIndex];
    }
    return {
      __rnwRLVType: meta.type
    };
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
  constructor(getItemLayout, getData, getOriginalDataCount, horizontal, estimatedItemHeight, estimatedItemWidth, containerSize, isLayoutProviderFormat, hasHeader, hasFooter, headerHeight, footerHeight) {
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
    if (headerHeight === void 0) {
      headerHeight = 250;
    }
    if (footerHeight === void 0) {
      footerHeight = 60;
    }
    ensureRLVLoaded();
    this._getItemLayout = getItemLayout;
    this._appLayoutProvider = isLayoutProviderFormat ? getItemLayout : null;
    this._getData = getData;
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
    var self = this;

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
    this._rlvLayoutProvider = new CustomRLVLayoutProvider(index => self.getLayoutTypeForIndex(index),
    // Return 'header', 'item', or 'footer'
    (type, dim) => {
      // Dimension callback for each layout type
      var dimensions = self.getDimensionForType(type);
      dim.width = dimensions.width;
      dim.height = dimensions.height;
    });
  }

  // Determine layout type based on index mapping
  getLayoutTypeForIndex(index) {
    var dataLength = this._getOriginalDataCount();
    var meta = getItemMetaForIndex(index, dataLength, this._hasHeader, this._hasFooter);
    if (meta.type === 'item') {
      if (this._isLayoutProviderFormat && this._appLayoutProvider) {
        if (typeof this._appLayoutProvider.getLayoutTypeForIndex !== 'function') {
          throw new Error('VirtualizedList: layoutProvider must implement getLayoutTypeForIndex(index).');
        }
        return this._appLayoutProvider.getLayoutTypeForIndex(meta.dataIndex);
      }
      return "item-" + index;
    }
    return meta.type;
  }

  // Return dimensions for a given layout type
  getDimensionForType(type) {
    if (this._isLayoutProviderFormat) {
      // App-provided RLV LayoutProvider handles item types directly
      if (type !== 'header' && type !== 'footer' && type !== 'empty') {
        if (!this._appLayoutProvider) {
          throw new Error('VirtualizedList: No layout provider available. ' + 'Must provide either layoutProvider or getItemLayout prop.');
        }
        if (typeof this._appLayoutProvider.getDimensionForType !== 'function') {
          throw new Error('VirtualizedList: layoutProvider must implement getDimensionForType(type).');
        }
        return this._appLayoutProvider.getDimensionForType(type);
      }
    }
    if (type.startsWith('item-')) {
      var rlvIndex = Number(type.slice(5));
      if (!Number.isFinite(rlvIndex)) {
        throw new Error('Invalid item layout type index.');
      }
      var dataLength = this._getOriginalDataCount();
      var meta = getItemMetaForIndex(rlvIndex, dataLength, this._hasHeader, this._hasFooter);
      if (meta.type !== 'item') {
        throw new Error('Invalid item layout type for non-item index.');
      }
      if (!this._getItemLayout) {
        throw new Error('VirtualizedList: No layout provider available. ' + 'Must provide either layoutProvider or getItemLayout prop.');
      }
      try {
        // Legacy React Native format: getItemLayout(data, index) => { length, offset, index }
        // length represents size along scroll axis:
        // - vertical (default): length = height
        // - horizontal: length = width
        var data = this._getData();
        var result = this._getItemLayout(data, meta.dataIndex);
        var width, height;
        if (this._horizontal) {
          // Horizontal: length is width along scroll axis, height defaults to container height
          width = result.length;
          height = this._containerSize.height;
        } else {
          // Vertical: length is height along scroll axis, width defaults to container width
          height = result.length;
          width = this._containerSize.width;
        }
        return {
          width: Math.max(width, 1),
          height: Math.max(height, 1)
        };
      } catch (e) {
        throw new Error("Failed to compute dimensions for item: " + e.message);
      }
    }

    // Header/footer heights come from measured components
    if (type === 'header') {
      if (this._headerHeight <= 0) {
        throw new Error('Header height not measured. Header component must render with measurable dimensions.');
      }
      return {
        width: this._containerSize.width,
        height: this._headerHeight
      };
    }
    if (type === 'footer') {
      if (this._footerHeight <= 0) {
        throw new Error('Footer height not measured. Footer component must render with measurable dimensions.');
      }
      return {
        width: this._containerSize.width,
        height: this._footerHeight
      };
    }

    // Empty rows fill remaining space after header/footer
    if (type === 'empty') {
      var headerHeight = this._headerHeight || 0;
      var footerHeight = this._footerHeight || 0;
      var containerHeight = this._containerSize.height || 0;
      var emptyHeight = Math.max(containerHeight - headerHeight - footerHeight, 1);
      return {
        width: this._containerSize.width,
        height: emptyHeight
      };
    }
    throw new Error("Unknown layout type: " + type);
  }
  setContainerSize(width, height) {
    if (this._containerSize.width !== width || this._containerSize.height !== height) {
      this._containerSize = {
        width,
        height
      };
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
    this.state = {};
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
    this._rowRenderer = (type, rowData, rlvIndex) => {
      var _this$props2 = this.props,
        renderItem = _this$props2.renderItem,
        ListItemComponent = _this$props2.ListItemComponent,
        ItemSeparatorComponent = _this$props2.ItemSeparatorComponent,
        ListHeaderComponent = _this$props2.ListHeaderComponent,
        ListFooterComponent = _this$props2.ListFooterComponent,
        ListEmptyComponent = _this$props2.ListEmptyComponent;
      var dataLength = this._dataProvider._dataLength || 0;
      var hasHeader = this._layoutProvider._hasHeader;
      var hasFooter = this._layoutProvider._hasFooter;
      var meta = getItemMetaForIndex(rlvIndex, dataLength, hasHeader, hasFooter);

      // Handle synthetic header item
      if (meta.type === 'header') {
        return /*#__PURE__*/React.createElement(View, {
          style: styles.cellContainer
        }, typeof ListHeaderComponent === 'function' ? /*#__PURE__*/React.createElement(ListHeaderComponent, null) : ListHeaderComponent);
      }

      // Handle synthetic footer item
      if (meta.type === 'footer') {
        return /*#__PURE__*/React.createElement(View, {
          style: styles.cellContainer
        }, typeof ListFooterComponent === 'function' ? /*#__PURE__*/React.createElement(ListFooterComponent, null) : ListFooterComponent);
      }

      // Handle empty list indicator
      if (meta.type === 'empty') {
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
      var originalItemIndex = meta.dataIndex;
      var item = Array.isArray(this._dataProvider._data) ? this._dataProvider._data[originalItemIndex] : null;

      // Only render separator before items (not before header)
      var originalDataLength = this._dataProvider._dataLength || 0;
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

      // Update layout provider with measured dimensions
      if (this._layoutProvider) {
        this._layoutProvider.setContainerSize(width, height);
      }
    };
    this._headerRefCallback = ref => {
      this._headerRef = ref;
    };
    this._footerRefCallback = ref => {
      this._footerRef = ref;
    };
    this._measureHeaderFooterHeights = (hasHeader, hasFooter) => {
      if (hasHeader && this._headerRef && !this._headerMeasured) {
        try {
          var node = this._headerRef;
          if (node && node.getBoundingClientRect) {
            var height = node.getBoundingClientRect().height;
            if (height > 0) {
              this._headerHeight = height;
              this._headerMeasured = true;
              // Update layout provider immediately with actual measurement
              if (this._layoutProvider) {
                this._layoutProvider._headerHeight = height;
              }
            }
          }
        } catch (e) {}
      }
      if (hasFooter && this._footerRef && !this._footerMeasured) {
        try {
          var _node = this._footerRef;
          if (_node && _node.getBoundingClientRect) {
            var _height = _node.getBoundingClientRect().height;
            if (_height > 0) {
              this._footerHeight = _height;
              this._footerMeasured = true;
              // Update layout provider immediately with actual measurement
              if (this._layoutProvider) {
                this._layoutProvider._footerHeight = _height;
              }
            }
          }
        } catch (e) {}
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
          }
        }
      } catch (e) {}
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

    // STRICT VALIDATION: Cannot provide both layoutProvider and getItemLayout
    if (layoutProvider && getItemLayout) {
      console.warn('VirtualizedList: Both layoutProvider and getItemLayout provided. ' + 'Using layoutProvider and ignoring getItemLayout. ' + 'Please provide only layoutProvider for optimal performance.');
    }

    // Check if we have header/footer components to virtualize
    var hasHeader = !!ListHeaderComponent;
    var hasFooter = !!ListFooterComponent;

    // Initialize data provider with header/footer flags
    // Always virtualize header/footer; empty rows are always added when data is empty
    this._dataProvider = new RNWDataProvider(data, rowHasChanged, hasHeader, hasFooter);

    // Determine which format we're using (layoutProvider is preferred)
    var layoutProviderToUse = layoutProvider || getItemLayout;
    var isLayoutProviderFormat = !!layoutProvider;

    // Initialize layout provider with callbacks for data and data count
    this._layoutProvider = new RNWLayoutProvider(layoutProviderToUse, () => this._dataProvider ? this._dataProvider._data : null, () => this._dataProvider ? this._dataProvider._dataLength : 0, horizontal, 50, 50, this._containerSize, isLayoutProviderFormat, hasHeader, hasFooter, this._headerHeight || 250,
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

    // Measure header/footer after DOM is laid out
    var hasHeader = this._layoutProvider && this._layoutProvider._hasHeader;
    var hasFooter = this._layoutProvider && this._layoutProvider._hasFooter;
    if (hasHeader || hasFooter) {
      // Use requestAnimationFrame to ensure DOM has been painted and laid out
      requestAnimationFrame(() => {
        this._measureHeaderFooterHeights(hasHeader, hasFooter);
        // Update layout provider with measured dimensions
        if (this._layoutProvider && (this._headerMeasured || this._footerMeasured)) {
          this.forceUpdate();
        }
      });
    }
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

    // Ensure providers are initialized (only on client)
    this._ensureProvidersInitialized();
    ensureRLVLoaded();
    var hasHeader = this._layoutProvider._hasHeader;
    var hasFooter = this._layoutProvider._hasFooter;
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
      ref: this._headerRefCallback,
      style: styles.measurementContainer
    }, typeof ListHeaderComponent === 'function' ? /*#__PURE__*/React.createElement(ListHeaderComponent, null) : ListHeaderComponent), hasFooter && ListFooterComponent && !this._footerMeasured && /*#__PURE__*/React.createElement(View, {
      ref: this._footerRefCallback,
      style: styles.measurementContainer
    }, typeof ListFooterComponent === 'function' ? /*#__PURE__*/React.createElement(ListFooterComponent, null) : ListFooterComponent), /*#__PURE__*/React.createElement(RecyclerListView, {
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