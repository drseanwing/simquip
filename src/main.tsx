import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider } from '@fluentui/react-components'
import rediLightTheme from './theme'
import { ErrorBoundary } from './components/ErrorBoundary'
import PowerProvider from './PowerProvider'
import { ServiceProvider } from './contexts/ServiceContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PowerProvider>
        <FluentProvider theme={rediLightTheme}>
          <ServiceProvider>
            <App />
          </ServiceProvider>
        </FluentProvider>
      </PowerProvider>
    </ErrorBoundary>
  </StrictMode>,
)
