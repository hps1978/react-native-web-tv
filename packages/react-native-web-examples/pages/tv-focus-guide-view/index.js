/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

import type { FocusEvent } from '../../../../react-native/Libraries/Types/CoreEventTypes';

import React from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TVFocusGuideView,
  View
} from 'react-native';

// Set it to false to see the behavior without TVFocusGuide.
const FOCUS_GUIDE_ENABLED = true;

const screenHeight = Dimensions.get('window').height;
const scale = screenHeight / 1080;

const generateData = (length: number = 10, randomize: boolean = false) => {
  return Array.from({ length }).map((item, index) => {
    if (randomize) {
      return Math.floor(Math.random() * 999);
    }

    return index;
  });
};

const TVFocusGuide = React.forwardRef((props: any, forwardedRef: any) => {
  if (!FOCUS_GUIDE_ENABLED) {
    return <View {...props} />;
  }

  return <TVFocusGuideView {...props} ref={forwardedRef} />;
});

const Text = ({ style, children }: { style: any, children: any }) => {
  return (
    <RNText style={[styles.text, { color: 'black' }, style]}>{children}</RNText>
  );
};

const FocusableBox = React.memo(
  React.forwardRef(
    (
      props: {
        id?: number,
        width?: number,
        height?: number,
        text?: string,
        slow?: boolean,
        onFocus?: ?(e: FocusEvent, id?: number) => void,
        onPress?: any,
        style: $FlowFixMe,
        hasTVPreferredFocus?: boolean
      },
      forwardRef
    ) => {
      const { id, width, height, text, slow, style, hasTVPreferredFocus } =
        props;

      if (slow) {
        const now = performance.now();

        while (performance.now() - now < 200) {}
      }

      const onFocus = (e: any) => props?.onFocus?.(e, id);
      const onPress = (e: any) => props?.onPress?.(e, id);
      return (
        <Pressable
          hasTVPreferredFocus={hasTVPreferredFocus}
          onFocus={onFocus}
          onPress={onPress}
          ref={forwardRef}
          style={(state) => [
            {
              width,
              height,
              backgroundColor: 'lightgray',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4
            },
            state.focused && { borderColor: 'blue', borderWidth: 4 },
            style
          ]}
        >
          {text !== undefined ? (
            <Text style={{ fontSize: 24 * scale }}>{text}</Text>
          ) : null}
        </Pressable>
      );
    }
  )
);

const SideMenu = React.forwardRef((props: any, forwardedRef: any) => {
  const sideMenuItemStyle = [
    styles.sideMenuItem,
    { backgroundColor: 'lightgray' }
  ];
  return (
    <TVFocusGuide autoFocus ref={forwardedRef} style={styles.sideMenuContainer}>
      <Text style={{ fontSize: 18 * scale, marginBottom: 10 * scale }}>
        Side Menu
      </Text>

      <FocusableBox style={sideMenuItemStyle} />
      <FocusableBox style={sideMenuItemStyle} />
      <FocusableBox style={sideMenuItemStyle} />
      <FocusableBox style={sideMenuItemStyle} />
      <FocusableBox style={sideMenuItemStyle} />
    </TVFocusGuide>
  );
});

const getItemText = ({ item, prefix }: { item: number, prefix: string }) => {
  return prefix ? `${prefix}-${item}` : `${item}`;
};

const HList = React.forwardRef(
  (
    {
      itemCount,
      itemWidth = 500 * scale,
      itemHeight = 120 * scale,
      onItemFocused,
      onItemPressed,
      prefix = '',
      slow,
      ...props
    }: {
      itemCount?: number,
      itemWidth?: number,
      itemHeight?: number,
      onItemFocused?: any,
      onItemPressed?: any,
      prefix?: string,
      slow?: boolean,
      onPress?: any,
      data?: any,
      initialNumToRender?: number,
      maxToRenderPerBatch?: number,
      windowSize?: number
    },
    forwardedRef: any
  ) => {
    const data = React.useMemo(() => generateData(itemCount), [itemCount]);

    const renderItem: any = ({
      item,
      index
    }: {
      item: number,
      index: number
    }) => {
      return (
        <FocusableBox
          height={itemHeight}
          id={item}
          onFocus={onItemFocused}
          onPress={onItemPressed}
          slow={slow}
          style={styles.mr5}
          text={getItemText({ prefix, item })}
          width={itemWidth}
        />
      );
    };

    return (
      <FlatList
        contentContainerStyle={styles.hListContainer}
        data={data}
        horizontal
        keyExtractor={(item) => getItemText({ prefix, item })}
        ref={forwardedRef}
        renderItem={renderItem}
        {...props}
      />
    );
  }
);

const categoryData = [1, 2, 3, 4, 5];
const getSelectedItemPrefix = (selectedCategory: string) => {
  if (selectedCategory === null) {
    return 'Item';
  }

  return `Category ${selectedCategory} - Item`;
};

const Row = ({
  title,
  focusable,
  autoFocus
}: {
  title: string,
  focusable?: boolean,
  autoFocus?: boolean
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState('1');

  const onCategoryFocused = (event: any, id: number) => {
    setSelectedCategory(id.toString());
  };

  return (
    <View style={styles.mb5}>
      <TVFocusGuide
        autoFocus={autoFocus !== false}
        focusable={focusable}
        importantForAccessibility={
          focusable === false ? 'no-hide-descendants' : 'auto'
        }
        style={styles.rowTop}
      >
        <Text style={styles.rowTitle}>{title}</Text>
        <HList
          data={categoryData}
          itemCount={5}
          itemHeight={50 * scale}
          itemWidth={200 * scale}
          onItemFocused={onCategoryFocused}
          prefix="Category"
        />
      </TVFocusGuide>
      <TVFocusGuide
        autoFocus
        focusable={focusable}
        importantForAccessibility={
          focusable === false ? 'no-hide-descendants' : 'auto'
        }
        style={styles.mb5}
      >
        <HList
          itemCount={10}
          prefix={getSelectedItemPrefix(selectedCategory)}
        />
      </TVFocusGuide>
    </View>
  );
};

const Col = ({ title }: { title: string }) => {
  return (
    <TVFocusGuide autoFocus style={styles.col}>
      <Text style={styles.colTitle}>{title}</Text>
      <FocusableBox style={styles.colItem} text="0" />
      <FocusableBox style={styles.colItem} text="1" />
      <FocusableBox style={styles.colItem} text="2" />
      <FocusableBox style={styles.colItem} text="3" />
    </TVFocusGuide>
  );
};

const FocusToTheSameDestinationTest = () => {
  const [destinationItem, setDestinationItem] = React.useState<any>(null);

  return (
    <TVFocusGuide destinations={[destinationItem]} style={styles.col}>
      <Text style={styles.colTitle}>
        Focus To The Specific Destination (Always)
      </Text>
      <FocusableBox style={styles.colItem} text="0" />
      <FocusableBox ref={setDestinationItem} style={styles.colItem} text="1" />
      <FocusableBox style={styles.colItem} text="2" />
      <FocusableBox style={styles.colItem} text="3" />
    </TVFocusGuide>
  );
};

/**
 * Demonstrates the usage of `destinations` and `autoFocus` props
 * together in harmony without losing state.
 */
const FocusToTheDestinationOnlyOnceTest = () => {
  const visited = React.useRef(false);
  const focusGuideRef =
    React.useRef<?React.ElementRef<typeof TVFocusGuideView>>(null);
  const destinationItemRef = React.useRef<any>(null);

  React.useEffect(() => {
    focusGuideRef.current?.setDestinations([destinationItemRef.current]);
  }, []);

  return (
    <TVFocusGuide
      autoFocus
      destinations={[destinationItemRef.current]}
      ref={focusGuideRef}
      style={styles.col}
    >
      <Text style={styles.colTitle}>
        Focus To The Specific Destination (Once)
      </Text>
      <FocusableBox style={styles.colItem} text="0" />
      <FocusableBox style={styles.colItem} text="1" />
      <FocusableBox
        onFocus={() => {
          if (visited.current === false) {
            focusGuideRef.current?.setDestinations([]);
            visited.current = true;
          }
        }}
        ref={destinationItemRef}
        style={styles.colItem}
        text="2"
      />
      <FocusableBox style={styles.colItem} text="3" />
    </TVFocusGuide>
  );
};

const RestoreFocusOnScrollToTopTestList = () => {
  const listRef = React.useRef<React.ElementRef<typeof FlatList> | null>(null);
  /**
   * This is an example to make sure that the focus is restored
   * when the list is scrolled to the top. On Android, `removeClippedSubviews` is enabled
   * for the lists by default. This leads to this weird behavior where the focus gets lost
   * when view clipping logic can't keep up with the scroll speed.
   */

  const onItemPressed = () => {
    listRef.current?.scrollToIndex({ index: 0, animated: false });
  };

  return (
    <TVFocusGuide autoFocus style={styles.mb5}>
      <Text
        style={[
          styles.rowTitle,
          { marginLeft: 16 * scale, marginVertical: 16 * scale }
        ]}
      >
        Restore Focus on Scroll To Top Test
      </Text>
      <HList itemCount={10} onItemPressed={onItemPressed} ref={listRef} />
    </TVFocusGuide>
  );
};

const RestoreFocusTestList = () => {
  const [randomize, setRandomize] = React.useState(false);
  const data = React.useMemo(() => generateData(10, randomize), [randomize]);
  /**
   * This is a test to make sure that the focus is restored
   * after the list is re-rendered and currently focused item is removed.
   *
   * We force the list to re-render by toggling the `randomize` state. It invalidates
   * the `data` and causes the list to re-render with random or regular data.
   */
  const onItemPressed = ({ item }: { item: number }) => setRandomize((r) => !r);
  return (
    <TVFocusGuide autoFocus style={styles.mb5}>
      <Text
        style={[
          styles.rowTitle,
          { marginLeft: 16 * scale, marginVertical: 16 * scale }
        ]}
      >
        Restore Focus When All The Items Change Test
      </Text>
      <HList data={data} itemCount={10} onItemPressed={onItemPressed} />
    </TVFocusGuide>
  );
};

const RestoreFocusOnSingleDeletionTestList = () => {
  const [data, setData] = React.useState(() => generateData(10, false));
  const itemNeedsToBeFocusedRef = React.useRef<?number>(undefined);

  const onItemPressed = (id: number, index: number) => {
    // We practially set the focus to the previous item here
    itemNeedsToBeFocusedRef.current = index - 1;
    setData((d) => d.filter((i) => i !== id));
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    return (
      <FocusableBox
        hasTVPreferredFocus={index === itemNeedsToBeFocusedRef.current}
        height={100 * scale}
        id={item}
        onPress={() => onItemPressed(item, index)}
        style={styles.mr5}
        text={`${item}`}
        width={300 * scale}
      />
    );
  };

  return (
    <TVFocusGuide autoFocus style={styles.mb5}>
      <Text
        style={[
          styles.rowTitle,
          { marginLeft: 16 * scale, marginVertical: 16 * scale }
        ]}
      >
        Restore Focus To Previous Item on Deletion Test
      </Text>

      <FlatList
        contentContainerStyle={styles.hListContainer}
        data={data}
        horizontal
        keyExtractor={(item) => item.toString()}
        renderItem={({ item, index }) => renderItem({ item, index })}
      />
    </TVFocusGuide>
  );
};

const SlowListFocusTest = () => {
  const data = React.useMemo(() => generateData(10), []);

  /**
   * This is a testing playground for virtualized lists with slow components.
   * Focus should be trapped inside the list until user reaches the end
   * or the beginning of the list.
   */

  return (
    <TVFocusGuide autoFocus style={styles.mb5}>
      <Text style={styles.slowListTitle}>Slow List Focus Test</Text>
      <View style={{ flexDirection: 'row' }}>
        <FocusableBox style={styles.slowListPlaceholderItem} text="LEFT" />
        <View style={styles.slowList}>
          <HList
            data={data}
            initialNumToRender={4}
            itemWidth={550 * scale}
            maxToRenderPerBatch={1}
            slow
            windowSize={1}
          />
        </View>
        <FocusableBox style={styles.slowListPlaceholderItem} text="RIGHT" />
      </View>
    </TVFocusGuide>
  );
};

type ContentAreaProps = $ReadOnly<{|
  sideMenuRef: { current: any }
|}>;

const ContentArea = React.forwardRef(
  ({ sideMenuRef }: ContentAreaProps, forwardedRef: any) => {
    return (
      <TVFocusGuide autoFocus ref={forwardedRef} style={{ flex: 1 }}>
        <ScrollView>
          <Text style={styles.pageTitle}>
            Welcome to the TVFocusGuide autoFocus example!
          </Text>
          <RestoreFocusTestList />
          <RestoreFocusOnSingleDeletionTestList />
          <RestoreFocusOnScrollToTopTestList />
          <SlowListFocusTest />
          <Row title="Category Example 1" />
          <Row title="Category Example 2" />
          <Row focusable={false} title="Disabled Focus Subviews Example" />
          <Row
            autoFocus={false}
            focusable={false}
            title="Disabled Focus Subviews Example no autoFocus"
          />

          <FocusableBox
            onPress={() => {
              sideMenuRef.current?.requestTVFocus();
            }}
            style={styles.focusToSideMenuBtn}
            text="Focus To Side Menu"
          />

          <TVFocusGuide autoFocus style={styles.cols}>
            <Col title="Genres" />
            <FocusToTheSameDestinationTest />
            <FocusToTheDestinationOnlyOnceTest />
          </TVFocusGuide>
        </ScrollView>
      </TVFocusGuide>
    );
  }
);

export default function TVFocusGuideAutoFocusExample() {
  const sideMenuRef =
    React.useRef<?React.ElementRef<typeof TVFocusGuide>>(null);

  return (
    <View style={[styles.container, { backgroundColor: 'darkgray' }]}>
      <SideMenu ref={sideMenuRef} />
      <ContentArea sideMenuRef={sideMenuRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fillAndCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mb5: { marginBottom: 5 * scale },
  mr5: { marginRight: 5 * scale },
  text: {
    fontWeight: 'bold',
    fontSize: 18 * scale
  },
  hListContainer: { paddingHorizontal: 16 * scale },
  col: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8 * scale
  },
  rowTop: {
    flexDirection: 'row',
    marginVertical: 5 * scale,
    padding: 10 * scale,
    alignItems: 'center'
  },
  rowTitle: { marginRight: 10 * scale, fontSize: 24 * scale },
  colTitle: { margin: 10 * scale, fontSize: 24 * scale },
  slowListTitle: { fontSize: 24 * scale, margin: 16 * scale },
  container: {
    flex: 1,
    flexDirection: 'row'
  },
  sideMenuContainer: {
    width: 100 * scale,
    alignItems: 'center'
  },
  sideMenuItem: {
    width: 80 * scale,
    height: 80 * scale,
    marginBottom: 6 * scale
  },
  cols: {
    flexDirection: 'row',
    paddingHorizontal: 16 * scale
  },
  colItem: {
    width: '100%',
    height: 100 * scale,
    marginBottom: 5 * scale
  },
  pageTitle: { fontSize: 48 * scale, margin: 10 * scale },
  slowListPlaceholderItem: {
    width: 100 * scale
  },
  slowList: {
    flex: 1,
    marginHorizontal: 8 * scale
  },
  focusToSideMenuBtn: {
    height: 100 * scale,
    marginHorizontal: 16 * scale
  }
});
