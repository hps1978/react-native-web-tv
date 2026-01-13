import React from 'react';
import { AppRegistry, View, Text, StyleSheet } from 'react-native';
import Example from '../../shared/example';

const log = (...msg) => {
  console.log(...msg);
};

function App() {
  const [hilight, setHilight] = React.useState(null);
  React.useEffect(() => {
    return () => {};
  }, []);

  const handleFocus = (box) => {
    log('Focused TV View: ', box);
    setHilight(box);
  };
  const handleKeyDown = (e) => {
    log('[App] Key Down Event: ', e);
  };

  return (
    <View style={styles.container}>
      <Text role="heading" style={styles.heading}>
        TV View Example
      </Text>
      <View
        hasTVPreferredFocus={true}
        onFocus={() => handleFocus('orange')}
        onKeyDown={handleKeyDown}
        style={[
          styles.boxContainer,
          styles.orange,
          hilight === 'orange' ? styles.boxFocused : styles.boxUnfocused
        ]}
        tvFocusable={true}
      />
      <View
        hasTVPreferredFocus={false}
        onFocus={() => handleFocus('purple')}
        style={[
          styles.boxContainer,
          styles.purple,
          hilight === 'purple' ? styles.boxFocused : styles.boxUnfocused
        ]}
        tvFocusable={true}
      />
    </View>
  );
}

AppRegistry.registerComponent('App', () => App);

export default function AppStatePage() {
  const iframeRef = React.useRef(null);

  React.useEffect(() => {
    const iframeElement = iframeRef.current;
    const iframeBody = iframeElement.contentWindow.document.body;
    const iframeRootTag = document.createElement('div');
    iframeRootTag.id = 'iframe-root';
    iframeBody.appendChild(iframeRootTag);
    const app1 = AppRegistry.runApplication('App', { rootTag: iframeRootTag });

    return () => {
      app1.unmount();
    };
  }, []);

  return (
    <Example title="AppRegistry">
      <iframe ref={iframeRef} />
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
