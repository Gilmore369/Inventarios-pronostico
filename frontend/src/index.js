import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import TestApp from './TestApp';

// Usar TestApp temporalmente para diagnosticar
const USE_TEST_APP = true;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {USE_TEST_APP ? <TestApp /> : <App />}
  </React.StrictMode>
);