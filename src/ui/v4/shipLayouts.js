/** Visual-only hatch geometry, shared by ship art and interactive drop targets.
 * Pixel coordinates are in each ship's fixed 1200×760 SVG viewBox.
 */
import layouts from './ship-layouts.json' with { type: 'json' };
export const SHIP_DECK_LAYOUTS = Object.freeze(layouts);
export const SHIP_VIEWBOX = Object.freeze({ width: 1200, height: 760 });
export function shipHatchStyle(shipId, roomId) {
  const box = layouts[shipId]?.rooms?.[roomId];
  if (!box) throw new Error(`Unknown ship compartment: ${shipId}/${roomId}`);
  return {
    left: `${100 * box.x / SHIP_VIEWBOX.width}%`,
    top: `${100 * box.y / SHIP_VIEWBOX.height}%`,
    width: `${100 * box.w / SHIP_VIEWBOX.width}%`,
    height: `${100 * box.h / SHIP_VIEWBOX.height}%`,
  };
}
