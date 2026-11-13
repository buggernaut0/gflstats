import { createRoot } from 'react-dom/client';
import '@fontsource/anton';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
