/**
 * Inline stroke icons for the mission UI. No emoji, no icon font, no network request.
 * Every icon inherits `currentColor` so a parent rule sets the colour.
 * Decorative by default; pass a `label` to expose one to assistive technology.
 */

function Svg({ size = 20, label, children }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' };
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...a11y}>
      {children}
    </svg>
  );
}

export function IconAir(props) {
  return <Svg {...props}>
    <path d="M9 5a2 2 0 1 1 2 2H4"/><path d="M15 10a2.5 2.5 0 1 1 2.5 2.5H5"/><path d="M11 19a2 2 0 1 0 2-2H4"/>
  </Svg>;
}

export function IconSupplies(props) {
  return <Svg {...props}>
    <path d="M4 8.5 12 5l8 3.5v7L12 19l-8-3.5Z"/><path d="M4 8.5l8 3.5 8-3.5"/><path d="M12 12v7"/>
  </Svg>;
}

export function IconSafety(props) {
  return <Svg {...props}>
    <path d="M12 4l7 2.5V12c0 4-2.8 6.8-7 8-4.2-1.2-7-4-7-8V6.5Z"/><path d="M9.3 12.2l2 2 3.5-4"/>
  </Svg>;
}

export function IconGreenhouse(props) {
  return <Svg {...props}>
    <path d="M12 20v-7"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6Z"/><path d="M12 15c0-3.4-2.6-5-6-5 0 3.4 2.6 5 6 5Z"/>
  </Svg>;
}

export function IconBolt(props) {
  return <Svg {...props}><path d="M13 3 6 13h5l-1 8 8-11h-5Z"/></Svg>;
}

export function IconScience(props) {
  return <Svg {...props}>
    <path d="M10 3h4M11 3v7L6.5 18a2 2 0 0 0 1.8 3h7.4a2 2 0 0 0 1.8-3L13 10V3"/><path d="M8.2 15h7.6"/>
  </Svg>;
}

export function IconShield(props) {
  return <Svg {...props}><path d="M12 3.5 19 6v6c0 4.2-3 7-7 8.5C8 19 5 16.2 5 12V6Z"/><path d="M12 8v5"/></Svg>;
}

export function IconComms(props) {
  return <Svg {...props}>
    <path d="M12 20v-7"/><path d="M7 13a5 5 0 0 1 10 0Z"/><path d="M4 11a8 8 0 0 1 16 0"/>
  </Svg>;
}

export function IconBattery(props) {
  return <Svg {...props}><rect x="3" y="8" width="15" height="9" rx="2.5"/><path d="M21 11.5v2"/></Svg>;
}

export function IconWarning(props) {
  return <Svg {...props}><path d="M12 4.5 21 19.5H3Z"/><path d="M12 10v4M12 16.8h.01"/></Svg>;
}

export function IconAlert(props) {
  return <Svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16.2h.01"/></Svg>;
}

export function IconInfo(props) {
  return <Svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></Svg>;
}

export function IconCheck(props) {
  return <Svg {...props}><path d="M20 6 9 17l-5-5"/></Svg>;
}

export function IconArrowRight(props) {
  return <Svg {...props}><path d="M5 12h13M12 5.5 18.5 12 12 18.5"/></Svg>;
}

export function IconArrowLeft(props) {
  return <Svg {...props}><path d="M19 12H6M12 5.5 5.5 12 12 18.5"/></Svg>;
}

export function IconArrowUp(props) {
  return <Svg {...props}><path d="M12 19V5M6 11l6-6 6 6"/></Svg>;
}

export function IconArrowDown(props) {
  return <Svg {...props}><path d="M12 5v14M6 13l6 6 6-6"/></Svg>;
}

export function IconClock(props) {
  return <Svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></Svg>;
}

export function IconReplay(props) {
  return <Svg {...props}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5V10h5.5"/></Svg>;
}

export function IconEva(props) {
  return <Svg {...props}>
    <path d="M12 3.5v7M8.5 7 12 3.5 15.5 7"/><path d="M5 13.5c3.5 2 10.5 2 14 0"/><path d="M6 20.5h12"/>
  </Svg>;
}

export function IconHatch(props) {
  return <Svg {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4.5"/>
    <path d="M12 7.5v-2M12 18.5v-2M7.5 12h-2M18.5 12h-2"/>
  </Svg>;
}

export function IconPatch(props) {
  const { size = 20, label } = props;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' };
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 40 40" fill="none" {...a11y}>
      <path d="M20 2.5 35.5 11v18L20 37.5 4.5 29V11Z" fill="var(--hull)" stroke="var(--cyan)" strokeWidth="1.6"/>
      <circle cx="20" cy="20" r="7.5" stroke="var(--amber)" strokeWidth="1.6"/>
      <path d="M20 12.5a7.5 7.5 0 0 0 0 15 9 9 0 0 1 0-15Z" fill="var(--amber)"/>
      <ellipse cx="20" cy="20" rx="13" ry="4.6" stroke="var(--cyan)" strokeWidth="1.3"
        transform="rotate(-24 20 20)"/>
    </svg>
  );
}

export const ROOM_ICONS = {
  lifeSupport: IconAir,
  greenhouse: IconGreenhouse,
  power: IconBolt,
  science: IconScience,
  shield: IconShield,
  comms: IconComms,
};

export const METER_ICONS = {
  air: IconAir,
  supplies: IconSupplies,
  safety: IconSafety,
};
