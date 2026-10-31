import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#0b1215' },
      {
        name: 'description',
        content:
          'Beacon is a live signal deck for production incidents, releases, and service health.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

function RootShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  return (
    <div className="app-shell">
      <div className="ambient ambient-a" aria-hidden="true" />
      <div className="ambient ambient-b" aria-hidden="true" />
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Beacon home">
          <BeaconMark />
          <span>
            <strong>Beacon</strong>
            <small>signal deck</small>
          </span>
        </Link>
        <nav className="topnav" aria-label="Primary">
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/signals" search={{}}>
            Signals
          </NavLink>
          <NavLink to="/lab">Lab</NavLink>
        </nav>
        <div className="topbar-status">
          <span className="live-dot" aria-hidden="true" />
          <span>live</span>
          <a className="api-link" href="/api/health">
            api
          </a>
        </div>
      </header>
      <main className="page">{<Outlet />}</main>
      <footer className="footer">
        <span>Beacon / production signal deck</span>
        <span>TanStack Start · full-document SSR · streaming</span>
      </footer>
    </div>
  )
}

function NavLink({
  to,
  search,
  children,
}: Readonly<{ to: string; search?: Record<string, unknown>; children: ReactNode }>) {
  return (
    <Link
      to={to}
      search={search}
      className="nav-link"
      activeProps={{ className: 'nav-link is-active' }}
      activeOptions={{ exact: to === '/' }}
    >
      {children}
    </Link>
  )
}

function RootError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : 'An unexpected error interrupted this view.'
  return (
    <div className="page">
      <section className="panel error-panel">
        <p className="eyebrow">Request failed</p>
        <h1>Signal lost.</h1>
        <p>{message}</p>
        <Link to="/" className="button">
          Return to overview
        </Link>
      </section>
    </div>
  )
}

function NotFound() {
  return (
    <div className="page">
      <section className="panel error-panel">
        <p className="eyebrow">404</p>
        <h1>No signal at this address.</h1>
        <p>The route exists in the deck, but this record does not.</p>
        <Link to="/signals" search={{}} className="button">
          Browse signals
        </Link>
      </section>
    </div>
  )
}

function BeaconMark() {
  return (
    <svg viewBox="0 0 40 40" className="brand-mark" aria-hidden="true">
      <circle cx="20" cy="20" r="4" fill="currentColor" />
      <circle cx="20" cy="20" r="10" fill="none" stroke="currentColor" strokeOpacity="0.5" />
      <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeOpacity="0.2" />
      <path d="M20 4v5M20 31v5M4 20h5M31 20h5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}
