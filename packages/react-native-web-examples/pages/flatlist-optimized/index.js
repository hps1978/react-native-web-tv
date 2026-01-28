/**
 * Copyright (c) Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useCallback } from 'react';
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

function OptimizedFlatListExample() {
  const [listData, setListData] = useState(() => generateListData(500));
  const [filter, setFilter] = useState('');
  const [renderMode, setRenderMode] = useState('optimized'); // 'optimized' or 'legacy'

  const filteredData = useCallback(() => {
    if (!filter) return listData;
    return listData.filter(
      (item) =>
        item.title.toLowerCase().includes(filter.toLowerCase()) ||
        item.description.toLowerCase().includes(filter.toLowerCase())
    );
  }, [listData, filter]);

  const handleRefresh = useCallback(() => {
    setListData(generateListData(500));
  }, []);

  const handleAddItems = useCallback(() => {
    setListData((prev) => [...prev, ...generateListData(50)]);
  }, []);

  const renderItem = useCallback(({ item, index }) => {
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemTimestamp}>{item.timestamp}</Text>
      </View>
    );
  }, []);

  const ListHeaderComponent = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>
        Optimized FlatList with RecyclerListView
      </Text>
      <Text style={styles.subheading}>
        Mode:{' '}
        {renderMode === 'optimized'
          ? '🚀 RecyclerListView (Optimized)'
          : 'Legacy VirtualizedList'}
      </Text>

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
          title={renderMode === 'optimized' ? 'Use Legacy' : 'Use Optimized'}
        />
        <Button onPress={handleRefresh} title="Refresh" />
        <Button onPress={handleAddItems} title="Add Items" />
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Total Items: {filteredData().length}
        </Text>
        <Text style={styles.statsText}>
          Item Height: {ITEM_HEIGHT}px (Fixed)
        </Text>
      </View>
    </View>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No items match your filter.</Text>
    </View>
  );

  // Optimized mode uses layoutProvider and rowHasChanged
  const flatListProps = {
    data: filteredData(),
    renderItem,
    keyExtractor: (item) => item.key,
    ListHeaderComponent,
    ListEmptyComponent,
    scrollEventThrottle: 50,
    initialNumToRender: 10,
    style: { flex: 1 } // Ensure FlatList has bounded size
  };

  // In optimized mode, add RLV-specific props
  if (renderMode === 'optimized') {
    flatListProps.layoutProvider = layoutProvider;
    flatListProps.rowHasChanged = rowHasChanged;
  }

  return (
    <View style={styles.container}>
      <FlatList {...flatListProps} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tips: For best performance, define a layoutProvider with exact item
          dimensions.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    justifyContent: 'center'
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  itemDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    numberOfLines: 1
  },
  itemTimestamp: {
    fontSize: 12,
    color: '#999'
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
