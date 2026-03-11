import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/global.css'

// ── STAGE 3A: useGameStore only ──────────────────────────────
// DO NOT import useInventoryStore, useGachaStore, useBattleStore yet.
import { useGameStore } from './store/useGameStore'
// Also import usePetStore to check activePet as requested
import { usePetStore } from './store/usePetStore'

console.log('[BOOT 3A] app bundle started');
console.log('[BOOT 3A] useGameStore currency:', useGameStore.getState().currency);

// Force evaluation to ensure activePet instead of activePetId
console.log('[BOOT] Store check:', {
  pet: usePetStore.getState().activePet,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={
          <div style={{ padding: 20, fontSize: 24, background: '#030303', color: '#e5e5e5', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1>BOOT STEP 3A</h1>
            <p style={{ marginTop: 10, fontSize: 16 }}>useGameStore imported successfully</p>
            <p style={{ marginTop: 6, fontSize: 14, color: '#9ca3af' }}>No persistence</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
