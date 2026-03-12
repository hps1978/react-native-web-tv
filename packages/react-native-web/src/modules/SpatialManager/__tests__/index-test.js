/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  setupSpatialNavigation,
  setFocus,
  setDestinations,
  teardownSpatialNavigation
} from '../index';
import * as lrudSpatial from '@bbc/tv-lrud-spatial';
import { setupScrollHandler } from '../scrollHandler';

jest.mock('../scrollHandler', () => ({
  scrollToElement: jest.fn(),
  setupAppInitiatedScrollHandler: jest.fn(() => () => {}),
  isElementInWindowViewport: jest.fn(() => true),
  setupScrollHandler: jest.fn(),
  scrollToEdge: jest.fn()
}));

jest.mock('../mutationObserver', () => ({
  startObserving: jest.fn(),
  stopObserving: jest.fn()
}));

function setRect(node, rect) {
  node.getBoundingClientRect = () => ({
    ...rect,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({})
  });
}

describe('modules/SpatialManager', () => {
  afterEach(() => {
    teardownSpatialNavigation();
    document.body.innerHTML = '';
    delete window.appConfig;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('setFocus focuses a plain focusable element', () => {
    const elem = document.createElement('button');
    elem.tabIndex = 0;
    document.body.appendChild(elem);

    setFocus(elem);

    expect(document.activeElement).toBe(elem);
  });

  test('applies app config keyMap, scrollConfig, and AlignLeft focus mode', () => {
    const setConfigSpy = jest.spyOn(lrudSpatial, 'setConfig');

    window.appConfig = {
      keyMap: {
        UP: 'ArrowUp'
      },
      scrollConfig: {
        leftEdgePaddingPx: 24
      },
      focusConfig: {
        mode: 'AlignLeft'
      }
    };

    const container = document.createElement('div');
    document.body.appendChild(container);

    setupSpatialNavigation(container);

    expect(setConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        keyMap: {
          UP: 'ArrowUp'
        },
        noValidDestinationCallback: expect.any(Function)
      })
    );
    expect(setupScrollHandler).toHaveBeenCalledWith({
      scrollConfig: {
        leftEdgePaddingPx: 24
      },
      focusMode: 'AlignLeft'
    });
  });

  test('uses default setup values when app config is missing', () => {
    const setConfigSpy = jest.spyOn(lrudSpatial, 'setConfig');

    const container = document.createElement('div');
    document.body.appendChild(container);

    setupSpatialNavigation(container);

    expect(setConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        keyMap: null,
        noValidDestinationCallback: expect.any(Function)
      })
    );
    expect(setupScrollHandler).toHaveBeenCalledWith({
      scrollConfig: {},
      focusMode: 'default'
    });
  });

  test('moves focus right using real LRUD on keydown', () => {
    const container = document.createElement('div');
    container.className = 'lrud-container';
    container.tabIndex = 0;

    const left = document.createElement('button');
    left.tabIndex = 0;
    const right = document.createElement('button');
    right.tabIndex = 0;

    setRect(left, {
      left: 0,
      right: 50,
      top: 0,
      bottom: 50,
      width: 50,
      height: 50
    });
    setRect(right, {
      left: 200,
      right: 250,
      top: 0,
      bottom: 50,
      width: 50,
      height: 50
    });
    setRect(container, {
      left: 0,
      right: 300,
      top: 0,
      bottom: 300,
      width: 300,
      height: 300
    });

    container.appendChild(left);
    container.appendChild(right);
    document.body.appendChild(container);

    setupSpatialNavigation(container);
    setFocus(left);

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true
      })
    );

    expect(document.activeElement).toBe(right);
  });

  test('setFocus(container) honors destinations with autofocus enabled', () => {
    const container = document.createElement('div');
    container.className = 'lrud-container';
    container.tabIndex = 0;
    container.setAttribute('data-autofocus', 'true');

    const first = document.createElement('button');
    first.tabIndex = 0;
    first.id = 'first-destination';

    const preferred = document.createElement('button');
    preferred.tabIndex = 0;
    preferred.id = 'preferred-destination';

    container.setAttribute('data-destinations', preferred.id);
    container.appendChild(first);
    container.appendChild(preferred);
    document.body.appendChild(container);

    setFocus(container);

    expect(document.activeElement).toBe(preferred);
  });

  test('throttles repeated keydown navigation using keydownThrottleMs', () => {
    window.appConfig = {
      keydownThrottleMs: 100
    };

    jest.spyOn(Date, 'now').mockImplementation(() => 1000);

    const container = document.createElement('div');
    container.className = 'lrud-container';
    container.tabIndex = 0;

    const left = document.createElement('button');
    left.tabIndex = 0;
    const right = document.createElement('button');
    right.tabIndex = 0;

    setRect(left, {
      left: 0,
      right: 50,
      top: 0,
      bottom: 50,
      width: 50,
      height: 50
    });
    setRect(right, {
      left: 200,
      right: 250,
      top: 0,
      bottom: 50,
      width: 50,
      height: 50
    });
    setRect(container, {
      left: 0,
      right: 300,
      top: 0,
      bottom: 300,
      width: 300,
      height: 300
    });

    container.appendChild(left);
    container.appendChild(right);
    document.body.appendChild(container);

    setupSpatialNavigation(container);
    setFocus(left);

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true
      })
    );
    expect(document.activeElement).toBe(right);

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true
      })
    );

    // Second keydown is throttled and ignored, so focus remains on `right`.
    expect(document.activeElement).toBe(right);
  });

  test('setDestinations assigns ids and makes host focusable', () => {
    const host = document.createElement('div');
    host.className = 'lrud-container';
    host.tabIndex = -1;

    const first = document.createElement('button');
    first.tabIndex = 0;
    const second = document.createElement('button');
    second.tabIndex = 0;

    host.appendChild(first);
    host.appendChild(second);
    document.body.appendChild(host);

    setDestinations(host, [first, second]);

    const destinations = host.getAttribute('data-destinations') || '';
    expect(destinations.length).toBeGreaterThan(0);
    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(host.tabIndex).toBe(0);
  });

  test('setDestinations clears host and disables focus when no autofocus', () => {
    const host = document.createElement('div');
    host.className = 'lrud-container';
    host.tabIndex = 0;
    host.setAttribute('data-autofocus', 'false');
    host.setAttribute('data-destinations', 'old-id');
    document.body.appendChild(host);

    setDestinations(host, []);

    expect(host.getAttribute('data-destinations')).toBe('');
    expect(host.tabIndex).toBe(-1);
  });

  test('ignores non-arrow keydown events', () => {
    const container = document.createElement('div');
    container.className = 'lrud-container';
    container.tabIndex = 0;

    const left = document.createElement('button');
    left.tabIndex = 0;
    const right = document.createElement('button');
    right.tabIndex = 0;

    setRect(left, {
      left: 0,
      right: 50,
      top: 0,
      bottom: 50,
      width: 50,
      height: 50
    });
    setRect(right, {
      left: 200,
      right: 250,
      top: 0,
      bottom: 50,
      width: 50,
      height: 50
    });
    setRect(container, {
      left: 0,
      right: 300,
      top: 0,
      bottom: 300,
      width: 300,
      height: 300
    });

    container.appendChild(left);
    container.appendChild(right);
    document.body.appendChild(container);

    setupSpatialNavigation(container);
    setFocus(left);

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      })
    );

    expect(document.activeElement).toBe(left);
  });
});
