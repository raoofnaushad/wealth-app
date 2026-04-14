import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import './index.css';
import App from './App';

const root = createRoot(document.getElementById('root')!);

root.render(
  <div
    style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      color: '#334155',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
    }}
  >
    Invictus AI — Super Admin
  </div>
);

async function enableMocking() {
  if (import.meta.env.VITE_USE_REAL_API === 'true') {
    return;
  }
  const { worker } = await import('./api/mock/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
