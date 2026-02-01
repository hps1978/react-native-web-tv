/**
 * Automated Performance Benchmark for FlatList
 * Compares RLV (Optimized) vs Legacy modes with programmatic scrolling
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  Button,
  Dimensions
} from 'react-native-web';

// Fixed item height example data
const generateListData = (size = 100) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `${i}`,
    key: `item-${i}`,
    title: `Item ${i}`,
    description: `This is item number ${i}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`
  }));
};

const ITEM_HEIGHT = 80;
const WINDOW_WIDTH = Dimensions.get('window').width;

const layoutProvider = {
  getLayoutTypeForIndex: () => 'item',
  getDimensionForType: () => ({
    width: WINDOW_WIDTH,
    height: ITEM_HEIGHT
  })
};

const rowHasChanged = (prevItem, nextItem) => {
  if (!prevItem || !nextItem) return true;
  return (
    prevItem.id !== nextItem.id ||
    prevItem.title !== nextItem.title ||
    prevItem.description !== nextItem.description
  );
};

// FlatList wrapper that exposes ref for programmatic scrolling
const FlatListWithRef = React.forwardRef(
  (
    {
      filteredData,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      renderMode,
      layoutProvider,
      rowHasChanged
    },
    ref
  ) => {
    const flatListProps = {
      data: filteredData,
      renderItem,
      keyExtractor: (item) => item.key,
      ListHeaderComponent,
      ListEmptyComponent,
      testID: 'manual-list',
      style: styles.list,
      onScrollToIndexFailed: ({ index, averageItemLength }) => {
        if (ref && typeof ref !== 'function' && ref.current?.scrollToOffset) {
          ref.current.scrollToOffset({
            offset: averageItemLength * index,
            animated: false
          });
        }
      },
      scrollEventThrottle: 50,
      initialNumToRender: 10
    };

    if (renderMode === 'optimized') {
      flatListProps.layoutProvider = layoutProvider;
      flatListProps.rowHasChanged = rowHasChanged;
    } else {
      flatListProps.getItemLayout = (data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index
      });
    }

    return <FlatList ref={ref} {...flatListProps} />;
  }
);

FlatListWithRef.displayName = 'FlatListWithRef';

function AutoTestBenchmark() {
  const [renderMode, setRenderMode] = useState('optimized');
  const [listData, setListData] = useState(() => generateListData(2000));
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementResults, setMeasurementResults] = useState({
    legacy: {
      durationMs: 0,
      scrollCount: 0,
      initialDomNodes: 0,
      finalDomNodes: 0,
      avgDomNodes: 0,
      maxDomNodes: 0,
      minDomNodes: 0,
      fpsAvg: 0,
      fpsMin: 0,
      fpsMax: 0
    },
    optimized: {
      durationMs: 0,
      scrollCount: 0,
      initialDomNodes: 0,
      finalDomNodes: 0,
      avgDomNodes: 0,
      maxDomNodes: 0,
      minDomNodes: 0,
      fpsAvg: 0,
      fpsMin: 0,
      fpsMax: 0
    }
  });
  const flatListRef = useRef(null);
  const measurementStartRef = useRef(0);
  const domNodesSamplesRef = useRef([]);
  const touchActiveRef = useRef(false);
  const wheelActiveRef = useRef(false);
  const debugWheelLastLogRef = useRef(0);
  const fpsSamplesRef = useRef([]);
  const lastFrameTimeRef = useRef(0);
  const rafIdRef = useRef(null);
  const scrollCountRef = useRef(0);
  const scrollTimeoutRef = useRef(null);

  const measureDOMNodes = useCallback(() => {
    const container =
      document.querySelector('[data-testid="manual-container"]') ||
      document.body;
    return container.querySelectorAll('*').length;
  }, []);

  const startMeasurement = useCallback(() => {
    setMeasurementResults((prev) => ({
      ...prev,
      [renderMode]: {
        durationMs: 0,
        scrollCount: 0,
        initialDomNodes: 0,
        finalDomNodes: 0,
        avgDomNodes: 0,
        maxDomNodes: 0,
        minDomNodes: 0,
        fpsAvg: 0,
        fpsMin: 0,
        fpsMax: 0
      }
    }));
    setIsMeasuring(true);
    domNodesSamplesRef.current = [];
    fpsSamplesRef.current = [];
    scrollCountRef.current = 0;
    measurementStartRef.current = performance.now();
  }, [renderMode]);

  const endMeasurement = useCallback(() => {
    const durationMs = performance.now() - measurementStartRef.current;
    const samples = domNodesSamplesRef.current;
    const avgDomNodes = samples.length
      ? samples.reduce((sum, value) => sum + value, 0) / samples.length
      : 0;

    const fpsSamples = fpsSamplesRef.current;
    const fpsAvg = fpsSamples.length
      ? fpsSamples.reduce((sum, value) => sum + value, 0) / fpsSamples.length
      : 0;
    const fpsMin = fpsSamples.length ? Math.min(...fpsSamples) : 0;
    const fpsMax = fpsSamples.length ? Math.max(...fpsSamples) : 0;

    const result = {
      durationMs,
      scrollCount: scrollCountRef.current,
      initialDomNodes: samples[0] || 0,
      finalDomNodes: samples[samples.length - 1] || 0,
      avgDomNodes: Math.round(avgDomNodes),
      maxDomNodes: samples.length ? Math.max(...samples) : 0,
      minDomNodes: samples.length ? Math.min(...samples) : 0,
      fpsAvg: Math.round(fpsAvg),
      fpsMin: Math.round(fpsMin),
      fpsMax: Math.round(fpsMax)
    };

    setMeasurementResults((prev) => ({
      ...prev,
      [renderMode]: result
    }));
    setIsMeasuring(false);
  }, [renderMode]);

  useEffect(() => {
    if (!isMeasuring) return;

    const intervalId = setInterval(() => {
      domNodesSamplesRef.current.push(measureDOMNodes());
    }, 500);

    return () => clearInterval(intervalId);
  }, [isMeasuring, measureDOMNodes]);

  useEffect(() => {
    if (!isMeasuring) return;

    const measureFps = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;

      if (delta >= 4 && delta <= 1000) {
        const nextFps = Math.min(240, Math.round(1000 / delta));
        fpsSamplesRef.current.push(nextFps);
        if (fpsSamplesRef.current.length > 5000) {
          fpsSamplesRef.current.shift();
        }
      }

      lastFrameTimeRef.current = now;
      rafIdRef.current = requestAnimationFrame(measureFps);
    };

    lastFrameTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(measureFps);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isMeasuring]);

  useEffect(() => {
    if (!isMeasuring) return;

    debugWheelLastLogRef.current = 0;

    const container = document.querySelector(
      '[data-testid="manual-container"]'
    );

    const handleWheelDebug = (event) => {
      const now = performance.now();
      if (now - debugWheelLastLogRef.current < 200) return;
      debugWheelLastLogRef.current = now;
      const path =
        typeof event.composedPath === 'function' ? event.composedPath() : [];
      const insideContainer = container
        ? container.contains(event.target)
        : false;
      const insideOverflowNode = path.some(
        (node) =>
          node instanceof Element &&
          typeof node.className === 'string' &&
          node.className.includes('r-WebkitOverflowScrolling')
      );
      const insideList = insideContainer || insideOverflowNode;
      if (insideList && isMeasuring && !wheelActiveRef.current) {
        wheelActiveRef.current = true;
        scrollCountRef.current += 1;
      }

      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        wheelActiveRef.current = false;
      }, 200);
    };

    window.addEventListener('wheel', handleWheelDebug, {
      passive: true,
      capture: true
    });

    return () => {
      window.removeEventListener('wheel', handleWheelDebug, { capture: true });
      clearTimeout(scrollTimeoutRef.current);
      wheelActiveRef.current = false;
    };
  }, [isMeasuring]);

  useEffect(() => {
    const container = document.querySelector(
      '[data-testid="manual-container"]'
    );
    const scrollCandidates = container
      ? Array.from(container.querySelectorAll('*')).filter((el) => {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY;
          return (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            el.scrollHeight > el.clientHeight
          );
        })
      : [];

    const scrollNode =
      flatListRef.current?.getScrollableNode?.() ||
      scrollCandidates[0] ||
      document.querySelector('[data-testid="manual-list"]');
    if (!scrollNode) return;

    const isFromList = (event) => {
      if (typeof event.composedPath === 'function') {
        return event.composedPath().includes(scrollNode);
      }
      const target = event.target;
      return target instanceof Node && scrollNode.contains(target);
    };

    const handleTouchStart = (event) => {
      if (!isFromList(event)) return;
      console.log('Touch start detected');
      if (!isMeasuring) return;
      touchActiveRef.current = true;
    };

    const handleTouchEnd = (event) => {
      if (!isFromList(event)) return;
      console.log('Touch end detected');
      if (!isMeasuring || !touchActiveRef.current) return;
      touchActiveRef.current = false;
      scrollCountRef.current += 1;
    };

    const handlePointerDown = (event) => {
      if (!isFromList(event) || event.pointerType !== 'touch') return;
      console.log('Pointer down detected');
      if (!isMeasuring) return;
      touchActiveRef.current = true;
    };

    const handlePointerUp = (event) => {
      if (!isFromList(event) || event.pointerType !== 'touch') return;
      console.log('Pointer up detected');
      if (!isMeasuring || !touchActiveRef.current) return;
      touchActiveRef.current = false;
      scrollCountRef.current += 1;
    };

    scrollNode.addEventListener('touchstart', handleTouchStart, {
      passive: true,
      capture: true
    });
    scrollNode.addEventListener('touchend', handleTouchEnd, {
      passive: true,
      capture: true
    });
    scrollNode.addEventListener('pointerdown', handlePointerDown, {
      passive: true,
      capture: true
    });
    scrollNode.addEventListener('pointerup', handlePointerUp, {
      passive: true,
      capture: true
    });

    return () => {
      scrollNode.removeEventListener('touchstart', handleTouchStart, {
        capture: true
      });
      scrollNode.removeEventListener('touchend', handleTouchEnd, {
        capture: true
      });
      scrollNode.removeEventListener('pointerdown', handlePointerDown, {
        capture: true
      });
      scrollNode.removeEventListener('pointerup', handlePointerUp, {
        capture: true
      });
    };
  }, [isMeasuring]);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
      </View>
    ),
    []
  );

  const ListHeaderComponent = useCallback(
    () => (
      <View style={styles.header}>
        <Text style={styles.headerText}>Manual Measurement Mode</Text>
      </View>
    ),
    []
  );

  return (
    <View data-testid="manual-container" style={styles.outerContainer}>
      <View style={styles.controlPanel}>
        <Text style={styles.title}>🧪 FlatList Manual Measurement</Text>
        <Text style={styles.description}>
          Press Start, scroll quickly, then press End to see metrics.
        </Text>

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
          <Button
            onPress={() => setListData(generateListData(2000))}
            title="Reload (2000)"
          />
          <Button
            disabled={isMeasuring}
            onPress={startMeasurement}
            title={isMeasuring ? 'Measuring...' : 'Start'}
          />
          <Button
            disabled={!isMeasuring}
            onPress={endMeasurement}
            title="End"
          />
        </View>
      </View>

      {true && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>📊 Measurement Results</Text>

          <View style={styles.resultsRow}>
            <View
              style={[
                styles.resultSubsection,
                isMeasuring &&
                  renderMode === 'optimized' && {
                    backgroundColor: '#ffcccc',
                    borderRadius: 8,
                    padding: 8
                  }
              ]}
            >
              <Text style={styles.subsectionTitle}>RLV (Optimized)</Text>
              <View style={styles.resultCard}>
                <Text style={styles.metricText}>
                  Duration:{' '}
                  {(measurementResults.optimized.durationMs / 1000).toFixed(1)}s
                </Text>
                <Text style={styles.metricText}>
                  Scroll gestures: {measurementResults.optimized.scrollCount}
                </Text>
                <Text style={styles.metricText}>
                  Initial DOM Nodes:{' '}
                  {measurementResults.optimized.initialDomNodes}
                </Text>
                <Text style={styles.metricText}>
                  Final DOM Nodes: {measurementResults.optimized.finalDomNodes}
                </Text>
                <Text style={styles.metricText}>
                  Avg DOM Nodes: {measurementResults.optimized.avgDomNodes}
                </Text>
                <Text style={styles.metricText}>
                  Avg FPS: {measurementResults.optimized.fpsAvg}
                </Text>
                <Text style={styles.metricText}>
                  Max FPS: {measurementResults.optimized.fpsMax}
                </Text>
                <Text style={styles.metricText}>
                  Min FPS: {measurementResults.optimized.fpsMin}
                </Text>
                <Text style={styles.metricText}>
                  Max DOM Nodes: {measurementResults.optimized.maxDomNodes}
                </Text>
                <Text style={styles.metricText}>
                  Min DOM Nodes: {measurementResults.optimized.minDomNodes}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.resultSubsection,
                isMeasuring &&
                  renderMode === 'legacy' && {
                    backgroundColor: '#ffcccc',
                    borderRadius: 8,
                    padding: 8
                  }
              ]}
            >
              <Text style={styles.subsectionTitle}>Legacy</Text>
              <View style={styles.resultCard}>
                <Text style={styles.metricText}>
                  Duration:{' '}
                  {(measurementResults.legacy.durationMs / 1000).toFixed(1)}s
                </Text>
                <Text style={styles.metricText}>
                  Scroll gestures: {measurementResults.legacy.scrollCount}
                </Text>
                <Text style={styles.metricText}>
                  Initial DOM Nodes: {measurementResults.legacy.initialDomNodes}
                </Text>
                <Text style={styles.metricText}>
                  Final DOM Nodes: {measurementResults.legacy.finalDomNodes}
                </Text>
                <Text style={styles.metricText}>
                  Avg DOM Nodes: {measurementResults.legacy.avgDomNodes}
                </Text>
                <Text style={styles.metricText}>
                  Avg FPS: {measurementResults.legacy.fpsAvg}
                </Text>
                <Text style={styles.metricText}>
                  Max FPS: {measurementResults.legacy.fpsMax}
                </Text>
                <Text style={styles.metricText}>
                  Min FPS: {measurementResults.legacy.fpsMin}
                </Text>
                <Text style={styles.metricText}>
                  Max DOM Nodes: {measurementResults.legacy.maxDomNodes}
                </Text>
                <Text style={styles.metricText}>
                  Min DOM Nodes: {measurementResults.legacy.minDomNodes}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.listContainer}>
        <FlatListWithRef
          ListHeaderComponent={ListHeaderComponent}
          filteredData={listData}
          layoutProvider={layoutProvider}
          ref={flatListRef}
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
  controlPanel: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    zIndex: 10
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  resultsContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  resultsRow: {
    flexDirection: 'row',
    gap: 12
  },
  resultSubsection: {
    flex: 1,
    marginBottom: 0
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8
  },
  resultCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  metricText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6
  },
  listContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f5f5f5',
    minHeight: 0
  },
  list: {
    flex: 1,
    width: '100%'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  itemContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    height: ITEM_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
    width: '100%',
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
  }
});

export default AutoTestBenchmark;
