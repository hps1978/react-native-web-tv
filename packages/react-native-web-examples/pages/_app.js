/**
 * Next.js App wrapper for initializing spatial navigation
 * SpatialNavigation is initialized here (once per app lifecycle)
 * rather than in individual page components
 */

import { useEffect } from 'react';
import { setupSpatialNavigation } from 'react-native-web/dist/modules/SpatialManager';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Initialize spatial navigation on app mount
    if (typeof document !== 'undefined') {
      setupSpatialNavigation(document.body);
    }
  }, []);

  return <Component {...pageProps} />;
}
