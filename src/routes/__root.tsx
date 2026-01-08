import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Header from '../components/Header'
import { CalmModeProvider, useCalmMode } from '../contexts/CalmModeContext'
import { SimplifyModeProvider } from '../contexts/SimplifyModeContext'
import SkipLink from '../components/SkipLink'

import appCss from '../styles.css?url'

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
        title: 'GastownUI - Gas Town Dashboard',
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
      <CalmModeProvider>
        <SimplifyModeProvider>
          <RootBody>{children}</RootBody>
        </SimplifyModeProvider>
      </CalmModeProvider>
    </html>
  )
}

function RootBody({ children }: { children: React.ReactNode }) {
  const { isCalm } = useCalmMode()

  return (
    <body className={isCalm ? 'calm-mode' : ''}>
      <SkipLink />
      <Header />
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
      <Scripts />
    </body>
  )
}
