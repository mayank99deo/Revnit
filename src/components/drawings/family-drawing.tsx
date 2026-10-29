import type { ReactNode } from "react";

/*
 * Elevation and plan line drawings used until a family has an uploaded render.
 * Drawn on a 320 × 220 sheet with drafting-style dimension strings.
 */

function Dim({ x1, x2, y, label, ext = 10 }: { x1: number; x2: number; y: number; label: string; ext?: number }) {
  const mid = (x1 + x2) / 2;
  return (
    <g className="text-graphite" strokeWidth={0.75}>
      <line x1={x1} y1={y - ext} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - ext} x2={x2} y2={y + 4} />
      <line x1={x1 - 6} y1={y} x2={x2 + 6} y2={y} />
      <line x1={x1 - 3} y1={y + 3} x2={x1 + 3} y2={y - 3} strokeWidth={1.25} />
      <line x1={x2 - 3} y1={y + 3} x2={x2 + 3} y2={y - 3} strokeWidth={1.25} />
      <text x={mid} y={y - 4} textAnchor="middle" fontSize={9} fill="currentColor" stroke="none">
        {label}
      </text>
    </g>
  );
}

function VDim({ y1, y2, x, label, ext = 10 }: { y1: number; y2: number; x: number; label: string; ext?: number }) {
  const mid = (y1 + y2) / 2;
  return (
    <g className="text-graphite" strokeWidth={0.75}>
      <line x1={x - 4} y1={y1} x2={x + ext} y2={y1} />
      <line x1={x - 4} y1={y2} x2={x + ext} y2={y2} />
      <line x1={x} y1={y1 - 6} x2={x} y2={y2 + 6} />
      <line x1={x - 3} y1={y1 + 3} x2={x + 3} y2={y1 - 3} strokeWidth={1.25} />
      <line x1={x - 3} y1={y2 + 3} x2={x + 3} y2={y2 - 3} strokeWidth={1.25} />
      <text
        x={x - 5}
        y={mid}
        textAnchor="middle"
        fontSize={9}
        fill="currentColor"
        stroke="none"
        transform={`rotate(-90 ${x - 5} ${mid})`}
      >
        {label}
      </text>
    </g>
  );
}

/** A host surface (ceiling, wall, ground) shown with short hatch strokes behind it. */
function Host({ x1, x2, y, side = "up" }: { x1: number; x2: number; y: number; side?: "up" | "down" }) {
  const strokes = [];
  for (let x = x1 + 4; x < x2; x += 8) {
    strokes.push(<line key={x} x1={x} y1={y} x2={x + 6} y2={side === "up" ? y - 6 : y + 6} strokeWidth={0.75} />);
  }
  return (
    <g className="text-trace">
      <line x1={x1} y1={y} x2={x2} y2={y} strokeWidth={1.25} className="text-line" stroke="currentColor" />
      {strokes}
    </g>
  );
}

const drawings: Record<string, ReactNode> = {
  downlight: (
    <>
      <Host x1={30} x2={290} y={86} />
      <path d="M118 86 L124 44 L196 44 L202 86" />
      {[136, 148, 160, 172, 184].map((x) => (
        <line key={x} x1={x} y1={44} x2={x} y2={30} />
      ))}
      <rect x={104} y={86} width={112} height={6} />
      <path d="M128 92 L96 178 M192 92 L224 178" strokeDasharray="4 4" className="text-trace" />
      <Dim x1={116} x2={204} y={204} label="Ø150 cut-out" ext={110} />
    </>
  ),
  linear: (
    <>
      <Host x1={20} x2={300} y={36} />
      <line x1={70} y1={36} x2={70} y2={120} />
      <line x1={250} y1={36} x2={250} y2={120} />
      <rect x={30} y={120} width={260} height={16} />
      {[95, 160, 225].map((x) => (
        <line key={x} x1={x} y1={120} x2={x} y2={136} strokeDasharray="2 3" />
      ))}
      <line x1={30} y1={131} x2={290} y2={131} strokeWidth={0.75} />
      <Dim x1={30} x2={95} y={168} label="1200 module" ext={30} />
      <VDim y1={36} y2={120} x={292} label="drop" ext={-30} />
    </>
  ),
  panel: (
    <>
      <path d="M40 40 H280 M40 180 H280 M70 20 V200 M250 20 V200" className="text-trace" strokeWidth={0.75} />
      <rect x={90} y={40} width={140} height={140} />
      <rect x={100} y={50} width={120} height={120} />
      <path d="M100 50 L220 170 M220 50 L100 170" strokeDasharray="3 4" className="text-trace" />
      <Dim x1={90} x2={230} y={206} label="595" ext={20} />
    </>
  ),
  exit: (
    <>
      <Host x1={40} x2={280} y={40} />
      <line x1={160} y1={40} x2={160} y2={62} />
      <rect x={80} y={62} width={160} height={84} />
      <rect x={88} y={70} width={144} height={68} />
      <path d="M112 128 V84 H138 V128" />
      <circle cx={162} cy={88} r={5} />
      <path d="M162 94 L158 112 L150 126 M158 112 L168 124 M160 100 L172 106 M160 100 L150 104" />
      <path d="M186 104 H216 M206 94 L216 104 L206 114" />
      <Dim x1={80} x2={240} y={182} label="350" ext={36} />
    </>
  ),
  highbay: (
    <>
      <Host x1={60} x2={260} y={26} />
      <line x1={160} y1={26} x2={160} y2={60} strokeDasharray="5 3" />
      <circle cx={160} cy={64} r={4} />
      <rect x={136} y={68} width={48} height={34} />
      {[142, 150, 158, 166, 174].map((x) => (
        <line key={x} x1={x} y1={68} x2={x} y2={102} strokeWidth={0.75} />
      ))}
      <path d="M132 102 C 120 130, 92 150, 88 168 H232 C 228 150, 200 130, 188 102 Z" />
      <path d="M88 168 L64 206 M232 168 L256 206" strokeDasharray="4 4" className="text-trace" />
      <Dim x1={88} x2={232} y={196} label="Ø330" ext={26} />
    </>
  ),
  db: (
    <>
      <rect x={104} y={22} width={112} height={164} />
      <rect x={112} y={30} width={96} height={148} />
      <rect x={120} y={64} width={80} height={30} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={123 + i * 9.6} y={70} width={7} height={18} strokeWidth={0.75} />
      ))}
      <rect x={120} y={104} width={80} height={30} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={123 + i * 9.6} y={110} width={7} height={18} strokeWidth={0.75} />
      ))}
      <rect x={196} y={96} width={6} height={14} />
      <rect x={120} y={178} width={80} height={8} className="text-graphite" />
      <Dim x1={104} x2={216} y={208} label="450" ext={18} />
      <VDim y1={22} y2={186} x={244} label="680" ext={-24} />
    </>
  ),
  lvpanel: (
    <>
      <Host x1={20} x2={300} y={190} side="down" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={40 + i * 60} y={30} width={60} height={160} />
          <rect x={46 + i * 60} y={38} width={48} height={i === 0 ? 70 : 44} />
          {i > 0 && <rect x={46 + i * 60} y={88} width={48} height={44} />}
          {[150, 156, 162, 168].map((y) => (
            <line key={y} x1={54 + i * 60} y1={y} x2={86 + i * 60} y2={y} strokeWidth={0.75} />
          ))}
        </g>
      ))}
      <rect x={56} y={56} width={28} height={34} />
      <line x1={70} y1={62} x2={70} y2={84} />
      <Dim x1={40} x2={100} y={16} label="800" ext={-10} />
    </>
  ),
  transformer: (
    <>
      <Host x1={20} x2={300} y={190} side="down" />
      <rect x={100} y={70} width={120} height={112} />
      <rect x={92} y={182} width={136} height={8} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <line x1={58 + i * 6} y1={84} x2={58 + i * 6} y2={170} strokeWidth={0.75} />
          <line x1={232 + i * 6} y1={84} x2={232 + i * 6} y2={170} strokeWidth={0.75} />
        </g>
      ))}
      <path d="M56 84 H100 M56 170 H100 M220 84 H266 M220 170 H266" strokeWidth={0.75} />
      <rect x={120} y={36} width={80} height={22} rx={11} />
      <line x1={160} y1={58} x2={160} y2={70} />
      {[124, 144, 164].map((x) => (
        <path key={x} d={`M${x} 70 V56 M${x - 4} 56 H${x + 4} M${x - 3} 52 H${x + 3} M${x - 2} 48 H${x + 2}`} strokeWidth={0.9} />
      ))}
      <Dim x1={56} x2={266} y={212} label="2100" ext={22} />
    </>
  ),
  tray: (
    <>
      <path d="M30 70 H150 A80 80 0 0 1 230 150 V210" />
      <path d="M30 120 H150 A30 30 0 0 1 180 150 V210" />
      {[45, 65, 85, 105, 125].map((x) => (
        <line key={x} x1={x} y1={70} x2={x} y2={120} strokeWidth={0.75} />
      ))}
      {[0.25, 0.5, 0.75].map((t) => {
        const a = (Math.PI / 2) * t;
        return (
          <line
            key={t}
            x1={150 + Math.sin(a) * 80}
            y1={150 - Math.cos(a) * 80}
            x2={150 + Math.sin(a) * 30}
            y2={150 - Math.cos(a) * 30}
            strokeWidth={0.75}
          />
        );
      })}
      {[170, 190].map((y) => (
        <line key={y} x1={180} y1={y} x2={230} y2={y} strokeWidth={0.75} />
      ))}
      <circle cx={150} cy={150} r={1.5} />
      <VDim y1={70} y2={120} x={22} label="300" ext={8} />
      <text x={196} y={118} fontSize={9} fill="currentColor" stroke="none" className="text-graphite">
        R300
      </text>
    </>
  ),
  conduit: (
    <>
      <circle cx={180} cy={100} r={34} />
      <circle cx={180} cy={100} r={26} strokeWidth={0.75} />
      {[0, 90, 180, 270].map((deg) => (
        <circle
          key={deg}
          cx={180 + Math.cos((deg * Math.PI) / 180) * 34}
          cy={100 + Math.sin((deg * Math.PI) / 180) * 34}
          r={3}
        />
      ))}
      <path d="M30 92 H146 M30 108 H146" />
      <path d="M172 134 V160 A30 30 0 0 1 142 190 H40 M188 134 V160 A46 46 0 0 1 142 206 H40" />
      <path d="M214 92 H296 M214 108 H296" />
      <VDim y1={92} y2={108} x={22} label="25" ext={8} />
    </>
  ),
  switch: (
    <>
      <Host x1={20} x2={300} y={40} />
      <rect x={58} y={70} width={204} height={84} />
      <rect x={66} y={78} width={188} height={68} strokeWidth={0.75} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <line x1={66 + i * 31.3} y1={78} x2={66 + i * 31.3} y2={146} strokeWidth={0.75} />
          {i < 4 ? (
            <rect x={73 + i * 31.3} y={92} width={17} height={40} />
          ) : (
            <g>
              <circle cx={89 + i * 31.3} cy={104} r={3} />
              <circle cx={83 + i * 31.3} cy={118} r={3} />
              <circle cx={95 + i * 31.3} cy={118} r={3} />
            </g>
          )}
        </g>
      ))}
      <Dim x1={58} x2={262} y={186} label="196" ext={30} />
    </>
  ),
  socket: (
    <>
      <rect x={96} y={36} width={128} height={128} />
      <rect x={104} y={44} width={112} height={112} strokeWidth={0.75} />
      <circle cx={160} cy={84} r={7} />
      <circle cx={140} cy={118} r={5} />
      <circle cx={180} cy={118} r={5} />
      <rect x={194} y={58} width={12} height={22} />
      <Dim x1={96} x2={224} y={196} label="86" ext={30} />
    </>
  ),
  detector: (
    <>
      <circle cx={160} cy={110} r={88} strokeDasharray="5 5" className="text-trace" />
      <circle cx={160} cy={110} r={16} />
      <circle cx={160} cy={110} r={9} strokeWidth={0.75} />
      <circle cx={160} cy={110} r={2} />
      <line x1={160} y1={110} x2={222} y2={48} strokeWidth={0.75} className="text-graphite" />
      <text x={196} y={70} fontSize={9} fill="currentColor" stroke="none" className="text-graphite">
        R7500
      </text>
    </>
  ),
  callpoint: (
    <>
      <rect x={108} y={52} width={104} height={104} />
      <rect x={124} y={68} width={72} height={72} />
      <circle cx={160} cy={104} r={14} />
      <path d="M152 112 L168 96" />
      <path d="M130 74 L146 74 M130 74 L130 90" strokeWidth={0.75} className="text-graphite" />
      <Dim x1={108} x2={212} y={190} label="87" ext={34} />
    </>
  ),
  busbar: (
    <>
      <rect x={20} y={110} width={200} height={34} />
      {[80, 150].map((x) => (
        <rect key={x} x={x - 4} y={104} width={8} height={46} />
      ))}
      <path d="M220 110 H250 V40 M220 144 H284 V40" />
      <rect x={244} y={36} width={46} height={8} />
      <rect x={40} y={36} width={60} height={50} className="text-graphite" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={48 + i * 12} y={44} width={8} height={34} strokeWidth={0.75} />
      ))}
      <VDim y1={110} y2={144} x={12} label="205" ext={6} />
    </>
  ),
  generator: (
    <>
      <Host x1={10} x2={310} y={186} side="down" />
      <rect x={30} y={78} width={260} height={100} />
      <rect x={24} y={178} width={272} height={8} />
      {[90, 100, 110, 120, 130, 140, 150, 160].map((y) => (
        <line key={y} x1={42} y1={y} x2={88} y2={y} strokeWidth={0.75} />
      ))}
      <path d="M110 86 V170 M170 86 V170 M230 86 V170" strokeWidth={0.75} />
      <path d="M250 78 V44 H270 V52" />
      <rect x={244} y={64} width={18} height={14} />
      <Dim x1={30} x2={290} y={208} label="4200" ext={22} />
    </>
  ),
  ev: (
    <>
      <line x1={70} y1={20} x2={70} y2={190} strokeWidth={1.25} />
      {[30, 50, 70, 90, 110, 130, 150, 170].map((y) => (
        <line key={y} x1={70} y1={y} x2={62} y2={y + 8} strokeWidth={0.75} className="text-trace" />
      ))}
      <Host x1={70} x2={300} y={190} side="down" />
      <rect x={70} y={70} width={48} height={70} />
      <rect x={80} y={80} width={28} height={16} strokeWidth={0.75} />
      <path d="M118 120 C 160 140, 120 180, 180 176 C 230 172, 220 150, 250 154" />
      <rect x={250} y={148} width={16} height={10} />
      <VDim y1={105} y2={190} x={40} label="1100" ext={26} />
    </>
  ),
  tag: (
    <>
      <circle cx={92} cy={140} r={18} />
      <path d="M79 127 L105 153 M105 127 L79 153" />
      <path d="M108 128 L168 82 H186" strokeWidth={0.75} />
      <rect x={186} y={66} width={92} height={32} rx={16} />
      <text x={232} y={86} textAnchor="middle" fontSize={12} fill="currentColor" stroke="none" fontWeight={600}>
        L1-03
      </text>
      <rect x={186} y={118} width={92} height={32} />
      <text x={232} y={138} textAnchor="middle" fontSize={12} fill="currentColor" stroke="none" fontWeight={600}>
        DB-2A
      </text>
    </>
  ),
  earth: (
    <>
      <Host x1={20} x2={300} y={60} side="down" />
      <rect x={120} y={56} width={80} height={6} />
      <path d="M124 62 V110 H196 V62" />
      <line x1={160} y1={80} x2={160} y2={206} strokeWidth={2} />
      <line x1={160} y1={110} x2={160} y2={206} strokeDasharray="6 4" className="text-blueprint" strokeWidth={1} />
      <rect x={150} y={84} width={20} height={10} />
      <VDim y1={62} y2={206} x={240} label="3000" ext={-40} />
    </>
  ),
};

const fallback = (
  <>
    <path d="M160 40 L240 80 L240 160 L160 200 L80 160 L80 80 Z" />
    <path d="M80 80 L160 120 L240 80 M160 120 V200" />
  </>
);

export function FamilyDrawing({ kind, className }: { kind: string | null; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 220"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(kind && drawings[kind]) || fallback}
    </svg>
  );
}

export const DRAWING_KINDS = Object.keys(drawings);
