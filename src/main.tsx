import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {isDesktop} from './services/http';

if (isDesktop()) {
  // Global (OS-level) shortcuts are registered in Rust and forwarded here as key events
  import('@tauri-apps/api/event').then(({listen}) =>
    listen<string>('ga-shortcut', (e) =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', {altKey: true, code: e.payload, key: e.payload.replace('Key', '').toLowerCase()})
      )
    )
  );
}

createRoot(document.getElementById('root')!).render(<App />);
