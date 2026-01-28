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
 */
class RNWDataProvider {
  constructor(data, rowHasChanged) {
    ensureRLVLoaded();
    this._data = data || [];
    this._rowHasChanged = rowHasChanged || ((r1, r2) => r1 !== r2);

    // Create RLV DataProvider with comparator
    this._rlvDataProvider = new RLVDataProvider((r1, r2) => {
      return this._rowHasChanged(r1, r2);
    });

    // Initialize with data
    this._updateData(data);
  }
  _updateData(data) {
    this._data = data || [];
    var arrayData = this._getArrayData();
    // $FlowFixMe
    this._rlvDataProvider = this._rlvDataProvider.cloneWithRows(arrayData);
  }
  _getArrayData() {
    if (Array.isArray(this._data)) {
      return this._data;
    }
    return [];
  }
  getSize() {
    return this._getArrayData().length;
  }
  getItem(index) {
    return this._getArrayData()[index];
  }
  getRLVDataProvider() {
    return this._rlvDataProvider;
  }
  cloneWithRows(data, rowHasChanged) {
    var newProvider = new RNWDataProvider(data, rowHasChanged || this._rowHasChanged);
    return newProvider;
  }
}

/**
 * LayoutProvider wrapper for converting RNW getItemLayout to RLV format
 * Properly extends RLVLayoutProvider to work with RecyclerListView
 */
class RNWLayoutProvider {
  // True if using layoutProvider format (width, height)
  // Reference to the dimension callback for updates

  constructor(getItemLayout, getCount, horizontal, estimatedItemHeight, estimatedItemWidth, containerSize, isLayoutProviderFormat // NEW: Flag for layoutProvider format
  ) {
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
    ensureRLVLoaded();
    this._getItemLayout = getItemLayout;
    this._getCount = getCount;
    this._horizontal = horizontal;
    this._estimatedItemHeight = estimatedItemHeight;
    this._estimatedItemWidth = estimatedItemWidth;
    this._layoutCache = new Map();
    this._containerSize = containerSize;
    this._layoutDimensions = new Map(); // Store dimensions by type
    this._isLayoutProviderFormat = isLayoutProviderFormat;
    this._dimensionCallback = null; // Initialize dimension callback reference

    var self = this;

    // Create CustomRLVLayoutProvider subclass that extends RLVLayoutProvider
    // Define it here (not at module level) because RLVLayoutProvider is loaded dynamically
    class CustomRLVLayoutProvider extends RLVLayoutProvider {
      constructor(layoutType, dimension) {
        super(layoutType, dimension);
        if (__DEV__) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider constructor called');
        }
      }

      // Override getLayoutForIndex to use our custom layout logic
      // This is called by RecyclerListView during initialization and rendering
      getLayoutForIndex(index) {
        if (__DEV__) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider.getLayoutForIndex called for index:', index);
        }
        return self.getLayoutForIndex(index);
      }

      // RecyclerListView might call getLayout instead
      getLayout(index) {
        if (__DEV__) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider.getLayout called for index:', index);
        }
        if (super.getLayout) {
          return super.getLayout(index);
        }
        return this.getLayoutForIndex(index);
      }

      // Check if RLV calls getLayoutTypeForIndex
      getLayoutTypeForIndex(index) {
        if (__DEV__ && index < 3) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider.getLayoutTypeForIndex called for index:', index);
        }
        return super.getLayoutTypeForIndex ? super.getLayoutTypeForIndex(index) : '0';
      }

      // Try to override methods that might provide dimensions
      getDimensionForType(type) {
        if (__DEV__) {
          console.log('[RNW-RLV] CustomRLVLayoutProvider.getDimensionForType called for type:', type);
        }
        if (super.getDimensionForType) {
          return super.getDimensionForType(type);
        }
        // If this is called, return dimensions for the type
        return {
          width: self._containerSize.width,
          height: 50
        };
      }

      // Override getLayouts (batch method)
      getLayouts(startIndex, endIndex) {
        if (__DEV__) {
          console.log('[RNW-RLV] getLayouts called for range:', startIndex, '-', endIndex);
        }
        if (super.getLayouts) {
          return super.getLayouts(startIndex, endIndex);
        }
        return undefined;
      }

      // Check all own properties that might store dimensions
      //getLayoutDimensions(index)
    }

    // Create instance of custom subclass
    this._rlvLayoutProvider = new CustomRLVLayoutProvider(() => '0',
    // All items use layout type '0'
    (type, dim) => {
      // This is the dimension callback - RLV passes a dimension object for us to populate
      var incomingHeight = dim.height;

      // Get the real layout for the first item to determine dimensions
      if (self._getItemLayout) {
        try {
          var result = self._getItemLayout(null, 0);
          if (result) {
            var width = self._containerSize.width || 50;
            var height = 50;
            if (self._isLayoutProviderFormat) {
              if (result.width !== undefined) {
                if (typeof result.width === 'string' && result.width === '100%') {
                  width = self._containerSize.width;
                } else if (typeof result.width === 'number') {
                  width = result.width;
                }
              }
              if (result.height !== undefined) {
                height = result.height;
              }
            } else {
              if (result.length !== undefined) {
                height = result.length;
              } else if (result.height !== undefined) {
                height = result.height;
              }
            }

            // IMPORTANT: Modify the dimension object passed in!
            // RecyclerListView expects us to populate width and height
            dim.width = Math.max(width, 1);
            dim.height = Math.max(height, 1);
            if (__DEV__ && incomingHeight === 0) {
              console.log('[RNW-RLV] Dimensions populated: width=' + dim.width + 'px, height=' + dim.height + 'px');
            }
          }
        } catch (e) {
          if (__DEV__) {
            console.warn('[RNW-RLV] Error in dimension callback:', e.message);
          }
        }
      }

      // Store dimensions for this type
      self._layoutDimensions.set(type, {
        width: dim.width,
        height: dim.height
      });
    });

    // Wrap the layout provider to log all method calls
    if (__DEV__) {
      var originalLayoutProvider = this._rlvLayoutProvider;
      var handler = {
        get: (target, prop) => {
          var value = target[prop];
          if (typeof value === 'function') {
            return function () {
              for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
              }
              if (![' constructor', 'constructor'].includes(prop)) {
                console.log("[RNW-RLV] LayoutProvider." + prop + " called with:", args);
              }
              return value.apply(target, args);
            };
          }
          return value;
        }
      };

      // Note: Proxy may not work as expected here, so let's just add logging to key methods
      var orig_getDimension = originalLayoutProvider.getDimension;
      if (orig_getDimension) {
        originalLayoutProvider.getDimension = function (type) {
          console.log('[RNW-RLV] getDimension called for type:', type);
          return orig_getDimension.call(this, type);
        };
      }
    }
    if (__DEV__) {
      console.log('[RNW-RLV] Layout provider created:', {
        hasGetLayoutForIndex: typeof this._rlvLayoutProvider.getLayoutForIndex === 'function',
        hasDimension: !!this._rlvLayoutProvider.getDimension,
        isLayoutProviderFormat,
        containerSize,
        isCustomSubclass: this._rlvLayoutProvider instanceof RLVLayoutProvider,
        providerMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(this._rlvLayoutProvider))
      });
    }
  }
  setContainerSize(width, height) {
    if (this._containerSize.width !== width || this._containerSize.height !== height) {
      this._containerSize = {
        width,
        height
      };
      this._layoutCache.clear(); // Clear cache when container size changes

      // Update the layout provider's stored dimensions for layout type '0'
      // Call the dimension callback with the new dimensions so RLV knows about them
      if (this._rlvLayoutProvider && this._getItemLayout) {
        try {
          var result = this._getItemLayout(null, 0);
          if (result) {
            var newWidth = width;
            var newHeight = 50;
            if (this._isLayoutProviderFormat) {
              if (result.width !== undefined) {
                if (typeof result.width === 'string' && result.width === '100%') {
                  newWidth = width;
                } else if (typeof result.width === 'number') {
                  newWidth = result.width;
                }
              }
              if (result.height !== undefined) {
                newHeight = result.height;
              }
            } else {
              if (result.length !== undefined) {
                newHeight = result.length;
              } else if (result.height !== undefined) {
                newHeight = result.height;
              }
            }

            // Try to update dimensions in the layout provider
            if (this._rlvLayoutProvider.setDimensionForType) {
              if (__DEV__) {
                console.log('[RNW-RLV] Calling setDimensionForType with:', {
                  type: '0',
                  width: newWidth,
                  height: newHeight
                });
              }
              this._rlvLayoutProvider.setDimensionForType('0', newWidth, newHeight);
            }
          }
        } catch (e) {
          if (__DEV__) {
            console.warn('[RNW-RLV] Error updating container size in layout provider:', e);
          }
        }
      }
    }
  }
  getLayoutForIndex(index) {
    // Check cache first
    if (this._layoutCache.has(index)) {
      return this._layoutCache.get(index);
    }
    var width = this._containerSize.width || this._estimatedItemWidth;
    var height = this._estimatedItemHeight;
    if (__DEV__ && index === 0) {
      console.log('[RNW-RLV Debug] getLayoutForIndex(0):', {
        containerSize: this._containerSize,
        isLayoutProviderFormat: this._isLayoutProviderFormat,
        hasGetItemLayout: !!this._getItemLayout
      });
    }
    if (this._getItemLayout) {
      try {
        var result = this._getItemLayout(null, index);
        if (__DEV__ && index === 0) {
          console.log('[RNW-RLV Debug] layoutProvider result:', result);
        }
        if (result) {
          if (this._isLayoutProviderFormat) {
            // layoutProvider format: { width, height }
            // width can be string like '100%' or a number
            if (result.width !== undefined) {
              if (typeof result.width === 'string') {
                if (result.width === '100%') {
                  width = this._containerSize.width;
                } else if (result.width.includes('%')) {
                  var percent = parseFloat(result.width) / 100;
                  width = this._containerSize.width * percent;
                }
              } else if (typeof result.width === 'number') {
                width = result.width;
              }
            }
            if (result.height !== undefined) {
              height = result.height;
            }
          } else {
            // Standard getItemLayout format: { length, offset, index }
            // length = height for vertical, width for horizontal

            // Handle width
            if (result.width !== undefined) {
              if (typeof result.width === 'string') {
                if (result.width === '100%') {
                  width = this._containerSize.width;
                } else if (result.width.includes('%')) {
                  var _percent = parseFloat(result.width) / 100;
                  width = this._containerSize.width * _percent;
                }
              } else if (typeof result.width === 'number') {
                width = result.width;
              }
            }

            // Handle height
            if (result.length !== undefined) {
              height = result.length;
            } else if (result.height !== undefined) {
              height = result.height;
            }
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[RNW-RLV] Error in getItemLayout for index', index, ':', e);
        }
      }
    }

    // Ensure minimum dimensions (RecyclerListView needs positive dimensions)
    width = Math.max(width, 1);
    height = Math.max(height, 1);
    var layout = {
      width,
      height
    };
    if (__DEV__ && index === 0) {
      console.log('[RNW-RLV Debug] final layout for index 0:', layout);
    }

    // Cache the layout
    this._layoutCache.set(index, layout);
    return layout;
  }
  clearCache() {
    this._layoutCache.clear();
  }

  // Delegate to RLV layout provider if needed
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
    this.state = {
      contentLength: 0,
      visibleLength: 0,
      offset: 0,
      timestamp: 0,
      hasContainerSize: false // NEW: Track if we have measured container dimensions
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

      // Update state
      this.setState({
        offset,
        timestamp: now
      });

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
        }, this.state, {
          height: this.state.visibleLength,
          width: this.state.visibleLength
        });
        onScroll(event);
      }

      // Update viewability
      if (this._viewabilityHelper && this._onViewableItemsChanged) {
        var _this$_viewabilityHel = this._viewabilityHelper.onScroll(offset, this.state.visibleLength, this._dataProvider.getSize()),
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
    this._rowRenderer = (type, item, index) => {
      var _this$props2 = this.props,
        renderItem = _this$props2.renderItem,
        ListItemComponent = _this$props2.ListItemComponent,
        ItemSeparatorComponent = _this$props2.ItemSeparatorComponent;
      if (__DEV__ && index === 0) {
        console.log('[RNW-RLV] _rowRenderer called for index 0');
      }
      var horizontal = this.props.horizontal;
      var separatorComponent = ItemSeparatorComponent && index < this._dataProvider.getSize() - 1 ? /*#__PURE__*/React.createElement(ItemSeparatorComponent, {
        highlighted: false
      }) : null;
      var content = null;
      if (renderItem) {
        content = renderItem({
          item,
          index,
          separators: {
            highlight: () => {},
            unhighlight: () => {},
            updateProps: () => {}
          }
        });
      } else if (ListItemComponent) {
        content = /*#__PURE__*/React.createElement(ListItemComponent, {
          item: item,
          index: index
        });
      }
      return /*#__PURE__*/React.createElement(View, {
        key: "item-" + index,
        "data-rnw-focusable": item != null && item.isTVSelectable ? 'true' : undefined,
        style: styles.cellContainer
      }, content, separatorComponent && /*#__PURE__*/React.createElement(View, {
        style: styles.separator
      }, separatorComponent));
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
      horizontal = _this$props3.horizontal;

    // Initialize data provider
    this._dataProvider = new RNWDataProvider(data, rowHasChanged);

    // Initialize layout provider with container size
    // Pass either getItemLayout or layoutProvider to the layout provider wrapper
    this._layoutProvider = new RNWLayoutProvider(getItemLayout || layoutProvider,
    // layoutProvider or getItemLayout
    () => this._dataProvider && this._dataProvider.getSize(), horizontal, 50, 50, this._containerSize, layoutProvider ? true : false) // Flag if using layoutProvider format
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
      this._layoutProvider.clearCache();
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
      // Return a simple placeholder for SSR - this will be hydrated on client
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
      ListHeaderComponent = _this$props5.ListHeaderComponent,
      ListFooterComponent = _this$props5.ListFooterComponent,
      ListEmptyComponent = _this$props5.ListEmptyComponent,
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
      var _this$_layoutProvider, _this$_layoutProvider2;
      console.log('[RNW-RLV] render() called with:', {
        itemCount,
        hasLayoutProvider: !!this._layoutProvider,
        hasRLVLayoutProvider: !!((_this$_layoutProvider = this._layoutProvider) != null && _this$_layoutProvider._rlvLayoutProvider),
        hasContainerSize: this.state.hasContainerSize,
        containerSize: this._containerSize,
        layoutProviderType: typeof ((_this$_layoutProvider2 = this._layoutProvider) == null ? void 0 : _this$_layoutProvider2._rlvLayoutProvider)
      });
    }

    // Show empty component if no items
    if (itemCount === 0 && ListEmptyComponent) {
      return typeof ListEmptyComponent === 'function' ? /*#__PURE__*/React.createElement(ListEmptyComponent, null) : ListEmptyComponent;
    }

    // Container style with flex: 1 (parent must provide bounded dimensions)
    var containerStyle = [styles.container, style];

    // Merge listContainerStyle into a single object instead of array
    // RecyclerListView requires style to be object or number, not array
    var listContainerStyle = Object.assign({}, styles.listContainer, contentContainerStyle, {
      flex: 1
    } // Force flex: 1 to ensure RecyclerListView gets space
    );
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
    }, ListHeaderComponent ? typeof ListHeaderComponent === 'function' ? /*#__PURE__*/React.createElement(ListHeaderComponent, null) : ListHeaderComponent : null, !this.state.hasContainerSize ?
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
    }), ListFooterComponent ? typeof ListFooterComponent === 'function' ? /*#__PURE__*/React.createElement(ListFooterComponent, null) : ListFooterComponent : null);
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
  }
});
export default VirtualizedListRLVAdapter;