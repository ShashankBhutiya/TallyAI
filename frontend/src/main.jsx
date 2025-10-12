import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Create root
const container = document.getElementById('root');
const root = createRoot(container);

// Render app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log app info
console.log(
  `%cTallyAI %cv${process.env.npm_package_version || '1.0.0'}`,
  'color: #0ea5e9; font-size: 2em; font-weight: bold;',
  'color: #64748b; font-size: 1.2em;'
);
