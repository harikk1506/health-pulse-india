import React, { StrictMode } from 'react' // FIX: Explicitly import StrictMode
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // FIX: Use the imported StrictMode component directly
  <StrictMode> 
    <App />
  </StrictMode>,
)