import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Header from '../components/Header'
import { CalmModeProvider, useCalmMode } from '../contexts/CalmModeContext'
import { SimplifyModeProvider } from '../contexts/SimplifyModeContext'
import { LiveRegionProvider } from '../components/a11y/LiveRegion'
import { SkipLink } from '../components/a11y/AccessibleElement'

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
          <LiveRegionProvider>
            <RootBody>{children}</RootBody>
          </LiveRegionProvider>
        </SimplifyModeProvider>
      </CalmModeProvider>
    </html>
  )
}

function RootBody({ children }: { children: React.ReactNode }) {
  const { isCalm } = useCalmMode()

  return (
    <body className={isCalm ? 'calm-mode' : ''}>
      <SkipLink href="#main-content" />
      <Header />
      <main id="main-content">
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
