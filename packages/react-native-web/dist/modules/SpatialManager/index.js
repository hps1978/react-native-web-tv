import _objectSpread from "@babel/runtime/helpers/objectSpread2";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

// This module supports SpatialNavigation for TV platforms on web using
// the @bbc/tv-lrud-spatial library. Currently, SpatialNavigation working
// completely outside the React tree, i.e, it uses DOM APIs to manage
// focus and navigation.

// Currently, it only supports arrow ISO keyboard navigation.
import { setConfig, getNextFocus, getParentContainer, updateAncestorsAutoFocus } from '@bbc/tv-lrud-spatial';
import { addEventListener } from '../addEventListener';
import { setupNodeId } from '../../exports/TV/utils';

// API capability detection (one-time check at module load)
var hasPerformance = typeof performance !== 'undefined' && typeof performance.now === 'function';
var hasRequestAnimationFrame = typeof requestAnimationFrame === 'function';
var hasGetComputedStyle = typeof window !== 'undefined' && typeof window.getComputedStyle === 'function';
var hasGetBoundingClientRect = typeof Element !== 'undefined' && Element.prototype.getBoundingClientRect !== undefined;
function getCurrentTime() {
  return hasPerformance ? performance.now() : Date.now();
}
function scheduleAnimationFrame(callback) {
  if (hasRequestAnimationFrame) {
    return requestAnimationFrame(callback);
  }
  // Fallback: simulate 60fps with setTimeout (16ms per frame)
  return setTimeout(callback, 16);
}
function cancelScheduledFrame(frameId) {
  if (hasRequestAnimationFrame) {
    cancelAnimationFrame(frameId);
  } else {
    clearTimeout(frameId);
  }
}
var DEFAULT_SPATIAL_SCROLL_CONFIG = {
  edgeThresholdPx: 128,
  scrollThrottleMs: 80,
  smoothScrollEnabled: true,
  scrollAnimationDurationMs: 0,
  scrollAnimationDurationMsVertical: 0,
  scrollAnimationDurationMsHorizontal: 0
};
var isSpatialManagerReady = false;
var spatialNavigationContainer = null;
var currentFocus = {
  elem: null,
  parentHasAutofocus: false
};
var keyDownListener = null;
var spatialScrollConfig = _objectSpread({}, DEFAULT_SPATIAL_SCROLL_CONFIG);
var lastScrollAt = 0;
var scrollAnimationFrame = null;
function loadGlobalConfig() {
  // Check for window.appConfig.spatialNav (cross-platform pattern)
  if (typeof window !== 'undefined' && window.appConfig && window.appConfig) {
    return window.appConfig;
  }
  return null;
}

// Setup configuration for Spatial Navigation
// User provided through global configs or defaults
function setSpatialNavigationConfig() {
  // Auto-initialize from global config on first arrow key press if not already initialized
  if (!isSpatialManagerReady) {
    var globalConfig = loadGlobalConfig();
    if (globalConfig) {
      // Setup LRUD Keys if provided
      if (globalConfig != null && globalConfig.keyMap) {
        setConfig({
          keyMap: globalConfig.keyMap
        });
      }
      spatialScrollConfig = _objectSpread(_objectSpread({}, DEFAULT_SPATIAL_SCROLL_CONFIG), (globalConfig == null ? void 0 : globalConfig.scrollConfig) || {});
    }
  }
}
function animateScrollTo(scrollable, isVertical, nextOffset, durationMs) {
  var startOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  var delta = nextOffset - startOffset;
  if (delta === 0 || durationMs <= 0) return;
  if (scrollAnimationFrame != null) {
    cancelScheduledFrame(scrollAnimationFrame);
    scrollAnimationFrame = null;
  }
  var startTime = getCurrentTime();
  var step = now => {
    var elapsed = hasPerformance ? now - startTime : Date.now() - startTime;
    var t = Math.min(1, elapsed / durationMs);
    var value = startOffset + delta * t;
    if (typeof scrollable.scrollTo === 'function') {
      if (isVertical) {
        scrollable.scrollTo({
          y: value,
          animated: false
        });
      } else {
        scrollable.scrollTo({
          x: value,
          animated: false
        });
      }
    } else if (isVertical) {
      scrollable.scrollTop = value;
    } else {
      scrollable.scrollLeft = value;
    }
    if (t < 1) {
      scrollAnimationFrame = scheduleAnimationFrame(() => step(hasPerformance ? performance.now() : Date.now()));
    } else {
      scrollAnimationFrame = null;
    }
  };
  scrollAnimationFrame = scheduleAnimationFrame(() => step(hasPerformance ? performance.now() : Date.now()));
}
function findScrollableAncestor(elem, direction) {
  var current = elem ? elem.parentElement : null;
  while (current) {
    var overflowY = '';
    var overflowX = '';
    if (hasGetComputedStyle) {
      var style = window.getComputedStyle(current);
      overflowY = style.overflowY;
      overflowX = style.overflowX;
    } else {
      // Fallback: check inline styles only
      overflowY = current.style.overflowY || '';
      overflowX = current.style.overflowX || '';
    }
    var canScrollY = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && current.scrollHeight > current.clientHeight;
    var canScrollX = (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') && current.scrollWidth > current.clientWidth;
    if (direction === 'vertical' && canScrollY || direction === 'horizontal' && canScrollX) {
      return current;
    }
    if (current === document.body || current === document.documentElement) {
      break;
    }
    current = current.parentElement;
  }
  return null;
}
function maybeScrollOnFocus(elem, keyCode) {
  if (!elem || typeof window === 'undefined') return;
  var now = Date.now();
  if (spatialScrollConfig.scrollThrottleMs != null) {
    if (now - lastScrollAt < spatialScrollConfig.scrollThrottleMs) {
      return;
    }
  }
  var isVertical = keyCode === 'ArrowUp' || keyCode === 'ArrowDown';
  var isHorizontal = keyCode === 'ArrowLeft' || keyCode === 'ArrowRight';
  if (!isVertical && !isHorizontal) return;
  var direction = isVertical ? 'vertical' : 'horizontal';
  var scrollable = findScrollableAncestor(elem, direction);

  // If no scrollable ancestor found, use window for scrolling
  var isWindowScroll = !scrollable;
  if (isWindowScroll) {
    scrollable = {
      scrollTop: window.scrollY,
      scrollLeft: window.scrollX,
      clientHeight: window.innerHeight,
      clientWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        bottom: window.innerHeight,
        right: window.innerWidth
      }),
      scrollTo: options => {
        var scrollParam = {
          top: options.y !== undefined ? options.y : window.scrollY,
          left: options.x !== undefined ? options.x : window.scrollX,
          behavior: options.animated ? 'smooth' : 'auto'
        };
        window.scroll ? window.scroll(scrollParam) : window.scrollTo(scrollParam);
      }
    };
  }
  if (!scrollable) return;
  var containerRect;
  var targetRect;
  if (hasGetBoundingClientRect) {
    containerRect = scrollable.getBoundingClientRect();
    targetRect = elem.getBoundingClientRect();
  } else {
    // Fallback: use offset dimensions (less precise, but better than nothing)
    containerRect = {
      top: scrollable.offsetTop || 0,
      left: scrollable.offsetLeft || 0,
      bottom: (scrollable.offsetTop || 0) + (scrollable.offsetHeight || 0),
      right: (scrollable.offsetLeft || 0) + (scrollable.offsetWidth || 0)
    };
    targetRect = {
      top: elem.offsetTop || 0,
      left: elem.offsetLeft || 0,
      bottom: (elem.offsetTop || 0) + (elem.offsetHeight || 0),
      right: (elem.offsetLeft || 0) + (elem.offsetWidth || 0)
    };
  }
  var edgeThreshold = spatialScrollConfig.edgeThresholdPx || 0;
  var viewportRect = {
    top: 0,
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth
  };
  var visibleContainerRect = isWindowScroll ? viewportRect : {
    top: Math.max(containerRect.top, viewportRect.top),
    bottom: Math.min(containerRect.bottom, viewportRect.bottom),
    left: Math.max(containerRect.left, viewportRect.left),
    right: Math.min(containerRect.right, viewportRect.right)
  };
  var currentOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  var maxOffset = isVertical ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight) : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

  // Calculate the exact scroll offset needed to bring the focused element fully into view
  var nextOffset = currentOffset;
  var scrollDelta = 0;
  var needsScroll = false;
  if (isVertical) {
    var padding = edgeThreshold; // Use edge threshold as padding

    // Element is below viewport - scroll down to show it
    if (targetRect.bottom > visibleContainerRect.bottom - padding) {
      var delta = targetRect.bottom - (visibleContainerRect.bottom - padding);
      // KEY FIX: For virtualized containers (maxOffset === 0), allow the offset to be calculated
      // The virtualization will load more content as we scroll
      scrollDelta = delta;
      nextOffset = isWindowScroll ? Math.min(currentOffset + delta, maxOffset) : currentOffset + delta;
      needsScroll = true;
    }
    // Element is above viewport - scroll up to show it
    else if (targetRect.top < visibleContainerRect.top + padding) {
      var _delta = visibleContainerRect.top + padding - targetRect.top;
      scrollDelta = -_delta;
      nextOffset = Math.max(currentOffset - _delta, 0);
      needsScroll = true;
    }
  } else {
    var _padding = edgeThreshold;

    // Element is to the right of viewport
    if (targetRect.right > visibleContainerRect.right - _padding) {
      var _delta2 = targetRect.right - (visibleContainerRect.right - _padding);
      scrollDelta = _delta2;
      nextOffset = isWindowScroll ? Math.min(currentOffset + _delta2, maxOffset) : currentOffset + _delta2;
      needsScroll = true;
    }
    // Element is to the left of viewport
    else if (targetRect.left < visibleContainerRect.left + _padding) {
      var _delta3 = visibleContainerRect.left + _padding - targetRect.left;
      scrollDelta = -_delta3;
      nextOffset = Math.max(currentOffset - _delta3, 0);
      needsScroll = true;
    }
  }
  if (!needsScroll) {
    return;
  }
  lastScrollAt = now;

  // Defer scroll to next event loop to avoid blocking the keydown handler
  Promise.resolve().then(() => {
    var liveOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
    var liveNextOffset = isWindowScroll ? Math.min(Math.max(liveOffset + scrollDelta, 0), maxOffset) : Math.max(liveOffset + scrollDelta, 0);
    var directionDurationMs = isVertical ? spatialScrollConfig.scrollAnimationDurationMsVertical : spatialScrollConfig.scrollAnimationDurationMsHorizontal;
    var durationMs = directionDurationMs != null ? directionDurationMs : spatialScrollConfig.scrollAnimationDurationMs || 0;
    if (durationMs > 0) {
      animateScrollTo(scrollable, isVertical, liveNextOffset, durationMs);
      return;
    }
    var finalOffset = nextOffset;
    if (typeof scrollable.scrollTo === 'function') {
      if (isVertical) {
        scrollable.scrollTo({
          y: finalOffset,
          animated: spatialScrollConfig.smoothScrollEnabled !== false
        });
      } else {
        scrollable.scrollTo({
          x: finalOffset,
          animated: spatialScrollConfig.smoothScrollEnabled !== false
        });
      }
    } else if (isVertical) {
      scrollable.scrollTop = finalOffset;
    } else {
      scrollable.scrollLeft = finalOffset;
    }
  });
}
function triggerFocus(nextFocus, keyCode) {
  if (nextFocus && nextFocus.elem) {
    currentFocus = nextFocus;
    // set id first
    setupNodeId(nextFocus.elem);
    updateAncestorsAutoFocus(nextFocus.elem, spatialNavigationContainer);
    if (keyCode) {
      maybeScrollOnFocus(nextFocus.elem, keyCode);
    }

    // Focus the element without scrolling as we already handled scrolling
    nextFocus.elem.focus({
      preventScroll: true
    });
    return true;
  }
  return false;
}
function setupSpatialNavigation(container) {
  if (isSpatialManagerReady) {
    return;
  }
  setSpatialNavigationConfig();
  spatialNavigationContainer = (container == null ? void 0 : container.ownerDocument) || window.document;

  // Listen to keydown events on the container or document
  keyDownListener = addEventListener(spatialNavigationContainer, 'keydown', event => {
    var keyCode = event.key || event.code;
    if (keyCode !== 'ArrowUp' && keyCode !== 'ArrowDown' && keyCode !== 'ArrowLeft' && keyCode !== 'ArrowRight') {
      return;
    }
    if (!currentFocus) {
      console.warn('No initial focus. Trying to set one...');
    }
    var nextFocus = getNextFocus(currentFocus.elem, keyCode, (container == null ? void 0 : container.ownerDocument) || window.document);
    if (triggerFocus(nextFocus, keyCode) === true) {
      event.preventDefault();
    }
  }, {
    capture: true
  });
  isSpatialManagerReady = true;
}
function setFocus(node) {
  if (node && node.className.includes('lrud-container')) {
    // It's a container trigger spatial logic to find an focus
    // TODO: Add another function which triggers the spatial logic based on the container
    // and without the need to pass the keyCode
    var nextFocus = getNextFocus(null,
    // use this as starting point
    'ArrowDown', node // this is the scope as well for now!
    );
    triggerFocus(nextFocus);
  } else {
    if (node && node.focus) {
      var _getParentContainer;
      var parentHasAutofocus = ((_getParentContainer = getParentContainer(node)) == null ? void 0 : _getParentContainer.getAttribute('data-autofocus')) === 'true' || false;
      triggerFocus({
        elem: node,
        parentHasAutofocus
      });
    }
  }
}
function setDestinations(host, destinations) {
  // Get ids from destinations, and if id not set, generate a new one and set all of them into 'data-destinations' attribute in the host element
  if (destinations && Array.isArray(destinations)) {
    var destinationIDs = destinations.map(dest => {
      if (dest && !(dest instanceof HTMLElement)) {
        console.error('Error: Argument appears to not be a ReactComponent', dest);
        return null;
      }
      return dest ? setupNodeId(dest) : null;
    }).filter(id => id != null);
    if (destinationIDs.length > 0) {
      var _host$className;
      host.setAttribute('data-destinations', destinationIDs.join(' '));
      // Side effect: If this container has not been set with lrud-container class, do it now
      // to allow collapsable/expandable containers to work properly for LRUD navigation
      if (!((_host$className = host.className) != null && _host$className.includes('lrud-container'))) {
        var _host$className2;
        if (((_host$className2 = host.className) == null ? void 0 : _host$className2.length) > 0) {
          host.className += ' lrud-container';
        } else {
          host.className = 'lrud-container';
        }
      }
    } else {
      var _host$className3;
      host.setAttribute('data-destinations', '');
      // Side effect: If there are no destinations and auto-focus is false, we can remove the lrud-container class
      var isContainer = (_host$className3 = host.className) == null ? void 0 : _host$className3.includes('lrud-container');
      var isAutoFocus = host.getAttribute('data-autofocus') === 'true';
      if (isContainer && !isAutoFocus) {
        var _host$className4;
        if (((_host$className4 = host.className) == null ? void 0 : _host$className4.length) > 14) {
          host.className = host.className.replace(' lrud-container', '');
        } else {
          host.className = host.className.replace('lrud-container', '');
        }
      }
    }
  }
}
function teardownSpatialNavigation() {
  if (!isSpatialManagerReady) {
    return;
  }
  if (keyDownListener) {
    keyDownListener.remove();
    keyDownListener = null;
  }
  spatialNavigationContainer = null;
  currentFocus = null;
  isSpatialManagerReady = false;
}
export { setupSpatialNavigation, setFocus, teardownSpatialNavigation, setDestinations };