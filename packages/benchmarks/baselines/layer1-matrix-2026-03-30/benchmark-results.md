# Benchmark Results

Generated: 2026-03-30T21:09:51.286Z
Browser: chromium (headless)
Library: react-native-web
Repeats: 1

## Aggregate Summary

| Benchmark | Runs | Mean Avg (ms) | Mean Median (ms) | Mean Min (ms) | Mean Max (ms) | Scripting Avg (ms) | JS Share | Layout Avg (ms) | Layout Share | StdDev Avg (ms) | Mean per 100 nodes (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Update host styles | 1 | 8.85 | 8.85 | 8.85 | 8.85 | 8.27 | 93.45% | 0.58 | 6.53% | 0.67 | 2.46 |
| Update host DOM props | 1 | 7.94 | 7.94 | 7.94 | 7.94 | 7.42 | 93.48% | 0.52 | 6.52% | 0.69 | 2.21 |
| Update host accessibility props | 1 | 6.61 | 6.61 | 6.61 | 6.61 | 6.59 | 99.80% | 0.01 | 0.18% | 0.43 | 1.84 |
| Update host props | 1 | 11.38 | 11.38 | 11.38 | 11.38 | 9.38 | 82.43% | 2.00 | 17.56% | 1.01 | 3.16 |
| Update view styles | 1 | 9.54 | 9.54 | 9.54 | 9.54 | 8.83 | 92.57% | 0.71 | 7.42% | 0.54 | 2.65 |
| Update view props | 1 | 19.04 | 19.04 | 19.04 | 19.04 | 16.49 | 86.60% | 2.55 | 13.40% | 1.49 | 5.29 |

## Attribution Matrix

Baseline: Update host styles

| Benchmark | Mean (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Mean per 100 nodes (ms) | Relative to host styles |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Update host styles | 8.85 | 8.27 | 93.45% | 0.58 | 6.53% | 2.46 | 1.00x |
| Update host DOM props | 7.94 | 7.42 | 93.48% | 0.52 | 6.52% | 2.21 | 0.90x |
| Update host accessibility props | 6.61 | 6.59 | 99.80% | 0.01 | 0.18% | 1.84 | 0.75x |
| Update host props | 11.38 | 9.38 | 82.43% | 2.00 | 17.56% | 3.16 | 1.29x |
| Update view styles | 9.54 | 8.83 | 92.57% | 0.71 | 7.42% | 2.65 | 1.08x |
| Update view props | 19.04 | 16.49 | 86.60% | 2.55 | 13.40% | 5.29 | 2.15x |


## Per Run

### Update host styles

Update many direct host nodes with style changes only, without prop churn.

Metadata: layer Layer 1 | intent update-style | primitive createElement | nodes 360 | props/node 0 | styles/node 5

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 827.00 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| createElement.total | 612.10 | 74.01% | 0.02 | 36006 | 2.70 |
| createElement.createDOMProps | 548.20 | 66.29% | 0.02 | 36006 | 2.70 |
| createDOMProps.total | 528.70 | 63.93% | 0.01 | 36006 | 2.70 |
| createDOMProps.styleProps | 369.60 | 44.69% | 0.01 | 36006 | 2.70 |
| createDOMProps.StyleSheet | 350.70 | 42.41% | 0.01 | 36006 | 2.70 |
| StyleSheet.resolve | 330.10 | 39.92% | 0.01 | 36006 | 2.70 |
| StyleSheet.customStyleq | 192.30 | 23.25% | 0.01 | 36006 | 0.50 |
| StyleSheet.inline | 107.50 | 13.00% | 0.00 | 36000 | 2.70 |
| View.render | 0.20 | 0.02% | 0.03 | 6 | 0.10 |
| View.pickProps | 0.00 | 0.00% | 0.00 | 6 | 0.00 |
| createElement.React.createElement | 10.30 | 1.25% | 0.00 | 36006 | 0.10 |
| createDOMProps.accessibilityProps | 9.80 | 1.19% | 0.00 | 36006 | 0.10 |
| createDOMProps.dataSetProps | 10.70 | 1.29% | 0.00 | 36006 | 0.10 |
| createDOMProps.focusProps | 8.50 | 1.03% | 0.00 | 36006 | 0.10 |
| createDOMProps.propsToAriaRole | 9.30 | 1.12% | 0.00 | 36006 | 0.10 |
| createDOMProps.tvProps | 10.90 | 1.32% | 0.00 | 36006 | 0.10 |
| createDOMProps.otherProps | 7.80 | 0.94% | 0.00 | 36006 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 30.40 | 3.68% | 0.00 | 36015 | 0.40 |
| StyleSheet.customStyleq.preprocess | 82.70 | 10.00% | 0.00 | 138000 | 0.50 |
| StyleSheet.localizeStyle | 12.00 | 1.45% | 0.00 | 36015 | 0.40 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 8.85 | 0.67 | 8.27 | 93.45% | 0.58 | 6.53% | 100 |

### Update host DOM props

Update many direct host nodes with DOM-like prop changes only, without style churn.

Metadata: layer Layer 1 | intent update-dom-props | primitive createElement | nodes 360 | props/node 5 | styles/node 0

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 742.10 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| createElement.total | 531.00 | 71.55% | 0.01 | 36000 | 0.80 |
| createElement.createDOMProps | 449.30 | 60.54% | 0.01 | 36000 | 0.70 |
| createDOMProps.total | 429.10 | 57.82% | 0.01 | 36000 | 0.70 |
| createDOMProps.styleProps | 249.90 | 33.67% | 0.01 | 36000 | 0.70 |
| createDOMProps.StyleSheet | 230.00 | 30.99% | 0.01 | 36000 | 0.70 |
| StyleSheet.resolve | 208.20 | 28.06% | 0.01 | 36000 | 0.70 |
| StyleSheet.customStyleq | 94.70 | 12.76% | 0.00 | 36000 | 0.50 |
| StyleSheet.inline | 85.70 | 11.55% | 0.00 | 36000 | 0.70 |
| createElement.React.createElement | 13.80 | 1.86% | 0.00 | 36000 | 0.80 |
| createElement.localeProvider | 9.20 | 1.24% | 0.00 | 36000 | 0.10 |
| createDOMProps.accessibilityProps | 10.80 | 1.46% | 0.00 | 36000 | 0.10 |
| createDOMProps.dataSetProps | 8.40 | 1.13% | 0.00 | 36000 | 0.10 |
| createDOMProps.focusProps | 10.80 | 1.46% | 0.00 | 36000 | 0.10 |
| createDOMProps.propsToAriaRole | 10.90 | 1.47% | 0.00 | 36000 | 0.10 |
| createDOMProps.tvProps | 9.00 | 1.21% | 0.00 | 36000 | 0.10 |
| createDOMProps.otherProps | 10.10 | 1.36% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 27.20 | 3.67% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.preprocess | 27.20 | 3.67% | 0.00 | 36000 | 0.50 |
| StyleSheet.localizeStyle | 10.10 | 1.36% | 0.00 | 36000 | 0.10 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 7.94 | 0.69 | 7.42 | 93.48% | 0.52 | 6.52% | 100 |

### Update host accessibility props

Update many direct host nodes with accessibility-related prop changes only.

Metadata: layer Layer 1 | intent update-accessibility-props | primitive createElement | nodes 360 | props/node 4 | styles/node 0

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 659.40 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| createElement.total | 484.30 | 73.45% | 0.01 | 36000 | 0.80 |
| createElement.createDOMProps | 425.90 | 64.59% | 0.01 | 36000 | 0.80 |
| createDOMProps.total | 407.20 | 61.75% | 0.01 | 36000 | 0.80 |
| createDOMProps.styleProps | 245.10 | 37.17% | 0.01 | 36000 | 0.80 |
| createDOMProps.StyleSheet | 225.30 | 34.17% | 0.01 | 36000 | 0.80 |
| StyleSheet.resolve | 204.10 | 30.95% | 0.01 | 36000 | 0.80 |
| StyleSheet.customStyleq | 95.90 | 14.54% | 0.00 | 36000 | 0.10 |
| StyleSheet.inline | 81.20 | 12.31% | 0.00 | 36000 | 0.80 |
| createElement.React.createElement | 12.20 | 1.85% | 0.00 | 36000 | 0.10 |
| createDOMProps.accessibilityProps | 10.40 | 1.58% | 0.00 | 36000 | 0.10 |
| createDOMProps.dataSetProps | 8.90 | 1.35% | 0.00 | 36000 | 0.10 |
| createDOMProps.focusProps | 8.80 | 1.33% | 0.00 | 36000 | 0.20 |
| createDOMProps.propsToAriaRole | 10.20 | 1.55% | 0.00 | 36000 | 0.10 |
| createDOMProps.tvProps | 9.00 | 1.36% | 0.00 | 36000 | 0.10 |
| createDOMProps.otherProps | 8.80 | 1.33% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 25.30 | 3.84% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.preprocess | 28.10 | 4.26% | 0.00 | 36000 | 0.10 |
| StyleSheet.localizeStyle | 9.30 | 1.41% | 0.00 | 36000 | 0.10 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 6.61 | 0.43 | 6.59 | 99.80% | 0.01 | 0.18% | 100 |

### Update host props

Update many direct host nodes with changing DOM-like props and light style changes.

Metadata: layer Layer 1 | intent update-props | primitive createElement | nodes 360 | props/node 6 | styles/node 2

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 938.20 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| createElement.total | 640.10 | 68.23% | 0.02 | 36000 | 0.80 |
| createElement.createDOMProps | 559.80 | 59.67% | 0.02 | 36000 | 0.80 |
| createDOMProps.total | 539.00 | 57.45% | 0.01 | 36000 | 0.80 |
| createDOMProps.styleProps | 358.20 | 38.18% | 0.01 | 36000 | 0.80 |
| createDOMProps.StyleSheet | 340.10 | 36.25% | 0.01 | 36000 | 0.80 |
| StyleSheet.resolve | 318.50 | 33.95% | 0.01 | 36000 | 0.80 |
| StyleSheet.customStyleq | 187.00 | 19.93% | 0.01 | 36000 | 0.50 |
| StyleSheet.inline | 102.00 | 10.87% | 0.00 | 36000 | 0.80 |
| createElement.React.createElement | 14.90 | 1.59% | 0.00 | 36000 | 0.10 |
| createElement.localeProvider | 10.10 | 1.08% | 0.00 | 36000 | 0.10 |
| createDOMProps.accessibilityProps | 11.90 | 1.27% | 0.00 | 36000 | 0.10 |
| createDOMProps.dataSetProps | 10.10 | 1.08% | 0.00 | 36000 | 0.10 |
| createDOMProps.focusProps | 9.10 | 0.97% | 0.00 | 36000 | 0.10 |
| createDOMProps.propsToAriaRole | 10.10 | 1.08% | 0.00 | 36000 | 0.10 |
| createDOMProps.tvProps | 8.20 | 0.87% | 0.00 | 36000 | 0.10 |
| createDOMProps.otherProps | 11.40 | 1.22% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 27.00 | 2.88% | 0.00 | 36000 | 0.10 |
| StyleSheet.customStyleq.preprocess | 81.40 | 8.68% | 0.00 | 138000 | 0.50 |
| StyleSheet.localizeStyle | 8.80 | 0.94% | 0.00 | 36000 | 0.10 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 11.38 | 1.01 | 9.38 | 82.43% | 2.00 | 17.56% | 100 |

### Update view styles

Update many View nodes with style changes only, without prop churn.

Metadata: layer Layer 1 | intent update-style | primitive View | nodes 360 | props/node 0 | styles/node 5

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 883.10 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| View.render | 685.50 | 77.62% | 0.02 | 36100 | 1.70 |
| createElement.total | 610.20 | 69.10% | 0.02 | 36100 | 1.60 |
| createElement.createDOMProps | 548.60 | 62.12% | 0.02 | 36100 | 1.60 |
| createDOMProps.total | 527.50 | 59.73% | 0.01 | 36100 | 1.60 |
| createDOMProps.styleProps | 356.30 | 40.35% | 0.01 | 36100 | 1.60 |
| createDOMProps.StyleSheet | 338.90 | 38.38% | 0.01 | 36100 | 1.60 |
| StyleSheet.resolve | 313.40 | 35.49% | 0.01 | 36100 | 1.60 |
| StyleSheet.customStyleq | 186.50 | 21.12% | 0.01 | 36100 | 1.50 |
| View.pickProps | 9.90 | 1.12% | 0.00 | 36100 | 0.10 |
| createElement.React.createElement | 12.00 | 1.36% | 0.00 | 36100 | 0.10 |
| createDOMProps.accessibilityProps | 10.90 | 1.23% | 0.00 | 36100 | 0.10 |
| createDOMProps.dataSetProps | 9.20 | 1.04% | 0.00 | 36100 | 0.10 |
| createDOMProps.focusProps | 10.40 | 1.18% | 0.00 | 36100 | 0.10 |
| createDOMProps.propsToAriaRole | 10.20 | 1.16% | 0.00 | 36100 | 0.10 |
| createDOMProps.tvProps | 9.80 | 1.11% | 0.00 | 36100 | 0.10 |
| createDOMProps.otherProps | 9.80 | 1.11% | 0.00 | 36100 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 29.70 | 3.36% | 0.00 | 36100 | 0.10 |
| StyleSheet.customStyleq.preprocess | 82.50 | 9.34% | 0.00 | 138100 | 1.50 |
| StyleSheet.localizeStyle | 8.90 | 1.01% | 0.00 | 36100 | 0.10 |
| StyleSheet.inline | 99.00 | 11.21% | 0.00 | 36100 | 0.60 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 9.54 | 0.54 | 8.83 | 92.57% | 0.71 | 7.42% | 100 |

### Update view props

Update many View nodes with changing DOM-like props and light style changes.

Metadata: layer Layer 1 | intent update-props | primitive View | nodes 360 | props/node 6 | styles/node 2

Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):

Total scripting budget: 1648.70 ms

| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |
| :--- | ---: | ---: | ---: | ---: | ---: |
| View.render | 1316.10 | 79.83% | 0.02 | 72100 | 2.30 |
| createElement.total | 1140.30 | 69.16% | 0.02 | 72100 | 2.30 |
| createElement.createDOMProps | 1007.40 | 61.10% | 0.01 | 72100 | 2.30 |
| createDOMProps.total | 966.80 | 58.64% | 0.01 | 72100 | 2.30 |
| createDOMProps.styleProps | 607.00 | 36.82% | 0.01 | 72100 | 1.90 |
| createDOMProps.StyleSheet | 568.60 | 34.49% | 0.01 | 72100 | 1.90 |
| StyleSheet.resolve | 517.70 | 31.40% | 0.01 | 72100 | 1.90 |
| StyleSheet.customStyleq | 288.60 | 17.50% | 0.00 | 72100 | 1.00 |
| View.pickProps | 28.30 | 1.72% | 0.00 | 72100 | 0.10 |
| createElement.React.createElement | 24.10 | 1.46% | 0.00 | 72100 | 0.10 |
| createElement.localeProvider | 10.40 | 0.63% | 0.00 | 36000 | 0.10 |
| createDOMProps.accessibilityProps | 23.60 | 1.43% | 0.00 | 72100 | 0.10 |
| createDOMProps.dataSetProps | 20.10 | 1.22% | 0.00 | 72100 | 0.10 |
| createDOMProps.focusProps | 21.40 | 1.30% | 0.00 | 72100 | 0.80 |
| createDOMProps.propsToAriaRole | 18.10 | 1.10% | 0.00 | 72100 | 0.10 |
| createDOMProps.tvProps | 19.70 | 1.19% | 0.00 | 72100 | 0.10 |
| createDOMProps.otherProps | 19.10 | 1.16% | 0.00 | 72100 | 0.10 |
| StyleSheet.customStyleq.cacheHit | 61.90 | 3.75% | 0.00 | 72100 | 0.90 |
| StyleSheet.customStyleq.preprocess | 113.60 | 6.89% | 0.00 | 174100 | 0.80 |
| StyleSheet.localizeStyle | 18.30 | 1.11% | 0.00 | 72100 | 0.10 |
| StyleSheet.inline | 178.80 | 10.84% | 0.00 | 72100 | 1.90 |

| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 19.04 | 1.49 | 16.49 | 86.60% | 2.55 | 13.40% | 100 |

