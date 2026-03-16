/**
 * Copyright (c) Douglas Lowder.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type { ScrollViewProps } from '../ScrollView/types';

import tagForComponentOrHandle from './tagForComponentOrHandle';

import ScrollView from '../ScrollView';
import {
  scrollContainer,
  leaveKeyHandlerControl,
  takeKeyHandlerControl
} from '../../modules/SpatialManager';
import * as React from 'react';
const { tvFocusEventHandler } = require('./TVFocusEventHandler');

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

class TVTextScrollView extends React.Component<{
  ...ScrollViewProps,
  /**
   * The duration of the scroll animation when a swipe is detected.
   * Default value is 0.3 s
   */
  scrollDuration?: number,
  /**
   * Scrolling distance when a swipe is detected
   * Default value is half the visible height (vertical scroller)
   * or width (horizontal scroller)
   */
  pageSize?: number,
  /**
   * If true, will scroll to start when focus moves out past the beginning
   * of the scroller
   * Defaults to true
   */
  snapToStart?: boolean,
  /**
   * If true, will scroll to end when focus moves out past the end of the
   * scroller
   * Defaults to true
   */
  snapToEnd?: boolean,
  /**
   * Called when the scroller comes into focus (e.g. for highlighting)
   */
  onFocus?: (evt: Event) => void,
  /**
   * Called when the scroller goes out of focus
   */
  onBlur?: (evt: Event) => void
}> {
  _subscription: any;
  _scrollViewRef: ?React.ElementRef<typeof ScrollView>;
  _keyControlOwner: ?HTMLElement;

  _setScrollViewRef = (ref: ?React.ElementRef<typeof ScrollView>) => {
    this._scrollViewRef = ref;
  };

  getScrollViewRef(): ?React.ElementRef<typeof ScrollView> {
    return this._scrollViewRef;
  }

  _getScrollableNode(): ?HTMLElement {
    const scrollViewRef: any = this._scrollViewRef;
    if (
      scrollViewRef &&
      typeof scrollViewRef.getScrollableNode === 'function'
    ) {
      return scrollViewRef.getScrollableNode();
    }
    return null;
  }

  _handleDirectionalKeyFromSpatial = (keyCode: string): ?boolean => {
    const scrollableNode = this._keyControlOwner;
    if (!scrollableNode) {
      return false;
    }
    return scrollContainer(scrollableNode, keyCode, {
      horizontal: this.props.horizontal === true,
      pageSize: this.props.pageSize,
      scrollDurationMs: Math.max(0, (this.props.scrollDuration || 0) * 1000),
      snapToStart: this.props.snapToStart !== false,
      snapToEnd: this.props.snapToEnd !== false
    });
  };

  _takeDirectionalKeyControl = () => {
    const owner = this._getScrollableNode();
    this._keyControlOwner = owner;
    takeKeyHandlerControl(owner, this._handleDirectionalKeyFromSpatial);
  };

  _releaseDirectionalKeyControl = () => {
    leaveKeyHandlerControl(this._keyControlOwner);
    this._keyControlOwner = null;
  };

  componentDidMount() {
    const cmp = this; // eslint-disable-line consistent-this
    const myTag = tagForComponentOrHandle(this._scrollViewRef);
    tvFocusEventHandler?.register(myTag, function (evt) {
      if (myTag === evt.tag) {
        if (evt.eventType === 'focus') {
          cmp._takeDirectionalKeyControl();
          cmp.props.onFocus && cmp.props.onFocus(evt);
        } else if (evt.eventType === 'blur') {
          cmp._releaseDirectionalKeyControl();
          cmp.props.onBlur && cmp.props.onBlur(evt);
        }
      }
    });
  }

  componentWillUnmount() {
    this._releaseDirectionalKeyControl();
    const myTag = tagForComponentOrHandle(this._scrollViewRef);
    tvFocusEventHandler?.unregister(myTag);
  }

  render(): $FlowFixMe {
    const props: $FlowFixMe = {
      ...this.props,
      tvParallaxProperties: {
        pressDuration: this.props.scrollDuration || 0.0
      },
      isTVSelectable: true,
      snapToInterval: this.props.pageSize || 0.0,
      removeClippedSubviews: false,
      automaticallyAdjustContentInsets: false
    };
    return (
      <ScrollView {...props} ref={this._setScrollViewRef}>
        {this.props.children}
      </ScrollView>
    );
  }
}

export default TVTextScrollView;
