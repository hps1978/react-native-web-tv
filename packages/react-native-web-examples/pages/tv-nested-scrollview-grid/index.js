/**
 * TV ScrollView Grid Example
 *
 * Tests SpatialManager for ScrollView + grid layout with TVFocusGuideView containers.
 *  - An outer lrud-screen ScrollView (nativeID="lrud-screen-cities")
 *  - A TVFocusGuideView tab-bar strip (trapFocusLeft + trapFocusRight)
 *  - A nested vertically-scrollable ScrollView
 *  - A TVFocusGuideView grid container (trapFocusLeft + trapFocusRight)
 *  - A flex-wrap grid of Pressable cards
 *
 * DOM attribute mapping:
 *   nativeID="lrud-screen-cities"  → id="lrud-screen-cities"
 *   TVFocusGuideView trapFocusLeft trapFocusRight → lrud-container tabindex=-1 data-block-exit="left right"
 *   Pressable (isTVSelectable default)           → tabindex="0" focusable element
 */

'use strict';
import React from 'react';
import { useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TVFocusGuideView,
  View
} from 'react-native';
import Example from '../../shared/example';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'favourites', label: 'Favourites' }
];

const CITIES = [
  { id: 'tokyo', name: 'Tokyo' },
  { id: 'new-york', name: 'New York' },
  { id: 'london', name: 'London' },
  { id: 'paris', name: 'Paris' },
  { id: 'sydney', name: 'Sydney' },
  { id: 'dubai', name: 'Dubai' },
  { id: 'singapore', name: 'Singapore' },
  { id: 'cape-town', name: 'Cape Town' },
  { id: 'rio', name: 'Rio de Janeiro' },
  { id: 'toronto', name: 'Toronto' },
  { id: 'berlin', name: 'Berlin' },
  { id: 'mumbai', name: 'Mumbai' },
  { id: 'amsterdam', name: 'Amsterdam' },
  { id: 'seoul', name: 'Seoul' },
  { id: 'mexico-city', name: 'Mexico City' },
  { id: 'istanbul', name: 'Istanbul' },
  { id: 'cairo', name: 'Cairo' },
  { id: 'johannesburg', name: 'Johannesburg' },
  { id: 'buenos-aires', name: 'Buenos Aires' },
  { id: 'moscow', name: 'Moscow' },
  { id: 'shanghai', name: 'Shanghai' },
  { id: 'los-angeles', name: 'Los Angeles' },
  { id: 'chicago', name: 'Chicago' },
  { id: 'madrid', name: 'Madrid' },
  { id: 'rome', name: 'Rome' },
  { id: 'bangkok', name: 'Bangkok' },
  { id: 'jakarta', name: 'Jakarta' },
  { id: 'nairobi', name: 'Nairobi' },
  { id: 'lima', name: 'Lima' },
  { id: 'oslo', name: 'Oslo' },
  { id: 'stockholm', name: 'Stockholm' },
  { id: 'zurich', name: 'Zurich' },
  { id: 'vienna', name: 'Vienna' },
  { id: 'brussels', name: 'Brussels' },
  { id: 'lisbon', name: 'Lisbon' },
  { id: 'Prague', name: 'Prague' },
  { id: 'warsaw', name: 'Warsaw' },
  { id: 'helsinki', name: 'Helsinki' },
  { id: 'athens', name: 'Athens' },
  { id: 'milan', name: 'Milan' },
  { id: 'barcelona', name: 'Barcelona' }
];

// Placeholder colours so cards look distinct without real images
const CARD_COLORS = [
  '#1e3a5f',
  '#2d4a2d',
  '#5f1e1e',
  '#3a1e5f',
  '#5f4a1e',
  '#1e5f5f',
  '#4a2d5f',
  '#2d5f2d',
  '#5f2d1e',
  '#1e4a5f'
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * TabButton – mimics the tab strip items from the real app.
 * The "selected" tab gets a white background (as in the original DOM).
 */
const TabButton = ({ label, selected, onPress, hasTVPreferredFocus }) => (
  <Pressable
    hasTVPreferredFocus={hasTVPreferredFocus}
    onPress={onPress}
    style={(state) => [
      styles.tabButton,
      selected && styles.tabButtonSelected,
      state.focused && styles.tabButtonFocused
    ]}
  >
    <Text
      style={[
        styles.tabLabel,
        selected ? styles.tabLabelSelected : styles.tabLabelDefault
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

/**
 * GridCard – mimics the card tiles.
 * Uses two coloured placeholder "images" (background fill + logo area)
 * instead of real bitmap resources.
 */
const GridCard = ({ item, index }) => {
  const bgColor = CARD_COLORS[index % CARD_COLORS.length];
  const logoLetter = item.name.charAt(0).toUpperCase();

  return (
    <Pressable
      style={(state) => [
        styles.cardContainer,
        state.focused && styles.cardContainerFocused
      ]}
    >
      {/* Background image layer */}
      <View style={[styles.cardBg, { backgroundColor: bgColor }]} />

      {/* Logo / organisation image layer */}
      <View style={styles.cardLogo}>
        <Text style={styles.cardLogoLetter}>{logoLetter}</Text>
      </View>

      {/* City name label */}
      <View style={styles.cardNameBar}>
        <Text numberOfLines={2} style={styles.cardName}>
          {item.name}
        </Text>
      </View>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function TVNestedScrollViewGridExample() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <Example
      nativeID="lrud-screen-cities-header"
      title="TV Nested ScrollView Grid"
    >
      {/**
       * Outer ScrollView with nativeID="lrud-screen-cities"
       * → generates id="lrud-screen-cities" in the DOM which LRUD uses as the
       *   screen boundary for spatial navigation candidate search.
       *
       * DOM equivalent:
       *   <div id="lrud-screen-cities" style="overflow-y:scroll; flex-direction:column; flex:1">
       */}
      <ScrollView
        contentContainerStyle={styles.screenContent}
        nativeID="lrud-screen-cities"
        style={styles.screenScroll}
      >
        {/* ------------------------------------------------------------------ */}
        {/* Tab bar section                                                      */}
        {/* ------------------------------------------------------------------ */}
        {/**
         * TVFocusGuideView with trapFocusLeft + trapFocusRight (no autoFocus)
         * → lrud-container tabindex=-1 data-block-exit="left right"
         * This is a "non-focusable container" with focusable children that only traps left/right exit.
         * Focus cannot escape the tab row sideways.
         */}
        <TVFocusGuideView
          style={styles.tabContainer}
          trapFocusLeft
          trapFocusRight
        >
          <View style={styles.tabRow}>
            {TABS.map((tab, i) => (
              <TabButton
                key={tab.id}
                label={tab.label}
                onPress={() => setActiveTab(tab.id)}
                selected={activeTab === tab.id}
              />
            ))}
          </View>
        </TVFocusGuideView>

        {/* ------------------------------------------------------------------ */}
        {/* Content area – nested vertical ScrollView                           */}
        {/* ------------------------------------------------------------------ */}
        {/**
         * Inner ScrollView (no lrud-screen id)
         * → <div style="overflow-y: auto; flex:1">
         * This is the vertically-scrollable container for the grid.
         * SpatialManager's scrollToElement will scroll this when navigating
         * down into off-screen cards.
         */}
        <ScrollView
          contentContainerStyle={styles.contentScrollInner}
          style={styles.contentScroll}
        >
          {/**
           * TVFocusGuideView with trapFocusLeft + trapFocusRight (no autoFocus)
           * → lrud-container tabindex=-1 data-block-exit="left right"
           * Same pattern as tab bar – traps focus inside the grid horizontally.
           */}
          <TVFocusGuideView
            style={styles.gridContainer}
            trapFocusLeft
            trapFocusRight
          >
            {/* Flex-wrap grid matching the real app's wrapping card layout */}
            <View style={styles.grid}>
              {CITIES.map((item, index) => (
                <GridCard index={index} item={item} key={item.id} />
              ))}
            </View>
          </TVFocusGuideView>
        </ScrollView>
      </ScrollView>
    </Example>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

// Card dimensions from the real DOM (215×115 px cards, 3px border)
const CARD_WIDTH = 300;
const CARD_HEIGHT = 160;
const CARD_BORDER = 3;
const CARD_RADIUS = 5;
const CARD_GAP = 12;

const styles = StyleSheet.create({
  // --- Screen ---
  screenScroll: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    backgroundColor: '#111'
  },
  screenContent: {
    flexGrow: 1,
    height: Dimensions.get('window').height
  },

  // --- Tab bar ---
  tabContainer: {
    minHeight: 56,
    pointerEvents: 'box-none'
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 8,
    gap: 12
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: CARD_BORDER,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    transform: [{ scale: 1 }]
  },
  tabButtonSelected: {
    backgroundColor: 'rgb(250, 250, 250)'
  },
  tabButtonFocused: {
    borderColor: '#fff',
    transform: [{ scale: 1.05 }]
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  tabLabelDefault: {
    color: 'rgba(255,255,255,0.85)'
  },
  tabLabelSelected: {
    color: '#333'
  },

  // --- Content scroll ---
  contentScroll: {
    flex: 1,
    flexDirection: 'column'
  },
  contentScrollInner: {
    flexGrow: 1,
    paddingBottom: 40
  },

  // --- Grid ---
  gridContainer: {
    minHeight: CARD_HEIGHT,
    pointerEvents: 'box-none'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 24,
    rowGap: CARD_GAP
  },

  // --- Card ---
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    borderWidth: CARD_BORDER,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  cardContainerFocused: {
    borderColor: '#fff',
    transform: [{ scale: 1.03 }]
  },
  cardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  cardLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  cardLogoLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  cardNameBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    zIndex: 2
  },
  cardName: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center'
  }
});
