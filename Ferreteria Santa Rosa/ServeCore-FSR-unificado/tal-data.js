/* ═══════════════════════════════════════════════════════════════════
   ServeCore — datos del taller (TAL-001, TAL-002, TAL-003)
   El taller de Santa Rosa repara la flota propia y vehículos de clientes,
   y recibe herramientas eléctricas para reparación. Factura mano de obra y
   repuestos; los repuestos salen de su propia bodega, que es un local más
   del inventario y entra a la contabilidad como el resto.
   Carga antes de la migración (CON.abrirLibros), así la bodega del taller
   queda en el saldo de inventario al 31 de agosto.
   ═══════════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, HOY = D.HOY;
  let _s = 20260928;
  const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pad = (n, l) => String(n).padStart(l, "0");
  const dia = (n, h, m) => new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() - n, h == null ? 8 : h, m || 0);

  /* ── la bodega del taller es un local más ───────────────────── */
  const BODEGA = "TL";
  if (!D.locales.some(l => l.id === BODEGA)) D.locales.push({ id: BODEGA, cod: "013", nom: "Bodega del taller", tipo: "bodega", terminales: 0, dir: "Taller de Santa Rosa" });

  /* ── familia y artículos: repuestos y mano de obra ──────────── */
  if (!D.famById.REP) { const f = { id: "REP", nom: "Repuestos del taller", min: 25 }; D.familias.push(f); D.famById.REP = f; D.subcats.REP = ["Automotriz", "Herramientas eléctricas"]; }
  /* cod, desc, sub, marca, unidad, costo, existencia, mínimo, ubicación, CABYS (de ejemplo) */
  const REP = [
    ["REP-1001", "Aceite motor diésel 15W-40 galón", 0, "Shell Rimula", "Galón", 11800, 46, 20, "T-A1", "3334000000000"],
    ["REP-1002", "Filtro de aceite camión pesado", 0, "Fleetguard", "Unid", 9400, 14, 6, "T-A2", "4913000000000"],
    ["REP-1003", "Filtro de aire cabezal", 0, "Donaldson", "Unid", 28600, 5, 3, "T-A2", "4913000000000"],
    ["REP-1004", "Filtro de combustible diésel", 0, "Fleetguard", "Unid", 12300, 9, 6, "T-A2", "4913000000000"],
    ["REP-1005", "Pastillas de freno delanteras pick-up", 0, "Bosch", "Juego", 21900, 6, 4, "T-B1", "4913000000000"],
    ["REP-1006", "Zapatas de freno camión", 0, "Frasle", "Juego", 38400, 3, 4, "T-B1", "4913000000000"],
    ["REP-1007", "Batería 12 V 100 Ah", 0, "Energiser", "Unid", 74500, 3, 2, "T-B2", "4642000000000"],
    ["REP-1008", "Llanta 11R22.5 cabezal", 0, "Bridgestone", "Unid", 186000, 4, 4, "T-C1", "3625000000000"],
    ["REP-1009", "Llanta 205/65 R16 furgoneta", 0, "Hankook", "Unid", 52800, 6, 4, "T-C1", "3625000000000"],
    ["REP-1010", "Líquido de frenos DOT 4 litro", 0, "Bosch", "Litro", 4900, 12, 6, "T-A3", "3334000000000"],
    ["REP-1011", "Refrigerante verde galón", 0, "Prestone", "Galón", 8700, 10, 6, "T-A3", "3334000000000"],
    ["REP-1012", "Grasa multipropósito 1 kg", 0, "Mobil", "Unid", 6200, 8, 4, "T-A3", "3334000000000"],
    ["REP-1013", "Bombillo H4 12 V", 0, "Philips", "Unid", 3400, 18, 8, "T-B3", "4652000000000"],
    ["REP-1014", "Faja de alternador", 0, "Gates", "Unid", 9800, 5, 4, "T-B3", "4913000000000"],
    ["REP-1015", "Escobilla limpiaparabrisas 22\"", 0, "Bosch", "Unid", 5200, 10, 6, "T-B3", "4913000000000"],
    ["REP-1016", "Retén de piñón de diferencial", 0, "National", "Unid", 18500, 0, 1, "T-B1", "4913000000000"],
    ["REP-2001", "Carbones para taladro y esmeriladora", 1, "Genérico", "Par", 1900, 30, 12, "T-H1", "4641000000000"],
    ["REP-2002", "Interruptor para taladro", 1, "Genérico", "Unid", 3600, 12, 6, "T-H1", "4641000000000"],
    ["REP-2003", "Cable de poder 3 × 16 AWG · 2 m", 1, "Genérico", "Unid", 2800, 15, 6, "T-H1", "4631000000000"],
    ["REP-2004", "Rodamiento 608ZZ", 1, "SKF", "Unid", 1400, 40, 15, "T-H2", "4913000000000"],
    ["REP-2005", "Rodamiento 6201ZZ", 1, "SKF", "Unid", 2100, 24, 10, "T-H2", "4913000000000"],
    ["REP-2006", "Inducido para esmeriladora 4½\"", 1, "Genérico", "Unid", 14800, 4, 3, "T-H2", "4641000000000"],
    ["REP-2007", "Escobillas de sierra circular", 1, "Genérico", "Par", 2300, 8, 6, "T-H1", "4641000000000"],
    ["REP-2008", "Engrane de martillo rotativo", 1, "Genérico", "Unid", 9600, 2, 3, "T-H2", "4913000000000"]
  ];
  const repuestos = [];
  REP.forEach(r => {
    if (D.articulos.some(a => a.cod === r[0])) return;
    const tarifa = D.tarifaDeCabys(r[9]);
    const a = {
      id: "R" + (repuestos.length + 1), cod: r[0], desc: r[1], nom: r[1], fam: "REP", sub: D.subcats.REP[r[2]], marca: r[3], unidad: r[4],
      costo: r[5], ultCosto: r[5], precio: D.pisoConIva(r[5], 32, tarifa), cabys: r[9], tarifa, ean: "", ubic: r[8], tipo: "Producto", peso: 0, medida: "", taller: true
    };
    a.margen = +D.margenDe(a.precio, a.costo, a.tarifa).toFixed(1);
    D.articulos.push(a); D.artById[a.id] = a; repuestos.push(a);
    D.existencias[a.id] = { [BODEGA]: { cant: r[6], comp: 0, min: r[7] } };
  });
  /* mano de obra y diagnóstico: servicios del taller */
  const SERV = [
    ["SRV-006", "Mano de obra taller automotriz", "Hora", 16950, "8714000000000"],
    ["SRV-007", "Mano de obra reparación de herramientas", "Hora", 11300, "8715000000000"],
    ["SRV-008", "Diagnóstico de herramienta eléctrica", "Servicio", 5650, "8715000000000"]
  ];
  SERV.forEach(s => {
    if (D.articulos.some(a => a.cod === s[0])) return;
    const a = { id: "S" + (D.articulos.filter(x => x.tipo === "Servicio").length + 1), cod: s[0], desc: s[1], nom: s[1], fam: "TAL", sub: "Taller",
      marca: "—", unidad: s[2], costo: 0, precio: s[3], cabys: s[4], tarifa: D.tarifaDeCabys(s[4]), ean: "", ubic: "Taller", tipo: "Servicio", peso: 0, medida: "", margen: 100 };
    D.articulos.push(a); D.artById[a.id] = a;
  });
  /* a quién se le compran los repuestos */
  let PROV = D.proveedores.find(p => p.linea === "Repuestos");
  if (!PROV) {
    PROV = { id: "P" + (D.proveedores.length + 1), ced: "3-101-512208", nom: "Distribuidora de Repuestos Cartago S.A.", plazo: 30,
      cuenta: "CR51015201001051220800", linea: "Repuestos", saldo: 0, negociaciones: [{ id: "N", t: "Normal", plazo: 30, desc: 0 }] };
    D.proveedores.push(PROV); D.provById[PROV.id] = PROV;
  }
  repuestos.forEach(a => { a.provId = PROV.id; });
  const art = cod => D.articulos.find(a => a.cod === cod);
  const MO_AUTO = art("SRV-006"), MO_HERR = art("SRV-007"), DIAG = art("SRV-008");

  /* ── quién trabaja en el taller ─────────────────────────────── */
  const deTaller = w.NOM ? w.NOM.activos().filter(e => /Mec/i.test(e.puesto)).map(e => e.nom) : [];
  const MECANICOS = (deTaller.length ? deTaller : ["Minor Granados Núñez", "Katherine Loría Picado", "Jessica Barquero Soto", "José Bonilla Mora"]).slice(0, 4);
  const TECNICOS = (deTaller.length > 4 ? deTaller.slice(4) : ["Kevin Soto Villalobos", "Keylor Aguilar Solano"]).slice(0, 2);
  const COSTO_HORA = 5600;   /* costo de la hora de mecánico con cargas, para el costo interno de la flota */

  /* ── vehículos: la flota propia y los de clientes ───────────── */
  /* id, descripción, placa, dueño (null = flota), km, km del último servicio, intervalo de servicio */
  const VEHICULOS = [
    ["V1", "Cabezal 07 · Freightliner M2", "C 142 118", null, 412300, 402600, 10000],
    ["V2", "Cabezal 12 · International 4400", "C 158 220", null, 388900, 380200, 10000],
    ["V3", "Camión 5 · Isuzu NPR", "C 167 905", null, 214700, 207900, 8000],
    ["V4", "Furgoneta 3 · Hyundai H100", "CL 284 719", null, 126400, 121800, 5000],
    ["V5", "Furgoneta 5 · Toyota Hiace", "CL 301 552", null, 58200, 55100, 5000],
    ["V6", "Pick-up 2 · Toyota Hilux", "CL 256 330", null, 97400, 96800, 5000],
    ["V7", "Montacargas CEDI · Toyota 8FG25", "horómetro", null, 6420, 6150, 250],
    ["V8", "Pick-up Nissan Frontier", "BGK 482", "C3", 141200, null, null],
    ["V9", "Camión Hino 300", "C 171 336", "C6", 233800, null, null],
    ["V10", "Toyota Hilux 2019", "BLM 905", "C2", 88100, null, null],
    ["V11", "Mitsubishi L200", "BFT 217", "C12", 176500, null, null]
  ].map(v => ({ id: v[0], desc: v[1], placa: v[2], clienteId: v[3], flota: !v[3], km: v[4], ultServ: v[5], intervalo: v[6] }));
  const vehById = {}; VEHICULOS.forEach(v => vehById[v.id] = v);

  /* ── órdenes de trabajo automotrices (TAL-001) ──────────────── */
  const ESTADOS_OT = ["Recibida", "En diagnóstico", "Esperando repuestos", "En reparación", "Lista para entregar", "Entregada"];
  const ORDENES = [];
  let otSeq = 1180;
  function nuevaOT(o) {
    otSeq++;
    const ot = Object.assign({
      id: "OT-" + otSeq, tipo: "Automotriz", estado: "Recibida", mecanico: null, repuestos: [], horas: 0, bitacora: [], checklist: [],
      prometida: null, diagnostico: "", promesa: null
    }, o);
    ot.flota = vehById[ot.vehId].flota;
    ot.clienteId = vehById[ot.vehId].clienteId;
    ORDENES.unshift(ot);
    return ot;
  }
  /* repuestos que la orden usa: quedan comprometidos en la bodega hasta cerrar la orden */
  function asignarRepuesto(ot, cod, cant) {
    const a = art(cod), e = D.stock(a.id, BODEGA);
    const libre = e ? e.cant - e.comp : 0;
    const x = { artId: a.id, cant, costo: a.costo, precio: a.precio, pendiente: libre < cant };
    if (!x.pendiente) e.comp += cant;
    ot.repuestos.push(x);
    return x;
  }
  const paso = (ot, estado, fecha, por, nota) => { ot.estado = estado; ot.bitacora.push({ estado, fecha, por, nota: nota || "" }); };

  /* cierre de una orden de la flota: los repuestos salen de la bodega y el costo va a mantenimiento */
  function cerrarFlota(ot, fecha, por) {
    let costo = 0;
    ot.repuestos.forEach(x => {
      const e = D.stock(x.artId, BODEGA);
      if (e && !x.pendiente) e.comp = Math.max(0, e.comp - x.cant);
      D.mover(x.artId, BODEGA, -x.cant, "Consumo taller", ot.id, fecha, vehById[ot.vehId].desc);
      costo += Math.round(x.cant * x.costo);
    });
    if (costo) {
      const a = D.asentar(fecha, ot.id, "Mantenimiento de flota · " + vehById[ot.vehId].desc + " · " + ot.id, [
        { cta: "6-01-02-005", debe: costo, haber: 0, cc: "CC-21 Distribución" },
        { cta: "1-01-04-001", debe: 0, haber: costo }
      ]);
      a.regla = "Consumo de repuestos del taller"; ot.asiento = a.id;
    }
    ot.costoRepuestos = costo;
    ot.costoMO = Math.round(ot.horas * COSTO_HORA);
    const v = vehById[ot.vehId];
    if (ot.servicio && v.intervalo) v.ultServ = ot.km;
    paso(ot, "Entregada", fecha, por, "Costo a mantenimiento de flota (CC-21 Distribución)");
    ot.cerrada = fecha;
  }

  /* órdenes de setiembre: cerradas, en proceso y recién recibidas */
  const M = MECANICOS;
  const cerradas = [
    { vehId: "V4", km: 121800, falla: "Servicio de 5 000 km", servicio: true, d: 11, h: 4, mec: M[0], reps: [["REP-1001", 2], ["REP-1002", 1], ["REP-1004", 1]] },
    { vehId: "V2", km: 380200, falla: "Servicio de 10 000 km y revisión de frenos", servicio: true, d: 9, h: 7, mec: M[1], reps: [["REP-1001", 9], ["REP-1002", 2], ["REP-1003", 1], ["REP-1004", 2], ["REP-1010", 2]] },
    { vehId: "V6", km: 96800, falla: "Cambio de pastillas de freno", d: 6, h: 2.5, mec: M[2], reps: [["REP-1005", 1], ["REP-1010", 1]] },
    { vehId: "V3", km: 207900, falla: "No arranca en frío · batería", d: 4, h: 1.5, mec: M[0], reps: [["REP-1007", 1]] }
  ];
  cerradas.forEach(c => {
    const ot = nuevaOT({ vehId: c.vehId, km: c.km, falla: c.falla, servicio: !!c.servicio, recibida: dia(c.d, 7, 30), mecanico: c.mec, horas: c.h });
    ot.bitacora.push({ estado: "Recibida", fecha: ot.recibida, por: "Recepción del taller", nota: c.km + " km" });
    c.reps.forEach(r => asignarRepuesto(ot, r[0], r[1]));
    paso(ot, "En reparación", dia(c.d, 8, 30), c.mec);
    cerrarFlota(ot, dia(c.d - (c.d > 5 ? 1 : 0), 15, 30), c.mec);
  });
  /* en proceso */
  const abiertas = [
    { vehId: "V1", km: 412300, falla: "Ruido en el diferencial y fuga de aceite", estado: "Esperando repuestos", d: 2, h: 3, mec: M[1], diag: "Retén del piñón dañado; se pidió el retén al proveedor. Mientras tanto no sale a ruta.", reps: [["REP-1001", 4], ["REP-1012", 1]], prom: 1 },
    { vehId: "V9", km: 233800, falla: "Frenos traseros hacen ruido", estado: "En reparación", d: 1, h: 3.5, mec: M[2], diag: "Zapatas gastadas al 90 % y tambor rayado; cliente aprobó el cambio.", reps: [["REP-1006", 1], ["REP-1010", 1]], prom: 0 },
    { vehId: "V8", km: 141200, falla: "Revisión general antes de viaje", estado: "Lista para entregar", d: 1, h: 2, mec: M[3], diag: "Cambio de aceite, filtros, bombillos y escobillas.", reps: [["REP-1001", 2], ["REP-1002", 1], ["REP-1013", 2], ["REP-1015", 2]], prom: 0 },
    { vehId: "V5", km: 58200, falla: "Servicio de 5 000 km", servicio: true, estado: "En diagnóstico", d: 0, h: 0, mec: M[0], diag: "", reps: [], prom: -1 },
    { vehId: "V11", km: 176500, falla: "Luz de batería encendida", estado: "Recibida", d: 0, h: 0, mec: null, diag: "", reps: [], prom: -1 }
  ];
  abiertas.forEach(c => {
    const ot = nuevaOT({ vehId: c.vehId, km: c.km, falla: c.falla, servicio: !!c.servicio, recibida: dia(c.d, 7, 40), mecanico: c.mec, horas: c.h, diagnostico: c.diag, promesa: c.prom < 0 ? null : dia(-c.prom, 16, 0),
      checklist: ["Nivel de combustible: ½", "Rayón en puerta derecha", "Herramienta y gata"].slice(0, ri(1, 3)) });
    ot.bitacora.push({ estado: "Recibida", fecha: ot.recibida, por: "Recepción del taller", nota: c.km + " km" });
    c.reps.forEach(r => asignarRepuesto(ot, r[0], r[1]));
    if (c.estado !== "Recibida") paso(ot, c.estado, dia(c.d, 9, 0), c.mec || "Recepción del taller", c.diag);
    /* el retén no había en bodega: se pidió al proveedor y la orden espera a que Bodega lo reciba */
    if (c.vehId === "V1") {
      asignarRepuesto(ot, "REP-1016", 1);
      const oc = D.crearOC(PROV.id, BODEGA, [{ a: art("REP-1016").id, c: 2, v: 0 }, { a: art("REP-1006").id, c: 4, v: 0 }], "Aprobada", dia(2, 10, 20));
      ot.oc = oc.cons;
    }
  });

  /* ── reparación de herramientas (TAL-003) ───────────────────── */
  const ESTADOS_HR = ["Recibida", "En diagnóstico", "Presupuesto enviado", "Aprobada", "En reparación", "Lista para retirar", "Entregada"];
  const HERRAMIENTAS = [];
  let hrSeq = 540;
  const ventaDe = (cliId, famId) => D.documentos.find(d => d.clienteId === cliId && d.tipo !== "NC" && d.lineas.some(l => (D.artById[l.artId] || {}).fam === famId));
  [
    { cli: "C2", eq: "Taladro percutor ½\"", marca: "DeWalt", serie: "DW-5521-0934", falla: "No enciende", est: "Lista para retirar", d: 5, tec: 0, diag: "Carbones gastados e interruptor quemado.", reps: [["REP-2001", 1], ["REP-2002", 1]], horas: 1 },
    { cli: "C9", eq: "Esmeriladora angular 4½\"", marca: "Makita", serie: "GA4530-77812", falla: "Hace chispa y pierde fuerza", est: "Presupuesto enviado", d: 2, tec: 1, diag: "Inducido en corto; conviene cambiarlo. Presupuesto enviado por WhatsApp.", reps: [["REP-2006", 1], ["REP-2001", 1]], horas: 1.5 },
    { cli: "C3", eq: "Sierra circular 7¼\"", marca: "Black+Decker", serie: "CS1024-55310", falla: "La sierra no enciende; tiene 3 meses de uso", est: "En reparación", d: 1, tec: 0, diag: "Falla de fábrica en el interruptor. En garantía: se repara sin costo y se reclama al proveedor.", reps: [["REP-2002", 1], ["REP-2007", 1]], horas: 1, garantia: true },
    { cli: "C11", eq: "Rotomartillo SDS plus", marca: "Bosch", serie: "GBH2-24D-1182", falla: "Golpea pero no gira", est: "En diagnóstico", d: 0, tec: 1, diag: "", reps: [], horas: 0 },
    { cli: "C6", eq: "Taladro inalámbrico 20 V", marca: "DeWalt", serie: "DCD771-30219", falla: "No carga la batería", est: "Recibida", d: 0, tec: null, diag: "", reps: [], horas: 0 },
    { cli: "C12", eq: "Motosierra 18\"", marca: "Stihl", serie: "MS250-44109", falla: "Cadena floja y ruido en el piñón", est: "Entregada", d: 8, tec: 1, diag: "Cambio de rodamientos y ajuste.", reps: [["REP-2004", 2], ["REP-2005", 1]], horas: 1.5, pagado: true }
  ].forEach(h => {
    hrSeq++;
    const o = {
      id: "RH-" + hrSeq, tipo: "Herramienta", clienteId: h.cli, equipo: h.eq, marca: h.marca, serie: h.serie, falla: h.falla,
      recibida: dia(h.d, 9, 15), tecnico: h.tec == null ? null : TECNICOS[h.tec] || MECANICOS[h.tec], diagnostico: h.diag, estado: "Recibida",
      repuestos: [], horas: h.horas, garantia: !!h.garantia, bitacora: [{ estado: "Recibida", fecha: dia(h.d, 9, 15), por: "Recepción del taller", nota: "Boleta firmada por el cliente" }],
      accesorios: ["Estuche", "Batería", "Cargador", "Disco"].slice(0, ri(0, 2))
    };
    if (o.garantia) { const v = ventaDe(h.cli, "HER"); o.factura = v ? v.cons : null; }
    h.reps.forEach(r => asignarRepuesto(o, r[0], r[1]));
    if (h.est !== "Recibida") paso(o, h.est === "Entregada" ? "Lista para retirar" : h.est, dia(h.d, 11, 0), o.tecnico || "Recepción del taller", h.diag);
    HERRAMIENTAS.unshift(o);
    /* la que ya se entregó se cobró de contado en su momento: queda como antecedente, sin comprobante en esta demo */
    if (h.est === "Entregada") {
      o.repuestos.forEach(x => { const e = D.stock(x.artId, BODEGA); if (e) e.comp = Math.max(0, e.comp - x.cant); });
      paso(o, "Entregada", dia(h.d - 1, 10, 0), "Recepción del taller", "Retiró el cliente · pagado en caja");
      o.historico = true;
    }
  });

  w.TAL = {
    BODEGA, REPUESTOS: repuestos, MO_AUTO, MO_HERR, DIAG, MECANICOS, TECNICOS, COSTO_HORA,
    VEHICULOS, vehById, ESTADOS_OT, ORDENES, ESTADOS_HR, HERRAMIENTAS,
    PROV, nuevaOT, asignarRepuesto, paso, cerrarFlota, siguienteOT: () => "OT-" + (otSeq + 1), nuevaHR: () => "RH-" + (++hrSeq)
  };
})(window);
