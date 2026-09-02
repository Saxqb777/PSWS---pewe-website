/**
 * A tinted plate of the view at Pewe — the masjid seen across the paddy,
 * the Sahyadri ridges behind it, coconut palms, the compound wall in front.
 *
 * Drawn the way a letterhead engraving is drawn: ONE ink, laid at
 * different densities to make distance. Nothing here is a second colour
 * except the brass on the masjid's own trim — which is the colour the
 * building is actually painted. That restraint is what keeps it from
 * reading as clip art.
 *
 * viewBox 1600 × 1000 on every layer, so the parallax rig can move them
 * independently and photographs can replace them one for one.
 */

const INK = "#3A3025";        // the single ink
const PAPER = "#F4EFE6";
const RENDER = "#F8F5EE";     // the masjid's lime render, lighter than paper
const BRASS = "#C9A063";
const BRASS_DK = "#9C7436";

/** Ink at a given density. */
const ink = (a: number) => ({ fill: INK, fillOpacity: a });

/** Pointed arch, as on the masjid windows. */
function arch(x: number, y: number, w: number, h: number) {
  const spring = y + h * 0.44;
  const r = w * 0.66;
  return `M ${x} ${y + h} L ${x} ${spring} A ${r} ${r} 0 0 1 ${x + w / 2} ${y} A ${r} ${r} 0 0 1 ${x + w} ${spring} L ${x + w} ${y + h} Z`;
}

/** A coconut frond: springs from the crown, arcs out, droops, tapers. */
function frond(tx: number, ty: number, deg: number, len: number) {
  const a = (deg * Math.PI) / 180;
  const ex = tx + Math.cos(a) * len;
  const ey = ty + Math.sin(a) * len + len * 0.42;
  const cx = tx + Math.cos(a) * len * 0.55;
  const cy = ty + Math.sin(a) * len * 0.55 - len * 0.14;
  return `M ${tx} ${ty} Q ${cx} ${cy} ${ex} ${ey} Q ${cx + 6} ${cy + len * 0.22} ${tx} ${ty + 7} Z`;
}


/** A scalloped treeline — how an engraver indicates a wooded slope. */
function canopy(pts: [number, number][], floor: number) {
  let d = `M ${pts[0][0]} ${floor}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const mid = (x1 + x2) / 2;
    d += ` L ${x1} ${y1} Q ${mid} ${Math.min(y1, y2) - 16} ${x2} ${y2}`;
  }
  d += ` L ${pts[pts.length - 1][0]} ${floor} Z`;
  return d;
}

/* ================= 1 — SKY ================= */

export function LayerSky() {
  return (
    <g>
      <rect x="0" y="0" width="1600" height="1000" fill={PAPER} />
      {/* Ruling, tightening toward the horizon the way a sky is engraved */}
      {Array.from({ length: 34 }, (_, i) => (
        <line key={i} x1="0" y1={300 + i * 19} x2="1600" y2={300 + i * 19}
          stroke={INK} strokeWidth="0.8" opacity={0.016 + i * 0.0042} />
      ))}
      {/* Cumulus, drawn as reserved (unruled) paper with a soft edge */}
      <g fill={PAPER}>
        <path d="M 900 404 q 30 -60 94 -50 q 34 -58 108 -42 q 68 -38 120 18 q 70 -8 78 58 q 52 14 38 60 l -462 0 q -30 -24 -10 -44 z" />
        <path d="M 120 330 q 22 -42 74 -38 q 30 -40 86 -26 q 54 -30 94 16 q 54 -4 58 42 l -322 12 z" />
        <path d="M 1300 512 q 24 -38 74 -30 q 38 -34 86 4 q 48 2 48 44 l -216 0 z" />
      </g>
      <g fill="none" stroke={INK} strokeOpacity="0.1" strokeWidth="1.4">
        <path d="M 900 404 q 30 -60 94 -50 q 34 -58 108 -42 q 68 -38 120 18 q 70 -8 78 58 q 52 14 38 60" />
        <path d="M 120 330 q 22 -42 74 -38 q 30 -40 86 -26 q 54 -30 94 16 q 54 -4 58 42" />
      </g>
    </g>
  );
}

/* ================= 2 — FAR RIDGES ================= */
/* Rounded, plateau-shouldered — the Sahyadri, not alpine peaks.        */

export function LayerRidge() {
  return (
    <g>
      <path {...ink(0.13)}
        d="M 0 690 C 130 636 250 626 360 662 C 470 696 540 586 660 580
           C 790 574 860 656 990 640 C 1120 624 1200 556 1320 570
           C 1440 584 1520 632 1600 614 L 1600 1010 L 0 1010 Z" />
      <path {...ink(0.2)}
        d="M 0 774 C 150 730 280 746 400 712 C 530 676 620 724 740 718
           C 880 710 950 654 1080 674 C 1210 694 1300 662 1420 676
           C 1500 686 1550 706 1600 698 L 1600 1010 L 0 1010 Z" />
      <g fill={PAPER} opacity="0.6">
        <ellipse cx="560" cy="716" rx="250" ry="24" />
        <ellipse cx="1160" cy="682" rx="280" ry="20" />
        <ellipse cx="140" cy="762" rx="180" ry="18" />
      </g>
      <path {...ink(0.3)}
        d="M 0 840 C 160 800 300 822 430 790 C 570 756 660 798 800 794
           C 940 790 1020 748 1150 768 C 1280 788 1380 760 1600 780
           L 1600 1030 L 0 1030 Z" />
    </g>
  );
}

/* ================= 3 — NEAR WOODED HILL ================= */

export function LayerHill() {
  const crest: [number, number][] = Array.from({ length: 42 }, (_, i) => [
    i * 40 - 20,
    848 + Math.sin(i * 0.7) * 22 + ((i * 29) % 17),
  ]);
  const front: [number, number][] = Array.from({ length: 54 }, (_, i) => [
    i * 31 - 20,
    896 + Math.sin(i * 0.9 + 2) * 16 + ((i * 23) % 13),
  ]);

  return (
    <g>
      <path {...ink(0.3)} d={canopy(crest, 1080)} />
      <path {...ink(0.24)} d={canopy(front, 1080)} />
    </g>
  );
}

/* ================= 4 — THE MASJID ================= */

export function LayerMasjid() {
  const bx = 812, by = 716, bw = 392, bh = 224;
  const base = by + bh; // 940 — the field line

  return (
    <g>
      {/* ---------- Tower, drum, dome ---------- */}
      <g>
        <rect x="726" y="668" width="82" height={base - 668} fill={RENDER} stroke={INK} strokeWidth="2" />
        <rect x="719" y="659" width="96" height="10" fill={BRASS} stroke={INK} strokeWidth="1.4" />
        <rect x="736" y="632" width="62" height="27" fill={RENDER} stroke={INK} strokeWidth="1.6" />
        <path d="M 732 632 Q 767 566 802 632 Z" fill={RENDER} stroke={INK} strokeWidth="2" />
        <path d="M 747 632 Q 767 588 787 632" fill="none" stroke={INK} strokeWidth="1" opacity="0.26" />
        {/* finial and crescent */}
        <line x1="767" y1="576" x2="767" y2="532" stroke={BRASS_DK} strokeWidth="3.4" />
        <circle cx="767" cy="549" r="6" fill={BRASS} stroke={INK} strokeWidth="1.2" />
        <path d="M 767 527 a 12 12 0 1 0 9 4 a 9.5 9.5 0 1 1 -9 -4 Z" fill={BRASS} stroke={INK} strokeWidth="1.1" />
        {/* the pierced jali screen, as on the real corner pillar */}
        <rect x="740" y="722" width="54" height="176" fill={BRASS} stroke={INK} strokeWidth="1.6" />
        <g fill="none" stroke={RENDER} strokeWidth="2.2">
          {Array.from({ length: 6 }, (_, r) =>
            Array.from({ length: 2 }, (_, c) => (
              <g key={`${r}-${c}`}>
                <rect x={745 + c * 25} y={728 + r * 28} width={18} height={20} />
                <rect x={751 + c * 25} y={734 + r * 28} width={7} height={8} />
              </g>
            ))
          )}
        </g>
        <rect x="719" y={base - 15} width="96" height="15" fill={INK} fillOpacity="0.55" />
      </g>

      {/* ---------- Main two-storey block ---------- */}
      <rect x={bx} y={by} width={bw} height={bh} fill={RENDER} stroke={INK} strokeWidth="2" />

      {/* Sheet roof with the deep overhang from the photograph */}
      <path d={`M ${bx - 30} ${by} L ${bx + 36} ${by - 38} L ${bx + bw + 24} ${by - 38} L ${bx + bw + 20} ${by} Z`}
        fill={INK} fillOpacity="0.6" stroke={INK} strokeWidth="2" />
      {Array.from({ length: 18 }, (_, i) => (
        <line key={i} x1={bx + 36 + i * 24} y1={by - 38} x2={bx - 30 + i * 24} y2={by}
          stroke={PAPER} strokeWidth="1" opacity="0.3" />
      ))}

      {/* Arcade of small arches under the roofline */}
      <rect x={bx} y={by} width={bw} height="24" fill={BRASS} stroke={INK} strokeWidth="1.2" />
      <g fill={RENDER} stroke={INK} strokeWidth="0.9">
        {Array.from({ length: 17 }, (_, i) => (
          <path key={i} d={arch(bx + 8 + i * 22.5, by + 6, 15, 16)} />
        ))}
      </g>

      {/* Two storeys of pointed windows — the openings read dark, as openings do */}
      {[0, 1].map((row) => {
        const y = by + 48 + row * 92;
        return (
          <g key={row}>
            {Array.from({ length: 4 }, (_, i) => {
              const w = 44, x = bx + 30 + i * 93;
              return (
                <g key={i}>
                  <path d={arch(x - 5, y - 5, w + 10, 74)} fill={BRASS} stroke={INK} strokeWidth="1.2" />
                  <path d={arch(x, y, w, 66)} fill={INK} fillOpacity="0.86" stroke={INK} strokeWidth="1.2" />
                  <line x1={x + w / 2} y1={y + 12} x2={x + w / 2} y2={y + 66} stroke={RENDER} strokeWidth="1.2" opacity="0.62" />
                  <line x1={x + 4} y1={y + 40} x2={x + w - 4} y2={y + 40} stroke={RENDER} strokeWidth="1.2" opacity="0.62" />
                </g>
              );
            })}
            {Array.from({ length: 3 }, (_, i) => (
              <rect key={i} x={bx + 80 + i * 93} y={y - 12} width="9" height="92"
                fill={BRASS} opacity="0.6" />
            ))}
          </g>
        );
      })}

      <rect x={bx} y={by + 132} width={bw} height="7" fill={BRASS_DK} opacity="0.8" />
      <rect x={bx} y={base - 15} width={bw} height="15" fill={INK} fillOpacity="0.55" />

      {/* Shaded return, so the block turns a corner */}
      <path d={`M ${bx + bw} ${by} L ${bx + bw + 20} ${by} L ${bx + bw + 20} ${base} L ${bx + bw} ${base} Z`}
        fill={INK} fillOpacity="0.16" stroke={INK} strokeWidth="1.6" />
    </g>
  );
}

/* ================= 5 — PALMS ================= */

export function LayerPalms() {
  const palms = [
    { x: 1300, y: 968, h: 218, lean: 20, len: 58 },
    { x: 1412, y: 972, h: 174, lean: -16, len: 50 },
    { x: 1524, y: 964, h: 202, lean: 14, len: 55 },
    { x: 252,  y: 978, h: 190, lean: -18, len: 53 },
    { x: 118,  y: 982, h: 154, lean: 12, len: 46 },
    { x: 560,  y: 962, h: 138, lean: -10, len: 40 },
  ];

  return (
    <g fill={INK} fillOpacity="0.78">
      {palms.map((p, i) => {
        const tx = p.x + p.lean * 1.8;
        const ty = p.y - p.h;
        return (
          <g key={i}>
            {/* trunk, tapering and leaning */}
            <path
              d={`M ${p.x - 7} ${p.y} Q ${p.x + p.lean * 0.7 - 4} ${p.y - p.h * 0.5} ${tx - 4} ${ty}
                  L ${tx + 4} ${ty} Q ${p.x + p.lean * 0.7 + 5} ${p.y - p.h * 0.5} ${p.x + 7} ${p.y} Z`}
            />
            {/* fronds: a full crown, drooping */}
            {Array.from({ length: 9 }, (_, f) => (
              <path key={f} d={frond(tx, ty, -172 + f * 21.5, p.len + ((f * 7) % 14))} />
            ))}
            <circle cx={tx} cy={ty + 3} r="7" />
          </g>
        );
      })}
    </g>
  );
}

/* ================= 6 — FIELD & COMPOUND WALL ================= */

export function LayerField() {
  return (
    <g>
      {/* The paddy: ruled, denser toward the viewer */}
      <path {...ink(0.17)} d="M 0 962 L 1600 934 L 1600 1140 L 0 1174 Z" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i}
          d={`M 0 ${982 + i * 20} C 440 ${974 + i * 20} 1160 ${960 + i * 20} 1600 ${952 + i * 20}`}
          stroke={INK} strokeWidth="1.1" fill="none" opacity={0.05 + i * 0.014} />
      ))}
      {/* The bund dividing the paddy */}
      <path {...ink(0.11)}
        d="M 0 1104 C 460 1082 1120 1066 1600 1052 L 1600 1072 C 1120 1086 460 1104 0 1124 Z" />

      {/* The laterite compound wall across the foreground */}
      <path {...ink(0.44)} d="M 0 1152 L 1600 1116 L 1600 1250 L 0 1250 Z" />
      <path {...ink(0.28)} d="M 0 1152 L 1600 1116 L 1600 1134 L 0 1170 Z" />
      <g stroke={PAPER} strokeWidth="1.4" opacity="0.15">
        <line x1="0" y1="1196" x2="1600" y2="1160" />
        {Array.from({ length: 34 }, (_, c) => (
          <line key={c} x1={c * 48} y1={1170 - c * 1.12} x2={c * 48} y2="1250" />
        ))}
      </g>
    </g>
  );
}
