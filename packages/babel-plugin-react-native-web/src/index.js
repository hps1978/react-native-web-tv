const moduleMap = require('./moduleMap');

const defaultPreprocessOptions = { shadow: true, textShadow: true };

let staticStyleCompiler = null;

const loadStaticStyleCompiler = () => {
  if (staticStyleCompiler != null) {
    return staticStyleCompiler;
  }

  try {
    // eslint-disable-next-line global-require
    const {
      preprocess
    } = require('../vendor/rnw-compiler/src/exports/StyleSheet/preprocess');
    // eslint-disable-next-line global-require
    const {
      atomic,
      classic
    } = require('../vendor/rnw-compiler/src/exports/StyleSheet/compiler');

    staticStyleCompiler = { preprocess, atomic, classic };
    return staticStyleCompiler;
  } catch (error) {
    throw new Error(
      `Unable to load vendored static style compiler for babel-plugin-react-native-web-tv. Run the sync and build scripts for the plugin package. Original error: ${error.message}`
    );
  }
};

const evalStaticNode = (node) => {
  if (!node) {
    return undefined;
  }

  switch (node.type) {
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NumericLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    case 'Identifier':
      if (node.name === 'undefined') {
        return undefined;
      }
      return undefined;
    case 'UnaryExpression': {
      const arg = evalStaticNode(node.argument);
      if (arg === undefined) {
        return undefined;
      }
      if (node.operator === '-') return -arg;
      if (node.operator === '+') return +arg;
      if (node.operator === '!') return !arg;
      return undefined;
    }
    case 'ArrayExpression': {
      const values = [];
      for (const element of node.elements) {
        if (element == null) {
          values.push(undefined);
          continue;
        }
        const value = evalStaticNode(element);
        if (value === undefined) {
          return undefined;
        }
        values.push(value);
      }
      return values;
    }
    case 'ObjectExpression': {
      const obj = {};
      for (const property of node.properties) {
        if (property.type !== 'ObjectProperty' || property.computed) {
          return undefined;
        }
        let key;
        if (property.key.type === 'Identifier') {
          key = property.key.name;
        } else if (
          property.key.type === 'StringLiteral' ||
          property.key.type === 'NumericLiteral'
        ) {
          key = String(property.key.value);
        } else {
          return undefined;
        }

        const value = evalStaticNode(property.value);
        if (value === undefined) {
          return undefined;
        }
        obj[key] = value;
      }
      return obj;
    }
    default:
      return undefined;
  }
};

const isStyleSheetCreateCall = (t, node) => {
  return (
    t.isMemberExpression(node.callee) &&
    !node.callee.computed &&
    t.isIdentifier(node.callee.object, { name: 'StyleSheet' }) &&
    t.isIdentifier(node.callee.property, { name: 'create' })
  );
};

const objectToAst = (t, value) => {
  if (value === null) {
    return t.nullLiteral();
  }
  if (typeof value === 'string') {
    return t.stringLiteral(value);
  }
  if (typeof value === 'number') {
    return t.numericLiteral(value);
  }
  if (typeof value === 'boolean') {
    return t.booleanLiteral(value);
  }
  if (Array.isArray(value)) {
    return t.arrayExpression(value.map((item) => objectToAst(t, item)));
  }
  if (typeof value === 'object') {
    return t.objectExpression(
      Object.keys(value).map((key) =>
        t.objectProperty(t.stringLiteral(key), objectToAst(t, value[key]))
      )
    );
  }
  return t.identifier('undefined');
};

const isUppercaseComponentElement = (t, jsxName) => {
  if (t.isJSXIdentifier(jsxName)) {
    const { name } = jsxName;
    return name.length > 0 && name[0] === name[0].toUpperCase();
  }
  return true;
};

const getObjectPropertyKeyName = (t, property) => {
  if (!t.isObjectProperty(property) || property.computed) {
    return null;
  }
  if (t.isIdentifier(property.key)) {
    return property.key.name;
  }
  if (t.isStringLiteral(property.key)) {
    return property.key.value;
  }
  return null;
};

const hasRnwMetaProperty = (t, objectNode) =>
  t.isObjectExpression(objectNode) &&
  objectNode.properties.some((property) => {
    const key = getObjectPropertyKeyName(t, property);
    return key === '__rnwMeta';
  });

const hasSpreadProperty = (t, objectNode) =>
  t.isObjectExpression(objectNode) &&
  objectNode.properties.some((property) => t.isSpreadElement(property));

const createMetaShadowedObjectNode = (t, objectNode) => {
  if (!t.isObjectExpression(objectNode)) {
    return null;
  }
  // Only shadow inherited metadata on spread-based objects.
  if (!hasSpreadProperty(t, objectNode) || hasRnwMetaProperty(t, objectNode)) {
    return null;
  }

  return t.objectExpression([
    ...objectNode.properties.map((p) => t.cloneNode(p, true)),
    t.objectProperty(t.identifier('__rnwMeta'), t.identifier('undefined'))
  ]);
};

const RNW_META_SEGMENT_STATIC = 0;
const RNW_META_SEGMENT_DYNAMIC = 1;

const isStyleSheetFlattenCall = (t, node) =>
  t.isMemberExpression(node.callee) &&
  !node.callee.computed &&
  t.isIdentifier(node.callee.object, { name: 'StyleSheet' }) &&
  t.isIdentifier(node.callee.property, { name: 'flatten' });

/**
 * Compile a plain static style object for a given style key.
 * Returns { cs: compiledStyle, cr: compiledOrderedRules } or null.
 */
const compileSingleStaticStyle = (styleObject, styleKey = 'style') => {
  let compiler;
  try {
    compiler = loadStaticStyleCompiler();
  } catch (error) {
    return null;
  }

  let compiledStyle;
  let compiledOrderedRules;

  if (styleKey.indexOf('$raw') > -1) {
    [compiledStyle, compiledOrderedRules] = compiler.classic(
      styleObject,
      styleKey.split('$raw')[0]
    );
  } else {
    const preprocessed = compiler.preprocess(
      styleObject,
      defaultPreprocessOptions
    );
    [compiledStyle, compiledOrderedRules] = compiler.atomic(preprocessed);
  }

  return { cs: compiledStyle, cr: compiledOrderedRules };
};

/**
 * Build ordered __rnwMeta segments AST for an ObjectExpression node.
 * Walks properties in authored order, grouping consecutive static keys into
 * static segments and emitting dynamic segments for non-evaluable keys.
 * Returns an ArrayExpression AST representing the segments array, or null if
 * no static keys were found.
 *
 * Segment shape (compact field names, documented in plugin README):
 *   { k: 0, sk: [...], cs: {...}, cr: [...] }
 *   { k: 1, sk: [...] }
 */
const buildSegmentsForObjectNode = (t, objectNode, styleKey = 'style') => {
  if (!t.isObjectExpression(objectNode)) {
    return null;
  }

  // Already annotated object: avoid re-compiling internal metadata as style keys.
  if (hasRnwMetaProperty(t, objectNode)) {
    return null;
  }

  const segments = [];
  let staticKeys = [];
  let staticValues = {};
  let hasAnyStatic = false;
  let hasUnsupportedProperty = false;

  const flushStaticGroup = () => {
    if (staticKeys.length === 0) return;
    const compiled = compileSingleStaticStyle(staticValues, styleKey);
    if (compiled != null) {
      segments.push({
        k: RNW_META_SEGMENT_STATIC,
        sk: staticKeys,
        cs: compiled.cs,
        cr: compiled.cr
      });
      hasAnyStatic = true;
    }
    staticKeys = [];
    staticValues = {};
  };

  objectNode.properties.forEach((property) => {
    if (hasUnsupportedProperty) {
      return;
    }

    // Only handle plain non-computed object properties as static candidates
    if (t.isObjectProperty(property) && !property.computed) {
      const key = getObjectPropertyKeyName(t, property);
      if (key != null) {
        if (key === '__rnwMeta') {
          flushStaticGroup();
          return;
        }
        const staticValue = evalStaticNode(property.value);
        if (staticValue !== undefined) {
          staticKeys.push(key);
          staticValues[key] = staticValue;
          return;
        }
        // Non-evaluable property: flush static group, emit dynamic segment
        flushStaticGroup();
        segments.push({ k: RNW_META_SEGMENT_DYNAMIC, sk: [key] });
        return;
      }
    }
    // Spread/computed/object methods cannot be represented safely; bail out
    // so the full object remains on the runtime path.
    hasUnsupportedProperty = true;
  });

  if (hasUnsupportedProperty) {
    return null;
  }

  flushStaticGroup();

  if (!hasAnyStatic) {
    return null; // Nothing benefited from pre-compilation
  }

  return t.objectExpression([
    t.objectProperty(
      t.identifier('segments'),
      t.arrayExpression(segments.map((seg) => objectToAst(t, seg)))
    )
  ]);
};

/**
 * Annotate an ObjectExpression AST node with a __rnwMeta property containing
 * ordered segments. Returns a new ObjectExpression with __rnwMeta appended,
 * or null if no static segments could be derived.
 */
const annotateObjectNodeWithMeta = (t, objectNode, styleKey = 'style') => {
  if (hasRnwMetaProperty(t, objectNode)) {
    return null;
  }

  const metaAst = buildSegmentsForObjectNode(t, objectNode, styleKey);
  if (metaAst == null) {
    return null;
  }

  return t.objectExpression([
    ...objectNode.properties.map((p) => t.cloneNode(p, true)),
    t.objectProperty(t.identifier('__rnwMeta'), metaAst)
  ]);
};

const getMemberExpressionPropertyName = (t, memberExpression) => {
  if (!memberExpression.computed && t.isIdentifier(memberExpression.property)) {
    return memberExpression.property.name;
  }
  if (
    memberExpression.computed &&
    t.isStringLiteral(memberExpression.property)
  ) {
    return memberExpression.property.value;
  }
  return null;
};

const resolveStaticStyleFromReference = (t, path, expressionNode) => {
  if (
    !t.isMemberExpression(expressionNode) ||
    !t.isIdentifier(expressionNode.object)
  ) {
    return null;
  }

  const propertyName = getMemberExpressionPropertyName(t, expressionNode);
  if (propertyName == null) {
    return null;
  }

  const binding = path.scope.getBinding(expressionNode.object.name);
  if (binding == null || !binding.path.isVariableDeclarator()) {
    return null;
  }

  const init = binding.path.node.init;
  if (!t.isObjectExpression(init)) {
    return null;
  }

  const matchingProperty = init.properties.find((property) => {
    if (!t.isObjectProperty(property) || property.computed) {
      return false;
    }
    if (t.isIdentifier(property.key)) {
      return property.key.name === propertyName;
    }
    if (t.isStringLiteral(property.key)) {
      return property.key.value === propertyName;
    }
    return false;
  });

  if (matchingProperty == null || !t.isObjectProperty(matchingProperty)) {
    return null;
  }

  const staticStyleObject = evalStaticNode(matchingProperty.value);
  if (
    staticStyleObject == null ||
    typeof staticStyleObject !== 'object' ||
    Array.isArray(staticStyleObject)
  ) {
    return null;
  }

  return {
    styleObject: staticStyleObject,
    styleKey: propertyName
  };
};

const transformStyleExpressionNode = (t, path, node) => {
  if (node == null) {
    return node;
  }

  if (t.isArrayExpression(node)) {
    const transformedElements = [];

    node.elements.forEach((element) => {
      if (element == null) {
        transformedElements.push(element);
        return;
      }

      const transformedElement = transformStyleExpressionNode(t, path, element);
      if (t.isArrayExpression(transformedElement)) {
        transformedElement.elements.forEach((nestedElement) => {
          transformedElements.push(nestedElement);
        });
        return;
      }

      transformedElements.push(transformedElement);
    });

    return t.arrayExpression(transformedElements);
  }

  if (t.isLogicalExpression(node) && node.operator === '&&') {
    return t.logicalExpression(
      '&&',
      node.left,
      transformStyleExpressionNode(t, path, node.right)
    );
  }

  if (t.isConditionalExpression(node)) {
    return t.conditionalExpression(
      node.test,
      transformStyleExpressionNode(t, path, node.consequent),
      transformStyleExpressionNode(t, path, node.alternate)
    );
  }

  if (t.isObjectExpression(node)) {
    return (
      annotateObjectNodeWithMeta(t, node) ||
      createMetaShadowedObjectNode(t, node) ||
      node
    );
  }

  const resolvedReference = resolveStaticStyleFromReference(t, path, node);
  if (resolvedReference != null) {
    // Build a new ObjectExpression for the resolved static object and annotate it
    const resolvedNode = objectToAst(t, resolvedReference.styleObject);
    if (t.isObjectExpression(resolvedNode)) {
      return (
        annotateObjectNodeWithMeta(
          t,
          resolvedNode,
          resolvedReference.styleKey
        ) || node
      );
    }
  }

  return node;
};

/**
 * For each style key in a StyleSheet.create({...}) call:
 * - If the value is a static ObjectExpression: annotate with __rnwMeta segments.
 * - If the value is a mixed ObjectExpression: annotate with ordered segments.
 * - If not statically evaluable: leave as-is (runtime compile path).
 *
 * Returns transformed create argument metadata, or null if nothing changed.
 */
const createStaticStyleCreateArgs = (t, stylesNode) => {
  if (!t.isObjectExpression(stylesNode)) {
    return null;
  }

  const newProperties = [];
  let anyAnnotated = false;
  let anyMutated = false;

  stylesNode.properties.forEach((property) => {
    if (!t.isObjectProperty(property) || property.computed) {
      newProperties.push(t.cloneNode(property, true));
      return;
    }

    const styleKey = getObjectPropertyKeyName(t, property);
    if (styleKey == null) {
      newProperties.push(t.cloneNode(property, true));
      return;
    }

    // Only annotate ObjectExpression values (not ternaries, calls, etc.)
    if (!t.isObjectExpression(property.value)) {
      newProperties.push(t.cloneNode(property, true));
      return;
    }

    const annotated = annotateObjectNodeWithMeta(t, property.value, styleKey);
    if (annotated != null) {
      anyAnnotated = true;
      anyMutated = true;
      newProperties.push(
        t.objectProperty(t.cloneNode(property.key, true), annotated)
      );
    } else {
      const shadowed = createMetaShadowedObjectNode(t, property.value);
      if (shadowed != null) {
        anyMutated = true;
        newProperties.push(
          t.objectProperty(t.cloneNode(property.key, true), shadowed)
        );
      } else {
        newProperties.push(t.cloneNode(property, true));
      }
    }
  });

  if (!anyMutated) {
    return null;
  }

  return {
    stylesArg: t.objectExpression(newProperties),
    hasPrecompiledEntries: anyAnnotated
  };
};

const isCommonJS = (opts) => opts.commonjs === true;

const getDistLocation = (importName, opts) => {
  const format = isCommonJS(opts) ? 'cjs/' : '';
  const internalName =
    importName === 'unstable_createElement' ? 'createElement' : importName;
  const target = opts.target || 'react-native-web-tv';
  if (internalName === 'index') {
    return `${target}/dist/${format}index`;
  } else if (internalName && moduleMap[internalName]) {
    return `${target}/dist/${format}exports/${internalName}`;
  }
};

const isReactNativeRequire = (t, node) => {
  const { declarations } = node;
  if (declarations.length > 1) {
    return false;
  }
  const { id, init } = declarations[0];
  return (
    (t.isObjectPattern(id) || t.isIdentifier(id)) &&
    t.isCallExpression(init) &&
    t.isIdentifier(init.callee) &&
    init.callee.name === 'require' &&
    init.arguments.length === 1 &&
    (init.arguments[0].value === 'react-native' ||
      init.arguments[0].value === 'react-native-web' ||
      init.arguments[0].value === 'react-native-web-tv')
  );
};

const isReactNativeModule = ({ source, specifiers }) =>
  source &&
  (source.value === 'react-native' ||
    source.value === 'react-native-web' ||
    source.value === 'react-native-web-tv') &&
  specifiers.length;

module.exports = function ({ types: t }) {
  return {
    name: 'Rewrite react-native to react-native-web-tv',
    pre(file) {
      // Warn if misconfigured
      const opts =
        file.opts.plugins.find(
          (p) =>
            Array.isArray(p) &&
            p[0] &&
            (p[0] === 'react-native-web-tv' ||
              p[0] === 'babel-plugin-react-native-web-tv')
        )?.[1] || {};
      const target = opts.target || 'react-native-web-tv';
      try {
        const pkg = require(`${process.cwd()}/package.json`);
        const hasTV =
          pkg.dependencies?.['react-native-web-tv'] ||
          pkg.devDependencies?.['react-native-web-tv'];
        const hasWeb =
          pkg.dependencies?.['react-native-web'] ||
          pkg.devDependencies?.['react-native-web'];
        if (target === 'react-native-web-tv' && !hasTV) {
          // eslint-disable-next-line no-console
          console.warn(
            '[babel-plugin-react-native-web-tv] WARNING: target is react-native-web-tv but react-native-web-tv is not a dependency.'
          );
        }
        if (target === 'react-native-web' && !hasWeb) {
          // eslint-disable-next-line no-console
          console.warn(
            '[babel-plugin-react-native-web-tv] WARNING: target is react-native-web but react-native-web is not a dependency.'
          );
        }
      } catch (e) {
        // ignore
      }
    },
    visitor: {
      ImportDeclaration(path, state) {
        const { specifiers } = path.node;
        if (isReactNativeModule(path.node)) {
          const imports = specifiers
            .map((specifier) => {
              if (t.isImportSpecifier(specifier)) {
                const importName = specifier.imported.name;
                const distLocation = getDistLocation(importName, state.opts);

                if (distLocation) {
                  return t.importDeclaration(
                    [
                      t.importDefaultSpecifier(
                        t.identifier(specifier.local.name)
                      )
                    ],
                    t.stringLiteral(distLocation)
                  );
                }
              }
              return t.importDeclaration(
                [specifier],
                t.stringLiteral(getDistLocation('index', state.opts))
              );
            })
            .filter(Boolean);

          path.replaceWithMultiple(imports);
        }
      },
      ExportNamedDeclaration(path, state) {
        const { specifiers } = path.node;
        if (isReactNativeModule(path.node)) {
          const exports = specifiers
            .map((specifier) => {
              if (t.isExportSpecifier(specifier)) {
                const exportName = specifier.exported.name;
                const localName = specifier.local.name;
                const distLocation = getDistLocation(localName, state.opts);

                if (distLocation) {
                  return t.exportNamedDeclaration(
                    null,
                    [
                      t.exportSpecifier(
                        t.identifier('default'),
                        t.identifier(exportName)
                      )
                    ],
                    t.stringLiteral(distLocation)
                  );
                }
              }
              return t.exportNamedDeclaration(
                null,
                [specifier],
                t.stringLiteral(getDistLocation('index', state.opts))
              );
            })
            .filter(Boolean);

          path.replaceWithMultiple(exports);
        }
      },
      VariableDeclaration(path, state) {
        if (isReactNativeRequire(t, path.node)) {
          const { id } = path.node.declarations[0];
          if (t.isObjectPattern(id)) {
            const imports = id.properties
              .map((identifier) => {
                const distLocation = getDistLocation(
                  identifier.key.name,
                  state.opts
                );
                if (distLocation) {
                  return t.variableDeclaration(path.node.kind, [
                    t.variableDeclarator(
                      t.identifier(identifier.value.name),
                      t.memberExpression(
                        t.callExpression(t.identifier('require'), [
                          t.stringLiteral(distLocation)
                        ]),
                        t.identifier('default')
                      )
                    )
                  ]);
                }
              })
              .filter(Boolean);

            path.replaceWithMultiple(imports);
          } else if (t.isIdentifier(id)) {
            const name = id.name;
            const importIndex = t.variableDeclaration(path.node.kind, [
              t.variableDeclarator(
                t.identifier(name),
                t.callExpression(t.identifier('require'), [
                  t.stringLiteral(getDistLocation('index', state.opts))
                ])
              )
            ]);

            path.replaceWith(importIndex);
          }
        }
      },
      CallExpression(path, state) {
        const { node } = path;

        if (state.opts.transpileStyles === true) {
          // Handle StyleSheet.create(...)
          if (isStyleSheetCreateCall(t, node) && node.arguments.length === 1) {
            const transformed = createStaticStyleCreateArgs(
              t,
              node.arguments[0]
            );
            if (transformed != null) {
              node.arguments = [transformed.stylesArg];
              if (transformed.hasPrecompiledEntries) {
                if (
                  t.isMemberExpression(node.callee) &&
                  !node.callee.computed &&
                  t.isIdentifier(node.callee.property, { name: 'create' })
                ) {
                  node.callee.property = t.identifier('createWithPrecompiled');
                }
              }
            }
            return;
          }

          // Handle StyleSheet.flatten([...])
          if (isStyleSheetFlattenCall(t, node) && node.arguments.length === 1) {
            const arg = node.arguments[0];
            const transformedArg = transformStyleExpressionNode(t, path, arg);
            if (transformedArg !== arg) {
              node.arguments = [transformedArg];
            }
            return;
          }

          return;
        }
      },
      JSXAttribute(path, state) {
        if (state.opts.transpileStyles !== true) {
          return;
        }

        if (!t.isJSXIdentifier(path.node.name, { name: 'style' })) {
          return;
        }

        const openingElement = path.parentPath && path.parentPath.node;
        if (
          openingElement == null ||
          !isUppercaseComponentElement(t, openingElement.name)
        ) {
          return;
        }

        const { value } = path.node;
        if (!t.isJSXExpressionContainer(value)) {
          return;
        }

        const transformedExpression = transformStyleExpressionNode(
          t,
          path,
          value.expression
        );

        if (transformedExpression !== value.expression) {
          path.node.value = t.jsxExpressionContainer(transformedExpression);
        }
      }
    }
  };
};
