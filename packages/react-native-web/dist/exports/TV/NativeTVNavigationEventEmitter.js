import RCTDeviceEventEmitter from '../../vendor/react-native/EventEmitter/RCTDeviceEventEmitter';
var EVENT_NAME = 'onHWKeyEvent';
var mapToHWEvent = event => {
  var _window;
  var eventType;
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
      // Detect user configured back key for Web TV platforms through window.appConfig.keyMap.Back
      if (typeof window !== 'undefined' && ((_window = window) == null || (_window = _window.appConfig) == null || (_window = _window.keyMap) == null ? void 0 : _window['Back']) === event.keyCode) {
        eventType = 'menu';
      } else {
        eventType = event.key;
      }
  }
  return {
    eventType
  };
};
var NativeTVNavigationEventEmitter = {
  _listenerCount: 0,
  _keydownHandler: null,
  _onFocusHandler: null,
  _onBlurHandler: null,
  addListener(eventType) {
    if (eventType !== EVENT_NAME) {
      return;
    }
    if (this._listenerCount === 0) {
      this._attachKeyboardListener();
    }
    this._listenerCount += 1;
  },
  removeListeners(count) {
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
    this._keydownHandler = e => {
      var hwEvent = mapToHWEvent(e);
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