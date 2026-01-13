import _objectSpread from "@babel/runtime/helpers/objectSpread2";
/**
 * Copyright (c) Douglas Lowder.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * 
 */

import tagForComponentOrHandle from './tagForComponentOrHandle';
import ScrollView from '../ScrollView';
import * as React from 'react';
var _require = require('./TVFocusEventHandler'),
  tvFocusEventHandler = _require.tvFocusEventHandler;

/**
 * Convenience wrapper to create a scroll view that will scroll correctly
 * using swipe gestures on tvOS, even if the scroll view has no focusable
 * subviews.
 *
 * The main use case would be when a large scrolling block of text needs
 * to be presented to the user.
 *
 * Props:
 *
 */

class TVTextScrollView extends React.Component {
  componentDidMount() {
    var cmp = this; // eslint-disable-line consistent-this
    var myTag = tagForComponentOrHandle(this);
    tvFocusEventHandler == null || tvFocusEventHandler.register(myTag, function (evt) {
      if (myTag === evt.tag) {
        if (evt.eventType === 'focus') {
          cmp.props.onFocus && cmp.props.onFocus(evt);
        } else if (evt.eventType === 'blur') {
          cmp.props.onBlur && cmp.props.onBlur(evt);
        }
      }
    });
  }
  componentWillUnmount() {
    var myTag = tagForComponentOrHandle(this);
    tvFocusEventHandler == null || tvFocusEventHandler.unregister(myTag);
  }
  render() {
    var props = _objectSpread(_objectSpread({}, this.props), {}, {
      tvParallaxProperties: {
        pressDuration: this.props.scrollDuration || 0.0
      },
      isTVSelectable: true,
      snapToInterval: this.props.pageSize || 0.0,
      removeClippedSubviews: false,
      automaticallyAdjustContentInsets: false
    });
    return /*#__PURE__*/React.createElement(ScrollView, props, this.props.children);
  }
}
export default TVTextScrollView;