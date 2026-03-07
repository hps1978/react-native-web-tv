import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Example from '../../shared/example';

export default function TextInputPage() {
  const nextFocus = React.useRef(null);
  const [focusedInput, setFocusedInput] = React.useState(null);

  const focusNextField = () => {
    if (nextFocus.current != null) {
      nextFocus.current.focus();
    }
  };

  return (
    <Example title="TextInput">
      <View style={styles.container}>
        <TextInput
          autoFocus
          onFocus={() => {
            console.log('focused');
            setFocusedInput(1);
          }}
          style={[
            styles.textinput,
            focusedInput === 1 && styles.containerFocused
          ]}
        />
        <TextInput
          blurOnSubmit={true}
          onFocus={() => {
            setFocusedInput(2);
          }}
          onSubmitEditing={() => focusNextField()}
          placeholder="blurOnSubmit"
          style={[
            styles.textinput,
            focusedInput === 2 && styles.containerFocused
          ]}
        />
        <TextInput
          clearTextOnFocus={true}
          defaultValue="clearTextOnFocus"
          onFocus={() => {
            setFocusedInput(3);
          }}
          ref={nextFocus}
          style={[
            styles.textinput,
            focusedInput === 3 && styles.containerFocused
          ]}
        />
        <TextInput
          defaultValue="disabled"
          disabled={true}
          onFocus={() => {
            setFocusedInput(4);
          }}
          style={[
            styles.textinput,
            focusedInput === 4 && styles.containerFocused
          ]}
        />
        <TextInput
          defaultValue="readOnly (true)"
          onFocus={() => {
            setFocusedInput(5);
          }}
          readOnly={true}
          style={[
            styles.textinput,
            focusedInput === 5 && styles.containerFocused
          ]}
        />
        <TextInput
          inputMode="numeric"
          onFocus={() => {
            setFocusedInput(6);
          }}
          placeholder="inputMode 'numeric'"
          style={[
            styles.textinput,
            focusedInput === 6 && styles.containerFocused
          ]}
        />
        <TextInput
          maxLength={5}
          onFocus={() => {
            setFocusedInput(7);
          }}
          placeholder="maxLength"
          style={[
            styles.textinput,
            focusedInput === 7 && styles.containerFocused
          ]}
        />

        <TextInput
          onFocus={() => {
            setFocusedInput(8);
          }}
          placeholder="placeholderTextColor"
          placeholderTextColor="orange"
          style={[
            styles.textinput,
            focusedInput === 8 && styles.containerFocused
          ]}
        />
        <TextInput
          defaultValue="selectTextOnFocus"
          onFocus={() => {
            setFocusedInput(9);
          }}
          selectTextOnFocus={true}
          style={[
            styles.textinput,
            focusedInput === 9 && styles.containerFocused
          ]}
        />
        <TextInput
          defaultValue="secureTextEntry"
          onFocus={() => {
            setFocusedInput(10);
          }}
          secureTextEntry={true}
          style={[
            styles.textinput,
            focusedInput === 10 && styles.containerFocused
          ]}
        />
        <TextInput
          multiline={true}
          onFocus={() => {
            setFocusedInput(11);
          }}
          placeholder="multiline"
          rows={3}
          style={[
            styles.textinput,
            focusedInput === 11 && styles.containerFocused
          ]}
        />
        <TextInput
          caretHidden
          defaultValue="caretHidden"
          onFocus={() => {
            setFocusedInput(12);
          }}
          style={[
            styles.textinput,
            focusedInput === 12 && styles.containerFocused
          ]}
        />
      </View>
    </Example>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    padding: '1rem'
  },
  textinput: {
    height: 26,
    borderWidth: 0.5,
    borderColor: '#0f0f0f',
    padding: 4,
    marginVertical: '1rem'
  },
  containerFocused: {
    borderWidth: 2,
    borderColor: 'orange'
  },
  multiline: {
    borderWidth: 0.5,
    borderColor: '#0f0f0f',
    padding: 4,
    marginVertical: '1rem'
  }
});
