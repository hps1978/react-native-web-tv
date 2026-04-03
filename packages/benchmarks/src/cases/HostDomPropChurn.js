import { BenchmarkType } from '../app/Benchmark';
import React from 'react';

const NODE_COUNT = 360;

class HostDomPropChurn extends React.Component {
  static displayName = 'HostDomPropChurn';

  static benchmarkType = BenchmarkType.UPDATE;

  render() {
    const { components, renderCount = 0 } = this.props;
    const { Host } = components;
    const phase = renderCount % 4;

    return (
      <div style={styles.container}>
        {Array.from({ length: NODE_COUNT }).map((_, index) => {
          const active = (index + phase) % 2 === 0;
          const emphasized = (index + renderCount) % 3 === 0;

          return (
            <Host
              data-benchmark-phase={String(phase)}
              data-benchmark-state={active ? 'active' : 'idle'}
              dir={phase < 2 ? 'ltr' : 'rtl'}
              key={index}
              role="button"
              style={styles.item}
              tabIndex={active ? 0 : -1}
              title={
                emphasized
                  ? `dom-emphasis-${renderCount}-${index}`
                  : `dom-item-${index}`
              }
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
    borderColor: '#4c789d',
    backgroundColor: '#355c7d'
  }
};

export default HostDomPropChurn;
