/**
 * Copyright (c) Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import StyleSheet from '../index';

describe('StyleSheet', () => {
  // test this first because subsequent 'create' calls will change the snapshot
  test('getSheet', () => {
    expect(StyleSheet.getSheet()).toMatchInlineSnapshot(`
      {
        "id": "react-native-stylesheet",
        "textContent": "[stylesheet-group="0"]{}
      body{margin:0;}
      button::-moz-focus-inner,input::-moz-focus-inner{border:0;padding:0;}
      html{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:rgba(0,0,0,0);}
      input::-webkit-search-cancel-button,input::-webkit-search-decoration,input::-webkit-search-results-button,input::-webkit-search-results-decoration{display:none;}
      [stylesheet-group="3"]{}
      .r-bottom-1p0dtai{bottom:0px;}
      .r-left-1d2f490{left:0px;}
      .r-position-u8s1d{position:absolute;}
      .r-right-zchlnj{right:0px;}
      .r-top-ipm5af{top:0px;}",
      }
    `);
  });

  test('absoluteFill', () => {
    expect(StyleSheet.absoluteFill).toMatchInlineSnapshot(`
      {
        "bottom": 0,
        "left": 0,
        "position": "absolute",
        "right": 0,
        "top": 0,
      }
    `);
  });

  test('absoluteFillObject', () => {
    expect(StyleSheet.absoluteFillObject).toMatchInlineSnapshot(`
      {
        "bottom": 0,
        "left": 0,
        "position": "absolute",
        "right": 0,
        "top": 0,
      }
    `);
  });

  describe('create', () => {
    test('returns original style objects', () => {
      const style = StyleSheet.create({ root: { position: 'absolute' } });
      expect(style.root).toMatchInlineSnapshot(`
        {
          "position": "absolute",
        }
      `);
    });

    test('e2e resolves to classname', () => {
      const style = StyleSheet.create({ root: { position: 'absolute' } });
      expect(StyleSheet(style.root)).toMatchInlineSnapshot(`
        [
          "r-position-u8s1d",
          null,
        ]
      `);
    });

    test('e2e flattens shadow style properties', () => {
      const style = StyleSheet.create({
        root: {
          shadowColor: 'rgba(50,60,70,0.5)',
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 3,
          textShadowColor: 'rgba(50,60,70,0.50)',
          textShadowOffset: { width: 5, height: 10 },
          textShadowRadius: 15
        }
      });
      expect(StyleSheet(style.root)).toMatchInlineSnapshot(`
        [
          "r-boxShadow-o3ayyy r-textShadow-1x2q051",
          null,
        ]
      `);
    });
  });

  describe('createWithPrecompiled', () => {
    test('supports static-only precompiled styles', () => {
      const styles = StyleSheet.createWithPrecompiled({
        root: {
          color: 'red',
          __rnwMeta: {
            segments: [
              {
                k: 0,
                sk: ['color'],
                cs: { $$css: true, color: 'precompiled-color-red' },
                cr: [[['.precompiled-color-red{color:rgba(255,0,0,1.00);}'], 3]]
              }
            ]
          }
        }
      });

      // style value is authored
      expect(styles.root.color).toBe('red');
      // resolves to precompiled className
      expect(StyleSheet(styles.root)).toEqual(['precompiled-color-red', null]);
    });

    test('supports mixed precompiled and runtime-compiled styles', () => {
      const getDynamicOpacity = () => (Date.now() > 0 ? 0.5 : 1);
      const dynamicOpacity = getDynamicOpacity();

      const styles = StyleSheet.createWithPrecompiled({
        root: {
          color: 'red',
          __rnwMeta: {
            segments: [
              {
                k: 0,
                sk: ['color'],
                cs: { $$css: true, color: 'precompiled-color-red' },
                cr: [[['.precompiled-color-red{color:rgba(255,0,0,1.00);}'], 3]]
              }
            ]
          }
        },
        dynamic: { opacity: dynamicOpacity }
      });

      expect(StyleSheet(styles.root)).toEqual(['precompiled-color-red', null]);

      const [dynamicClassName, dynamicInline] = StyleSheet(styles.dynamic);
      expect(dynamicClassName.length).toBeGreaterThan(0);
      expect(dynamicInline).toBe(null);
    });
  });

  describe('flatten', () => {
    test('should merge style objects', () => {
      const style = StyleSheet.flatten([{ opacity: 1 }, { order: 2 }]);
      expect(style.opacity).toBe(1);
      expect(style.order).toBe(2);
    });

    test('should override style properties', () => {
      const style = StyleSheet.flatten([
        { backgroundColor: '#000', order: 1 },
        { backgroundColor: '#023c69', order: null }
      ]);
      expect(style.backgroundColor).toBe('#023c69');
      expect(style.order).toBeNull();
    });

    test('should overwrite properties with `undefined`', () => {
      const style = StyleSheet.flatten([
        { backgroundColor: '#000' },
        { backgroundColor: undefined }
      ]);
      expect(style.backgroundColor).toBeUndefined();
    });

    test('should not fail on falsy values', () => {
      expect(() => StyleSheet.flatten([null, false, undefined])).not.toThrow();
    });

    test('should recursively flatten arrays', () => {
      const style = StyleSheet.flatten([
        null,
        [],
        [{ order: 2 }, { opacity: 1 }],
        { order: 3 }
      ]);
      expect(style.opacity).toBe(1);
      expect(style.order).toBe(3);
    });

    test('should keep flatten metadata-free with precompiled inputs', () => {
      const styles = StyleSheet.createWithPrecompiled({
        base: {
          backgroundColor: '#000',
          padding: 10,
          __rnwMeta: {
            segments: [
              {
                k: 0,
                sk: ['backgroundColor', 'padding'],
                cs: { $$css: true, base: 'css_base' },
                cr: []
              }
            ]
          }
        }
      });

      const result = StyleSheet.flatten([styles.base]);
      expect(result.backgroundColor).toBe('#000');
      expect(result.padding).toBe(10);
      expect(result.__rnwMeta).toBeUndefined();
    });

    test('should keep plain flatten behavior when no precompiled styles are present', () => {
      const result = StyleSheet.flatten([{ opacity: 0.8 }, { zIndex: 2 }]);

      // Authored values are in the result
      expect(result.opacity).toBe(0.8);
      expect(result.zIndex).toBe(2);
      // Result shape should stay plain (no metadata from flatten)
      expect(result.__rnwMeta).toBeUndefined();
    });
  });

  describe('flattenPrecompiled', () => {
    test('should flatten with precompiled styles from createWithPrecompiled', () => {
      const styles = StyleSheet.createWithPrecompiled({
        base: {
          backgroundColor: '#000',
          padding: 10,
          __rnwMeta: {
            segments: [
              {
                k: 0,
                sk: ['backgroundColor', 'padding'],
                cs: { $$css: true, base: 'css_base' },
                cr: []
              }
            ]
          }
        },
        text: { fontSize: 16 }
      });

      // Flatten precompiled style with plain overrides - returns authored merged object
      const result = StyleSheet.flattenPrecompiled([
        styles.base,
        { backgroundColor: '#fff' }
      ]);

      expect(result).toBeDefined();
      // Authored values preserved
      expect(result.backgroundColor).toBe('#fff');
      expect(result.padding).toBe(10);
      // Result is resolvable via StyleSheet
      expect(StyleSheet(result)[1]).toBe(null);
    });

    test('should preserve plain properties when flattening with precompiled styles', () => {
      const styles = StyleSheet.createWithPrecompiled({
        label: {
          color: '#000',
          fontSize: 14,
          __rnwMeta: {
            segments: [
              {
                k: 0,
                sk: ['color', 'fontSize'],
                cs: { $$css: true, label: 'css_label' },
                cr: []
              }
            ]
          }
        }
      });

      // Flatten with dynamic overrides - authored values intact
      const result = StyleSheet.flattenPrecompiled([
        styles.label,
        { opacity: 0.8 }
      ]);

      expect(result).toBeDefined();
      expect(result.color).toBe('#000');
      expect(result.opacity).toBe(0.8);
      // Result can be resolved
      const [className] = StyleSheet(result);
      expect(className.length).toBeGreaterThan(0);
    });

    test('should handle multiple precompiled styles in flattenPrecompiled', () => {
      const styles1 = StyleSheet.createWithPrecompiled({
        first: {
          padding: 10,
          __rnwMeta: {
            segments: [
              {
                k: 0,
                sk: ['padding'],
                cs: { $$css: true, first: 'css_first' },
                cr: []
              }
            ]
          }
        }
      });

      const styles2 = StyleSheet.createWithPrecompiled({
        second: {
          margin: 5,
          __rnwMeta: {
            segments: [
              {
                k: 0,
                sk: ['margin'],
                cs: { $$css: true, second: 'css_second' },
                cr: []
              }
            ]
          }
        }
      });

      // Flatten multiple precompiled styles with dynamic override
      const result = StyleSheet.flattenPrecompiled([
        styles1.first,
        styles2.second,
        { zIndex: 1 }
      ]);

      expect(result).toBeDefined();
      // Authored merge - left-to-right, last-write-wins
      expect(result.padding).toBe(10);
      expect(result.margin).toBe(5);
      expect(result.zIndex).toBe(1);
      // Result is resolvable
      const [className] = StyleSheet(result);
      expect(className.length).toBeGreaterThan(0);
    });
  });

  test('hairlineWidth', () => {
    expect(Number.isInteger(StyleSheet.hairlineWidth) === true).toBeTruthy();
  });

  describe('resolve', () => {
    test('empty', () => {
      expect(StyleSheet()).toMatchInlineSnapshot(`
        [
          "",
          null,
        ]
      `);
      expect(StyleSheet({})).toMatchInlineSnapshot(`
        [
          "",
          null,
        ]
      `);
      expect(StyleSheet([])).toMatchInlineSnapshot(`
        [
          "",
          null,
        ]
      `);
    });

    test('transforms compiled object to className', () => {
      expect(
        StyleSheet([
          {
            $$css: true,
            position: 'position-absolute',
            opacity: 'opacity-05',
            width: 'width-200'
          }
        ])
      ).toMatchInlineSnapshot(`
        [
          "position-absolute opacity-05 width-200",
          null,
        ]
      `);
    });

    test('transforms branch-static inline precompiled payloads to className', () => {
      // Inline __rnwMeta: authored style object with segment metadata
      const style = {
        color: 'red',
        __rnwMeta: {
          segments: [
            {
              k: 0,
              sk: ['color'],
              cs: { $$css: true, color: 'branch-static-inline-red' },
              cr: [
                [['.branch-static-inline-red{color:rgba(255,0,0,1.00);}'], 3]
              ]
            }
          ]
        }
      };
      expect(StyleSheet([style])).toEqual(['branch-static-inline-red', null]);
    });

    test('falls back to runtime processing when __rnwMeta is undefined', () => {
      const style = {
        width: '100%',
        position: 'absolute',
        __rnwMeta: undefined
      };

      const [className, inline] = StyleSheet([style]);

      // No metadata hydration should occur; style should still resolve normally.
      expect(className).toBe('');
      expect(inline).toEqual({
        position: 'absolute',
        width: '100%'
      });
      expect(style.__rnwMeta).toBeUndefined();
    });

    test('dedupes branch-static inline precompiled rule insertion by stable id', () => {
      // Two different objects with same compiled content
      const makeStyle = () => ({
        backgroundColor: 'green',
        __rnwMeta: {
          segments: [
            {
              k: 0,
              sk: ['backgroundColor'],
              cs: {
                $$css: true,
                backgroundColor: 'branch-static-inline-green'
              },
              cr: [
                [
                  [
                    '.branch-static-inline-green{background-color:rgba(0,255,0,1.00);}'
                  ],
                  3
                ]
              ]
            }
          ]
        }
      });
      const first = makeStyle();
      const second = makeStyle();

      expect(StyleSheet([first])).toEqual(['branch-static-inline-green', null]);
      expect(StyleSheet([second])).toEqual([
        'branch-static-inline-green',
        null
      ]);
    });

    test('hydrates static-dynamic-static segment order during resolve', () => {
      const style = {
        position: 'absolute',
        left: 12,
        backgroundColor: 'red',
        __rnwMeta: {
          segments: [
            {
              k: 0,
              sk: ['position'],
              cs: { $$css: true, position: 'seg-static-position' },
              cr: [[['.seg-static-position{position:absolute;}'], 2]]
            },
            {
              k: 1,
              sk: ['left']
            },
            {
              k: 0,
              sk: ['backgroundColor'],
              cs: {
                $$css: true,
                backgroundColor: 'seg-static-backgroundColor'
              },
              cr: [
                [
                  [
                    '.seg-static-backgroundColor{background-color:rgba(255,0,0,1.00);}'
                  ],
                  3
                ]
              ]
            }
          ]
        }
      };

      const [className1, inline1] = StyleSheet(style);
      const [className2, inline2] = StyleSheet(style);

      expect(className1).toContain('seg-static-position');
      expect(className1).toContain('seg-static-backgroundColor');
      expect(className1).toContain('left');
      expect(inline1).toBe(null);

      // Second call hits hydrated cache path and should produce same resolution.
      expect(className2).toBe(className1);
      expect(inline2).toBe(null);
    });

    test('transforms array of compiled objects to className', () => {
      expect(
        StyleSheet([
          {
            $$css: true,
            borderWidth: 'borderWidth-0',
            borderColor: 'borderColor-red',
            display: 'display-flex',
            width: 'width-100'
          },
          {
            $$css: true,
            position: 'position-absolute',
            opacity: 'opacity-05'
          },
          [
            {
              $$css: true,
              width: 'width-200'
            }
          ]
        ])
      ).toMatchInlineSnapshot(`
        [
          "borderWidth-0 borderColor-red display-flex position-absolute opacity-05 width-200",
          null,
        ]
      `);
    });

    test('dedupes class names and inline styles', () => {
      const styleACompiled = {
        $$css: true,
        backgroundColor: 'backgroundColor-red',
        display: 'display-block'
      };
      const styleBCompiled = {
        $$css: true,
        backgroundColor: 'backgroundColor-green',
        color: 'color-green'
      };
      const styleBInline = {
        backgroundColor: 'rgba(0,0,255,1.00)',
        color: null
      };

      const [className1, inlineStyle1] = StyleSheet([
        styleACompiled,
        styleBCompiled,
        styleBInline
      ]);
      expect(className1).toBe('display-block');
      expect(inlineStyle1).toEqual({ backgroundColor: 'rgba(0,0,255,1.00)' });

      const [className2, inlineStyle2] = StyleSheet([
        styleACompiled,
        styleBInline,
        styleBCompiled
      ]);
      expect(className2).toBe(
        'display-block backgroundColor-green color-green'
      );
      expect(inlineStyle2).toEqual(null);
    });

    test('long form inline style properties take precedence over static shorthand properties', () => {
      const styles1 = StyleSheet.create({
        test: { paddingHorizontal: '40px' }
      });
      const inlineStyle1 = { padding: '8px', paddingHorizontal: '40px' };
      expect(StyleSheet([styles1.test, inlineStyle1])).toMatchInlineSnapshot(`
        [
          "",
          {
            "paddingBottom": "8px",
            "paddingLeft": "40px",
            "paddingRight": "40px",
            "paddingTop": "8px",
          },
        ]
      `);

      const styles2 = StyleSheet.create({ test: { marginVertical: '40px' } });
      const inlineStyle2 = { margin: '8px', marginVertical: '40px' };
      expect(StyleSheet([styles2.test, inlineStyle2])).toMatchInlineSnapshot(`
        [
          "",
          {
            "marginBottom": "40px",
            "marginLeft": "8px",
            "marginRight": "8px",
            "marginTop": "40px",
          },
        ]
      `);
    });

    test('polyfills logical styles', () => {
      const inlineA = { start: '12.34%' };
      const inlineB = { textAlign: 'start' };
      const inlineC = { marginEnd: 10 };

      const a = StyleSheet.create({ x: { ...inlineA } }).x;
      const b = StyleSheet.create({ x: { ...inlineB } }).x;
      const c = StyleSheet.create({ x: { ...inlineC } }).x;
      const writingDirection = 'rtl';

      // inline styles
      const inlineStyle = [inlineA, inlineB, inlineC];
      expect(StyleSheet(inlineStyle)).toMatchInlineSnapshot(`
        [
          "",
          {
            "left": "12.34%",
            "marginRight": "10px",
            "textAlign": "left",
          },
        ]
      `);
      expect(StyleSheet(inlineStyle, { writingDirection }))
        .toMatchInlineSnapshot(`
        [
          "",
          {
            "marginLeft": "10px",
            "right": "12.34%",
            "textAlign": "right",
          },
        ]
      `);
      expect(
        StyleSheet(
          [
            inlineStyle,
            { marginLeft: 1, marginEnd: 0, marginStart: 0, marginRight: 11 }
          ],
          { writingDirection }
        )
      ).toMatchInlineSnapshot(`
        [
          "",
          {
            "marginLeft": "1px",
            "marginRight": "11px",
            "right": "12.34%",
            "textAlign": "right",
          },
        ]
      `);
      expect(
        StyleSheet([inlineStyle, { marginEnd: null, marginLeft: 11 }], {
          writingDirection
        })
      ).toMatchInlineSnapshot(`
        [
          "",
          {
            "marginLeft": "11px",
            "right": "12.34%",
            "textAlign": "right",
          },
        ]
      `);

      // static styles
      const staticStyle = [a, b, c];
      expect(StyleSheet(staticStyle)).toMatchInlineSnapshot(`
        [
          "r-insetInlineStart-1xn1m1p r-textAlign-fdjqy7 r-marginInlineEnd-1l8l4mf",
          null,
        ]
      `);
      expect(StyleSheet(staticStyle, { writingDirection }))
        .toMatchInlineSnapshot(`
        [
          "r-insetInlineStart-1y2vi53 r-textAlign-1ff274t r-marginInlineEnd-t1sew1",
          null,
        ]
      `);
      const z = StyleSheet.create({ x: { marginRight: 33 } }).x;
      expect(StyleSheet([staticStyle, z])).toMatchInlineSnapshot(`
        [
          "r-insetInlineStart-1xn1m1p r-textAlign-fdjqy7 r-marginInlineEnd-1l8l4mf r-marginRight-j4vy6k",
          null,
        ]
      `);
      expect(
        StyleSheet(
          [
            staticStyle,
            { marginLeft: 1, marginEnd: 0, marginStart: 0, marginRight: 11 }
          ],

          {
            writingDirection
          }
        )
      ).toMatchInlineSnapshot(`
        [
          "r-insetInlineStart-1y2vi53 r-textAlign-1ff274t",
          {
            "marginLeft": "1px",
            "marginRight": "11px",
          },
        ]
      `);
      // logical can be nulled
      expect(
        StyleSheet([staticStyle, { marginEnd: null }], {
          writingDirection
        })
      ).toMatchInlineSnapshot(`
        [
          "r-insetInlineStart-1y2vi53 r-textAlign-1ff274t",
          null,
        ]
      `);
    });
  });
});
