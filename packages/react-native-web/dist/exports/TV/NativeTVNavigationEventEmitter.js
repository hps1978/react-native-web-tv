import RCTDeviceEventEmitter from '../../vendor/react-native/EventEmitter/RCTDeviceEventEmitter';
var EVENT_NAME = 'onHWKeyEvent';
var mapToHWEvent = event => {
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
      eventType = event.key;
  }
  return {
    eventType
  };
};
var NativeTVNavigationEventEmitter = {
  _listenerCount: 0,
  _keydownHandler: null,
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
  },
  _detachKeyboardListener() {
    if (!this._keydownHandler) {
      return;
    }
    window.removeEventListener('keydown', this._keydownHandler);
    this._keydownHandler = null;
  }
};
export default NativeTVNavigationEventEmitter;