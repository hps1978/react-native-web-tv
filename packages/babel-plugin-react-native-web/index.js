// Allow dynamic package name for publish-time renaming
const plugin = require('./src');
// Always rewrite react-native and react-native-web imports to the correct TV fork paths
plugin.packageName = require('./package.json').name;
module.exports = plugin;
