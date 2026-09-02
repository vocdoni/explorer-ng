import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '~components/ui/toaster'
import { ApiProvider, useApiConfig } from '~contexts/ApiContext'
import { Router } from '~router'
import { ColorModeProvider, system } from '~theme'

// `full` carries Fraunces' SOFT/WONK axes — the heading recipe maxes SOFT for
// the warm display voice, so the wght-only file is not enough.
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/hanken-grotesk/index.css'
import '@fontsource-variable/jetbrains-mono/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const AppBody = () => {
  useApiConfig()
  return <Router />
}

export const AppProviders = () => (
  <ApiProvider>
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <ChakraProvider value={system}>
          <AppBody />
          <Toaster />
        </ChakraProvider>
      </ColorModeProvider>
      {/* Dev only: the floating toggle sits over the bottom-right corner and
          intercepts clicks on the pagination controls there. */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </ApiProvider>
)
