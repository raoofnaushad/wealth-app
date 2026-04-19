import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Show the logo while the app boots
const root = createRoot(document.getElementById('root')!)
root.render(
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background, #fff)' }}>
    <img src="/logo_black_clean.png" alt="" style={{ height: 56, width: 56, objectFit: 'contain', opacity: 0.6 }} className="animate-pulse" />
  </div>
)

async function enableMocking() {
  if (import.meta.env.PROD) return
  const { worker } = await import('./api/mock/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
