import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '~components/ui/toaster'
import { ApiProvider, useApiConfig } from '~contexts/ApiContext'
import { Router } from '~router'
import { ColorModeProvider, system } from '~theme'

import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/index.css'

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
