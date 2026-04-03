import classnames from 'classnames';
import React from 'react';
import styles from './view-styles.css';

const flattenStyle = (style) => {
  if (Array.isArray(style)) {
    return style.reduce((acc, item) => (item ? { ...acc, ...item } : acc), {});
  }
  return style;
};

const Host = ({ className, style, ...other }) => (
  <div
    {...other}
    className={classnames(styles.initial, className)}
    style={flattenStyle(style)}
  />
);

export default Host;
