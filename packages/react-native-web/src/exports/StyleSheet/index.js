/**
 * Copyright (c) Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import { atomic, classic, inline } from './compiler';
import { createSheet } from './dom';
import { localizeStyle } from 'styleq/transform-localize-style';
import { preprocess } from './preprocess';
import { styleq } from 'styleq';
import { validate } from './validate';
import canUseDOM from '../../modules/canUseDom';

const staticStyleMap: WeakMap<Object, Object> = new WeakMap();
const insertedInlinePrecompiledRules: WeakSet<Object> = new WeakSet();
const insertedInlinePrecompiledRuleIds: Set<string> = new Set();
const sheet = createSheet();

const defaultPreprocessOptions = { shadow: true, textShadow: true };

function createStyleqResolver(isRTL, preprocessOptions) {
  return styleq.factory({
    transform(style) {
      const inlinePrecompiled =
        style != null ? style.__rnwTvStaticPreview : null;
      if (
        inlinePrecompiled != null &&
        inlinePrecompiled.compiledStyle != null &&
        Array.isArray(inlinePrecompiled.compiledOrderedRules)
      ) {
        const inlinePrecompiledId = inlinePrecompiled.__rnwTvStaticPreviewId;
        const hasStableInlinePrecompiledId =
          typeof inlinePrecompiledId === 'string' &&
          inlinePrecompiledId.length > 0;
        const hasInsertedInlinePrecompiledRules = hasStableInlinePrecompiledId
          ? insertedInlinePrecompiledRuleIds.has(inlinePrecompiledId)
          : insertedInlinePrecompiledRules.has(inlinePrecompiled);

        if (!hasInsertedInlinePrecompiledRules) {
          insertRules(inlinePrecompiled.compiledOrderedRules);
          if (hasStableInlinePrecompiledId) {
            insertedInlinePrecompiledRuleIds.add(inlinePrecompiledId);
          } else {
            insertedInlinePrecompiledRules.add(inlinePrecompiled);
          }
        }
        return localizeStyle(inlinePrecompiled.compiledStyle, isRTL);
      }

      const compiledStyle = staticStyleMap.get(style);
      if (compiledStyle != null) {
        return localizeStyle(compiledStyle, isRTL);
      }
      return preprocess(style, preprocessOptions);
    }
  });
}

const defaultLtrStyleqResolver = createStyleqResolver(
  false,
  defaultPreprocessOptions
);
const defaultRtlStyleqResolver = createStyleqResolver(
  true,
  defaultPreprocessOptions
);

function customStyleq(styles, options: Options = {}) {
  const { writingDirection, ...preprocessOptions } = options;
  const isRTL = writingDirection === 'rtl';
  const hasCustomPreprocessOptions =
    preprocessOptions.shadow != null || preprocessOptions.textShadow != null;

  if (!hasCustomPreprocessOptions) {
    const resolver = isRTL ? defaultRtlStyleqResolver : defaultLtrStyleqResolver;
    return resolver(styles);
  }

  const mergedPreprocessOptions = {
    ...defaultPreprocessOptions,
    ...preprocessOptions
  };
  return createStyleqResolver(isRTL, mergedPreprocessOptions)(styles);
}

function insertRules(compiledOrderedRules) {
  compiledOrderedRules.forEach(([rules, order]) => {
    if (sheet != null) {
      rules.forEach((rule) => {
        sheet.insert(rule, order);
      });
    }
  });
}

function compileAndInsertAtomic(style) {
  const [compiledStyle, compiledOrderedRules] = atomic(
    preprocess(style, defaultPreprocessOptions)
  );
  insertRules(compiledOrderedRules);
  return compiledStyle;
}

function compileAndInsertReset(style, key) {
  const [compiledStyle, compiledOrderedRules] = classic(style, key);
  insertRules(compiledOrderedRules);
  return compiledStyle;
}

function getPrecompiledStyleEntry(precompiledStyles, key) {
  if (precompiledStyles == null) {
    return null;
  }
  const previewPayload = precompiledStyles.__rnwTvStaticPreview;
  if (previewPayload == null) {
    return null;
  }
  const entry = previewPayload[key];
  if (
    entry != null &&
    entry.compiledStyle != null &&
    Array.isArray(entry.compiledOrderedRules)
  ) {
    return entry;
  }
  return null;
}

/* ----- API ----- */

const absoluteFillObject = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0
};

const absoluteFill = create({ x: { ...absoluteFillObject } }).x;

/**
 * create
 */
function create<T: Object>(styles: T, precompiledStyles?: any): $ReadOnly<T> {
  Object.keys(styles).forEach((key) => {
    const styleObj = styles[key];
    const precompiledEntry = getPrecompiledStyleEntry(precompiledStyles, key);

    if (precompiledEntry != null && styleObj != null) {
      insertRules(precompiledEntry.compiledOrderedRules);
      staticStyleMap.set(styleObj, precompiledEntry.compiledStyle);
      return;
    }

    // Only compile at runtime if the style is not already compiled
    if (styleObj != null && styleObj.$$css !== true) {
      let compiledStyles;
      if (key.indexOf('$raw') > -1) {
        compiledStyles = compileAndInsertReset(styleObj, key.split('$raw')[0]);
      } else {
        if (process.env.NODE_ENV !== 'production') {
          validate(styleObj);
          styles[key] = Object.freeze(styleObj);
        }
        compiledStyles = compileAndInsertAtomic(styleObj);
      }
      staticStyleMap.set(styleObj, compiledStyles);
    }
  });
  return styles;
}

/**
 * compose
 */
function compose(style1: any, style2: any): any {
  if (process.env.NODE_ENV !== 'production') {
    /* eslint-disable prefer-rest-params */
    const len = arguments.length;
    if (len > 2) {
      const readableStyles = [...arguments].map((a) => flatten(a));
      throw new Error(
        `StyleSheet.compose() only accepts 2 arguments, received ${len}: ${JSON.stringify(
          readableStyles
        )}`
      );
    }
    /* eslint-enable prefer-rest-params */
    /*
    console.warn(
      'StyleSheet.compose(a, b) is deprecated; use array syntax, i.e., [a,b].'
    );
    */
  }
  return [style1, style2];
}

/**
 * flatten
 */
function flatten(...styles: any): { [key: string]: any } {
  const flatArray = styles.flat(Infinity);
  const result = {};
  for (let i = 0; i < flatArray.length; i++) {
    const style = flatArray[i];
    if (style != null && typeof style === 'object') {
      // $FlowFixMe
      Object.assign(result, style);
    }
  }
  return result;
}

/**
 * getSheet
 */
function getSheet(): { id: string, textContent: string } {
  return {
    id: sheet.id,
    textContent: sheet.getTextContent()
  };
}

/**
 * resolve
 */
type StyleProps = [string, { [key: string]: mixed } | null];
type Options = {
  shadow?: boolean,
  textShadow?: boolean,
  writingDirection: 'ltr' | 'rtl'
};

function StyleSheet(styles: any, options?: Options = {}): StyleProps {
  const isRTL = options.writingDirection === 'rtl';
  const styleProps: StyleProps = customStyleq(styles, options);
  if (Array.isArray(styleProps) && styleProps[1] != null) {
    styleProps[1] = inline(styleProps[1], isRTL);
  }
  return styleProps;
}

StyleSheet.absoluteFill = absoluteFill;
StyleSheet.absoluteFillObject = absoluteFillObject;
StyleSheet.create = create;
StyleSheet.compose = compose;
StyleSheet.flatten = flatten;
StyleSheet.getSheet = getSheet;
// `hairlineWidth` is not implemented using screen density as browsers may
// round sub-pixel values down to `0`, causing the line not to be rendered.
StyleSheet.hairlineWidth = 1;

if (canUseDOM && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.resolveRNStyle = StyleSheet.flatten;
}

export type IStyleSheet = {
  (styles: $ReadOnlyArray<any>, options?: Options): StyleProps,
  absoluteFill: Object,
  absoluteFillObject: Object,
  create: typeof create,
  compose: typeof compose,
  flatten: typeof flatten,
  getSheet: typeof getSheet,
  hairlineWidth: number
};

const stylesheet: IStyleSheet = StyleSheet;

export default stylesheet;
