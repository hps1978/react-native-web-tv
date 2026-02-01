import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  Button,
  Dimensions
} from 'react-native-web';

const NUM_COLUMNS = 3;
const ITEM_HEIGHT = 60;
const GRID_GAP = 12;

const generateGridData = (size = 60) =>
  Array.from({ length: size }, (_, i) => ({
    id: `${i}`,
    key: `grid-${i}`,
    title: `Item ${i + 1}`
  }));

const rowHasChanged = (prevItem, nextItem) => {
  if (!prevItem || !nextItem) return true;
  return prevItem.id !== nextItem.id || prevItem.title !== nextItem.title;
};

export default function OptimizedFlatListGridExample() {
  console.log('Rendering OptimizedFlatListGridExample');
  const [listData, setListData] = useState(() => generateGridData(60));
  const [renderMode, setRenderMode] = useState('optimized');

  const windowWidth = Dimensions.get('window').width;
  const itemWidth = useMemo(() => {
    const totalGap = GRID_GAP * (NUM_COLUMNS - 1);
    const contentWidth = Math.max(windowWidth - 32 - totalGap, 1);
    return Math.floor(contentWidth / NUM_COLUMNS);
  }, [windowWidth]);

  const handleRefresh = useCallback(() => {
    setListData(generateGridData(60));
  }, []);

  const handleStressTest = useCallback(() => {
    setListData(generateGridData(240));
  }, []);

  const renderGridItem = useCallback(
    ({ item }) => (
      <View style={[styles.card, { width: itemWidth, height: ITEM_HEIGHT }]}>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
    ),
    [itemWidth]
  );

  const layoutProvider = useMemo(
    () => ({
      getLayoutTypeForIndex: (index) => {
        /*console.log('getLayoutTypeForIndex', index);*/ return 'item';
      },
      getDimensionForType: () => ({
        width: itemWidth,
        height: ITEM_HEIGHT
      })
    }),
    [itemWidth]
  );

  const getOptimizedItemLayout = useCallback(
    (_data, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index
    }),
    [ITEM_HEIGHT]
  );

  const GridFlatListMemo = React.memo(
    ({ data, renderItem, renderMode, layoutProvider, rowHasChanged }) => {
      const flatListProps = {
        data,
        renderItem,
        keyExtractor: (item) => item.key,
        numColumns: NUM_COLUMNS,
        columnWrapperStyle: styles.row,
        initialNumToRender: 12,
        scrollEventThrottle: 50
        // style: { width: 700, height: 2400, backgroundColor: 'red' }
      };

      if (renderMode === 'optimized') {
        flatListProps.layoutProvider = layoutProvider;
        flatListProps.getItemLayout = getOptimizedItemLayout;
        flatListProps.rowHasChanged = rowHasChanged;
      } else {
        flatListProps.getItemLayout = (_data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index
        });
      }

      return <FlatList {...flatListProps} />;
    },
    (prevProps, nextProps) =>
      prevProps.data.length === nextProps.data.length &&
      prevProps.renderMode === nextProps.renderMode &&
      prevProps.renderItem === nextProps.renderItem
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Grid FlatList (RLV vs Legacy)</Text>
        <Text style={styles.subheading}>
          Mode: {renderMode === 'optimized' ? '🚀 RLV' : '🐌 Legacy'}
        </Text>
        <View style={styles.buttonRow}>
          <Button
            onPress={() =>
              setRenderMode((m) => (m === 'optimized' ? 'legacy' : 'optimized'))
            }
            title={
              renderMode === 'optimized' ? 'Switch to Legacy' : 'Switch to RLV'
            }
          />
          <Button onPress={handleRefresh} title="Refresh" />
          <Button onPress={handleStressTest} title="Stress Test" />
        </View>
      </View>

      <GridFlatListMemo
        data={listData}
        layoutProvider={layoutProvider}
        renderItem={renderGridItem}
        renderMode={renderMode}
        rowHasChanged={rowHasChanged}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#f6f7fb'
  },
  header: {
    padding: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  subheading: {
    marginTop: 4,
    color: '#5c6b7a'
  },
  buttonRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  row: {
    gap: GRID_GAP
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e6ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: GRID_GAP
  },
  cardTitle: {
    fontWeight: '600'
  }
});
