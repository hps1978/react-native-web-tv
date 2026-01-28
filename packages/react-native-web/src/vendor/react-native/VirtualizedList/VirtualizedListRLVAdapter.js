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
type State = any;

const DEFAULT_RENDER_AHEAD_OFFSET = 0;
const DEFAULT_MAX_TO_RENDER_PER_BATCH = 10;
const DEFAULT_INITIAL_NUM_TO_RENDER = 10;
const DEFAULT_WINDOW_SIZE = 21;

/**
 * Web-specific scroll event normalizer for RecyclerListView
 */
function normalizeScrollEvent(scrollOffset, contentSize, visibleSize) {
  return {
    nativeEvent: {
      contentOffset: {
        x: scrollOffset.x || 0,
        y: scrollOffset.y || 0,
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
 * Default height calculator for items without explicit layout
 */
function defaultGetItemLayout(data, index) {
  if (!data || index < 0) {
    return { length: 0, offset: 0, index };
  }
  // Default to 50px per item if no layout provided
  const length = 50;
  const offset = length * index;
  return { length, offset, index };
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

    // Create RLV DataProvider with default comparator
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
 * LayoutProvider wrapper that bridges RNW getItemLayout to RLV LayoutProvider
 */
class RNWLayoutProvider {
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
        if (frameMetrics) {
          layout = {
            width: this._horizontal ? frameMetrics.length : this._estimatedItemWidth,
            height: this._horizontal ? this._estimatedItemHeight : frameMetrics.length,
          };
        }
      } catch (e) {
        console.warn(
          'VirtualizedListRLVAdapter: Error in getItemLayout for index',
          index,
          e,
        );
      }
    }

    // Fallback to estimated dimensions
    if (!layout) {
      layout = {
        width: this._horizontal ? 50 : this._estimatedItemWidth,
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

/**
 * VirtualizedListRLVAdapter: Adapts React Native Web's VirtualizedList API
 * to use RecyclerListView as the underlying virtualization engine
 */
class VirtualizedListRLVAdapter extends React.PureComponent<Props, State> {
  _listRef: any;
  _dataProvider: RNWDataProvider;
  _layoutProvider: RNWLayoutProvider;
  _scrollEventLastTick: number = 0;
  _viewabilityHelper: ViewabilityHelper;
  _hasInteracted: boolean = false;
  _scrollMetrics: any = {
    contentLength: 0,
    dOffset: 0,
    offset: 0,
    timestamp: 0,
    velocity: 0,
    visibleLength: 0,
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
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { data, rowHasChanged } = this.props;

    // Update data provider if data changed
    if (data !== prevProps.data || rowHasChanged !== prevProps.rowHasChanged) {
      this._dataProvider = this._dataProvider.cloneWithRows(
        data,
        rowHasChanged,
      );
      this._layoutProvider.clearCache();
    }
  }

  scrollToIndex = (params: any) => {
    const {
      animated,
      index,
      viewOffset = 0,
      viewPosition = 0,
    } = params || {};

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
      this._listRef.scrollToIndex(size - 1, animated, 0);
    }
  };

  recordInteraction = () => {
    this._hasInteracted = true;
  };

  flashScrollIndicators = () => {
    // No-op in web context
  };

  getScrollResponder = () => {
    return this._listRef;
  };

  getNativeScrollRef = () => {
    return this._listRef;
  };

  getScrollableNode = () => {
    // Return the scrollable DOM element if available
    if (this._listRef && this._listRef.getScrollableNode) {
      return this._listRef.getScrollableNode();
    }
    return null;
  };

  _handleScroll = (rawEvent: any) => {
    const { onScroll, scrollEventThrottle = 0, onViewableItemsChanged } =
      this.props;

    if (!rawEvent) return;

    const { nativeEvent } = rawEvent;
    if (!nativeEvent) return;

    const { contentOffset = {}, contentSize = {}, layoutMeasurement = {} } =
      nativeEvent;

    const offset = this.props.horizontal
      ? contentOffset.x || 0
      : contentOffset.y || 0;

    this._scrollMetrics = {
      contentLength: this.props.horizontal
        ? contentSize.width || 0
        : contentSize.height || 0,
      offset,
      timestamp: Date.now(),
      visibleLength: this.props.horizontal
        ? layoutMeasurement.width || 0
        : layoutMeasurement.height || 0,
    };

    // Throttle scroll events
    const now = Date.now();
    if (scrollEventThrottle > 0) {
      if (now - this._scrollEventLastTick < scrollEventThrottle) {
        return;
      }
    }

    this._scrollEventLastTick = now;

    if (onScroll) {
      onScroll(rawEvent);
    }

    // Update viewability
    if (this._viewabilityHelper && onViewableItemsChanged) {
      const { viewableItems, changed } = this._viewabilityHelper.onScroll(
        offset,
        this._scrollMetrics.visibleLength,
        this._dataProvider.getSize(),
      );

      if (viewableItems && changed) {
        onViewableItemsChanged({ viewableItems, changed });
      }
    }
  };

  _rowRenderer = (type: any, item: any, index: any) => {
    const { renderItem, ListItemComponent } = this.props;

    if (renderItem) {
      return (
        <View
          key={`${index}`}
          data-rnw-focusable={item?.isTVSelectable ? 'true' : undefined}
          style={styles.cellContainer}
        >
          {renderItem({ item, index, separators: {} })}
        </View>
      );
    } else if (ListItemComponent) {
      return (
        <View
          key={`${index}`}
          data-rnw-focusable={item?.isTVSelectable ? 'true' : undefined}
          style={styles.cellContainer}
        >
          <ListItemComponent item={item} index={index} />
        </View>
      );
    }

    return null;
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
      showsHorizontalScrollIndicator,
      showsVerticalScrollIndicator,
      nestedScrollEnabled,
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
      scrollEventThrottle,
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
});

export default VirtualizedListRLVAdapter;
