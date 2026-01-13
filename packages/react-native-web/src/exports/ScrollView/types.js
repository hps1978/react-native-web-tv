/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type { ViewProps, ViewStyle } from '../View/types';

export type ScrollViewProps = {
  ...ViewProps,
  centerContent?: boolean,
  contentContainerStyle?: ViewStyle,
  horizontal?: boolean,
  keyboardDismissMode?: 'none' | 'interactive' | 'on-drag',
  onContentSizeChange?: (e: any) => void,
  onScroll?: (e: any) => void,
  pagingEnabled?: boolean,
  refreshControl?: any,
  scrollEnabled?: boolean,
  scrollEventThrottle?: number,
  stickyHeaderIndices?: Array<number>
};
