import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;