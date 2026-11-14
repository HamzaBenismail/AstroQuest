// A single art layer: a same-size transparent image, parallax factor sets how much it
// moves relative to the mouse-position CSS variable set by Scene.jsx (§7.1/§7.3).
// Decorative only — aria-hidden, no information lives only here.
export function Layer({ src, parallaxFactor, className = '' }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`scene-layer ${className}`}
      style={{ '--parallax-factor': parallaxFactor }}
    />
  )
}
