/**
 * StoreWay • Multi-Floor Mall Pathfinding & Algorithmic Comparison
 * Core graph definition, algorithms (Dijkstra, Bellman-Ford, BFS), theme controller, and interactive mall map engine.
 */

const $ = id => document.getElementById(id);

// Floor Definitions
const F = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "Fourth Floor"];
const F_SHORT = ["Ground", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"];
const FLOOR_SUBTITLES = [
  "Main Concourse & Flagship Stores",
  "Fashion Promenade & Dining Plaza",
  "Entertainment & Digital Arena",
  "Living, Luxury & Family Hub",
  "Wellness Club & Sky Terraces"
];

// Store Names by Floor
const STORES = [
  ["Zara", "Nike", "Apple Store", "Starbucks"],
  ["Uniqlo", "Food Court", "Sephora", "Bookstore"],
  ["Cinema", "Gaming Zone", "Electronics Hub", "Pharmacy"],
  ["Furniture", "Jewellery", "Toy Store", "Salon"],
  ["Gym", "Bank", "Arcade", "Rooftop Cafe"]
];

// Rich Store Categories, Palettes, and Iconic Glyphs
const STORE_META = [
  [
    { cat: "Fashion Flagship", glyph: "🛍️", color: "#4f46e5" },
    { cat: "Athletic & Sport", glyph: "👟", color: "#0284c7" },
    { cat: "Consumer Tech", glyph: "💻", color: "#334155" },
    { cat: "Specialty Cafe", glyph: "☕", color: "#b45309" }
  ],
  [
    { cat: "Modern Casuals", glyph: "👕", color: "#7c3aed" },
    { cat: "Dining Plaza", glyph: "🍔", color: "#ea580c" },
    { cat: "Beauty & Care", glyph: "💄", color: "#db2777" },
    { cat: "Books & Station", glyph: "📚", color: "#059669" }
  ],
  [
    { cat: "Cinema & IMAX", glyph: "🎬", color: "#6d28d9" },
    { cat: "Arcade & Gaming", glyph: "🎮", color: "#e11d48" },
    { cat: "Audio & Gadgets", glyph: "🎧", color: "#0284c7" },
    { cat: "Health & Pharma", glyph: "💊", color: "#0d9488" }
  ],
  [
    { cat: "Home & Furniture", glyph: "🛋️", color: "#b45309" },
    { cat: "Luxury Watches", glyph: "💎", color: "#ca8a04" },
    { cat: "Toys & Family", glyph: "🧸", color: "#0891b2" },
    { cat: "Wellness Spa", glyph: "💇", color: "#c026d3" }
  ],
  [
    { cat: "Fitness Club", glyph: "🏋️", color: "#16a34a" },
    { cat: "Banking & ATM", glyph: "🏦", color: "#1d4ed8" },
    { cat: "VR Lounge", glyph: "🕹️", color: "#e11d48" },
    { cat: "Sky Terrace Cafe", glyph: "🍸", color: "#c2410c" }
  ]
];

// Quadrant slot positions: [key, doorX, doorY, junction, rectX, rectY]
const SLOTS = [
  ["tl", 250, 230, "J1", 170, 110],
  ["tr", 750, 230, "J3", 670, 110],
  ["bl", 250, 370, "J1", 170, 390],
  ["br", 750, 370, "J3", 670, 390]
];

/* ==========================================================================
   Graph Construction
   ========================================================================== */
const nodes = {}, adj = {};

function N(id, f, x, y, label, type) {
  nodes[id] = { id, f, x, y, label, type };
  adj[id] = [];
}

function E(a, b, kind = "walk", w = null, crowd = false) {
  if (w == null) {
    w = Math.round(Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) * 0.2);
  }
  const e = { w, kind, crowd };
  adj[a].push({ to: b, ...e });
  adj[b].push({ to: a, ...e });
}

// 1) Main Entrance (Ground Floor)
N("0:EN", 0, 500, 500, "Main Entrance", "entrance");

// 2) Floor-by-Floor Construction
for (let f = 0; f < F.length; f++) {
  const p = k => f + ":" + k;
  
  // Junctions
  N(p("J1"), f, 250, 300, "Junction A", "junction");
  N(p("J2"), f, 500, 300, "Junction B", "junction");
  N(p("J3"), f, 750, 300, "Junction C", "junction");

  // Vertical Connectors
  N(p("ST"), f, 140, 300, "Stairs", "stairs");
  N(p("ES"), f, 500, 190, "Escalator", "escalator");
  N(p("LF"), f, 500, 420, "Elevator", "lift");

  // Stores in 4 Quadrants
  SLOTS.forEach(([k, x, y], i) => {
    N(p(k), f, x, y, STORES[f][i], "store");
  });

  // Intra-floor Corridors
  E(p("ST"), p("J1"));
  E(p("J1"), p("J2"), "walk", null, f === 0); // Crowded on Floor 0
  E(p("J2"), p("J3"), "walk", null, f === 1); // Crowded on Floor 1
  E(p("J2"), p("ES"), "walk", null, f === 2); // Crowded on Floor 2
  E(p("J2"), p("LF"));

  // Connect Store Doors to assigned Junctions
  SLOTS.forEach(([k, , , j]) => E(p(k), p(j)));
}

// Connect Entrance to Ground Floor Elevator
E("0:EN", "0:LF");

// Vertical Connector Edges between Adjacent Floors
for (let f = 0; f < F.length - 1; f++) {
  E(f + ":ST", (f + 1) + ":ST", "stairs", 25);
  E(f + ":ES", (f + 1) + ":ES", "escalator", 18);
  E(f + ":LF", (f + 1) + ":LF", "lift", 30);
}

/* ==========================================================================
   Binary Min-Heap Priority Queue
   ========================================================================== */
class Heap {
  constructor() {
    this.a = [];
  }
  get size() {
    return this.a.length;
  }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        let m = i, l = 2 * i + 1, r = l + 1;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/* ==========================================================================
   Dijkstra's Algorithm (Min-Heap O((V+E) log V))
   ========================================================================== */
function dijkstra(s, t, o) {
  const dist = {}, prev = {}, done = new Set(), steps = [];
  let relax = 0;
  for (const k in nodes) dist[k] = Infinity;
  dist[s] = 0;
  const h = new Heap();
  h.push([0, s]);

  while (h.size) {
    const [d, u] = h.pop();
    if (done.has(u)) continue; // Stale heap entry
    done.add(u);
    const step = { u, d, rel: 0 };
    steps.push(step);
    if (u === t) break;

    for (const e of adj[u]) {
      // Accessibility filter: skip stairs and escalators
      if (o.acc && (e.kind === "stairs" || e.kind === "escalator")) continue;

      // Crowd avoidance: 3x penalty on congested corridors
      const nd = d + e.w * (o.crowd && e.crowd ? 3 : 1);
      relax++;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        prev[e.to] = u;
        h.push([nd, e.to]);
        step.rel++;
      }
    }
  }

  const path = [];
  if (dist[t] < Infinity) {
    for (let c = t; c; c = prev[c]) path.unshift(c);
  }
  return { path, cost: dist[t], steps, relax };
}

/* ==========================================================================
   Comparative Algorithms: Bellman-Ford & BFS
   ========================================================================== */
function ecost(e, op) {
  if (op.acc && (e.kind === "stairs" || e.kind === "escalator")) return null;
  return e.w * (op.crowd && e.crowd ? 3 : 1);
}

function bellman(s, t, op) {
  const dist = {};
  let checks = 0, passes = 0;
  for (const k in nodes) dist[k] = Infinity;
  dist[s] = 0;
  const V = Object.keys(nodes).length;

  for (let i = 0; i < V - 1; i++) {
    passes++;
    let changed = false;
    for (const u in adj) {
      for (const e of adj[u]) {
        const c = ecost(e, op);
        if (c === null) continue;
        checks++;
        if (dist[u] + c < dist[e.to]) {
          dist[e.to] = dist[u] + c;
          changed = true;
        }
      }
    }
    if (!changed) break; // Early termination
  }
  return { cost: dist[t], checks, passes };
}

function bfs(s, t, op) {
  const prev = { [s]: null }, q = [s];
  let checks = 0;
  for (let i = 0; i < q.length; i++) {
    const u = q[i];
    if (u === t) break;
    for (const e of adj[u]) {
      if (ecost(e, op) === null) continue;
      checks++;
      if (!(e.to in prev)) {
        prev[e.to] = u;
        q.push(e.to);
      }
    }
  }
  if (!(t in prev)) return null;

  let cost = 0, hops = 0;
  for (let c = t; prev[c]; c = prev[c]) {
    cost += ecost(adj[prev[c]].find(x => x.to === c), op);
    hops++;
  }
  return { cost, hops, checks };
}

function compare(s, t, r) {
  const op = o(), bf = bellman(s, t, op), bs = bfs(s, t, op);
  const V = Object.keys(nodes).length;
  const Ed = Object.values(adj).reduce((a, l) => a + l.length, 0) / 2;

  const row = (name, tag, cost, checks, complexity, highlight) =>
    `<tr class="${highlight ? 'highlight-row' : ''}">
      <td><strong>${name}</strong>${tag ? `<span class="algo-tag">${tag}</span>` : ''}</td>
      <td><strong>${cost} m</strong></td>
      <td>${checks}</td>
      <td><code>${complexity}</code></td>
    </tr>`;

  const ratio = (bf.checks / (r.relax || 1)).toFixed(1);

  $("cmp").innerHTML = `
    <div class="cmp-stats-top">
      <span>Mall Graph Topology</span>
      <span><strong>${V} Nodes</strong> • <strong>${Ed} Corridors/Edges</strong></span>
    </div>
    <table class="cmp-table">
      <thead>
        <tr>
          <th>Algorithm</th>
          <th>Total Cost</th>
          <th>Edge Checks</th>
          <th>Theoretical Complexity</th>
        </tr>
      </thead>
      <tbody>
        ${row("Dijkstra", "Optimal", r.cost, `${r.relax} relaxations`, "O((V+E) log V)", true)}
        ${row("Bellman-Ford", "", bf.cost, `${bf.checks} (${bf.passes} passes)`, "O(V·E)", false)}
        ${row("BFS", "Hops Only", bs ? `${bs.cost} (${bs.hops} hops)` : "N/A", bs ? bs.checks : "N/A", "O(V+E)", false)}
      </tbody>
    </table>
    <div class="cmp-analysis-box">
      ${bf.cost === r.cost
        ? `✓ <strong>Bellman-Ford proves exact optimal cost</strong> (${bf.cost}m), but required <strong>${ratio}× more edge evaluations</strong> than Dijkstra's priority queue.`
        : '⚠️ Cost mismatch detected between algorithms.'}
      ${bs
        ? (bs.cost > r.cost
          ? `<br>• BFS found a route costing <strong>+${bs.cost - r.cost}m more</strong> because it minimizes node count instead of actual physical walking distance.`
          : '<br>• BFS hop-optimal route matches distance-optimal cost for this destination.')
        : ''}
    </div>`;
}

/* ==========================================================================
   State & SVG Mall Rendering Engine (Architectural Store Floorplan)
   ========================================================================== */
let cur = 0, run = 0;
let st = { explored: new Set(), path: [], cur: null, marker: "0:EN" };
const o = () => ({ acc: $("acc").checked, crowd: $("crowd").checked });

function render() {
  const f = cur, S = $("ss").value, D = $("sd").value, opt = o();

  // 1) Mall Architecture Canvas Outline & Zone Watermarks
  let h = `
    <!-- Mall Architectural Exterior Walls & Glass Curtain Façade -->
    <rect class="mall-boundary-outer" x="50" y="38" width="900" height="484" rx="26"/>
    <rect class="mall-curtain-glass" x="55" y="43" width="890" height="474" rx="22"/>
    
    <!-- Floor Header Title & Wing Annotations -->
    <text class="mall-level-title" x="500" y="74">${F[f].toUpperCase()} • ${FLOOR_SUBTITLES[f].toUpperCase()}</text>
    <text class="mall-zone-tag" x="250" y="94">West Wing Promenade</text>
    <text class="mall-zone-tag" x="500" y="94">Central Grand Atrium</text>
    <text class="mall-zone-tag" x="750" y="94">East Wing Galleries</text>
  `;

  // 2) Wide Concourse & Walkways
  const vertEnd = f === 0 ? 500 : 420;
  h += `
    <!-- Wide Walkway Concourse Underlays -->
    <line class="concourse-underlay" x1="140" y1="300" x2="860" y2="300"/>
    <line class="concourse-underlay" x1="500" y1="190" x2="500" y2="${vertEnd}"/>
    
    <!-- Polished Concourse Floor Surface -->
    <line class="concourse-surface" x1="140" y1="300" x2="860" y2="300"/>
    <line class="concourse-surface" x1="500" y1="190" x2="500" y2="${vertEnd}"/>

    <!-- Center Guide Tile Line -->
    <line class="concourse-centerline" x1="140" y1="300" x2="860" y2="300"/>
    <line class="concourse-centerline" x1="500" y1="190" x2="500" y2="${vertEnd}"/>

    <!-- Central Grand Atrium Rotunda Court -->
    <circle class="atrium-outer-terrazzo" cx="500" cy="300" r="48"/>
    <circle class="atrium-balustrade-ring" cx="500" cy="300" r="36"/>
    <circle class="atrium-surface-circle" cx="500" cy="300" r="26"/>
    <text class="atrium-title-label" x="500" y="303">ATRIUM</text>
  `;

  // Corridor Graph Edges (visualize crowded zones)
  const here = Object.values(nodes).filter(n => n.f === f);
  here.forEach(a => {
    adj[a.id].forEach(e => {
      const b = nodes[e.to];
      if (b.f === f && a.id < b.id) {
        const isCrowded = opt.crowd && e.crowd;
        h += `<line class="edge-corridor${isCrowded ? ' cw' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        if (isCrowded) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          h += `
            <g>
              <rect x="${midX - 42}" y="${midY - 11}" width="84" height="22" rx="11" fill="var(--warning-light)" stroke="var(--warning-border)" stroke-width="1.5"/>
              <text x="${midX}" y="${midY + 4}" font-size="9.5" font-weight="800" fill="#b45309" text-anchor="middle">⚠️ High Traffic (3x)</text>
            </g>
          `;
        }
      }
    });
  });

  // 3) Retail Store Units Presentation (Strong Storefront Presence)
  SLOTS.forEach(([k, doorX, doorY, , rx, ry], i) => {
    const id = f + ":" + k;
    const isStart = id === S;
    const isDest = id === D;
    const storeName = STORES[f][i];
    const meta = STORE_META[f][i];
    const unitCode = `UNIT ${f === 0 ? 'G' : 'L' + f}-${(i + 1).toString().padStart(2, '0')}`;
    const isTopRow = ry < 200;

    h += `
      <!-- Storefront Unit: ${storeName} -->
      <g class="store-group${isStart ? ' is-start' : ''}${isDest ? ' is-dest' : ''}" onclick="selectStore('${id}')">
        <!-- Store Interior Card -->
        <rect class="store-card" x="${rx}" y="${ry}" width="160" height="100" rx="14" filter="url(#card-shadow)"/>
        
        <!-- Storefront Fascia Canopy Bar -->
        <rect class="store-canopy-bar" x="${rx}" y="${ry}" width="160" height="26" rx="13 13 0 0" fill="${meta.color}"/>
        <text class="store-category-text" x="${rx + 80}" y="${ry + 17}">${meta.glyph} ${meta.cat}</text>

        <!-- Secondary Unit Code & Primary Store Name -->
        <text class="store-unit-number" x="${rx + 80}" y="${ry + 42}">${unitCode}</text>
        <text class="store-name-text" x="${rx + 80}" y="${ry + 63}">${storeName}</text>

        <!-- Glass Display Window Line -->
        <line class="store-window-line" x1="${rx + 15}" y1="${isTopRow ? ry + 88 : ry + 12}" x2="${rx + 145}" y2="${isTopRow ? ry + 88 : ry + 12}"/>

        <!-- Store Door Threshold Mat pointing toward corridor -->
        <rect class="store-door-threshold" x="${doorX - 16}" y="${isTopRow ? ry + 96 : ry - 2}" width="32" height="6" rx="3" fill="${meta.color}"/>
        <circle class="store-door-notch" cx="${doorX}" cy="${doorY}" r="4.5"/>

        <!-- Start / Destination Prominent Badges -->
        ${isStart ? `
          <g>
            <rect x="${rx + 14}" y="${ry + 74}" width="132" height="20" rx="10" fill="var(--start-light)" stroke="var(--start-border)" stroke-width="1.5"/>
            <text x="${rx + 80}" y="${ry + 88}" font-size="10" font-weight="800" fill="#047857" text-anchor="middle">🚩 START POINT</text>
          </g>
        ` : ''}

        ${isDest ? `
          <g>
            <rect x="${rx + 14}" y="${ry + 74}" width="132" height="20" rx="10" fill="var(--dest-light)" stroke="var(--dest-border)" stroke-width="1.5"/>
            <text x="${rx + 80}" y="${ry + 88}" font-size="10" font-weight="800" fill="#b91c1c" text-anchor="middle">🎯 DESTINATION</text>
          </g>
        ` : ''}
      </g>
    `;
  });

  // 4) Active Navigation Route Ribbon
  const p = st.path;
  for (let i = 0; i < p.length - 1; i++) {
    const a = nodes[p[i]], b = nodes[p[i + 1]];
    if (a.f === f && b.f === f) {
      h += `<line class="nav-route-ribbon" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    } else if (a.f !== b.f) {
      if (a.f === f) {
        const dirText = b.f > a.f ? `▲ Up to ${F_SHORT[b.f]}` : `▼ Down to ${F_SHORT[b.f]}`;
        h += `
          <g>
            <rect class="transfer-badge-box" x="${a.x - 50}" y="${a.y - 32}" width="100" height="22" rx="11"/>
            <text class="transfer-badge-text" x="${a.x}" y="${a.y - 17}">${dirText}</text>
          </g>
        `;
      }
      if (b.f === f) {
        h += `
          <g>
            <rect class="transfer-badge-box" x="${b.x - 34}" y="${b.y - 32}" width="68" height="22" rx="11"/>
            <text class="transfer-badge-text" x="${b.x}" y="${b.y - 17}">Arrive</text>
          </g>
        `;
      }
    }
  }

  // 5) Amenities, Facility Kiosks & Subtle Waypoints
  here.forEach(n => {
    const isExplored = st.explored.has(n.id);
    const isCurrent = st.cur === n.id;
    const c = (isExplored ? " ex" : "") + (isCurrent ? " cu" : "");

    if (["stairs", "escalator", "lift"].includes(n.type)) {
      const typeIcons = {
        stairs: "🪜 West Stairs",
        escalator: "⚡ Escalator Bay",
        lift: "🛗 Elevator Tower"
      };
      h += `
        <g>
          <rect class="kiosk-card${c}" x="${n.x - 44}" y="${n.y - 16}" width="88" height="32" rx="9" filter="url(#card-shadow)"/>
          <text class="kiosk-label" x="${n.x}" y="${n.y + 4}">${typeIcons[n.type]}</text>
        </g>
      `;
    } else {
      // Junction Waypoints for Dijkstra Trace (Subtle when idle, prominent when active)
      h += `<circle class="waypoint-node${c}" cx="${n.x}" cy="${n.y}" r="${n.type === "store" ? 3.5 : 5.5}"/>`;
      if (n.type === "junction") {
        h += `<text class="waypoint-label" x="${n.x}" y="${n.y + 19}">${n.label}</text>`;
      }
      if (n.type === "entrance") {
        h += `
          <g>
            <rect x="${n.x - 75}" y="${n.y + 10}" width="150" height="28" rx="8" fill="var(--primary-light)" stroke="var(--primary-border)" stroke-width="1.5" filter="url(#card-shadow)"/>
            <text class="kiosk-label" x="${n.x}" y="${n.y + 28}" fill="var(--primary)">🚪 Main Galleria Entrance</text>
          </g>
        `;
      }
    }
  });

  $("layer").innerHTML = h;

  // Badges on Floor Selection Tabs
  F.forEach((_, i) => {
    const count = [...st.explored].filter(id => nodes[id].f === i).length;
    const b = $("bd" + i);
    if (b) {
      b.textContent = count;
      b.style.display = count ? "inline" : "none";
    }
  });

  $("map-status-pill").textContent = `${F[cur]} • Active Map View`;
  moveMarker();
}

function moveMarker() {
  const n = nodes[st.marker];
  const m = $("me");
  m.style.display = n && n.f === cur ? "block" : "none";
  if (n) {
    m.style.transform = `translate(${n.x}px, ${n.y}px)`;
  }
}

function setFloor(f) {
  cur = f;
  document.querySelectorAll("#tabs button").forEach((b, i) => b.classList.toggle("on", i === f));
  render();
}

function selectStore(id) {
  if ($("ss").value === id) return;
  $("sd").value = id;
  resetView();
}

/* ==========================================================================
   UI Helpers & Reset Handlers
   ========================================================================== */
function fill(sel, entrance) {
  sel.innerHTML = F.map((name, f) => {
    const opts = Object.values(nodes)
      .filter(n => n.f === f && (n.type === "store" || (entrance && n.type === "entrance")))
      .map(n => `<option value="${n.id}">${n.label} (${F_SHORT[f]})</option>`)
      .join("");
    return `<optgroup label="${name}">${opts}</optgroup>`;
  }).join("");
}

function resetView() {
  run++;
  st = { explored: new Set(), path: [], cur: null, marker: $("ss").value };
  ["dist", "time", "nv", "rx"].forEach(i => $(i).textContent = "-");
  $("dir").innerHTML = `<li style="color:var(--text-muted); font-size:13px; font-style:italic;">Choose locations and click Find Shortest Route.</li>`;
  $("log").innerHTML = "";
  $("cmp").innerHTML = `<p style="color:var(--text-muted); font-size:13px;">Execute a route query to view performance benchmarks against Bellman-Ford and BFS.</p>`;
  $("msg-text").textContent = "Select your start point and destination, then press Find Shortest Route.";
  $("msg").className = "route-msg-box";
  setFloor(nodes[st.marker].f);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = s => s < 60 ? Math.round(s) + " sec" : Math.floor(s / 60) + " min " + Math.round(s % 60) + " sec";

function directions(p) {
  return p.slice(1).map((id, i) => {
    const a = nodes[p[i]], b = nodes[id], e = adj[a.id].find(x => x.to === id);
    if (a.f !== b.f) {
      const typeLabel = b.type === "lift" ? "Elevator" : b.type === "escalator" ? "Escalator" : "Stairs";
      const dir = b.f > a.f ? "up" : "down";
      return {
        text: `Take the ${typeLabel} ${dir} to ${F[b.f]}`,
        isTransfer: true,
        isArrive: false
      };
    }
    const isDest = i === p.length - 2;
    return {
      text: isDest ? `Arrive at destination: ${b.label}` : `Walk along corridor to ${b.label} (${e.w} m)`,
      isTransfer: false,
      isArrive: isDest
    };
  });
}

/* ==========================================================================
   Main Route Simulation
   ========================================================================== */
async function go() {
  const s = $("ss").value, t = $("sd").value;
  resetView();
  const tok = run;

  if (s === t) {
    $("msg-text").textContent = "Start and destination are the exact same location.";
    return;
  }

  const r = dijkstra(s, t, o());
  const sp = +$("speed").value;

  $("msg-text").textContent = "Executing Dijkstra priority queue traversal...";
  $("msg").className = "route-msg-box found";

  // 1) Animate Dijkstra Heap Exploration
  for (let i = 0; i < r.steps.length; i++) {
    if (tok !== run) return;
    const x = r.steps[i];
    st.explored.add(x.u);
    st.cur = x.u;

    if (nodes[x.u].f !== cur) {
      setFloor(nodes[x.u].f);
    } else {
      render();
    }

    $("nv").textContent = i + 1;
    const li = document.createElement("li");
    li.textContent = `#${(i + 1).toString().padStart(2, '0')} POP ${nodes[x.u].label} [${nodes[x.u].f ? "F" + nodes[x.u].f : "G"}] • d=${x.d}m • relaxed=${x.rel}`;
    $("log").appendChild(li);
    $("log").scrollTop = 1e9;

    if (sp) await sleep(sp);
  }
  st.cur = null;

  if (!r.path.length) {
    $("msg-text").textContent = "No valid path found with the active constraints.";
    $("msg").className = "route-msg-box";
    render();
    return;
  }

  // 2) Display Metrics and Benchmark Analysis
  st.path = r.path;
  let phys = 0;
  for (let i = 0; i < r.path.length - 1; i++) {
    phys += adj[r.path[i]].find(e => e.to === r.path[i + 1]).w;
  }

  $("dist").textContent = phys + " m";
  $("time").textContent = fmt(phys / 1.3);
  $("rx").textContent = r.relax;

  $("msg-text").innerHTML = `Optimal route found: <strong>${nodes[s].label}</strong> → <strong>${nodes[t].label}</strong>` +
    (o().crowd ? ` <span style="font-size:12px; color:var(--text-muted);">(Weighted: ${r.cost}m)</span>` : '') + ".";

  const dirList = directions(r.path);
  $("dir").innerHTML = dirList.map((d, index) => {
    const cls = d.isTransfer ? "transfer" : d.isArrive ? "arrive" : "";
    return `
      <li class="direction-step ${cls}">
        <span class="step-num">${index + 1}</span>
        <span>${d.text}</span>
      </li>
    `;
  }).join("");

  compare(s, t, r);
  render();

  // 3) Animate User Marker Walk
  for (const id of r.path) {
    if (tok !== run) return;
    if (nodes[id].f !== cur) setFloor(nodes[id].f);
    st.marker = id;
    moveMarker();
    await sleep(400);
  }
}

/* ==========================================================================
   Theme Controller (Light / Dark Mode)
   ========================================================================== */
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("storeway_theme", theme);
  const lbl = $("theme-label");
  if (lbl) {
    lbl.textContent = theme === "dark" ? "Dark" : "Light";
  }
  render();
}

function initTheme() {
  const currentTheme = localStorage.getItem("storeway_theme") || "light";
  setTheme(currentTheme);

  const toggleBtn = $("theme-toggle");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const activeTheme = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = activeTheme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
    };
  }
}

/* ==========================================================================
   Initialization & Event Listeners
   ========================================================================== */
function init() {
  initTheme();

  // Setup Floor Selection Tabs
  $("tabs").innerHTML = F.map((n, i) =>
    `<button class="tab-pill" data-f="${i}">
      <span>${F_SHORT[i]}</span>
      <span class="tab-badge" id="bd${i}">0</span>
    </button>`
  ).join("");

  document.querySelectorAll("#tabs button").forEach(b => {
    b.onclick = () => setFloor(+b.dataset.f);
  });

  fill($("ss"), true);
  fill($("sd"), true);

  $("ss").value = "0:EN";
  $("sd").value = "1:tr";

  // Checkbox UI toggles
  $("acc").onchange = () => {
    $("lbl-acc").classList.toggle("active", $("acc").checked);
    resetView();
  };

  $("crowd").onchange = () => {
    $("lbl-crowd").classList.toggle("active", $("crowd").checked);
    resetView();
  };

  $("ss").onchange = resetView;
  $("sd").onchange = resetView;

  // Swap Locations
  $("swap").onclick = () => {
    const a = $("ss").value, b = $("sd").value;
    $("ss").value = b;
    $("sd").value = a;
    resetView();
  };

  $("find").onclick = go;

  // Render Initial View
  resetView();
}

// Start application once DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
