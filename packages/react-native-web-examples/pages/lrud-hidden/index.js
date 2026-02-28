import React, { useRef, useEffect } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Example from '../../shared/example';

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    padding: 16
  },
  heading: {
    fontWeight: 'bold',
    marginBottom: 10
  },
  description: {
    marginBottom: 16
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  box: {
    alignItems: 'center',
    borderColor: '#888',
    borderStyle: 'solid',
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 220
  },
  visibleBox: {
    backgroundColor: '#f1f5f9'
  },
  hiddenLabel: {
    color: '#b91c1c'
  },
  hiddenDisplay: {
    display: 'none'
  },
  hiddenVisibility: {
    visibility: 'hidden'
  },
  hiddenOpacity: {
    opacity: 0,
    pointerEvents: 'none'
  },
  results: {
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderWidth: 1,
    padding: 12
  },
  resultLine: {
    marginBottom: 6
  }
});

const cases = [
  {
    id: 'hidden-display',
    label: "display: 'none'",
    style: styles.hiddenDisplay
  },
  {
    id: 'hidden-visibility',
    label: "visibility: 'hidden'",
    style: styles.hiddenVisibility
  },
  {
    id: 'hidden-opacity',
    label: "opacity: 0 + pointerEvents: 'none'",
    style: styles.hiddenOpacity
  }
];

export default function LRUDHiddenPage() {
  const [results, setResults] = React.useState({});
  const opacityAnim = useRef(new Animated.Value(0));

  // Start fade-in animation on mount
  useEffect(() => {
    Animated.timing(opacityAnim.current, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false
    }).start();
  }, []);

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const check = () => {
      const next = {};
      cases.forEach((item) => {
        const node = document.getElementById(item.id);
        if (!node) {
          next[item.id] = 'missing';
          return;
        }
        next[item.id] = node.className.indexOf('lrud-ignore') !== -1;
      });
      // Also check the animated view
      const animNode = document.getElementById('hidden-opacity-animated');
      if (animNode) {
        next['hidden-opacity-animated'] =
          animNode.className.indexOf('lrud-ignore') !== -1;
      }
      setResults(next);
    };

    const raf = requestAnimationFrame(check);
    const timeoutId = setTimeout(check, 100);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <Example title="LRUD Ignore - Hidden Styles">
      <View style={styles.container}>
        <Text role="heading" style={styles.heading}>
          Hidden Patterns -> lrud-ignore
        </Text>

        <Text style={styles.description}>
          This page verifies that RNW marks elements as lrud-ignore when hidden
          via display, visibility, or opacity + pointerEvents. The animated box
          fades in using Animated.Value and should NOT be marked as lrud-ignore.
        </Text>

        <View style={styles.row}>
          <Pressable id="visible-1" style={[styles.box, styles.visibleBox]}>
            <Text>Visible 1</Text>
          </Pressable>
          <Pressable id="visible-2" style={[styles.box, styles.visibleBox]}>
            <Text>Visible 2</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          {cases.map((item) => (
            <Pressable
              id={item.id}
              key={item.id}
              style={[styles.box, item.style]}
            >
              <Text style={styles.hiddenLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <Animated.View
            id="hidden-opacity-animated"
            style={[
              styles.box,
              styles.hiddenOpacity,
              { opacity: opacityAnim.current }
            ]}
            tabIndex={0} // Ensure the animated view is focusable for LRUD testing
          >
            <Text style={styles.hiddenLabel}>Animated opacity (fading in)</Text>
          </Animated.View>
        </View>

        <View style={styles.results}>
          {cases.map((item) => (
            <Text key={item.id} style={styles.resultLine}>
              {item.label} -> lrud-ignore: {String(results[item.id])}
            </Text>
          ))}
          <Text style={styles.resultLine}>
            Animated opacity (fading in) -> lrud-ignore:{' '}
            {String(results['hidden-opacity-animated'])}
          </Text>
        </View>
      </View>
    </Example>
  );
}
