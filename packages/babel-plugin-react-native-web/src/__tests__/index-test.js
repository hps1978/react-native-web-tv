const plugin = require('../index');
const runtimePlugin = require('../../dist/src/index');
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
      plugins: [[runtimePlugin, pluginOptions]]
    }).code;

  test('rewrites StyleSheet.create to createWithPrecompiled', () => {
    const output = transform(
      `import { StyleSheet } from 'react-native-web-tv';
const styles = StyleSheet.create({
  root: { marginLeft: 12, color: 'red' }
});`,
      { transpileStyles: true }
    );

    expect(output).toContain('StyleSheet.createWithPrecompiled(');
    expect(output).toContain('__rnwMeta');
  });

  test('preserves mixed dynamic styles while precompiling static keys', () => {
    const output = transform(
      `import { StyleSheet } from 'react-native-web-tv';
const isFocused = Math.random() > 0.5;
const styles = StyleSheet.create({
  root: { marginLeft: 12, color: 'red' },
  dynamic: isFocused ? { opacity: 1 } : { opacity: 0.5 }
});`,
      { transpileStyles: true }
    );

    expect(output).toContain('StyleSheet.createWithPrecompiled(');
    expect(output).toContain('dynamic: isFocused ?');
    expect(output).toContain('__rnwMeta');
    expect(output).toContain('root:');
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
      { transpileStyles: true }
    );

    expect(output).toContain('__rnwMeta');
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
      { transpileStyles: true }
    );

    expect(output).toContain('__rnwMeta');
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
      { transpileStyles: true }
    );

    expect(output).toContain('isFocused ?');
    expect((output.match(/__rnwMeta:/g) || []).length).toBe(2);
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
      { transpileStyles: true }
    );

    expect(output).toContain('isFocused ?');
    expect(output).not.toContain('variants.focused');
    expect(output).not.toContain('variants.idle');
  });

  test('transpiles StyleSheet.flatten argument objects with __rnwMeta', () => {
    const output = transform(
      `import { StyleSheet } from 'react-native-web-tv';
const dynamicOpacity = Math.random() > 0.5 ? 1 : 0.35;
const style = StyleSheet.flatten([
  { padding: 8, backgroundColor: 'red' },
  { opacity: dynamicOpacity }
]);`,
      { transpileStyles: true }
    );

    expect(output).toContain('StyleSheet.flatten([');
    expect(output).toContain('__rnwMeta');
    expect(output).toContain('opacity: dynamicOpacity');
  });

  test('preserves mixed segment order for static and dynamic object keys', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

export default function Example({ dynamicLeft }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: dynamicLeft,
        backgroundColor: 'red'
      }}
    />
  );
}`,
      { transpileStyles: true }
    );

    const normalized = output.replace(/\s+/g, '');
    const firstStaticIndex = normalized.indexOf('"k":0,"sk":["position"]');
    const dynamicIndex = normalized.indexOf('"k":1,"sk":["left"]');
    const secondStaticIndex = normalized.indexOf(
      '"k":0,"sk":["backgroundColor"]'
    );

    expect(firstStaticIndex).toBeGreaterThan(-1);
    expect(dynamicIndex).toBeGreaterThan(-1);
    expect(secondStaticIndex).toBeGreaterThan(-1);
    expect(firstStaticIndex).toBeLessThan(dynamicIndex);
    expect(dynamicIndex).toBeLessThan(secondStaticIndex);
  });

  test('splits mixed style objects in source order', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

export default function Example({ dynamicLeft }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: dynamicLeft,
        backgroundColor: 'red'
      }}
    />
  );
}`,
      { transpileStyles: true }
    );

    expect(output).toContain('__rnwMeta');
    expect(output).toContain('left: dynamicLeft');
    expect(output).toContain('segments:');
  });

  test('keeps transformed arrays flat when mixed object splits inside arrays', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

const externalStyle = { borderWidth: 2 };

export default function Example({ dynamicLeft }) {
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: dynamicLeft,
          backgroundColor: 'red'
        },
        externalStyle
      ]}
    />
  );
}`,
      { transpileStyles: true }
    );

    expect(output).toContain('style={[');
    expect(output).toContain('externalStyle');
    expect(output).not.toContain('style={[[{');
  });

  test('does not re-annotate objects that already contain __rnwMeta', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

export default function Example() {
  return (
    <View
      style={{
        color: 'red',
        __rnwMeta: {
          segments: [
            {
              k: 0,
              sk: ['color'],
              cs: { $$css: true, color: 'existing-color-class' },
              cr: [[['.existing-color-class{color:rgba(255,0,0,1.00);}'], 3]]
            }
          ]
        }
      }}
    />
  );
}`,
      { transpileStyles: true }
    );

    expect((output.match(/__rnwMeta/g) || []).length).toBe(1);
    expect(output).toContain('existing-color-class');
  });

  test('keeps spread-based create style entries on runtime path', () => {
    const output = transform(
      `import { StyleSheet } from 'react-native-web-tv';
const base = { width: '100%', height: '100%' };
const styles = StyleSheet.create({
  safe: { marginLeft: 12, color: 'red' },
  withSpread: {
    ...base,
    maxHeight: 42,
    maxWidth: 42
  }
});`,
      { transpileStyles: true }
    );

    expect(output).toContain('StyleSheet.createWithPrecompiled(');
    expect(output).toContain('safe:');
    expect(output).toContain('__rnwMeta');
    expect(output).toContain('withSpread: {');
    expect(output).toContain('...base');
    expect(output).toContain('__rnwMeta: undefined');
  });

  test('shadows inherited metadata for inline object expressions containing spread', () => {
    const output = transform(
      `import React from 'react';
import { View } from 'react-native-web-tv';

const base = { width: '100%', height: '100%' };

export default function Example() {
  return <View style={{ ...base, maxHeight: 42, maxWidth: 42 }} />;
}`,
      { transpileStyles: true }
    );

    expect(output).toContain('...base');
    expect(output).toContain('maxHeight: 42');
    expect(output).toContain('maxWidth: 42');
    expect(output).toContain('__rnwMeta: undefined');
  });

  test('keeps StyleSheet.create for spread-only style maps', () => {
    const output = transform(
      `import { StyleSheet } from 'react-native-web-tv';
const base = { width: '100%', height: '100%' };
const styles = StyleSheet.create({
  withSpread: {
    ...base,
    maxHeight: 42,
    maxWidth: 42
  }
});`,
      { transpileStyles: true }
    );

    expect(output).toContain('StyleSheet.create({');
    expect(output).not.toContain('StyleSheet.createWithPrecompiled(');
    expect(output).toContain('__rnwMeta: undefined');
  });

  test('keeps __rnwMeta shadow as the last key for multi-spread objects', () => {
    const output = transform(
      `import { StyleSheet } from 'react-native-web-tv';
const baseA = { alignItems: 'center' };
const baseB = { width: '100%' };
const styles = StyleSheet.create({
  backButton: {
    ...baseA,
    ...baseB,
    position: 'absolute',
    paddingHorizontal: 12,
    flexDirection: 'row'
  }
});`,
      { transpileStyles: true }
    );

    const backButtonStart = output.indexOf('backButton: {');
    const backButtonEnd = output.indexOf('\n  }', backButtonStart);
    const backButtonBlock = output.slice(backButtonStart, backButtonEnd);

    expect(backButtonBlock).toContain('...baseA');
    expect(backButtonBlock).toContain('...baseB');
    expect(backButtonBlock).toContain('__rnwMeta: undefined');

    const metaIndex = backButtonBlock.lastIndexOf('__rnwMeta: undefined');
    const flexDirectionIndex = backButtonBlock.lastIndexOf(
      "flexDirection: 'row'"
    );
    expect(metaIndex).toBeGreaterThan(flexDirectionIndex);
  });
});
