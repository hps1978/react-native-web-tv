/**
 * Copyright (c) Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { render } from '@testing-library/react';
import FlatList from '../';
import Text from '../../../Text';
import View from '../../../View';

describe('FlatList', () => {
  describe('Backward Compatibility', () => {
    test('renders legacy implementation without new props', () => {
      const data = [
        { key: '1', title: 'Item 1' },
        { key: '2', title: 'Item 2' },
        { key: '3', title: 'Item 3' }
      ];

      const { container } = render(
        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
    });

    test('works with getItemLayout prop (legacy optimization)', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        key: `${i}`,
        title: `Item ${i}`
      }));

      const getItemLayout = (data, index) => ({
        length: 50,
        offset: 50 * index,
        index
      });

      const { container } = render(
        <FlatList
          data={data}
          getItemLayout={getItemLayout}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
    });

    test('renders empty component when data is empty', () => {
      const { container } = render(
        <FlatList
          ListEmptyComponent={() => <Text>No items</Text>}
          data={[]}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      expect(container.textContent).toContain('No items');
    });

    test('renders header and footer components', () => {
      const data = [{ key: '1', title: 'Item 1' }];

      const { container } = render(
        <FlatList
          ListFooterComponent={() => <Text>Footer</Text>}
          ListHeaderComponent={() => <Text>Header</Text>}
          data={data}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      expect(container.textContent).toContain('Header');
      expect(container.textContent).toContain('Footer');
    });
  });

  describe('RLV Adapter Optimization', () => {
    test('uses RLV adapter when layoutProvider prop is provided', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        key: `${i}`,
        title: `Item ${i}`
      }));

      const layoutProvider = (index) => ({
        width: '100%',
        height: 50
      });

      const { container } = render(
        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          layoutProvider={layoutProvider}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
    });

    test('uses rowHasChanged for per-item change detection', () => {
      const data = Array.from({ length: 5 }, (_, i) => ({
        key: `${i}`,
        title: `Item ${i}`
      }));

      const rowHasChanged = (prev, next) => {
        return prev.title !== next.title;
      };

      const { container, rerender } = render(
        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          layoutProvider={(index) => ({ width: '100%', height: 50 })}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          rowHasChanged={rowHasChanged}
        />
      );

      expect(container.querySelectorAll('div').length).toBeGreaterThan(0);

      // Update data
      const newData = [
        ...data.slice(0, 2),
        { ...data[2], title: 'Item 2 Updated' },
        ...data.slice(3)
      ];

      rerender(
        <FlatList
          data={newData}
          keyExtractor={(item) => item.key}
          layoutProvider={(index) => ({ width: '100%', height: 50 })}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          rowHasChanged={rowHasChanged}
        />
      );

      expect(container.textContent).toContain('Item 2 Updated');
    });

    test('combines layoutProvider and rowHasChanged for full optimization', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        key: `${i}`,
        title: `Item ${i}`,
        value: Math.random()
      }));

      const layoutProvider = (index) => ({
        width: '100%',
        height: 60
      });

      const rowHasChanged = (prev, next) => {
        return prev.title !== next.title;
      };

      const { container } = render(
        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          layoutProvider={layoutProvider}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          rowHasChanged={rowHasChanged}
        />
      );

      expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
    });
  });

  describe('Item Separator Support', () => {
    test('renders ItemSeparatorComponent', () => {
      const data = [
        { key: '1', title: 'Item 1' },
        { key: '2', title: 'Item 2' }
      ];

      const { container } = render(
        <FlatList
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: '#ccc' }} />
          )}
          data={data}
          keyExtractor={(item) => item.key}
          layoutProvider={(index) => ({ width: '100%', height: 50 })}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      // Should render separator lines
      const separators = container.querySelectorAll(
        '[style*="backgroundColor"]'
      );
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Data Updates', () => {
    test('updates list when data changes', () => {
      const initialData = [
        { key: '1', title: 'Item 1' },
        { key: '2', title: 'Item 2' }
      ];

      const { container, rerender } = render(
        <FlatList
          data={initialData}
          keyExtractor={(item) => item.key}
          layoutProvider={(index) => ({ width: '100%', height: 50 })}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      expect(container.textContent).toContain('Item 1');
      expect(container.textContent).toContain('Item 2');

      const newData = [
        { key: '1', title: 'Item 1 Updated' },
        { key: '2', title: 'Item 2' },
        { key: '3', title: 'Item 3' }
      ];

      rerender(
        <FlatList
          data={newData}
          keyExtractor={(item) => item.key}
          layoutProvider={(index) => ({ width: '100%', height: 50 })}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      expect(container.textContent).toContain('Item 1 Updated');
      expect(container.textContent).toContain('Item 3');
    });

    test('handles large data sets efficiently', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        key: `${i}`,
        title: `Item ${i}`
      }));

      const { container } = render(
        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          layoutProvider={(index) => ({ width: '100%', height: 50 })}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      // Should render without crashing
      expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
    });
  });

  describe('TV Support', () => {
    test('marks focusable items with TV attributes', () => {
      const data = [
        { key: '1', title: 'Item 1', isTVSelectable: true },
        { key: '2', title: 'Item 2', isTVSelectable: false }
      ];

      const { container } = render(
        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          layoutProvider={(index) => ({ width: '100%', height: 50 })}
          renderItem={({ item }) => <Text>{item.title}</Text>}
        />
      );

      const focusables = container.querySelectorAll(
        '[data-rnw-focusable="true"]'
      );
      expect(focusables.length).toBeGreaterThan(0);
    });
  });
});
