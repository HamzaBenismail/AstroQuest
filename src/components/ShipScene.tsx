import { useCallback, useEffect, useState } from 'react';
import { Application, extend } from '@pixi/react';
import { Assets, Graphics, Sprite, Texture } from 'pixi.js';
import { useMissionStore } from '../store/useMissionStore';
import type { RoomId } from '../game/types';

extend({ Graphics, Sprite });

const rooms: { id: RoomId; x: number; y: number; w: number; h: number }[] = [
  { id: 'greenhouse', x: 91, y: 177, w: 294, h: 135 },
  { id: 'communications', x: 395, y: 177, w: 294, h: 135 },
  { id: 'science', x: 700, y: 177, w: 294, h: 135 },
  { id: 'reactor', x: 91, y: 343, w: 294, h: 156 },
  { id: 'lifeSupport', x: 395, y: 343, w: 294, h: 156 },
  { id: 'shelter', x: 700, y: 343, w: 294, h: 156 },
];

function RoomHotspot({ room }: { room: typeof rooms[number] }) {
  const selected = useMissionStore((state) => state.selectedRoom === room.id);
  const select = useMissionStore((state) => state.selectRoom);
  const [hover, setHover] = useState(false);
  const draw = useCallback((g: Graphics) => {
    g.clear();
    g.rect(room.x, room.y, room.w, room.h).fill({ color: 0x74cfe1, alpha: selected ? 0.045 : hover ? 0.08 : 0.0001 });
    if (selected || hover) {
      const c = selected ? 0x8ce4ef : 0x7fa7bc;
      g.rect(room.x + 1, room.y + 1, room.w - 2, room.h - 2).stroke({ color: c, width: selected ? 3 : 2, alpha: selected ? 0.95 : 0.6 });
      const bx = room.x + 12; const by = room.y + room.h - 12;
      g.moveTo(bx, by).lineTo(bx + 34, by).stroke({ color: c, width: 2, alpha: 0.9 });
    }
  }, [hover, selected, room]);

  return (
    <pixiGraphics draw={draw} eventMode="static" cursor="pointer"
      onPointerTap={() => select(room.id)}
      onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)} />
  );
}

function ShipGraphic() {
  const [texture, setTexture] = useState<Texture | null>(null);
  const day = useMissionStore((state) => state.day);
  const drawFallback = useCallback((g: Graphics) => {
    g.clear().rect(0, 0, 1100, 600).fill(0x0b1724);
  }, []);
  const drawStorm = useCallback((g: Graphics) => {
    g.clear();
    if (day === 3) {
      g.rect(53, 133, 968, 379).stroke({ color: 0xef8e70, width: 3, alpha: 0.5 });
      g.rect(54, 135, 966, 375).fill({ color: 0xff6c4c, alpha: 0.035 });
    }
  }, [day]);
  useEffect(() => {
    let active = true;
    Assets.load<Texture>('/ship.svg').then((t) => {
      if (active) setTexture(t);
    }).catch((error) => console.error('Failed to load ship illustration', error));
    return () => { active = false; };
  }, []);

  return (
    <>
      {texture ? <pixiSprite texture={texture} width={1100} height={600} /> : <pixiGraphics draw={drawFallback} />}
      <pixiGraphics draw={drawStorm} />
      {rooms.map((room) => <RoomHotspot key={room.id} room={room} />)}
    </>
  );
}

export default function ShipScene() {
  return (
    <div className="ship-canvas" role="group" aria-label="Clickable diagram of six habitat rooms">
      <Application width={1100} height={600} backgroundColor={0x09111d} antialias={true} resolution={1}>
        <ShipGraphic />
      </Application>
    </div>
  );
}
