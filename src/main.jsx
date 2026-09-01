import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

/* tema anti-flash antes do primeiro render */
try {
    const t = localStorage.getItem('meridian:theme');
    if (t) document.documentElement.dataset.theme = t;
} catch { }

createRoot(document.getElementById('root')).render(<App />);
