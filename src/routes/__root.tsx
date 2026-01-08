import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Header from '../components/Header'
import SkipLink from '../components/SkipLink'
import VoiceControlOverlay from '../components/VoiceControlOverlay'

import appCss from '../styles.css?url'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchOnWindowFocus: false,
    },
  },
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'GastownUI',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <SkipLink />
          <Header />
          <main id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <VoiceControlOverlay />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
