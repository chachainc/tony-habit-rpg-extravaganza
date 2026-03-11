import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: 20, fontSize: 24, background: '#fff', color: '#000', height: '100vh' }}>
      SAFE BOOT TEST
    </div>
  </StrictMode>,
)
