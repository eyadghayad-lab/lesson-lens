
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Fix for "Cannot set property fetch of #<Window> which has only a getter"
// This happens when libraries try to polyfill fetch in an environment where it's read-only.
try {
  if (typeof window !== 'undefined' && window.fetch) {
    const nativeFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      value: nativeFetch,
      writable: true,
      configurable: true
    });
  }
} catch (e) {
  console.warn('LessonLens: Could not make window.fetch writable', e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
