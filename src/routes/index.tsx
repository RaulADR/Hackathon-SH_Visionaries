import { Link, createFileRoute } from '@tanstack/react-router'

import { Metric, SectionHeading, SignalCard, Sparkline } from '~/components/ui'
import { fetchOverview } from '~/server/signals.functions'

export const Route = createFileRoute('/')({
  // Full-document SSR: the overview is public, cache-friendly, and benefits
  // from shipping its complete markup and loader data on first paint.
  ssr: true,
  loader: () => fetchOverview(),
  head: () => ({
    meta: [{ title: 'Beacon · production signal deck' }],
  }),
  component: OverviewPage,
})

function OverviewPage() {
  const overview = Route.useLoaderData()
  const maxVolume = Math.max(...overview.volumeByDay.map((day) => day.count), 1)
  const allClear = overview.criticalCount === 0

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{formatDeckDate(overview.generatedAt)}</p>
          <h1>
            The deck is <span className={allClear ? 'text-good' : 'text-critical'}>
              {allClear ? 'quiet' : 'live'}
            </span>
            .
          </h1>
          <p className="hero-sub">
            {allClear
              ? 'No critical signals are active. Keep an eye on the watchlist and the on-call handoff.'
              : `${overview.criticalCount} critical ${overview.criticalCount === 1 ? 'signal is' : 'signals are'} active across ${overview.servicesAtRisk.length} services. The latest operator notes are below.`}
          </p>
          <div className="hero-actions">
            <Link to="/signals" search={{ severity: 'critical' }} className="button">
              Triage critical
            </Link>
            <Link to="/signals/new" className="button button-ghost">
              Open a signal
            </Link>
          </div>
        </div>
        <div className={`status-orbit ${allClear ? 'is-calm' : 'is-live'}`} aria-hidden="true">
          <div className="orbit-ring orbit-ring-a" />
          <div className="orbit-ring orbit-ring-b" />
          <div className="orbit-core">
            <span className="orbit-pulse" />
            <strong>{overview.activeCount}</strong>
            <small>active</small>
          </div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Signal summary">
        <Metric
          label="Active signals"
          value={overview.activeCount}
          detail="Open or investigating"
          tone={overview.activeCount > 0 ? 'warn' : 'good'}
        />
        <Metric
          label="Critical"
          value={overview.criticalCount}
          detail="Customer-facing severity"
          tone={overview.criticalCount > 0 ? 'critical' : 'good'}
        />
        <Metric
          label="Median ack"
          value={`${overview.medianAckMinutes}m`}
          detail="First operator response"
        />
        <Metric
          label="Mitigated today"
          value={overview.mitigatedToday}
          detail="Held for soak"
          tone="good"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel panel-wide">
          <SectionHeading
            eyebrow="Live queue"
            title="Signals needing a human"
            action={
              <Link to="/signals" search={{}} className="text-link">
                View all {overview.recent.length < 5 ? '' : '→'}
              </Link>
            }
          />
          <div className="signal-list">
            {overview.recent.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </section>

        <aside className="side-stack">
          <section className="panel">
            <SectionHeading eyebrow="Last 7 days" title="Signal volume" />
            <div className="volume-chart">
              {overview.volumeByDay.map((day) => (
                <div className="volume-column" key={day.day}>
                  <span className="volume-value">{day.count}</span>
                  <div className="volume-track">
                    <span
                      className="volume-bar"
                      style={{ height: `${Math.max(8, (day.count / maxVolume) * 100)}%` }}
                    />
                  </div>
                  <span className="volume-label">{day.label}</span>
                </div>
              ))}
            </div>
            <div className="sparkline-wrap">
              <Sparkline values={overview.volumeByDay.map((day) => day.count)} />
            </div>
          </section>

          <section className="panel">
            <SectionHeading eyebrow="On call" title="Today’s rotation" />
            <ul className="oncall-list">
              {overview.onCall.map((person) => (
                <li key={person.name}>
                  <span className="avatar">{initials(person.name)}</span>
                  <span>
                    <strong>{person.name}</strong>
                    <small>
                      {person.role} · {person.region}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <section className="panel">
        <SectionHeading
          eyebrow="Blast radius"
          title="Services under pressure"
          action={
            <Link to="/signals" search={{ sort: 'activity' }} className="text-link">
              Activity view →
            </Link>
          }
        />
        <div className="service-grid">
          {overview.topServices.map((service) => (
            <div className="service-card" key={service.service}>
              <div>
                <p className="service-name">{service.service}</p>
                <p className="service-detail">
                  {service.active} active {service.active === 1 ? 'signal' : 'signals'}
                </p>
              </div>
              <div className="service-meter">
                <span
                  style={{ width: `${Math.min(100, service.errorRate * 2400 + 12)}%` }}
                />
              </div>
              <span className="service-error">
                {(service.errorRate * 100).toFixed(1)}% err
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function formatDeckDate(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('weekday')} · ${get('day')} ${get('month')} ${get('year')} · UTC`
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
}
