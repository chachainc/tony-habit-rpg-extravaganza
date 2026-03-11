import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/global.css' // Enable global CSS

console.log('[BOOT] app bundle started - Stage 2');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={
          <div style={{ padding: 20, fontSize: 24, background: '#030303', color: '#e5e5e5', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1>BOOT STEP 2</h1>
            <p style={{ marginTop: 10, fontSize: 16 }}>Router enabled</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
