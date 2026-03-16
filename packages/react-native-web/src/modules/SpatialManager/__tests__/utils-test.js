/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { getBoundingRectangles } from '../utils';

// Helper: build a mock scrollable with a controllable getBoundingClientRect
// and a contains() that always returns true (simulating that elem/parent
// are inside the scrollable) unless told otherwise.
function makeScrollable(rect, contains = true) {
  return {
    getBoundingClientRect: () => rect,
    contains: () => contains
  };
}

// Helper: build a DOM element whose getBoundingClientRect returns the given rect.
function makeElem(rect) {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({})
  });
  return el;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('modules/SpatialManager/utils – getBoundingRectangles', () => {
  // Vertical axis --------------------------------------------------------

  describe('targetVRect – parentContainer vs scrollable vertical size', () => {
    test('uses parentContainerRect when parent fits inside the vertical scroll container', () => {
      // scrollable container: 600px tall (0 → 600)
      const scrollableV = makeScrollable({
        top: 0,
        bottom: 600,
        left: 0,
        right: 800
      });
      // Parent container: 200px tall – fits inside scrollable
      const parent = makeElem({ top: 100, bottom: 300, left: 0, right: 800 });
      // Focused element (child of parent): 50px tall
      const elem = makeElem({ top: 120, bottom: 170, left: 10, right: 200 });

      const { targetVRect } = getBoundingRectangles(
        scrollableV,
        false, // horizontal axis (same scrollable, doesn't matter here)
        scrollableV,
        false, // vertical axis
        { elem, parentContainer: parent }
      );

      // Parent fits → should scroll to bring parent into view
      expect(targetVRect.top).toBe(100);
      expect(targetVRect.bottom).toBe(300);
    });

    test('falls back to targetElemRect when parentContainer is taller than the scroll container', () => {
      // scrollable container: 300px tall (0 → 300)
      const scrollableV = makeScrollable({
        top: 0,
        bottom: 300,
        left: 0,
        right: 800
      });
      // Parent container: 500px tall – does NOT fit inside scrollable
      const parent = makeElem({ top: 0, bottom: 500, left: 0, right: 800 });
      // Focused element (child inside parent): 50px tall
      const elem = makeElem({ top: 350, bottom: 400, left: 10, right: 200 });

      const { targetVRect } = getBoundingRectangles(
        scrollableV,
        false,
        scrollableV,
        false,
        { elem, parentContainer: parent }
      );

      // Parent overflows → fall back to element rect so scrolling is precise
      expect(targetVRect.top).toBe(350);
      expect(targetVRect.bottom).toBe(400);
    });

    test('falls back to targetElemRect when parent exactly equals container height (boundary)', () => {
      // scrollable container: 300px tall
      const scrollableV = makeScrollable({
        top: 0,
        bottom: 300,
        left: 0,
        right: 800
      });
      // Parent container: exactly 300px tall – equal, so parentSize <= containerSize → uses parent
      const parent = makeElem({ top: 0, bottom: 300, left: 0, right: 800 });
      const elem = makeElem({ top: 50, bottom: 100, left: 10, right: 200 });

      const { targetVRect } = getBoundingRectangles(
        scrollableV,
        false,
        scrollableV,
        false,
        { elem, parentContainer: parent }
      );

      // Exactly equal → condition is parentSize <= containerSize → true → uses parent
      expect(targetVRect.top).toBe(0);
      expect(targetVRect.bottom).toBe(300);
    });
  });

  // Horizontal axis ------------------------------------------------------

  describe('targetHRect – parentContainer vs scrollable horizontal size', () => {
    test('uses parentContainerRect when parent fits inside the horizontal scroll container', () => {
      const scrollableH = makeScrollable({
        top: 0,
        bottom: 100,
        left: 0,
        right: 800
      });
      const parent = makeElem({ top: 0, bottom: 100, left: 50, right: 350 }); // 300px wide, fits in 800px
      const elem = makeElem({ top: 10, bottom: 90, left: 60, right: 120 });

      const { targetHRect } = getBoundingRectangles(
        scrollableH,
        false,
        scrollableH,
        false,
        { elem, parentContainer: parent }
      );

      expect(targetHRect.left).toBe(50);
      expect(targetHRect.right).toBe(350);
    });

    test('falls back to targetElemRect when parentContainer is wider than the horizontal scroll container', () => {
      const scrollableH = makeScrollable({
        top: 0,
        bottom: 100,
        left: 0,
        right: 400
      }); // 400px wide
      const parent = makeElem({ top: 0, bottom: 100, left: 0, right: 900 }); // 900px wide, overflows
      const elem = makeElem({ top: 10, bottom: 90, left: 600, right: 700 });

      const { targetHRect } = getBoundingRectangles(
        scrollableH,
        false,
        scrollableH,
        false,
        { elem, parentContainer: parent }
      );

      expect(targetHRect.left).toBe(600);
      expect(targetHRect.right).toBe(700);
    });
  });

  // Mixed axes -----------------------------------------------------------

  describe('mixed axes – parent fits on one axis but not the other', () => {
    test('uses parent for H axis but element for V axis when parent is too tall', () => {
      const scrollableH = makeScrollable({
        top: 0,
        bottom: 600,
        left: 0,
        right: 800
      });
      const scrollableV = makeScrollable({
        top: 0,
        bottom: 300,
        left: 0,
        right: 800
      });
      // parent: 100px wide (fits H: 800px container), but 500px tall (overflows V: 300px container)
      const parent = makeElem({ top: 0, bottom: 500, left: 100, right: 200 });
      const elem = makeElem({ top: 350, bottom: 400, left: 110, right: 190 });

      const { targetHRect, targetVRect } = getBoundingRectangles(
        scrollableH,
        false,
        scrollableV,
        false,
        { elem, parentContainer: parent }
      );

      expect(targetHRect.left).toBe(100); // uses parent on H
      expect(targetHRect.right).toBe(200);
      expect(targetVRect.top).toBe(350); // falls back to elem on V
      expect(targetVRect.bottom).toBe(400);
    });
  });

  // No parentContainer ---------------------------------------------------

  describe('no parentContainer', () => {
    test('always uses targetElemRect when parentContainer is null', () => {
      const scrollableV = makeScrollable({
        top: 0,
        bottom: 600,
        left: 0,
        right: 800
      });
      const elem = makeElem({ top: 200, bottom: 250, left: 10, right: 200 });

      const { targetVRect, targetHRect } = getBoundingRectangles(
        scrollableV,
        false,
        scrollableV,
        false,
        { elem, parentContainer: null }
      );

      expect(targetVRect.top).toBe(200);
      expect(targetHRect.top).toBe(200);
    });
  });
});
