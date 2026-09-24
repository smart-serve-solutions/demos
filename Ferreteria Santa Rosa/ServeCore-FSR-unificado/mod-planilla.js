/* ═══════════════════════════════════════════════════════════════
   Nómina · Planilla, Obligaciones de ley y Configuración
   Planilla es un recorrido de cinco pasos que no se saltan: novedades,
   cálculo, aprobación, pago y asiento. Antes eran cinco opciones de menú
   sueltas (periodos, preplanilla, pago, asiento y resumen patronal);
   ahora son un solo lugar con el periodo arriba y el paso en curso
   marcado. Obligaciones y Configuración usan las pestañas de
   A.workspace (mod-nomina.js).
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, U = w.UI, M = w.NOM;
  const { $, $$, esc, grp, c, dec, fecha, fechaL, icon, tag, card, stat, table, seg, onSeg,
    bars, openSheet, closeSheet, toast, locNom } = U;

  const pcs = n => dec(n, 2) + " %";
  const EST_TAG = { Abierta: "mu", "En cálculo": "wa", Aprobada: "ac", Pagada: "ok", Contabilizada: "ok" };
  const DE_LEY = ["D-01", "D-02", "D-03"];

  /* ══ COLILLA DE PAGO ═════════════════════════════════════════ */
  A.colilla = function (k) {
    const e = k.e, p = k.per;
    const fila = (t, m, neg) => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--hair-2)">
      <span style="color:var(--ink-2);font-size:13px">${esc(t)}</span><span class="num" style="font-size:13.5px">${neg ? "−" : ""}${c(m)}</span></div>`;
    openSheet({
      wide: true, tight: true,
      title: "Colilla de pago · " + e.nom,
      sub: `${p.tipo} ${p.id} · del ${fechaL(p.desde)} al ${fechaL(p.hasta)}`,
      body: `<div class="ficha">
          <div class="fcell"><div class="fl">Bruto</div><div class="fv num">${c(k.bruto)}</div></div>
          <div class="fcell"><div class="fl">Deducciones</div><div class="fv num" style="color:var(--warn)">−${c(k.totalDed)}</div></div>
          <div class="fcell"><div class="fl">Neto a depositar</div><div class="fv num" style="color:var(--ok)">${c(k.neto)}</div></div>
          <div class="fcell"><div class="fl">Costo con cargas</div><div class="fv num">${c(k.costo)}</div></div></div>
        ${card({
        title: "Ingresos", body: k.ing.map(x => fila(x.t, x.m)).join("") +
          `<div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700"><span>Total devengado</span><span class="num">${c(k.bruto)}</span></div>`
      })}
        ${card({
        title: "Deducciones del colaborador", hint: "en el orden legal de prioridad",
        body: k.ded.map(x => fila(x.t, x.m, true)).join("") +
          `<div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700"><span>Total deducido</span><span class="num">−${c(k.totalDed)}</span></div>
           <div class="mut" style="font-size:12px;margin-top:6px;line-height:1.55">Mínimo inembargable protegido: ${c(M.MIN_INEMBARGABLE)}. El neto de esta colilla ${k.neto >= M.MIN_INEMBARGABLE ? "lo respeta" : "queda por debajo y el sistema retiene la deducción voluntaria"}.</div>`
      })}
        ${card({
        title: "Impuesto sobre la renta", hint: "tramos mensuales del decreto 45333-H",
        body: table({
          cols: [
            { t: "Tramo", fmt: r => (r.tramo.hasta == null ? "más de " + grp(r.tramo.desde) : (r.tramo.desde ? grp(r.tramo.desde) + " a " : "hasta ") + grp(r.tramo.hasta)) },
            { t: "Tasa", r: true, cls: "mono", fmt: r => r.tramo.p + " %" },
            { t: "Base", r: true, cls: "mono", fmt: r => grp(r.base) },
            { t: "Impuesto", r: true, cls: "mono", fmt: r => grp(r.monto) }
          ], rows: k.renta.detalle,
          foot: [{ v: "Base mensualizada " + c(k.brutoMes), span: 3 }, { v: grp(k.renta.impuesto), r: true, cls: "mono" }]
        }) + `<dl class="kv" style="margin-top:12px">
          <dt>Crédito por ${e.hijos} hijo${e.hijos === 1 ? "" : "s"}${e.conyuge ? " y cónyuge" : ""}</dt><dd class="num">−${c(k.renta.credito)}</dd>
          <dt>Impuesto a retener del mes</dt><dd class="num">${c(k.renta.retener)}</dd>
          <dt>Parte que toca a este periodo</dt><dd class="num"><b>${c(k.rentaPeriodo)}</b></dd></dl>`
      })}
        ${card({
        title: "Cargas del patrono", hint: pcs(M.TASAS.totPatrono) + " sobre " + c(k.bruto),
        body: table({
          cols: [
            { t: "Concepto", fmt: r => esc(r.t) },
            { t: "Tasa", r: true, cls: "mono", fmt: r => dec(r.p, 2) + " %" },
            { t: "Monto", r: true, cls: "mono", fmt: r => grp(r.m) }
          ], rows: k.patronal,
          foot: [{ v: "Total patronal" }, { v: pcs(M.TASAS.totPatrono), r: true, cls: "mono" }, { v: grp(k.totalPat), r: true, cls: "mono" }]
        })
      })}
        ${card({
        title: "Provisiones que genera este pago", hint: "pasivo laboral, no efectivo",
        body: `<div class="strip">
          <div class="cell"><div class="cl">Aguinaldo</div><div class="cv num">${c(k.prov.aguinaldo)}</div></div>
          <div class="cell"><div class="cl">Vacaciones</div><div class="cv num">${c(k.prov.vacaciones)}</div></div>
          <div class="cell"><div class="cl">Cesantía</div><div class="cv num">${c(k.prov.cesantia)}</div></div>
        </div>`
      })}`,
      footer: `<span class="mut" style="font-size:12.5px">Se envía por correo y por WhatsApp al colaborador</span>
               <div style="flex:1"></div><button class="btn" id="colPdf">${icon("print")}PDF</button>
               <button class="btn pri" id="colOk">Cerrar</button>`,
      after: root => {
        $("#colOk", root).addEventListener("click", closeSheet);
        $("#colPdf", root).addEventListener("click", () => toast("Colilla generada", "Queda en el expediente y se envía al correo del colaborador.", "ok"));
      }
    });
  };

  /* ═════════════════════════════════════════════════════════════
     PLANILLA — el recorrido de un periodo, de punta a punta
     ═════════════════════════════════════════════════════════════ */
  /* La matriz dice que Santa Rosa paga quincenal (NOM-001); por eso el
     demo abre en la quincena. Los otros dos esquemas quedan a un toque. */
  let plPer = M.ACTUAL.Quincenal, plPaso = null, plAbrirPeriodos = false;
  const PASOS = [
    { id: "novedades", t: "Novedades", d: "Recibe horas extra autorizadas, comisiones, incapacidades, adelantos, embargos y compras de personal." },
    { id: "calculo", t: "Cálculo", d: "El sistema aplica las reglas de ley y deja la corrida visible, persona por persona. Toque una fila para ver la colilla." },
    { id: "aprobacion", t: "Aprobación", d: "Firma de gerencia sobre el resumen. A partir de aquí la corrida se congela y cualquier cambio exige reabrir con bitácora." },
    { id: "pago", t: "Pago", d: "Nómina envía la corrida aprobada a Pagos al banco (Cobros y pagos): allí se firma, se genera el archivo del Banco Nacional y se confirma. Aquí se ve el avance y salen las colillas." },
    { id: "asiento", t: "Asiento", d: "Asiento de salarios, cargas y provisiones. Las obligaciones con la CCSS, Hacienda y el INS quedan en cola." }
  ];
  /* en qué paso va cada estado del periodo (5 = recorrido completo) */
  const AVANCE = { Abierta: 0, "En cálculo": 1, Aprobada: 3, Pagada: 4, Contabilizada: 5 };
  const MULT = { Semanal: 4.33, Quincenal: 2, Mensual: 1 };
  const per = () => M.perById[plPer];
  const pasoDe = p => PASOS[Math.min(AVANCE[p.estado], 4)].id;
  const anterior = p => M.periodos.filter(x => x.tipo === p.tipo && x.hasta < p.desde).sort((a, b) => b.desde - a.desde)[0];
  /* el pago se ejecuta en Cobros y pagos › Pagos al banco (el mismo proceso que el de proveedores) */
  const loteDe = p => (w.COB && w.COB.loteDe ? w.COB.loteDe(p.id) : null);
  const loteVivo = p => { const l = loteDe(p); return l && l.estado !== "Rechazado" ? l : null; };
  const esNovedad = f => f.ing.length > 1 || f.ded.some(x => DE_LEY.indexOf(x.cod) < 0);

  function pasoTexto(id, p, filas, t) {
    const av = AVANCE[p.estado];
    switch (id) {
      case "novedades": return filas.filter(esNovedad).length + " personas con novedades";
      case "calculo": return "Neto " + c(t.neto);
      case "aprobacion": return av >= 3 ? "Firmada por gerencia" : "Falta la firma de gerencia";
      case "pago": return av >= 4 ? t.n + " depósitos enviados" : loteVivo(p) ? "En Pagos al banco · " + w.COB.estadoLote(loteVivo(p)).toLowerCase() : t.n + " depósitos · " + fecha(p.pago);
      default: return av >= 5 ? "En el libro diario" : "Salarios, cargas y provisiones";
    }
  }

  /* la barra del paso: qué pasa aquí y el único botón que hace avanzar */
  function barraPaso(paso, p) {
    const i = PASOS.findIndex(x => x.id === paso.id), av = AVANCE[p.estado];
    const prev = PASOS[i - 1], next = PASOS[i + 1];
    let accion = "", aviso = "";
    if (paso.id === "novedades") accion = av === 0
      ? `<button class="btn pri" data-act="calcular">${icon("calc")}Calcular la planilla</button>`
      : `<button class="btn" data-paso="calculo">Ver el cálculo ${icon("chev")}</button>`;
    else if (paso.id === "calculo") accion = `<button class="btn pri" data-paso="aprobacion">Continuar a la aprobación ${icon("chev")}</button>`;
    else if (paso.id === "aprobacion") accion = av < 3
      ? `<button class="btn pri" data-act="aprobar">${icon("check")}Aprobar corrida</button>`
      : `${tag("Aprobada por gerencia", "ok", "check")}<button class="btn" data-paso="pago">Ir al pago ${icon("chev")}</button>`;
    else if (paso.id === "pago") {
      if (av < 3) { aviso = "Primero hay que aprobar la corrida"; accion = `<button class="btn pri" disabled>${icon("bank")}Enviar a Pagos al banco</button>`; }
      else if (av === 3 && loteVivo(p)) { const l = loteVivo(p); aviso = "Lote " + l.cons + " · " + w.COB.estadoLote(l); accion = `<button class="btn pri" data-ir="cob-archivo|bandeja">${icon("bank")}Ver en Pagos al banco</button>`; }
      else if (av === 3) { const d = loteDe(p); if (d && d.estado === "Rechazado") aviso = "Tesorería devolvió el lote " + d.cons + ": " + (d.motivo || ""); accion = `<button class="btn pri" data-act="pagar">${icon("bank")}${d ? "Reenviar a Pagos al banco" : "Enviar a Pagos al banco"}</button>`; }
      else accion = `${tag("Archivo enviado", "ok", "check")}<button class="btn" data-paso="asiento">Ir al asiento ${icon("chev")}</button>`;
    } else {
      if (av < 4) { aviso = "Se contabiliza cuando la planilla está pagada"; accion = `<button class="btn pri" disabled>${icon("check")}Contabilizar</button>`; }
      else if (av === 4) accion = `<button class="btn pri" data-act="contabilizar">${icon("check")}Contabilizar</button>`;
      else accion = tag("Planilla cerrada", "ok", "lock");
    }
    return `<div class="stepbar">
        <div class="sbt"><b>Paso ${i + 1} de 5 · ${esc(paso.t)}</b><span>${esc(paso.d)}</span></div>
        <div class="sba">${aviso ? `<span class="sbh">${esc(aviso)}</span>` : ""}
          ${prev ? `<button class="btn" data-paso="${prev.id}" aria-label="Volver a ${esc(prev.t)}">${icon("chev", 'style="transform:rotate(180deg)"')}${esc(prev.t)}</button>` : ""}
          ${accion}</div></div>`;
  }

  /* ── paso 1 · novedades ─────────────────────────────────────── */
  function pasoNovedades(p, filas) {
    const nov = filas.filter(esNovedad);
    const con = cod => filas.filter(f => f.ing.some(x => x.cod === cod)).length;
    const conDed = cods => filas.filter(f => f.ded.some(x => cods.indexOf(x.cod) >= 0)).length;
    const deEste = new Set(filas.map(f => f.e.id));
    const incVig = M.incapacidades.filter(i => i.vigente && deEste.has(i.empId)).length;
    const fuente = (tn, n, td, ir, lnk) => `<div class="tile">
        <div style="display:flex;align-items:baseline;gap:8px"><div class="tn">${esc(tn)}</div>${n != null ? `<span class="num b" style="margin-left:auto">${n}</span>` : ""}</div>
        <div class="td">${esc(td)}</div>
        ${ir ? `<button class="btn sm" style="margin-top:8px" data-ir="${ir}">${esc(lnk)} ${icon("chev")}</button>` : ""}</div>`;
    return `
      ${card({
      title: "De dónde viene cada novedad", hint: "casi nada se digita",
      body: `<div class="tiles t3">
          ${fuente("Horas extra", con("I-02"), "De las marcas de asistencia, ya autorizadas por la jefatura del local.", "nom-tiempo|extras", "Revisar horas extra")}
          ${fuente("Comisiones", con("I-04"), "Del módulo de ventas: lo facturado y cobrado por cada vendedor en el periodo.")}
          ${fuente("Feriados e incentivos", con("I-03") + con("I-05"), "Feriado laborado de pago obligatorio y metas cumplidas.")}
          ${fuente("Incapacidades", incVig, "De la boleta registrada: rebaja días y separa lo que paga el patrono.", "nom-tiempo|incap", "Ver boletas")}
          ${fuente("Pensiones y embargos", conDed(["D-05", "D-06"]), "Del expediente, con el monto y el juzgado que lo ordenó.", "nom-personal|colab", "Ver expedientes")}
          ${fuente("Adelantos y compras de personal", conDed(["D-10"]), "De la caja: quedan pendientes hasta que la planilla los rebaje.")}
        </div>`
    })}
      ${card({
      title: "Novedades capturadas", hint: "lo que hace distinto este periodo del anterior",
      actions: `<button class="btn sm" id="novAdd">${icon("plus")}Agregar novedad</button>`,
      body: table({
        h: "calc(100dvh - 520px)",
        cols: [
          { t: "Colaborador", fmt: r => `${esc(r.e.nom)}<span class="sub ui">${esc(r.e.puesto)}</span>` },
          { t: "Ingresos adicionales", fmt: r => r.ing.slice(1).map(x => tag(x.t, "ok")).join(" ") || '<span class="dim">—</span>' },
          { t: "Deducciones fuera de ley", fmt: r => r.ded.filter(x => DE_LEY.indexOf(x.cod) < 0).map(x => tag(x.t, "wa")).join(" ") || '<span class="dim">—</span>' },
          { t: "Efecto en el bruto", r: true, cls: "mono", fmt: r => { const x = r.bruto - r.ing[0].m; return x ? "+" + grp(x) : '<span class="dim">—</span>'; } },
          { t: "Efecto en el neto", r: true, cls: "mono", fmt: r => { const o = r.ded.filter(x => DE_LEY.indexOf(x.cod) < 0).reduce((s, x) => s + x.m, 0); return o ? "−" + grp(o) : '<span class="dim">—</span>'; } }
        ], rows: nov
      })
    })}`;
  }

  /* ── paso 2 · cálculo ───────────────────────────────────────── */
  function pasoCalculo(p, filas, t) {
    const cc = filas.reduce((s, f) => s + f.ded[0].m, 0);
    const bp = filas.reduce((s, f) => s + f.ded[1].m, 0);
    return card({
      title: "Corrida del periodo", hint: "toque una fila para ver la colilla completa",
      actions: `<button class="btn sm" id="calRe">${icon("history")}Recalcular</button>`,
      body: table({
        h: "calc(100dvh - 470px)", onRow: true,
        cols: [
          { t: "Colaborador", fmt: r => `<b>${esc(r.e.nom)}</b><span class="sub">${esc(r.e.ced)}</span>` },
          { t: "Puesto", fmt: r => `${esc(r.e.puesto)}<span class="sub ui">${esc(locNom(r.e.locId))}</span>` },
          { t: "Ordinario", r: true, cls: "mono", fmt: r => grp(r.ing[0].m) },
          { t: "Extras", r: true, cls: "mono", fmt: r => { const x = r.bruto - r.ing[0].m; return x ? grp(x) : '<span class="dim">—</span>'; } },
          { t: "Bruto", r: true, cls: "mono", fmt: r => `<b>${grp(r.bruto)}</b>` },
          { t: "CCSS " + M.TASAS.ccssObrero + " %", r: true, cls: "mono", fmt: r => "−" + grp(r.ded[0].m) },
          { t: "B. Popular", r: true, cls: "mono", fmt: r => "−" + grp(r.ded[1].m) },
          { t: "Renta", r: true, cls: "mono", fmt: r => (r.rentaPeriodo ? "−" + grp(r.rentaPeriodo) : '<span class="dim">—</span>') },
          { t: "Otras", r: true, cls: "mono", fmt: r => { const o = r.totalDed - r.ded[0].m - r.ded[1].m - r.rentaPeriodo; return o ? "−" + grp(o) : '<span class="dim">—</span>'; } },
          { t: "Neto", r: true, cls: "mono", fmt: r => `<b>${grp(r.neto)}</b>` }
        ], rows: filas,
        foot: [{ v: "Totales de " + t.n + " personas", span: 4 },
        { v: grp(t.bruto), r: true, cls: "mono" },
        { v: "−" + grp(cc), r: true, cls: "mono" },
        { v: "−" + grp(bp), r: true, cls: "mono" },
        { v: t.renta ? "−" + grp(t.renta) : "—", r: true, cls: "mono" },
        { v: "−" + grp(t.ded - cc - bp - t.renta), r: true, cls: "mono" },
        { v: grp(t.neto), r: true, cls: "mono" }]
      })
    });
  }

  /* ── paso 3 · aprobación: lo que gerencia firma ─────────────── */
  function pasoAprobacion(p, filas, t) {
    const porEnt = {};
    filas.forEach(f => f.patronal.forEach(x => (porEnt[x.t] = (porEnt[x.t] || 0) + x.m)));
    const obrero = { "CCSS obrero": filas.reduce((s, f) => s + f.ded[0].m, 0), "Banco Popular obrero": filas.reduce((s, f) => s + f.ded[1].m, 0) };
    const ant = anterior(p);
    const ta = ant ? M.totales(M.corrida(ant)) : null;
    const delta = (a, b, money) => {
      if (b == null) return '<span class="dim">—</span>';
      const d = a - b;
      if (!d) return '<span class="dim">sin cambio</span>';
      const pc = b ? " · " + dec(Math.abs(d) / b * 100, 1) + " %" : "";
      return `<span style="color:${d > 0 ? "var(--warn)" : "var(--ok)"}">${d > 0 ? "+" : "−"}${money ? c(Math.abs(d)).replace("−", "") : Math.abs(d)}${pc}</span>`;
    };
    const cmp = (l, a, b, money) => `<div class="cell"><div class="cl">${esc(l)}</div><div class="cv num">${money ? c(a) : a}</div>
        <div class="num" style="font-size:12px;margin-top:2px">${delta(a, b, money)}</div></div>`;
    return `
      ${card({
      title: "Contra el periodo anterior", hint: ant ? ant.id + " · " + fecha(ant.desde) + " al " + fecha(ant.hasta) : "primer periodo del esquema",
      body: `<div class="strip">
          ${cmp("Personas", t.n, ta && ta.n)}
          ${cmp("Bruto", t.bruto, ta && ta.bruto, true)}
          ${cmp("Neto a depositar", t.neto, ta && ta.neto, true)}
          ${cmp("Costo con cargas", t.costo, ta && ta.costo, true)}
        </div>`
    })}
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
        ${card({
      title: "Cargas patronales del periodo", hint: pcs(M.TASAS.totPatrono) + " sobre " + c(t.bruto),
      body: table({
        cols: [
          { t: "Concepto", fmt: r => esc(r[0]) },
          { t: "Entidad", fmt: r => esc((M.TASAS.patrono.find(x => x.t === r[0]) || {}).ent || "") },
          { t: "Tasa", r: true, cls: "mono", fmt: r => dec((M.TASAS.patrono.find(x => x.t === r[0]) || {}).p, 2) + " %" },
          { t: "Monto", r: true, cls: "mono", fmt: r => grp(r[1]) }
        ], rows: Object.keys(porEnt).map(k => [k, porEnt[k]]),
        foot: [{ v: "Total patronal", span: 2 }, { v: pcs(M.TASAS.totPatrono), r: true, cls: "mono" }, { v: grp(t.pat), r: true, cls: "mono" }]
      })
    })}
        ${card({
      title: "Lo que se le retiene al colaborador",
      body: table({
        cols: [
          { t: "Concepto", fmt: r => esc(r[0]) },
          { t: "Monto", r: true, cls: "mono", fmt: r => grp(r[1]) }
        ],
        rows: Object.keys(obrero).map(k => [k, obrero[k]]).concat([["Impuesto sobre la renta", t.renta]]),
        foot: [{ v: "Total de ley" }, { v: grp(obrero["CCSS obrero"] + obrero["Banco Popular obrero"] + t.renta), r: true, cls: "mono" }]
      }) + `<div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">
            La cuota obrera total de ley es ${pcs(M.TASAS.totObrero)}: ${M.TASAS.ccssObrero} % a la CCSS
            y 1 % al Banco Popular. El impuesto sobre la renta va aparte y depende del tramo de cada persona.</div>`
    })}
      </div>
      ${card({
      title: "A dónde va cada colón del costo", hint: "sobre el costo total de " + c(t.costo),
      body: bars([
        { n: "Neto al colaborador", v: t.neto, lab: c(t.neto), cls: "good" },
        { n: "CCSS (obrero y patrono)", v: Math.round(t.bruto * (M.TASAS.ccssObrero + M.TASAS.ccssPatrono) / 100), lab: c(Math.round(t.bruto * (M.TASAS.ccssObrero + M.TASAS.ccssPatrono) / 100)) },
        { n: "FODESAF, IMAS e INA", v: Math.round(t.bruto * 7 / 100), lab: c(Math.round(t.bruto * 7 / 100)) },
        { n: "FCL y ROP (operadoras)", v: Math.round(t.bruto * 3.5 / 100), lab: c(Math.round(t.bruto * 3.5 / 100)) },
        { n: "Riesgos del trabajo (INS)", v: Math.round(t.bruto * 1 / 100), lab: c(Math.round(t.bruto * 1 / 100)) },
        { n: "Impuesto sobre la renta", v: t.renta, lab: c(t.renta) },
        { n: "Banco Popular", v: Math.round(t.bruto * 1.5 / 100), lab: c(Math.round(t.bruto * 1.5 / 100)) }
      ])
    })}`;
  }

  /* ── paso 4 · pago ──────────────────────────────────────────── */
  function pasoPago(p, filas, t) {
    const porBanco = {};
    filas.forEach(f => { const b = porBanco[f.e.banco] || (porBanco[f.e.banco] = { n: 0, m: 0 }); b.n++; b.m += f.neto; });
    const pagada = AVANCE[p.estado] >= 4;
    return `
      ${card({
      body: `<div class="strip">
          <div class="cell"><div class="cl">Transferencias</div><div class="cv num">${t.n}</div></div>
          <div class="cell"><div class="cl">Bancos destino</div><div class="cv num">${Object.keys(porBanco).length}</div></div>
          <div class="cell"><div class="cl">Fecha de pago</div><div class="cv num">${fechaL(p.pago)}</div></div>
          <div class="cell"><div class="cl">Depósitos confirmados</div><div class="cv num">${pagada ? t.n + " de " + t.n : "0 de " + t.n}</div></div>
          <div class="cell"><div class="cl">En Pagos al banco</div><div class="cv">${loteDe(p) ? tag(loteDe(p).cons + " · " + w.COB.estadoLote(loteDe(p)), loteDe(p).estado === "Pagado" ? "ok" : loteDe(p).estado === "Rechazado" ? "cr" : "wa") : pagada ? tag("Pagada", "ok", "check") : '<span class="mut" style="font-size:13px">sin enviar</span>'}</div></div>
        </div>`, flush: true
    })}
      <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
        ${card({
      title: "Detalle del archivo", hint: "una línea por persona, con cuenta e identificación",
      actions: `<button class="btn sm" id="pgCol">${icon("mail")}Enviar colillas</button>`,
      body: table({
        h: "calc(100dvh - 520px)",
        cols: [
          { t: "Cédula", cls: "mono", fmt: r => esc(r.e.ced) },
          { t: "Colaborador", fmt: r => esc(r.e.nom) },
          { t: "Banco", fmt: r => esc(r.e.banco) },
          { t: "Cuenta IBAN", cls: "mono", fmt: r => `<span class="mut">${esc(r.e.cuenta)}</span>` },
          { t: "Neto", r: true, cls: "mono", fmt: r => `<b>${grp(r.neto)}</b>` },
          { t: "", fmt: r => (r.neto < M.MIN_INEMBARGABLE ? tag("Revisar", "wa", "alert") : tag("Listo", "ok", "check")) }
        ], rows: filas,
        foot: [{ v: "Total del archivo", span: 4 }, { v: grp(t.neto), r: true, cls: "mono" }, { v: "" }]
      })
    })}
        <div style="display:flex;flex-direction:column;gap:14px">
          ${card({
      title: "Por banco destino",
      body: table({
        cols: [
          { t: "Banco", fmt: r => esc(r[0]) },
          { t: "Personas", r: true, cls: "mono", fmt: r => r[1].n },
          { t: "Monto", r: true, cls: "mono", fmt: r => grp(r[1].m) }
        ], rows: Object.keys(porBanco).map(k => [k, porBanco[k]])
      })
    })}
          ${card({
      title: "Medios disponibles",
      body: `<div class="alerts">
          <div class="alert">${icon("bank")}<div><b>Archivo plano del Banco Nacional</b><div class="mut" style="font-size:12.5px">Formato de planilla con cédula, cuenta y monto. Es el que hoy se arma a mano en una hoja de cálculo.</div></div></div>
          <div class="alert">${icon("phone")}<div><b>SINPE móvil</b><div class="mut" style="font-size:12.5px">Para pagos sueltos: liquidaciones, adelantos y personal ocasional.</div></div></div>
          <div class="alert">${icon("cash")}<div><b>Efectivo con recibo firmado</b><div class="mut" style="font-size:12.5px">Queda registrado igual, con la firma escaneada en el expediente.</div></div></div>
        </div>`
    })}
        </div>
      </div>`;
  }

  /* ── paso 5 · asiento y provisiones ─────────────────────────── */
  function lineasAsiento(t) {
    const ccssObr = Math.round(t.bruto * M.TASAS.ccssObrero / 100);
    const bpObr = Math.round(t.bruto * 1 / 100);
    return [
      { cta: "6-01-01-001", nom: "Salarios", debe: t.bruto, haber: 0 },
      { cta: "6-01-01-002", nom: "Cargas sociales patronales", debe: t.pat, haber: 0 },
      { cta: "2-01-03-001", nom: "Cargas sociales por pagar (CCSS y otros)", debe: 0, haber: t.pat + ccssObr + bpObr },
      { cta: "2-01-03-003", nom: "Impuesto al salario retenido por pagar", debe: 0, haber: t.renta },
      { cta: "2-01-03-002", nom: "Salarios por pagar", debe: 0, haber: t.neto },
      { cta: "2-01-03-004", nom: "Deducciones de terceros por pagar", debe: 0, haber: t.ded - ccssObr - bpObr - t.renta }
    ];
  }
  function pasoAsiento(p, t) {
    const det = lineasAsiento(t);
    const td = det.reduce((s, x) => s + x.debe, 0), th = det.reduce((s, x) => s + x.haber, 0);
    const mult = MULT[p.tipo];
    const provMes = Math.round(t.bruto * mult * (1 / 12 + 0.0417 + 0.0533));
    return `<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
        ${card({
      title: "Asiento de la planilla " + p.id, hint: "así entra al libro diario",
      body: `<div class="strip" style="margin:-4px -17px 12px;border-bottom:1px solid var(--hair-2)">
            <div class="cell"><div class="cl">Gasto del mes</div><div class="cv num">${c((t.bruto + t.pat) * mult)}</div></div>
            <div class="cell"><div class="cl">Provisiones del mes</div><div class="cv num">${c(provMes)}</div></div>
            <div class="cell"><div class="cl">Cuadre</div><div class="cv">${td === th ? tag("Cuadrado", "ok", "check") : tag("Descuadre", "cr", "alert")}</div></div>
          </div>` + table({
        cols: [
          { t: "Cuenta", cls: "mono", fmt: r => esc(r.cta) },
          { t: "Descripción", fmt: r => esc(r.nom) },
          { t: "Debe", r: true, cls: "mono", fmt: r => (r.debe ? grp(r.debe) : '<span class="dim">—</span>') },
          { t: "Haber", r: true, cls: "mono", fmt: r => (r.haber ? grp(r.haber) : '<span class="dim">—</span>') }
        ], rows: det,
        foot: [{ v: "Totales", span: 2 }, { v: grp(td), r: true, cls: "mono" }, { v: grp(th), r: true, cls: "mono" }]
      }) + `<div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">Un asiento automático por periodo:
          ninguna partida se digita, y el sistema no deja guardar un asiento descuadrado.</div>`
    })}
        ${card({
      title: "Provisiones acumuladas", hint: "el pasivo laboral que hoy nadie ve hasta que llega diciembre",
      body: `<div class="strip">
          <div class="cell"><div class="cl">Aguinaldo</div><div class="cv num">${c(M.activos().reduce((s, e) => s + M.aguinaldo(e).monto, 0))}</div></div>
          <div class="cell"><div class="cl">Vacaciones</div><div class="cv num">${c(M.activos().reduce((s, e) => s + e.vacSaldo * (e.salario / 30), 0))}</div></div>
          <div class="cell"><div class="cl">Cesantía estimada</div><div class="cv num">${c(M.activos().reduce((s, e) => s + e.salario * 0.0533 * Math.min(e.antiguedad, 8) * 12, 0))}</div></div>
        </div>
        <div class="mut" style="font-size:12.5px;margin-top:14px;line-height:1.65">
          El aguinaldo se provisiona cada mes a razón de una doceava parte del devengado, no de golpe en
          diciembre. La cesantía se cubre en buena parte con el FCL que ya se traslada a la operadora:
          el saldo que queda es el riesgo real de la empresa, y aquí se ve mes a mes.</div>`
    })}
      </div>`;
  }

  /* ── historial de periodos (panel lateral) ──────────────────── */
  let peTipo = "Todos";
  function verPeriodos() {
    const tabla = () => {
      const rows = M.periodos.filter(p => peTipo === "Todos" || p.tipo === peTipo).slice().sort((a, b) => b.desde - a.desde);
      A._peRows = rows;
      return table({
        onRow: true,
        cols: [
          { t: "Periodo", cls: "mono", fmt: r => `<b>${esc(r.id)}</b>` },
          { t: "Tipo", fmt: r => tag(r.tipo, "mu") },
          { t: "Del", cls: "mono", fmt: r => fecha(r.desde) },
          { t: "Al", cls: "mono", fmt: r => fecha(r.hasta) },
          { t: "Personas", r: true, cls: "mono", fmt: r => M.dePeriodo(r).length },
          { t: "Neto", r: true, cls: "mono", fmt: r => `<b>${grp(M.totales(M.corrida(r)).neto)}</b>` },
          { t: "Pago", cls: "mono", fmt: r => fecha(r.pago) },
          { t: "Estado", fmt: r => tag(r.estado, EST_TAG[r.estado]) }
        ], rows, rowCls: r => (r.id === plPer ? "sel" : r.estado === "En cálculo" ? "wa" : "")
      });
    };
    const esq = t => M.empleados.filter(e => e.planilla === t).length;
    openSheet({
      wide: true,
      title: "Periodos de planilla",
      sub: "Semanal para operativos, quincenal para ventas y administración, mensual para jefaturas",
      body: `<div class="card" style="margin-bottom:14px"><div class="ficha">
          <div class="fcell"><div class="fl">Periodos del año</div><div class="fv num">${M.periodos.length}</div></div>
          <div class="fcell"><div class="fl">Personas por esquema</div><div class="fv num" style="font-size:13.5px">SEM ${esq("Semanal")} · QUI ${esq("Quincenal")} · MEN ${esq("Mensual")}</div></div>
          <div class="fcell"><div class="fl">Último cierre contable</div><div class="fv">agosto 2026</div></div></div></div>
        ${card({ title: "Toque un periodo para abrirlo", actions: seg("petipo", ["Todos", "Semanal", "Quincenal", "Mensual"], peTipo), body: `<div id="peTabla">${tabla()}</div>`, flush: true })}`,
      footer: `<span class="mut" style="font-size:12.5px">Cada puesto define su esquema; se cambia en Configuración</span><div style="flex:1"></div>
               <button class="btn" id="peNuevo">${icon("plus")}Abrir periodo</button><button class="btn pri" id="peOk">Cerrar</button>`,
      after: root => {
        const conectar = () => $$("#peTabla tr.clickable", root).forEach(tr => tr.addEventListener("click", () => {
          plPer = A._peRows[+tr.dataset.i].id; plPaso = null; closeSheet(); A.refresh();
        }));
        conectar();
        onSeg(root, "petipo", v => { peTipo = v; $("#peTabla", root).innerHTML = tabla(); conectar(); });
        $("#peOk", root).addEventListener("click", closeSheet);
        $("#peNuevo", root).addEventListener("click", () => toast("Periodo abierto", "Queda listo para recibir novedades. Se cierra solo con la corrida aprobada.", "ok"));
      }
    });
  }

  A.screen("nom-planilla", {
    title: "Planilla",
    sub: () => {
      const p = per();
      const cerrado = M.ACTUAL[p.tipo] !== p.id;
      return `${esc(p.tipo)} ${esc(p.id)} · del ${fechaL(p.desde)} al ${fechaL(p.hasta)} · se paga el ${fechaL(p.pago)} &nbsp;${tag(p.estado, EST_TAG[p.estado])}${cerrado ? " " + tag("periodo anterior", "mu", "history") : ""}`;
    },
    extra: () => seg("plEsq", ["Semanal", "Quincenal", "Mensual"], per().tipo) +
      `<button class="btn" id="plHist">${icon("history")}Periodos</button>`,
    crumb: () => { const k = plPaso || pasoDe(per()); return (PASOS.find(x => x.id === k) || PASOS[0]).t; },
    prep(arg) {
      if (arg == null || arg === "") return;
      const s = String(arg);
      if (M.perById[s]) { plPer = s; plPaso = null; }
      else if (PASOS.some(x => x.id === s)) plPaso = s;
      else if (s === "periodos") plAbrirPeriodos = true;
      w.S.arg = null;
    },
    render(v) {
      const p = per();
      const filas = M.corrida(p);
      const t = M.totales(filas);
      A._calFilas = filas;
      const actual = plPaso || pasoDe(p);
      const paso = PASOS.find(x => x.id === actual);
      const av = AVANCE[p.estado];
      const pasos = `<ol class="steps" role="tablist" aria-label="Recorrido de la planilla">${PASOS.map((x, i) => {
        const est = i < av ? "done" : i === av ? "now" : "";
        const sel = x.id === actual;
        return `<li role="presentation"><button type="button" class="step ${est}" role="tab" data-paso="${x.id}" aria-selected="${sel}" tabindex="${sel ? 0 : -1}">
            <span class="sn">${est === "done" ? icon("check") : i + 1}</span>
            <span class="st"><b>${esc(x.t)}</b><small>${esc(pasoTexto(x.id, p, filas, t))}</small></span></button></li>`;
      }).join("")}</ol>`;
      const cuerpo = actual === "novedades" ? pasoNovedades(p, filas)
        : actual === "calculo" ? pasoCalculo(p, filas, t)
          : actual === "aprobacion" ? pasoAprobacion(p, filas, t)
            : actual === "pago" ? pasoPago(p, filas, t)
              : pasoAsiento(p, t);
      /* primero el recorrido (dónde estoy y qué sigue), después las cifras */
      v.innerHTML = `<div class="wrap">
        ${pasos}
        <div role="tabpanel" aria-label="${esc(paso.t)}" class="wrap">
          ${barraPaso(paso, p)}
          <div class="grid g4">
            ${stat("Bruto del periodo", c(t.bruto), { txt: t.n + " personas · " + p.tipo.toLowerCase(), dir: "" })}
            ${stat("Deducciones", c(t.ded), { txt: "CCSS, renta, solidarista y órdenes judiciales", dir: "" }, "var(--warn)")}
            ${stat("Neto a depositar", c(t.neto), { txt: t.n + " transferencias", dir: "" }, "var(--ok)")}
            ${stat("Costo total con cargas", c(t.costo), { txt: pcs(M.TASAS.totPatrono) + " de carga patronal", dir: "" })}
          </div>
          ${cuerpo}
        </div></div>`;
    },
    wire(v) {
      const p = per();
      const irPaso = (id, foco) => {
        plPaso = id; A.refresh();
        if (foco) { const b = $(`.step[data-paso="${id}"]`); if (b) b.focus(); }
      };
      const steps = $$(".steps .step", v);
      steps.forEach((b, i) => b.addEventListener("keydown", e => {
        const n = steps.length;
        const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : null;
        if (j != null) { e.preventDefault(); irPaso(steps[j].dataset.paso, true); }
      }));
      $$("[data-paso]", v).forEach(b => b.addEventListener("click", () => irPaso(b.dataset.paso)));
      onSeg(document, "plEsq", tipo => { plPer = M.ACTUAL[tipo]; plPaso = null; A.refresh(); });
      const h = $("#plHist", document); if (h) h.addEventListener("click", verPeriodos);
      A.wireIr(v);

      /* las acciones que hacen avanzar el periodo */
      const act = {
        calcular() {
          p.estado = "En cálculo"; plPaso = "calculo";
          toast("Planilla calculada", "Las novedades quedaron aplicadas. Revise la corrida y pásela a aprobación.", "ok");
        },
        aprobar() {
          p.estado = "Aprobada"; plPaso = "pago";
          toast("Corrida aprobada", "Queda congelada. El siguiente paso es enviarla a Pagos al banco.", "ok");
        },
        pagar() {
          if (!w.COB || !w.COB.enviarLote) {   /* sin Cobros y pagos cargado, el comportamiento anterior */
            p.estado = "Pagada"; plPaso = "asiento";
            return toast("Archivo generado", M.corrida(p).length + " transferencias listas para el Banco Nacional. Las colillas salen al confirmarse el depósito.", "ok");
          }
          const filas = M.corrida(p);
          const l = w.COB.enviarLote({
            origen: "Planilla", concepto: "Planilla " + p.id, prepara: "Nómina", fechaPago: p.pago, ref: p.id,
            items: filas.map(f => ({ key: f.e.id, nom: f.e.nom, ced: f.e.ced, iban: f.e.cuenta, neto: Math.round(f.neto), det: f.e.puesto + " · " + f.e.banco })),
            alConfirmar: () => { if (p.estado === "Aprobada") p.estado = "Pagada"; },
            alDevolver: () => { }
          });
          plPaso = "pago";
          toast("Enviada a Pagos al banco", l.cons + " · " + filas.length + " transferencias. Las firmas, el archivo del Banco Nacional y la confirmación se hacen en Cobros y pagos; aquí verá el avance.", "ok");
        },
        contabilizar() {
          const t = M.totales(M.corrida(p));
          D.asentar(M.HOY, "PLA-" + p.id, "Planilla " + p.id, lineasAsiento(t).map(x => ({ cta: x.cta, debe: x.debe, haber: x.haber })));
          p.estado = "Contabilizada";
          toast("Planilla contabilizada", "El asiento ya está en el libro diario de contabilidad, con su glosa y el periodo que lo originó.", "ok");
        }
      };
      $$("[data-act]", v).forEach(b => b.addEventListener("click", () => { act[b.dataset.act](); A.refresh(); }));

      /* herramientas de cada paso */
      const re = $("#calRe", v); if (re) re.addEventListener("click", () => toast("Corrida recalculada", "Las reglas se volvieron a aplicar sobre las novedades vigentes. Nada quedó fuera de cuadre.", "ok"));
      $$(".card tr.clickable", v).forEach(tr => tr.addEventListener("click", () => A.colilla(A._calFilas[+tr.dataset.i])));
      const cl = $("#pgCol", v); if (cl) cl.addEventListener("click", () => toast("Colillas enviadas", "Cada colaborador recibe la suya por correo y por WhatsApp, con el desglose completo de deducciones.", "ok"));
      const na = $("#novAdd", v); if (na) na.addEventListener("click", () => openSheet({
        title: "Agregar novedad al periodo",
        sub: p.tipo + " " + p.id,
        body: `<div class="grid g2">
            ${U.selectField("Colaborador", M.dePeriodo(p).slice(0, 40).map(e => e.nom))}
            ${U.selectField("Concepto", M.CONCEPTOS.map(x => x.cod + " · " + x.t))}
            ${U.field("Cantidad", '<input class="inp" placeholder="horas, días o unidades">')}
            ${U.field("Monto", '<input class="inp" placeholder="₡">')}
            ${U.field("Observación", '<input class="inp" placeholder="Queda en la bitácora">')}</div>`,
        footer: `<button class="btn" id="nvCan">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="nvOk">${icon("check")}Agregar</button>`,
        after: root => {
          $("#nvCan", root).addEventListener("click", closeSheet);
          $("#nvOk", root).addEventListener("click", () => { closeSheet(); toast("Novedad agregada", "Entra en la próxima corrida y queda con el usuario que la digitó.", "ok"); });
        }
      }));
      if (plAbrirPeriodos) { plAbrirPeriodos = false; verPeriodos(); }
    }
  });

  /* ═════════════════════════════════════════════════════════════
     OBLIGACIONES DE LEY — Calendario y terceros · CCSS · Impuesto
     al salario · Aguinaldo
     ═════════════════════════════════════════════════════════════ */
  function calendario(v) {
    const act = M.activos();
    const bruto = act.reduce((s, e) => s + e.salario, 0);
    const pension = act.filter(e => e.pensionAlim);
    const embargos = act.filter(e => e.embargo);
    const sol = act.filter(e => e.solidarista);
    const destino = o => (o.ent === "Hacienda" ? "nom-obligaciones|renta" : /ingresos y salidas/.test(o.t) ? "nom-personal|mov" : o.ent === "CCSS" ? "nom-obligaciones|ccss" : null);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Entidades que reciben dinero", "9", { txt: "CCSS, FODESAF, IMAS, INA, INS, operadora, BP, Hacienda y juzgados", dir: "" })}
          ${stat("Pensiones alimentarias", pension.length, { txt: c(pension.reduce((s, e) => s + e.pensionAlim, 0)) + " al mes", dir: "" }, "var(--warn)")}
          ${stat("Embargos judiciales", embargos.length, { txt: "solo puede correr uno a la vez por persona", dir: "" })}
          ${stat("Afiliados a la asociación", sol.length, { txt: "ahorro obligatorio del 5 %", dir: "" })}
        </div>
        ${card({
      title: "Calendario del mes", hint: "el sistema avisa tres días antes de cada vencimiento",
      body: table({
        cols: [
          { t: "Entidad", fmt: r => `<b>${esc(r.ent)}</b>` },
          { t: "Obligación", fmt: r => `${esc(r.t)}<span class="sub ui">${esc(r.detalle)}</span>` },
          { t: "Plazo de presentación", fmt: r => esc(r.plazo) },
          { t: "Pago", fmt: r => esc(r.pago) },
          { t: "Estado", fmt: r => tag(r.estado, r.estado === "Pendiente" ? "wa" : "ok", r.estado === "Pendiente" ? "clock" : "check") },
          { t: "", fmt: r => (r.estado === "Pendiente" && destino(r) ? `<button class="btn sm" data-ir="${destino(r)}">Resolver ${icon("chev")}</button>` : "") }
        ], rows: M.OBLIGACIONES, rowCls: r => (r.estado === "Pendiente" ? "wa" : "")
      })
    })}
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Orden legal de los rebajos", hint: "el sistema no deja alterarlo",
      body: `<div class="alerts">
          ${[["1", "Cargas sociales, impuesto al salario y ahorro obligatorio solidarista", "Son de ley y van primero, siempre."],
        ["2", "Pensión alimentaria", "Junto con el aguinaldo puede llegar hasta el 50 % del neto."],
        ["3", "Embargo judicial", "Solo uno puede ejecutarse a la vez."],
        ["4", "Crédito del Banco Popular", "Debe respetar el mínimo inembargable de " + c(M.MIN_INEMBARGABLE) + "."],
        ["5", "Deducciones voluntarias", "Crédito solidarista, cooperativa y compras en la ferretería, con lo que quede."]]
          .map(x => `<div class="alert"><span class="mit-sm" style="flex:none">${icon("scale")}</span>
            <div><b>${x[0]} · ${esc(x[1])}</b><div class="mut" style="font-size:12.5px">${esc(x[2])}</div></div></div>`).join("")}
        </div>`
    })}
          ${card({
      title: "Cargas patronales por entidad", hint: "sobre " + c(bruto) + " de salarios mensuales",
      body: table({
        cols: [
          { t: "Entidad", fmt: r => esc(r.ent) },
          { t: "Concepto", fmt: r => `${esc(r.t)}${r.nota ? `<span class="sub ui">${esc(r.nota)}</span>` : ""}` },
          { t: "Tasa", r: true, cls: "mono", fmt: r => dec(r.p, 2) + " %" },
          { t: "Mensual", r: true, cls: "mono", fmt: r => grp(bruto * r.p / 100) }
        ], rows: M.TASAS.patrono,
        foot: [{ v: "Total", span: 2 }, { v: pcs(M.TASAS.totPatrono), r: true, cls: "mono" }, { v: grp(bruto * M.TASAS.totPatrono / 100), r: true, cls: "mono" }]
      })
    })}
        </div></div>`;
  }

  function ccss(v) {
    const p = M.perById["MEN-2026-09"];
    const filas = M.corrida(p);
    const act = M.activos();
    const brutoMes = act.reduce((s, e) => s + e.salario, 0);
    const obr = Math.round(brutoMes * M.TASAS.ccssObrero / 100);
    const pat = Math.round(brutoMes * M.TASAS.ccssPatrono / 100);
    const sinRep = M.movimientos.filter(m => !m.reportado);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Salarios reportables", c(brutoMes), { txt: act.length + " personas en la planilla del mes", dir: "" })}
          ${stat("Cuota obrera", c(obr), { txt: M.TASAS.ccssObrero + " % · SEM 5,50 + IVM 4,33", dir: "" })}
          ${stat("Cuota patronal CCSS", c(pat), { txt: M.TASAS.ccssPatrono + " % · SEM 9,25 + IVM 5,58", dir: "" }, "var(--warn)")}
          ${stat("Movimientos sin reportar", sinRep.length, { txt: sinRep.length ? "hay que enviarlos antes de la planilla" : "todo al día", dir: sinRep.length ? "down" : "up" }, sinRep.length ? "var(--crit)" : "var(--ok)")}
        </div>
        ${sinRep.length ? `<div class="alert cr card" style="padding:12px 16px">${icon("alert")}
          <span style="flex:1"><span class="at" style="display:block">${sinRep.length} movimiento${sinRep.length === 1 ? "" : "s"} de personal sin reportar</span>
          <span class="as">Se envían desde Personal › Movimientos; la planilla del mes no debe salir sin ellos.</span></span>
          <button class="btn sm" data-ir="nom-personal|mov">Ir a movimientos ${icon("chev")}</button></div>` : ""}
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Planilla de setiembre 2026", hint: "así se envía al SICERE",
      actions: `<button class="btn sm pri" id="ccGen">${icon("upload")}Generar y enviar</button>`,
      body: `<dl class="kv">
          <dt>Patrono</dt><dd>${esc(D.emisor.comercial)} · ${esc(D.emisor.cedula)}</dd>
          <dt>Periodo</dt><dd>setiembre 2026</dd>
          <dt>Personas</dt><dd class="num">${act.length}</dd>
          <dt>Salarios</dt><dd class="num">${c(brutoMes)}</dd>
          <dt>Cuota obrera</dt><dd class="num">${c(obr)}</dd>
          <dt>Cuota patronal</dt><dd class="num">${c(pat)}</dd>
          <dt>Total a pagar</dt><dd class="num"><b>${c(obr + pat)}</b></dd>
          <dt>Plazo de presentación</dt><dd>del 26 al 4.º día hábil del mes siguiente</dd>
          <dt>Plazo de pago</dt><dd>entre el 16 y el 20</dd></dl>`
    })}
          ${card({
      title: "Errores que el sistema evita", hint: "los seis que más cobra la CCSS",
      body: `<div class="alerts">
          <div class="alert">${icon("check")}<div><b>Omitir un ingreso</b><div class="mut" style="font-size:12.5px">El alta del expediente ya genera el movimiento; no depende de que alguien se acuerde.</div></div></div>
          <div class="alert">${icon("check")}<div><b>No registrar una salida</b><div class="mut" style="font-size:12.5px">La liquidación no se cierra sin el movimiento de salida reportado.</div></div></div>
          <div class="alert">${icon("check")}<div><b>Reportar bajo el mínimo contributivo</b><div class="mut" style="font-size:12.5px">Se valida contra el mínimo de la categoría antes de enviar.</div></div></div>
          <div class="alert">${icon("check")}<div><b>Dejar por fuera pagos adicionales</b><div class="mut" style="font-size:12.5px">Comisiones, horas extra e incentivos entran a la base reportable; viáticos y aguinaldo no.</div></div></div>
          <div class="alert">${icon("check")}<div><b>Presentar tarde</b><div class="mut" style="font-size:12.5px">Aviso tres días antes del vencimiento, con lo que falta por cerrar.</div></div></div>
          <div class="alert">${icon("check")}<div><b>Diferencias con la planilla interna</b><div class="mut" style="font-size:12.5px">El envío sale de la misma corrida que pagó el banco, no de otra hoja.</div></div></div>
        </div>`
    })}
        </div>
        ${card({
      title: "Detalle reportable", hint: "salario bruto por persona — la base sobre la que cotiza",
      body: table({
        h: "360px",
        cols: [
          { t: "Cédula", cls: "mono", fmt: r => esc(r.e.ced) },
          { t: "Colaborador", fmt: r => esc(r.e.nom) },
          { t: "Puesto", fmt: r => esc(r.e.puesto) },
          { t: "Días", r: true, cls: "mono", fmt: () => 30 },
          { t: "Salario reportado", r: true, cls: "mono", fmt: r => grp(r.bruto) },
          { t: "Cuota obrera", r: true, cls: "mono", fmt: r => grp(r.bruto * M.TASAS.ccssObrero / 100) },
          { t: "Cuota patronal", r: true, cls: "mono", fmt: r => grp(r.bruto * M.TASAS.ccssPatrono / 100) }
        ], rows: filas
      })
    })}</div>`;
  }

  function renta(v) {
    const act = M.activos();
    const conRenta = act.map(e => ({ e, r: M.renta(e.salario, e.hijos, e.conyuge) }))
      .filter(x => x.r.impuesto > 0).sort((a, b) => b.r.retener - a.r.retener);
    const total = conRenta.reduce((s, x) => s + x.r.retener, 0);
    const credito = conRenta.reduce((s, x) => s + x.r.credito, 0);
    const obl = M.OBLIGACIONES.find(o => o.ent === "Hacienda");
    const lista = obl && obl.estado !== "Pendiente";
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Personas con retención", conRenta.length, { txt: "de " + act.length + " activas", dir: "" })}
          ${stat("Retención del mes", c(total), { txt: "se declara y paga en TRIBU-CR", dir: "" }, "var(--warn)")}
          ${stat("Crédito familiar aplicado", c(credito), { txt: "hijos y cónyuge, con documentación al día", dir: "" }, "var(--ok)")}
          ${stat("Tramo exento", c(918000), { txt: "bajó desde ₡921 000 · variación del IPC de −0,38 %", dir: "" })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Tramos mensuales 2026", hint: "decreto 45333-H, vigente desde el 1 de enero",
      body: table({
        cols: [
          { t: "Desde", r: true, cls: "mono", fmt: r => (r.desde ? grp(r.desde) : "0") },
          { t: "Hasta", r: true, cls: "mono", fmt: r => (r.hasta == null ? "en adelante" : grp(r.hasta)) },
          { t: "Tasa", r: true, cls: "mono", fmt: r => (r.p ? r.p + " %" : tag("Exento", "ok")) }
        ], rows: M.TRAMOS
      }) + `<dl class="kv" style="margin-top:14px">
          <dt>Crédito por cada hijo</dt><dd class="num">${c(M.CREDITOS.hijo)} al mes</dd>
          <dt>Crédito por cónyuge</dt><dd class="num">${c(M.CREDITOS.conyuge)} al mes</dd>
          <dt>Aguinaldo</dt><dd>exento del impuesto</dd>
          <dt>Cuotas de la CCSS</dt><dd>no rebajan la base gravable</dd></dl>`
    })}
          ${card({
      title: "Declaración y pago", hint: "el antiguo D-103 se desdobló en TRIBU-CR",
      actions: lista ? tag("Declaración preparada", "ok", "check") : `<button class="btn sm pri" id="rtDec">${icon("file")}Preparar declaración</button>`,
      body: `<dl class="kv">
          <dt>Autoliquidativo</dt><dd>formulario 138 · salarios y otros pagos laborales</dd>
          <dt>Informativa correlacionada</dt><dd>formulario 208</dd>
          <dt>Plazo</dt><dd>primeros 15 días naturales del mes siguiente</dd>
          <dt>Retención de setiembre</dt><dd class="num">${c(total)}</dd>
          <dt>Vence</dt><dd>15 de octubre de 2026</dd></dl>
          <div class="alert" style="margin-top:14px;border:1px solid var(--hair);border-radius:11px">${icon("alert")}
          <div><b>Quien tiene dos patronos</b><div class="mut" style="font-size:12.5px">Debe declararlo. Si no,
          cada patrono retiene como si el suyo fuera el único ingreso y la persona termina debiendo el impuesto.
          El sistema pide la declaración al ingresar y la recuerda cada enero.</div></div></div>`
    })}
        </div>
        ${card({
      title: "Retención por persona", hint: "base mensualizada, tramo aplicado y crédito familiar",
      body: table({
        h: "340px",
        cols: [
          { t: "Colaborador", fmt: r => `${esc(r.e.nom)}<span class="sub ui">${esc(r.e.puesto)}</span>` },
          { t: "Salario mensual", r: true, cls: "mono", fmt: r => grp(r.e.salario) },
          { t: "Tramo máximo", r: true, cls: "mono", fmt: r => r.r.detalle[r.r.detalle.length - 1].tramo.p + " %" },
          { t: "Impuesto", r: true, cls: "mono", fmt: r => grp(r.r.impuesto) },
          { t: "Hijos", r: true, cls: "mono", fmt: r => r.e.hijos || '<span class="dim">—</span>' },
          { t: "Cónyuge", r: true, cls: "mono", fmt: r => (r.e.conyuge ? "sí" : '<span class="dim">—</span>') },
          { t: "Crédito", r: true, cls: "mono", fmt: r => (r.r.credito ? "−" + grp(r.r.credito) : '<span class="dim">—</span>') },
          { t: "A retener", r: true, cls: "mono", fmt: r => `<b>${grp(r.r.retener)}</b>` }
        ], rows: conRenta,
        foot: [{ v: "Totales", span: 3 }, { v: grp(conRenta.reduce((s, x) => s + x.r.impuesto, 0)), r: true, cls: "mono" },
        { v: "", r: true }, { v: "", r: true }, { v: grp(credito), r: true, cls: "mono" }, { v: grp(total), r: true, cls: "mono" }]
      })
    })}</div>`;
  }
  function rentaWire(v) {
    const b = $("#rtDec", v);
    if (b) b.addEventListener("click", () => {
      const o = M.OBLIGACIONES.find(x => x.ent === "Hacienda");
      if (o) o.estado = "Presentada";
      toast("Declaración preparada", "Formulario 138 con su informativa 208, listo para presentar en TRIBU-CR antes del 15 de octubre.", "ok");
      A.refresh();
    });
  }

  function aguinaldo(v) {
    const act = M.activos();
    const rows = act.map(e => ({ e, a: M.aguinaldo(e) })).sort((a, b) => b.a.monto - a.a.monto);
    const total = rows.reduce((s, r) => s + r.a.monto, 0);
    const meses = 9.5;
    const prov = Math.round(total * meses / 12);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Aguinaldo proyectado", c(total), { txt: rows.length + " personas", dir: "" })}
          ${stat("Provisionado a hoy", c(prov), { txt: dec(meses, 1) + " meses de los 12 del periodo", dir: "up" }, "var(--ok)")}
          ${stat("Falta por provisionar", c(total - prov), { txt: "de aquí a noviembre", dir: "" }, "var(--warn)")}
          ${stat("Cargas sobre el aguinaldo", "₡0", { txt: "exento de CCSS y de impuesto sobre la renta", dir: "" }, "var(--ok)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Cálculo por persona", hint: "una doceava parte de todo lo devengado en el periodo",
      actions: `<button class="btn sm" id="agProy">${icon("chart")}Proyección a diciembre</button>`,
      body: table({
        h: "calc(100dvh - 470px)",
        cols: [
          { t: "Colaborador", fmt: r => `${esc(r.e.nom)}<span class="sub ui">${esc(locNom(r.e.locId))}</span>` },
          { t: "Ingreso", cls: "mono", fmt: r => fechaL(r.e.ingreso) },
          { t: "Meses del periodo", r: true, cls: "mono", fmt: r => dec(r.a.meses, 1) },
          { t: "Devengado", r: true, cls: "mono", fmt: r => grp(r.a.devengado) },
          { t: "Aguinaldo", r: true, cls: "mono", fmt: r => `<b>${grp(r.a.monto)}</b>` }
        ], rows,
        foot: [{ v: "Total", span: 3 }, { v: grp(rows.reduce((s, r) => s + r.a.devengado, 0)), r: true, cls: "mono" }, { v: grp(total), r: true, cls: "mono" }]
      })
    })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
      title: "Las reglas que aplica",
      body: `<div class="mut" style="font-size:13px;line-height:1.7">
          <b>Qué entra:</b> salario ordinario, horas extra, comisiones y cualquier pago con carácter salarial.
          <br><b>Qué no entra:</b> viáticos, reembolsos de gastos y los subsidios de incapacidad que paga la CCSS o el INS.
          <br><b>Cuándo:</b> el pago completo debe estar hecho a más tardar el 20 de diciembre.
          <br><b>Deducciones:</b> ninguna, salvo pensión alimentaria por orden judicial.
          <br><b>Cargas:</b> no cotiza a la CCSS y está exento del impuesto sobre la renta.</div>`
    })}
            ${card({
      title: "Cómo se paga", hint: "un periodo de planilla aparte",
      body: `<div class="alerts">
          <div class="alert">${icon("wallet")}<div><b>Planilla de aguinaldo</b><div class="mut" style="font-size:12.5px">Se abre como un periodo propio en diciembre, en Planilla; no se mezcla con la quincena.</div></div></div>
          <div class="alert">${icon("bank")}<div><b>Mismo archivo bancario</b><div class="mut" style="font-size:12.5px">Con las mismas cuentas, y su propia colilla.</div></div></div>
          <div class="alert">${icon("scale")}<div><b>Contra la provisión</b><div class="mut" style="font-size:12.5px">El asiento descarga el pasivo acumulado; lo que falte va al gasto de diciembre.</div></div></div>
        </div>`
    })}
          </div>
        </div></div>`;
  }

  A.workspace("nom-obligaciones", {
    title: "Obligaciones de ley",
    tabs: [
      {
        id: "cal", t: "Calendario y terceros",
        sub: "Todo lo que sale de la planilla hacia afuera, con su plazo",
        render: calendario, wire: v => A.wireIr(v)
      },
      {
        id: "ccss", t: "CCSS · SICERE",
        sub: "Presentación en SICERE, factura del mes y movimientos de personal",
        render: ccss,
        wire: v => {
          A.wireIr(v);
          const b = $("#ccGen", v);
          if (b) b.addEventListener("click", () => toast("Planilla enviada al SICERE", "Archivo generado desde la misma corrida que pagó el banco. La factura de la CCSS queda en cuentas por pagar con su fecha de vencimiento.", "ok"));
        }
      },
      {
        id: "renta", t: "Impuesto al salario",
        sub: "Tramos del decreto 45333-H · declaración en TRIBU-CR",
        badge: () => { const n = M.OBLIGACIONES.filter(o => o.ent === "Hacienda" && o.estado === "Pendiente").length; return { n, k: "wa", l: "declaración pendiente" }; },
        render: renta, wire: rentaWire
      },
      {
        id: "agui", t: "Aguinaldo",
        sub: "Periodo del 1 de diciembre de 2025 al 30 de noviembre de 2026 · se paga a más tardar el 20 de diciembre",
        render: aguinaldo,
        wire: v => {
          const b = $("#agProy", v);
          if (b) b.addEventListener("click", () => toast("Proyección lista", "El sistema estima el devengado de octubre y noviembre con el promedio del año y ajusta la provisión mensual.", "ok"));
        }
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     CONFIGURACIÓN — Tasas y tramos · Conceptos · Políticas
     ═════════════════════════════════════════════════════════════ */
  function tasas(v) {
    v.innerHTML = `<div class="wrap">
          <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
            ${card({
      title: "Cuota del colaborador", hint: pcs(M.TASAS.totObrero) + " del salario bruto",
      body: table({
        cols: [
          { t: "Concepto", fmt: r => `${esc(r.t)}${r.nota ? `<span class="sub ui">${esc(r.nota)}</span>` : ""}` },
          { t: "Entidad", fmt: r => esc(r.ent) },
          { t: "Tasa", r: true, cls: "mono", fmt: r => dec(r.p, 2) + " %" }
        ], rows: M.TASAS.obrero,
        foot: [{ v: "Total obrero", span: 2 }, { v: pcs(M.TASAS.totObrero), r: true, cls: "mono" }]
      })
    })}
            ${card({
      title: "Cuota del patrono", hint: pcs(M.TASAS.totPatrono) + " sobre el salario bruto",
      body: table({
        cols: [
          { t: "Concepto", fmt: r => `${esc(r.t)}${r.nota ? `<span class="sub ui">${esc(r.nota)}</span>` : ""}` },
          { t: "Entidad", fmt: r => esc(r.ent) },
          { t: "Tasa", r: true, cls: "mono", fmt: r => dec(r.p, 2) + " %" }
        ], rows: M.TASAS.patrono,
        foot: [{ v: "Total patronal", span: 2 }, { v: pcs(M.TASAS.totPatrono), r: true, cls: "mono" }]
      })
    })}
          </div>
          <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
            ${card({
      title: "Tramos del impuesto al salario", hint: "vigencia desde el 1 de enero de 2026",
      actions: `<button class="btn sm" id="cfVig">${icon("plus")}Nueva vigencia</button>`,
      body: table({
        cols: [
          { t: "Desde", r: true, cls: "mono", fmt: r => grp(r.desde) },
          { t: "Hasta", r: true, cls: "mono", fmt: r => (r.hasta == null ? "en adelante" : grp(r.hasta)) },
          { t: "Tasa", r: true, cls: "mono", fmt: r => r.p + " %" }
        ], rows: M.TRAMOS
      })
    })}
            ${card({
      title: "Salarios mínimos vigentes", hint: "decreto 45303-MTSS",
      body: table({
        cols: [
          { t: "Categoría", fmt: r => esc(r.cat) },
          { t: "Mensual", r: true, cls: "mono", fmt: r => grp(r.m) }
        ], rows: M.MINIMOS
      })
    })}
          </div>
          ${card({
      title: "Por qué esto es un parámetro y no código", hint: "el reclamo que Santa Rosa tiene contra su sistema actual",
      body: `<div class="mut" style="font-size:13px;line-height:1.7">
            En 2026 cambiaron dos cosas de golpe: el IVM subió 0,16 puntos para ambas partes el 1 de enero,
            y los tramos de renta bajaron un 0,38 % por la variación del índice de precios. Ninguno de los
            dos cambios debería requerir una actualización del sistema ni esperar a que el proveedor la publique.
            <br><br>Aquí cada tasa, cada tramo y cada mínimo tiene su fecha de rige. Una planilla de agosto se
            recalcula con las reglas de agosto, y una de enero con las de enero. Eso es lo que permite recalcular
            un periodo viejo sin que las cifras cambien solas.</div>`
    })}
        </div>`;
  }

  function conceptos(v) {
    v.innerHTML = `<div class="wrap">
          ${card({
      title: "Conceptos de ingreso", hint: "qué cotiza y qué no",
      body: table({
        cols: [
          { t: "Código", cls: "mono", fmt: r => esc(r.cod) },
          { t: "Concepto", fmt: r => `${esc(r.t)}${r.nota ? `<span class="sub ui">${esc(r.nota)}</span>` : ""}` },
          { t: "Cotiza a la CCSS", fmt: r => (r.ccss ? tag("Sí", "ok", "check") : tag("No", "mu")) },
          { t: "Paga renta", fmt: r => (r.renta ? tag("Sí", "ok", "check") : tag("No", "mu")) }
        ], rows: M.CONCEPTOS.filter(x => x.tipo === "Ingreso")
      })
    })}
          ${card({
      title: "Conceptos de deducción", hint: "el orden es el que manda la ley",
      body: table({
        cols: [
          { t: "Código", cls: "mono", fmt: r => esc(r.cod) },
          { t: "Concepto", fmt: r => `${esc(r.t)}${r.nota ? `<span class="sub ui">${esc(r.nota)}</span>` : ""}` },
          { t: "Prioridad", r: true, cls: "mono", fmt: r => r.orden },
          { t: "Origen", fmt: r => (r.ley ? tag("De ley", "ac") : tag("Voluntaria", "mu")) }
        ], rows: M.CONCEPTOS.filter(x => x.tipo === "Deducción")
      })
    })}</div>`;
  }

  const POLITICAS = [
    ["Bloquear salarios bajo el mínimo de ley", "No deja guardar un contrato ni un aumento que quede bajo el decreto vigente.", true],
    ["Retener horas extra sobre el tope", "Las que pasan de 4 al día o 12 a la semana quedan retenidas hasta que la jefatura las justifique.", true],
    ["Exigir aprobación de gerencia", "La corrida no genera archivo bancario sin la firma.", true],
    ["Avisar el fin del periodo de prueba", "Diez días antes de que se cumplan los tres meses.", true],
    ["Avisar acumulación de vacaciones", "Cuando alguien pasa de dos periodos sin disfrutar.", true],
    ["Permitir adelantos de salario", "Con tope del 40 % del neto y rebajo automático en la siguiente planilla.", true],
    ["Rebajo de compras en la ferretería", "El colaborador compra en caja y se le rebaja de la planilla.", true],
    ["Pagar salario escolar", "Beneficio voluntario en el sector privado; hoy Santa Rosa no lo otorga.", false]
  ];
  function politicas(v) {
    const fila = (x, i) => `<div class="pref-row"><div class="pt"><div class="pn" id="pol-${i}">${esc(x[0])}</div>
          <div class="mut" style="font-size:12.5px;line-height:1.5">${esc(x[1])}</div></div>
          <button type="button" class="swtch" role="switch" aria-checked="${x[2]}" aria-labelledby="pol-${i}" data-pol="${i}"><i></i></button></div>`;
    v.innerHTML = `<div class="wrap">
          <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
            ${card({ title: "Políticas de la empresa", body: POLITICAS.map(fila).join("") })}
            <div style="display:flex;flex-direction:column;gap:14px">
              ${card({
      title: "Esquemas de planilla", hint: "cada puesto define el suyo",
      body: table({
        cols: [
          { t: "Esquema", fmt: r => `<b>${esc(r[0])}</b>` },
          { t: "Corte", fmt: r => esc(r[1]) },
          { t: "Personas", r: true, cls: "mono", fmt: r => M.empleados.filter(e => e.planilla === r[0]).length }
        ],
        rows: [["Semanal", "de lunes a domingo, pago el lunes"], ["Quincenal", "del 1 al 15 y del 16 al fin de mes"], ["Mensual", "mes natural, pago el último día hábil"]]
      }) + `<div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">
            Si Santa Rosa decide unificar todo en quincenal, se cambia el esquema del puesto y el sistema
            reparte el corte sin tocar el histórico.</div>`
    })}
              ${card({
      title: "Integraciones", body: `<div class="alerts">
            <div class="alert">${icon("shield")}<div><b>SICERE · CCSS</b><div class="mut" style="font-size:12.5px">Envío de planilla y movimientos de personal.</div></div></div>
            <div class="alert">${icon("file")}<div><b>TRIBU-CR · Hacienda</b><div class="mut" style="font-size:12.5px">Retenciones del impuesto al salario.</div></div></div>
            <div class="alert">${icon("bank")}<div><b>Banco Nacional</b><div class="mut" style="font-size:12.5px">Archivo de pago y confirmación de depósitos.</div></div></div>
            <div class="alert">${icon("chat")}<div><b>WhatsApp</b><div class="mut" style="font-size:12.5px">Colilla, saldo de vacaciones y constancia salarial a pedido del colaborador.</div></div></div>
          </div>`
    })}
            </div>
          </div></div>`;
  }
  function politicasWire(v) {
    $$("[data-pol]", v).forEach(b => b.addEventListener("click", () => {
      const x = POLITICAS[+b.dataset.pol];
      x[2] = !x[2];
      b.setAttribute("aria-checked", String(x[2]));
      toast(x[2] ? "Política activada" : "Política desactivada", x[0] + ". Queda en la bitácora con el usuario y la fecha.", "ok");
    }));
  }

  A.workspace("nom-config", {
    title: "Configuración de nómina",
    sub: "Las tasas y los tramos son parámetros: cuando la ley cambia, se cambia aquí",
    tabs: [
      {
        id: "tasas", t: "Tasas y tramos", render: tasas,
        wire: v => { const b = $("#cfVig", v); if (b) b.addEventListener("click", () => toast("Nueva vigencia", "Se capturan los tramos nuevos con su fecha de rige; los periodos anteriores siguen con los suyos.", "ok")); }
      },
      { id: "conceptos", t: "Conceptos", render: conceptos },
      { id: "politicas", t: "Políticas", render: politicas, wire: politicasWire }
    ]
  });
})(window);
