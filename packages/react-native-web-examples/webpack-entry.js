import React from 'react';
import { AppRegistry, StyleSheet, Text, View } from 'react-native';

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

const routes = Object.keys(routeMap).sort();

function getRouteFromPath() {
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
  return pathname || '';
}

function Home() {
  return (
    <View style={styles.app}>
      <Text style={styles.title}>React Native for Web examples</Text>
      <Text style={styles.subtitle}>Webpack browser mode</Text>
      <View style={styles.list}>
        {routes.map((name) => (
          <Text href={`/${name}`} key={name} role="link" style={styles.link}>
            {name}
          </Text>
        ))}
      </View>
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
  const route = getRouteFromPath();
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
  link: {
    color: '#1977f2',
    fontSize: 18,
    marginVertical: 6,
    textAlign: 'center'
  }
});

// Register and run app using React Native AppRegistry
AppRegistry.registerComponent('App', () => App);
AppRegistry.runApplication('App', { rootTag: document.getElementById('root') });
