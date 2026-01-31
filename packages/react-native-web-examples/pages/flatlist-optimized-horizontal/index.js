/**
 * Copyright (c) Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  Button,
  Image
} from 'react-native-web';

const HORIZONTAL_ITEM_WIDTH = 180;
const HORIZONTAL_ITEM_HEIGHT = 120;
const HORIZONTAL_ITEM_SPACING = 12;
const HORIZONTAL_CARD_HEIGHT = HORIZONTAL_ITEM_HEIGHT + 32;

const generateHorizontalData = (size = 20) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `h-${i}`,
    key: `horizontal-${i}`,
    title: `Card ${i + 1}`,
    imageUri: `https://picsum.photos/seed/rlv-${i}/240/160`
  }));
};

const horizontalLayoutProvider = {
  getLayoutTypeForIndex: () => 'item',
  getDimensionForType: () => ({
    width: HORIZONTAL_ITEM_WIDTH + HORIZONTAL_ITEM_SPACING,
    height: HORIZONTAL_CARD_HEIGHT
  })
};

const rowHasChanged = (prevItem, nextItem) => {
  if (!prevItem || !nextItem) return true;
  return prevItem.id !== nextItem.id || prevItem.title !== nextItem.title;
};

const usePerformanceMetrics = (renderMode, dataLength) => {
  const [renderTime, setRenderTime] = useState(0);
  const [domNodes, setDomNodes] = useState(0);
  const renderStartRef = useRef(0);

  useEffect(() => {
    renderStartRef.current = performance.now();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const nextRenderTime = performance.now() - renderStartRef.current;
        setRenderTime(nextRenderTime);
      });
    });
  }, [renderMode, dataLength]);

  useEffect(() => {
    const measureDOMNodes = () => {
      const container =
        document.querySelector(
          '[data-testid="flatlist-horizontal-container"]'
        ) || document.body;
      const allNodes = container.querySelectorAll('*').length;
      setDomNodes(allNodes);
    };

    const timeoutId = setTimeout(measureDOMNodes, 500);
    return () => clearTimeout(timeoutId);
  }, [renderMode, dataLength]);

  return {
    renderTime,
    domNodes
  };
};

function OptimizedFlatListHorizontalExample() {
  const [listData, setListData] = useState(() => generateHorizontalData(20));
  const [renderMode, setRenderMode] = useState('optimized'); // 'optimized' or 'legacy'

  const { renderTime, domNodes } = usePerformanceMetrics(
    renderMode,
    listData.length
  );

  const handleRefresh = useCallback(() => {
    setListData(generateHorizontalData(20));
  }, []);

  const handleStressTest = useCallback(() => {
    setListData(generateHorizontalData(80));
  }, []);

  const renderHorizontalItem = useCallback(({ item }) => {
    return (
      <View style={styles.horizontalCard}>
        <Image
          resizeMode="cover"
          source={{ uri: item.imageUri }}
          style={styles.horizontalImage}
        />
        <Text style={styles.horizontalTitle}>{item.title}</Text>
      </View>
    );
  }, []);

  const HorizontalFlatListMemo = React.memo(
    ({ data, renderItem, renderMode, layoutProvider, rowHasChanged }) => {
      const flatListProps = {
        data,
        renderItem,
        keyExtractor: (item) => item.key,
        horizontal: true,
        showsHorizontalScrollIndicator: true,
        contentContainerStyle: styles.horizontalContent,
        style: styles.horizontalList,
        initialNumToRender: 10
      };

      if (renderMode === 'optimized') {
        flatListProps.layoutProvider = layoutProvider;
        flatListProps.rowHasChanged = rowHasChanged;
      }

      return <FlatList {...flatListProps} />;
    },
    (prevProps, nextProps) => {
      const shouldSkipRender =
        prevProps.data.length === nextProps.data.length &&
        prevProps.renderMode === nextProps.renderMode &&
        prevProps.renderItem === nextProps.renderItem;

      return shouldSkipRender;
    }
  );

  return (
    <View
      data-testid="flatlist-horizontal-container"
      style={styles.outerContainer}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Horizontal FlatList (RLV vs Legacy)
        </Text>
        <Text style={styles.subheading}>
          Mode: {renderMode === 'optimized' ? '🚀 RLV' : '🐌 Legacy'}
        </Text>

        <View style={styles.metricsRow}>
          <Text style={styles.metricText}>
            Render: {renderTime.toFixed(1)}ms
          </Text>
          <Text style={styles.metricText}>DOM Nodes: {domNodes}</Text>
          <Text style={styles.metricText}>Items: {listData.length}</Text>
        </View>

        <View style={styles.buttonRow}>
          <Button
            onPress={() =>
              setRenderMode((m) => (m === 'optimized' ? 'legacy' : 'optimized'))
            }
            title={
              renderMode === 'optimized'
                ? 'Switch to Legacy'
                : 'Switch to Optimized'
            }
          />
          <Button onPress={handleRefresh} title="Refresh (20)" />
          <Button onPress={handleStressTest} title="Stress (80)" />
        </View>
      </View>

      <View style={styles.horizontalListContainer}>
        <HorizontalFlatListMemo
          data={listData}
          layoutProvider={horizontalLayoutProvider}
          renderItem={renderHorizontalItem}
          renderMode={renderMode}
          rowHasChanged={rowHasChanged}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
    height: '100vh',
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333'
  },
  subheading: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  metricText: {
    fontSize: 12,
    color: '#666'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  horizontalListContainer: {
    height: HORIZONTAL_CARD_HEIGHT,
    width: '100%',
    backgroundColor: '#ffffff'
  },
  horizontalList: {
    height: HORIZONTAL_CARD_HEIGHT
  },
  horizontalContent: {
    paddingRight: HORIZONTAL_ITEM_SPACING
  },
  horizontalCard: {
    width: HORIZONTAL_ITEM_WIDTH,
    height: HORIZONTAL_CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: HORIZONTAL_ITEM_SPACING,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden'
  },
  horizontalImage: {
    width: '100%',
    height: HORIZONTAL_ITEM_HEIGHT
  },
  horizontalTitle: {
    fontSize: 12,
    color: '#333',
    paddingHorizontal: 8,
    paddingTop: 6
  }
});

export default OptimizedFlatListHorizontalExample;
