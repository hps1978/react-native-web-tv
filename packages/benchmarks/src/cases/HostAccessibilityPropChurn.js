import { BenchmarkType } from '../app/Benchmark';
import React from 'react';

const NODE_COUNT = 360;

class HostAccessibilityPropChurn extends React.Component {
  static displayName = 'HostAccessibilityPropChurn';

  static benchmarkType = BenchmarkType.UPDATE;

  render() {
    const { components, renderCount = 0 } = this.props;
    const { Host } = components;
    const phase = renderCount % 4;

    return (
      <div style={styles.container}>
        {Array.from({ length: NODE_COUNT }).map((_, index) => {
          const active = (index + phase) % 2 === 0;
          const current = (index + renderCount) % 5 === 0;

          return (
            <Host
              aria-current={current ? 'true' : 'false'}
              aria-label={`accessibility-item-${index}-phase-${phase}`}
              aria-pressed={active ? 'true' : 'false'}
              aria-selected={active ? 'true' : 'false'}
              key={index}
              role="button"
              style={styles.item}
            />
          );
        })}
      </div>
    );
  }
}

const styles = {
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
    borderStyle: 'solid',
    borderColor: '#8a759a',
    backgroundColor: '#6c5b7b'
  }
};

export default HostAccessibilityPropChurn;
