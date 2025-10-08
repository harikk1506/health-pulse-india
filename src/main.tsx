// src/main.tsx

import { StrictMode } from 'react' // FIX: Removed unused 'React' import
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // FIX: Use the imported StrictMode component directly
  <StrictMode> 
    <App />
  </StrictMode>,
)