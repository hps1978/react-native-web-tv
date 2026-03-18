# React Native Web for TV examples

Next.js pages and React Native components. Provides interactive examples for the documentation website.

## Run locally

From monorepo root:

```bash
npm run dev -w packages/react-native-web-examples
```

## Webpack browser mode

This package also supports a simple webpack browser build without changing the current `pages/` structure.

```bash
npm run dev:webpack -w packages/react-native-web-examples
```

Production build:

```bash
npm run build:webpack -w packages/react-native-web-examples
```

Serving production build:

```bash
npm run serve:webpack -w packages/react-native-web-examples
```

Webpack output is generated in `packages/react-native-web-examples/dist-webpack/`.

## Web TV pages

TV-focused examples in this fork:
* `/tv-event-handler`
* `/tv-focus-guide-view`
* `/flatlist-tv-scroll`

