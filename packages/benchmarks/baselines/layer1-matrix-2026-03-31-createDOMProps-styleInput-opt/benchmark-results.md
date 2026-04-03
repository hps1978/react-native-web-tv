# Benchmark Results

Generated: 2026-03-31T19:42:50.458Z
Browser: chromium (headless)
Library: react-native-web
Repeats: 1

## Aggregate Summary

| Benchmark | Runs | Mean Avg (ms) | Mean Median (ms) | Mean Min (ms) | Mean Max (ms) | Scripting Avg (ms) | JS Share | Layout Avg (ms) | Layout Share | StdDev Avg (ms) | Mean per 100 nodes (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Update host styles | 1 | 8.52 | 8.52 | 8.52 | 8.52 | 7.94 | 93.19% | 0.58 | 6.81% | 0.85 | 2.37 |
| Update host DOM props | 1 | 7.60 | 7.60 | 7.60 | 7.60 | 7.09 | 93.27% | 0.51 | 6.73% | 0.60 | 2.11 |
| Update host accessibility props | 1 | 6.58 | 6.58 | 6.58 | 6.58 | 6.57 | 99.82% | 0.01 | 0.18% | 0.45 | 1.83 |
| Update host props | 1 | 11.10 | 11.10 | 11.10 | 11.10 | 9.08 | 81.83% | 2.02 | 18.17% | 1.09 | 3.08 |
| Update view styles | 1 | 8.99 | 8.99 | 8.99 | 8.99 | 8.30 | 92.35% | 0.69 | 7.65% | 0.53 | 2.50 |
| Update view props | 1 | 18.50 | 18.50 | 18.50 | 18.50 | 15.96 | 86.28% | 2.54 | 13.72% | 1.54 | 5.14 |

## Attribution Matrix

Baseline: Update host styles

| Benchmark | Mean (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Mean per 100 nodes (ms) | Relative to host styles |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Update host styles | 8.52 | 7.94 | 93.19% | 0.58 | 6.81% | 2.37 | 1.00x |
| Update host DOM props | 7.60 | 7.09 | 93.27% | 0.51 | 6.73% | 2.11 | 0.89x |
| Update host accessibility props | 6.58 | 6.57 | 99.82% | 0.01 | 0.18% | 1.83 | 0.77x |
| Update host props | 11.10 | 9.08 | 81.83% | 2.02 | 18.17% | 3.08 | 1.30x |
| Update view styles | 8.99 | 8.30 | 92.35% | 0.69 | 7.65% | 2.50 | 1.06x |
| Update view props | 18.50 | 15.96 | 86.28% | 2.54 | 13.72% | 5.14 | 2.17x |


## Per Run

### Update host styles

Update many direct host nodes with style changes only, without prop churn.

Metadata: layer Layer 1 | intent update-style | primitive createElement | nodes 360 | props/node 0 | styles/node 5

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 793.60 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| createElement.total | 579.80 | 73.06% | 0.02 | 36006 | 0.60 |
| createElement.createDOMProps | 523.80 | 66.00% | 0.01 | 36006 | 0.60 |
| createDOMProps.total | 500.20 | 63.03% | 0.01 | 36006 | 0.60 |
| createDOMProps.styleProps | 344.80 | 43.45% | 0.01 | 36006 | 0.60 |
| createDOMProps.StyleSheet | 325.70 | 41.04% | 0.01 | 36006 | 0.60 |
| StyleSheet.resolve | 307.60 | 38.76% | 0.01 | 36006 | 0.60 |
| StyleSheet.customStyleq | 168.30 | 21.21% | 0.00 | 36006 | 0.60 |
| StyleSheet.inline | 112.10 | 14.13% | 0.00 | 36000 | 0.60 |
| View.render | 0.20 | 0.03% | 0.03 | 6 | 0.10 |
| View.pickProps | 0.00 | 0.00% | 0.00 | 6 | 0.00 |
| createElement.React.createElement | 10.50 | 1.32% | 0.00 | 36006 | 0.10 |
| createDOMProps.accessibilityProps | 10.80 | 1.36% | 0.00 | 36006 | 0.10 |
| createDOMProps.dataSetProps | 10.50 | 1.32% | 0.00 | 36006 | 0.10 |
| createDOMProps.focusProps | 11.00 | 1.39% | 0.00 | 36006 | 0.10 |
| createDOMProps.propsToAriaRole | 7.80 | 0.98% | 0.00 | 36006 | 0.10 |
| createDOMProps.tvProps | 9.70 | 1.22% | 0.00 | 36006 | 0.60 |
| createDOMProps.otherProps | 8.40 | 1.06% | 0.00 | 36006 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 30.10 | 3.79% | 0.00 | 36015 | 0.10 |
| StyleSheet.customStyleq.preprocess | 59.10 | 7.45% | 0.00 | 138000 | 0.40 |
| StyleSheet.localizeStyle | 9.60 | 1.21% | 0.00 | 36015 | 0.10 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 8.52 | 0.85 | 7.94 | 93.19% | 0.58 | 6.81% | 100 |

### Update host DOM props

Update many direct host nodes with DOM-like prop changes only, without style churn.

Metadata: layer Layer 1 | intent update-dom-props | primitive createElement | nodes 360 | props/node 5 | styles/node 0

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 708.60 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| createElement.total | 515.00 | 72.68% | 0.01 | 36000 | 0.90 |
| createElement.createDOMProps | 437.60 | 61.76% | 0.01 | 36000 | 0.90 |
| createDOMProps.total | 418.10 | 59.00% | 0.01 | 36000 | 0.90 |
| createDOMProps.styleProps | 241.20 | 34.04% | 0.01 | 36000 | 0.90 |
| createDOMProps.StyleSheet | 220.60 | 31.13% | 0.01 | 36000 | 0.90 |
| StyleSheet.resolve | 202.80 | 28.62% | 0.01 | 36000 | 0.90 |
| StyleSheet.customStyleq | 87.40 | 12.33% | 0.00 | 36000 | 0.70 |
| StyleSheet.inline | 84.00 | 11.85% | 0.00 | 36000 | 0.90 |
| createElement.React.createElement | 12.30 | 1.74% | 0.00 | 36000 | 0.10 |
| createElement.localeProvider | 10.80 | 1.52% | 0.00 | 36000 | 0.10 |
| createDOMProps.accessibilityProps | 12.10 | 1.71% | 0.00 | 36000 | 0.10 |
| createDOMProps.dataSetProps | 9.90 | 1.40% | 0.00 | 36000 | 0.10 |
| createDOMProps.focusProps | 9.10 | 1.28% | 0.00 | 36000 | 0.10 |
| createDOMProps.propsToAriaRole | 9.20 | 1.30% | 0.00 | 36000 | 0.10 |
| createDOMProps.tvProps | 10.70 | 1.51% | 0.00 | 36000 | 0.10 |
| createDOMProps.otherProps | 7.80 | 1.10% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 29.00 | 4.09% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.preprocess | 18.70 | 2.64% | 0.00 | 36000 | 0.70 |
| StyleSheet.localizeStyle | 9.40 | 1.33% | 0.00 | 36000 | 0.10 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 7.60 | 0.60 | 7.09 | 93.27% | 0.51 | 6.73% | 100 |

### Update host accessibility props

Update many direct host nodes with accessibility-related prop changes only.

Metadata: layer Layer 1 | intent update-accessibility-props | primitive createElement | nodes 360 | props/node 4 | styles/node 0

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 657.30 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| createElement.total | 479.10 | 72.89% | 0.01 | 36000 | 0.70 |
| createElement.createDOMProps | 418.30 | 63.64% | 0.01 | 36000 | 0.70 |
| createDOMProps.total | 398.90 | 60.69% | 0.01 | 36000 | 0.70 |
| createDOMProps.styleProps | 235.10 | 35.77% | 0.01 | 36000 | 0.60 |
| createDOMProps.StyleSheet | 214.10 | 32.57% | 0.01 | 36000 | 0.60 |
| StyleSheet.resolve | 197.30 | 30.02% | 0.01 | 36000 | 0.60 |
| StyleSheet.inline | 87.80 | 13.36% | 0.00 | 36000 | 0.60 |
| StyleSheet.customStyleq | 80.80 | 12.29% | 0.00 | 36000 | 0.10 |
| createElement.React.createElement | 13.00 | 1.98% | 0.00 | 36000 | 0.10 |
| createDOMProps.accessibilityProps | 9.60 | 1.46% | 0.00 | 36000 | 0.10 |
| createDOMProps.dataSetProps | 9.50 | 1.45% | 0.00 | 36000 | 0.10 |
| createDOMProps.focusProps | 9.40 | 1.43% | 0.00 | 36000 | 0.10 |
| createDOMProps.propsToAriaRole | 10.50 | 1.60% | 0.00 | 36000 | 0.10 |
| createDOMProps.tvProps | 10.50 | 1.60% | 0.00 | 36000 | 0.10 |
| createDOMProps.otherProps | 8.80 | 1.34% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 25.60 | 3.89% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.preprocess | 18.60 | 2.83% | 0.00 | 36000 | 0.10 |
| StyleSheet.localizeStyle | 9.70 | 1.48% | 0.00 | 36000 | 0.10 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 6.58 | 0.45 | 6.57 | 99.82% | 0.01 | 0.18% | 100 |

### Update host props

Update many direct host nodes with changing DOM-like props and light style changes.

Metadata: layer Layer 1 | intent update-props | primitive createElement | nodes 360 | props/node 6 | styles/node 2

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 908.50 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| createElement.total | 614.10 | 67.59% | 0.02 | 36000 | 1.80 |
| createElement.createDOMProps | 533.30 | 58.70% | 0.01 | 36000 | 1.80 |
| createDOMProps.total | 512.70 | 56.43% | 0.01 | 36000 | 1.70 |
| createDOMProps.styleProps | 333.20 | 36.68% | 0.01 | 36000 | 1.70 |
| createDOMProps.StyleSheet | 313.00 | 34.45% | 0.01 | 36000 | 1.70 |
| StyleSheet.resolve | 294.60 | 32.43% | 0.01 | 36000 | 1.70 |
| StyleSheet.customStyleq | 158.60 | 17.46% | 0.00 | 36000 | 0.70 |
| StyleSheet.inline | 108.20 | 11.91% | 0.00 | 36000 | 1.70 |
| createElement.React.createElement | 14.70 | 1.62% | 0.00 | 36000 | 0.10 |
| createElement.localeProvider | 9.40 | 1.03% | 0.00 | 36000 | 0.10 |
| createDOMProps.accessibilityProps | 12.10 | 1.33% | 0.00 | 36000 | 0.10 |
| createDOMProps.dataSetProps | 10.30 | 1.13% | 0.00 | 36000 | 0.10 |
| createDOMProps.focusProps | 8.70 | 0.96% | 0.00 | 36000 | 0.10 |
| createDOMProps.propsToAriaRole | 9.20 | 1.01% | 0.00 | 36000 | 0.10 |
| createDOMProps.tvProps | 7.60 | 0.84% | 0.00 | 36000 | 0.10 |
| createDOMProps.otherProps | 10.70 | 1.18% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 27.60 | 3.04% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.preprocess | 55.00 | 6.05% | 0.00 | 138000 | 0.10 |
| StyleSheet.localizeStyle | 8.60 | 0.95% | 0.00 | 36000 | 0.10 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 11.10 | 1.09 | 9.08 | 81.83% | 2.02 | 18.17% | 100 |

### Update view styles

Update many View nodes with style changes only, without prop churn.

Metadata: layer Layer 1 | intent update-style | primitive View | nodes 360 | props/node 0 | styles/node 5

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 829.90 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| View.render | 643.80 | 77.58% | 0.02 | 36100 | 1.90 |
| createElement.total | 573.00 | 69.04% | 0.02 | 36100 | 1.90 |
| createElement.createDOMProps | 515.90 | 62.16% | 0.01 | 36100 | 1.90 |
| createDOMProps.total | 495.70 | 59.73% | 0.01 | 36100 | 1.90 |
| createDOMProps.styleProps | 331.50 | 39.94% | 0.01 | 36100 | 1.90 |
| createDOMProps.StyleSheet | 306.10 | 36.88% | 0.01 | 36100 | 0.80 |
| StyleSheet.resolve | 286.00 | 34.46% | 0.01 | 36100 | 0.80 |
| StyleSheet.customStyleq | 155.50 | 18.74% | 0.00 | 36100 | 0.10 |
| View.pickProps | 11.80 | 1.42% | 0.00 | 36100 | 0.10 |
| createElement.React.createElement | 10.50 | 1.27% | 0.00 | 36100 | 0.10 |
| createDOMProps.accessibilityProps | 10.40 | 1.25% | 0.00 | 36100 | 0.10 |
| createDOMProps.dataSetProps | 7.40 | 0.89% | 0.00 | 36100 | 0.10 |
| createDOMProps.focusProps | 9.00 | 1.08% | 0.00 | 36100 | 0.10 |
| createDOMProps.propsToAriaRole | 10.10 | 1.22% | 0.00 | 36100 | 0.10 |
| createDOMProps.tvProps | 8.50 | 1.02% | 0.00 | 36100 | 0.10 |
| createDOMProps.otherProps | 9.20 | 1.11% | 0.00 | 36100 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 27.40 | 3.30% | 0.00 | 36100 | 0.10 |
| StyleSheet.customStyleq.preprocess | 59.10 | 7.12% | 0.00 | 138100 | 0.10 |
| StyleSheet.localizeStyle | 10.60 | 1.28% | 0.00 | 36100 | 0.10 |
| StyleSheet.inline | 99.80 | 12.03% | 0.00 | 36100 | 0.80 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 8.99 | 0.53 | 8.30 | 92.35% | 0.69 | 7.65% | 100 |

### Update view props

Update many View nodes with changing DOM-like props and light style changes.

Metadata: layer Layer 1 | intent update-props | primitive View | nodes 360 | props/node 6 | styles/node 2

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 1595.90 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| View.render | 1270.50 | 79.61% | 0.02 | 72100 | 3.10 |
| createElement.total | 1091.50 | 68.39% | 0.02 | 72100 | 3.10 |
| createElement.createDOMProps | 954.30 | 59.80% | 0.01 | 72100 | 3.10 |
| createDOMProps.total | 916.70 | 57.44% | 0.01 | 72100 | 3.10 |
| createDOMProps.styleProps | 562.30 | 35.23% | 0.01 | 72100 | 2.40 |
| createDOMProps.StyleSheet | 512.60 | 32.12% | 0.01 | 72100 | 2.40 |
| StyleSheet.resolve | 471.70 | 29.56% | 0.01 | 72100 | 2.40 |
| StyleSheet.customStyleq | 248.60 | 15.58% | 0.00 | 72100 | 2.40 |
| View.pickProps | 25.60 | 1.60% | 0.00 | 72100 | 0.10 |
| createElement.React.createElement | 23.80 | 1.49% | 0.00 | 72100 | 0.10 |
| createElement.localeProvider | 9.90 | 0.62% | 0.00 | 36000 | 0.10 |
| createDOMProps.accessibilityProps | 21.10 | 1.32% | 0.00 | 72100 | 0.10 |
| createDOMProps.dataSetProps | 19.20 | 1.20% | 0.00 | 72100 | 0.10 |
| createDOMProps.focusProps | 19.00 | 1.19% | 0.00 | 72100 | 0.10 |
| createDOMProps.propsToAriaRole | 20.60 | 1.29% | 0.00 | 72100 | 0.10 |
| createDOMProps.tvProps | 17.90 | 1.12% | 0.00 | 72100 | 0.80 |
| createDOMProps.otherProps | 20.40 | 1.28% | 0.00 | 72100 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 58.50 | 3.67% | 0.00 | 72100 | 0.10 |
| StyleSheet.customStyleq.preprocess | 74.00 | 4.64% | 0.00 | 174100 | 2.40 |
| StyleSheet.localizeStyle | 21.10 | 1.32% | 0.00 | 72100 | 0.10 |
| StyleSheet.inline | 168.70 | 10.57% | 0.00 | 72100 | 1.20 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 18.50 | 1.54 | 15.96 | 86.28% | 2.54 | 13.72% | 100 |

