import { useState, useEffect, useRef, useCallback } from "react";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => Math.random() * (max - min) + min;
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

function fibSphere(count) {
  const pts = [], phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2, r = Math.sqrt(1 - y * y), t = phi * i;
    pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r });
  }
  return pts;
}

function proj3D(x, y, z, rx, ry, cx, cy, s) {
  const cY = Math.cos(ry), sY = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);
  const x1 = x * cY - z * sY, z1 = x * sY + z * cY;
  const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
  const p = 3 / (3 + z2);
  return { px: cx + x1 * s * p, py: cy + y1 * s * p, depth: z2, scale: p };
}

// ════════════════════════════════════════
// CONTINENT OUTLINE DATA (simplified world coastlines as lat/lon polylines)
// ════════════════════════════════════════
const CONTINENTS = [
  // North America
  [[-10,72],[-20,68],[-30,60],[-50,50],[-60,48],[-68,45],[-75,40],[-80,35],[-82,30],[-82,25],[-90,22],[-97,20],[-105,22],[-118,33],[-122,37],[-124,42],[-122,48],[-130,55],[-145,60],[-165,62],[-168,66],[-165,72],[-140,70],[-120,73],[-80,75],[-60,73],[-45,75],[-10,72]],
  // South America
  [[-80,10],[-77,8],[-72,12],[-62,11],[-55,6],[-50,3],[-48,-2],[-45,-6],[-40,-12],[-38,-16],[-40,-22],[-48,-28],[-53,-33],[-57,-38],[-68,-46],[-72,-50],[-75,-52],[-74,-45],[-70,-38],[-72,-30],[-70,-18],[-75,-10],[-78,-2],[-80,5],[-80,10]],
  // Europe
  [[-10,36],[0,38],[3,43],[0,48],[-5,48],[-10,52],[-5,58],[5,54],[10,55],[12,57],[15,56],[18,55],[22,55],[28,56],[30,60],[27,64],[25,68],[20,70],[15,68],[10,62],[5,60],[0,52],[-5,50],[-10,44],[-10,36]],
  // Africa
  [[-5,36],[10,37],[12,33],[20,32],[25,30],[33,30],[40,20],[50,12],[42,2],[40,-4],[35,-10],[40,-16],[37,-22],[32,-28],[28,-34],[20,-35],[15,-30],[12,-24],[10,-16],[8,-5],[5,5],[-5,5],[-10,6],[-18,15],[-17,22],[-13,28],[-5,36]],
  // Asia
  [[28,56],[32,50],[36,42],[40,38],[42,36],[48,30],[55,25],[60,24],[68,22],[72,20],[78,8],[80,12],[88,22],[92,20],[100,15],[105,12],[110,18],[115,22],[120,30],[125,35],[130,38],[132,35],[135,35],[140,38],[142,45],[135,50],[130,48],[120,50],[110,52],[90,55],[75,55],[65,55],[50,52],[40,48],[35,52],[28,56]],
  // Australia
  [[115,-14],[120,-15],[128,-16],[132,-12],[136,-12],[142,-14],[148,-18],[150,-22],[152,-28],[150,-34],[145,-38],[140,-38],[134,-35],[128,-32],[122,-34],[116,-32],[114,-26],[114,-22],[118,-20],[115,-14]],
  // Greenland
  [[-50,60],[-44,60],[-22,70],[-18,76],[-20,80],[-35,83],[-50,82],[-55,78],[-52,72],[-50,60]],
  // Japan (small)
  [[130,31],[132,33],[135,35],[138,37],[140,40],[142,43],[145,44],[142,40],[138,35],[135,33],[130,31]],
  // UK/Ireland
  [[-10,50],[-6,52],[-5,55],[-3,57],[0,58],[2,55],[1,51],[-5,50],[-10,50]],
  // Indonesia (simplified)
  [[95,-5],[100,-3],[105,-6],[108,-7],[112,-7],[115,-8],[120,-8],[125,-5],[130,-3],[135,-4],[140,-5],[140,-8],[135,-8],[125,-10],[118,-10],[112,-8],[108,-8],[100,-6],[95,-5]],
  // Antarctica outline
  [[-60,-62],[-40,-65],[-20,-70],[0,-70],[20,-68],[40,-67],[60,-68],[80,-66],[100,-67],[120,-66],[140,-66],[160,-68],[180,-72],[170,-78],[150,-80],[120,-78],[90,-75],[60,-73],[30,-72],[0,-75],[-30,-74],[-50,-72],[-60,-68],[-60,-62]],
  // Madagascar
  [[44,-12],[47,-15],[49,-20],[48,-24],[45,-25],[43,-22],[44,-16],[44,-12]],
  // New Zealand
  [[166,-35],[168,-38],[172,-42],[174,-44],[172,-46],[168,-44],[170,-40],[166,-35]],
];

function drawContinentOutline(ctx, points, rx, ry, cx, cy, gR) {
  const segments = [];
  let currentSeg = [];

  for (let i = 0; i < points.length; i++) {
    const [lon, lat] = points[i];
    const phi = lat * Math.PI / 180;
    const theta = lon * Math.PI / 180;
    const x = Math.cos(phi) * Math.cos(theta);
    const y = Math.sin(phi);
    const z = Math.cos(phi) * Math.sin(theta);
    const p = proj3D(x, y, z, rx, ry, cx, cy, gR);

    if (p.depth < 0.05) {
      if (currentSeg.length > 1) segments.push(currentSeg);
      currentSeg = [];
    } else {
      currentSeg.push({ px: p.px, py: p.py, depth: p.depth });
    }
  }
  if (currentSeg.length > 1) segments.push(currentSeg);

  segments.forEach(seg => {
    ctx.beginPath();
    seg.forEach((pt, i) => {
      const a = clamp((pt.depth - 0.05) / 1.5, 0.05, 0.35);
      ctx.strokeStyle = `rgba(245,198,60,${a})`;
      if (i === 0) ctx.moveTo(pt.px, pt.py);
      else ctx.lineTo(pt.px, pt.py);
    });
    ctx.stroke();
  });
}

// ════════════════════════════════════════
// DEMO DATA
// ════════════════════════════════════════
const REPOS = [
  { name: "facebook/react", desc: "The library for web and native user interfaces", stars: 231000, forks: 47200, issues: 890, lang: "JavaScript" },
  { name: "vuejs/vue", desc: "An approachable, performant and versatile framework", stars: 208000, forks: 33800, issues: 610, lang: "TypeScript" },
  { name: "angular/angular", desc: "Deliver web apps with confidence", stars: 96000, forks: 25600, issues: 1650, lang: "TypeScript" },
  { name: "sveltejs/svelte", desc: "Cybernetically enhanced web apps", stars: 80000, forks: 4200, issues: 820, lang: "JavaScript" },
  { name: "microsoft/vscode", desc: "Visual Studio Code", stars: 165000, forks: 29400, issues: 8200, lang: "TypeScript" },
  { name: "tensorflow/tensorflow", desc: "An Open Source ML Framework for Everyone", stars: 186000, forks: 74200, issues: 2300, lang: "C++" },
  { name: "pytorch/pytorch", desc: "Tensors and Dynamic neural networks", stars: 84000, forks: 22600, issues: 14200, lang: "Python" },
  { name: "rust-lang/rust", desc: "Empowering everyone to build reliable software", stars: 99000, forks: 12800, issues: 9800, lang: "Rust" },
  { name: "golang/go", desc: "The Go programming language", stars: 124000, forks: 17400, issues: 9100, lang: "Go" },
  { name: "nodejs/node", desc: "Node.js JavaScript runtime", stars: 108000, forks: 29800, issues: 1650, lang: "JavaScript" },
  { name: "denoland/deno", desc: "A modern runtime for JavaScript and TypeScript", stars: 97000, forks: 5400, issues: 1980, lang: "Rust" },
  { name: "vercel/next.js", desc: "The React Framework", stars: 127000, forks: 27000, issues: 3200, lang: "JavaScript" },
  { name: "tailwindlabs/tailwindcss", desc: "A utility-first CSS framework", stars: 83000, forks: 4200, issues: 62, lang: "CSS" },
  { name: "vitejs/vite", desc: "Next generation frontend tooling", stars: 69000, forks: 6200, issues: 520, lang: "TypeScript" },
  { name: "docker/compose", desc: "Define and run multi-container applications", stars: 34000, forks: 5200, issues: 210, lang: "Go" },
  { name: "kubernetes/kubernetes", desc: "Production-Grade Container Orchestration", stars: 111000, forks: 39800, issues: 2400, lang: "Go" },
  { name: "grafana/grafana", desc: "The open observability platform", stars: 65000, forks: 12200, issues: 4100, lang: "TypeScript" },
  { name: "elastic/elasticsearch", desc: "Distributed RESTful Search Engine", stars: 70000, forks: 24800, issues: 4200, lang: "Java" },
  { name: "redis/redis", desc: "Redis is an in-memory database", stars: 67000, forks: 23600, issues: 2400, lang: "C" },
  { name: "microsoft/TypeScript", desc: "TypeScript is a superset of JavaScript", stars: 101000, forks: 12500, issues: 5800, lang: "TypeScript" },
  { name: "python/cpython", desc: "The Python programming language", stars: 64000, forks: 30600, issues: 7600, lang: "Python" },
  { name: "flutter/flutter", desc: "Flutter makes it easy to build beautiful apps", stars: 166000, forks: 27600, issues: 12800, lang: "Dart" },
  { name: "electron/electron", desc: "Build cross-platform desktop apps", stars: 114000, forks: 15400, issues: 890, lang: "C++" },
  { name: "tauri-apps/tauri", desc: "Build smaller, faster desktop and mobile apps", stars: 85000, forks: 2600, issues: 980, lang: "Rust" },
  { name: "openai/openai-python", desc: "The official Python library for the OpenAI API", stars: 23000, forks: 3200, issues: 110, lang: "Python" },
  { name: "huggingface/transformers", desc: "State-of-the-art ML for PyTorch, TensorFlow, JAX", stars: 135000, forks: 27200, issues: 1450, lang: "Python" },
  { name: "langchain-ai/langchain", desc: "Build context-aware reasoning applications", stars: 95000, forks: 15400, issues: 2200, lang: "Python" },
  { name: "torvalds/linux", desc: "Linux kernel source tree", stars: 182000, forks: 54600, issues: 380, lang: "C" },
  { name: "supabase/supabase", desc: "The open source Firebase alternative", stars: 74000, forks: 7200, issues: 430, lang: "TypeScript" },
  { name: "neovim/neovim", desc: "Vim-fork focused on extensibility", stars: 84000, forks: 5800, issues: 1700, lang: "C" },
  { name: "prisma/prisma", desc: "Next-generation ORM for Node.js & TypeScript", stars: 40000, forks: 1600, issues: 3200, lang: "TypeScript" },
  { name: "remix-run/remix", desc: "Build Better Websites", stars: 30000, forks: 2500, issues: 420, lang: "TypeScript" },
  { name: "astro-build/astro", desc: "The web framework for content-driven websites", stars: 47000, forks: 2500, issues: 180, lang: "TypeScript" },
  { name: "prometheus/prometheus", desc: "Monitoring system and time series database", stars: 56000, forks: 9200, issues: 980, lang: "Go" },
  { name: "webpack/webpack", desc: "A bundler for javascript and friends", stars: 64700, forks: 8800, issues: 250, lang: "JavaScript" },
];

function makeAvatar(seed) {
  const initials = seed.substring(0, 2).toUpperCase();
  let h = 0; for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  const hue = ((h % 360) + 360) % 360;
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="hsl(${hue},35%,18%)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="hsl(${hue},70%,70%)" font-family="system-ui" font-weight="600" font-size="13">${initials}</text></svg>`)}`;
}

function generateDemoData(entry) {
  // Seeded RNG so each repo gets consistent but unique data
  let seed = 0;
  for (let i = 0; i < entry.name.length; i++) seed = ((seed << 5) - seed + entry.name.charCodeAt(i)) | 0;
  const srand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 2147483647; };

  const now = Date.now(), day = 86400000;

  // Large pools to pick from — each repo gets a different subset
  const firstNames = ["Alex","Maria","Yuki","Liam","Fatima","Jonas","Priya","Carlos","Emma","Wei","Sarah","David","Aiko","Tom","Nia","Raj","Sophie","Omar","Hana","Felix","Luna","Marco","Zara","Ethan","Mei","André","Isla","Ravi","Chloe","Kenji","Amara","Sven","Nina","Leo","Dana","Ivan","Rika","Hugo","Maya","Oleg","Tessa","Jun","Freya","Idris","Vera","Kurt","Sana","Piotr","Lily","Noah"];
  const lastNames = ["Chen","Garcia","Tanaka","O'Brien","Al-Rashid","Mueller","Patel","Rivera","Larsson","Zhang","Kim","Okafor","Suzuki","Anderson","Williams","Sharma","Dubois","Hassan","Yamamoto","Berg","Costa","Novak","Petrov","Ng","Santos","Koval","Johansen","Singh","Brown","Watanabe","Diallo","Fischer","Moreau","Kobayashi","Eriksson","Mendez","Volkov","Lee","Ferreira","Nakamura","Osei","Schmidt","Laurent","Ito","Nilsson","Reyes","Sato","Johansson","Park","Torres"];
  const loginPrefixes = ["dev","code","build","ship","hack","x","0x","the","mr","ms"];
  const loginSuffixes = ["_dev","_io","_eng","_hq","","js","py","rs","go","cpp"];

  // Shuffle and pick 12 unique contributors for this repo
  const pickIdx = (len) => Math.floor(srand() * len);
  const usedLogins = new Set();
  const contributors = [];
  for (let i = 0; i < 12; i++) {
    const fn = firstNames[pickIdx(firstNames.length)];
    const ln = lastNames[pickIdx(lastNames.length)];
    // Build a unique login
    let login;
    let attempts = 0;
    do {
      const style = Math.floor(srand() * 5);
      if (style === 0) login = (fn + ln[0]).toLowerCase();
      else if (style === 1) login = (fn[0] + ln).toLowerCase();
      else if (style === 2) login = (fn.toLowerCase() + Math.floor(srand() * 99));
      else if (style === 3) login = loginPrefixes[pickIdx(loginPrefixes.length)] + fn.toLowerCase();
      else login = fn.toLowerCase() + loginSuffixes[pickIdx(loginSuffixes.length)];
      login = login.replace(/[^a-z0-9_-]/g, "");
      attempts++;
    } while (usedLogins.has(login) && attempts < 20);
    usedLogins.add(login);
    contributors.push({ name: `${fn} ${ln}`, login, contributions: Math.floor(800 / (i + 1) + srand() * 80) });
  }
  contributors.sort((a, b) => b.contributions - a.contributions);

  const verbs = ["Fix","Add","Update","Refactor","Improve","Remove","Implement","Optimize","Migrate","Bump","Rewrite","Clean up","Deprecate","Extend","Simplify"];
  const nouns = ["component rendering","auth middleware","build pipeline","API endpoints","type definitions","error handling","unit tests","documentation","CI workflow","dependency versions","memory leak","cache invalidation","rate limiting","SSR hydration","accessibility","dark mode","mobile layout","search indexing","WebSocket support","i18n translations","test coverage","logging system","retry logic","batch processing","config schema"];
  const branchNames = ["main","develop","feature/auth-v2","feature/dark-mode","fix/memory-leak","refactor/api-layer","chore/deps-update","feature/ssr","hotfix/login-crash","feature/search","release/v3.0","feature/i18n","fix/race-condition","feature/websockets","perf/bundle-size"];

  const commits = Array.from({ length: 80 }, (_, i) => {
    const c = contributors[Math.floor(srand() * contributors.length)];
    const d = new Date(now - i * day * (0.5 + srand() * 2.5));
    return {
      sha: Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(srand() * 16)]).join(""),
      commit: {
        message: `${verbs[Math.floor(srand() * verbs.length)]} ${nouns[Math.floor(srand() * nouns.length)]}${i % 3 === 0 ? "\n\nDetailed description of the changes made, context about why and implementation details." : ""}`,
        author: { name: c.name, date: d.toISOString() },
        committer: { date: d.toISOString() },
      },
      author: { login: c.login, avatar_url: makeAvatar(c.login) },
    };
  });

  const contribs = contributors.map(c => ({ login: c.login, avatar_url: makeAvatar(c.login), contributions: c.contributions }));

  const pulls = contribs.flatMap((c, ci) => Array.from({ length: Math.max(1, 6 - ci) }, (_, pi) => {
    const m = srand() > .2;
    const d = new Date(now - (ci * 5 + pi) * day * (1 + srand() * 3));
    return { id: ci * 100 + pi, number: 1000 - ci * 10 - pi, title: `${verbs[Math.floor(srand() * verbs.length)]} ${nouns[Math.floor(srand() * nouns.length)]}`, state: m ? "closed" : srand() > .5 ? "open" : "closed", merged_at: m ? d.toISOString() : null, created_at: d.toISOString(), user: { login: c.login } };
  }));

  return { info: { full_name: entry.name, description: entry.desc, stargazers_count: entry.stars, forks_count: entry.forks, open_issues_count: entry.issues, language: entry.lang, owner: { login: entry.name.split("/")[0], avatar_url: makeAvatar(entry.name.split("/")[0]) } }, commits, branches: branchNames.map(n => ({ name: n })), contributors: contribs, pulls };
}

// ════════════════════════════════════════
// THEME
// ════════════════════════════════════════
const T = {
  bg:"#0f0a1e",bgAlt:"#140e28",surface:"#1c1535",surfHov:"#251e42",
  bdr:"#2d2450",bdrB:"#3d3365",text:"#f5f0ff",textS:"#c8bfe0",textD:"#7e6fa8",
  acc:"#f5c63c",accAlt:"#9945ff",accPink:"#e94fd8",accGreen:"#3fb950",
  glow:"0 0 20px rgba(245,198,60,.3)",
};
const SF=`"Archivo","Archivo SemiExpanded",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif`;
const SFM=`"SF Mono","Fira Code",Menlo,Consolas,monospace`;

// Profile picture component with multiple source fallbacks
const NEULO_PIC_SOURCES = [
  "https://unavatar.io/x/neuulo",
  "https://unavatar.io/twitter/neuulo",
  "https://images.weserv.nl/?url=https://unavatar.io/x/neuulo&w=48&h=48",
];

function NeuloPic({ size = 24 }) {
  const [src, setSrc] = useState(NEULO_PIC_SOURCES[0]);
  const [fallbackIdx, setFallbackIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const onError = () => {
    const next = fallbackIdx + 1;
    if (next < NEULO_PIC_SOURCES.length) {
      setFallbackIdx(next);
      setSrc(NEULO_PIC_SOURCES[next]);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#9945ff,#f5c63c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .45, fontWeight: 700, color: "#fff", fontFamily: SF, flexShrink: 0 }}>N</div>
    );
  }

  return (
    <img src={src} alt="neulo" onError={onError}
      style={{ width: size, height: size, borderRadius: "50%", border: `1.5px solid ${T.bdrB}`, flexShrink: 0, objectFit: "cover" }} />
  );
}
const CSS=`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700;800;900&display=swap');*{margin:0;padding:0;box-sizing:border-box}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.bdrB};border-radius:3px}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes growBar{from{width:0}to{width:var(--bw)}}@keyframes branchGrow{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`;

// ════════════════════════════════════════
// GLOBE VIEW — wireframe + continent outlines
// ════════════════════════════════════════
function GlobeView({ onSelect }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const rotRef = useRef({ x: 0.25, y: 0, auto: true });
  const dragRef = useRef({ on: false, moved: false, lx: 0, ly: 0, sx: 0, sy: 0 });
  const hoverRef = useRef(-1);
  const ptsRef = useRef(fibSphere(REPOS.length));
  const starsRef = useRef([]);
  const nebRef = useRef([]);
  const tRef = useRef(0);
  const [hovered, setHovered] = useState(null);
  const [mPos, setMPos] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    starsRef.current = Array.from({ length: 400 }, () => ({
      x: rand(0, 1), y: rand(0, 1), sz: Math.random() < .04 ? rand(1.2, 2.5) : rand(.2, 1),
      br: rand(.2, 1), ts: rand(.005, .03), to: rand(0, Math.PI * 2),
      h: [270,290,45,320,200,35][Math.floor(rand(0, 6))], sat: rand(10, 45),
    }));
    nebRef.current = Array.from({ length: 8 }, () => ({
      x: rand(.05, .95), y: rand(.05, .95), rx: rand(60, 200), ry: rand(40, 150),
      h: rand(260, 320), op: rand(.008, .028), rot: rand(0, Math.PI),
    }));
  }, []);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = cv.width = cv.offsetWidth * dpr, H = cv.height = cv.offsetHeight * dpr;
    const cx = W / 2, cy = H * .47, gR = Math.min(W, H) * .29;
    tRef.current += .016;
    const t = tRef.current;
    if (rotRef.current.auto) rotRef.current.y += .002;
    const rx = rotRef.current.x, ry = rotRef.current.y;

    // ── Deep space BG ──
    const bg = ctx.createRadialGradient(cx * .7, cy * .5, 0, cx, cy, Math.max(W, H) * .8);
    bg.addColorStop(0, "#1a1035"); bg.addColorStop(.35, "#100a22"); bg.addColorStop(1, "#0a0616");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // ── Nebula ──
    nebRef.current.forEach(n => {
      ctx.save(); ctx.translate(n.x * W, n.y * H); ctx.rotate(n.rot);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
      g.addColorStop(0, hsl(n.h, 50, 35, n.op * 1.8)); g.addColorStop(.5, hsl(n.h + 25, 40, 25, n.op));
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.scale(1, n.ry / n.rx);
      ctx.beginPath(); ctx.arc(0, 0, n.rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    // ── Stars ──
    starsRef.current.forEach(s => {
      const tw = .5 + .5 * Math.sin(t * s.ts * 60 + s.to), a = s.br * (.6 + .4 * tw);
      const sx = s.x * W, sy = s.y * H;
      if ((sx - cx) ** 2 + (sy - cy) ** 2 < gR * gR * .72) return;
      if (s.sz > 1.2) {
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.sz * dpr * 2);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.3, hsl(s.h, s.sat, 80, a * .5)); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, s.sz * dpr * 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a * .1; ctx.strokeStyle = "#e0d0ff"; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(sx - s.sz * 5, sy); ctx.lineTo(sx + s.sz * 5, sy);
        ctx.moveTo(sx, sy - s.sz * 5); ctx.lineTo(sx, sy + s.sz * 5); ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        ctx.beginPath(); ctx.arc(sx, sy, s.sz * dpr * .5, 0, Math.PI * 2);
        ctx.fillStyle = hsl(s.h, s.sat, 88, a); ctx.fill();
      }
    });

    // ── Atmosphere layers ──
    for (let i = 5; i >= 0; i--) {
      const r = gR * (1.01 + i * .04), h = 275 + i * 5;
      const ag = ctx.createRadialGradient(cx, cy, gR * .92, cx, cy, r);
      ag.addColorStop(0, `hsla(${h},75%,55%,${.03 - i * .004})`);
      ag.addColorStop(.7, `hsla(${h},65%,45%,${.015 - i * .002})`);
      ag.addColorStop(1, "transparent");
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }

    // ── Globe surface gradient ──
    const sg = ctx.createRadialGradient(cx - gR * .3, cy - gR * .25, gR * .05, cx, cy, gR);
    sg.addColorStop(0, "rgba(40,20,80,.3)"); sg.addColorStop(.4, "rgba(20,12,50,.25)");
    sg.addColorStop(.85, "rgba(12,8,30,.4)"); sg.addColorStop(1, "rgba(8,4,20,.65)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, gR, 0, Math.PI * 2); ctx.fill();

    // ── Wireframe grid ──
    ctx.lineWidth = .7;
    for (let lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath();
      const lr = Math.cos(lat * Math.PI / 180), ly = Math.sin(lat * Math.PI / 180);
      let st = false;
      for (let lng = 0; lng <= 360; lng += 3) {
        const rad = lng * Math.PI / 180;
        const p = proj3D(lr * Math.cos(rad), ly, lr * Math.sin(rad), rx, ry, cx, cy, gR);
        if (p.depth < .12) { st = false; continue; }
        ctx.strokeStyle = `rgba(140,100,255,${clamp((p.depth - .12) / 2, 0, .08)})`;
        if (!st) { ctx.moveTo(p.px, p.py); st = true; } else ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();
    }
    for (let lng = 0; lng < 360; lng += 15) {
      ctx.beginPath();
      const rad = lng * Math.PI / 180; let st = false;
      for (let lat = -90; lat <= 90; lat += 3) {
        const lr = Math.cos(lat * Math.PI / 180), ly = Math.sin(lat * Math.PI / 180);
        const p = proj3D(lr * Math.cos(rad), ly, lr * Math.sin(rad), rx, ry, cx, cy, gR);
        if (p.depth < .12) { st = false; continue; }
        ctx.strokeStyle = `rgba(140,100,255,${clamp((p.depth - .12) / 2, 0, .07)})`;
        if (!st) { ctx.moveTo(p.px, p.py); st = true; } else ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();
    }

    // ── CONTINENT OUTLINES ──
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    CONTINENTS.forEach(pts => drawContinentOutline(ctx, pts, rx, ry, cx, cy, gR));

    // ── Specular highlight ──
    const sp = ctx.createRadialGradient(cx - gR * .3, cy - gR * .35, gR * .02, cx - gR * .1, cy - gR * .15, gR * .55);
    sp.addColorStop(0, "rgba(180,140,255,.07)"); sp.addColorStop(1, "transparent");
    ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(cx, cy, gR, 0, Math.PI * 2); ctx.fill();

    // ── Repo star dots ──
    const proj = ptsRef.current.map((pt, i) => ({ ...proj3D(pt.x, pt.y, pt.z, rx, ry, cx, cy, gR), idx: i })).sort((a, b) => a.depth - b.depth);
    proj.forEach(({ px, py, depth, scale, idx }) => {
      if (depth < .12) return;
      const isH = idx === hoverRef.current;
      const sz = (isH ? 6 : 3) * scale * dpr * .55;
      const a = clamp((depth - .12) / 1.6, .15, 1);
      const h = (idx * 137.5) % 360;
      if (isH) {
        const ps = 1 + .15 * Math.sin(t * 5);
        ctx.beginPath(); ctx.arc(px, py, sz * 5 * ps, 0, Math.PI * 2); ctx.fillStyle = hsl(h, 75, 65, .07); ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, sz * 3, 0, Math.PI * 2); ctx.fillStyle = hsl(h, 75, 65, .16); ctx.fill();
      }
      const gg = ctx.createRadialGradient(px, py, 0, px, py, sz * 3);
      gg.addColorStop(0, hsl(h, 80, 72, a * .45)); gg.addColorStop(1, "transparent");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px, py, sz * 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fillStyle = isH ? hsl(h, 90, 82, a) : hsl(h, 70, 70, a * .85); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, sz * .3, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${a * .9})`; ctx.fill();
    });

    // ── Limb darkening ──
    const lg = ctx.createRadialGradient(cx, cy, gR * .65, cx, cy, gR * 1.02);
    lg.addColorStop(0, "transparent"); lg.addColorStop(.85, "rgba(10,6,25,.25)"); lg.addColorStop(1, "rgba(10,6,25,.6)");
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy, gR * 1.02, 0, Math.PI * 2); ctx.fill();

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => { animRef.current = requestAnimationFrame(draw); return () => cancelAnimationFrame(animRef.current); }, [draw]);

  const gp = () => { const dpr = window.devicePixelRatio || 1, W = canvasRef.current.width, H = canvasRef.current.height; return { cx: W / 2, cy: H * .47, gR: Math.min(W, H) * .29, dpr }; };
  const nearest = (mx, my) => { const { cx, cy, gR, dpr } = gp(); let c = -1, b = 40 * dpr; ptsRef.current.forEach((pt, i) => { const p = proj3D(pt.x, pt.y, pt.z, rotRef.current.x, rotRef.current.y, cx, cy, gR); if (p.depth < .12) return; const d = Math.hypot(mx - p.px, my - p.py); if (d < b) { c = i; b = d; } }); return c; };

  const onMove = e => { const r = canvasRef.current.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr; setMPos({ x: e.clientX - r.left, y: e.clientY - r.top }); if (dragRef.current.on) { if (Math.hypot(mx - dragRef.current.sx, my - dragRef.current.sy) > 5) dragRef.current.moved = true; rotRef.current.y += (mx - dragRef.current.lx) * .004; rotRef.current.x = clamp(rotRef.current.x + (my - dragRef.current.ly) * .004, -1.2, 1.2); dragRef.current.lx = mx; dragRef.current.ly = my; return; } const c = nearest(mx, my); hoverRef.current = c; setHovered(c >= 0 ? REPOS[c].name : null); canvasRef.current.style.cursor = c >= 0 ? "pointer" : "grab"; };
  const onDown = e => { const r = canvasRef.current.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr; dragRef.current = { on: true, moved: false, lx: mx, ly: my, sx: mx, sy: my }; rotRef.current.auto = false; };
  const onUp = () => { dragRef.current.on = false; setTimeout(() => { rotRef.current.auto = true; }, 1200); };
  const onClick = e => { if (dragRef.current.moved) return; const r = canvasRef.current.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; const c = nearest((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr); if (c >= 0) onSelect(REPOS[c].name); };

  const handleSubmit = () => {
    const q = query.trim().replace(/\/+$/, "");
    if (!q) return;
    const m = q.match(/github\.com\/([^/\s]+\/[^/\s#?]+)/);
    if (m) { onSelect(m[1].replace(/\.git$/, "")); return; }
    const parts = q.split("/").filter(Boolean);
    if (parts.length >= 2) { onSelect(`${parts[parts.length - 2]}/${parts[parts.length - 1]}`); return; }
    // Pick first suggestion if available
    if (suggestions.length > 0) { onSelect(suggestions[0].full_name || suggestions[0].name); return; }
    // Last resort: search local
    const found = REPOS.find(r => r.name.toLowerCase().includes(q.toLowerCase()));
    if (found) onSelect(found.name);
  };

  // Live GitHub search with debounce
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMode, setSearchMode] = useState("local"); // "live" or "local"
  const debounceRef = useRef(null);

  const doSearch = (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }

    // Always show local matches instantly
    const local = REPOS.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) || r.desc.toLowerCase().includes(q.toLowerCase())).slice(0, 5);

    // Try GitHub Search API
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // Determine if searching users or repos
        const isUser = !q.includes("/") && !q.includes(" ");
        const repoRes = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=6&sort=stars`, { headers: { Accept: "application/vnd.github.v3+json" } });
        if (!repoRes.ok) throw new Error("api fail");
        const repoData = await repoRes.json();
        const repoItems = (repoData.items || []).map(r => ({
          type: "repo", full_name: r.full_name, name: r.name, desc: r.description || "",
          stars: r.stargazers_count, avatar: r.owner?.avatar_url, owner: r.owner?.login, lang: r.language,
        }));

        // Also search users if query looks like a username
        let userItems = [];
        if (isUser && q.length >= 2) {
          try {
            const userRes = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=3`, { headers: { Accept: "application/vnd.github.v3+json" } });
            if (userRes.ok) {
              const userData = await userRes.json();
              userItems = (userData.items || []).map(u => ({
                type: "user", full_name: u.login, name: u.login, desc: `GitHub user`, avatar: u.avatar_url, owner: u.login, stars: 0,
              }));
            }
          } catch {}
        }

        const combined = [...userItems.slice(0, 2), ...repoItems.slice(0, 6)];
        if (combined.length > 0) {
          setSuggestions(combined);
          setSearchMode("live");
        } else {
          setSuggestions(local.map(r => ({ type: "repo", full_name: r.name, name: r.name.split("/")[1], desc: r.desc, stars: r.stars, owner: r.name.split("/")[0], lang: r.lang })));
          setSearchMode("local");
        }
      } catch {
        // API unavailable — use local
        setSuggestions(local.map(r => ({ type: "repo", full_name: r.name, name: r.name.split("/")[1], desc: r.desc, stars: r.stars, owner: r.name.split("/")[0], lang: r.lang })));
        setSearchMode("local");
      }
      setSearchLoading(false);
    }, 300);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: T.bg, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }}
        onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp} onClick={onClick} />

      {/* Title */}
      <div style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none" }}>
        <div style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: T.acc, letterSpacing: 4, textTransform: "uppercase", opacity: .8 }}>Explore Open Source</div>
        <div style={{ fontFamily: SF, fontSize: 36, fontWeight: 800, letterSpacing: -.5, background: "linear-gradient(135deg,#f5c63c 0%,#e8a820 30%,#9945ff 70%,#7b2ef0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 4 }}>GitHub Universe</div>
        <div style={{ fontFamily: SF, fontSize: 14, color: T.textD, marginTop: 8 }}>Hover over stars · Click to explore</div>
      </div>

      {/* Smart search field */}
      <div style={{ position: "absolute", bottom: 72, left: "50%", transform: "translateX(-50%)", zIndex: 10, width: "min(560px,92%)" }}>
        <div style={{ position: "relative" }}>
          <input
            placeholder="Search repos, users, or paste a GitHub URL..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); doSearch(e.target.value); }}
            onKeyDown={e => { if (e.key === "Enter") { handleSubmit(); setShowDropdown(false); } if (e.key === "Escape") setShowDropdown(false); }}
            onFocus={e => { setShowDropdown(true); e.target.style.borderColor = T.acc; if (query) doSearch(query); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
            style={{ width: "100%", padding: "15px 52px 15px 44px", background: "rgba(15,10,30,.88)", border: `1px solid ${T.bdr}`, borderRadius: 16, color: T.text, fontFamily: SF, fontSize: 15, outline: "none", backdropFilter: "blur(24px)", transition: "border-color .2s" }}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textD} strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          {searchLoading && <div style={{ position: "absolute", right: 68, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, borderRadius: "50%", border: `2px solid ${T.bdr}`, borderTopColor: T.acc, animation: "spin .6s linear infinite" }} />}
          <button onClick={() => { handleSubmit(); setShowDropdown(false); }}
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", padding: "8px 16px", background: T.acc, border: "none", borderRadius: 11, color: "#000", fontFamily: SF, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Go</button>

          {showDropdown && suggestions.length > 0 && (
            <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, background: "rgba(15,10,30,.97)", border: `1px solid ${T.bdr}`, borderRadius: 14, padding: 6, maxHeight: 340, overflowY: "auto", backdropFilter: "blur(24px)" }}>
              {/* Source indicator */}
              <div style={{ padding: "4px 12px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: SFM, fontSize: 10, color: T.textD }}>{searchMode === "live" ? "GitHub Search Results" : "Local Suggestions"}</span>
                {searchMode === "live" && <span style={{ fontFamily: SFM, fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(63,185,80,.15)", color: T.accGreen }}>LIVE</span>}
              </div>
              {suggestions.map((s, i) => (
                <div key={s.full_name + i}
                  onMouseDown={() => {
                    if (s.type === "user") {
                      // For users, search their repos — just set as query hint
                      setQuery(s.full_name + "/");
                      doSearch(s.full_name + "/");
                    } else {
                      onSelect(s.full_name); setQuery("");
                    }
                  }}
                  style={{ padding: "10px 14px", cursor: "pointer", borderRadius: 10, color: T.text, fontFamily: SF, fontSize: 14, transition: "background .12s", display: "flex", alignItems: "center", gap: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surfHov}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {/* Avatar */}
                  {s.avatar ? (
                    <img src={s.avatar} alt="" style={{ width: 28, height: 28, borderRadius: s.type === "user" ? "50%" : 8, flexShrink: 0, border: `1px solid ${T.bdr}` }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: T.surface, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {s.type === "user" && <span style={{ fontFamily: SFM, fontSize: 9, padding: "1px 5px", borderRadius: 4, background: `${T.accAlt}22`, color: T.accAlt }}>USER</span>}
                      <span style={{ color: T.textD, fontFamily: SFM, fontSize: 12 }}>{s.owner}/</span>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                    </div>
                    {s.desc && <div style={{ fontFamily: SF, fontSize: 11, color: T.textD, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.desc}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {s.lang && <span style={{ fontFamily: SFM, fontSize: 10, color: T.textD }}>{s.lang}</span>}
                    {s.stars > 0 && <span style={{ fontFamily: SFM, fontSize: 11, color: T.acc }}>★ {s.stars >= 1000 ? (s.stars / 1000).toFixed(s.stars >= 10000 ? 0 : 1) + "k" : s.stars}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {hovered && <div style={{ position: "absolute", left: mPos.x + 18, top: mPos.y - 14, background: "rgba(15,10,30,.95)", border: `1px solid ${T.bdrB}`, borderRadius: 12, padding: "12px 18px", pointerEvents: "none", boxShadow: "0 8px 32px rgba(0,0,0,.5)", backdropFilter: "blur(16px)", animation: "fadeIn .12s ease" }}>
        <div style={{ fontFamily: SFM, fontSize: 11, color: T.textD }}>{hovered.split("/")[0]}</div>
        <div style={{ fontFamily: SF, fontSize: 16, fontWeight: 600, color: T.text, marginTop: 2 }}>{hovered.split("/")[1]}</div>
        <div style={{ fontFamily: SF, fontSize: 11, color: T.acc, marginTop: 6, fontWeight: 500 }}>Click to explore →</div>
      </div>}

      {/* HUD */}
      <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 16, color: T.textD, fontFamily: SFM, fontSize: 11, background: "rgba(15,10,30,.6)", padding: "6px 20px", borderRadius: 20, border: `1px solid ${T.bdr}`, backdropFilter: "blur(12px)" }}>
        <span>{REPOS.length} repos</span><span style={{ opacity: .3 }}>·</span><span>Drag to rotate</span><span style={{ opacity: .3 }}>·</span><span>Click to explore</span>
      </div>

      {/* Neulo */}
      <a href="https://x.com/neuulo" target="_blank" rel="noopener noreferrer"
        style={{ position: "absolute", bottom: 22, right: 22, display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "6px 14px 6px 6px", background: "rgba(15,10,30,.7)", borderRadius: 24, border: `1px solid ${T.bdr}`, backdropFilter: "blur(12px)", transition: "border-color .2s" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = T.acc} onMouseLeave={e => e.currentTarget.style.borderColor = T.bdr}>
        <NeuloPic size={24} />
        <div style={{ lineHeight: 1.2 }}><div style={{ fontFamily: SF, fontSize: 10, color: T.textD, fontWeight: 500 }}>Made by</div><div style={{ fontFamily: SF, fontSize: 12, color: T.text, fontWeight: 600 }}>neulo</div></div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={T.textD}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
    </div>
  );
}

// ════════════════════════════════════════
// TIMELINE
// ════════════════════════════════════════
function TimelineView({ commits, repoInfo }) {
  const [exp, setExp] = useState(null);
  if (!commits?.length) return <div style={{ padding: 60, textAlign: "center", color: T.textD, fontFamily: SF }}>No commits</div>;
  const sorted = [...commits].sort((a, b) => new Date(b.commit.committer.date) - new Date(a.commit.committer.date));
  const groups = {}; sorted.forEach(c => { const d = new Date(c.commit.committer.date); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; (groups[k] ??= []).push(c); });
  const months = Object.keys(groups).sort().reverse();
  return (
    <div style={{ padding: "30px 0", overflowY: "auto", height: "100%" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          {repoInfo?.owner?.avatar_url && <img src={repoInfo.owner.avatar_url} alt="" style={{ width: 52, height: 52, borderRadius: 14, border: `1px solid ${T.bdr}` }} />}
          <div><div style={{ fontFamily: SF, fontWeight: 400, color: T.textD, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Project Timeline</div><div style={{ fontFamily: SF, fontWeight: 700, color: T.text, fontSize: 26, letterSpacing: -.5 }}>{repoInfo?.full_name}</div></div>
          <div style={{ marginLeft: "auto", fontFamily: SFM, fontSize: 12, color: T.textD, background: T.surface, padding: "5px 14px", borderRadius: 8 }}>{sorted.length} commits</div>
        </div>
        <div style={{ position: "relative", paddingLeft: 48 }}>
          <div style={{ position: "absolute", left: 18, top: 8, bottom: 8, width: 1, background: `linear-gradient(to bottom,${T.acc}55,${T.bdr}44,transparent)` }} />
          {months.map((month, mi) => (
            <div key={month} style={{ marginBottom: 28, animation: `slideUp .35s ease ${mi * .04}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, marginLeft: -48 }}>
                <div style={{ width: 37, display: "flex", justifyContent: "center", flexShrink: 0 }}><div style={{ width: 11, height: 11, borderRadius: "50%", background: T.bg, border: `2px solid ${T.acc}`, boxShadow: `0 0 8px ${T.acc}55` }} /></div>
                <span style={{ fontFamily: SF, fontSize: 15, color: T.text, fontWeight: 600 }}>{new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                <span style={{ fontFamily: SFM, fontSize: 11, color: T.textD, background: T.surface, padding: "2px 9px", borderRadius: 6 }}>{groups[month].length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {groups[month].map(c => { const isE = exp === c.sha; return (
                  <div key={c.sha} onClick={() => setExp(isE ? null : c.sha)} style={{ position: "relative", padding: "12px 16px", borderRadius: 12, cursor: "pointer", background: isE ? T.surface : "transparent", border: `1px solid ${isE ? T.bdrB : "transparent"}`, transition: "all .2s" }}
                    onMouseEnter={e => { if (!isE) e.currentTarget.style.background = T.surfHov; }} onMouseLeave={e => { if (!isE) e.currentTarget.style.background = isE ? T.surface : "transparent"; }}>
                    <div style={{ position: "absolute", left: -38, top: 18, width: 7, height: 7, borderRadius: "50%", background: isE ? T.acc : T.bdrB }} />
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {c.author?.avatar_url && <img src={c.author.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, border: `1px solid ${T.bdr}` }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: SF, fontSize: 14, fontWeight: 500, color: T.text, lineHeight: 1.4, whiteSpace: isE ? "normal" : "nowrap", overflow: isE ? "visible" : "hidden", textOverflow: isE ? "unset" : "ellipsis" }}>{isE ? c.commit.message : c.commit.message.split("\n")[0]}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontFamily: SFM, fontSize: 11, color: T.textD }}><span style={{ color: T.textS, fontFamily: SF, fontWeight: 500 }}>{c.commit.author.name}</span><span style={{ opacity: .4 }}>·</span><span>{c.sha.substring(0, 7)}</span><span style={{ opacity: .4 }}>·</span><span>{new Date(c.commit.author.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
                      </div>
                    </div>
                  </div>); })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// BRANCHES
// ════════════════════════════════════════
function BranchView({ branches, repoName }) {
  if (!branches?.length) return <div style={{ padding: 60, textAlign: "center", color: T.textD, fontFamily: SF }}>No branches</div>;
  const main = branches.find(b => b.name === "main" || b.name === "master") || branches[0];
  const rest = branches.filter(b => b.name !== main.name);
  const W = Math.max(800, rest.length * 45 + 200), H = 520, cxx = W / 2, tT = 70, tB = H - 50;
  return (
    <div style={{ padding: "30px 40px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontFamily: SF, fontWeight: 400, color: T.textD, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Branch Roots</div>
      <div style={{ fontFamily: SF, fontWeight: 700, color: T.text, fontSize: 24, marginBottom: 4, letterSpacing: -.3 }}>{repoName}</div>
      <div style={{ fontFamily: SF, fontSize: 14, color: T.textD, marginBottom: 28 }}>{branches.length} branches — <span style={{ color: T.acc }}>{main.name}</span> is the primary trunk</div>
      <div style={{ overflowX: "auto", paddingBottom: 20 }}>
        <svg width={W} height={H}>
          <defs><linearGradient id="tG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.acc}/><stop offset="100%" stopColor={T.accAlt}/></linearGradient><filter id="gl"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="gls"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          {Array.from({length:25},(_,i)=><line key={i} x1={i*(W/25)} y1={0} x2={i*(W/25)} y2={H} stroke={T.bdr} strokeWidth={.3} opacity={.4}/>)}
          <line x1={cxx} y1={tT} x2={cxx} y2={tB} stroke="url(#tG)" strokeWidth={3.5} filter="url(#gls)" strokeLinecap="round"/>
          <rect x={cxx-45} y={tT-14} width={90} height={22} rx={11} fill={T.acc} opacity={.15}/><text x={cxx} y={tT+1} textAnchor="middle" fill={T.acc} fontFamily={SFM} fontSize={10} fontWeight={500}>{main.name}</text>
          {rest.map((b,i)=>{const side=i%2===0?-1:1,tier=Math.floor(i/2),yS=tT+50+tier*40;if(yS>tB-20)return null;const xE=cxx+side*(90+tier*25+(i%3)*15),yE=yS+20+(i%4)*10,h=(i*47+140)%360,c=hsl(h,55,55);return(<g key={b.name}><path d={`M ${cxx} ${yS} Q ${cxx+side*35} ${yS} ${xE} ${yE}`} stroke={c} strokeWidth={1.8} fill="none" opacity={.65} strokeLinecap="round" filter="url(#gl)" style={{strokeDasharray:250,strokeDashoffset:250,animation:`branchGrow .8s ease ${i*.06}s forwards`}}/><circle cx={xE} cy={yE} r={4} fill={c} opacity={.9} style={{animation:`fadeIn .3s ease ${i*.06+.6}s both`}}/><text x={xE+side*10} y={yE+4} textAnchor={side>0?"start":"end"} fill={T.textS} fontFamily={SFM} fontSize={10} opacity={.8} style={{animation:`fadeIn .3s ease ${i*.06+.8}s both`}}>{b.name.length>24?b.name.substring(0,24)+"…":b.name}</text></g>);})}
          <ellipse cx={cxx} cy={tB+5} rx={70} ry={6} fill={T.acc} opacity={.08} filter="url(#gls)"/>
        </svg>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// CONTRIBUTORS
// ════════════════════════════════════════
function ContribView({ contributors, repoName, pulls }) {
  const [sel, setSel] = useState(null);
  const [prs, setPrs] = useState([]);
  if (!contributors?.length) return <div style={{ padding: 60, textAlign: "center", color: T.textD, fontFamily: SF }}>No data</div>;
  const top = contributors.slice(0, 25), mx = top[0]?.contributions || 1;
  const pick = c => { setSel(c); if (pulls) setPrs(pulls.filter(p => p.user?.login === c.login)); };
  return (
    <div style={{ padding: "30px 40px", overflowY: "auto", height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SF, fontWeight: 400, color: T.textD, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Contributors</div>
        <div style={{ fontFamily: SF, fontWeight: 700, color: T.text, fontSize: 24, marginBottom: 4, letterSpacing: -.3 }}>{repoName}</div>
        <p style={{ fontFamily: SF, fontSize: 13, color: T.textD, marginBottom: 24 }}>Ranked by contributions · Click to view PRs</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {top.map((c, i) => { const pct = (c.contributions / mx) * 100, isSel = sel?.login === c.login, h = (i * 29 + 180) % 360; return (
            <div key={c.login} onClick={() => pick(c)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "10px 14px", borderRadius: 12, transition: "all .2s", background: isSel ? "rgba(245,198,60,.06)" : "transparent", border: isSel ? `1px solid ${T.acc}33` : "1px solid transparent", animation: `slideUp .3s ease ${i * .025}s both` }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.surfHov; }} onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isSel ? "rgba(245,198,60,.06)" : "transparent"; }}>
              <span style={{ fontFamily: SFM, fontSize: 11, color: T.textD, width: 22, textAlign: "right" }}>{i + 1}</span>
              <img src={c.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${isSel ? T.acc : T.bdr}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontFamily: SF, fontSize: 14, color: T.text, fontWeight: isSel ? 600 : 500 }}>{c.login}</span><span style={{ fontFamily: SFM, fontSize: 12, color: T.acc, fontWeight: 500 }}>{c.contributions}</span></div>
                <div style={{ width: "100%", height: 5, background: T.surface, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${hsl(h, 55, 48)},${hsl(h + 40, 65, 58)})`, width: `${pct}%`, "--bw": `${pct}%`, animation: `growBar .7s ease ${i * .03}s both`, boxShadow: `0 0 6px ${hsl(h, 55, 48, .3)}` }} /></div>
              </div>
            </div>); })}
        </div>
      </div>
      <div style={{ width: 360, flexShrink: 0, background: T.surface, borderRadius: 16, border: `1px solid ${T.bdr}`, padding: 24, overflowY: "auto", ...(sel ? {} : { display: "flex", alignItems: "center", justifyContent: "center" }) }}>
        {!sel ? <div style={{ textAlign: "center", color: T.textD, fontFamily: SF, fontSize: 14 }}><div style={{ fontSize: 36, marginBottom: 12, opacity: .25 }}>←</div>Select a contributor</div> : (
          <div style={{ animation: "fadeIn .25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}><img src={sel.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${T.acc}`, boxShadow: T.glow }} /><div><div style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: T.text }}>{sel.login}</div><div style={{ fontFamily: SFM, fontSize: 12, color: T.acc }}>{sel.contributions} contributions</div></div></div>
            <div style={{ fontFamily: SF, fontSize: 11, color: T.textD, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Pull Requests ({prs.length})</div>
            {prs.length === 0 ? <div style={{ fontFamily: SF, fontSize: 13, color: T.textD, padding: 24, textAlign: "center" }}>No PRs found</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {prs.slice(0, 20).map((pr, i) => (
                  <div key={pr.id} style={{ padding: "12px 14px", background: T.bgAlt, borderRadius: 12, border: `1px solid ${T.bdr}`, animation: `slideUp .2s ease ${i * .03}s both` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}><span style={{ fontFamily: SFM, fontSize: 10, padding: "2px 7px", borderRadius: 6, fontWeight: 500, background: pr.merged_at ? "rgba(163,113,247,.15)" : pr.state === "open" ? "rgba(63,185,80,.15)" : "rgba(110,118,129,.15)", color: pr.merged_at ? T.accAlt : pr.state === "open" ? T.accGreen : T.textD }}>{pr.merged_at ? "MERGED" : pr.state?.toUpperCase()}</span><span style={{ fontFamily: SFM, fontSize: 10, color: T.textD }}>#{pr.number}</span></div>
                    <div style={{ fontFamily: SF, fontSize: 13, color: T.text, lineHeight: 1.45, fontWeight: 500 }}>{pr.title}</div>
                    <div style={{ fontFamily: SFM, fontSize: 10, color: T.textD, marginTop: 6 }}>{new Date(pr.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("globe");
  const [tab, setTab] = useState("timeline");
  const [data, setData] = useState(null);
  const [repoName, setRepoName] = useState("");

  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState("");

  const selectRepo = async (name) => {
    setRepoName(name); setView("repo"); setTab("timeline"); setLoading(true); setData(null);

    // Try live GitHub API first
    try {
      const h = { Accept: "application/vnd.github.v3+json" };
      const base = `https://api.github.com/repos/${name}`;
      const infoRes = await fetch(base, { headers: h });
      if (!infoRes.ok) throw new Error("not ok");
      const info = await infoRes.json();
      if (info.message) throw new Error(info.message);

      // Info succeeded — fetch the rest in parallel
      const [cR, bR, coR, pR] = await Promise.allSettled([
        fetch(`${base}/commits?per_page=100`, { headers: h }).then(r => r.ok ? r.json() : []),
        fetch(`${base}/branches?per_page=100`, { headers: h }).then(r => r.ok ? r.json() : []),
        fetch(`${base}/contributors?per_page=30`, { headers: h }).then(r => r.ok ? r.json() : []),
        fetch(`${base}/pulls?state=all&per_page=100&sort=updated&direction=desc`, { headers: h }).then(r => r.ok ? r.json() : []),
      ]);

      const commits = (cR.status === "fulfilled" && Array.isArray(cR.value)) ? cR.value : [];
      const branches = (bR.status === "fulfilled" && Array.isArray(bR.value)) ? bR.value : [];
      const contributors = (coR.status === "fulfilled" && Array.isArray(coR.value)) ? coR.value : [];
      const pulls = (pR.status === "fulfilled" && Array.isArray(pR.value)) ? pR.value : [];

      setData({
        info: {
          full_name: info.full_name,
          description: info.description || "No description",
          stargazers_count: info.stargazers_count,
          forks_count: info.forks_count,
          open_issues_count: info.open_issues_count,
          language: info.language,
          owner: { login: info.owner?.login, avatar_url: info.owner?.avatar_url },
        },
        commits,
        branches,
        contributors,
        pulls,
      });
      setDataSource("live");
      setLoading(false);
      return;
    } catch (e) {
      // API failed (sandbox, rate limit, etc) — fall back to demo
    }

    // Fallback: demo data
    const entry = REPOS.find(r => r.name === name) || { name, desc: `Repository: ${name}`, stars: Math.floor(rand(100, 50000)), forks: Math.floor(rand(10, 5000)), issues: Math.floor(rand(5, 500)), lang: "Unknown" };
    setData(generateDemoData(entry));
    setDataSource("demo");
    setLoading(false);
  };
  const reset = () => { setView("globe"); setData(null); };
  const tabs = [{ id: "timeline", label: "Timeline", icon: "⏱" }, { id: "branches", label: "Branches", icon: "⎇" }, { id: "contributors", label: "Contributors", icon: "◎" }];

  return (
    <div style={{ width: "100%", height: "100vh", background: T.bg, display: "flex", flexDirection: "column", fontFamily: SF, color: T.text, overflow: "hidden" }}>
      <style>{CSS}</style>
      {view === "globe" ? <GlobeView onSelect={selectRepo} /> : (
        <>
          <div style={{ display: "flex", alignItems: "center", padding: "0 20px", height: 50, background: T.bgAlt, borderBottom: `1px solid ${T.bdr}` }}>
            <button onClick={reset} style={{ background: "none", border: `1px solid ${T.bdr}`, borderRadius: 10, color: T.textS, fontFamily: SF, fontSize: 13, fontWeight: 500, padding: "7px 16px", cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.acc; e.currentTarget.style.color = T.text; }} onMouseLeave={e => { e.currentTarget.style.borderColor = T.bdr; e.currentTarget.style.color = T.textS; }}>← Universe</button>
            <div style={{ display: "flex", gap: 4, marginLeft: 20 }}>
              {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? "rgba(245,198,60,.08)" : "transparent", border: tab === t.id ? `1px solid ${T.acc}33` : "1px solid transparent", borderRadius: 10, color: tab === t.id ? T.acc : T.textD, fontFamily: SF, fontSize: 13, fontWeight: 500, padding: "7px 18px", cursor: "pointer", transition: "all .2s" }}>{t.icon} {t.label}</button>))}
            </div>
            <a href="https://x.com/neuulo" target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "4px 12px 4px 4px", borderRadius: 20, border: `1px solid ${T.bdr}`, transition: "border-color .2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.bdrB} onMouseLeave={e => e.currentTarget.style.borderColor = T.bdr}>
              <NeuloPic size={22} />
              <span style={{ fontFamily: SF, fontSize: 11, color: T.textD, fontWeight: 500 }}>by neulo</span>
            </a>
          </div>
          {data?.info && <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 24px", background: "rgba(15,10,30,.85)", borderBottom: `1px solid ${T.bdr}`, backdropFilter: "blur(12px)" }}>
            <img src={data.info.owner.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.bdr}` }} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: SFM, fontSize: 11, color: T.textD }}>{data.info.full_name}</span>{dataSource && <span style={{ fontFamily: SFM, fontSize: 9, padding: "2px 6px", borderRadius: 4, background: dataSource === "live" ? "rgba(63,185,80,.15)" : "rgba(245,198,60,.12)", color: dataSource === "live" ? T.accGreen : T.acc }}>{dataSource === "live" ? "LIVE" : "DEMO"}</span>}</div><div style={{ fontFamily: SF, fontSize: 14, fontWeight: 500, color: T.textS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.info.description}</div></div>
            <div style={{ display: "flex", gap: 20 }}>{[{ l: "Stars", v: data.info.stargazers_count, i: "★" }, { l: "Forks", v: data.info.forks_count, i: "⑂" }, { l: "Issues", v: data.info.open_issues_count, i: "◉" }].map(s => (<div key={s.l} style={{ textAlign: "center" }}><div style={{ fontFamily: SFM, fontSize: 13, color: T.acc, fontWeight: 500 }}>{s.i} {(s.v || 0).toLocaleString()}</div><div style={{ fontFamily: SF, fontSize: 10, color: T.textD }}>{s.l}</div></div>))}</div>
          </div>}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2.5px solid ${T.bdr}`, borderTopColor: T.acc, animation: "spin .8s linear infinite" }} />
                <div style={{ fontFamily: SF, fontSize: 16, color: T.text, fontWeight: 600 }}>Fetching <span style={{ color: T.acc, fontFamily: SFM }}>{repoName}</span></div>
                <div style={{ fontFamily: SF, fontSize: 13, color: T.textD, animation: "pulse 1.5s infinite" }}>Trying GitHub API… falling back to demo if unavailable</div>
              </div>
            ) : (
              <>
                {tab === "timeline" && <TimelineView commits={data?.commits} repoInfo={data?.info} />}
                {tab === "branches" && <BranchView branches={data?.branches} repoName={repoName} />}
                {tab === "contributors" && <ContribView contributors={data?.contributors} repoName={repoName} pulls={data?.pulls} />}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
