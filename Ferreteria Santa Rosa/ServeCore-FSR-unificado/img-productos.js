/* ═══════════════════════════════════════════════════════════════
   Imágenes de producto.
   Si existe la foto real en productos/<código>.jpg se usa esa; si no,
   una ilustración del tipo de producto (saco, varilla, lámina, tubo…)
   dibujada aquí mismo, para que la demo funcione sin archivos.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const n = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  /* cada forma recibe el color principal y dibuja en un lienzo de 160 × 120 */
  const F = {
    saco: (k, t) => `<path d="M48 28 Q80 18 112 28 L118 96 Q80 106 42 96 Z" fill="${k}"/><path d="M48 28 Q80 18 112 28 L113 38 Q80 28 47 38 Z" fill="#000" opacity=".12"/>
      <rect x="54" y="52" width="52" height="26" rx="3" fill="#fff" opacity=".92"/><text x="80" y="70" font-size="13" font-weight="700" text-anchor="middle" fill="#333" font-family="Arial">${esc(t || "")}</text>`,
    monton: k => `<path d="M22 96 Q50 40 80 38 Q112 40 138 96 Z" fill="${k}"/>${[[60, 70], [80, 58], [98, 74], [72, 84], [110, 88], [50, 88], [88, 86]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#000" opacity=".18"/>`).join("")}`,
    varilla: k => [0, 1, 2, 3].map(i => `<rect x="18" y="${40 + i * 12}" width="124" height="7" rx="3.5" fill="${k}"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => `<rect x="${24 + j * 12}" y="${40 + i * 12}" width="2.5" height="7" fill="#000" opacity=".25"/>`).join("")}`).join(""),
    alambre: k => [0, 1, 2, 3, 4].map(i => `<ellipse cx="${62 + i * 9}" cy="64" rx="26" ry="30" fill="none" stroke="${k}" stroke-width="3"/>`).join(""),
    bloque: k => `<path d="M34 52 L96 52 L126 38 L64 38 Z" fill="${k}" opacity=".85"/><rect x="34" y="52" width="62" height="42" fill="${k}"/><path d="M96 52 L126 38 L126 80 L96 94 Z" fill="#000" opacity=".22"/><path d="M96 52 L126 38 L126 80 L96 94 Z" fill="${k}" opacity=".6"/>
      <rect x="42" y="60" width="18" height="26" fill="#000" opacity=".25"/><rect x="70" y="60" width="18" height="26" fill="#000" opacity=".25"/>`,
    baldosa: k => `<path d="M22 70 L80 46 L138 70 L80 94 Z" fill="${k}"/><path d="M22 70 L80 94 L80 100 L22 76 Z" fill="#000" opacity=".2"/><path d="M80 94 L138 70 L138 76 L80 100 Z" fill="#000" opacity=".3"/>`,
    lamina: k => `<path d="M16 50 ${[0, 1, 2, 3, 4, 5, 6].map(i => `Q${25 + i * 18} 38 ${34 + i * 18} 50`).join(" ")} L150 50 L150 88 L16 88 Z" fill="${k}"/><path d="M16 50 ${[0, 1, 2, 3, 4, 5, 6].map(i => `Q${25 + i * 18} 38 ${34 + i * 18} 50`).join(" ")}" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>
      ${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${25 + i * 18}" y1="46" x2="${25 + i * 18}" y2="88" stroke="#000" opacity=".12" stroke-width="5"/>`).join("")}`,
    perfil: k => `<path d="M20 44 L140 44 L140 52 L30 52 L30 78 L140 78 L140 86 L20 86 Z" fill="${k}"/><path d="M140 44 L148 40 L148 82 L140 86 Z" fill="#000" opacity=".2"/>`,
    tornillo: k => `<rect x="58" y="30" width="44" height="12" rx="3" fill="${k}"/><path d="M72 42 L88 42 L84 96 L80 104 L76 96 Z" fill="${k}"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="70" y1="${48 + i * 8}" x2="90" y2="${52 + i * 8}" stroke="#000" opacity=".3" stroke-width="2"/>`).join("")}`,
    clavo: k => [0, 1, 2].map(i => `<g transform="rotate(${-20 + i * 20} 80 70)"><rect x="66" y="24" width="28" height="6" rx="2" fill="${k}"/><path d="M78 30 L82 30 L81 104 L80 110 L79 104 Z" fill="${k}"/></g>`).join(""),
    tubo: k => `<rect x="14" y="50" width="130" height="24" fill="${k}"/><ellipse cx="144" cy="62" rx="7" ry="12" fill="${k}"/><ellipse cx="144" cy="62" rx="4" ry="8" fill="#000" opacity=".25"/><ellipse cx="14" cy="62" rx="7" ry="12" fill="${k}"/><rect x="14" y="54" width="130" height="5" fill="#fff" opacity=".4"/>`,
    tuboGrande: k => `<rect x="14" y="40" width="120" height="44" fill="${k}"/><ellipse cx="134" cy="62" rx="12" ry="22" fill="${k}"/><ellipse cx="134" cy="62" rx="8" ry="17" fill="#000" opacity=".25"/><ellipse cx="14" cy="62" rx="12" ry="22" fill="${k}"/><rect x="14" y="46" width="120" height="7" fill="#fff" opacity=".35"/>`,
    codo: k => `<path d="M40 40 L72 40 Q104 40 104 72 L104 100 L82 100 L82 72 Q82 62 72 62 L40 62 Z" fill="${k}"/><rect x="30" y="37" width="12" height="28" rx="2" fill="${k}"/><rect x="79" y="98" width="28" height="12" rx="2" fill="${k}"/><path d="M40 44 L70 44 Q98 44 99 72" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>`,
    tee: k => `<rect x="26" y="46" width="108" height="24" fill="${k}"/><rect x="68" y="64" width="24" height="36" fill="${k}"/><rect x="20" y="43" width="12" height="30" rx="2" fill="${k}"/><rect x="128" y="43" width="12" height="30" rx="2" fill="${k}"/><rect x="65" y="96" width="30" height="12" rx="2" fill="${k}"/><rect x="26" y="50" width="108" height="4" fill="#fff" opacity=".5"/>`,
    union: k => `<rect x="30" y="54" width="100" height="18" fill="${k}" stroke="#c8c5bc"/><rect x="62" y="46" width="36" height="34" rx="4" fill="${k}" stroke="#c8c5bc" stroke-width="2"/>`,
    reduccion: k => `<rect x="18" y="46" width="56" height="32" fill="${k}" stroke="#c8c5bc"/><path d="M74 46 L96 54 L96 70 L74 78 Z" fill="${k}" stroke="#c8c5bc"/><rect x="96" y="54" width="48" height="16" fill="${k}" stroke="#c8c5bc"/>`,
    valvula: k => `<rect x="26" y="56" width="108" height="22" fill="${k}"/><rect x="62" y="48" width="36" height="38" rx="5" fill="${k}"/><rect x="76" y="30" width="8" height="20" fill="#555"/><rect x="58" y="24" width="44" height="10" rx="4" fill="#d9442b"/>`,
    lata: (k, t) => `<rect x="54" y="36" width="52" height="64" rx="5" fill="${k}"/><ellipse cx="80" cy="36" rx="26" ry="6" fill="#000" opacity=".2"/><rect x="72" y="24" width="16" height="12" rx="2" fill="#666"/><rect x="58" y="54" width="44" height="26" rx="2" fill="#fff" opacity=".9"/><text x="80" y="71" font-size="10" font-weight="700" text-anchor="middle" fill="#333" font-family="Arial">${esc(t || "")}</text>`,
    cinta: k => `<circle cx="80" cy="64" r="34" fill="${k}"/><circle cx="80" cy="64" r="34" fill="none" stroke="#000" opacity=".12" stroke-width="2"/><circle cx="80" cy="64" r="14" fill="#f3f1ec"/><path d="M110 76 L140 92 L136 98 L106 82 Z" fill="${k}"/>`,
    grifo: k => `<rect x="30" y="56" width="30" height="18" rx="3" fill="${k}"/><path d="M58 52 L96 52 Q116 52 116 72 L116 86 L102 86 L102 72 Q102 66 96 66 L58 66 Z" fill="${k}"/><rect x="70" y="34" width="10" height="20" fill="${k}"/><rect x="58" y="28" width="34" height="9" rx="4" fill="#c33"/><rect x="100" y="84" width="18" height="8" rx="2" fill="${k}"/>`,
    sifon: k => `<path d="M40 20 L56 20 L56 70 Q56 92 80 92 Q104 92 104 70 L104 56 L140 56 L140 70 L120 70 Q120 108 80 108 Q40 108 40 70 Z" fill="${k}"/>`,
    cable: k => [0, 1, 2, 3, 4, 5].map(i => `<circle cx="80" cy="64" r="${14 + i * 5}" fill="none" stroke="#8a8a85" stroke-width="6"/><circle cx="80" cy="64" r="${14 + i * 5}" fill="none" stroke="${k}" stroke-width="4"/>`).join("") + `<path d="M118 64 Q134 64 144 86" fill="none" stroke="${k}" stroke-width="5"/><circle cx="80" cy="64" r="10" fill="#f3f1ec"/>`,
    bombillo: k => `<circle cx="80" cy="52" r="28" fill="${k}"/><circle cx="72" cy="44" r="8" fill="#fff" opacity=".7"/><rect x="68" y="76" width="24" height="10" fill="#bbb"/>${[0, 1, 2].map(i => `<rect x="68" y="${86 + i * 6}" width="24" height="4" fill="#999"/>`).join("")}`,
    panel: k => `<rect x="40" y="30" width="80" height="64" rx="4" fill="#ddd"/><rect x="46" y="36" width="68" height="52" rx="2" fill="${k}"/><path d="M46 36 L80 36 L46 70 Z" fill="#fff" opacity=".35"/>`,
    caja: k => `<rect x="44" y="34" width="72" height="56" rx="4" fill="${k}"/><rect x="52" y="42" width="56" height="40" rx="2" fill="#000" opacity=".15"/>${[[52, 62], [108, 62]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#fff" opacity=".6"/>`).join("")}`,
    disco: k => `<circle cx="80" cy="64" r="38" fill="${k}"/><circle cx="80" cy="64" r="38" fill="none" stroke="#fff" stroke-width="3" opacity=".3"/><circle cx="80" cy="64" r="10" fill="#ddd"/><circle cx="80" cy="64" r="5" fill="#f3f1ec"/>`,
    martillo: k => `<rect x="74" y="44" width="12" height="62" rx="4" fill="#b5793e"/><path d="M44 30 L104 30 L110 36 L104 48 L60 48 Q50 48 44 40 Z" fill="${k}"/><path d="M104 30 L118 22 L122 28 L110 40 Z" fill="${k}"/>`,
    destornillador: k => [0, 1, 2].map(i => `<g transform="translate(${-26 + i * 26} 0)"><rect x="74" y="28" width="12" height="36" rx="5" fill="${["#d33", "#e6a019", "#2a6fdb"][i]}"/><rect x="78" y="64" width="4" height="40" fill="${k}"/></g>`).join(""),
    cintaMetrica: k => `<rect x="44" y="34" width="64" height="60" rx="14" fill="${k}"/><circle cx="76" cy="64" r="16" fill="#000" opacity=".2"/><rect x="106" y="80" width="36" height="10" fill="#f0c419"/><rect x="106" y="80" width="36" height="10" fill="none" stroke="#333" stroke-width="1"/>`,
    nivel: k => `<rect x="14" y="52" width="132" height="22" rx="3" fill="${k}"/><rect x="66" y="56" width="28" height="14" rx="6" fill="#bff2c4"/><circle cx="82" cy="63" r="4" fill="#fff"/>`,
    cubeta: (k, t) => `<path d="M46 40 L114 40 L108 100 L52 100 Z" fill="${k}"/><ellipse cx="80" cy="40" rx="34" ry="7" fill="#000" opacity=".12"/><path d="M48 40 Q80 8 112 40" fill="none" stroke="#666" stroke-width="3"/><rect x="56" y="58" width="48" height="24" rx="2" fill="#fff" opacity=".92"/><text x="80" y="74" font-size="10" font-weight="700" text-anchor="middle" fill="#333" font-family="Arial">${esc(t || "")}</text>`,
    rodillo: k => `<rect x="40" y="32" width="80" height="26" rx="12" fill="${k}"/><path d="M120 45 L130 45 L130 70 L86 70 L86 104" fill="none" stroke="#777" stroke-width="5"/><rect x="80" y="90" width="12" height="24" rx="4" fill="#d33"/>`,
    candado: k => `<path d="M58 60 L58 44 Q58 24 80 24 Q102 24 102 44 L102 60" fill="none" stroke="#aaa" stroke-width="8"/><rect x="48" y="56" width="64" height="48" rx="8" fill="${k}"/><circle cx="80" cy="76" r="6" fill="#333"/><rect x="78" y="78" width="4" height="12" fill="#333"/>`,
    manguera: k => [0, 1, 2, 3].map(i => `<ellipse cx="80" cy="64" rx="${22 + i * 9}" ry="${16 + i * 7}" fill="none" stroke="${k}" stroke-width="7"/>`).join("") + `<rect x="110" y="84" width="22" height="10" rx="3" fill="#e6a019"/>`,
    aspersor: k => `<rect x="70" y="64" width="20" height="36" rx="3" fill="${k}"/><rect x="42" y="56" width="76" height="10" rx="5" fill="${k}"/><circle cx="80" cy="61" r="8" fill="#e6a019"/>${[[34, 44], [126, 44], [30, 30], [130, 30]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#6bb7e8"/>`).join("")}`,
    casco: k => `<path d="M36 84 Q36 36 80 36 Q124 36 124 84 Z" fill="${k}" stroke="#b9b6ad" stroke-width="2"/><rect x="28" y="82" width="104" height="10" rx="5" fill="${k}" stroke="#b9b6ad" stroke-width="2"/><path d="M76 38 L84 38 L84 82 L76 82 Z" fill="#000" opacity=".08"/>`,
    guante: k => `<path d="M56 104 L56 60 L50 44 Q48 36 55 36 Q60 36 62 44 L64 50 L64 28 Q64 22 70 22 Q76 22 76 28 L76 48 L78 24 Q78 18 84 18 Q90 18 90 24 L90 48 L92 30 Q92 24 98 24 Q104 24 104 30 L104 78 Q104 96 96 104 Z" fill="${k}"/>`,
    servicio: k => `<circle cx="80" cy="64" r="38" fill="${k}" opacity=".18"/><path d="M62 88 L90 60 Q86 44 100 38 L92 50 L100 58 L112 50 Q106 64 90 62 L66 92 Q60 96 58 92 Q56 88 62 88 Z" fill="${k}"/>`,
    caja3d: k => `<path d="M40 52 L80 36 L120 52 L80 68 Z" fill="${k}" opacity=".8"/><path d="M40 52 L80 68 L80 104 L40 88 Z" fill="${k}"/><path d="M120 52 L80 68 L80 104 L120 88 Z" fill="${k}" opacity=".65"/>`
  };

  /* qué forma y qué color le toca a cada artículo, por lo que dice su descripción */
  const REGLAS = [
    [/fertiliz/, "saco", "#3f8f47", a => (a.desc.match(/\d+\s*kg/) || [""])[0]],
    [/cemento solvente|pegamento/, "lata", "#2a6fdb", () => "PVC"],
    [/cemento/, "saco", "#8b8f94", a => (a.desc.match(/\d+\s*kg/) || [""])[0]],
    [/arena/, "monton", "#d9b77a"], [/piedra|lastre/, "monton", "#9a9a92"],
    [/varilla/, "varilla", "#6b5a4b"], [/alambre/, "alambre", "#3b3b3b"],
    [/baldosa/, "baldosa", "#b8b3aa"], [/bloque/, "bloque", "#a6a39c"],
    [/translucida/, "lamina", "#9fd3e6"], [/lamina|zinc/, "lamina", "#b33a2d"], [/perling|perfil/, "perfil", "#9aa3ad"],
    [/tornillo/, "tornillo", "#a7adb3"], [/clavo/, "clavo", "#9ba1a7"],
    [/sanitario|\b4"/, "tuboGrande", "#e9e6df"], [/conduit|emt/, "tubo", "#b9c0c7"], [/tubo/, "tubo", "#e9e6df"],
    [/codo/, "codo", "#ecebe6"], [/reduccion/, "reduccion", "#ecebe6"], [/union/, "union", "#ecebe6"], [/\btee\b/, "tee", "#ecebe6"], [/valvula/, "valvula", "#ecebe6"],
    [/teflon liquido|sellador/, "lata", "#e8e4d8", () => "50 ml"], [/cinta teflon/, "cinta", "#f7f7f5"],
    [/llave de chorro|grifo/, "grifo", "#c9a24a"], [/sifon/, "sifon", "#ecebe6"],
    [/cable/, "cable", null], [/bombillo/, "bombillo", "#fff3c4"], [/panel led/, "panel", "#f5f7ff"], [/caja rectangular|caja metal/, "caja", "#b9c0c7"],
    [/disco/, "disco", "#2b2f36"], [/martillo/, "martillo", "#3b4250"], [/destornill/, "destornillador", "#b9c0c7"],
    [/cinta metrica/, "cintaMetrica", "#e6a019"], [/nivel/, "nivel", "#e6a019"],
    [/esmalte/, "lata", "#2b2b2b", () => "1 gl"], [/pintura/, "cubeta", null, a => /hueso/.test(n(a.desc)) ? "HUESO" : "BLANCO"], [/rodillo/, "rodillo", "#f1ede4"],
    [/candado/, "candado", "#c9a24a"], [/manguera de riego|agricola/, "manguera", "#2b2b2b"], [/manguera/, "manguera", "#3f9b4f"], [/aspersor/, "aspersor", "#2a6fdb"],
    [/casco/, "casco", "#f5f5f2"], [/guante/, "guante", "#3f6fd8"]
  ];
  const FONDO = { MAT: "#eceae4", TEC: "#f3e9e6", FON: "#e7eef5", ELE: "#f5f1e1", HER: "#eceef2", PIN: "#f1eef4", FGE: "#eceef0", JAR: "#e6f1e5", SEG: "#f3efe2" };

  function svg(a) {
    const d = n(a.desc);
    const r = REGLAS.find(x => x[0].test(d));
    let forma = "caja3d", color = "#b58a54", texto = "";
    if (a.tipo === "Servicio") { forma = "servicio"; color = "#2a6fdb"; }
    else if (r) {
      forma = r[1];
      color = r[2] || (/negro/.test(d) ? "#2b2b2b" : /blanco/.test(d) ? (r[1] === "cable" ? "#f2f2ee" : "#f4f4f2") : /hueso/.test(d) ? "#e9e1cc" : /rojo/.test(d) ? "#c33" : "#555");
      texto = r[3] ? r[3](a) : "";
    }
    const fondo = FONDO[a.fam] || "#eef0f3";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" width="160" height="120"><rect width="160" height="120" fill="${fondo}"/>
      <ellipse cx="80" cy="108" rx="54" ry="6" fill="#000" opacity=".08"/>${F[forma](color, texto)}</svg>`;
  }
  const uri = a => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg(a));

  /* la foto real si existe; si no, la ilustración */
  function img(a, cls, alt) {
    return `<img class="${cls || ""}" src="productos/${encodeURIComponent(a.cod)}.jpg" data-cod="${esc(a.cod)}" alt="${esc(alt || a.desc)}" loading="lazy" onerror="PRODIMG.falla(this)">`;
  }
  function falla(el) {
    el.onerror = null;
    const a = (w.DB.articulos || []).find(x => x.cod === el.dataset.cod);
    if (a) el.src = uri(a);
  }

  /* comprobante de transferencia que manda el cliente (imagen de ejemplo) */
  function comprobante(o) {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240"><rect width="200" height="240" rx="10" fill="#fff"/>
      <rect width="200" height="44" rx="10" fill="#0b5c3b"/><rect y="30" width="200" height="14" fill="#0b5c3b"/>
      <text x="100" y="28" font-family="Arial" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">Transferencia realizada</text>
      <circle cx="100" cy="78" r="18" fill="#e5f4ec"/><path d="M91 78 L98 85 L110 71" fill="none" stroke="#0b5c3b" stroke-width="4"/>
      <text x="100" y="118" font-family="Arial" font-size="11" text-anchor="middle" fill="#666">Monto transferido</text>
      <text x="100" y="140" font-family="Arial" font-size="20" font-weight="700" text-anchor="middle" fill="#111">${esc(o.monto || "")}</text>
      <text x="16" y="170" font-family="Arial" font-size="10" fill="#888">Referencia</text><text x="184" y="170" font-family="Arial" font-size="10" text-anchor="end" fill="#111">${esc(o.ref || "")}</text>
      <text x="16" y="188" font-family="Arial" font-size="10" fill="#888">Destino</text><text x="184" y="188" font-family="Arial" font-size="10" text-anchor="end" fill="#111">${esc(o.destino || "Ferretería Santa Rosa S.A.")}</text>
      <text x="16" y="206" font-family="Arial" font-size="10" fill="#888">Titular</text><text x="184" y="206" font-family="Arial" font-size="10" text-anchor="end" fill="#111">${esc((o.nombre || "").length > 24 ? o.nombre.slice(0, 23) + "…" : o.nombre || "")}</text>
      <text x="100" y="230" font-family="Arial" font-size="8" text-anchor="middle" fill="#aaa">Imagen de ejemplo · la lee el agente</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  }

  w.PRODIMG = { svg, uri, img, falla, comprobante };
})(window);
