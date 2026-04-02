import React from 'react';
import AppRegistry from "react-native-web-tv/dist/exports/AppRegistry";
import Text from "react-native-web-tv/dist/exports/Text";
import StyleSheet from "react-native-web-tv/dist/exports/StyleSheet";
import Example from '../../shared/example';
function App() {
  return /*#__PURE__*/React.createElement(Text, {
    style: styles.text
  }, "Should be red and bold");
}
var styles = StyleSheet.create({
  "text": {
    "$$css": true,
    "color": "r-color-howw7u",
    "fontWeight": "r-fontWeight-vw2c0b"
  }
}, {
  __rnwTvStaticPreview: {
    "text": {
      "preprocessed": {
        "color": "red",
        "fontWeight": "bold"
      },
      "compiledStyle": {
        "$$css": true,
        "color": "r-color-howw7u",
        "fontWeight": "r-fontWeight-vw2c0b"
      },
      "compiledOrderedRules": [[[".r-color-howw7u{color:rgba(255,0,0,1.00);}"], 3], [[".r-fontWeight-vw2c0b{font-weight:bold;}"], 3]]
    }
  }
});
AppRegistry.registerComponent('App', function () {
  return App;
});
export default function AppStatePage() {
  var iframeRef = React.useRef(null);
  var shadowRef = React.useRef(null);
  React.useEffect(function () {
    var iframeElement = iframeRef.current;
    var iframeBody = iframeElement.contentWindow.document.body;
    var iframeRootTag = document.createElement('div');
    iframeRootTag.id = 'iframe-root';
    iframeBody.appendChild(iframeRootTag);
    var app1 = AppRegistry.runApplication('App', {
      rootTag: iframeRootTag
    });
    var shadowElement = shadowRef.current;
    var shadowRoot = shadowElement.attachShadow({
      mode: 'open'
    });
    var shadowRootTag = document.createElement('div');
    shadowRootTag.id = 'shadow-root';
    shadowRoot.appendChild(shadowRootTag);
    var app2 = AppRegistry.runApplication('App', {
      rootTag: shadowRootTag
    });
    return function () {
      app1.unmount();
      app2.unmount();
    };
  }, []);
  return /*#__PURE__*/React.createElement(Example, {
    title: "AppRegistry"
  }, /*#__PURE__*/React.createElement(Text, null, "Styles in iframe"), /*#__PURE__*/React.createElement("iframe", {
    ref: iframeRef
  }), /*#__PURE__*/React.createElement(Text, null, "Styles in ShadowRoot"), /*#__PURE__*/React.createElement("div", {
    ref: shadowRef
  }));
}