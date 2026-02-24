import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import { initI18n } from './locales'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { getRouteNamespaces } from './routes/routeConfig'

const initialPathname = typeof window !== 'undefined' ? window.location.pathname : '/'
await initI18n(getRouteNamespaces(initialPathname))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
