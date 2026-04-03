import {
  unstable_createElement as createElement,
  StyleSheet
} from 'react-native';

const Host = ({ style, ...other }) =>
  createElement('div', {
    ...other,
    style: [styles.root, style]
  });

const styles = StyleSheet.create({
  root: {
    boxSizing: 'border-box',
    display: 'block',
    minHeight: 0,
    minWidth: 0
  }
});

export default Host;
