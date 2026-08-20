import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initGoogleAnalytics } from './analytics.ts'
import './index.css'
import App from './App.tsx'

initGoogleAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
