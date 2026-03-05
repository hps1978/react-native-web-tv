import { StyleSheet, Text, Pressable } from 'react-native';

export default function Button(props) {
  const { title, ...other } = props;
  return (
    <Pressable
      {...other}
      style={(state) => [styles.button, state.focused && styles.buttonFocused]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'lightblue',
    borderRadius: 10,
    paddingBlock: 5,
    paddingInline: 10
  },
  buttonFocused: {
    borderColor: 'blue',
    borderWidth: 2
  },
  buttonText: {
    fontWeight: 'bold',
    textTransform: 'uppercase'
  }
});
