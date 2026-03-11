import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { BootErrorBoundary } from './components/ui/BootErrorBoundary';

console.log('[BOOT] app bundle started');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>
  </StrictMode>,
)
