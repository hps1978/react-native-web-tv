import React from 'react';

const mergeStyles = (style) => {
  if (Array.isArray(style)) {
    return style.reduce((acc, item) => (item ? { ...acc, ...item } : acc), {
      ...baseStyle
    });
  }
  return style ? { ...baseStyle, ...style } : baseStyle;
};

const Host = ({ style, ...other }) => (
  <div {...other} style={mergeStyles(style)} />
);

const baseStyle = {
  boxSizing: 'border-box',
  display: 'block',
  minHeight: 0,
  minWidth: 0
};

export default Host;
