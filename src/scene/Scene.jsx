import { useEffect, useRef } from 'react'
import { Layer } from './Layer.jsx'
import { EffectsLayer } from './EffectsLayer.jsx'
import './Scene.css'

// The Scene only reads already-derived display values from `sceneState` (built by the
// caller) and maps them onto CSS custom properties / data attributes. No §4 game rules
// live here (§8.2, C10 spirit) — App.jsx is responsible for deriving sceneState from the
// real game state.
export function Scene({ sceneState }) {
  const containerRef = useRef(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = query.matches
    const handleChange = (event) => {
      reducedMotionRef.current = event.matches
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  // Mouse position is written straight to a CSS variable via the DOM ref, never through
  // React state, so a continuous mousemove never triggers a re-render (§7.3).
  function handleMouseMove(event) {
    if (reducedMotionRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    containerRef.current.style.setProperty('--mouse-x', x.toFixed(3))
    containerRef.current.style.setProperty('--mouse-y', y.toFixed(3))
  }

  function handleMouseLeave() {
    if (!containerRef.current) return
    containerRef.current.style.setProperty('--mouse-x', 0)
    containerRef.current.style.setProperty('--mouse-y', 0)
  }

  const {
    isNight,
    lowAir,
    shieldValue,
    shieldMax,
    lifeSupportValue,
    lifeSupportMax,
    greenhouseValue,
    greenhouseMax,
    forecastLevel,
    stormLevelMax,
    revealed,
  } = sceneState

  const shieldStrength = shieldMax > 0 ? shieldValue / shieldMax : 0
  const lightLevel = lifeSupportMax > 0 ? lifeSupportValue / lifeSupportMax : 0
  const greenhouseLevel = greenhouseMax > 0 ? greenhouseValue / greenhouseMax : 0
  // While planning, show a faint hint from the (possibly wrong) forecast; once revealed,
  // show the real level at full strength — never present the forecast as certain (C5).
  const stormIntensity = revealed
    ? revealed.level / stormLevelMax
    : (forecastLevel / stormLevelMax) * 0.3

  return (
    <div
      ref={containerRef}
      className="scene"
      aria-hidden="true"
      data-night={isNight ? 'true' : 'false'}
      data-low-air={lowAir ? 'true' : 'false'}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        '--shield-strength': shieldStrength,
        '--light-level': lightLevel,
        '--greenhouse-level': greenhouseLevel,
        '--storm-intensity': stormIntensity,
      }}
    >
      <Layer src="/art/layer-0-sky.svg" parallaxFactor={2} className="layer-sky" />
      <Layer src="/art/layer-1-distant-body.svg" parallaxFactor={4} className="layer-distant-body" />
      <Layer src="/art/layer-2-far-rim.svg" parallaxFactor={8} className="layer-far-rim" />
      <Layer src="/art/layer-3-mid-terrain.svg" parallaxFactor={14} className="layer-mid-terrain" />
      <Layer src="/art/layer-4-outpost.svg" parallaxFactor={18} className="layer-outpost" />
      <Layer
        src="/art/layer-4-outpost-lights.svg"
        parallaxFactor={18}
        className="layer-outpost-lights"
      />
      <EffectsLayer />
      <Layer
        src="/art/layer-6-foreground-rocks.svg"
        parallaxFactor={26}
        className="layer-foreground"
      />
      {revealed && revealed.events.length > 0 && (
        <div className="storm-banner">
          <span className="storm-banner-source">Real data: NASA DONKI (archived data)</span>
          <span className="storm-banner-label">{revealed.events[0].label}</span>
        </div>
      )}
    </div>
  )
}
