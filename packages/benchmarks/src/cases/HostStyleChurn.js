import { BenchmarkType } from '../app/Benchmark';
import React from 'react';

const NODE_COUNT = 360;
const TONE_COUNT = 6;

class HostStyleChurn extends React.Component {
  static displayName = 'HostStyleChurn';

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
          const tone = (index + phase) % TONE_COUNT;

          return (
            <Host
              key={index}
              style={[
                styles.item,
                styles[`tone${tone}`],
                active && styles.active,
                emphasized && styles.emphasized,
                {
                  opacity: active ? 1 : 0.82,
                  zIndex: emphasized ? 1 : 0
                }
              ]}
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
    borderStyle: 'solid'
  },
  active: {
    borderColor: '#ffffff'
  },
  emphasized: {
    transform: [{ scale: 1.03 }]
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
