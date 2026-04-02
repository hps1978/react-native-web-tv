const moduleMap = require('./moduleMap');
const path = require('path');
const fs = require('fs');

const defaultPreprocessOptions = { shadow: true, textShadow: true };

let staticStyleCompiler = null;

const loadStaticStyleCompiler = () => {
  if (staticStyleCompiler != null) {
    return staticStyleCompiler;
  }

  const preprocessCandidates = [
    path.resolve(
      process.cwd(),
      'packages/react-native-web/dist/cjs/exports/StyleSheet/preprocess.js'
    ),
    path.resolve(
      __dirname,
      '../../react-native-web/dist/cjs/exports/StyleSheet/preprocess.js'
    )
  ];
  const compilerCandidates = [
    path.resolve(
      process.cwd(),
      'packages/react-native-web/dist/cjs/exports/StyleSheet/compiler/index.js'
    ),
    path.resolve(
      __dirname,
      '../../react-native-web/dist/cjs/exports/StyleSheet/compiler/index.js'
    )
  ];

  const preprocessPath = preprocessCandidates.find((candidate) =>
    fs.existsSync(candidate)
  );
  const compilerPath = compilerCandidates.find((candidate) =>
    fs.existsSync(candidate)
  );

  if (preprocessPath == null || compilerPath == null) {
    throw new Error(
      'Unable to resolve react-native-web dist compiler artifacts for static style transpilation.'
    );
  }

  // Use built CJS artifacts so the Babel plugin can run in Node without Flow transforms.
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { preprocess } = require(preprocessPath);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { atomic, classic } = require(compilerPath);

  staticStyleCompiler = { preprocess, atomic, classic };
  return staticStyleCompiler;
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

const hashString = (input) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const createInlinePrecompiledId = (styleKey, compiled) => {
  const serialized = JSON.stringify({
    styleKey,
    compiledStyle: compiled.compiledStyle,
    compiledOrderedRules: compiled.compiledOrderedRules
  });
  return `rnwtv_${hashString(serialized)}`;
};

const compileSingleStaticStyle = (styleObject, styleKey = 'style') => {
  let compiler;
  try {
    compiler = loadStaticStyleCompiler();
  } catch (error) {
    return null;
  }

  let preprocessed = styleObject;
  let compiledStyle;
  let compiledOrderedRules;

  if (styleKey.indexOf('$raw') > -1) {
    [compiledStyle, compiledOrderedRules] = compiler.classic(
      styleObject,
      styleKey.split('$raw')[0]
    );
  } else {
    preprocessed = compiler.preprocess(styleObject, defaultPreprocessOptions);
    [compiledStyle, compiledOrderedRules] = compiler.atomic(preprocessed);
  }

  return {
    preprocessed,
    compiledStyle,
    compiledOrderedRules
  };
};

const createInlinePrecompiledStyleAst = (t, styleObject, styleKey = 'style') => {
  const compiled = compileSingleStaticStyle(styleObject, styleKey);
  if (compiled == null) {
    return null;
  }

  const previewPayload = {
    ...compiled,
    __rnwTvStaticPreviewId: createInlinePrecompiledId(styleKey, compiled)
  };

  return t.objectExpression([
    t.objectProperty(
      t.identifier('__rnwTvStaticPreview'),
      objectToAst(t, previewPayload)
    )
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
  if (!t.isMemberExpression(expressionNode) || !t.isIdentifier(expressionNode.object)) {
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
    return t.arrayExpression(
      node.elements.map((element) =>
        element == null ? element : transformStyleExpressionNode(t, path, element)
      )
    );
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
    const staticStyleObject = evalStaticNode(node);
    if (
      staticStyleObject != null &&
      typeof staticStyleObject === 'object' &&
      !Array.isArray(staticStyleObject)
    ) {
      const transformed = createInlinePrecompiledStyleAst(t, staticStyleObject);
      if (transformed != null) {
        return transformed;
      }
    }
    return node;
  }

  const resolvedReference = resolveStaticStyleFromReference(t, path, node);
  if (resolvedReference != null) {
    const transformed = createInlinePrecompiledStyleAst(
      t,
      resolvedReference.styleObject,
      resolvedReference.styleKey
    );
    if (transformed != null) {
      return transformed;
    }
  }

  return node;
};

const buildStaticStylePayload = (stylesObject) => {
  let compiler;
  try {
    compiler = loadStaticStyleCompiler();
  } catch (error) {
    return null;
  }

  const precompiled = {};
  const replacedStyles = {};
  const styleKeys = Object.keys(stylesObject);
  for (const styleKey of styleKeys) {
    const styleValue = stylesObject[styleKey];
    if (
      styleValue == null ||
      typeof styleValue !== 'object' ||
      Array.isArray(styleValue)
    ) {
      return null;
    }

    let preprocessed = styleValue;
    let compiledStyle;
    let compiledOrderedRules;

    if (styleKey.indexOf('$raw') > -1) {
      [compiledStyle, compiledOrderedRules] = compiler.classic(
        styleValue,
        styleKey.split('$raw')[0]
      );
    } else {
      preprocessed = compiler.preprocess(styleValue, defaultPreprocessOptions);
      [compiledStyle, compiledOrderedRules] = compiler.atomic(preprocessed);
    }

    precompiled[styleKey] = {
      preprocessed,
      compiledStyle,
      compiledOrderedRules
    };
    replacedStyles[styleKey] = compiledStyle;
  }

  return { precompiled, replacedStyles };
};

const createStaticStylePreviewArg = (t, stylesNode) => {
  const stylesObject = evalStaticNode(stylesNode);
  if (stylesObject == null || typeof stylesObject !== 'object') {
    return null;
  }

  const payload = buildStaticStylePayload(stylesObject);
  if (payload == null) {
    return null;
  }

  return t.objectExpression([
    t.objectProperty(
      t.identifier('__rnwTvStaticPreview'),
      objectToAst(t, payload.precompiled)
    )
  ]);
};

const createReplacedStylesAst = (t, stylesNode) => {
  const stylesObject = evalStaticNode(stylesNode);
  if (stylesObject == null || typeof stylesObject !== 'object') {
    return null;
  }

  const payload = buildStaticStylePayload(stylesObject);
  if (payload == null) {
    return null;
  }

  return {
    stylesAst: objectToAst(t, payload.replacedStyles),
    precompiledAst: t.objectExpression([
      t.objectProperty(
        t.identifier('__rnwTvStaticPreview'),
        objectToAst(t, payload.precompiled)
      )
    ])
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
        if (!isStyleSheetCreateCall(t, node) || node.arguments.length !== 1) {
          return;
        }

        if (state.opts.extractStaticStylesReplace === true) {
          const replaced = createReplacedStylesAst(t, node.arguments[0]);
          if (replaced != null) {
            node.arguments = [replaced.stylesAst, replaced.precompiledAst];
          }
          return;
        }

        if (state.opts.extractStaticStylesPreview !== true) {
          return;
        }

        const previewArg = createStaticStylePreviewArg(t, node.arguments[0]);
        if (previewArg != null) {
          node.arguments.push(previewArg);
        }
      },
      JSXAttribute(path, state) {
        if (state.opts.transpileStaticStyleProps !== true) {
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
