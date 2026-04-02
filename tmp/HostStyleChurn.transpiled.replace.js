function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
import { BenchmarkType } from '../app/Benchmark';
import React from 'react';
var NODE_COUNT = 360;
var TONE_COUNT = 6;
var HostStyleChurn = /*#__PURE__*/function (_React$Component) {
  function HostStyleChurn() {
    _classCallCheck(this, HostStyleChurn);
    return _callSuper(this, HostStyleChurn, arguments);
  }
  _inherits(HostStyleChurn, _React$Component);
  return _createClass(HostStyleChurn, [{
    key: "render",
    value: function render() {
      var _this$props = this.props,
        components = _this$props.components,
        _this$props$renderCou = _this$props.renderCount,
        renderCount = _this$props$renderCou === void 0 ? 0 : _this$props$renderCou;
      var Host = components.Host;
      var phase = renderCount % 4;
      return /*#__PURE__*/React.createElement("div", {
        style: styles.container
      }, Array.from({
        length: NODE_COUNT
      }).map(function (_, index) {
        var active = (index + phase) % 2 === 0;
        var emphasized = (index + renderCount) % 3 === 0;
        var tone = (index + phase) % TONE_COUNT;
        return /*#__PURE__*/React.createElement(Host, {
          key: index,
          style: [{
            __rnwTvStaticPreview: {
              "preprocessed": {
                "width": 72,
                "height": 32,
                "margin": 4,
                "borderRadius": 4,
                "borderWidth": 1,
                "borderStyle": "solid"
              },
              "compiledStyle": {
                "$$css": true,
                "borderRadius": "r-borderRadius-z2wwpe",
                "borderStyle": "r-borderStyle-1phboty",
                "borderWidth": "r-borderWidth-rs99b7",
                "height": "r-height-mabqd8",
                "margin": "r-margin-1064s9p",
                "width": "r-width-1blnp2b"
              },
              "compiledOrderedRules": [[[".r-borderRadius-z2wwpe{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-top-left-radius:4px;border-top-right-radius:4px;}"], 2], [[".r-borderStyle-1phboty{border-bottom-style:solid;border-left-style:solid;border-right-style:solid;border-top-style:solid;}"], 2], [[".r-borderWidth-rs99b7{border-bottom-width:1px;border-left-width:1px;border-right-width:1px;border-top-width:1px;}"], 2], [[".r-height-mabqd8{height:32px;}"], 3], [[".r-margin-1064s9p{margin:4px;}"], 2], [[".r-width-1blnp2b{width:72px;}"], 3]],
              "__rnwTvStaticPreviewId": "rnwtv_1qjgyw6"
            }
          }, styles["tone".concat(tone)], active && {
            __rnwTvStaticPreview: {
              "preprocessed": {
                "borderColor": "#ffffff"
              },
              "compiledStyle": {
                "$$css": true,
                "borderColor": "r-borderColor-11mg6pl"
              },
              "compiledOrderedRules": [[[".r-borderColor-11mg6pl{border-bottom-color:rgba(255,255,255,1.00);border-left-color:rgba(255,255,255,1.00);border-right-color:rgba(255,255,255,1.00);border-top-color:rgba(255,255,255,1.00);}"], 2]],
              "__rnwTvStaticPreviewId": "rnwtv_dw5hv1"
            }
          }, emphasized && {
            __rnwTvStaticPreview: {
              "preprocessed": {
                "transform": "scale(1.03)"
              },
              "compiledStyle": {
                "$$css": true,
                "transform": "r-transform-1xijq6x"
              },
              "compiledOrderedRules": [[[".r-transform-1xijq6x{transform:scale(1.03);}"], 3]],
              "__rnwTvStaticPreviewId": "rnwtv_1uau55u"
            }
          }, {
            opacity: active ? 1 : 0.82,
            zIndex: emphasized ? 1 : 0
          }]
        });
      }));
    }
  }]);
}(React.Component);
_defineProperty(HostStyleChurn, "displayName", 'HostStyleChurn');
_defineProperty(HostStyleChurn, "benchmarkType", BenchmarkType.UPDATE);
var styles = {
  container: {
    width: 960,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start'
  },
  item: {
    width: 72,
    height: 32,
    margin: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'solid'
  },
  active: {
    borderColor: '#ffffff'
  },
  emphasized: {
    transform: [{
      scale: 1.03
    }]
  },
  tone0: {
    backgroundColor: '#253746',
    borderColor: '#425b70'
  },
  tone1: {
    backgroundColor: '#1f6f8b',
    borderColor: '#2c8cab'
  },
  tone2: {
    backgroundColor: '#355c7d',
    borderColor: '#4c789d'
  },
  tone3: {
    backgroundColor: '#6c5b7b',
    borderColor: '#8a759a'
  },
  tone4: {
    backgroundColor: '#c06c84',
    borderColor: '#d98aa0'
  },
  tone5: {
    backgroundColor: '#f67280',
    borderColor: '#ff94a0'
  }
};
export default HostStyleChurn;