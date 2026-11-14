// Layer 5 (§7.1): shield dome, storm glow, dust. All sub-effects here are driven purely
// by CSS custom properties set on the .scene ancestor (Scene.jsx) — this component reads
// no state itself and contains no game rules (§8.2, C10 spirit).
export function EffectsLayer() {
  return (
    <div className="scene-layer layer-effects" aria-hidden="true">
      <img src="/art/layer-5-plants.svg" alt="" draggable={false} className="effect-plants" />
      <img src="/art/layer-5-shield-dome.svg" alt="" draggable={false} className="effect-shield-dome" />
      <div className="effect-distant-glow" />
      <div className="effect-storm-overlay" />
      <div className="effect-night-tint" />
      <div className="effect-low-air-pulse" />
    </div>
  )
}
