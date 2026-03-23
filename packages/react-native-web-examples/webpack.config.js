const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const appDirectory = path.resolve(__dirname);

module.exports = (env, argv) => ({
  mode: argv.mode || 'development',
  context: __dirname,
  entry: './webpack-entry.js',
  output: {
    path: path.resolve(appDirectory, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
    clean: true
  },
  devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(appDirectory, 'pages'),
          path.resolve(appDirectory, 'shared'),
          path.resolve(appDirectory, 'webpack-entry.js')
        ],
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true
          }
        }
      }
    ]
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web-tv'
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '.',
          globOptions: {
            ignore: ['**/index.html']
          }
        }
      ]
    })
  ],
  devServer: {
    port: 8080,
    historyApiFallback: true,
    static: {
      directory: path.resolve(appDirectory, 'public')
    },
    hot: true,
    compress: true,
    allowedHosts: 'all'
  }
});
