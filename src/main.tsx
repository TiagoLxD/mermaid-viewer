import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

/* tema anti-flash antes do primeiro render */
try {
    const t = localStorage.getItem('meridian:theme');
    if (t) document.documentElement.dataset.theme = t;
} catch { }

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <App />
        </ThemeProvider>
    </React.StrictMode>,
);
