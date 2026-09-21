/* ═══════════════════════════════════════════════════════════════
   Nómina · espacios de trabajo
   El menú de Nómina tiene seis opciones, una por tarea: Panel,
   Planilla, Personal, Tiempo y ausencias, Obligaciones de ley y
   Configuración. Lo que antes era una opción de menú por requerimiento
   ahora es una pestaña dentro de su espacio de trabajo.
   Este archivo: el componente de pestañas, el Panel, Personal y
   Tiempo y ausencias. Planilla, Obligaciones y Configuración viven en
   mod-planilla.js. Las reglas y el cálculo viven en nom-data.js.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, U = w.UI, M = w.NOM;
  const { $, $$, esc, norm, grp, c, dec, fecha, fechaL, hora, icon, tag, card, stat, table, seg, onSeg,
    bars, openSheet, closeSheet, toast, locNom, empty } = U;

  const ESTADO_TAG = { Activo: "ok", Vacaciones: "ac", Incapacitado: "wa", Inactivo: "mu" };
  const EST_PER = { Abierta: "mu", "En cálculo": "wa", Aprobada: "ac", Pagada: "ok", Contabilizada: "ok" };
  const pcs = n => dec(n, 2) + " %";

  /* A.workspace y A.wireIr viven en shell.js: los usan Nómina y Contabilidad */

  /* horas extra de la semana por persona — lo usan el Panel y Tiempo */
  function extrasPorPersona() {
    const porEmp = {};
    M.marcas.forEach(m => { if (m.extra) porEmp[m.empId] = (porEmp[m.empId] || 0) + m.extra; });
    return Object.keys(porEmp).map(id => {
      const e = M.emp(id), h = porEmp[id], vh = M.valorHora(e);
      return { e, h, vh, monto: Math.round(h * vh * 1.5), excede: h > M.TOPE_EXTRA_SEM };
    }).sort((a, b) => b.h - a.h);
  }

  /* ═════════════════════════════════════════════════════════════
     1 · PANEL DE NÓMINA — Resumen y pendientes · Reportes
     ═════════════════════════════════════════════════════════════ */

  /* lo que requiere atención, cada cosa con el enlace a donde se resuelve */
  function pendientes() {
    const out = [];
    const act = M.activos();
    ["Quincenal", "Semanal", "Mensual"].forEach(tipo => {
      const p = M.perById[M.ACTUAL[tipo]];
      if (p.estado === "En cálculo") out.push({ k: "wa", ic: "calc", t: `Revisar y aprobar la planilla ${tipo.toLowerCase()} ${p.id}`,
        d: `Se paga el ${fechaL(p.pago)} · ${M.dePeriodo(p).length} personas`, ir: "nom-planilla|" + p.id });
      else if (p.estado === "Abierta") out.push({ k: "in", ic: "wallet", t: `Capturar las novedades de la planilla ${tipo.toLowerCase()} ${p.id}`,
        d: `Del ${fecha(p.desde)} al ${fecha(p.hasta)} · se paga el ${fechaL(p.pago)}`, ir: "nom-planilla|" + p.id });
    });
    const sinRep = M.movimientos.filter(m => !m.reportado);
    if (sinRep.length) out.push({ k: "cr", ic: "upload", t: `Reportar ${sinRep.length} movimiento${sinRep.length === 1 ? "" : "s"} de personal a la CCSS`,
      d: "Se reportan al ocurrir; la CCSS cobra intereses por omisión", ir: "nom-personal|mov" });
    M.OBLIGACIONES.filter(o => o.estado === "Pendiente" && !/ingresos y salidas/.test(o.t)).forEach(o => out.push({
      k: "wa", ic: o.ic, t: o.t, d: `${o.ent} · ${o.plazo}`,
      ir: "nom-obligaciones|" + (o.ent === "Hacienda" ? "renta" : o.ent === "CCSS" ? "ccss" : "cal")
    }));
    const sobreTope = extrasPorPersona().filter(r => r.excede);
    if (sobreTope.length) out.push({ k: "cr", ic: "clock", t: `${sobreTope.length} persona${sobreTope.length === 1 ? "" : "s"} sobre el tope de horas extra`,
      d: "No se pagan hasta que la jefatura las justifique", ir: "nom-tiempo|extras" });
    const sol = M.vacaciones.filter(x => x.estado === "Solicitada");
    if (sol.length) out.push({ k: "wa", ic: "leaf", t: `Aprobar ${sol.length} solicitud${sol.length === 1 ? "" : "es"} de vacaciones`,
      d: "El sistema ya revisó saldo y dotación del local", ir: "nom-tiempo|vac" });
    const prueba = act.filter(e => e.pruebaHasta && e.pruebaHasta >= M.HOY && e.pruebaHasta - M.HOY < 30 * 86400000);
    if (prueba.length) out.push({ k: "in", ic: "badge", t: `${prueba.length} periodo${prueba.length === 1 ? "" : "s"} de prueba vence${prueba.length === 1 ? "" : "n"} en 30 días`,
      d: "Después de los tres meses, un despido ya genera preaviso y cesantía", ir: "nom-personal|colab" });
    const acum = act.filter(e => e.vacSaldo > 24);
    if (acum.length) out.push({ k: "wa", ic: "leaf", t: `${acum.length} personas acumulan más de dos periodos de vacaciones`,
      d: "La ley pide disfrutarlas, no acumularlas", ir: "nom-tiempo|vac" });
    const inc = M.incapacidades.filter(i => i.vigente);
    if (inc.length) out.push({ k: "in", ic: "shield", t: `${inc.length} persona${inc.length === 1 ? "" : "s"} incapacitada${inc.length === 1 ? "" : "s"} hoy`,
      d: "El rebajo y el subsidio ya entran a la planilla", ir: "nom-tiempo|incap" });
    const orden = { cr: 0, wa: 1, in: 2 };
    return out.sort((a, b) => orden[a.k] - orden[b.k]);
  }

  function panelResumen(v) {
    const act = M.activos();
    const mes = M.perById["MEN-2026-09"], qui = M.perById["QUI-2026-17"], sem = M.perById["SEM-2026-37"];
    const tMes = M.totales(M.corrida(mes)), tQui = M.totales(M.corrida(qui)), tSem = M.totales(M.corrida(sem));
    const brutoMes = tMes.bruto + tQui.bruto * 2 + tSem.bruto * 4.33;
    const patMes = tMes.pat + tQui.pat * 2 + tSem.pat * 4.33;
    const incVig = M.incapacidades.filter(i => i.vigente);
    const diasAcum = act.reduce((s, e) => s + e.vacSaldo, 0);
    const pend = pendientes();

    const periodo = p => {
      const t = M.totales(M.corrida(p));
      return `<button class="alert" data-ir="nom-planilla|${p.id}">
          <span class="mit-sm" style="flex:none">${icon("wallet")}</span>
          <span style="flex:1;min-width:0;text-align:left">
            <span class="b" style="display:block">${esc(p.tipo)} · ${esc(p.id)}</span>
            <span class="mut" style="font-size:12.5px">${fecha(p.desde)} al ${fecha(p.hasta)} · ${t.n} personas · bruto ${c(t.bruto)}</span></span>
          ${tag(p.estado, EST_PER[p.estado])}</button>`;
    };

    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Costo mensual de planilla", c(brutoMes + patMes), { txt: "bruto " + c(brutoMes) + " + cargas " + c(patMes), dir: "" })}
          ${stat("Carga patronal", pcs(M.TASAS.totPatrono), { txt: "sobre el salario bruto, nueve entidades", dir: "" }, "var(--warn)")}
          ${stat("Personas activas", act.length, { txt: M.salidas.length + " salidas en el mes · " + incVig.length + " incapacitadas", dir: "" })}
          ${stat("Vacaciones acumuladas", grp(diasAcum) + " días", { txt: "provisión " + c(diasAcum * 16500), dir: diasAcum > 700 ? "down" : "" }, diasAcum > 700 ? "var(--warn)" : "var(--accent)")}
        </div>

        <div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Requiere atención", hint: pend.length ? pend.length + " asuntos, lo urgente primero" : "",
        body: pend.length ? `<div class="alerts">${pend.map(x => `<button class="alert ${x.k}" data-ir="${x.ir}">${icon(x.ic)}
              <span style="flex:1;min-width:0"><span class="at" style="display:block">${esc(x.t)}</span><span class="as">${esc(x.d)}</span></span>
              ${icon("chev", 'style="color:var(--ink-4)"')}</button>`).join("")}</div>`
          : empty("check", "Nada pendiente", "Las planillas, los reportes a la CCSS y las declaraciones están al día.")
      })}
          ${card({
        title: "Planillas en curso", hint: "semanal, quincenal y mensual",
        body: `<div class="alerts">${[qui, sem, mes].map(periodo).join("")}</div>`
      })}
        </div>

        ${card({
        title: "Lo que el sistema vigila solo", hint: "reglas de ley que hoy se controlan a mano",
        body: `<div class="tiles">
          <div class="tile"><div class="tn">Salario contra el mínimo de ley</div><div class="td">Ningún puesto puede quedar bajo el decreto 45303-MTSS. Se revisa en cada aumento y en cada ingreso.</div></div>
          <div class="tile"><div class="tn">Tope de horas extra</div><div class="td">${M.TOPE_EXTRA_DIA} horas por día y ${M.TOPE_EXTRA_SEM} por semana. La marca que se pasa queda señalada antes de pagarse.</div></div>
          <div class="tile"><div class="tn">Orden legal de los rebajos</div><div class="td">Cargas y renta primero, pensión alimentaria después, y el mínimo inembargable de ${c(M.MIN_INEMBARGABLE)} siempre intacto.</div></div>
          <div class="tile"><div class="tn">Vacaciones que se acumulan</div><div class="td">Aviso cuando alguien pasa de dos periodos sin disfrutar. Hoy hay ${act.filter(e => e.vacSaldo > 24).length} personas en ese caso.</div></div>
          <div class="tile"><div class="tn">Reporte de ingresos y salidas</div><div class="td">Cada movimiento va a la CCSS al ocurrir, no al cierre del mes.</div></div>
          <div class="tile"><div class="tn">Periodo de prueba</div><div class="td">Aviso antes de los tres meses, mientras el despido todavía no genera preaviso ni cesantía.</div></div>
        </div>`
      })}
      </div>`;
  }

  function panelReportes(v) {
    const act = M.activos();
    const porLocal = D.locales.map(l => {
      const g = act.filter(e => e.locId === l.id);
      return { n: l.nom, p: g.length, v: g.reduce((s, e) => s + e.salario, 0) };
    }).filter(x => x.p).sort((a, b) => b.v - a.v);
    const porArea = {}, genteArea = {};
    act.forEach(e => { porArea[e.area] = (porArea[e.area] || 0) + e.salario; genteArea[e.area] = (genteArea[e.area] || 0) + 1; });
    const serie = [8.1, 8.3, 8.2, 8.6, 8.5, 8.9, 9.1, 9.0, 9.4];
    const ausencias = M.marcas.filter(m => m.estado === "Ausencia").length;
    const cargas = 1 + M.TASAS.totPatrono / 100;
    const REPORTES = [
      ["Costo de planilla por local y por área", "Bruto, cargas y costo total, comparable mes a mes."],
      ["Planilla histórica por persona", "Todo lo pagado a alguien desde su ingreso, en una sola vista."],
      ["Horas extra por local y por jefatura", "Quién las autoriza y cuánto cuestan."],
      ["Ausentismo e incapacidades", "Días perdidos, causa y costo directo al patrono."],
      ["Rotación de personal", "Ingresos y salidas por periodo, con el costo de las liquidaciones."],
      ["Provisiones y pasivo laboral", "Aguinaldo, vacaciones y cesantía acumulados."],
      ["Comparativo contra el mínimo de ley", "Cuánto margen hay sobre el decreto vigente, puesto por puesto."],
      ["Conciliación planilla contra CCSS", "Lo reportado contra lo pagado, mes a mes."]
    ];
    const sal = act.reduce((s, e) => s + e.salario, 0);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Costo de planilla del mes", c(sal * cargas), { txt: "bruto más " + pcs(M.TASAS.totPatrono) + " de cargas", dir: "up" })}
          ${stat("Costo por persona", c(sal * cargas / act.length), { txt: "promedio de los " + act.length + " activos", dir: "" })}
          ${stat("Ausentismo de la semana", ausencias + " días", { txt: dec(ausencias / (act.length * 6) * 100, 1) + " % de las jornadas", dir: "" }, "var(--warn)")}
          ${stat("Rotación del trimestre", dec(M.salidas.length / act.length * 100 * 4, 1) + " %", { txt: "anualizada", dir: "" })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Costo de planilla · últimos nueve meses", hint: "en millones de colones, con cargas",
        body: U.lineChart(serie, ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set"], 620, 170, { alt: "Costo mensual de planilla" })
      })}
          ${card({
        title: "Costo por área", hint: "salario base mensual",
        body: bars(Object.keys(porArea).sort((a, b) => porArea[b] - porArea[a]).map(k => ({ n: k + " · " + genteArea[k], v: porArea[k], lab: c(porArea[k]) })))
      })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Planilla por local", hint: "personas, salarios y costo con cargas",
        body: table({
          cols: [
            { t: "Local", fmt: r => esc(r.n) },
            { t: "Personas", r: true, cls: "mono", fmt: r => r.p },
            { t: "Salarios", r: true, cls: "mono", fmt: r => grp(r.v) },
            { t: "Con cargas", r: true, cls: "mono", fmt: r => `<b>${grp(r.v * cargas)}</b>` }
          ], rows: porLocal,
          foot: [{ v: "Total" }, { v: porLocal.reduce((s, r) => s + r.p, 0), r: true, cls: "mono" },
          { v: grp(porLocal.reduce((s, r) => s + r.v, 0)), r: true, cls: "mono" },
          { v: grp(porLocal.reduce((s, r) => s + r.v, 0) * cargas), r: true, cls: "mono" }]
        })
      })}
          ${card({
        title: "Catálogo de reportes", hint: "exportables y consultables por el agente de IA",
        body: `<div class="alerts">${REPORTES.map(r => `<button class="alert" data-rep="1"><span class="mit-sm" style="flex:none">${icon("chart")}</span>
          <span style="flex:1;text-align:left"><span class="b" style="display:block">${esc(r[0])}</span>
          <span class="mut" style="font-size:12.5px">${esc(r[1])}</span></span>${icon("chev")}</button>`).join("")}</div>`
      })}
        </div></div>`;
  }

  A.workspace("nomina", {
    title: "Nómina y recursos humanos",
    sub: () => M.activos().length + " personas activas en 7 locales, el CEDI y dos bodegas · setiembre 2026",
    tabs: [
      {
        id: "resumen", t: "Resumen y pendientes",
        badge: () => { const n = pendientes().length; return { n, k: "wa", l: n + " asuntos que requieren atención" }; },
        actions: () => `<button class="btn pri" data-ir="nom-planilla">${icon("wallet")}Ir a la planilla</button>`,
        render: panelResumen,
        wire: v => A.wireIr(v)
      },
      {
        id: "reportes", t: "Reportes de nómina",
        sub: "Lo que gerencia pregunta todos los meses, sin pedirle nada a nadie",
        render: panelReportes,
        wire: v => $$("[data-rep]", v).forEach(b => b.addEventListener("click", () =>
          toast("Reporte generado", "Se abre con gráfico primero y el detalle debajo; se exporta a Excel o a PDF.", "ok")))
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     2 · PERSONAL — Colaboradores · Movimientos · Puestos y salarios ·
         Salidas y liquidaciones
     ═════════════════════════════════════════════════════════════ */
  let pQ = "", pLoc = "Todos", pEstado = "Todos";

  function colaboradores(v) {
    const rows = M.empleados.filter(e =>
      (pLoc === "Todos" || locNom(e.locId) === pLoc) &&
      (pEstado === "Todos" || e.estado === pEstado) &&
      (!pQ || norm(e.nom + " " + e.ced + " " + e.puesto).includes(norm(pQ))));
    A._nomRows = rows;
    v.innerHTML = `<div class="wrap">
        <div class="filters">
          <input class="inp" id="pq" placeholder="Buscar por nombre, cédula o puesto" aria-label="Buscar colaborador" value="${esc(pQ)}" style="max-width:320px">
          <select class="inp" id="ploc" aria-label="Local" style="max-width:190px">${["Todos"].concat(D.locales.map(l => l.nom)).map(o => `<option ${o === pLoc ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
          <select class="inp" id="pest" aria-label="Estado" style="max-width:170px">${["Todos", "Activo", "Vacaciones", "Incapacitado", "Inactivo"].map(o => `<option ${o === pEstado ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
          <span class="mut" style="font-size:12.5px;margin-left:auto">${rows.length} de ${M.empleados.length}</span>
        </div>
        ${card({
      title: "Personal", hint: "toque una fila para abrir el expediente completo",
      body: table({
        h: "calc(100dvh - 440px)", onRow: true,
        cols: [
          { t: "Colaborador", fmt: r => `<b>${esc(r.nom)}</b><span class="sub">${esc(r.ced)}</span>` },
          { t: "Puesto", fmt: r => `${esc(r.puesto)}<span class="sub ui">${esc(r.area)}</span>` },
          { t: "Local", fmt: r => esc(locNom(r.locId)) },
          { t: "Planilla", fmt: r => tag(r.planilla, "mu") },
          { t: "Jornada", fmt: r => esc(r.jornada) },
          { t: "Ingreso", cls: "mono", fmt: r => fechaL(r.ingreso) },
          { t: "Antigüedad", r: true, cls: "mono", fmt: r => dec(r.antiguedad, 1) + " a" },
          { t: "Salario", r: true, cls: "mono", fmt: r => grp(r.salario) },
          { t: "Sobre el mínimo", r: true, cls: "mono", fmt: r => { const d = (r.salario / r.minimo - 1) * 100; return `<span style="color:${d < 0 ? "var(--crit)" : "var(--ink-3)"}">${d < 0 ? "−" : "+"}${dec(Math.abs(d), 0)} %</span>`; } },
          { t: "Estado", fmt: r => tag(r.estado, ESTADO_TAG[r.estado]) }
        ], rows, rowCls: r => (r.salario < r.minimo ? "wa" : "")
      })
    })}</div>`;
  }
  function colaboradoresWire(v) {
    const q = $("#pq", v);
    if (q) q.addEventListener("input", () => { pQ = q.value; A.refresh(); setTimeout(() => { const n = $("#pq"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); });
    const l = $("#ploc", v); if (l) l.addEventListener("change", () => { pLoc = l.value; A.refresh(); });
    const s = $("#pest", v); if (s) s.addEventListener("change", () => { pEstado = s.value; A.refresh(); });
    const nu = $("#pNuevo", document); if (nu) nu.addEventListener("click", fichaNueva);
    const ex = $("#pExp", document); if (ex) ex.addEventListener("click", () => toast("Expedientes exportados", A._nomRows.length + " filas con puesto, salario, cuenta y dependientes.", "ok"));
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => abrirFicha(A._nomRows[+tr.dataset.i])));
  }

  function abrirFicha(e) {
    const ag = M.aguinaldo(e);
    const inc = M.incapacidades.filter(x => x.empId === e.id);
    const vac = M.vacaciones.filter(x => x.empId === e.id);
    const mov = M.movimientos.filter(x => x.empId === e.id);
    const per = M.perById[M.ACTUAL[e.planilla]];
    const k = M.calc(e, per);
    const dato = (l, val) => `<div class="fcell"><div class="fl">${esc(l)}</div><div class="fv" style="font-size:13.5px;font-weight:600">${val}</div></div>`;
    openSheet({
      wide: true, tight: true,
      title: e.nom,
      sub: `${e.puesto} · ${locNom(e.locId)} · ingresó el ${fechaL(e.ingreso)}`,
      body: `
        <div class="ficha">${dato("Cédula", `<span class="num">${esc(e.ced)}</span>`)}
          ${dato("Estado", tag(e.estado, ESTADO_TAG[e.estado]))}
          ${dato("Antigüedad", `<span class="num">${dec(e.antiguedad, 1)} años</span>`)}
          ${dato("Contrato", esc(e.contrato))}</div>
        <div class="ficha">${dato("Salario mensual", `<span class="num">${c(e.salario)}</span>`)}
          ${dato("Mínimo de ley · " + e.cat, `<span class="num">${c(e.minimo)}</span>`)}
          ${dato("Valor hora", `<span class="num">${c(k.valorHora)}</span>`)}
          ${dato("Planilla", tag(e.planilla, "ac"))}</div>
        ${card({
        title: "Contrato y jornada", body: `<dl class="kv">
          <dt>Jornada</dt><dd>${esc(e.jornada)} · ${e.jornada === "Nocturna" ? "6 h / 36 semanales" : e.jornada === "Mixta" ? "7 h / 42 semanales" : "8 h / 48 semanales"}</dd>
          <dt>Área</dt><dd>${esc(e.area)}</dd>
          <dt>Tipo de contrato</dt><dd>${esc(e.contrato)}</dd>
          <dt>Periodo de prueba</dt><dd>${e.pruebaHasta ? "vence el " + fechaL(e.pruebaHasta) : "cumplido"}</dd>
          <dt>Teléfono</dt><dd class="num">${esc(e.tel)}</dd>
          <dt>Correo</dt><dd style="font-weight:500">${esc(e.correo)}</dd></dl>`
      })}
        ${card({
        title: "Pago y deducciones fijas", body: `<dl class="kv">
          <dt>Banco</dt><dd>${esc(e.banco)}</dd>
          <dt>Cuenta IBAN</dt><dd class="num">${esc(e.cuenta)}</dd>
          <dt>Operadora de pensiones (ROP)</dt><dd>${esc(e.operadora)}</dd>
          <dt>Asociación solidarista</dt><dd>${e.solidarista ? "afiliado · ahorro " + e.aporteSol + " %" : "no afiliado"}</dd>
          <dt>Pensión alimentaria</dt><dd>${e.pensionAlim ? c(e.pensionAlim) + " mensuales" : "—"}</dd>
          <dt>Embargo judicial</dt><dd>${e.embargo ? c(e.embargo) + " mensuales" : "—"}</dd>
          <dt>Crédito Banco Popular</dt><dd>${e.prestamoBP ? c(e.prestamoBP) + " mensuales" : "—"}</dd>
          <dt>Adelanto vigente</dt><dd>${e.adelanto ? c(e.adelanto) : "—"}</dd></dl>`
      })}
        ${card({
        title: "Crédito fiscal por dependientes", hint: "se resta del impuesto, no del salario",
        body: `<dl class="kv">
          <dt>Hijos declarados</dt><dd class="num">${e.hijos} × ${c(M.CREDITOS.hijo)}</dd>
          <dt>Cónyuge</dt><dd class="num">${e.conyuge ? "1 × " + c(M.CREDITOS.conyuge) : "—"}</dd>
          <dt>Crédito mensual</dt><dd class="num">${c(e.hijos * M.CREDITOS.hijo + (e.conyuge ? M.CREDITOS.conyuge : 0))}</dd>
          <dt>Impuesto del mes</dt><dd class="num">${c(k.renta.impuesto)}</dd>
          <dt>A retener</dt><dd class="num"><b>${c(k.renta.retener)}</b></dd></dl>`
      })}
        ${card({
        title: "Saldos del año", body: `<div class="strip">
          <div class="cell"><div class="cl">Vacaciones</div><div class="cv num">${e.vacSaldo} días</div></div>
          <div class="cell"><div class="cl">Aguinaldo acumulado</div><div class="cv num">${c(ag.monto)}</div></div>
          <div class="cell"><div class="cl">FCL acumulado</div><div class="cv num">${c(Math.round(e.salario * 0.015 * e.antiguedad * 12))}</div></div>
          <div class="cell"><div class="cl">Incapacidades</div><div class="cv num">${inc.length}</div></div>
        </div>`
      })}
        ${card({
        title: "Movimientos", hint: mov.length + " en el expediente",
        body: mov.length ? table({
          cols: [
            { t: "Fecha", cls: "mono", fmt: r => fechaL(r.fecha) },
            { t: "Tipo", fmt: r => tag(r.tipo, r.tipo === "Salida" ? "cr" : r.tipo === "Aumento" ? "ac" : "ok") },
            { t: "Detalle", fmt: r => esc(r.detalle) },
            { t: "CCSS", fmt: r => (r.reportado ? tag("Reportado", "ok", "check") : tag("Sin reportar", "wa", "alert")) }
          ], rows: mov
        }) : empty("history", "Sin movimientos", "El expediente no registra aumentos, traslados ni salidas.")
      })}
        ${vac.length ? card({
        title: "Vacaciones", body: table({
          cols: [
            { t: "Del", cls: "mono", fmt: r => fecha(r.desde) },
            { t: "Al", cls: "mono", fmt: r => fecha(r.hasta) },
            { t: "Días", r: true, cls: "mono", fmt: r => r.dias },
            { t: "Estado", fmt: r => tag(r.estado, r.estado === "Disfrutadas" ? "mu" : r.estado === "Solicitada" ? "wa" : "ok") }
          ], rows: vac
        })
      }) : ""}
        ${inc.length ? card({
        title: "Incapacidades", body: table({
          cols: [
            { t: "Boleta", cls: "mono", fmt: r => esc(r.boleta) },
            { t: "Tipo", fmt: r => tag(r.tipo, r.tipo === "INS" ? "cr" : "ac") },
            { t: "Motivo", fmt: r => esc(r.motivo) },
            { t: "Del", cls: "mono", fmt: r => fecha(r.desde) },
            { t: "Días", r: true, cls: "mono", fmt: r => r.dias },
            { t: "Estado", fmt: r => tag(r.estado, r.estado === "Vigente" ? "wa" : "mu") }
          ], rows: inc
        })
      }) : ""}`,
      footer: `<button class="btn" id="fLiq">${icon("gavel")}Simular liquidación</button>
               <button class="btn" id="fColilla">${icon("print")}Colilla del periodo</button>
               <div style="flex:1"></div><button class="btn pri" id="fOk">Cerrar</button>`,
      after: root => {
        $("#fOk", root).addEventListener("click", closeSheet);
        $("#fColilla", root).addEventListener("click", () => { closeSheet(); A.colilla(k); });
        $("#fLiq", root).addEventListener("click", () => verLiq(M.liquidar(e, MOTIVOS[0], M.HOY), true));
      }
    });
  }

  function fichaNueva() {
    openSheet({
      title: "Registrar ingreso de personal",
      sub: "El movimiento se reporta a la CCSS el mismo día",
      body: `<div class="grid g2">
          ${U.field("Nombre completo", '<input class="inp" placeholder="Nombre y dos apellidos">')}
          ${U.field("Cédula", '<input class="inp" placeholder="1-1234-5678">')}
          ${U.selectField("Puesto", M.PUESTOS.map(p => p.nom))}
          ${U.selectField("Local", D.locales.map(l => l.nom))}
          ${U.selectField("Tipo de planilla", ["Semanal", "Quincenal", "Mensual"])}
          ${U.selectField("Jornada", M.JORNADAS.map(j => j.t))}
          ${U.field("Salario mensual", '<input class="inp" placeholder="₡">')}
          ${U.field("Fecha de ingreso", '<input class="inp" type="date" value="2026-09-14">')}
          ${U.field("Cuenta IBAN", '<input class="inp" placeholder="CR00 0000 0000 0000 0000 00">')}
          ${U.selectField("Operadora de pensiones", ["BN Vital", "Popular Pensiones", "BAC Pensiones", "Vida Plena", "BCR Pensiones"])}
          ${U.field("Hijos para crédito fiscal", '<input class="inp" type="number" value="0">')}
          ${U.selectField("Cónyuge para crédito fiscal", ["No", "Sí"])}
        </div>
        <div class="alert" style="margin-top:14px;border:1px solid var(--hair);border-radius:11px">
          ${icon("info")}<div><b>El sistema valida al guardar:</b> que el salario no quede bajo el mínimo del decreto vigente para la categoría del puesto, que la cédula no exista ya, y programa el aviso del fin del periodo de prueba a los tres meses.</div></div>`,
      footer: `<button class="btn" id="nCancel">Cancelar</button><div style="flex:1"></div>
               <button class="btn pri" id="nOk">${icon("check")}Registrar y reportar a la CCSS</button>`,
      after: root => {
        $("#nCancel", root).addEventListener("click", closeSheet);
        $("#nOk", root).addEventListener("click", () => {
          closeSheet();
          toast("Ingreso registrado", "El movimiento quedó en la cola de reporte a la CCSS y el expediente se abrió con el periodo de prueba programado.", "ok");
        });
      }
    });
  }

  function movimientos(v) {
    const rows = M.movimientos;
    const sin = rows.filter(r => !r.reportado);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Movimientos del trimestre", rows.length, { txt: "ingresos, salidas y aumentos", dir: "" })}
          ${stat("Ingresos", rows.filter(r => r.tipo === "Ingreso").length, { txt: "personal nuevo", dir: "up" }, "var(--ok)")}
          ${stat("Salidas", rows.filter(r => r.tipo === "Salida").length, { txt: "con liquidación calculada", dir: "" }, "var(--warn)")}
          ${stat("Sin reportar", sin.length, { txt: sin.length ? "la CCSS cobra intereses por omisión" : "todo al día", dir: sin.length ? "down" : "up" }, sin.length ? "var(--crit)" : "var(--ok)")}
        </div>
        ${card({
      title: "Bitácora de movimientos", hint: "el mismo dato alimenta el expediente, la planilla y el reporte a la CCSS",
      body: table({
        h: "calc(100dvh - 440px)",
        cols: [
          { t: "Movimiento", cls: "mono", fmt: r => esc(r.id) },
          { t: "Fecha", cls: "mono", fmt: r => fechaL(r.fecha) },
          { t: "Tipo", fmt: r => tag(r.tipo, r.tipo === "Salida" ? "cr" : r.tipo === "Aumento" ? "ac" : "ok") },
          { t: "Colaborador", fmt: r => esc(M.nom(r.empId)) },
          { t: "Detalle", fmt: r => esc(r.detalle) },
          { t: "Salario", r: true, cls: "mono", fmt: r => grp(r.salario) },
          { t: "CCSS", fmt: r => (r.reportado ? tag("Reportado", "ok", "check") : tag("Pendiente", "wa", "alert")) }
        ], rows, rowCls: r => (r.reportado ? "" : "wa")
      })
    })}</div>`;
  }
  function movimientosWire() {
    const b = $("#mvRep", document);
    if (b) b.addEventListener("click", () => {
      M.movimientos.forEach(m => (m.reportado = true));
      M.OBLIGACIONES.filter(o => /ingresos y salidas/.test(o.t)).forEach(o => { o.estado = "Presentada"; o.detalle = "Todo reportado"; });
      toast("Movimientos reportados", "Los ingresos y las salidas quedaron enviados al SICERE. La planilla del mes ya sale con la plantilla correcta.", "ok");
      A.refresh();
    });
  }

  function puestos(v) {
    const act = M.activos();
    const rows = M.PUESTOS.map(p => {
      const gente = act.filter(e => e.puesto === p.nom);
      const prom = gente.length ? gente.reduce((s, e) => s + e.salario, 0) / gente.length : 0;
      return { p, n: gente.length, prom, bajo: gente.filter(e => e.salario < e.minimo).length };
    });
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Puestos definidos", M.PUESTOS.length, { txt: "cada uno amarrado a una categoría de ley", dir: "" })}
          ${stat("Categorías del decreto", M.MINIMOS.length, { txt: "de no calificado a licenciado", dir: "" })}
          ${stat("Aumento general 2026", "1,63 %", { txt: "3,96 % en trabajo doméstico · 2,18 % en especializados", dir: "up" }, "var(--ok)")}
          ${stat("Personas bajo el mínimo", rows.reduce((s, r) => s + r.bajo, 0), { txt: "el sistema no deja guardar un salario bajo el mínimo", dir: "" }, "var(--ok)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Catálogo de puestos", hint: "banda interna contra el mínimo de ley",
      actions: `<button class="btn sm" id="puNuevo">${icon("plus")}Nuevo puesto</button>`,
      body: table({
        h: "calc(100dvh - 470px)",
        cols: [
          { t: "Puesto", fmt: r => `<b>${esc(r.p.nom)}</b><span class="sub ui">${esc(r.p.area)}</span>` },
          { t: "Categoría de ley", fmt: r => tag(r.p.cat, "mu") },
          { t: "Planilla", fmt: r => esc(r.p.planilla) },
          { t: "Personas", r: true, cls: "mono", fmt: r => r.n || '<span class="dim">—</span>' },
          { t: "Mínimo de ley", r: true, cls: "mono", fmt: r => grp(r.p.minimo) },
          { t: "Base interna", r: true, cls: "mono", fmt: r => grp(r.p.base) },
          { t: "Promedio pagado", r: true, cls: "mono", fmt: r => (r.prom ? `<b>${grp(r.prom)}</b>` : '<span class="dim">—</span>') },
          { t: "Holgura", r: true, cls: "mono", fmt: r => (r.prom ? `<span style="color:var(--ok)">+${dec((r.prom / r.p.minimo - 1) * 100, 0)} %</span>` : "") }
        ], rows
      })
    })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
      title: "Salarios mínimos 2026", hint: "decreto 45303-MTSS",
      body: table({
        cols: [
          { t: "Categoría", fmt: r => esc(r.cat) },
          { t: "Mensual", r: true, cls: "mono", fmt: r => grp(r.m) },
          { t: "Por hora", r: true, cls: "mono", fmt: r => grp(r.m / 240) }
        ], rows: M.MINIMOS
      })
    })}
            ${card({
      title: "Cómo se aplica",
      body: `<div class="mut" style="font-size:13px;line-height:1.65">
          El decreto se revisa dos veces al año. Cuando cambia, el sistema recalcula el mínimo de cada
          categoría, marca los puestos que quedaron por debajo y propone el ajuste como un movimiento
          masivo: un solo documento, con el porcentaje y la fecha de rige, que después se ve en el
          expediente de cada persona.
          <br><br>El salario de referencia de un puesto no es el mínimo: es la banda interna con la que
          Santa Rosa compite por personal. El mínimo es el piso que el sistema no deja cruzar.</div>`
    })}
          </div>
        </div></div>`;
  }

  /* salidas: liquidaciones calculadas y el simulador */
  const MOTIVOS = ["Despido con responsabilidad patronal", "Despido sin responsabilidad patronal", "Renuncia"];

  function salidas(v) {
    const liqs = M.liquidaciones;
    A._liqs = liqs;
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Liquidaciones del mes", liqs.length, { txt: "una con responsabilidad patronal", dir: "" })}
          ${stat("Monto liquidado", c(liqs.reduce((s, l) => s + l.lineas.reduce((a, x) => a + x.m, 0), 0)), { txt: "sin contar el FCL de la operadora", dir: "" })}
          ${stat("FCL a retirar", c(liqs.reduce((s, l) => s + l.fcl, 0)), { txt: "lo retira la persona, salga como salga", dir: "" }, "var(--ok)")}
          ${stat("Plazo de pago", "6 a 8 días hábiles", { txt: "después corren intereses a favor del trabajador", dir: "" }, "var(--warn)")}
        </div>
        ${card({
      title: "Liquidaciones calculadas", hint: "toque una fila para ver el desglose",
      body: table({
        onRow: true,
        cols: [
          { t: "Colaborador", fmt: r => `<b>${esc(r.e.nom)}</b><span class="sub ui">${esc(r.e.puesto)}</span>` },
          { t: "Motivo", fmt: r => tag(r.motivo, r.conResp ? "cr" : "mu") },
          { t: "Salida", cls: "mono", fmt: r => fechaL(r.fecha) },
          { t: "Antigüedad", r: true, cls: "mono", fmt: r => dec(r.anios, 2) + " años" },
          { t: "Promedio 6 meses", r: true, cls: "mono", fmt: r => grp(r.prom) },
          { t: "Preaviso", r: true, cls: "mono", fmt: r => (r.lineas[0].m ? grp(r.lineas[0].m) : '<span class="dim">—</span>') },
          { t: "Cesantía", r: true, cls: "mono", fmt: r => (r.lineas[1].m ? grp(r.lineas[1].m) : '<span class="dim">—</span>') },
          { t: "Total", r: true, cls: "mono", fmt: r => `<b>${grp(r.lineas.reduce((s, x) => s + x.m, 0))}</b>` }
        ], rows: liqs
      })
    })}
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Cesantía · artículo 29", hint: "días por año, con tope de ocho años",
      body: table({
        h: "300px",
        cols: [
          { t: "Antigüedad", fmt: r => esc(r.a) },
          { t: "Días", r: true, cls: "mono", fmt: r => dec(r.d, 2) }
        ], rows: M.CESANTIA
      })
    })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
      title: "Preaviso · artículo 28",
      body: table({
        cols: [
          { t: "Antigüedad", fmt: r => esc(r.a) },
          { t: "Preaviso", r: true, fmt: r => esc(r.d) }
        ], rows: M.PREAVISO
      })
    })}
            ${card({
      title: "Lo que cambia según el motivo",
      body: `<div class="mut" style="font-size:13px;line-height:1.7">
          <b>Renuncia o despido con causa:</b> salario de los días trabajados, aguinaldo proporcional y
          vacaciones no disfrutadas. Sin preaviso ni cesantía.
          <br><b>Despido sin causa:</b> además, preaviso y cesantía.
          <br><b>Despido indirecto (art. 83):</b> se paga como despido sin causa.
          <br><br>Preaviso y cesantía están <b>exentos</b> de cargas sociales y de renta; las vacaciones
          pagadas sí cotizan. El FCL lo retira la persona en cualquier caso, y no se descuenta de la
          cesantía que paga la empresa.</div>`
    })}
          </div>
        </div></div>`;
  }
  function salidasWire(v) {
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => verLiq(A._liqs[+tr.dataset.i])));
    const b = $("#liqSim", document);
    if (b) b.addEventListener("click", simular);
  }

  /* el simulador pide a quién y por qué; el cálculo lo hace el motor */
  function simular() {
    const act = M.activos().slice().sort((a, b) => (a.nom < b.nom ? -1 : 1));
    openSheet({
      title: "Simular una liquidación",
      sub: "No se guarda nada: sirve para saber cuánto costaría una salida antes de decidirla",
      body: `<div class="grid g2">
          ${U.field("Colaborador", `<select id="smEmp">${act.map(e => `<option value="${e.id}">${esc(e.nom)} · ${esc(e.puesto)}</option>`).join("")}</select>`)}
          ${U.field("Motivo de la salida", `<select id="smMot">${MOTIVOS.map(m => `<option>${esc(m)}</option>`).join("")}</select>`)}
        </div>`,
      footer: `<button class="btn" id="smCan">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="smOk">${icon("calc")}Calcular</button>`,
      after: root => {
        $("#smCan", root).addEventListener("click", closeSheet);
        $("#smOk", root).addEventListener("click", () => {
          const e = M.emp($("#smEmp", root).value);
          verLiq(M.liquidar(e, $("#smMot", root).value, M.HOY), true);
        });
      }
    });
  }

  function verLiq(l, sim) {
    const tot = l.lineas.reduce((s, x) => s + x.m, 0);
    openSheet({
      wide: true, tight: true,
      title: (sim ? "Simulación · " : "Liquidación · ") + l.e.nom,
      sub: `${l.motivo} · ${sim ? "si saliera hoy" : "salida el " + fechaL(l.fecha)} · ${dec(l.anios, 2)} años de servicio`,
      body: `${sim ? `<div style="padding:14px 22px;border-bottom:1px solid var(--hair-2);display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="mut" style="font-size:12.5px;font-weight:650">Motivo de la salida</span>${seg("lqMot", [{ v: MOTIVOS[0], t: "Despido con responsabilidad" }, { v: MOTIVOS[1], t: "Despido sin responsabilidad" }, { v: MOTIVOS[2], t: "Renuncia" }], l.motivo)}</div>` : ""}
        <div class="ficha">
          <div class="fcell"><div class="fl">Promedio de 6 meses</div><div class="fv num">${c(l.prom)}</div></div>
          <div class="fcell"><div class="fl">Salario diario</div><div class="fv num">${c(l.diario)}</div></div>
          <div class="fcell"><div class="fl">Total a pagar</div><div class="fv num" style="color:var(--ok)">${c(tot)}</div></div>
          <div class="fcell"><div class="fl">FCL en la operadora</div><div class="fv num">${c(l.fcl)}</div></div></div>
        ${card({
        title: "Desglose del finiquito",
        body: table({
          cols: [
            { t: "Concepto", fmt: r => `<b>${esc(r.t)}</b><span class="sub ui">${esc(r.nota)}</span>` },
            { t: "Días", r: true, cls: "mono", fmt: r => (r.d == null ? '<span class="dim">—</span>' : dec(r.d, 2)) },
            { t: "Monto", r: true, cls: "mono", fmt: r => (r.m ? grp(r.m) : '<span class="dim">—</span>') }
          ], rows: l.lineas,
          foot: [{ v: "Total del finiquito", span: 2 }, { v: grp(tot), r: true, cls: "mono" }]
        })
      })}
        ${card({
        title: "Además", body: `<div class="mut" style="font-size:13px;line-height:1.7">
          El <b>FCL de ${c(l.fcl)}</b> lo retira la persona directamente en ${esc(l.e.operadora)}: no sale de
          la caja de la empresa y no se descuenta de la cesantía.
          <br>El movimiento de salida se reporta a la CCSS el mismo día, y el pago debe estar hecho en un
          máximo de seis a ocho días hábiles.</div>`
      })}`,
      footer: `<button class="btn" id="lqPdf">${icon("print")}${sim ? "Imprimir simulación" : "Documento de finiquito"}</button>
               <div style="flex:1"></div><button class="btn pri" id="lqOk">Cerrar</button>`,
      after: root => {
        $("#lqOk", root).addEventListener("click", closeSheet);
        $("#lqPdf", root).addEventListener("click", () => toast(sim ? "Simulación impresa" : "Finiquito generado",
          sim ? "Queda como borrador; no genera movimiento ni se reporta a la CCSS." : "Con el desglose, la firma del colaborador y el respaldo en el expediente.", "ok"));
        if (sim) onSeg(root, "lqMot", m => verLiq(M.liquidar(l.e, m, M.HOY), true));
      }
    });
  }

  A.workspace("nom-personal", {
    title: "Personal",
    tabs: [
      {
        id: "colab", t: "Colaboradores",
        sub: () => M.empleados.length + " expedientes · " + M.activos().length + " activos",
        actions: () => `<button class="btn" id="pExp">${icon("print")}Exportar</button><button class="btn pri" id="pNuevo">${icon("plus")}Registrar ingreso</button>`,
        render: colaboradores, wire: colaboradoresWire
      },
      {
        id: "mov", t: "Movimientos de personal",
        sub: "Ingresos, salidas y aumentos — cada uno se reporta a la CCSS al ocurrir",
        badge: () => { const n = M.movimientos.filter(m => !m.reportado).length; return { n, k: "cr", l: n + " sin reportar a la CCSS" }; },
        actions: () => M.movimientos.some(m => !m.reportado) ? `<button class="btn pri" id="mvRep">${icon("upload")}Reportar pendientes a la CCSS</button>` : "",
        render: movimientos, wire: movimientosWire
      },
      {
        id: "puestos", t: "Puestos y salarios",
        sub: () => M.PUESTOS.length + " puestos · mínimos del decreto 45303-MTSS vigente desde el 1 de enero de 2026",
        render: puestos,
        wire: v => { const b = $("#puNuevo", v); if (b) b.addEventListener("click", () => toast("Nuevo puesto", "Se define con su categoría de ley, su banda interna y su esquema de planilla.", "ok")); }
      },
      {
        id: "salidas", t: "Salidas y liquidaciones",
        sub: () => "Preaviso y cesantía del Código de Trabajo · tope de " + M.TOPE_CESANTIA + " años",
        actions: () => `<button class="btn pri" id="liqSim">${icon("calc")}Simular liquidación</button>`,
        render: salidas, wire: salidasWire
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     3 · TIEMPO Y AUSENCIAS — Asistencia · Horas extra y feriados ·
         Vacaciones · Incapacidades y permisos
     ═════════════════════════════════════════════════════════════ */
  let asDia = 0, asLoc = "Todos";

  function asistencia(v) {
    const hoy = M.HOY;
    const sel = asDia === 2 ? M.marcas : M.marcas.filter(m => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - asDia);
      return m.dia.toDateString() === d.toDateString();
    });
    const rows = sel.filter(m => asLoc === "Todos" || locNom(m.locId) === asLoc);
    const aus = rows.filter(r => r.estado === "Ausencia");
    const tar = rows.filter(r => r.estado === "Tardía");
    const hEx = rows.reduce((s, r) => s + r.extra, 0);
    A._asRows = rows.slice().sort((a, b) => b.dia - a.dia || (a.estado < b.estado ? 1 : -1));
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Marcas del periodo", rows.length, { txt: asDia === 2 ? "últimos 7 días" : "una jornada", dir: "" })}
          ${stat("Ausencias", aus.length, { txt: aus.filter(a => !a.justificada).length + " sin justificar", dir: aus.length ? "down" : "" }, aus.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Tardías", tar.length, { txt: "más de 5 minutos después de la hora", dir: "" }, "var(--warn)")}
          ${stat("Horas extra acumuladas", dec(hEx, 1) + " h", { txt: "se pagan con recargo del " + M.RECARGO_EXTRA + " %", dir: "" })}
        </div>
        <div class="filters">
          <select class="inp" id="asloc" aria-label="Local" style="max-width:200px">${["Todos"].concat(D.locales.map(l => l.nom)).map(o => `<option ${o === asLoc ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
          <span class="mut" style="font-size:12.5px">La marca entra del reloj del local, del POS o de la aplicación móvil; sin enlace se guarda en el nodo y sube al reconectar.</span>
        </div>
        ${card({
      title: "Marcas", hint: "la jornada se clasifica por el horario real, no por lo que diga el contrato",
      body: table({
        h: "calc(100dvh - 470px)",
        cols: [
          { t: "Día", cls: "mono", fmt: r => fecha(r.dia) },
          { t: "Colaborador", fmt: r => esc(M.nom(r.empId)) },
          { t: "Local", fmt: r => esc(locNom(r.locId)) },
          { t: "Entrada", cls: "mono", fmt: r => (r.entrada ? hora(r.entrada) : '<span class="dim">—</span>') },
          { t: "Salida", cls: "mono", fmt: r => (r.salida ? hora(r.salida) : '<span class="dim">—</span>') },
          { t: "Jornada", r: true, cls: "mono", fmt: r => r.jornadaH + " h" },
          { t: "Extra", r: true, cls: "mono", fmt: r => (r.extra ? `<b>${dec(r.extra, 1)} h</b>` : '<span class="dim">—</span>') },
          { t: "Estado", fmt: r => (r.estado === "Normal" ? tag("Normal", "ok") : r.estado === "Tardía" ? tag("Tardía", "wa", "clock") : tag(r.justificada ? "Ausencia justificada" : "Ausencia", r.justificada ? "mu" : "cr", "alert")) }
        ], rows: A._asRows.slice(0, 260), rowCls: r => (r.estado === "Ausencia" && !r.justificada ? "wa" : "")
      })
    })}</div>`;
  }
  function asistenciaWire(v) {
    onSeg(document, "asd", val => { asDia = val === "Hoy" ? 0 : val === "Ayer" ? 1 : 2; A.refresh(); });
    const l = $("#asloc", v); if (l) l.addEventListener("change", () => { asLoc = l.value; A.refresh(); });
  }

  function extras(v) {
    const rows = extrasPorPersona();
    const totH = rows.reduce((s, r) => s + r.h, 0), totM = rows.reduce((s, r) => s + r.monto, 0);
    const ex = rows.filter(r => r.excede);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Horas extra de la semana", dec(totH, 1) + " h", { txt: rows.length + " personas", dir: "" })}
          ${stat("Costo con recargo", c(totM), { txt: "la hora extra vale 1,5 veces la ordinaria", dir: "" }, "var(--warn)")}
          ${stat("Sobre el tope semanal", ex.length, { txt: ex.length ? "no se puede pagar sin justificar" : "nadie pasó de 12 horas", dir: ex.length ? "down" : "up" }, ex.length ? "var(--crit)" : "var(--ok)")}
          ${stat("Equivalente en personas", dec(totH / 48, 1), { txt: "jornadas completas de 48 horas", dir: "" })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Horas extra por persona", hint: "de las marcas de la semana, sin digitar nada",
      body: table({
        h: "calc(100dvh - 470px)",
        cols: [
          { t: "Colaborador", fmt: r => `${esc(r.e.nom)}<span class="sub ui">${esc(r.e.puesto)}</span>` },
          { t: "Local", fmt: r => esc(locNom(r.e.locId)) },
          { t: "Jornada", fmt: r => esc(r.e.jornada) },
          { t: "Valor hora", r: true, cls: "mono", fmt: r => grp(r.vh) },
          { t: "Hora extra", r: true, cls: "mono", fmt: r => grp(r.vh * 1.5) },
          { t: "Horas", r: true, cls: "mono", fmt: r => `<b>${dec(r.h, 1)}</b>` },
          { t: "A pagar", r: true, cls: "mono", fmt: r => grp(r.monto) },
          { t: "", fmt: r => (r.excede ? tag("Sobre el tope", "cr", "alert") : tag("Dentro del tope", "ok")) }
        ], rows, rowCls: r => (r.excede ? "wa" : ""),
        foot: [{ v: "Totales", span: 5 }, { v: dec(totH, 1), r: true, cls: "mono" }, { v: grp(totM), r: true, cls: "mono" }, { v: "" }]
      })
    })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
      title: "Jornadas de ley", hint: "manda el horario real",
      body: table({
        cols: [
          { t: "Jornada", fmt: r => `<b>${esc(r.t)}</b><span class="sub ui">${esc(r.rango)}</span>` },
          { t: "Diarias", r: true, cls: "mono", fmt: r => r.horas + " h" },
          { t: "Semanales", r: true, cls: "mono", fmt: r => r.sem + " h" }
        ], rows: M.JORNADAS
      }) + `<div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">
          La jornada acumulativa de hasta 10 horas diurnas necesita acuerdo escrito y no puede pasar de
          48 horas semanales. El proyecto de jornadas excepcionales de 12 horas todavía no es ley, así
          que el sistema no lo ofrece: cuando lo sea, entra como un tipo de jornada más.</div>`
    })}
            ${card({
      title: "Feriados 2026", hint: "el de pago obligatorio laborado se paga doble",
      body: table({
        h: "300px",
        cols: [
          { t: "Fecha", cls: "mono", fmt: r => fechaL(r.fecha) },
          { t: "Feriado", fmt: r => `${esc(r.nom)}<span class="sub ui">${esc(r.dia)}</span>` },
          { t: "Pago", fmt: r => (r.oblig ? tag("Obligatorio", "ok") : tag("No obligatorio", "mu")) }
        ], rows: M.FERIADOS
      })
    })}
          </div>
        </div></div>`;
  }

  function vacaciones(v) {
    const act = M.activos();
    const dias = act.reduce((s, e) => s + e.vacSaldo, 0);
    const acum = act.filter(e => e.vacSaldo > 24).sort((a, b) => b.vacSaldo - a.vacSaldo);
    const sol = M.vacaciones.filter(x => x.estado === "Solicitada");
    const curso = M.vacaciones.filter(x => x.estado === "En curso");
    const prov = act.reduce((s, e) => s + e.vacSaldo * (e.salario / 30), 0);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Días acumulados", grp(dias), { txt: "de " + act.length + " personas activas", dir: "" })}
          ${stat("Provisión de vacaciones", c(prov), { txt: "pasivo laboral registrado en contabilidad", dir: "" }, "var(--warn)")}
          ${stat("Solicitudes por aprobar", sol.length, { txt: curso.length + " personas de vacaciones hoy", dir: "" }, sol.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Con más de dos periodos", acum.length, { txt: "la ley pide disfrutarlas, no acumularlas", dir: acum.length ? "down" : "up" }, acum.length ? "var(--crit)" : "var(--ok)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Solicitudes y disfrutes", hint: "el calendario cruza contra la dotación mínima del local",
      body: table({
        h: "calc(100dvh - 470px)",
        cols: [
          { t: "Solicitud", cls: "mono", fmt: r => esc(r.id) },
          { t: "Colaborador", fmt: r => `${esc(M.nom(r.empId))}<span class="sub ui">${esc(locNom((M.emp(r.empId) || {}).locId))}</span>` },
          { t: "Del", cls: "mono", fmt: r => fechaL(r.desde) },
          { t: "Al", cls: "mono", fmt: r => fechaL(r.hasta) },
          { t: "Días", r: true, cls: "mono", fmt: r => r.dias },
          { t: "Adelanto de pago", fmt: r => (r.pagoAdelantado ? tag("Sí", "ac") : '<span class="dim">—</span>') },
          { t: "Estado", fmt: r => tag(r.estado, r.estado === "Solicitada" ? "wa" : r.estado === "En curso" ? "ac" : r.estado === "Aprobada" ? "ok" : "mu") }
        ], rows: M.vacaciones.slice().sort((a, b) => b.desde - a.desde)
      })
    })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
      title: "Saldos más altos", hint: "acumulación que hay que bajar",
      body: table({
        h: "260px",
        cols: [
          { t: "Colaborador", fmt: r => `${esc(r.nom)}<span class="sub ui">${esc(r.puesto)}</span>` },
          { t: "Antigüedad", r: true, cls: "mono", fmt: r => dec(r.antiguedad, 1) + " a" },
          { t: "Días", r: true, cls: "mono", fmt: r => `<b style="color:var(--crit)">${r.vacSaldo}</b>` }
        ], rows: acum.slice(0, 14)
      })
    })}
            ${card({
      title: "La regla",
      body: `<div class="mut" style="font-size:13px;line-height:1.65">
          Dos semanas por cada cincuenta semanas laboradas. El sistema acumula por mes cumplido, descuenta
          al disfrutar y nunca deja pagar vacaciones no disfrutadas mientras la relación siga viva, salvo
          en la liquidación.
          <br><br>Las vacaciones disfrutadas <b>sí cotizan</b> a la CCSS y pagan renta: entran a la
          planilla del periodo en que se disfrutan, no aparte.</div>`
    })}
          </div>
        </div></div>`;
  }
  function vacacionesWire() {
    const b = $("#vcNueva", document);
    if (b) b.addEventListener("click", () => openSheet({
      title: "Solicitud de vacaciones",
      body: `<div class="grid g2">
            ${U.selectField("Colaborador", M.activos().slice(0, 30).map(e => e.nom))}
            ${U.field("Días solicitados", '<input class="inp" type="number" value="5">')}
            ${U.field("Desde", '<input class="inp" type="date" value="2026-10-05">')}
            ${U.field("Hasta", '<input class="inp" type="date" value="2026-10-09">')}
            ${U.selectField("Adelantar el pago", ["No", "Sí"])}
            ${U.selectField("Aprueba", ["Sonia Calderón Ruiz", "Adrián Vindas Mora"])}</div>
          <div class="alert" style="margin-top:14px;border:1px solid var(--hair);border-radius:11px">${icon("info")}
            <div>El sistema revisa el saldo disponible y avisa si el local queda por debajo de su dotación mínima esos días.</div></div>`,
      footer: `<button class="btn" id="vCan">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="vOk">${icon("check")}Registrar</button>`,
      after: root => {
        $("#vCan", root).addEventListener("click", closeSheet);
        $("#vOk", root).addEventListener("click", () => { closeSheet(); toast("Solicitud registrada", "Queda pendiente de aprobación y ya descuenta del saldo proyectado.", "ok"); });
      }
    }));
  }

  function incapacidades(v) {
    const rows = M.incapacidades.slice().sort((a, b) => b.desde - a.desde);
    const vig = rows.filter(r => r.vigente);
    const dias = rows.reduce((s, r) => s + r.dias, 0);
    const costoPat = rows.reduce((s, r) => { const e = M.emp(r.empId); return s + (e ? (e.salario / 30) * r.patrono * 0.5 : 0); }, 0);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Boletas del trimestre", rows.length, { txt: vig.length + " vigentes hoy", dir: "" })}
          ${stat("Días de incapacidad", grp(dias), { txt: "ausentismo por salud", dir: "" }, "var(--warn)")}
          ${stat("Costo directo al patrono", c(costoPat), { txt: "los primeros tres días al 50 %", dir: "" })}
          ${stat("Riesgos del trabajo", rows.filter(r => r.tipo === "INS").length, { txt: "reportadas al INS con la póliza", dir: "" }, "var(--crit)")}
        </div>
        ${card({
      title: "Boletas", hint: "el rebajo de la planilla y el subsidio salen de aquí",
      body: table({
        h: "calc(100dvh - 460px)",
        cols: [
          { t: "Boleta", cls: "mono", fmt: r => esc(r.boleta) },
          { t: "Colaborador", fmt: r => `${esc(M.nom(r.empId))}<span class="sub ui">${esc(locNom((M.emp(r.empId) || {}).locId))}</span>` },
          { t: "Tipo", fmt: r => tag(r.tipo, r.tipo === "INS" ? "cr" : r.tipo === "MAT" ? "ac" : "wa") },
          { t: "Motivo", fmt: r => esc(r.motivo) },
          { t: "Del", cls: "mono", fmt: r => fecha(r.desde) },
          { t: "Al", cls: "mono", fmt: r => fecha(r.hasta) },
          { t: "Días", r: true, cls: "mono", fmt: r => r.dias },
          { t: "Paga el patrono", r: true, cls: "mono", fmt: r => (r.patrono ? r.patrono + " d al 50 %" : '<span class="dim">—</span>') },
          { t: "Subsidio", r: true, cls: "mono", fmt: r => r.subsidio + " %" },
          { t: "Estado", fmt: r => tag(r.estado, r.estado === "Vigente" ? "wa" : "mu") }
        ], rows, rowCls: r => (r.vigente ? "wa" : "")
      })
    })}
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Reglas de pago", hint: "el sistema aplica la que corresponde al tipo de boleta",
      body: `<div class="tiles">${M.TIPO_INC.map(t => `<div class="tile"><div class="tn">${esc(t.t)}</div><div class="td">${esc(t.regla)}</div></div>`).join("")}</div>`
    })}
          ${card({
      title: "Otras licencias y permisos", hint: "catálogo configurable",
      body: table({
        cols: [
          { t: "Licencia", fmt: r => `<b>${esc(r[0])}</b>` },
          { t: "Tratamiento", fmt: r => esc(r[1]) },
          { t: "Días", r: true, cls: "mono", fmt: r => r[2] }
        ], rows: M.PERMISOS
      })
    })}
        </div></div>`;
  }
  function incapacidadesWire() {
    const b = $("#icNueva", document);
    if (b) b.addEventListener("click", () => openSheet({
      title: "Registrar boleta de incapacidad",
      body: `<div class="grid g2">
            ${U.selectField("Colaborador", M.activos().slice(0, 30).map(e => e.nom))}
            ${U.selectField("Tipo", M.TIPO_INC.map(t => t.t))}
            ${U.field("Número de boleta", '<input class="inp" placeholder="CCSS-000000">')}
            ${U.field("Diagnóstico o motivo", '<input class="inp" placeholder="Según la boleta">')}
            ${U.field("Desde", '<input class="inp" type="date" value="2026-09-14">')}
            ${U.field("Hasta", '<input class="inp" type="date" value="2026-09-18">')}</div>
          <div class="alert" style="margin-top:14px;border:1px solid var(--hair);border-radius:11px">${icon("info")}
            <div>Al guardar, el sistema rebaja los días de la planilla del periodo, calcula lo que paga el
            patrono según el tipo de boleta y deja la diferencia como subsidio por cobrar a la CCSS o al INS.</div></div>`,
      footer: `<button class="btn" id="iCan">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="iOk">${icon("check")}Registrar</button>`,
      after: root => {
        $("#iCan", root).addEventListener("click", closeSheet);
        $("#iOk", root).addEventListener("click", () => { closeSheet(); toast("Boleta registrada", "La planilla del periodo ya trae el rebajo de días y el subsidio quedó como cuenta por cobrar.", "ok"); });
      }
    }));
  }

  A.workspace("nom-tiempo", {
    title: "Tiempo y ausencias",
    tabs: [
      {
        id: "asist", t: "Asistencia",
        sub: "Marcas y jornadas de los siete locales, el CEDI y las bodegas",
        actions: () => seg("asd", ["Hoy", "Ayer", "Semana"], asDia === 0 ? "Hoy" : asDia === 1 ? "Ayer" : "Semana"),
        render: asistencia, wire: asistenciaWire
      },
      {
        id: "extras", t: "Horas extra y feriados",
        sub: () => "Recargo del " + M.RECARGO_EXTRA + " % · tope de " + M.TOPE_EXTRA_DIA + " horas al día y " + M.TOPE_EXTRA_SEM + " a la semana",
        badge: () => { const n = extrasPorPersona().filter(r => r.excede).length; return { n, k: "cr", l: n + " sobre el tope semanal" }; },
        actions: () => `<button class="btn pri" id="hxAut">${icon("check")}Autorizar y pasar a planilla</button>`,
        render: extras,
        wire: () => {
          const b = $("#hxAut", document);
          if (b) b.addEventListener("click", () => toast("Horas extra autorizadas", "Pasan a la planilla del periodo con el recargo del 50 %. Las que están sobre el tope quedan retenidas hasta que la jefatura las justifique.", "ok"));
        }
      },
      {
        id: "vac", t: "Vacaciones",
        sub: "Dos semanas por cada cincuenta laboradas — artículo 153 del Código de Trabajo",
        badge: () => { const n = M.vacaciones.filter(x => x.estado === "Solicitada").length; return { n, k: "wa", l: n + " solicitudes por aprobar" }; },
        actions: () => `<button class="btn pri" id="vcNueva">${icon("plus")}Registrar solicitud</button>`,
        render: vacaciones, wire: vacacionesWire
      },
      {
        id: "incap", t: "Incapacidades y permisos",
        sub: "CCSS, INS, maternidad y otras licencias — cada una con su regla de pago",
        badge: () => { const n = M.incapacidades.filter(i => i.vigente).length; return { n, l: n + " vigentes hoy" }; },
        actions: () => `<button class="btn pri" id="icNueva">${icon("plus")}Registrar boleta</button>`,
        render: incapacidades, wire: incapacidadesWire
      }
    ]
  });

  A.nom = { extrasPorPersona, pendientes };
})(window);
