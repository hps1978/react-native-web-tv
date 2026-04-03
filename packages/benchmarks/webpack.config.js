const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');

const appDirectory = path.resolve(__dirname);
const enableStaticStylePropTranspile =
  process.env.BENCH_STATIC_STYLE_PROP_TRANSPILE === 'true';
const staticStylePropPlugin = require.resolve(
  'babel-plugin-react-native-web-tv',
  { paths: [appDirectory] }
);

module.exports = {
  mode: 'production',
  context: __dirname,
  entry: './src/index',
  output: {
    path: path.resolve(appDirectory, 'dist'),
    filename: 'bundle.js'
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[hash:base64:8]'
              }
            }
          }
        ]
      },
      {
        test: /\.js$/,
        include: [path.resolve(appDirectory, 'src')],
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: false,
            extends: path.resolve(appDirectory, '../../configs/babel.config'),
            plugins: enableStaticStylePropTranspile
              ? [
                  [
                    staticStylePropPlugin,
                    {
                      target: 'react-native-web',
                      transpileStaticStyleProps: true
                    }
                  ]
                ]
              : []
          }
        }
      }
    ]
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false
    })
  ],
  resolve: {
    alias: {
      'react-native': 'react-native-web-tv'
    }
  }
};
