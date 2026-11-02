import React, { useEffect, useRef, useState } from 'react'
import { Pause, Play, Compass, Info } from '@openai/apps-sdk-ui/components/Icon'

// Motion Lab — live readout of the phone's motion sensors through the standard
// browser events (devicemotion / deviceorientation). The hero is one dial: the
// outer ring turns with the compass heading, the inner bubble is a spirit level.

const CSS = `
  * { box-sizing: border-box; }
  .ml-root {
    min-height: 100%;
    color: var(--text);
    background: var(--bg);
    font-family: var(--font);
    padding: 20px 16px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
  .ml-head { width: 100%; max-width: 560px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .ml-title { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
  .ml-sub { margin: 2px 0 0; font-size: 13px; color: var(--muted); }
  .ml-btn {
    min-height: 44px; padding: 0 16px; border-radius: 999px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text); font: inherit; font-size: 14px; font-weight: 600;
    display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
  }
  .ml-btn--primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .ml-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .ml-btn svg { width: 18px; height: 18px; }

  .ml-dial-wrap { position: relative; width: min(78vw, 300px); aspect-ratio: 1; }
  .ml-dial { position: absolute; inset: 0; border-radius: 50%;
    background: radial-gradient(circle at 50% 45%, var(--surface) 0%, var(--surface-2) 100%);
    border: 1px solid var(--border);
    box-shadow: inset 0 2px 18px rgba(0,0,0,.12), 0 10px 30px rgba(0,0,0,.08); }
  .ml-ring { position: absolute; inset: 0; transition: transform .12s linear; }
  .ml-ring svg { width: 100%; height: 100%; display: block; }
  .ml-target { position: absolute; left: 50%; top: 50%; width: 30%; height: 30%;
    transform: translate(-50%, -50%); border-radius: 50%;
    border: 1.5px dashed var(--border); }
  .ml-cross { position: absolute; left: 50%; top: 50%; width: 62%; height: 62%; transform: translate(-50%, -50%); pointer-events: none; }
  .ml-cross::before, .ml-cross::after { content: ''; position: absolute; background: var(--border); }
  .ml-cross::before { left: 50%; top: 0; bottom: 0; width: 1px; }
  .ml-cross::after { top: 50%; left: 0; right: 0; height: 1px; }
  .ml-bubble { position: absolute; left: 50%; top: 50%; width: 18%; height: 18%;
    margin: -9% 0 0 -9%; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff 0%, var(--accent) 55%);
    box-shadow: 0 4px 14px rgba(0,0,0,.25);
    transition: transform .08s linear, background .3s; }
  .ml-bubble--level { background: radial-gradient(circle at 35% 30%, #fff 0%, #2fb36b 55%); }
  .ml-pointer { position: absolute; left: 50%; top: -10px; transform: translateX(-50%);
    width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent;
    border-top: 14px solid var(--accent); }
  .ml-readout { text-align: center; }
  .ml-heading { font-size: 34px; font-weight: 800; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
  .ml-tilt { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .ml-level-tag { color: #2fb36b; font-weight: 700; }

  .ml-notice { width: 100%; max-width: 560px; display: flex; gap: 10px; align-items: flex-start;
    padding: 12px 14px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border);
    font-size: 14px; line-height: 1.45; color: var(--muted); }
  .ml-notice svg { flex: none; width: 18px; height: 18px; margin-top: 1px; }

  .ml-grid { width: 100%; max-width: 560px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .ml-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 14px 14px 12px; }
  .ml-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ml-card-title { font-size: 14px; font-weight: 700; }
  .ml-card-unit { font-size: 12px; color: var(--muted); }
  .ml-status { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
    padding: 3px 8px; border-radius: 999px; background: var(--surface-2); color: var(--muted); }
  .ml-status--live { background: rgba(47,179,107,.16); color: #2fb36b; }
  .ml-axis { display: grid; grid-template-columns: 22px 1fr 64px; align-items: center; gap: 8px; height: 26px; }
  .ml-axis-name { font-size: 12px; font-weight: 700; color: var(--muted); }
  .ml-bar { position: relative; height: 6px; border-radius: 3px; background: var(--surface-2); overflow: hidden; }
  .ml-bar::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: var(--border); }
  .ml-bar--plain::after { display: none; }
  .ml-fill { position: absolute; top: 0; bottom: 0; border-radius: 3px; background: var(--accent); }
  .ml-val { text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; }
  .ml-foot { margin-top: 6px; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }

  @media (prefers-reduced-motion: reduce) {
    .ml-ring, .ml-bubble { transition: none; }
  }
`

const NO_DATA_AFTER_MS = 2500
const g = 9.80665

const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d))
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function needsPermission() {
  return typeof DeviceMotionEvent !== 'undefined'
    && typeof DeviceMotionEvent.requestPermission === 'function'
}

// Heading in degrees clockwise from north, or null. iOS reports it directly;
// elsewhere an absolute orientation event's alpha runs counter-clockwise.
function headingFrom(e) {
  const ios = num(e.webkitCompassHeading)
  if (ios != null) return ios
  if (e.absolute && num(e.alpha) != null) return (360 - e.alpha) % 360
  return null
}

const CARDINAL = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const cardinal = (h) => CARDINAL[Math.round(h / 45) % 8]

function Ring() {
  const ticks = []
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180
    const major = i % 18 === 0
    const mid = i % 6 === 0
    const r1 = 96
    const r2 = major ? 84 : mid ? 88 : 91
    ticks.push(
      <line key={i}
        x1={100 + r1 * Math.sin(a)} y1={100 - r1 * Math.cos(a)}
        x2={100 + r2 * Math.sin(a)} y2={100 - r2 * Math.cos(a)}
        stroke="currentColor" strokeOpacity={major ? 0.9 : 0.35} strokeWidth={major ? 2 : 1} />,
    )
  }
  const labels = [['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([t, deg]) => {
    const a = (deg * Math.PI) / 180
    return (
      <text key={t} x={100 + 73 * Math.sin(a)} y={100 - 73 * Math.cos(a) + 5}
        textAnchor="middle" fontSize="14" fontWeight="800"
        fill={t === 'N' ? 'var(--accent)' : 'currentColor'}>{t}</text>
    )
  })
  return <svg viewBox="0 0 200 200" aria-hidden="true">{ticks}{labels}</svg>
}

function Axis({ name, value, range, digits = 2 }) {
  const v = num(value)
  const frac = v == null ? 0 : clamp(v / range, -1, 1)
  const style = frac >= 0
    ? { left: '50%', width: `${frac * 50}%` }
    : { left: `${50 + frac * 50}%`, width: `${-frac * 50}%` }
  return (
    <div className="ml-axis">
      <span className="ml-axis-name">{name}</span>
      <div className="ml-bar"><div className="ml-fill" style={style} /></div>
      <span className="ml-val">{fmt(v, digits)}</span>
    </div>
  )
}

function Card({ title, unit, live, children, foot }) {
  return (
    <section className="ml-card" aria-label={title}>
      <div className="ml-card-head">
        <div>
          <div className="ml-card-title">{title}</div>
          <div className="ml-card-unit">{unit}</div>
        </div>
        <span className={`ml-status${live ? ' ml-status--live' : ''}`}>{live ? 'Live' : 'No data'}</span>
      </div>
      {children}
      {foot && <div className="ml-foot">{foot}</div>}
    </section>
  )
}

export default function App() {
  const [running, setRunning] = useState(false)
  const [permission, setPermission] = useState(needsPermission() ? 'prompt' : 'granted')
  const [startedAt, setStartedAt] = useState(null)
  const [snap, setSnap] = useState(null)
  const [, setTick] = useState(0)
  const latest = useRef({ motion: null, orient: null, heading: null, motionCount: 0, orientCount: 0, rateHz: null })
  const [visible, setVisible] = useState(window.mobius?.visible !== false)
  const ringRot = useRef(0)

  useEffect(() => window.mobius?.onVisibilityChange?.((v) => setVisible(v !== false)), [])

  // Listen only while running and visible; render at most once per frame.
  useEffect(() => {
    if (!running || !visible) return undefined
    const L = latest.current
    const onMotion = (e) => {
      const ag = e.accelerationIncludingGravity || {}
      const a = e.acceleration || {}
      const r = e.rotationRate || {}
      const m = {
        ax: num(ag.x), ay: num(ag.y), az: num(ag.z),
        lx: num(a.x), ly: num(a.y), lz: num(a.z),
        ra: num(r.alpha), rb: num(r.beta), rg: num(r.gamma),
      }
      if (m.ax == null && m.ra == null && m.lx == null) return
      L.motion = m
      L.motionCount += 1
      if (num(e.interval) && e.interval > 0) L.rateHz = 1000 / (e.interval < 1 ? e.interval * 1000 : e.interval)
    }
    const onOrient = (e) => {
      const o = { alpha: num(e.alpha), beta: num(e.beta), gamma: num(e.gamma) }
      if (o.beta == null && o.gamma == null && o.alpha == null) return
      L.orient = o
      L.orientCount += 1
      const h = headingFrom(e)
      if (h != null) L.heading = h
    }
    const onAbs = (e) => {
      const h = headingFrom({ alpha: e.alpha, absolute: true })
      if (h != null) L.heading = h
    }
    window.addEventListener('devicemotion', onMotion)
    window.addEventListener('deviceorientation', onOrient)
    window.addEventListener('deviceorientationabsolute', onAbs)
    let raf = 0
    let shown = { motionCount: -1, orientCount: -1, heading: undefined }
    const loop = () => {
      // Skip the redraw when no new reading arrived since the last frame.
      if (L.motionCount !== shown.motionCount || L.orientCount !== shown.orientCount || L.heading !== shown.heading) {
        shown = { motionCount: L.motionCount, orientCount: L.orientCount, heading: L.heading }
        setSnap({ ...L, motion: L.motion && { ...L.motion }, orient: L.orient && { ...L.orient } })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    // Re-render once after the "no data" grace period so the empty state shows.
    const t = setTimeout(() => setTick((n) => n + 1), NO_DATA_AFTER_MS + 50)
    return () => {
      window.removeEventListener('devicemotion', onMotion)
      window.removeEventListener('deviceorientation', onOrient)
      window.removeEventListener('deviceorientationabsolute', onAbs)
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [running, visible])

  const start = async () => {
    if (needsPermission()) {
      try {
        const res = await DeviceMotionEvent.requestPermission()
        if (typeof DeviceOrientationEvent !== 'undefined'
            && typeof DeviceOrientationEvent.requestPermission === 'function') {
          await DeviceOrientationEvent.requestPermission().catch(() => {})
        }
        setPermission(res)
        if (res !== 'granted') return
      } catch {
        setPermission('denied')
        return
      }
    }
    setStartedAt(Date.now())
    setRunning(true)
  }

  // Start right away where no permission prompt is required.
  useEffect(() => { if (!needsPermission()) void start() }, [])

  const m = snap?.motion
  const o = snap?.orient
  const heading = snap?.heading ?? null
  const beta = o?.beta ?? null
  const gamma = o?.gamma ?? null
  const graceOver = startedAt != null && Date.now() - startedAt > NO_DATA_AFTER_MS
  const nothing = running && graceOver && !snap?.motionCount && !snap?.orientCount

  // Unwrap the ring angle so passing north (359° → 0°) turns a few degrees
  // instead of spinning the whole ring backwards.
  if (heading != null) {
    const target = -heading
    const delta = ((((target - ringRot.current) % 360) + 540) % 360) - 180
    ringRot.current += delta
  }

  const tiltMax = 30
  const bx = gamma == null ? 0 : clamp(-gamma / tiltMax, -1, 1) * 120
  const by = beta == null ? 0 : clamp(-beta / tiltMax, -1, 1) * 120
  const isLevel = beta != null && gamma != null && Math.abs(beta) < 1 && Math.abs(gamma) < 1
  const total = m?.ax != null ? Math.hypot(m.ax, m.ay ?? 0, m.az ?? 0) / g : null

  return (
    <div className="ml-root">
      <style>{CSS}</style>
      <header className="ml-head">
        <div>
          <h1 className="ml-title">Motion Lab</h1>
          <p className="ml-sub">Live readings from your phone's motion sensors</p>
        </div>
        {running ? (
          <button className="ml-btn" onClick={() => setRunning(false)}><Pause /> Pause</button>
        ) : (
          <button className="ml-btn ml-btn--primary" onClick={start}><Play /> Start</button>
        )}
      </header>

      <div className="ml-dial-wrap" role="img"
        aria-label={`Compass ${heading == null ? 'unavailable' : `${Math.round(heading)} degrees`}, tilt ${fmt(beta, 0)} by ${fmt(gamma, 0)} degrees`}>
        <div className="ml-dial" />
        <div className="ml-ring" style={{ transform: `rotate(${ringRot.current}deg)`, color: 'var(--text)' }}>
          <Ring />
        </div>
        <div className="ml-pointer" />
        <div className="ml-cross" />
        <div className="ml-target" />
        <div className={`ml-bubble${isLevel ? ' ml-bubble--level' : ''}`}
          style={{ transform: `translate(${bx}%, ${by}%)` }} />
      </div>

      <div className="ml-readout" aria-live="off">
        <div className="ml-heading">
          {heading == null ? '—' : `${Math.round(heading)}° ${cardinal(heading)}`}
        </div>
        <div className="ml-tilt">
          {isLevel ? <span className="ml-level-tag">Level</span>
            : `Tilt  front/back ${fmt(beta, 0)}°  ·  left/right ${fmt(gamma, 0)}°`}
        </div>
      </div>

      {permission === 'denied' && (
        <div className="ml-notice" role="status"><Info />
          Motion access was declined. Allow motion and orientation access for Möbius in your phone's settings, then tap Start again.
        </div>
      )}
      {!running && permission === 'prompt' && (
        <div className="ml-notice" role="status"><Info />
          Tap Start to begin live readings. Your device may ask to allow motion access first.
        </div>
      )}
      {!running && permission === 'granted' && startedAt != null && (
        <div className="ml-notice" role="status"><Pause /> Paused. Tap Start to resume live readings.</div>
      )}
      {nothing && (
        <div className="ml-notice" role="status"><Compass />
          No motion data is arriving. This device may have no motion sensors (most computers don't) — open Motion Lab on your phone to see live readings.
        </div>
      )}

      <div className="ml-grid">
        <Card title="Accelerometer" unit="m/s², including gravity" live={!!m && m.ax != null}
          foot={`Total ${fmt(total, 2)} g${snap?.rateHz ? `  ·  ${Math.round(snap.rateHz)} Hz` : ''}`}>
          <Axis name="X" value={m?.ax} range={g * 1.5} />
          <Axis name="Y" value={m?.ay} range={g * 1.5} />
          <Axis name="Z" value={m?.az} range={g * 1.5} />
        </Card>
        <Card title="Gyroscope" unit="rotation rate, °/s" live={!!m && m.ra != null}>
          <Axis name="α" value={m?.ra} range={360} digits={0} />
          <Axis name="β" value={m?.rb} range={360} digits={0} />
          <Axis name="γ" value={m?.rg} range={360} digits={0} />
        </Card>
        <Card title="Orientation" unit="device angles, °" live={!!o}>
          <Axis name="α" value={o?.alpha} range={360} digits={0} />
          <Axis name="β" value={o?.beta} range={180} digits={0} />
          <Axis name="γ" value={o?.gamma} range={90} digits={0} />
        </Card>
        <Card title="Magnetometer" unit="compass heading" live={heading != null}
          foot={heading == null ? 'Needs a magnetometer; wave the phone in a figure-8 to calibrate.' : 'Keep away from magnets and metal for accuracy.'}>
          <div className="ml-axis">
            <span className="ml-axis-name">N</span>
            <div className="ml-bar ml-bar--plain"><div className="ml-fill" style={{ left: 0, width: `${heading == null ? 0 : (heading / 360) * 100}%` }} /></div>
            <span className="ml-val">{heading == null ? '—' : `${Math.round(heading)}° ${cardinal(heading)}`}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
