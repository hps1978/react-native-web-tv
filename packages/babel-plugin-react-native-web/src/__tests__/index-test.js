const plugin = require('../index');
const pluginTester = require('babel-plugin-tester').default;
const babel = require('@babel/core');

const tests = [
  // import react-native
  {
    title: 'import from "react-native"',
    code: `import ReactNative from 'react-native';
import { View } from 'react-native';
import { Invalid, View as MyView } from 'react-native';
import { useLocaleContext } from 'react-native';
import * as ReactNativeModules from 'react-native';`,
    snapshot: true
  },
  {
    title: 'import from "react-native"',
    code: `import ReactNative from 'react-native';
import { View } from 'react-native';
import { Invalid, View as MyView } from 'react-native';
import * as ReactNativeModules from 'react-native';`,
    snapshot: true,
    pluginOptions: { commonjs: true }
  },
  {
    title: 'import from "react-native-web"',
    code: `import { unstable_createElement } from 'react-native-web';
import { StyleSheet, View, Pressable, processColor } from 'react-native-web';
import * as ReactNativeModules from 'react-native-web';`,
    snapshot: true
  },
  {
    title: 'import from "react-native-web-tv"',
    code: `import { unstable_createElement } from 'react-native-web-tv';
import { StyleSheet, View, Pressable, processColor } from 'react-native-web-tv';
import * as ReactNativeModules from 'react-native-web-tv';`,
    snapshot: true
  },
  {
    title: 'export from "react-native"',
    code: `export { View } from 'react-native';
export { StyleSheet, Text, unstable_createElement } from 'react-native';`,
    snapshot: true
  },
  {
    title: 'export from "react-native-web"',
    code: `export { View } from 'react-native-web';
export { StyleSheet, Text, unstable_createElement } from 'react-native-web';`,
    snapshot: true
  },
  {
    title: 'export from "react-native-web-tv"',
    code: `export { View } from 'react-native-web-tv';
export { StyleSheet, Text, unstable_createElement } from 'react-native-web-tv';`,
    snapshot: true
  },
  // require react-native
  {
    title: 'require "react-native"',
    code: `const ReactNative = require('react-native');
const { View } = require('react-native');
const { StyleSheet, Pressable } = require('react-native');`,
    snapshot: true
  },
  {
    title: 'require "react-native"',
    code: `const ReactNative = require('react-native');
const { View } = require('react-native');
const { StyleSheet, Pressable } = require('react-native');`,
    snapshot: true,
    pluginOptions: { commonjs: true }
  },
  {
    title: 'require "react-native-web"',
    code: `const ReactNative = require('react-native-web');
const { unstable_createElement } = require('react-native-web');
const { StyleSheet, View, Pressable, processColor } = require('react-native-web');`,
    snapshot: true
  },
  {
    title: 'require "react-native-web-tv"',
    code: `const ReactNative = require('react-native-web-tv');
const { unstable_createElement } = require('react-native-web-tv');
const { StyleSheet, View, Pressable, processColor } = require('react-native-web-tv');`,
    snapshot: true
  }
];

pluginTester({
  babelOptions: {
    generatorOpts: {
      jsescOption: {
        quotes: 'single'
      }
    }
  },
  plugin,
  pluginName: 'Rewrite react-native to react-native-web',
  tests
});

describe('static style replace mode', () => {
  const transform = (code, pluginOptions = {}) =>
    babel.transformSync(code, {
      babelrc: false,
      configFile: false,
      parserOpts: {
        plugins: ['jsx']
      },
      plugins: [[plugin, pluginOptions]]
    }).code;

  test('rewrites StyleSheet.create to createWithPrecompiled', () => {
    const output = transform(
      `import { StyleSheet } from 'react-native-web-tv';
const styles = StyleSheet.create({
  root: { marginLeft: 12, color: 'red' }
});`,
      { extractStaticStylesReplace: true }
    );

    expect(output).toContain('StyleSheet.createWithPrecompiled(');
    expect(output).toContain('__rnwTvStatic');
  });

  test('preserves mixed dynamic styles while precompiling static keys', () => {
    const output = transform(
      `import { StyleSheet } from 'react-native-web-tv';
const isFocused = Math.random() > 0.5;
const styles = StyleSheet.create({
  root: { marginLeft: 12, color: 'red' },
  dynamic: isFocused ? { opacity: 1 } : { opacity: 0.5 }
});`,
      { extractStaticStylesReplace: true }
    );

    expect(output).toContain('StyleSheet.createWithPrecompiled(');
    expect(output).toContain('dynamic: isFocused ?');
    expect(output).toContain('__rnwTvStatic');
    expect(output).toContain('"root"');
  });

  test('transpiles complex style prop arrays with static object literals and keeps dynamic values', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

const externalStyle = { borderWidth: 2 };
const dynamicOpacity = Math.random() > 0.5 ? 1 : 0.35;

export default function Example({ isFocused, isCompact }) {
  return (
    <View
      style={[
        { paddingVertical: 12, backgroundColor: 'red' },
        isFocused && { transform: [{ scale: 1.05 }] },
        { opacity: dynamicOpacity },
        isCompact ? { marginLeft: 4 } : { marginLeft: 10 },
        externalStyle
      ]}
    />
  );
}`,
      { transpileStaticStyleProps: true }
    );

    expect(output).toContain('__rnwTvStatic');
    expect(output).toContain('dynamicOpacity');
    expect(output).toContain('externalStyle');
    expect(output).toContain('isFocused &&');
    expect(output).toContain('isCompact ?');
  });

  test('transpiles nested mixed arrays of styles while preserving runtime expressions', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

export default function Example({ palette, state, emphasis }) {
  const runtimeColor = palette[state];
  return (
    <View
      style={[
        [{ padding: 8 }, { borderColor: 'blue', borderWidth: 1 }],
        emphasis && [{ letterSpacing: 1 }, { lineHeight: 20 }],
        { color: runtimeColor }
      ]}
    />
  );
}`,
      { transpileStaticStyleProps: true }
    );

    expect(output).toContain('__rnwTvStatic');
    expect(output).toContain('runtimeColor');
    expect(output).toContain('emphasis &&');
    expect(output).toContain('style={[');
  });

  test('transpiles conditional static branches to inline payloads', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

export default function Example({ isFocused }) {
  return (
    <View
      style={isFocused ? { opacity: 1, color: 'red' } : { opacity: 0.5, color: 'blue' }}
    />
  );
}`,
      { transpileStaticStyleProps: true }
    );

    expect(output).toContain('isFocused ?');
    expect(output).toContain('__rnwTvStaticId');
    expect((output.match(/__rnwTvStatic:/g) || []).length).toBe(2);
  });

  test('transpiles referenced static branches to inline payloads', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

const variants = {
  focused: { padding: 12, backgroundColor: 'red' },
  idle: { padding: 8, backgroundColor: 'blue' }
};

export default function Example({ isFocused }) {
  return <View style={isFocused ? variants.focused : variants.idle} />;
}`,
      { transpileStaticStyleProps: true }
    );

    expect(output).toContain('isFocused ?');
    expect(output).toContain('__rnwTvStaticId');
    expect(output).not.toContain('variants.focused');
    expect(output).not.toContain('variants.idle');
  });
});
