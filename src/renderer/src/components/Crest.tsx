import { useId } from 'react'

/**
 * The app mark: a meter dial in Morituri bronze, needle into the oxblood.
 *
 * Replaces the Project Triune emblem this fork inherited - that mark belongs
 * to another server and has no business on a Morituri tool. The geometry is
 * mirrored in scripts/make-icon.mjs, which renders the same mark as the app
 * icon; change one and change the other.
 *
 * Motion: the graduations turn slowly (11.4s) and the halo breathes (4.5s),
 * via the .ptui-emblem rules in theme.css. The needle holds still - a meter
 * whose needle spins reads as broken.
 */

/** Twelve graduations; every third is major - longer, brighter, wider. */
const TICKS = [
  { x1: 149.6, y1: 100.0, x2: 161.4, y2: 100.0, major: true },
  { x1: 147.3, y1: 127.3, x2: 153.2, y2: 130.7, major: false },
  { x1: 127.3, y1: 147.3, x2: 130.7, y2: 153.2, major: false },
  { x1: 100.0, y1: 149.6, x2: 100.0, y2: 161.4, major: true },
  { x1: 72.7, y1: 147.3, x2: 69.3, y2: 153.2, major: false },
  { x1: 52.7, y1: 127.3, x2: 46.8, y2: 130.7, major: false },
  { x1: 50.4, y1: 100.0, x2: 38.6, y2: 100.0, major: true },
  { x1: 52.7, y1: 72.7, x2: 46.8, y2: 69.3, major: false },
  { x1: 72.7, y1: 52.7, x2: 69.3, y2: 46.8, major: false },
  { x1: 100.0, y1: 50.4, x2: 100.0, y2: 38.6, major: true },
  { x1: 127.3, y1: 52.7, x2: 130.7, y2: 46.8, major: false },
  { x1: 147.3, y1: 72.7, x2: 153.2, y2: 69.3, major: false }
]

const GOLD = '#c9a468'
const EMBER = '#b8323a'

export function Crest({ size = 44, spin = true }: { size?: number; spin?: boolean }): JSX.Element {
  // Gradient ids must be unique per instance: the title bar and the hero both
  // render a crest, and duplicate ids would make one steal the other's fills.
  const uid = useId().replace(/:/g, '')
  const halo = `halo-${uid}`

  return (
    <svg
      className={spin ? 'ptui-emblem' : 'ptui-emblem still'}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      role="img"
      aria-label="Morituri DPS Meter"
    >
      <defs>
        <radialGradient id={halo}>
          <stop offset=".52" stopColor="#4a1013" stopOpacity="0" />
          <stop offset=".72" stopColor={GOLD} stopOpacity=".2" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle className="pt-h3" cx="100" cy="100" r="96.1" fill={`url(#${halo})`} />
      <circle cx="100" cy="100" r="61.4" fill="#12100f" fillOpacity=".86" />

      <g className="pt-out" stroke={GOLD} strokeLinecap="round">
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            strokeOpacity={t.major ? '.86' : '.43'}
            strokeWidth={t.major ? 2.0 : 1.3}
          />
        ))}
      </g>

      <circle cx="100" cy="100" r="61.4" fill="none" stroke={GOLD} strokeOpacity=".82" strokeWidth="1.7" />

      {/* The gauge: open at the bottom, its last quarter in the red. */}
      <path
        d="M73.13 126.87 A38 38 0 1 1 126.87 126.87"
        stroke={GOLD}
        strokeOpacity=".5"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M126.87 73.13 A38 38 0 0 1 126.87 126.87" stroke={EMBER} strokeWidth="5" strokeLinecap="round" />

      {/* Needle, hub, and a highlight that keeps the hub reading as metal. */}
      <line x1="96" y1="106.93" x2="117" y2="70.56" stroke={EMBER} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6.5" fill={GOLD} />
      <circle cx="98.4" cy="98.4" r="2.1" fill="#ffffff" fillOpacity=".75" />
    </svg>
  )
}
