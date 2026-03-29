import React from 'react';
import {
  AppRegistry,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

const pageContext = require.context(
  './pages',
  true,
  /^\.\/[^_][^/]*\/index\.js$/
);

const routeMap = pageContext.keys().reduce((acc, key) => {
  const match = key.match(/^\.\/([^/]+)\/index\.js$/);
  if (!match) return acc;
  const route = match[1];
  const module = pageContext(key);
  acc[route] = module.default || module;
  return acc;
}, {});

const allRoutes = Object.keys(routeMap).sort();
// These are not ready yet, so keeping them hidden for now.
const hiddenExampleRoutes = new Set([
  'flatlist-optimized',
  'flatlist-autotest',
  'flatlist-optimized-grid',
  'flatlist-optimized-horizontal',
  'rlv-flatlist-tv-scroll'
]);

function normalizeRoute(value) {
  if (!value) return '';

  const cleaned = String(value)
    .replace(/^[a-zA-Z]+:\/\/[^/]+/, '')
    .replace(/^#/, '')
    .replace(/^\/+|\/+$/g, '');

  if (!cleaned) return '';
  const withoutHashPrefix = cleaned.replace(/^#\//, '');
  return withoutHashPrefix.replace(/^\/+|\/+$/g, '');
}

function routeFromModuleParam(modulePath) {
  if (!modulePath) return '';
  const match = String(modulePath).match(/\/pages\/([^/]+)\/index\.js$/);
  return match ? match[1] : '';
}

function getRouteFromLocation() {
  const params = new URLSearchParams(window.location.search);

  const queryInitialPath = params.get('initialpath');
  const routeFromInitialPath = normalizeRoute(queryInitialPath);
  if (routeFromInitialPath) return routeFromInitialPath;

  const routeFromHash = normalizeRoute(window.location.hash);
  if (routeFromHash) return routeFromHash;

  const routeFromPathname = normalizeRoute(window.location.pathname);
  if (routeFromPathname) return routeFromPathname;

  return routeFromModuleParam(params.get('module'));
}

function HomeItem({ item, index }) {
  return (
    <Pressable
      hasTVPreferredFocus={index === 0}
      onPress={() => {
        window.location.href = '/' + item;
      }}
      style={(state) => [
        styles.linkItem,
        state.focused && styles.linkItemFocused
      ]}
    >
      <Text style={styles.link}>{item}</Text>
    </Pressable>
  );
}

function Home() {
  const routes = allRoutes.filter((route) => !hiddenExampleRoutes.has(route));
  return (
    <View style={styles.app}>
      <Text style={styles.title}>React Native Web for TV examples</Text>
      <Text style={styles.subtitle}>Webpack browser mode</Text>
      <FlatList
        data={routes}
        keyExtractor={(item) => item}
        renderItem={({ item, index }) => <HomeItem index={index} item={item} />}
        style={styles.list}
      />
    </View>
  );
}

function NotFound({ route }) {
  return (
    <View style={styles.app}>
      <Text style={styles.title}>Not found: /{route}</Text>
      <Text href="/" role="link" style={styles.link}>
        Back to home
      </Text>
    </View>
  );
}

function App() {
  const route = getRouteFromLocation();
  if (!route) return <Home />;

  const Page = routeMap[route];
  if (!Page) return <NotFound route={route} />;
  return <Page />;
}

const styles = StyleSheet.create({
  app: {
    width: '100%',
    height: '100vh',
    alignItems: 'center',
    padding: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8
  },
  subtitle: {
    color: '#555',
    marginBottom: 20
  },
  list: {
    width: '100%',
    maxWidth: 480
  },
  linkItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  linkItemFocused: {
    borderColor: '#1977f2',
    backgroundColor: '#e8f0fe'
  },
  link: {
    color: '#1977f2',
    fontSize: 18,
    textAlign: 'center'
  }
});

// Register and run app using React Native AppRegistry
AppRegistry.registerComponent('App', () => App);
AppRegistry.runApplication('App', { rootTag: document.getElementById('root') });
