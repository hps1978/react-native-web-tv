import App from './app/App';
import HostAccessibilityPropChurn from './cases/HostAccessibilityPropChurn';
import HostDomPropChurn from './cases/HostDomPropChurn';
import HostPropChurn from './cases/HostPropChurn';
import HostStyleChurn from './cases/HostStyleChurn';
import impl from './impl';
import PropChurn from './cases/PropChurn';
import Tree from './cases/Tree';
import ViewStyleChurn from './cases/ViewStyleChurn';
import SierpinskiTriangle from './cases/SierpinskiTriangle';

import React from 'react';
import { createRoot } from 'react-dom/client';

const implementations = impl;
const packageNames = Object.keys(implementations);

const createTestBlock = (fn) => {
  return packageNames.reduce((testSetups, packageName) => {
    const { name, components, version } = implementations[packageName];
    const {
      Component,
      getComponentProps,
      sampleCount,
      Provider,
      benchmarkType,
      benchmarkMetadata
    } = fn(components);

    testSetups[packageName] = {
      Component,
      getComponentProps,
      sampleCount,
      Provider,
      benchmarkType,
      benchmarkMetadata,
      version,
      name
    };
    return testSetups;
  }, {});
};

const tests = {
  'Mount deep tree': createTestBlock((components) => ({
    benchmarkType: 'mount',
    benchmarkMetadata: {
      description:
        'Mount a deeply nested static tree using Box -> View wrappers.',
      intent: 'mount-static',
      layer: 'Layer 1',
      nodeCount: 255,
      primitive: 'View',
      changedPropCountPerNode: 0,
      changedStyleCountPerNode: 0
    },
    Component: Tree,
    getComponentProps: () => ({
      breadth: 2,
      components,
      depth: 7,
      id: 0,
      wrap: 1
    }),
    Provider: components.Provider,
    sampleCount: 50
  })),
  'Mount wide tree': createTestBlock((components) => ({
    benchmarkType: 'mount',
    benchmarkMetadata: {
      description: 'Mount a broad static tree using Box -> View wrappers.',
      intent: 'mount-static',
      layer: 'Layer 1',
      nodeCount: 259,
      primitive: 'View',
      changedPropCountPerNode: 0,
      changedStyleCountPerNode: 0
    },
    Component: Tree,
    getComponentProps: () => ({
      breadth: 6,
      components,
      depth: 3,
      id: 0,
      wrap: 2
    }),
    Provider: components.Provider,
    sampleCount: 50
  })),
  'Update dynamic styles': createTestBlock((components) => ({
    benchmarkType: 'update',
    benchmarkMetadata: {
      description:
        'Update many leaf nodes with repeated dynamic style changes using direct host element creation.',
      intent: 'update-style',
      layer: 'Layer 1',
      nodeCount: 729,
      primitive: 'createElement',
      changedPropCountPerNode: 0,
      changedStyleCountPerNode: 5
    },
    Component: SierpinskiTriangle,
    getComponentProps: ({ cycle }) => {
      return { components, s: 200, renderCount: cycle, x: 0, y: 0 };
    },
    Provider: components.Provider,
    sampleCount: 100
  })),
  'Update view props': createTestBlock((components) => ({
    benchmarkType: 'update',
    benchmarkMetadata: {
      description:
        'Update many View nodes with changing DOM-like props and light style changes.',
      intent: 'update-props',
      layer: 'Layer 1',
      nodeCount: 360,
      primitive: 'View',
      changedPropCountPerNode: 6,
      changedStyleCountPerNode: 2
    },
    Component: PropChurn,
    getComponentProps: ({ cycle }) => ({
      components,
      renderCount: cycle
    }),
    Provider: components.Provider,
    sampleCount: 100
  })),
  'Update host props': createTestBlock((components) => ({
    benchmarkType: 'update',
    benchmarkMetadata: {
      description:
        'Update many direct host nodes with changing DOM-like props and light style changes.',
      intent: 'update-props',
      layer: 'Layer 1',
      nodeCount: 360,
      primitive: 'createElement',
      changedPropCountPerNode: 6,
      changedStyleCountPerNode: 2
    },
    Component: HostPropChurn,
    getComponentProps: ({ cycle }) => ({
      components,
      renderCount: cycle
    }),
    Provider: components.Provider,
    sampleCount: 100
  })),
  'Update host DOM props': createTestBlock((components) => ({
    benchmarkType: 'update',
    benchmarkMetadata: {
      description:
        'Update many direct host nodes with DOM-like prop changes only, without style churn.',
      intent: 'update-dom-props',
      layer: 'Layer 1',
      nodeCount: 360,
      primitive: 'createElement',
      changedPropCountPerNode: 5,
      changedStyleCountPerNode: 0
    },
    Component: HostDomPropChurn,
    getComponentProps: ({ cycle }) => ({
      components,
      renderCount: cycle
    }),
    Provider: components.Provider,
    sampleCount: 100
  })),
  'Update host accessibility props': createTestBlock((components) => ({
    benchmarkType: 'update',
    benchmarkMetadata: {
      description:
        'Update many direct host nodes with accessibility-related prop changes only.',
      intent: 'update-accessibility-props',
      layer: 'Layer 1',
      nodeCount: 360,
      primitive: 'createElement',
      changedPropCountPerNode: 4,
      changedStyleCountPerNode: 0
    },
    Component: HostAccessibilityPropChurn,
    getComponentProps: ({ cycle }) => ({
      components,
      renderCount: cycle
    }),
    Provider: components.Provider,
    sampleCount: 100
  })),
  'Update host styles': createTestBlock((components) => ({
    benchmarkType: 'update',
    benchmarkMetadata: {
      description:
        'Update many direct host nodes with style changes only, without prop churn.',
      intent: 'update-style',
      layer: 'Layer 1',
      nodeCount: 360,
      primitive: 'createElement',
      changedPropCountPerNode: 0,
      changedStyleCountPerNode: 5
    },
    Component: HostStyleChurn,
    getComponentProps: ({ cycle }) => ({
      components,
      renderCount: cycle
    }),
    Provider: components.Provider,
    sampleCount: 100
  })),
  'Update view styles': createTestBlock((components) => ({
    benchmarkType: 'update',
    benchmarkMetadata: {
      description:
        'Update many View nodes with style changes only, without prop churn.',
      intent: 'update-style',
      layer: 'Layer 1',
      nodeCount: 360,
      primitive: 'View',
      changedPropCountPerNode: 0,
      changedStyleCountPerNode: 5
    },
    Component: ViewStyleChurn,
    getComponentProps: ({ cycle }) => ({
      components,
      renderCount: cycle
    }),
    Provider: components.Provider,
    sampleCount: 100
  }))
};

const root = document.querySelector('.root');
const element = <App tests={tests} />;

createRoot(root).render(element);
