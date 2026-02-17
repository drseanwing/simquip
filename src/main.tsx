import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import PowerProvider from './PowerProvider'
import App from './App'
import { registerServiceWorker } from './registerSw'
import './index.css'

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PowerProvider>
      <FluentProvider theme={webLightTheme}>
        <App />
      </FluentProvider>
    </PowerProvider>
  </StrictMode>,
)
