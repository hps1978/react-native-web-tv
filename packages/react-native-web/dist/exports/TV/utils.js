/**
 * Copyright (c) Douglas Lowder.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * 
 */

var ID_LIMIT = 100000; // big enough to wrap around!
var nextId = 0;
function setupNodeId(node) {
  var _node$id;
  var id = ((_node$id = node.id) == null ? void 0 : _node$id.length) > 0 ? node.id : null;
  if (!id) {
    // Use a simple incremented number as id
    id = "lrud-" + (nextId > ID_LIMIT ? 1 : ++nextId);
    node.id = id;
  }
  return id;
}
export { setupNodeId };