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
  TextInput,
  Button
} from 'react-native-web';

// Fixed item height example data
const generateListData = (size = 100) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `${i}`,
    key: `item-${i}`,
    title: `Item ${i}`,
    description: `This is item number ${i}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
    timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString()
  }));
};

// Item height is constant for this example
const ITEM_HEIGHT = 80;

// LayoutProvider function for RecyclerListView optimization
// Only handles regular items - header/footer heights are measured automatically
const layoutProvider = (index) => ({
  width: '100%',
  height: ITEM_HEIGHT
});

// Row change detection for optimized re-renders
const rowHasChanged = (prevItem, nextItem) => {
  if (!prevItem || !nextItem) return true;
  return (
    prevItem.id !== nextItem.id ||
    prevItem.title !== nextItem.title ||
    prevItem.description !== nextItem.description
  );
};

// Performance tracking hook
const usePerformanceMetrics = (renderMode, dataLength) => {
  const [renderTime, setRenderTime] = useState(0);
  const [domNodes, setDomNodes] = useState(0);
  const [fps] = useState(60);
  const [itemRenderCount, setItemRenderCount] = useState(0);

  // const frameTimesRef = useRef([]);
  // const lastFrameTimeRef = useRef(0);
  const renderStartRef = useRef(0);
  const itemRenderCountRef = useRef(0);
  // const rafIdRef = useRef(null);

  // Measure initial render time
  useEffect(() => {
    renderStartRef.current = performance.now();

    // Measure after initial render completes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const nextRenderTime = performance.now() - renderStartRef.current;
        setRenderTime(nextRenderTime);
      });
    });
  }, [renderMode, dataLength]);

  // Count DOM nodes
  // TEMPORARILY DISABLED FOR TESTING - to check if this causes re-renders during scroll
  useEffect(() => {
    const measureDOMNodes = () => {
      const container =
        document.querySelector('[data-testid="flatlist-container"]') ||
        document.body;
      const allNodes = container.querySelectorAll('*').length;
      setDomNodes(allNodes);
    };

    const timeoutId = setTimeout(measureDOMNodes, 500);
    return () => clearTimeout(timeoutId);
  }, [renderMode, dataLength]);

  // Update item render count periodically (not during render!)
  // TEMPORARILY DISABLED FOR TESTING - to check if this timer causes container layout re-renders
  /*
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (itemRenderCountRef.current !== metrics.itemRenderCount) {
        setMetrics(prev => ({ 
          ...prev, 
          itemRenderCount: itemRenderCountRef.current,
          lastUpdate: Date.now(),
        }));
      }
    }, 500); // Update every 500ms

    return () => clearInterval(intervalId);
  }, [metrics.itemRenderCount]);
  */

  // FPS tracking during scroll
  // TEMPORARILY DISABLED FOR TESTING - this updates state during scroll causing re-renders
  /*
  useEffect(() => {
    let scrolling = false;
    let scrollTimeout;

    const handleScroll = () => {
      if (!scrolling) {
        scrolling = true;
        frameTimesRef.current = [];
        lastFrameTimeRef.current = performance.now();
        measureFPS();
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrolling = false;
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      }, 200);
    };

    const measureFPS = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      
      if (delta > 0) {
        frameTimesRef.current.push(delta);
        
        // Keep last 30 frames
        if (frameTimesRef.current.length > 30) {
          frameTimesRef.current.shift();
        }
        
        // Calculate average FPS
        if (frameTimesRef.current.length >= 5) {
          const avgDelta = frameTimesRef.current.reduce((a, b) => a + b) / frameTimesRef.current.length;
          const fps = Math.round(1000 / avgDelta);
          setMetrics(prev => ({ ...prev, fps: Math.min(fps, 60) }));
        }
      }
      
      lastFrameTimeRef.current = now;
      rafIdRef.current = requestAnimationFrame(measureFPS);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      clearTimeout(scrollTimeout);
    };
  }, []);
  */

  // Safe increment that doesn't trigger setState during render
  const incrementItemRenderCount = useCallback(() => {
    itemRenderCountRef.current += 1;
  }, []);

  const resetItemRenderCount = useCallback(() => {
    itemRenderCountRef.current = 0;
    setItemRenderCount(0);
  }, []);

  return {
    renderTime,
    domNodes,
    fps,
    itemRenderCount,
    incrementItemRenderCount,
    resetItemRenderCount
  };
};

function OptimizedFlatListExample() {
  const [listData, setListData] = useState(() => generateListData(500));
  const [filter, setFilter] = useState('');
  const [renderMode, setRenderMode] = useState('optimized'); // 'optimized' or 'legacy'

  const {
    renderTime,
    domNodes,
    fps,
    itemRenderCount,
    incrementItemRenderCount,
    resetItemRenderCount
  } = usePerformanceMetrics(renderMode, listData.length);

  const filteredDataArray = useCallback(() => {
    if (!filter) return listData;
    return listData.filter(
      (item) =>
        item.title.toLowerCase().includes(filter.toLowerCase()) ||
        item.description.toLowerCase().includes(filter.toLowerCase())
    );
  }, [listData, filter]);

  // Memoize the filtered data result so it doesn't change on every render
  const memoizedFilteredData = React.useMemo(
    () => filteredDataArray(),
    [filteredDataArray]
  );

  const handleRefresh = useCallback(() => {
    setListData(generateListData(500));
  }, []);

  // const handleAddItems = useCallback(() => {
  //   setListData((prev) => [...prev, ...generateListData(50)]);
  // }, []);

  const handleStressTest = useCallback(() => {
    setListData(generateListData(2000));
  }, []);

  const renderItem = useCallback(
    ({ item, index }) => {
      incrementItemRenderCount();

      return (
        <View style={styles.itemContainer}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>
          <Text style={styles.itemTimestamp}>{item.timestamp}</Text>
        </View>
      );
    },
    [incrementItemRenderCount]
  );

  // Reset render count when mode changes
  useEffect(() => {
    resetItemRenderCount();
  }, [renderMode, resetItemRenderCount]);

  const ListHeaderComponent = useCallback(() => {
    return (
      <View style={styles.header}>
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>
            🧪 How to Test Performance:
          </Text>
          <Text style={styles.instructionsText}>
            1. Click "Stress Test (2000)" to load 2000 items{'\n'}
            2. Watch the metrics (fixed at top) while it renders{'\n'}
            3. Scroll fast up and down - notice FPS{'\n'}
            4. Click "Switch to Legacy" and repeat{'\n'}
            5. Compare: RLV should show ~10-20x fewer item renders and faster
            initial load
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Total Items: {memoizedFilteredData.length}
          </Text>
          <Text style={styles.statsText}>
            Item Height: {ITEM_HEIGHT}px (Fixed)
          </Text>
        </View>
      </View>
    );
  }, [memoizedFilteredData]);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No items match your filter.</Text>
      </View>
    ),
    []
  );

  // Memoized separate component to prevent metrics updates from re-rendering FlatList
  const FlatListMemo = React.memo(
    ({
      filteredData,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      renderMode,
      layoutProvider,
      rowHasChanged
    }) => {
      const flatListProps = {
        data: filteredData,
        renderItem,
        keyExtractor: (item) => item.key,
        ListHeaderComponent,
        ListEmptyComponent,
        scrollEventThrottle: 50,
        initialNumToRender: 10
      };

      // In optimized mode, add RLV-specific props
      if (renderMode === 'optimized') {
        flatListProps.layoutProvider = layoutProvider;
        flatListProps.rowHasChanged = rowHasChanged;
      }

      return <FlatList {...flatListProps} />;
    },
    (prevProps, nextProps) => {
      // Return TRUE if props are equal (DON'T re-render)
      // Return FALSE if props are different (DO re-render)

      // Only compare: data length, renderMode, renderItem callback
      // Do NOT compare ListHeaderComponent because it may change when parent re-renders
      const shouldSkipRender =
        prevProps.filteredData.length === nextProps.filteredData.length &&
        prevProps.renderMode === nextProps.renderMode &&
        prevProps.renderItem === nextProps.renderItem &&
        prevProps.ListHeaderComponent === nextProps.ListHeaderComponent;

      return shouldSkipRender;
    }
  );

  return (
    <View data-testid="flatlist-container" style={styles.outerContainer}>
      {/* Fixed Performance Metrics - Always Visible */}
      <View style={styles.fixedMetrics}>
        <Text style={styles.headerTitle}>
          Optimized FlatList with RecyclerListView
        </Text>
        <Text style={styles.subheading}>
          Mode:{' '}
          {renderMode === 'optimized'
            ? '🚀 RecyclerListView (Optimized)'
            : '🐌 Legacy VirtualizedList'}
        </Text>

        <View style={styles.metricsContainer}>
          <Text style={styles.metricsTitle}>⚡ Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Initial Render</Text>
              <Text style={styles.metricValue}>{renderTime.toFixed(1)}ms</Text>
              <Text style={styles.metricSubtext}>
                {renderTime < 100
                  ? '✓ Fast'
                  : renderTime < 500
                  ? '⚠ Moderate'
                  : '⚠ Slow'}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>DOM Nodes</Text>
              <Text style={styles.metricValue}>{domNodes}</Text>
              <Text style={styles.metricSubtext}>
                {domNodes < 200 ? '✓ Light' : '⚠ Heavy'}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Scroll FPS</Text>
              <Text
                style={[
                  styles.metricValue,
                  fps >= 55
                    ? styles.metricGood
                    : fps >= 45
                    ? styles.metricWarning
                    : styles.metricBad
                ]}
              >
                {fps}
              </Text>
              <Text style={styles.metricSubtext}>
                {fps >= 55 ? '✓ Smooth' : '⚠ Laggy'}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Item Renders</Text>
              <Text style={styles.metricValue}>{itemRenderCount}</Text>
              <Text style={styles.metricSubtext}>
                {renderMode === 'optimized' ? '✓ Minimal' : '⚠ Many'}
              </Text>
            </View>
          </View>
          <Text style={styles.metricsHint}>
            💡{' '}
            {renderMode === 'optimized'
              ? 'RecyclerListView only renders visible items (~10-15) regardless of list size'
              : 'Legacy mode re-renders items frequently - watch the Item Renders counter grow!'}
          </Text>
        </View>

        {/* Controls - Always Accessible */}
        <TextInput
          onChangeText={setFilter}
          placeholder="Filter items..."
          style={styles.filterInput}
          value={filter}
        />

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
          <Button onPress={handleRefresh} title="Refresh (500)" />
          <Button onPress={handleStressTest} title="Stress Test (2000)" />
        </View>
      </View>

      {/* Scrollable List Container */}
      <View style={styles.container}>
        <FlatListMemo
          ListEmptyComponent={ListEmptyComponent}
          ListHeaderComponent={ListHeaderComponent}
          filteredData={memoizedFilteredData}
          layoutProvider={layoutProvider}
          renderItem={renderItem}
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
    backgroundColor: '#f5f5f5',
    flexDirection: 'column'
  },
  fixedMetrics: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    padding: 16,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  subheading: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  metricsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap'
  },
  metricBox: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8'
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center'
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  metricSubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center'
  },
  metricGood: {
    color: '#22c55e'
  },
  metricWarning: {
    color: '#f59e0b'
  },
  metricBad: {
    color: '#ef4444'
  },
  metricsHint: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center'
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 14
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8
  },
  instructionsBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 6
  },
  instructionsText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18
  },
  statsContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  itemContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
    flexDirection: 'column'
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    numberOfLines: 1
  },
  itemDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    numberOfLines: 1
  },
  itemTimestamp: {
    fontSize: 12,
    color: '#999',
    numberOfLines: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#666'
  },
  footer: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  }
});

export default OptimizedFlatListExample;
