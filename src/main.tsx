import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from '~app/AppProviders'
import { applyLegacyUrl } from '~utils/legacyUrl'

// Before the router exists, so a link from an older explorer is corrected in
// place rather than rendering a 404 and bouncing.
applyLegacyUrl()

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

ReactDOM.createRoot(root).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>
)
