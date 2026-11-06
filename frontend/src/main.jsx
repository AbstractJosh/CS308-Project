import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './styles/global.css';

// Provider order (handbook 5): BrowserRouter > ToastProvider > AuthProvider > CartProvider.
// Shared file: Ulukan adds AuthProvider (Sprint 1) and Sezin adds CartProvider (Sprint 2)
// at the marked places. Only add your import and your wrapper lines.

// ----- provider imports (AuthProvider: Ulukan, CartProvider: Sezin) -----

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        {/* AuthProvider goes here, around everything below */}
        {/* CartProvider goes here, inside AuthProvider */}
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
