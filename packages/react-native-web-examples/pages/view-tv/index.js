import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TVFocusGuideView
} from 'react-native';
import Example from '../../shared/example';

const log = (...msg) => {
  console.log(...msg);
};

export default function ViewPage() {
  const [hilight, setHilight] = React.useState(null);
  React.useEffect(() => {
    return () => {};
  }, []);

  const handleFocus = (box) => {
    log('[App]Focused TV View: ', box);
    setHilight(box);
  };
  const handleKeyDown = (e) => {
    log('Key Down Event: ', e);
  };

  return (
    <Example title="View TV">
      <View style={styles.container}>
        <Text role="heading" style={styles.heading}>
          TV View Example
        </Text>
        <TVFocusGuideView
          autoFocus={true}
          destinations={[]}
          focusable={true}
          style={{ height: 0, width: 0 }}
        >
          <Pressable
            hasTVPreferredFocus={true}
            onBlur={() => log('[App] orange blur')}
            onFocus={() => handleFocus('orange')}
            onKeyDown={handleKeyDown}
            style={[
              styles.boxContainer,
              styles.orange,
              hilight === 'orange' ? styles.boxFocused : styles.boxUnfocused
            ]}
            // tvFocusable={true}
          />
          <Pressable
            hasTVPreferredFocus={false}
            onBlur={() => log('[App] purple blur')}
            onFocus={() => handleFocus('purple')}
            style={[
              styles.boxContainer,
              styles.purple,
              hilight === 'purple' ? styles.boxFocused : styles.boxUnfocused
            ]}
            // tvFocusable={true}
          />
        </TVFocusGuideView>
      </View>
    </Example>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    padding: 10
  },
  heading: {
    fontWeight: 'bold',
    marginVertical: '1rem'
  },
  boxContainer: {
    height: 50,
    width: 200,
    borderWidth: 5,
    borderStyle: 'solid',
    marginVertical: 5
  },
  boxFocused: {
    borderColor: 'blue'
  },
  boxUnfocused: {
    borderColor: 'black'
  },
  orange: {
    backgroundColor: 'orange'
  },
  purple: {
    backgroundColor: 'purple'
  }
});
