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

/**
 * __rnwMeta segment shapes (compact field names for bundle size).
 * k  = kind: 0 (static) | 1 (dynamic)
 * sk = sourceKeys: authored property names covered by this segment
 * cs = compiledStyle: compiled token object (static segments only)
 * cr = compiledOrderedRules: CSS rule tuples (static segments only)
 *
 * NOTE: __rnwMeta is a reserved internal key. Do not use this property name
 * in application style objects. SSR is not supported by this metadata path.
 */
type RnwMetaStaticSegment = {
  k: 0,
  sk: Array<string>,
  cs: Object,
  cr: Array<[Array<string>, number]>
};
type RnwMetaDynamicSegment = {
  k: 1,
  sk: Array<string>
};
type RnwMetaSegment = RnwMetaStaticSegment | RnwMetaDynamicSegment;
type RnwMeta = {
  segments: Array<RnwMetaSegment> | null,
  hydrated?: boolean
};

const staticStyleMap: WeakMap<Object, Object> = new WeakMap();
const sheet = createSheet();
const RNW_META_SEGMENT_STATIC = 0;
const RNW_META_SEGMENT_DYNAMIC = 1;

const defaultPreprocessOptions = { shadow: true, textShadow: true };

/**
 * Eagerly hydrate a style object's __rnwMeta segments into staticStyleMap.
 * Returns the compiled style, or null if the object has no metadata.
 * Idempotent: skips if already cached.
 */
function hydrateObjectMeta(styleObj: Object): Object | null {
  // Idempotency: already cached
  const cached = staticStyleMap.get(styleObj);
  if (cached != null) {
    return cached;
  }

  const meta: RnwMeta = (styleObj.__rnwMeta: any);
  if (meta == null || !Array.isArray(meta.segments)) {
    return null;
  }

  const compiledAccumulator = {};

  for (let i = 0; i < meta.segments.length; i++) {
    const segment = meta.segments[i];
    if (segment.k === RNW_META_SEGMENT_STATIC) {
      if (segment.cs != null && typeof segment.cs === 'object') {
        insertRules(segment.cr);
        Object.assign(compiledAccumulator, segment.cs);
      }
    } else if (segment.k === RNW_META_SEGMENT_DYNAMIC) {
      // Compile only the dynamic keys from the current authored object values
      const dynamicSlice = {};
      for (let j = 0; j < segment.sk.length; j++) {
        const sourceKey = segment.sk[j];
        if (sourceKey === '__rnwMeta') {
          continue;
        }
        dynamicSlice[sourceKey] = styleObj[sourceKey];
      }
      if (Object.keys(dynamicSlice).length > 0) {
        const compiledDynamic = compileAndInsertAtomic(dynamicSlice);
        Object.assign(compiledAccumulator, compiledDynamic);
      }
    }
  }

  staticStyleMap.set(styleObj, compiledAccumulator);

  // Free segment payload after hydration
  if (process.env.NODE_ENV !== 'production') {
    styleObj.__rnwMeta = { hydrated: true };
  } else {
    meta.segments = null;
  }

  return compiledAccumulator;
}

function customStyleq(styles, options: Options = {}) {
  const { writingDirection, ...preprocessOptions } = options;
  const isRTL = writingDirection === 'rtl';
  return styleq.factory({
    transform(style) {
      // 1. Cache hit: already hydrated via create() or createWithPrecompiled()
      const compiledStyle = staticStyleMap.get(style);
      if (compiledStyle != null) {
        return localizeStyle(compiledStyle, isRTL);
      }

      // 2. Inline __rnwMeta: hydrate segments now (e.g. inline JSX style prop)
      if (
        style != null &&
        typeof style === 'object' &&
        style.__rnwMeta != null
      ) {
        const hydrated = hydrateObjectMeta(style);
        if (hydrated != null) {
          return localizeStyle(hydrated, isRTL);
        }
      }

      // 3. Fallback: runtime preprocess (plain dynamic style objects)
      return preprocess(style, {
        ...defaultPreprocessOptions,
        ...preprocessOptions
      });
    }
  })(styles);
}

function insertRules(compiledOrderedRules) {
  if (!Array.isArray(compiledOrderedRules)) {
    return;
  }

  compiledOrderedRules.forEach(([rules, order]) => {
    if (!Array.isArray(rules)) {
      return;
    }

    if (sheet != null) {
      rules.forEach((rule) => {
        if (typeof rule === 'string') {
          sheet.insert(rule, order);
        }
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

/**
 * createWithPrecompiled
 * Single-argument form. The argument is an object whose values are authored
 * style objects, each optionally carrying a __rnwMeta property with
 * pre-compiled segment data generated by the Babel plugin.
 *
 * For style keys with __rnwMeta segments: eager hydration into staticStyleMap.
 * For style keys without __rnwMeta: compiled at runtime like create().
 */
function createWithPrecompiled<T: Object>(styles: T): $ReadOnly<T> {
  const sourceStyles = styles || {};
  const result = {};

  Object.keys(sourceStyles).forEach((key) => {
    const styleObj = sourceStyles[key];

    if (styleObj == null || typeof styleObj !== 'object') {
      result[key] = styleObj;
      return;
    }

    // Idempotency: already in cache, skip all work
    if (staticStyleMap.has(styleObj)) {
      result[key] = styleObj;
      return;
    }

    const meta = styleObj.__rnwMeta;
    if (meta != null && Array.isArray(meta.segments)) {
      // Eager hydration via segment data
      hydrateObjectMeta(styleObj);
    } else if (styleObj.$$css !== true) {
      // No metadata: compile at runtime, same as create()
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
 * Merges style inputs left-to-right (last-write-wins).
 * Pure upstream RNW behavior: compiles raw styles but does not handle precompiled metadata.
 *
 * For precompiled styles (with __rnwMeta segments), use flattenPrecompiled().
 */
function flatten(...styles: any): { [key: string]: any } {
  const flatArray = styles.flat(Infinity);
  const authoredAccumulator: { [key: string]: any } = {};

  for (let i = 0; i < flatArray.length; i++) {
    const style = flatArray[i];
    if (style == null || typeof style !== 'object') {
      continue;
    }

    // Merge all authored keys (skipping internal __rnwMeta marker)
    const styleKeys = Object.keys(style);
    for (let j = 0; j < styleKeys.length; j++) {
      const k = styleKeys[j];
      if (k !== '__rnwMeta') {
        authoredAccumulator[k] = style[k];
      }
    }
  }

  return authoredAccumulator;
}

/**
 * flattenPrecompiled
 * Merges precompiled style inputs (with optional __rnwMeta segments from Babel plugin).
 * Follows the same pattern as createWithPrecompiled(): eager hydration of segments,
 * fallback to runtime compilation for non-precompiled inputs.
 *
 * Each input is resolved to its compiled form with minimal work:
 *   - staticStyleMap hit  → O(1), no compile
 *   - __rnwMeta segments  → hydrate once, O(1) thereafter
 *   - raw dynamic object  → compile only that object's keys
 *
 * Returns the authored accumulator with __rnwMeta metadata set.
 * The result is cached in staticStyleMap for direct style-prop usage.
 */
function flattenPrecompiled(...styles: any): { [key: string]: any } {
  const flatArray = styles.flat(Infinity);

  const authoredAccumulator: { [key: string]: any } = {};
  const compiledAccumulator: { [key: string]: any } = {};
  let hasAnyCompiled = false;

  for (let i = 0; i < flatArray.length; i++) {
    const style = flatArray[i];
    if (style == null || typeof style !== 'object') {
      continue;
    }

    // Merge authored keys into visible output (excluding internal __rnwMeta)
    const styleKeys = Object.keys(style);
    for (let j = 0; j < styleKeys.length; j++) {
      const k = styleKeys[j];
      if (k !== '__rnwMeta') {
        authoredAccumulator[k] = style[k];
      }
    }

    // Resolve compiled form for this input
    const cached = staticStyleMap.get(style);
    if (cached != null) {
      Object.assign(compiledAccumulator, cached);
      hasAnyCompiled = true;
      continue;
    }

    const meta = style.__rnwMeta;
    if (meta != null && Array.isArray(meta.segments)) {
      const hydrated = hydrateObjectMeta(style);
      if (hydrated != null) {
        Object.assign(compiledAccumulator, hydrated);
        hasAnyCompiled = true;
        continue;
      }
    }

    if (style.$$css === true) {
      // Already a compiled token object (legacy path)
      Object.assign(compiledAccumulator, style);
      hasAnyCompiled = true;
      continue;
    }

    // Raw dynamic object: compile its keys only
    const compiled = compileAndInsertAtomic(style);
    Object.assign(compiledAccumulator, compiled);
    hasAnyCompiled = true;
  }

  if (!hasAnyCompiled) {
    // All plain uncompiled objects — return authored merge without caching
    return authoredAccumulator;
  }

  // Cache merged compiled result against the authored accumulator
  staticStyleMap.set(authoredAccumulator, compiledAccumulator);

  // Mark result with metadata to indicate precompiled hydration occurred
  authoredAccumulator.__rnwMeta = { hydrated: true };

  return authoredAccumulator;
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
StyleSheet.flattenPrecompiled = flattenPrecompiled;
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
  flattenPrecompiled: typeof flattenPrecompiled,
  getSheet: typeof getSheet,
  hairlineWidth: number
};

const stylesheet: IStyleSheet = StyleSheet;

export default stylesheet;
