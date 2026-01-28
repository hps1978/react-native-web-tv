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
import {
  RecyclerListView,
  DataProvider as RLVDataProvider,
  LayoutProvider as RLVLayoutProvider,
} from 'recyclerlistview';
import View from '../../../exports/View';
import StyleSheet from '../../../exports/StyleSheet';
import ViewabilityHelper from '../ViewabilityHelper';
import memoizeOne from 'memoize-one';

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
 */
class RNWDataProvider {
  _data: any;
  _rowHasChanged: (r1: any, r2: any) => boolean;
  _rlvDataProvider: RLVDataProvider;

  constructor(data, rowHasChanged) {
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
    const arrayData = this._getArrayData();
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
    const newProvider = new RNWDataProvider(
      data,
      rowHasChanged || this._rowHasChanged,
    );
    return newProvider;
  }
}

/**
 * LayoutProvider wrapper for converting RNW getItemLayout to RLV format
 */
class RNWLayoutProvider extends RLVLayoutProvider {
  _getItemLayout: any;
  _getCount: () => number;
  _horizontal: boolean;
  _estimatedItemHeight: number;
  _estimatedItemWidth: number;
  _layoutCache: Map<number, any>;

  constructor(
    getItemLayout,
    getCount,
    horizontal = false,
    estimatedItemHeight = 50,
    estimatedItemWidth = 50,
  ) {
    // Call parent constructor with dummy function
    super(
      () => 0,
      () => 0,
    );

    this._getItemLayout = getItemLayout;
    this._getCount = getCount;
    this._horizontal = horizontal;
    this._estimatedItemHeight = estimatedItemHeight;
    this._estimatedItemWidth = estimatedItemWidth;
    this._layoutCache = new Map();
  }

  getLayoutForIndex(index) {
    // Check cache first
    if (this._layoutCache.has(index)) {
      return this._layoutCache.get(index);
    }

    let layout;

    if (this._getItemLayout) {
      try {
        const frameMetrics = this._getItemLayout(null, index);
        if (frameMetrics && frameMetrics.length) {
          layout = {
            width: this._horizontal ? frameMetrics.length : this._estimatedItemWidth,
            height: this._horizontal ? this._estimatedItemHeight : frameMetrics.length,
          };
        }
      } catch (e) {
        if (__DEV__) {
          console.warn(
            '[RNW-RLV] Error in getItemLayout for index',
            index,
            ':', e,
          );
        }
      }
    }

    // Fallback to estimated dimensions
    if (!layout) {
      layout = {
        width: this._horizontal ? 100 : this._estimatedItemWidth,
        height: this._horizontal ? this._estimatedItemHeight : this._estimatedItemHeight,
      };
    }

    // Cache the layout
    this._layoutCache.set(index, layout);
    return layout;
  }

  clearCache() {
    this._layoutCache.clear();
  }
}

const __DEV__ = process.env.NODE_ENV !== 'production';

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
  
  state = {
    contentLength: 0,
    visibleLength: 0,
    offset: 0,
    timestamp: 0,
  };

  constructor(props: Props) {
    super(props);

    const {
      data,
      rowHasChanged,
      getItemLayout,
      onViewableItemsChanged,
      viewabilityConfig,
      viewabilityConfigCallbackPairs,
      horizontal,
    } = props;

    // Initialize data provider
    this._dataProvider = new RNWDataProvider(data, rowHasChanged);

    // Initialize layout provider
    this._layoutProvider = new RNWLayoutProvider(
      getItemLayout,
      () => this._dataProvider.getSize(),
      horizontal,
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
      this._layoutProvider.clearCache();
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

    // Update state
    this.setState({
      offset,
      timestamp: now,
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
      const event = normalizeScrollEvent(
        { x: offsetX, y: offsetY },
        this.state,
        { 
          height: this.state.visibleLength,
          width: this.state.visibleLength,
        },
      );
      onScroll(event);
    }

    // Update viewability
    if (this._viewabilityHelper && this._onViewableItemsChanged) {
      const { viewableItems, changed } = this._viewabilityHelper.onScroll(
        offset,
        this.state.visibleLength,
        this._dataProvider.getSize(),
      );

      if (viewableItems && changed) {
        this._onViewableItemsChanged({ viewableItems, changed });
      }
    }
  };

  _rowRenderer = (type: any, item: any, index: any) => {
    const {
      renderItem,
      ListItemComponent,
      ItemSeparatorComponent,
    } = this.props;

    const { horizontal } = this.props;
    const separatorComponent = ItemSeparatorComponent && index < this._dataProvider.getSize() - 1 ? (
      <ItemSeparatorComponent highlighted={false} />
    ) : null;

    let content = null;

    if (renderItem) {
      content = renderItem({
        item,
        index,
        separators: {
          highlight: () => {},
          unhighlight: () => {},
          updateProps: () => {},
        },
      });
    } else if (ListItemComponent) {
      content = <ListItemComponent item={item} index={index} />;
    }

    return (
      <View
        key={`item-${index}`}
        data-rnw-focusable={item?.isTVSelectable ? 'true' : undefined}
        style={styles.cellContainer}
      >
        {content}
        {separatorComponent && (
          <View style={styles.separator}>
            {separatorComponent}
          </View>
        )}
      </View>
    );
  };

  _captureRef = (ref: any) => {
    this._listRef = ref;
  };

  render(): React.Node {
    const {
      style,
      contentContainerStyle,
      scrollEnabled = true,
      horizontal = false,
      inverted = false,
      ListHeaderComponent,
      ListFooterComponent,
      ListEmptyComponent,
      showsHorizontalScrollIndicator = true,
      showsVerticalScrollIndicator = true,
      nestedScrollEnabled = true,
      scrollEventThrottle,
    } = this.props;

    const dataProvider = this._dataProvider.getRLVDataProvider();
    const itemCount = this._dataProvider.getSize();

    // Show empty component if no items
    if (itemCount === 0 && ListEmptyComponent) {
      return typeof ListEmptyComponent === 'function' ? (
        <ListEmptyComponent />
      ) : (
        ListEmptyComponent
      );
    }

    const scrollProps = {
      scrollEnabled,
      horizontal,
      inverted,
      showsHorizontalScrollIndicator,
      showsVerticalScrollIndicator,
      nestedScrollEnabled,
    };

    return (
      <View style={[styles.container, style]}>
        {ListHeaderComponent ? (
          typeof ListHeaderComponent === 'function' ? (
            <ListHeaderComponent />
          ) : (
            ListHeaderComponent
          )
        ) : null}

        <RecyclerListView
          ref={this._captureRef}
          dataProvider={dataProvider}
          layoutProvider={this._layoutProvider}
          rowRenderer={this._rowRenderer}
          onScroll={this._handleScroll}
          scrollViewProps={scrollProps}
          extendedState={this.props.extraData}
          style={[styles.listContainer, contentContainerStyle]}
          canChangeSize={false}
          renderAheadOffset={DEFAULT_RENDER_AHEAD_OFFSET}
          isHorizontal={horizontal}
        />

        {ListFooterComponent ? (
          typeof ListFooterComponent === 'function' ? (
            <ListFooterComponent />
          ) : (
            ListFooterComponent
          )
        ) : null}
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
});

export default VirtualizedListRLVAdapter;
