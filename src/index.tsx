
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Fix for "Cannot set property fetch of #<Window> which has only a getter"
// This happens when libraries try to polyfill fetch in an environment where it's read-only.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <HashRouter>
    <App />
  </HashRouter>
);
