/* ═══════════════════════════════════════════════════════════════
   ServeCore — armazón
   Barra superior, menú de módulos, migas de pan, ruteo y contingencia.
   Una sola pieza manda la navegación: el árbol de MENU_TREE.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, N = w.NAV, U = w.UI;
  const { $, $$, esc, norm, icon, tag, toast, closeSheet, c, locEtiqueta } = U;

  /* ── estado ─────────────────────────────────────────────────── */
  const S = {
    screen: "inicio", role: "gerencia", locId: "L1", term: 1,
    vendedor: "Kevin Solano", offline: false, queue: 3,
    cart: { cliId: null, lineas: [] }, posSel: null,
    catSel: "A1", catQ: "", catTab: "Producto",
    cliSel: "C1", waSel: "W1", ocSel: 0, arg: null
  };
  const CAJEROS = { L1: "Kevin Solano", L2: "Marta Rojas", L3: "Yendry Chacón", L4: "Esteban Vindas", L5: "Diego Solano", L6: "Grettel Araya", L7: "Josué Mora" };

  const APP = {
    screens: {}, order: [], state: S,
    screen(id, def) { this.screens[id] = def; this.order.push(id); },
    go, refresh: () => render(),
    nextConsec
  };

  function nextConsec() {
    const l = D.locales.find(x => x.id === S.locId) || D.locales[0];
    return `${l.cod}-${String(S.term).padStart(5, "0")}-01-${String(D.seq.FE + 1).padStart(10, "0")}`;
  }

  function go(id, arg) {
    if (!APP.screens[id]) return;
    S.screen = id; S.arg = arg;
    closeOverlays();
    render();
  }
  function closeOverlays() { const o = $("#overlayRoot"); if (o) o.innerHTML = ""; menuState.open = false; }

  /* ── barra superior ─────────────────────────────────────────── */
  function renderTopbar() {
    const loc = D.locales.find(l => l.id === S.locId) || D.locales[0];
    const et = locEtiqueta(loc);
    const locLabel = et ? et + " · " + loc.nom : loc.nom;
    const locSub = loc.tipo === "tienda"
      ? `Terminal ${S.term} · ${CAJEROS[loc.id] || "Sin cajero asignado"} · serie ${loc.cod}`
      : loc.tipo === "cedi" ? "Centro de distribución" : "Bodega";
    $("#topbar").innerHTML =
      `<button class="menubtn" id="btnMenu" aria-expanded="${menuState.open}" aria-label="Abrir menú de módulos"><span class="burger"><i></i><i></i><i></i></span></button>
      <div class="brand"><span class="mark-tile"><img src="mark.png" alt="Ferretería Santa Rosa"></span>
        <div><div class="bn">Ferretería Santa Rosa</div><div class="bs">ServeCore · Smart Serve Solutions</div></div></div>
      <div class="gap"></div>
      <button class="localbtn" id="btnLocal">${icon("pin")}
        <div><div class="ln">${esc(locLabel)}</div><div class="ls">${esc(locSub)}</div></div>
        ${icon("chevd", 'style="width:15px;height:15px;color:var(--ink-4)"')}</button>
      <div class="tb-sep"></div>
      <button class="netstatus ${S.offline ? "off" : ""}" id="btnNet" data-tip="${S.offline ? "Enlace caído — el nodo local sigue facturando" : "En línea · réplica hace 4 s"}" aria-label="Estado del enlace">${icon(S.offline ? "server" : "wifi")}</button>
      <div class="userchip"><span class="avatar">AR</span><div><div class="un">Andrey Ramírez</div><div class="ur">Encargado de TI</div></div></div>`;
    $("#btnMenu").addEventListener("click", () => (menuState.open ? closeMenu() : openMenu()));
    $("#btnLocal").addEventListener("click", openLocalPop);
    $("#btnNet").addEventListener("click", toggleEnlace);
  }

  function openLocalPop() {
    const btn = $("#btnLocal");
    const fila = l => `<button class="pop-item" data-loc="${l.id}" aria-current="${l.id === S.locId}">${icon("pin")}
      <div style="flex:1;min-width:0">${locEtiqueta(l) ? `<div class="pl-tag">${locEtiqueta(l)}</div>` : ""}<div class="pl-nom">${esc(l.nom)}</div></div>
      ${l.tipo === "tienda" ? `<span class="dim num" style="font-size:12px">T${l.terminales}</span>` : ""}</button>`;
    U.popover(btn,
      `<div class="pop-h">Tiendas</div>${D.tiendas.map(fila).join("")}
       <div class="pop-h">Centro y bodegas</div>${D.locales.filter(l => l.tipo !== "tienda").map(fila).join("")}`,
      root => $$("[data-loc]", root).forEach(b => b.addEventListener("click", () => {
        S.locId = b.dataset.loc;
        const l = D.locales.find(x => x.id === S.locId);
        closeOverlays(); render();
        toast("Local activo: " + l.nom, "El consecutivo fiscal pasa a la serie " + l.cod, "ok");
      })));
  }

  /* ── contingencia ───────────────────────────────────────────── */
  let qTimer = null;
  function toggleEnlace() {
    S.offline = !S.offline;
    document.body.classList.toggle("offline", S.offline);
    clearInterval(qTimer);
    if (S.offline) {
      toast("Enlace caído", "El local sigue operando contra su nodo. Los documentos se encolan y salen al reconectar.", "wa");
      qTimer = setInterval(() => { S.queue++; const q = $("#queueCount"); if (q) q.textContent = S.queue; }, 4200);
    } else {
      toast("Enlace restablecido", S.queue + " documentos enviados a Hacienda y aceptados.", "ok");
      S.queue = 3;
    }
    render();
  }
  function renderBanda() {
    const el = $("#contband");
    el.hidden = !S.offline;
    el.innerHTML = S.offline
      ? `${icon("server")}<span>Enlace caído. El nodo local sigue facturando: <b class="num" id="queueCount">${S.queue}</b> documentos en cola para Hacienda, se envían al reconectar.</span>
         <button class="btn sm" id="bandaFix">Restablecer enlace</button>` : "";
    if (S.offline) $("#bandaFix").addEventListener("click", toggleEnlace);
  }

  /* ── menú de módulos ────────────────────────────────────────── */
  const menuState = { open: false, module: "ventas", q: "" };

  function openMenu() {
    menuState.open = true;
    $("#overlayRoot").innerHTML =
      `<div class="menu-scrim" id="menuScrim"></div>
       <div class="menu-panel">
         <div class="menu-search">${icon("search")}<input id="menuQ" placeholder="Buscar un módulo, un artículo, un cliente o un documento" autofocus></div>
         <div class="menu-body"><div class="menu-groups" id="menuGroups"></div><div class="menu-items" id="menuItems"></div></div>
         <div class="menu-foot" id="menuFoot"></div>
       </div>`;
    $("#menuScrim").addEventListener("click", closeMenu);
    document.addEventListener("keydown", escCloseMenu);
    renderMenuGroups(); renderMenuRight();
    const mq = $("#menuQ");
    mq.value = menuState.q;
    mq.focus(); mq.setSelectionRange(mq.value.length, mq.value.length);
    mq.addEventListener("input", () => { menuState.q = mq.value; updateActiveModuleButtons(); renderMenuRight(); });
    const b = $("#btnMenu"); if (b) b.setAttribute("aria-expanded", "true");
  }
  function escCloseMenu(e) { if (e.key === "Escape") closeMenu(); }
  function closeMenu() {
    menuState.open = false;
    $("#overlayRoot").innerHTML = "";
    document.removeEventListener("keydown", escCloseMenu);
    const b = $("#btnMenu"); if (b) b.setAttribute("aria-expanded", "false");
  }

  function renderMenuGroups() {
    const wrap = $("#menuGroups");
    if (!wrap) return;
    wrap.innerHTML =
      `<button class="mg" data-goid="inicio" style="margin-bottom:8px">${icon("home")}<span>Inicio</span></button>` +
      N.MODULES.map(m => `<button class="mg" data-mod="${m.id}" aria-current="${!menuState.q && menuState.module === m.id}">${icon(m.ic)}<span>${esc(m.t)}</span><span class="cnt" title="Requerimientos de la matriz en este módulo">${N.menuReqCount(m.id)}</span></button>`).join("");
    wrap.querySelector('[data-goid="inicio"]').addEventListener("click", () => go("inicio"));
    $$(".mg[data-mod]", wrap).forEach(b => b.addEventListener("click", () => {
      menuState.module = b.dataset.mod; menuState.q = "";
      $("#menuQ").value = "";
      updateActiveModuleButtons(); renderMenuRight(); $("#menuQ").focus();
    }));
  }
  function updateActiveModuleButtons() {
    const wrap = $("#menuGroups");
    if (!wrap) return;
    $$(".mg[data-mod]", wrap).forEach(b => b.setAttribute("aria-current", String(!menuState.q && b.dataset.mod === menuState.module)));
  }

  /* la búsqueda del menú también entra a los datos: un código, una cédula
     o un consecutivo llevan directo a su ficha, sin pasar por el módulo */
  function buscarDatos(q) {
    const t = norm(q).split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    const hit = hay => t.every(x => norm(hay).includes(x));
    const out = [];
    D.articulos.forEach(a => { if (out.length < 8 && hit(a.cod + " " + a.desc + " " + a.marca)) out.push({ ic: a.tipo === "Servicio" ? "wrench" : "box", t: a.desc, k: a.cod + " · " + c(a.precio), go: () => { S.catSel = a.id; S.catTab = a.tipo; S.catQ = ""; go("catalogo", "articulos"); } }); });
    D.clientes.forEach(x => { if (out.length < 14 && hit(x.nom + " " + x.ced)) out.push({ ic: "users", t: x.nom, k: x.ced, go: () => { S.cliSel = x.id; go("clientes"); } }); });
    D.proveedores.forEach(x => { if (out.length < 18 && hit(x.nom + " " + x.ced)) out.push({ ic: "truck", t: x.nom, k: x.ced, go: () => go("proveedores") }); });
    D.documentos.forEach(x => { if (out.length < 24 && hit(x.cons)) out.push({ ic: "file", t: x.cons, k: x.tipo + " · " + c(x.total), go: () => go("documentos", x.id) }); });
    return out;
  }

  function renderMenuRight() {
    const flat = N.menuFlatten();
    const buscando = !!menuState.q;
    /* el buscador también entra a las pestañas de cada opción: una pestaña
       no ocupa lugar en el menú, pero se encuentra por su nombre */
    const results = [];
    if (buscando) {
      /* cada palabra tiene que aparecer, en cualquier orden: «cuenta por artículo» encuentra «cuenta de destino por artículo» */
      const toks = norm(menuState.q).split(/\s+/).filter(Boolean);
      const hit = hay => toks.every(x => hay.includes(x));
      flat.forEach(it => {
        const propio = hit(norm(it.modT + " " + it.secT + " " + it.t + " " + (it.d || "") + " " + it.reqs.join(" ")));
        if (propio) results.push(it);
        if (!it.screen || hit(norm(it.t))) return;
        it.tabs.forEach(tb => {
          if (hit(norm(tb.t + " " + (tb.kw || ""))))
            results.push(Object.assign({}, it, { secT: it.secT + " › " + it.t, t: tb.t, arg: tb.id, d: null }));
        });
      });
    }
    const datos = buscando ? buscarDatos(menuState.q) : [];
    const curMod = N.MODULES.find(m => m.id === menuState.module) || N.MODULES[0];
    const curSections = N.MENU_TREE[curMod.id] || [];
    const totalItems = flat.length;
    const reqSeen = {};
    flat.forEach(it => it.reqs.forEach(r => (reqSeen[r] = true)));
    const totalReqs = Object.keys(reqSeen).length;
    const totalImpl = flat.filter(it => it.screen || it.action).length;

    const ridLabel = it => (it.reqs || []).length <= 1 ? esc(it.reqs[0] || "") : esc(it.reqs[0]) + " +" + (it.reqs.length - 1);
    const ridTitle = it => esc((it.reqs || []).join(", "));
    const chevIc = icon("chev", 'style="width:14px;height:14px;color:var(--ink-4)"');

    const argAttr = it => it.arg ? ` data-arg="${esc(it.arg)}"` : "";
    function leafRow(it) {
      const clickable = !!(it.screen || it.action);
      const inner = `<span class="mn">${esc(it.t)}${it.d ? `<span class="msd">${esc(it.d)}</span>` : ""}</span><span class="rid" title="${ridTitle(it)}">${ridLabel(it)}</span>${clickable ? chevIc : tag("Próximamente", "mu", "clock")}`;
      if (!clickable) return `<div class="msi soon">${inner}</div>`;
      return `<button class="msi" ${it.action ? `data-action="${it.action}"` : `data-goid="${it.screen}"${argAttr(it)}`}>${inner}</button>`;
    }
    function searchRow(it) {
      const clickable = !!(it.screen || it.action);
      const attr = it.action ? `data-action="${it.action}"` : it.screen ? `data-goid="${it.screen}"${argAttr(it)}` : `data-jump="${it.modId}"`;
      return `<button class="msr" ${attr}><div class="path">${esc(it.modT)} › ${esc(it.secT)}</div>
        <div class="row"><span class="mn">${esc(it.t)}</span><span class="rid" title="${ridTitle(it)}">${ridLabel(it)}</span>
        <span style="margin-left:auto;display:flex;align-items:center">${clickable ? chevIc : tag("Próximamente", "mu", "clock")}</span></div></button>`;
    }

    let html;
    if (buscando) {
      html = (datos.length
        ? `<div class="msec"><div class="msec-h"><span class="mit-sm">${icon("search")}</span><h4>En los datos</h4></div>
           <div class="msub">${datos.map((r, i) => `<button class="msi" data-dato="${i}">${icon(r.ic)}<span class="mn">${esc(r.t)}</span><span class="rid">${esc(r.k)}</span>${chevIc}</button>`).join("")}</div></div>` : "") +
        (results.length
          ? `<div class="msec-list" style="margin-top:${datos.length ? "18px" : "0"}">${results.map(searchRow).join("")}</div>`
          : datos.length ? "" : `<div class="mut" style="padding:34px 6px;text-align:center;font-size:14px">Sin resultados para «${esc(menuState.q)}». Pruebe con otro término.</div>`);
    } else {
      html = `<div class="menu-modh"><span class="mit" style="width:32px;height:32px">${icon(curMod.ic)}</span>
        <h3>${esc(curMod.t)}</h3>
        <span class="hint">${N.menuReqCount(curMod.id)} requerimientos · ${N.menuCount(curMod.id)} opciones de menú</span></div>
        <div class="msec-list">${curSections.map(sec =>
          `<div class="msec"><div class="msec-h"><span class="mit-sm">${icon(sec.ic || curMod.ic)}</span><h4>${esc(sec.t)}</h4></div>
           <div class="msub">${sec.items.map(leafRow).join("")}</div></div>`).join("")}</div>`;
    }

    const itemsEl = $("#menuItems");
    itemsEl.innerHTML = html;
    itemsEl.scrollTop = 0;
    $("#menuFoot").innerHTML = `${icon("info")}<span>${totalReqs} requerimientos de la matriz en ${N.MODULES.length} módulos, agrupados en ${totalItems} opciones de menú · ${totalImpl} con pantalla activa en este demo · escriba para buscar en todos a la vez</span>`;

    $$("[data-goid]", itemsEl).forEach(b => b.addEventListener("click", () => go(b.dataset.goid, b.dataset.arg)));
    $$("[data-dato]", itemsEl).forEach(b => b.addEventListener("click", () => { closeMenu(); datos[+b.dataset.dato].go(); }));
    $$("[data-action]", itemsEl).forEach(b => b.addEventListener("click", () => {
      const act = b.dataset.action;
      closeMenu();
      if (APP.actions && APP.actions[act]) APP.actions[act]();
    }));
    $$("[data-jump]", itemsEl).forEach(b => b.addEventListener("click", () => {
      menuState.module = b.dataset.jump; menuState.q = "";
      $("#menuQ").value = "";
      updateActiveModuleButtons(); renderMenuRight(); $("#menuQ").focus();
    }));
  }
  APP.abrirMenu = mod => { if (mod) { menuState.module = mod; menuState.q = ""; } openMenu(); };

  /* ── migas de pan ───────────────────────────────────────────── */
  function renderBreadcrumb() {
    const el = $("#breadcrumb");
    const chev = icon("chev", 'style="width:13px;height:13px;color:var(--ink-4)"');
    const path = S.screen === "inicio" ? null : N.menuPathFor(S.screen);
    let html = `<button class="bc-item${path ? "" : " current"}" data-goid="inicio"${path ? "" : ' aria-current="true"'}>${icon("home")}<span>Inicio</span></button>`;
    if (path) {
      /* en un espacio de trabajo con pestañas, la pestaña activa es el último eslabón */
      const def = APP.screens[S.screen] || {};
      const pest = def.crumb ? def.crumb() : null;
      html += chev + `<button class="bc-item" data-openmod="${path.mod.id}">${esc(path.mod.t)}</button>` +
        chev + `<button class="bc-item" data-openmod="${path.mod.id}">${esc(path.sec.t)}</button>` +
        chev + (pest
          ? `<span class="bc-item"><span>${esc(path.item.t)}</span></span>` + chev + `<span class="bc-item current" aria-current="true"><span>${esc(pest)}</span></span>`
          : `<span class="bc-item current" aria-current="true"><span>${esc(path.item.t)}</span></span>`);
    }
    el.innerHTML = html;
    $$("[data-goid]", el).forEach(b => b.addEventListener("click", () => go(b.dataset.goid)));
    $$("[data-openmod]", el).forEach(b => b.addEventListener("click", () => APP.abrirMenu(b.dataset.openmod)));
  }

  const val = (x, ...a) => (typeof x === "function" ? x(...a) : x);
  /* ── espacio de trabajo con pestañas ───────────────────────────
     Una opción de menú por tarea; lo que antes era otra opción de menú
     ahora es una pestaña.
     A.workspace(id, {title, sub, tabs, onArg})
     tabs: [{id, t, sub, badge() → {n, k, l}, actions(), render(el), wire(view)}]
     A.go(id, "pestaña") abre esa pestaña; A.go(id, "pestaña:dato") además
     le entrega el dato a onArg. El argumento se consume al llegar, así un
     refresco no devuelve a nadie a la pestaña de la que ya salió.        */
  APP.workspace = function (id, cfg) {
    const st = { tab: cfg.tabs[0].id };
    const cur = () => cfg.tabs.find(t => t.id === st.tab) || cfg.tabs[0];
    const tabId = t => "tab-" + id + "-" + t;

    function barra() {
      return `<div class="tabs" role="tablist" aria-label="${esc(cfg.title)}">${cfg.tabs.map(t => {
        const on = t.id === st.tab;
        const b = t.badge ? t.badge() : null;
        return `<button type="button" class="tab" role="tab" id="${tabId(t.id)}" data-tab="${t.id}"
          aria-selected="${on}" aria-controls="tp-${id}" tabindex="${on ? 0 : -1}"><span>${esc(t.t)}</span>${b && b.n
            ? `<span class="tb ${b.k || ""}" title="${esc(b.l || "")}">${b.n}</span>` : ""}</button>`;
      }).join("")}</div>`;
    }

    APP.screen(id, {
      title: cfg.title,
      sub: () => val(cur().sub) || val(cfg.sub) || "",
      extra: () => (cur().actions ? cur().actions() : ""),
      crumb: () => cur().t,
      prep(arg) {
        if (arg == null || arg === "") return;
        const s = String(arg), i = s.indexOf(":");
        const tab = i < 0 ? s : s.slice(0, i), dato = i < 0 ? null : s.slice(i + 1);
        if (cfg.tabs.some(t => t.id === tab)) st.tab = tab;
        if (cfg.onArg) cfg.onArg(tab, dato);
        S.arg = null;
      },
      render(v) {
        v.innerHTML = barra() + `<div role="tabpanel" id="tp-${id}" aria-labelledby="${tabId(st.tab)}"></div>`;
        cur().render($("#tp-" + id, v));
      },
      wire(v) {
        const tabs = $$('.tabs [role="tab"]', v);
        const ir = (t, foco) => {
          st.tab = t;
          render();
          if (foco) { const n = document.getElementById(tabId(t)); if (n) n.focus(); }
        };
        tabs.forEach((b, i) => {
          b.addEventListener("click", () => { if (b.dataset.tab !== st.tab) ir(b.dataset.tab); });
          b.addEventListener("keydown", e => {
            const n = tabs.length;
            const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n
              : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
            if (j != null) { e.preventDefault(); ir(tabs[j].dataset.tab, true); }
          });
        });
        /* en pantallas angostas la barra se desplaza: la pestaña activa queda a la vista */
        const sel = $('.tabs [aria-selected="true"]', v);
        if (sel && sel.parentNode.scrollWidth > sel.parentNode.clientWidth)
          sel.parentNode.scrollLeft = sel.offsetLeft - 16;
        if (cur().wire) cur().wire(v);
      }
    });
  };

  /* enlaces internos: cualquier botón con data-ir="pantalla|argumento" */
  APP.wireIr = root => $$("[data-ir]", root).forEach(b => b.addEventListener("click", () => {
    const [scr, arg] = b.dataset.ir.split("|");
    go(scr, arg || undefined);
  }));

  /* ── pintado ────────────────────────────────────────────────── */
  function render() {
    const def = APP.screens[S.screen] || APP.screens.inicio;
    /* prep recibe el argumento de A.go antes de pintar (pestaña, periodo…)
       y puede consumirlo, para que un refresco no lo vuelva a aplicar */
    if (def.prep) def.prep(S.arg);
    renderTopbar();
    renderBreadcrumb();
    renderBanda();
    const v = $("#view");
    v.scrollTop = 0;
    const cabeza = def.bare ? "" : U.pageHead(
      typeof def.title === "function" ? def.title() : def.title,
      typeof def.sub === "function" ? def.sub() : def.sub,
      def.extra ? def.extra() : "");
    if (def.html) {
      v.innerHTML = def.bare ? def.html() : `<div class="${def.pad || "pad"}">${cabeza}${def.html()}</div>`;
    } else {
      v.innerHTML = def.bare ? "" : `<div class="${def.pad || "pad"}">${cabeza}<div id="sbody"></div></div>`;
      def.render(def.bare ? v : $("#sbody"), S.arg);
    }
    if (def.wire) def.wire(v, S.arg);
  }

  /* ── apariencia ─────────────────────────────────────────────── */
  const root = document.documentElement;
  const esOscuro = () => root.getAttribute("data-theme") === "dark";
  function setTema(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("sc-tema", t); } catch (e) { }
    render();
  }
  APP.tema = { es: esOscuro, set: setTema, alterna: () => setTema(esOscuro() ? "light" : "dark") };

  /* ── arranque ───────────────────────────────────────────────── */
  APP.start = function () {
    /* el tema arranca siempre en claro; el modo oscuro se enciende
       en Configuración → Apariencia y ahí queda recordado */
    let t = "light";
    try { t = localStorage.getItem("sc-tema") || "light"; } catch (e) { }
    root.setAttribute("data-theme", t === "dark" ? "dark" : "light");

    document.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); menuState.open ? closeMenu() : openMenu(); return; }
      if (e.key === "Escape") { closeSheet(); return; }
      const tagn = (e.target.tagName || "").toLowerCase();
      if (tagn === "input" || tagn === "textarea" || tagn === "select") return;
      if (e.key === "F1") { e.preventDefault(); go("pos"); }
      if (e.key === "F9") { e.preventDefault(); go("inicio"); }
    });

    /* consejos flotantes */
    const tip = document.createElement("div");
    tip.className = "tip";
    document.body.appendChild(tip);
    document.addEventListener("mouseover", e => {
      const b = e.target.closest("[data-tip]");
      if (!b || !b.dataset.tip) return;
      tip.textContent = b.dataset.tip;
      tip.classList.add("on");
      const r = b.getBoundingClientRect();
      tip.style.left = Math.max(8, Math.min(r.left, innerWidth - tip.offsetWidth - 8)) + "px";
      tip.style.top = Math.max(8, r.bottom + 6) + "px";
    });
    document.addEventListener("mouseout", e => { if (e.target.closest("[data-tip]")) tip.classList.remove("on"); });

    render();
  };

  w.APP = APP;
  w.S = S;
})(window);
