import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/global.css' // Enable global CSS

// Import some major stores to test Zustand initialization
import { useGameStore } from './store/useGameStore'
import { useProfileStore } from './store/useProfileStore'
import { useInventoryStore } from './store/useInventoryStore'
import { usePetStore } from './store/usePetStore'

console.log('[BOOT] app bundle started - Stage 3');

// Force evaluation
console.log('[BOOT] Store check:', {
  game: useGameStore.getState().currency,
  profile: useProfileStore.getState().profileName,
  inventory: useInventoryStore.getState().items,
  pet: usePetStore.getState().activePet,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={
          <div style={{ padding: 20, fontSize: 24, background: '#030303', color: '#e5e5e5', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1>BOOT STEP 3</h1>
            <p style={{ marginTop: 10, fontSize: 16 }}>Stores initialized (no persistence)</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
