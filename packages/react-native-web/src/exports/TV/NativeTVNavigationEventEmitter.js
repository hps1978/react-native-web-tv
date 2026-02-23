/**
 * @flow
 */

import RCTDeviceEventEmitter from '../../vendor/react-native/EventEmitter/RCTDeviceEventEmitter';

type HWEvent = {
  eventType:
    | 'up'
    | 'down'
    | 'right'
    | 'left'
    | 'longUp'
    | 'longDown'
    | 'longRight'
    | 'longLeft'
    | 'blur'
    | 'focus'
    | 'pan'
    | string,
  eventKeyAction?: -1 | 1 | 0 | number,
  tag?: number,
  body?: {
    state: 'Began' | 'Changed' | 'Ended',
    x: number,
    y: number,
    velocityX: number,
    velocityY: number
  }
};

const EVENT_NAME = 'onHWKeyEvent';

const mapToHWEvent = (event: KeyboardEvent): HWEvent => {
  let eventType: HWEvent['eventType'];
  switch (event.key) {
    case 'ArrowUp':
      eventType = 'up';
      break;
    case 'ArrowDown':
      eventType = 'down';
      break;
    case 'ArrowLeft':
      eventType = 'left';
      break;
    case 'ArrowRight':
      eventType = 'right';
      break;
    case 'Enter':
      eventType = 'select';
      break;
    case 'Backspace':
    case 'Escape':
      eventType = 'menu';
      break;
    default:
      eventType = event.key;
  }
  return { eventType };
};

const NativeTVNavigationEventEmitter = {
  _listenerCount: 0,
  _keydownHandler: (null: null | ((e: KeyboardEvent) => void)),
  _onFocusHandler: (null: null | ((e: FocusEvent) => void)),
  _onBlurHandler: (null: null | ((e: FocusEvent) => void)),

  addListener(eventType: string) {
    if (eventType !== EVENT_NAME) {
      return;
    }
    if (this._listenerCount === 0) {
      this._attachKeyboardListener();
    }
    this._listenerCount += 1;
  },

  removeListeners(count: number) {
    if (this._listenerCount === 0) {
      return;
    }
    this._listenerCount = Math.max(0, this._listenerCount - count);
    if (this._listenerCount === 0) {
      this._detachKeyboardListener();
    }
  },

  _attachKeyboardListener() {
    if (typeof window === 'undefined') {
      return;
    }

    if (this._keydownHandler) {
      return;
    }
    this._keydownHandler = (e: KeyboardEvent) => {
      const hwEvent = mapToHWEvent(e);
      RCTDeviceEventEmitter.emit(EVENT_NAME, hwEvent);
    };
    window.addEventListener('keydown', this._keydownHandler);
    if (typeof document !== 'undefined') {
      // Use capture phase to catch per-element focus/blur once at the top.
      this._onFocusHandler = () => {
        RCTDeviceEventEmitter.emit(EVENT_NAME, {
          eventType: 'focus'
        });
      };
      this._onBlurHandler = () => {
        RCTDeviceEventEmitter.emit(EVENT_NAME, {
          eventType: 'blur'
        });
      };
      document.addEventListener('focus', this._onFocusHandler, true);
      document.addEventListener('blur', this._onBlurHandler, true);
    }
  },

  _detachKeyboardListener() {
    if (!this._keydownHandler) {
      return;
    }
    window.removeEventListener('keydown', this._keydownHandler);
    this._keydownHandler = null;
    if (this._onBlurHandler && typeof document !== 'undefined') {
      document.removeEventListener('blur', this._onBlurHandler, true);
    }
    if (this._onFocusHandler && typeof document !== 'undefined') {
      document.removeEventListener('focus', this._onFocusHandler, true);
    }
    this._onBlurHandler = null;
    this._onFocusHandler = null;
  }
};

export default NativeTVNavigationEventEmitter;
