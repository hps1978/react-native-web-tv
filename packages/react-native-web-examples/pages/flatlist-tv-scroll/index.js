/**
 * Copyright (c) Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  FlatList,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Image,
  Pressable
} from 'react-native-web';

const ROW_COUNT = 10;
const ITEM_COUNT = 15;
const ITEM_SIZE = 170; //250;
const ITEM_SPACING = 16;
const ROW_TITLE_HEIGHT = 28;
const ITEM_TEXT_HEIGHT = 24;
const ROW_HEIGHT = ITEM_SIZE + ITEM_TEXT_HEIGHT + 20;

const buildRowData = (rowIndex) =>
  Array.from({ length: ITEM_COUNT }, (_, i) => ({
    id: `row-${rowIndex}-item-${i}`,
    title: `Row ${rowIndex + 1} · Item ${i + 1}`,
    imageUri: `https://picsum.photos/seed/tv-${rowIndex}-${i}/${ITEM_SIZE}/${ITEM_SIZE}`
  }));

function FlatListTVScrollExample() {
  const rows = useMemo(
    () =>
      Array.from({ length: ROW_COUNT }, (_, rowIndex) =>
        buildRowData(rowIndex)
      ),
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.appConfig = {
      scrollConfig: {
        edgeThresholdPx: 10,
        scrollThrottleMs: 80, // Not implemented
        smoothScrollEnabled: true,
        scrollAnimationDurationMsVertical: 100,
        scrollAnimationDurationMsHorizontal: 100
      },
      focusConfig: {
        mode: 'AlignLeft'
      },
      keydownThrottleMs: 0
    };
  }, []);

  const renderItemForRow = useCallback(
    (rowIndex) =>
      ({ item, index }) => {
        const isPreferredFocus = rowIndex === 0 && index === 0;
        return (
          <Pressable hasTVPreferredFocus={isPreferredFocus} style={styles.card}>
            <Image
              resizeMode="cover"
              source={{ uri: item.imageUri }}
              style={styles.image}
            />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </Pressable>
        );
      },
    []
  );

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TV FlatList Scroll Test</Text>
        <Text style={styles.headerSubtitle}>
          {ROW_COUNT} rows · {ITEM_COUNT} items per row
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.verticalContent}
        showsVerticalScrollIndicator
        style={styles.verticalScroll}
      >
        {rows.map((rowData, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.rowSection}>
            <Text style={styles.rowTitle}>Row {rowIndex + 1}</Text>
            <FlatList
              contentContainerStyle={styles.rowContent}
              data={rowData}
              horizontal
              keyExtractor={keyExtractor}
              renderItem={renderItemForRow(rowIndex)}
              showsHorizontalScrollIndicator
              style={styles.rowList}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    height: '100vh',
    backgroundColor: '#0f172a'
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc'
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#cbd5f5'
  },
  verticalScroll: {
    flex: 1,
    minHeight: 0
  },
  verticalContent: {
    paddingBottom: 24
  },
  rowSection: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 18
  },
  rowTitle: {
    height: ROW_TITLE_HEIGHT,
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8
  },
  rowList: {
    height: ROW_HEIGHT
  },
  rowContent: {
    paddingRight: ITEM_SPACING
  },
  card: {
    width: ITEM_SIZE,
    marginRight: ITEM_SPACING,
    borderRadius: 12,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2a44',
    overflow: 'hidden',
    margin: '10px'
  },
  image: {
    width: ITEM_SIZE,
    height: ITEM_SIZE
  },
  cardTitle: {
    height: ITEM_TEXT_HEIGHT,
    paddingHorizontal: 10,
    paddingTop: 6,
    fontSize: 12,
    color: '#e2e8f0'
  }
});

export default FlatListTVScrollExample;
