/* ═══════════════════════════════════════════════════════════════════
   ServeCore — motor contable
   Marco costarricense 2026: NIIF (resolución MH-DGT-RES-0015-2026 rige
   desde el 1 de enero de 2027), impuesto sobre las utilidades con
   periodo fiscal de enero a diciembre, pagos parciales, depreciación
   del reglamento y el calendario de obligaciones del año.
   Las cifras son de ejemplo; las reglas no.
   ═══════════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB;
  const HOY = D.HOY;
  const r0 = n => Math.round(n);

  let _s = 20260918;
  const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  /* ═══ 1 · MARCO ════════════════════════════════════════════════════ */
  const MARCO = {
    norma: "NIIF para PYMES",
    resolucion: "MH-DGT-RES-0015-2026",
    rige: "1 de enero de 2027",
    nota: "Los Grandes Contribuyentes Nacionales aplican NIIF plenas; el régimen general escoge entre plenas y PYMES.",
    periodo: "1 de enero al 31 de diciembre",
    salarioBase: 462200,
    moneda: "Colón costarricense (CRC)"
  };
  const ESTADOS_NIIF = [
    ["Estado de situación financiera", "El balance: qué tiene la empresa y a quién se lo debe", "con-situacion"],
    ["Estado de resultado integral", "Ingresos, costos, gastos y la utilidad del período", "con-resultados"],
    ["Estado de cambios en el patrimonio", "Movimiento del capital y de las utilidades acumuladas", null],
    ["Estado de flujos de efectivo", "De dónde vino y a dónde se fue el efectivo", "con-flujo"],
    ["Notas explicativas", "Las políticas contables y el detalle que los estados no muestran", null]
  ];

  /* ═══ 2 · CUENTAS ═════════════════════════════════════════════════
     El catálogo es uno solo y vive en data.js; aquí solo se agrupa. */

  /* ═══ 3 · PLAN DE CUENTAS JERÁRQUICO ═══════════════════════════════ */
  const CLASES = [
    ["1", "Activo", "Activo"], ["2", "Pasivo", "Pasivo"], ["3", "Patrimonio", "Patrimonio"],
    ["4", "Ingresos", "Ingreso"], ["5", "Costos", "Costo"], ["6", "Gastos", "Gasto"]
  ];
  const GRUPOS = {
    "1-01": "Activo corriente", "1-02": "Activo no corriente",
    "2-01": "Pasivo corriente", "2-02": "Pasivo no corriente",
    "3-01": "Capital", "3-02": "Resultados acumulados",
    "4-01": "Ingresos de operación", "4-02": "Otros ingresos",
    "5-01": "Costo de ventas",
    "6-01": "Gastos de operación"
  };
  const SUBGRUPOS = {
    "1-01-01": "Efectivo y equivalentes", "1-01-02": "Bancos", "1-01-03": "Cuentas por cobrar",
    "1-01-04": "Inventarios", "1-01-05": "Impuestos por cobrar", "1-01-06": "Impuestos diferidos",
    "1-02-01": "Propiedad, planta y equipo", "1-02-02": "Depreciación acumulada",
    "2-01-01": "Proveedores", "2-01-02": "Impuestos por pagar", "2-01-03": "Obligaciones laborales",
    "2-01-04": "Impuesto sobre la renta", "2-01-05": "Provisiones laborales", "2-01-06": "Anticipos de clientes",
    "3-01-01": "Capital social", "3-02-01": "Utilidades acumuladas",
    "4-01-01": "Ventas", "4-01-02": "Descuentos", "4-01-03": "Devoluciones", "4-02-01": "Otros ingresos", "4-02-02": "Servicios",
    "5-01-01": "Costo de la mercadería",
    "6-01-01": "Personal", "6-01-02": "Operación", "6-01-03": "Inventario", "6-01-04": "Comercial",
    "6-01-05": "Depreciación", "6-01-06": "Financieros", "6-01-07": "Impuestos"
  };
  function plan() {
    const out = [];
    const saldo = ct => {
      const s = ct.debe - ct.haber;
      return ct.tipo === "Pasivo" || ct.tipo === "Patrimonio" || ct.tipo === "Ingreso" ? -s : s;
    };
    const suma = pref => D.cuentas.filter(c => c.cod.indexOf(pref) === 0)
      .reduce((a, c) => ({ debe: a.debe + c.debe, haber: a.haber + c.haber }), { debe: 0, haber: 0 });
    CLASES.forEach(cl => {
      const s = suma(cl[0] + "-");
      out.push({ cod: cl[0], nom: cl[1], tipo: cl[2], nivel: 1, sumaria: true, debe: s.debe, haber: s.haber });
      Object.keys(GRUPOS).filter(g => g.indexOf(cl[0] + "-") === 0).forEach(g => {
        const sg = suma(g + "-");
        if (!sg.debe && !sg.haber && !D.cuentas.some(c => c.cod.indexOf(g + "-") === 0)) return;
        out.push({ cod: g, nom: GRUPOS[g], tipo: cl[2], nivel: 2, sumaria: true, debe: sg.debe, haber: sg.haber });
        Object.keys(SUBGRUPOS).filter(x => x.indexOf(g + "-") === 0).forEach(x => {
          const ss = suma(x + "-");
          const hijas = D.cuentas.filter(c => c.cod.indexOf(x + "-") === 0);
          if (!hijas.length) return;
          out.push({ cod: x, nom: SUBGRUPOS[x], tipo: cl[2], nivel: 3, sumaria: true, debe: ss.debe, haber: ss.haber });
          hijas.forEach(c => out.push({ cod: c.cod, nom: c.nom, tipo: c.tipo, nivel: 4, sumaria: false, debe: c.debe, haber: c.haber, cta: c, saldo: saldo(c) }));
        });
      });
    });
    return out;
  }

  /* ═══ 4 · ACTIVOS FIJOS Y DEPRECIACIÓN ═════════════════════════════
     Métodos permitidos: línea recta y suma de dígitos (decreto 43198-H).
     Un activo bajo el 25 % de un salario base se gasta directo.          */
  const TASAS = [
    { t: "Edificaciones", p: 2, vida: 50 },
    { t: "Maquinaria y equipo", p: 10, vida: 10 },
    { t: "Vehículos y flota", p: 10, vida: 10 },
    { t: "Mobiliario y equipo de oficina", p: 10, vida: 10 },
    { t: "Equipo de cómputo", p: 20, vida: 5 },
    { t: "Mejoras en propiedad arrendada", p: null, vida: null, nota: "se deprecian en el plazo del contrato" }
  ];
  const TOPE_GASTO = r0(MARCO.salarioBase * 0.25);

  const ACTIVOS = [
    ["AF-001", "Edificio CEDI Isabel", "Edificaciones", new Date(2019, 4, 12), 186000000, 2],
    ["AF-002", "Cabezal 12 · placa C 158 220", "Vehículos y flota", new Date(2018, 9, 3), 38500000, 10],
    ["AF-003", "Furgoneta 3 · placa CL 284 719", "Vehículos y flota", new Date(2021, 2, 18), 14800000, 10],
    ["AF-004", "Furgoneta 5 · placa CL 301 552", "Vehículos y flota", new Date(2023, 6, 9), 17400000, 10],
    ["AF-005", "Montacargas CEDI Isabel", "Maquinaria y equipo", new Date(2020, 0, 22), 12400000, 10],
    ["AF-006", "Mobiliario de mostrador · Santa Rosa", "Mobiliario y equipo de oficina", new Date(2022, 3, 5), 1850000, 10],
    ["AF-007", "Mobiliario de mostrador · Turrialba", "Mobiliario y equipo de oficina", new Date(2022, 3, 5), 2340000, 10],
    ["AF-008", "Racks y estantería del CEDI", "Mobiliario y equipo de oficina", new Date(2021, 7, 30), 9600000, 10],
    ["AF-009", "Servidores del nodo local · 7 tiendas", "Equipo de cómputo", new Date(2024, 10, 14), 5600000, 20],
    ["AF-010", "Terminales de punto de venta · 15", "Equipo de cómputo", new Date(2024, 10, 14), 7350000, 20],
    ["AF-011", "Planta eléctrica CEDI", "Maquinaria y equipo", new Date(2023, 1, 8), 8900000, 10]
  ].map(a => {
    const meses = Math.max(0, (HOY.getFullYear() - a[3].getFullYear()) * 12 + (HOY.getMonth() - a[3].getMonth()));
    const mensual = a[4] * (a[5] / 100) / 12;
    const acum = Math.min(a[4], r0(mensual * meses));
    return {
      id: a[0], nom: a[1], clase: a[2], compra: a[3], costo: a[4], tasa: a[5],
      mensual: r0(mensual), acum, libros: a[4] - acum, meses,
      pct: Math.round(acum / a[4] * 100)
    };
  });
  const depMensual = ACTIVOS.reduce((s, a) => s + (a.libros > 0 ? a.mensual : 0), 0);

  /* ═══ 5 · MIGRACIÓN AL 31 DE AGOSTO Y AJUSTES DEL PERÍODO ══════════
     La contabilidad en vivo empieza el 1 de setiembre. Lo anterior entra en
     un solo asiento de migración, y cada saldo de balance sale de su
     auxiliar: cartera, inventario, proveedores, IVA diferido y anticipos se
     calculan al final de la carga (abrirLibros) para que el mayor cuadre con
     su detalle. Los resultados de enero a agosto vienen a la escala real de
     la empresa (la planilla y los gastos fijos son los del levantamiento). */
  const FIN_AGO = new Date(2026, 7, 31, 23, 59);
  const TASA_RENTA = 30;
  const MESES_MIGRADOS = 8;
  const VENTA_MES_REAL = 790000000;
  const COSTO_PCT = 0.78;
  const CLASE_CTA = {
    "Edificaciones": "1-02-01-004", "Maquinaria y equipo": "1-02-01-005", "Vehículos y flota": "1-02-01-002",
    "Mobiliario y equipo de oficina": "1-02-01-001", "Equipo de cómputo": "1-02-01-003"
  };
  const mesesHasta = (desde, hasta) => Math.max(0, (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + 1);
  const planillaMes = () => (w.NOM ? w.NOM.activos().reduce((s, e) => s + e.salario, 0) : 40000000);
  const pctDe = arr => (arr || []).reduce((s, x) => s + x.p, 0);

  function abrirLibros() {
    if (!D.cargando) return null;   /* una sola vez */
    const lineas = [];
    const pone = (cta, monto, nota) => { if (monto) lineas.push(monto > 0 ? { cta, debe: r0(monto), haber: 0, nota } : { cta, debe: 0, haber: r0(-monto), nota }); };
    const mov = cta => D.ctaByCod[cta].debe - D.ctaByCod[cta].haber;   /* lo que ya se movió en setiembre */
    /* saldo a la apertura para que el mayor termine igual al auxiliar (+ deudor, − acreedor) */
    const desdeAux = (cta, auxDeudor, nota) => pone(cta, auxDeudor - mov(cta), nota);

    /* auxiliares */
    const cxc = D.documentos.filter(d => d.condicion === "Crédito" && d.saldo > 0).reduce((s, d) => s + d.saldo, 0);
    let inv = 0;
    Object.keys(D.existencias).forEach(id => { const a = D.artById[id]; if (a) Object.values(D.existencias[id]).forEach(e => inv += Math.max(0, e.cant) * a.costo); });
    const ivaDif = D.documentos.filter(d => d.condicion === "Crédito" && d.saldo > 0 && d.total).reduce((s, d) => s + r0(d.saldo * d.iva / d.total), 0);
    const favor = D.clientes.reduce((s, c) => s + (c.saldoFavor || 0), 0);
    const gastosXml = w.AUTO ? w.AUTO.GASTOS.filter(g => g.canal === "XML" && g.asiento).reduce((s, g) => s + g.monto, 0) : 0;
    const cxp = D.proveedores.reduce((s, p) => s + p.saldo, 0) + gastosXml;
    const tarjetas = w.AUTO ? w.AUTO.lotes.filter(x => !x.acreditado).reduce((s, x) => s + x.bruto, 0) : 0;

    desdeAux("1-01-03-001", cxc, "facturas a crédito abiertas");
    /* más lo que salió del kardex con el asiento retenido: el libro todavía lo tiene */
    desdeAux("1-01-04-001", inv + (w.AUTO ? w.AUTO.pendienteInventario() : 0), "kardex valorizado al costo");
    desdeAux("1-01-03-004", tarjetas, "lotes del datáfono sin acreditar");
    desdeAux("2-01-02-002", -ivaDif, "IVA de la cartera a crédito");
    desdeAux("2-01-06-001", -favor, "saldos a favor de clientes");
    desdeAux("2-01-01-001", -cxp, "facturas de proveedor por pagar");

    /* estados de cuenta y arqueos al 31 de agosto */
    const fondos = D.locales.reduce((s, l) => s + (l.tipo === "tienda" ? l.terminales : 0), 0) * (w.VENX ? w.VENX.PARAM.fondoCaja : 50000);
    pone("1-01-01-001", fondos, "fondos de las cajas (lo del 31 ya se depositó)");
    pone("1-01-02-001", 48250000); pone("1-01-02-002", 9400000); pone("1-01-02-003", 6120000); pone("1-01-02-004", 3280000);
    pone("1-01-02-005", 25000 * D.tcDe(FIN_AGO).compra, "US$ 25 000 al tipo de compra del 31");
    pone("1-01-03-002", -2400000, "estimación por incobrables");

    /* activos fijos: el registro, con la depreciación hasta agosto */
    const ppe = {}, dep = { v: 0 };
    ACTIVOS.forEach(a => {
      const cta = CLASE_CTA[a.clase];
      ppe[cta] = (ppe[cta] || 0) + a.costo;
      dep.v += Math.min(a.costo, r0(a.costo * a.tasa / 100 / 12 * mesesHasta(a.compra, new Date(2026, 7, 1))));
    });
    Object.keys(ppe).forEach(cta => pone(cta, ppe[cta]));
    pone("1-02-02-001", -dep.v, "depreciación acumulada del registro de activos");

    /* planilla de agosto por pagar en setiembre y provisiones acumuladas */
    const pl = planillaMes();
    const patr = w.NOM ? pctDe(w.NOM.TASAS.patrono) : 26.67, obr = w.NOM ? pctDe(w.NOM.TASAS.obrero) : 10.83;
    pone("2-01-03-001", -pl * (patr + obr) / 100, "CCSS, FODESAF, IMAS y Banco Popular de agosto");
    pone("2-01-03-003", -pl * 0.035, "impuesto al salario retenido en agosto");
    pone("2-01-05-001", -pl / 12 * 9, "aguinaldo de diciembre a agosto");
    pone("2-01-05-002", -pl * 0.0417 * 4, "vacaciones pendientes");
    pone("2-01-05-003", -pl * 0.0533 * MESES_MIGRADOS, "cesantía");

    /* IVA de agosto: se declara y paga a más tardar el 15 de setiembre */
    const vbMes = VENTA_MES_REAL;
    pone("2-01-02-003", -(vbMes * 0.13 * 0.94 - vbMes * COSTO_PCT * 0.13 * 0.95), "IVA de agosto por pagar");

    /* resultados de enero a agosto */
    const vb = vbMes * MESES_MIGRADOS, vn = vb * (1 - 0.019);
    pone("4-01-01-001", -vb, "ventas de enero a agosto");
    pone("4-01-02-001", vb * 0.012); pone("4-01-03-001", vb * 0.007);
    pone("4-02-01-001", -vb * 0.0015); pone("4-02-02-001", -vb * 0.006);
    pone("5-01-01-001", vn * COSTO_PCT);
    pone("6-01-01-001", pl * MESES_MIGRADOS); pone("6-01-01-002", pl * MESES_MIGRADOS * patr / 100);
    pone("6-01-01-003", pl * MESES_MIGRADOS * (1 / 12 + 0.0417 + 0.0533));
    pone("6-01-02-001", 14500000 * MESES_MIGRADOS); pone("6-01-02-002", 6200000 * MESES_MIGRADOS);
    pone("6-01-02-003", 3900000 * MESES_MIGRADOS); pone("6-01-02-004", 11600000 * MESES_MIGRADOS);
    pone("6-01-02-005", 4800000 * MESES_MIGRADOS); pone("6-01-03-001", vb * 0.0015);
    pone("6-01-04-001", 2800000 * MESES_MIGRADOS); pone("6-01-04-002", 2400000);
    pone("6-01-05-001", depMensual * MESES_MIGRADOS); pone("6-01-06-001", vb * 0.35 * 0.0275);
    pone("6-01-06-002", 180000); pone("6-01-07-001", 231100 + 725000 * MESES_MIGRADOS);

    /* renta de enero a agosto, registrada mes a mes en el sistema anterior */
    const utilMigrada = -lineas.filter(x => /^[456]/.test(x.cta)).reduce((s, x) => s + x.debe - x.haber, 0);
    const rentaMig = Math.max(0, utilMigrada * TASA_RENTA / 100);
    pone("6-01-07-002", rentaMig, "renta estimada de enero a agosto");
    pone("2-01-04-001", -rentaMig, "renta estimada del período por pagar");
    /* patrimonio: capital y utilidades de años anteriores; lo que falta para
       cuadrar son las inversiones a plazo que el sistema anterior traía */
    pone("3-01-01-001", -150000000); pone("3-02-01-001", -186400000);
    const dif = lineas.reduce((s, x) => s + x.debe - x.haber, 0);
    if (dif < 0) pone("1-01-02-006", -dif, "inversiones a plazo al 31 de agosto");
    else pone("3-02-01-001", -dif);
    const a = D.registrarApertura("Migración del sistema anterior · saldos al 31 de agosto de 2026", lineas);
    a.regla = "Migración";
    return a;
  }

  /* Depreciación y provisiones del mes: se proponen en el cierre y entran al
     mayor solo cuando el contador las aprueba (AUTO.FINMES) */
  function ajustesMes() {
    const planilla = planillaMes();
    const pAgui = r0(planilla / 12), pVac = r0(planilla * 0.0417), pCes = r0(planilla * 0.0533);
    return {
      dep: [{ cta: "6-01-05-001", debe: depMensual, haber: 0 }, { cta: "1-02-02-001", debe: 0, haber: depMensual }],
      pro: [{ cta: "6-01-01-003", debe: pAgui + pVac + pCes, haber: 0 }, { cta: "2-01-05-001", debe: 0, haber: pAgui },
        { cta: "2-01-05-002", debe: 0, haber: pVac }, { cta: "2-01-05-003", debe: 0, haber: pCes }]
    };
  }

  /* ═══ 6 · ESTADOS FINANCIEROS ══════════════════════════════════════ */
  const saldoDe = ct => {
    const s = ct.debe - ct.haber;
    return ct.tipo === "Pasivo" || ct.tipo === "Patrimonio" || ct.tipo === "Ingreso" ? -s : s;
  };
  const porTipo = t => D.cuentas.filter(c => c.tipo === t);
  const totalTipo = t => porTipo(t).reduce((s, c) => s + saldoDe(c), 0);

  /* todo sale del mayor: acumulado del año (la migración trae enero a agosto) */
  const saldoCod = cod => (D.ctaByCod[cod] ? saldoDe(D.ctaByCod[cod]) : 0);
  function resultados() {
    const bruto = saldoCod("4-01-01-001"), devol = -saldoCod("4-01-03-001"), desc = -saldoCod("4-01-02-001");
    const netas = bruto - devol - desc;
    const otros = saldoCod("4-02-01-001") + saldoCod("4-02-02-001"), difCambio = saldoCod("4-02-03-001") - saldoCod("6-01-06-003");
    const ing = totalTipo("Ingreso"), cos = totalTipo("Costo");
    const renta = saldoCod("6-01-07-002");                      /* la registrada en el mayor */
    const gas = totalTipo("Gasto") - renta;
    const bruta = ing - cos, operativa = bruta - gas;
    /* si todavía no se registró, se muestra la estimada, pero no se mete al balance */
    const rentaEstimada = renta ? 0 : Math.max(0, r0(operativa * TASA_RENTA / 100));
    const neta = operativa - renta;
    return {
      bruto, devol, desc, netas, otros, difCambio,
      ing, cos, gas, bruta, operativa, renta, rentaEstimada, neta,
      margenBruto: ing ? bruta / ing * 100 : 0,
      margenNeto: ing ? neta / ing * 100 : 0,
      gastos: porTipo("Gasto").filter(c => (c.debe || c.haber) && c.cod !== "6-01-07-002").map(c => ({ nom: c.nom, cod: c.cod, m: saldoDe(c) })).sort((a, b) => b.m - a.m)
    };
  }
  function situacion() {
    const r = resultados();
    const act = porTipo("Activo").filter(c => c.debe || c.haber);
    const pas = porTipo("Pasivo").filter(c => c.debe || c.haber);
    const pat = porTipo("Patrimonio").filter(c => c.debe || c.haber);
    const corriente = act.filter(c => c.cod.indexOf("1-01") === 0).reduce((s, c) => s + saldoDe(c), 0);
    const noCorriente = act.filter(c => c.cod.indexOf("1-02") === 0).reduce((s, c) => s + saldoDe(c), 0);
    const pasCorriente = pas.reduce((s, c) => s + saldoDe(c), 0);
    const patrimonio = pat.reduce((s, c) => s + saldoDe(c), 0) + r.neta;
    /* la comprobación es contra el mayor: suma de débitos igual a suma de créditos */
    const debe = D.cuentas.reduce((s, c) => s + c.debe, 0), haber = D.cuentas.reduce((s, c) => s + c.haber, 0);
    return {
      act, pas, pat, corriente, noCorriente,
      activo: corriente + noCorriente,
      pasivo: pasCorriente, patrimonio,
      utilidad: r.neta, renta: r.renta, rentaEstimada: r.rentaEstimada,
      cuadra: Math.round(debe) === Math.round(haber) && Math.abs((corriente + noCorriente) - (pasCorriente + patrimonio)) < 2,
      razonCorriente: pasCorriente ? corriente / pasCorriente : 0,
      endeudamiento: (corriente + noCorriente) ? pasCorriente / (corriente + noCorriente) * 100 : 0
    };
  }
  /* flujo de efectivo por el método indirecto, de setiembre (desde la migración):
     cada línea es el movimiento real de sus cuentas, así que el total da siempre
     la variación de caja y bancos */
  function flujo() {
    const esEfectivo = cod => /^1-01-0[12]-/.test(cod);
    const movSep = cod => D.asientos.filter(a => a.origen !== "APERTURA").reduce((s, a) => s + a.detalle.filter(x => x.cta === cod).reduce((k, x) => k + (x.debe || 0) - (x.haber || 0), 0), 0);
    const ap = D.asientos.find(a => a.origen === "APERTURA");
    const inicial = ap ? ap.detalle.filter(x => esEfectivo(x.cta)).reduce((s, x) => s + (x.debe || 0) - (x.haber || 0), 0) : 0;
    const efectos = { neta: 0, dep: 0, varCxC: 0, varInv: 0, varCxP: 0, otros: 0, inversion: 0, financiamiento: 0 };
    D.cuentas.forEach(c => {
      const m = movSep(c.cod); if (!m || esEfectivo(c.cod)) return;
      if (/^[456]/.test(c.cod)) efectos.neta -= m;                     /* resultado del mes */
      else if (c.cod === "1-02-02-001") efectos.dep -= m;              /* depreciación: no es salida de efectivo */
      else if (/^1-02-01-/.test(c.cod)) efectos.inversion -= m;
      else if (/^(3-|2-02-)/.test(c.cod)) efectos.financiamiento -= m;
      else if (/^1-01-03-00[1-2]/.test(c.cod)) efectos.varCxC -= m;
      else if (c.cod === "1-01-04-001") efectos.varInv -= m;
      else if (c.cod === "2-01-01-001") efectos.varCxP -= m;
      else efectos.otros -= m;
    });
    const operacion = efectos.neta + efectos.dep + efectos.varCxC + efectos.varInv + efectos.varCxP + efectos.otros;
    const neto = operacion + efectos.inversion + efectos.financiamiento;
    const final = D.cuentas.filter(c => esEfectivo(c.cod)).reduce((s, c) => s + c.debe - c.haber, 0);
    return Object.assign(efectos, { operacion, neto, inicial, final, cuadra: Math.round(inicial + neto) === Math.round(final) });
  }

  /* ═══ 7 · CENTROS DE COSTO ═════════════════════════════════════════
     El demo trae una muestra de documentos, no el mes completo; la
     planilla y los gastos fijos sí son mensuales. Para que la resta
     signifique algo, la venta se lleva al volumen mensual de Santa Rosa
     usando los documentos del demo como clave de reparto.              */
  const VENTA_MES = VENTA_MES_REAL;
  const FIJOS = { tienda: 9000000, cedi: 22000000, bodega: 6000000 };
  function porLocal() {
    const planilla = {};
    if (w.NOM) w.NOM.activos().forEach(e => planilla[e.locId] = (planilla[e.locId] || 0) + e.salario * 1.2683);
    const base = D.locales.map(l => {
      const docs = D.documentos.filter(d => d.locId === l.id);
      return {
        loc: l, docs: docs.length,
        vDemo: docs.reduce((s, d) => s + d.grav + d.exe, 0),
        cDemo: docs.reduce((s, d) => s + d.costo, 0)
      };
    });
    const totDemo = base.reduce((s, x) => s + x.vDemo, 0) || 1;
    return base.map(x => {
      const venta = r0(VENTA_MES * (x.vDemo / totDemo));
      const costo = x.vDemo ? r0(venta * (x.cDemo / x.vDemo)) : 0;
      const pla = r0(planilla[x.loc.id] || 0);
      const fijos = FIJOS[x.loc.tipo] || FIJOS.bodega;
      return {
        loc: x.loc, docs: x.docs, venta, costo, bruta: venta - costo, planilla: pla, fijos,
        operativa: venta - costo - pla - fijos,
        margen: venta ? (venta - costo) / venta * 100 : 0
      };
    }).filter(x => x.docs || x.planilla).sort((a, b) => b.venta - a.venta);
  }

  /* ═══ 8 · CIERRES ══════════════════════════════════════════════════ */
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre",
    "octubre", "noviembre", "diciembre"];
  const cierres = [];
  for (let m = 0; m <= HOY.getMonth(); m++) {
    const abierto = m >= HOY.getMonth();
    const asientos = D.asientos.filter(a => a.fecha.getMonth() === m && a.fecha.getFullYear() === 2026).length;
    cierres.push({
      mes: m, nom: MESES[m] + " 2026", asientos,
      estado: abierto ? "Abierto" : "Cerrado",
      /* los meses anteriores los revisó contabilidad y los aprobó gerencia, en el sistema anterior */
      cerrado: abierto ? null : new Date(2026, m + 1, ri(3, 9)),
      por: abierto ? null : "Adrián Vindas Mora", rol: abierto ? null : "Gerente general", revisado: abierto ? null : "Sonia Calderón Ruiz",
      bloqueado: !abierto
    });
  }
  cierres.reverse();
  /* lo cerrado ya no admite asientos: el último día del último mes cerrado */
  const ultCerrado = cierres.find(c => c.bloqueado);
  if (ultCerrado) D.bloquearHasta(new Date(2026, ultCerrado.mes + 1, 0, 23, 59, 59));

  /* ═══ 9 · IMPUESTOS Y CALENDARIO ═══════════════════════════════════ */
  const RENTA = {
    tarifaGeneral: 30,
    umbral: 119174000,
    escala: [
      { hasta: 5621000, p: 5 }, { hasta: 8433000, p: 10 },
      { hasta: 11243000, p: 15 }, { hasta: null, p: 20 }
    ],
    formulario: "102",
    formularioAnterior: "D-101",
    plazo: "15 de marzo",
    parciales: ["30 de junio", "30 de setiembre", "31 de diciembre"],
    baseParcial: "25 % del mayor entre el impuesto del período anterior y el promedio de los tres anteriores"
  };
  const IPJ = [
    { t: "Sociedad inactiva", p: 15, m: r0(MARCO.salarioBase * 0.15) },
    { t: "Activa · ingresos brutos menores a 120 salarios base", p: 25, m: r0(MARCO.salarioBase * 0.25) },
    { t: "Activa · entre 120 y 280 salarios base", p: 30, m: r0(MARCO.salarioBase * 0.30) },
    { t: "Activa · 280 salarios base o más", p: 50, m: r0(MARCO.salarioBase * 0.50), aplica: true }
  ];
  const CALENDARIO = [
    { f: "15 de cada mes", t: "Declaración del IVA · formulario 150", ent: "Hacienda", per: "Mensual", estado: "Al día" },
    { f: "15 de cada mes", t: "Retenciones del impuesto al salario · formulario 138", ent: "Hacienda", per: "Mensual", estado: "Pendiente" },
    { f: "Del 26 al 4.º día hábil", t: "Planilla de la CCSS en SICERE", ent: "CCSS", per: "Mensual", estado: "Al día" },
    { f: "31 de enero", t: "Impuesto a las personas jurídicas · Ley 9428", ent: "Hacienda", per: "Anual", estado: "Pagado" },
    { f: "15 de enero", t: "Impuesto solidario · casas de lujo", ent: "Hacienda", per: "Anual", estado: "No aplica" },
    { f: "Febrero y marzo", t: "Timbre de educación y cultura", ent: "Hacienda", per: "Anual", estado: "Pagado" },
    { f: "15 de marzo", t: "Declaración del impuesto sobre las utilidades · formulario 102", ent: "Hacienda", per: "Anual", estado: "Presentada" },
    { f: "Abril", t: "Registro de Transparencia y Beneficiarios Finales", ent: "BCCR", per: "Anual", estado: "Presentada" },
    { f: "30 de junio", t: "Primer pago parcial de renta", ent: "Hacienda", per: "Anual", estado: "Pagado" },
    { f: "30 de setiembre", t: "Segundo pago parcial de renta", ent: "Hacienda", per: "Anual", estado: "Próximo" },
    { f: "31 de diciembre", t: "Tercer pago parcial de renta", ent: "Hacienda", per: "Anual", estado: "Pendiente" },
    { f: "Trimestral", t: "Impuesto de bienes inmuebles y patentes", ent: "Municipalidades", per: "Trimestral", estado: "Al día" }
  ];

  /* ═══ 10 · PRESUPUESTO ═════════════════════════════════════════════ */
  /* presupuesto aprobado del año, llevado al avance del período; el real sale del mayor */
  const PRESUPUESTO_2026 = { ventas: 9600000000, costoPct: 0.775, personalMes: 58500000, operacionMes: 49000000 };
  function presupuesto() {
    const r = resultados();
    const f = (HOY.getMonth() + HOY.getDate() / 30) / 12;       /* avance del año */
    const P = PRESUPUESTO_2026, pv = r0(P.ventas * f), pc = r0(P.ventas * f * P.costoPct);
    const pPer = r0(P.personalMes * 12 * f), pOp = r0(P.operacionMes * 12 * f), pDep = r0(depMensual * 12 * f);
    const sum = pref => porTipo("Gasto").filter(c => c.cod.indexOf(pref) === 0).reduce((s, c) => s + saldoDe(c), 0);
    const per = sum("6-01-01"), dep = sum("6-01-05"), op = r.gas - per - dep;
    const filas = [
      ["Ventas", pv, r.ing],
      ["Costo de la mercadería vendida", pc, r.cos],
      ["Utilidad bruta", pv - pc, r.bruta],
      ["Gastos de personal", pPer, per],
      ["Gastos de operación", pOp, op],
      ["Depreciación", pDep, dep],
      ["Utilidad de operación", pv - pc - pPer - pOp - pDep, r.operativa]
    ];
    return filas.map(f => ({
      nom: f[0], pres: f[1], real: f[2], dif: f[2] - f[1],
      pct: f[1] ? (f[2] - f[1]) / f[1] * 100 : 0,
      bueno: /Utilidad|Ventas/.test(f[0]) ? f[2] >= f[1] : f[2] <= f[1]
    }));
  }

  /* ═══ 11 · LIBRO MAYOR ═════════════════════════════════════════════ */
  function mayor(cod) {
    const mov = [];
    D.asientos.slice().sort((a, b) => a.fecha - b.fecha || a.num - b.num).forEach(a => {
      a.detalle.forEach(d => {
        if (d.cta === cod) mov.push({ as: a, debe: d.debe || 0, haber: d.haber || 0 });
      });
    });
    const ct = D.ctaByCod[cod];
    const signo = ct && (ct.tipo === "Pasivo" || ct.tipo === "Patrimonio" || ct.tipo === "Ingreso") ? -1 : 1;
    let acum = 0;
    mov.forEach(m => { acum += signo * (m.debe - m.haber); m.saldo = acum; });
    return mov;
  }

  w.CON = {
    MARCO, ESTADOS_NIIF, CLASES, GRUPOS, SUBGRUPOS, plan,
    TASAS, TOPE_GASTO, ACTIVOS, depMensual, abrirLibros, ajustesMes, FIN_AGO, BANCO_AL_31: 48250000, TASA_RENTA,
    saldoDe, porTipo, totalTipo, resultados, situacion, flujo, porLocal, VENTA_MES,
    cierres, MESES, RENTA, IPJ, CALENDARIO, presupuesto, mayor
  };
})(window);
