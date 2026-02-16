import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import './components/GlassUI.css'
import { initI18n } from './locales'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

await initI18n()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
