import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { ErrorBoundary } from './components/ErrorBoundary'
import PowerProvider from './PowerProvider'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PowerProvider>
        <FluentProvider theme={webLightTheme}>
          <App />
        </FluentProvider>
      </PowerProvider>
    </ErrorBoundary>
  </StrictMode>,
)
