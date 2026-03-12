/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const createUtilsMock = (overrides = {}) => ({
  getCurrentTime: jest.fn(() => 0),
  scheduleAnimationFrame: jest.fn(),
  cancelScheduledFrame: jest.fn(),
  findScrollableAncestor: jest.fn((_, direction) => ({
    scrollable: {
      scrollTop: 0,
      scrollLeft: 0,
      scrollHeight: direction === 'vertical' ? 1000 : 100,
      clientHeight: 100,
      scrollWidth: direction === 'horizontal' ? 1000 : 100,
      clientWidth: 100,
      scrollTo: jest.fn()
    },
    isWindowScroll: false
  })),
  isElementInWindowViewport: jest.fn(() => true),
  getElementVisibilityRatio: jest.fn(() => 1),
  inferScrollDirection: jest.fn(() => 'ArrowDown'),
  getBoundingRectangles: jest.fn(() => ({
    verticalRects: {
      visibleContainerRect: { top: 0, bottom: 100, left: 0, right: 100 }
    },
    horizontalRects: {
      visibleContainerRect: { top: 0, bottom: 100, left: 0, right: 100 }
    },
    targetRect: { top: 0, bottom: 100, left: 0, right: 100 }
  })),
  getAxisScrollDelta: jest.fn((_, __, axis) => ({
    needsScroll: false,
    scrollDelta: axis === 'vertical' ? 0 : 0
  })),
  ...overrides
});

function loadScrollHandler(overrides = {}) {
  jest.resetModules();
  const utilsMock = createUtilsMock(overrides);

  jest.doMock('../utils', () => utilsMock);

  let moduleExports;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    moduleExports = require('../scrollHandler');
  });

  return { ...moduleExports, utilsMock };
}

describe('modules/SpatialManager/scrollHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('preserves partial visibility by invoking scroll recovery path', () => {
    const target = document.createElement('button');
    document.body.appendChild(target);

    const scrollContainer = document.createElement('div');
    document.body.appendChild(scrollContainer);

    const { setupAppInitiatedScrollHandler, utilsMock } = loadScrollHandler({
      isElementInWindowViewport: jest.fn(() => false),
      getElementVisibilityRatio: jest.fn(() => 0.25),
      inferScrollDirection: jest.fn(() => 'ArrowRight')
    });

    const getCurrentFocus = jest.fn(() => ({
      elem: target,
      parentContainer: null
    }));
    const onScrollRefocus = jest.fn();

    const cleanup = setupAppInitiatedScrollHandler(
      document,
      getCurrentFocus,
      onScrollRefocus
    );

    scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
    jest.advanceTimersByTime(100);

    expect(utilsMock.inferScrollDirection).toHaveBeenCalledWith(
      scrollContainer
    );
    expect(onScrollRefocus).not.toHaveBeenCalled();

    cleanup();
  });

  test('reacquires focus when focused element is fully out of viewport', () => {
    const target = document.createElement('button');
    document.body.appendChild(target);

    const scrollContainer = document.createElement('div');
    document.body.appendChild(scrollContainer);

    const { setupAppInitiatedScrollHandler } = loadScrollHandler({
      isElementInWindowViewport: jest.fn(() => false),
      getElementVisibilityRatio: jest.fn(() => 0)
    });

    const getCurrentFocus = jest.fn(() => ({
      elem: target,
      parentContainer: null
    }));
    const onScrollRefocus = jest.fn();

    const cleanup = setupAppInitiatedScrollHandler(
      document,
      getCurrentFocus,
      onScrollRefocus
    );

    const event = new Event('scroll', { bubbles: true });
    Object.defineProperty(event, 'target', {
      value: scrollContainer,
      configurable: true
    });

    window.dispatchEvent(event);
    jest.advanceTimersByTime(100);

    expect(onScrollRefocus).toHaveBeenCalledWith({
      currentFocus: { elem: target, parentContainer: null },
      scrollContainer
    });

    cleanup();
  });

  test('debounces burst scroll events and processes only once', () => {
    const target = document.createElement('button');
    document.body.appendChild(target);

    const { setupAppInitiatedScrollHandler } = loadScrollHandler({
      isElementInWindowViewport: jest.fn(() => false),
      getElementVisibilityRatio: jest.fn(() => 0)
    });

    const getCurrentFocus = jest.fn(() => ({
      elem: target,
      parentContainer: null
    }));
    const onScrollRefocus = jest.fn();

    const cleanup = setupAppInitiatedScrollHandler(
      document,
      getCurrentFocus,
      onScrollRefocus
    );

    window.dispatchEvent(new Event('scroll', { bubbles: true }));
    jest.advanceTimersByTime(60);
    window.dispatchEvent(new Event('scroll', { bubbles: true }));
    jest.advanceTimersByTime(60);
    window.dispatchEvent(new Event('scroll', { bubbles: true }));

    expect(onScrollRefocus).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(onScrollRefocus).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('scrollToElement prioritizes axis with larger delta first', () => {
    const scrollOrder = [];
    const verticalScrollable = {
      scrollTop: 10,
      scrollLeft: 0,
      scrollHeight: 800,
      clientHeight: 200,
      scrollWidth: 200,
      clientWidth: 200,
      scrollTo: jest.fn(() => scrollOrder.push('vertical'))
    };
    const horizontalScrollable = {
      scrollTop: 0,
      scrollLeft: 10,
      scrollHeight: 200,
      clientHeight: 200,
      scrollWidth: 800,
      clientWidth: 200,
      scrollTo: jest.fn(() => scrollOrder.push('horizontal'))
    };

    const findScrollableAncestor = jest
      .fn()
      .mockImplementation((_, direction) =>
        direction === 'vertical'
          ? { scrollable: verticalScrollable, isWindowScroll: false }
          : { scrollable: horizontalScrollable, isWindowScroll: false }
      );

    const getAxisScrollDelta = jest
      .fn()
      .mockImplementation((_, __, axis) =>
        axis === 'vertical'
          ? { needsScroll: true, scrollDelta: 90 }
          : { needsScroll: true, scrollDelta: 20 }
      );

    const { scrollToElement } = loadScrollHandler({
      findScrollableAncestor,
      getAxisScrollDelta
    });

    const nextElem = document.createElement('button');
    scrollToElement(
      { elem: nextElem, parentContainer: null },
      null,
      'ArrowDown'
    );

    expect(scrollOrder).toEqual(['vertical', 'horizontal']);
    expect(verticalScrollable.scrollTo).toHaveBeenCalled();
    expect(horizontalScrollable.scrollTo).toHaveBeenCalled();
  });
});
