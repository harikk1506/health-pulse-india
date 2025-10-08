import React, { StrictMode } from 'react' // MODIFIED: Explicitly importing StrictMode
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // MODIFIED: Using StrictMode component directly
  <StrictMode> 
    <App />
  </StrictMode>,
)