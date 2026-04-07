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

type PrecompiledStyleMap = {
  __rnwTvStatic?: { [key: string]: mixed }
};
type PrecompiledStyleEntry = {
  compiledStyle: Object,
  compiledOrderedRules: Array<[Array<string>, number]>
};

const staticStyleMap: WeakMap<Object, Object> = new WeakMap();
const insertedPrecompiledStyleIds: Set<string> = new Set();
const sheet = createSheet();

const defaultPreprocessOptions = { shadow: true, textShadow: true };

function toPrecompiledStyleEntry(value: mixed): PrecompiledStyleEntry | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }

  const entry: PrecompiledStyleEntry = (value: any);
  if (
    entry.compiledStyle != null &&
    Array.isArray(entry.compiledOrderedRules)
  ) {
    return entry;
  }

  return null;
}

function getInlinePrecompiledStyleEntry(
  style: mixed
): PrecompiledStyleEntry | null {
  if (style == null || typeof style !== 'object') {
    return null;
  }

  return toPrecompiledStyleEntry(((style: any).__rnwTvStatic: mixed));
}

function getInlinePrecompiledStyleId(style: mixed): string | null {
  if (style == null || typeof style !== 'object') {
    return null;
  }

  const precompiledStyle = ((style: any).__rnwTvStatic: mixed);
  if (
    precompiledStyle != null &&
    typeof precompiledStyle === 'object' &&
    typeof precompiledStyle.__rnwTvStaticId === 'string'
  ) {
    return precompiledStyle.__rnwTvStaticId;
  }

  return null;
}

function customStyleq(styles, options: Options = {}) {
  const { writingDirection, ...preprocessOptions } = options;
  const isRTL = writingDirection === 'rtl';
  return styleq.factory({
    transform(style) {
      const precompiledEntry = getInlinePrecompiledStyleEntry(style);
      if (precompiledEntry != null) {
        const precompiledStyleId = getInlinePrecompiledStyleId(style);
        if (
          precompiledStyleId == null ||
          !insertedPrecompiledStyleIds.has(precompiledStyleId)
        ) {
          insertRules(precompiledEntry.compiledOrderedRules);
          if (precompiledStyleId != null) {
            insertedPrecompiledStyleIds.add(precompiledStyleId);
          }
        }
        return localizeStyle(precompiledEntry.compiledStyle, isRTL);
      }

      const compiledStyle = staticStyleMap.get(style);
      if (compiledStyle != null) {
        return localizeStyle(compiledStyle, isRTL);
      }
      return preprocess(style, {
        ...defaultPreprocessOptions,
        ...preprocessOptions
      });
    }
  })(styles);
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

function getPrecompiledStyleEntry(
  precompiledStyles: ?PrecompiledStyleMap,
  key: string
): PrecompiledStyleEntry | null {
  if (precompiledStyles == null) {
    return null;
  }
  const previewPayload = precompiledStyles.__rnwTvStatic;
  if (previewPayload == null) {
    return null;
  }
  return toPrecompiledStyleEntry(previewPayload[key]);
}

function createWithPrecompiled<T: Object>(
  styles: T,
  precompiledStyles?: PrecompiledStyleMap
): $ReadOnly<T> {
  const sourceStyles = styles || {};
  const previewPayload =
    precompiledStyles != null ? precompiledStyles.__rnwTvStatic : null;

  const keys = new Set(Object.keys(sourceStyles));
  if (previewPayload != null && typeof previewPayload === 'object') {
    Object.keys(previewPayload).forEach((key) => {
      keys.add(key);
    });
  }

  const result = {};

  keys.forEach((key) => {
    const styleObj = sourceStyles[key];
    const precompiledEntry = getPrecompiledStyleEntry(precompiledStyles, key);

    if (precompiledEntry != null) {
      insertRules(precompiledEntry.compiledOrderedRules);
      result[key] = precompiledEntry.compiledStyle;
      if (styleObj != null) {
        staticStyleMap.set(styleObj, precompiledEntry.compiledStyle);
      }
      return;
    }

    if (styleObj != null && styleObj.$$css !== true) {
      let compiledStyles;
      if (key.indexOf('$raw') > -1) {
        compiledStyles = compileAndInsertReset(styleObj, key.split('$raw')[0]);
      } else {
        if (process.env.NODE_ENV !== 'production') {
          validate(styleObj);
          sourceStyles[key] = Object.freeze(styleObj);
        }
        compiledStyles = compileAndInsertAtomic(styleObj);
      }
      staticStyleMap.set(styleObj, compiledStyles);
    }

    result[key] = sourceStyles[key];
  });

  return ((result: any): $ReadOnly<T>);
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
function create<T: Object>(styles: T): $ReadOnly<T> {
  Object.keys(styles).forEach((key) => {
    const styleObj = styles[key];
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
StyleSheet.createWithPrecompiled = createWithPrecompiled;
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
  createWithPrecompiled: typeof createWithPrecompiled,
  compose: typeof compose,
  flatten: typeof flatten,
  getSheet: typeof getSheet,
  hairlineWidth: number
};

const stylesheet: IStyleSheet = StyleSheet;

export default stylesheet;
