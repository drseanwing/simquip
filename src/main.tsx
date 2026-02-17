import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider } from '@fluentui/react-components'
import rediLightTheme from './theme'
import { ErrorBoundary } from './components/ErrorBoundary'
import PowerProvider from './PowerProvider'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PowerProvider>
        <FluentProvider theme={rediLightTheme}>
          <App />
        </FluentProvider>
      </PowerProvider>
    </ErrorBoundary>
  </StrictMode>,
)
