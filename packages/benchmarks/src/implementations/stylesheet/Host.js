import React from 'react';
import { StyleSheet } from 'react-native-web-tv';

function Host(props) {
  const [className, inlineStyle] = StyleSheet([styles.root, props.style]);
  return <div {...props} className={className} style={inlineStyle} />;
}

const styles = StyleSheet.create({
  root: {
    boxSizing: 'border-box',
    display: 'block',
    minHeight: 0,
    minWidth: 0
  }
});

export default Host;
