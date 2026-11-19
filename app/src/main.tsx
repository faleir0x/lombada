import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './ui/tokens.css';
import './ui/typography.css';
import './ui/base.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado em index.html.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
