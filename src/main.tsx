import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css' // Enable global CSS

console.log('[BOOT] app bundle started - Stage 1');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: 20, fontSize: 24, background: '#030303', color: '#e5e5e5', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>BOOT STEP 1</h1>
      <p style={{ marginTop: 10, fontSize: 16 }}>Global CSS and base layout enabled.</p>
    </div>
  </StrictMode>,
)
