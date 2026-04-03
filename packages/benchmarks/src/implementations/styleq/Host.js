import React from 'react';
import { styleq } from 'styleq';

const q = styleq.factory({ disableCache: false });

function Host(props) {
  const [className, inlineStyle] = q([styles.root, props.style]);
  return <div {...props} className={className} style={inlineStyle} />;
}

const styles = {
  root: {
    $$css: true,
    'css-1m9d2m4': 'css-1m9d2m4'
  }
};

export default Host;
