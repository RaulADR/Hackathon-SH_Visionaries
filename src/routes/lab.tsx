import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/lab')({
  // This route is intentionally client-only. Its loader reads localStorage and
  // its component paints a canvas, so there is nothing useful to SSR. The root
  // document shell is still server-rendered by the shellComponent.
  ssr: false,
  loader: () => {
    const fallback: LabPrefs = { amplitude: 0.62, frequency: 1.4, glow: true }
    try {
      const raw = window.localStorage.getItem('beacon.lab.prefs')
      if (!raw) return { prefs: fallback }
      const parsed = JSON.parse(raw) as Partial<LabPrefs>
      return {
        prefs: {
          amplitude: clamp(Number(parsed.amplitude ?? fallback.amplitude), 0.05, 1),
          frequency: clamp(Number(parsed.frequency ?? fallback.frequency), 0.2, 4),
          glow: Boolean(parsed.glow ?? fallback.glow),
        },
      }
    } catch {
      return { prefs: fallback }
    }
  },
  head: () => ({
    meta: [{ title: 'Signal lab · Beacon' }],
  }),
  component: LabPage,
  pendingComponent: LabPending,
})

type LabPrefs = {
  amplitude: number
  frequency: number
  glow: boolean
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function LabPage() {
  const { prefs: initialPrefs } = Route.useLoaderData()
  const [prefs, setPrefs] = useState(initialPrefs)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    window.localStorage.setItem('beacon.lab.prefs', JSON.stringify(prefs))
  }, [prefs])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let raf = 0
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    function draw(time: number) {
      const rect = canvas!.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(320, rect.width)
      const height = 260

      if (
        canvas!.width !== Math.floor(width * dpr) ||
        canvas!.height !== Math.floor(height * dpr)
      ) {
        canvas!.width = Math.floor(width * dpr)
        canvas!.height = Math.floor(height * dpr)
      }

      context!.setTransform(dpr, 0, 0, dpr, 0, 0)
      context!.clearRect(0, 0, width, height)

      const bg = context!.createLinearGradient(0, 0, 0, height)
      bg.addColorStop(0, 'rgba(8, 22, 24, 0.2)')
      bg.addColorStop(1, 'rgba(5, 12, 14, 0.85)')
      context!.fillStyle = bg
      context!.fillRect(0, 0, width, height)

      context!.strokeStyle = 'rgba(94, 234, 212, 0.08)'
      context!.lineWidth = 1
      for (let x = 0; x <= width; x += 40) {
        context!.beginPath()
        context!.moveTo(x, 0)
        context!.lineTo(x, height)
        context!.stroke()
      }
      for (let y = 0; y <= height; y += 40) {
        context!.beginPath()
        context!.moveTo(0, y)
        context!.lineTo(width, y)
        context!.stroke()
      }

      const phase = reducedMotion ? 0 : time / 900
      const points: { x: number; y: number }[] = []
      for (let x = 0; x <= width; x += 3) {
        const nx = x / width
        const envelope = Math.sin(nx * Math.PI)
        const y =
          height / 2 +
          Math.sin(nx * Math.PI * 2 * prefs.frequency * 3 + phase) *
            height *
            0.3 *
            prefs.amplitude *
            envelope +
          Math.sin(nx * Math.PI * 2 * 11 + phase * 1.7) *
            height *
            0.025 *
            prefs.amplitude

        points.push({ x, y })
      }

      if (prefs.glow) {
        context!.shadowColor = 'rgba(94, 234, 212, 0.85)'
        context!.shadowBlur = 18
      } else {
        context!.shadowBlur = 0
      }

      context!.strokeStyle = '#5eead4'
      context!.lineWidth = 2
      context!.beginPath()
      points.forEach((point, index) => {
        if (index === 0) context!.moveTo(point.x, point.y)
        else context!.lineTo(point.x, point.y)
      })
      context!.stroke()
      context!.shadowBlur = 0

      const fill = context!.createLinearGradient(0, 0, 0, height)
      fill.addColorStop(0, 'rgba(94, 234, 212, 0.18)')
      fill.addColorStop(1, 'rgba(94, 234, 212, 0)')
      context!.fillStyle = fill
      context!.beginPath()
      context!.moveTo(0, height)
      points.forEach((point) => context!.lineTo(point.x, point.y))
      context!.lineTo(width, height)
      context!.closePath()
      context!.fill()

      frame += 1
      if (!reducedMotion) raf = window.requestAnimationFrame(draw)
    }

    raf = window.requestAnimationFrame(draw)
    return () => {
      window.cancelAnimationFrame(raf)
      void frame
    }
  }, [prefs])

  return (
    <div className="stack">
      <section className="page-head">
        <div>
          <p className="eyebrow">Client-only route</p>
          <h1>Signal lab.</h1>
          <p className="page-sub">
            This route opts out of SSR entirely. The loader reads local storage,
            the canvas paints from <code>requestAnimationFrame</code>, and the
            root HTML shell still arrives from the server.
          </p>
        </div>
        <span className="ssr-chip">ssr: false</span>
      </section>

      <div className="lab-grid">
        <section className="panel lab-canvas-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Local oscillator</p>
              <h2>Waveform</h2>
            </div>
            <span className="stream-chip">canvas</span>
          </div>
          <canvas ref={canvasRef} className="lab-canvas" aria-label="Animated signal waveform" />
          <p className="lab-note">
            Preferences persist in <code>localStorage</code>. Nothing on this
            page is serialized from the server except the document shell.
          </p>
        </section>

        <aside className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Controls</p>
              <h2>Shape the signal</h2>
            </div>
          </div>
          <label className="range-field">
            <span>
              Amplitude <strong>{prefs.amplitude.toFixed(2)}</strong>
            </span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.01"
              value={prefs.amplitude}
              onChange={(event) =>
                setPrefs((current) => ({
                  ...current,
                  amplitude: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="range-field">
            <span>
              Frequency <strong>{prefs.frequency.toFixed(2)}×</strong>
            </span>
            <input
              type="range"
              min="0.2"
              max="4"
              step="0.05"
              value={prefs.frequency}
              onChange={(event) =>
                setPrefs((current) => ({
                  ...current,
                  frequency: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="toggle-field">
            <span>Glow</span>
            <input
              type="checkbox"
              checked={prefs.glow}
              onChange={(event) =>
                setPrefs((current) => ({ ...current, glow: event.target.checked }))
              }
            />
          </label>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => setPrefs({ amplitude: 0.62, frequency: 1.4, glow: true })}
          >
            Reset defaults
          </button>
        </aside>
      </div>
    </div>
  )
}

function LabPending() {
  return (
    <div className="stack">
      <section className="page-head">
        <div>
          <p className="eyebrow">Client-only route</p>
          <h1>Signal lab.</h1>
          <p className="page-sub">Starting the local oscillator…</p>
        </div>
      </section>
      <section className="panel pending-block" aria-hidden="true">
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-block" />
      </section>
    </div>
  )
}
