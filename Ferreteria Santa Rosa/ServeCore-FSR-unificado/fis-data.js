/* ═══════════════════════════════════════════════════════════════════
   ServeCore — motor fiscal simulado
   Comprobantes electrónicos versión 4.4 (resolución MH-DGT-RES-0027-2024,
   obligatoria desde el 1 de setiembre de 2025) sobre TRIBU-CR, que
   sustituyó a ATV el 6 de octubre de 2025.
   Las cifras son de ejemplo; las reglas y los plazos no.
   ═══════════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB;

  let _s = 20260917;
  const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const chance = p => rnd() < p;
  const pad = (n, l) => String(n).padStart(l, "0");
  const r0 = n => Math.round(n);
  const HOY = D.HOY;
  const dayAgo = n => new Date(HOY.getTime() - n * 86400000);

  /* ═══ 1 · MARCO NORMATIVO ══════════════════════════════════════════ */
  const NORMA = {
    version: "4.4",
    resolucion: "MH-DGT-RES-0027-2024",
    obligatoria: "1 de setiembre de 2025",
    plataforma: "TRIBU-CR",
    plataformaDesde: "6 de octubre de 2025",
    cambios: 146
  };

  /* Códigos del anexo técnico. El del REP conviene verificarlo contra la
     última actualización del documento antes de programar el emisor. */
  const TIPOS = [
    { cod: "01", sig: "FE", t: "Factura electrónica", emite: true },
    { cod: "02", sig: "ND", t: "Nota de débito electrónica", emite: true },
    { cod: "03", sig: "NC", t: "Nota de crédito electrónica", emite: true },
    { cod: "04", sig: "TE", t: "Tiquete electrónico", emite: true },
    { cod: "05", sig: "MR-A", t: "Confirmación de aceptación", emite: false },
    { cod: "06", sig: "MR-P", t: "Confirmación de aceptación parcial", emite: false },
    { cod: "07", sig: "MR-R", t: "Confirmación de rechazo", emite: false },
    { cod: "08", sig: "FEC", t: "Factura electrónica de compra", emite: true },
    { cod: "09", sig: "FEE", t: "Factura electrónica de exportación", emite: false },
    { cod: "10", sig: "REP", t: "Recibo electrónico de pago", emite: true }
  ];
  const tipoDe = sig => TIPOS.find(t => t.sig === sig) || TIPOS[0];

  const SITUACIONES = [
    { cod: "1", t: "Normal", d: "Se emitió y se transmitió en el momento" },
    { cod: "2", t: "Contingencia", d: "Hacienda no respondió; se emitió provisional y se transmite al restablecerse" },
    { cod: "3", t: "Sin internet", d: "El local perdió el enlace; el nodo emitió y encoló" }
  ];

  /* el ejemplo se desarma de la última factura real, no de una clave escrita a mano */
  const muestra = D.documentos.find(d => d.tipo === "FE") || D.documentos[0];
  const corta = (s, partes) => { let i = 0; return partes.map(([n, t]) => [s.slice(i, i += n), n, t]); };
  const CLAVE_SEG = corta(muestra.clave, [
    [3, "Código de país"], [2, "Día de emisión"], [2, "Mes de emisión"], [2, "Año de emisión"],
    [12, "Cédula del emisor"], [20, "Numeración consecutiva"], [1, "Situación del comprobante"], [8, "Código de seguridad"]
  ]);
  const CONS_SEG = corta(muestra.cons.replace(/-/g, ""), [
    [3, "Casa matriz o sucursal"], [5, "Terminal o punto de venta"], [2, "Tipo de comprobante"],
    [10, "Consecutivo de la serie (sucursal + terminal + tipo), sin saltos"]
  ]);

  /* ═══ 2 · IMPUESTO AL VALOR AGREGADO ═══════════════════════════════ */
  const TARIFAS = [
    { p: 13, t: "Tarifa general", d: "La mayoría de los bienes y servicios — todo el catálogo de ferretería" },
    { p: 4, t: "Servicios de salud y boletos aéreos", d: "Salud privada, veterinaria y vuelos nacionales" },
    { p: 2, t: "Medicamentos, seguros y educación privada", d: "Medicamentos autorizados, primas de seguro" },
    { p: 1, t: "Canasta básica e insumos agropecuarios", d: "Alimentos de canasta básica, insumos y maquinaria agrícola" },
    { p: 0.5, t: "Pesca no deportiva y orgánicos certificados", d: "Tarifa reducida especial" },
    { p: 0, t: "Exportación y zona franca", d: "Tasa cero con derecho a crédito fiscal" }
  ];

  const PLAZOS = [
    { t: "Transmisión del comprobante", d: "Al momento de emitirlo. Hacienda responde de forma asíncrona.", dias: "inmediato" },
    { t: "Conversión de un provisional", d: "El comprobante de contingencia debe sustituirse por el electrónico definitivo.", dias: "2 días hábiles" },
    { t: "Mensaje de receptor", d: "Aceptación, aceptación parcial o rechazo de cada comprobante de proveedor. Vencido el plazo se pierde el crédito fiscal, sin recuperación retroactiva.", dias: "primeros 8 días hábiles del mes siguiente" },
    { t: "Recibo electrónico de pago", d: "Uno por cada abono de una venta a crédito con IVA diferido.", dias: "al recibir el pago" },
    { t: "Reclasificación del IVA diferido", d: "Si a los 90 días la factura sigue sin cobrarse, el IVA se declara igual.", dias: "90 días" },
    { t: "Declaración del IVA · formulario D-150", d: "Mensual en TRIBU-CR, prellenada con los comprobantes del período.", dias: "primeros 15 días naturales del mes siguiente" },
    { t: "Retención del archivo fiscal", d: "XML firmado y respuesta de Hacienda, en poder del contribuyente.", dias: "5 años" }
  ];

  /* ═══ 3 · ERRORES DE VALIDACIÓN ════════════════════════════════════ */
  const ERRORES = [
    { cod: "4001", t: "El IVA del encabezado no coincide con la suma de las líneas", causa: "Redondeo por línea contra redondeo del total", auto: true },
    { cod: "4012", t: "Código CABYS no vigente", causa: "El catálogo cambió y el artículo quedó con un código retirado", auto: true },
    { cod: "4027", t: "Actividad económica del receptor no registrada", causa: "El cliente jurídico no tiene actividad CIIU 4 en el padrón", auto: false },
    { cod: "4035", t: "Cédula del receptor no existe en el padrón", causa: "Digitación o cliente inscrito con otro tipo de identificación", auto: false },
    { cod: "4110", t: "Consecutivo duplicado", causa: "Dos terminales emitiendo con la misma serie", auto: false },
    { cod: "4120", t: "La nota de crédito referencia un comprobante inexistente", causa: "Clave mal copiada o comprobante nunca aceptado", auto: false },
    { cod: "5001", t: "Firma digital inválida", causa: "Llave criptográfica vencida o PIN cambiado sin actualizar el sistema", auto: false },
    { cod: "5010", t: "Sin respuesta del validador", causa: "Servicio de Hacienda caído — entra contingencia", auto: true }
  ];

  /* ═══ 4 · LLAVE CRIPTOGRÁFICA ══════════════════════════════════════ */
  const LLAVE = {
    emisor: D.emisor.nombre,
    cedula: D.emisor.cedula,
    ambiente: "Producción",
    archivo: D.emisor.cedula.replace(/\D/g, "").padStart(12, "0") + "0p.p12",
    emitida: new Date(2024, 1, 14),
    vence: new Date(2028, 1, 14),
    custodia: "AWS Secrets Manager · solo la nube firma",
    avisos: [90, 30, 7],
    pruebas: { ambiente: "Pruebas", vence: new Date(2027, 5, 30) }
  };
  LLAVE.faltan = Math.round((LLAVE.vence - HOY) / 86400000);

  /* ═══ 5 · CABYS Y EXONERACIONES ════════════════════════════════════ */
  const CABYS = [
    ["2394100000000", "Cemento hidráulico", 13, "Materiales de construcción"],
    ["4120100000100", "Varilla de acero corrugada", 13, "Varilla y perfilería"],
    ["4121000000000", "Lámina de zinc ondulada", 13, "Techos"],
    ["3630100000000", "Tubería de PVC para agua potable", 13, "Fontanería"],
    ["2431100000100", "Cinta de politetrafluoroetileno", 13, "Accesorios"],
    ["4631000000000", "Cable eléctrico de cobre", 13, "Eléctrico"],
    ["3510100000000", "Pintura látex para exteriores", 13, "Pinturas"],
    ["4291000000000", "Servicio de instalación y montaje", 13, "Servicios"],
    ["6491000000000", "Servicio de transporte de carga", 13, "Logística"],
    ["0111100000000", "Insumo agropecuario — fertilizante", 1, "Jardín y riego"],
    ["2129100000000", "Manguera de riego agrícola", 1, "Jardín y riego"],
    ["8511000000000", "Servicio de taller y reparación", 13, "Taller"]
  ].map(x => ({ cod: x[0], desc: x[1], tarifa: x[2], fam: x[3], vigente: true }));
  /* un código retirado, para que la pantalla tenga algo que resolver */
  CABYS.push({ cod: "2431100000000", desc: "Cinta selladora (código retirado)", tarifa: 13, fam: "Accesorios", vigente: false, sustituye: "2431100000100" });

  /* se leen de la ficha de cada cliente: la misma que aplica la caja */
  const exoneraciones = () => {
    const out = [];
    D.clientes.forEach(c => c.exoneraciones.forEach(x => out.push({
      cliId: c.id, nom: c.nom, ced: c.ced, tipo: x.tipo, autorizacion: x.numero,
      porc: Math.round(x.pct / 13 * 100), desde: x.emitida, hasta: x.vence
    })));
    return out;
  };

  /* ═══ 6 · COMPROBANTES EMITIDOS ════════════════════════════════════
     No se duplica la base: se pone una capa fiscal encima de los
     documentos que ya generó la caja.                                   */
  const capa = {};
  /* el estado ante Hacienda vive en el documento (doc.hacienda) y la situación
     en doc.situacion; la capa solo agrega el historial del envío. Así la caja,
     Ventas y Facturación nunca se contradicen, y lo que se emite en la sesión
     entra solo, la primera vez que Facturación lo mira. */
  function registrar(doc) {
    if (capa[doc.id]) return capa[doc.id];
    const enCola = doc.hacienda === "En cola";
    /* en contingencia o sin enlace el envío sale cuando vuelve el servicio */
    const espera = doc.situacion === "1" ? ri(2, 40) : ri(20, 120) * 60;
    const c = {
      err: null, intentos: doc.situacion === "1" ? 1 : ri(2, 4),
      enviado: enCola ? null : new Date(doc.fecha.getTime() + espera * 1000),
      respuesta: doc.hacienda === "Aceptado" ? new Date(doc.fecha.getTime() + (espera + ri(45, 900)) * 1000) : null,
      correo: true
    };
    Object.defineProperty(c, "estado", { enumerable: true, get: () => doc.hacienda, set: v => { doc.hacienda = v; } });
    Object.defineProperty(c, "sit", { enumerable: true, get: () => doc.situacion || "1" });
    return (capa[doc.id] = c);
  }
  D.documentos.forEach(doc => {
    const dias = Math.round((HOY - doc.fecha) / 86400000);
    const c = registrar(doc);
    c.correo = chance(0.93);
    if (doc.hacienda !== "Aceptado") return;
    if (dias === 0 && chance(0.10)) { c.estado = "En proceso"; c.respuesta = null; }
    else if (chance(0.035)) { c.estado = "Rechazado"; c.err = pick(ERRORES.filter(e => e.cod !== "5010")); c.intentos = ri(1, 3); }
  });

  const emitidos = () => D.documentos.map(doc => Object.assign({ doc }, registrar(doc)));
  const delDia = () => emitidos().filter(x => x.doc.fecha.toDateString() === HOY.toDateString());
  const cola = () => emitidos().filter(x => x.estado !== "Aceptado");

  /* ═══ 7 · RECIBO ELECTRÓNICO DE PAGO ═══════════════════════════════
     Uno por cada abono de una venta a crédito con IVA diferido; el IVA
     se declara en el mes del REP, y a los 90 días se declara igual.     */
  const reps = [];
  /* el REP sale de la misma serie que usa la caja: sucursal + terminal + tipo 10 */
  const consREP = (locId, term) => D.consecutivo("REP", locId, term || 1);
  const creditos = D.documentos.filter(d => d.condicion === "Crédito" && d.total > 0);
  /* el IVA que traslada un abono es la parte de IVA que tiene la factura,
     sea cual sea su tarifa o exoneración, no un 13/113 fijo */
  const ivaDe = (doc, monto) => (doc.total ? r0(monto * doc.iva / doc.total) : 0);
  /* los REP del histórico salen de lo que la cartera efectivamente cobró
     (total − saldo): uno por abono, entre la factura y hoy */
  creditos.forEach(doc => {
    const cobrado = doc.total - doc.saldo;
    if (cobrado <= 0) return;
    const partes = doc.saldo === 0 && cobrado > 20000 && chance(0.4) ? [r0(cobrado * 0.5), cobrado - r0(cobrado * 0.5)] : [cobrado];
    const lapso = HOY - doc.fecha;
    /* el cobro entra en horario de caja (8:00 a 17:00) y nunca después de la hora de la demo */
    const habil = f => { const x = new Date(f); x.setHours(8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0); return x > HOY ? new Date(HOY.getTime() - 60000) : x < doc.fecha ? new Date(doc.fecha.getTime() + 60000) : x; };
    const fechas = partes.map(() => habil(new Date(doc.fecha.getTime() + lapso * (0.15 + rnd() * 0.8)))).sort((a, b) => a - b);
    let acumulado = 0;
    partes.forEach((monto, i) => {
      acumulado += monto;
      reps.push({
        docCons: doc.cons, docClave: doc.clave, cliId: doc.clienteId, locId: doc.locId, term: doc.term || 1,
        fecha: fechas[i], monto, iva: ivaDe(doc, monto),
        medio: pick(["Transferencia", "SINPE móvil", "Cheque", "Efectivo"]),
        estado: chance(0.94) ? "Aceptado" : "En proceso",
        saldoAnterior: doc.total - acumulado + monto, saldoNuevo: doc.total - acumulado,
        parcial: acumulado < doc.total
      });
    });
  });
  /* facturas a crédito con saldo: se calcula en cada vista, así un cobro
     aplicado desde la caja o desde Facturación baja de inmediato */
  const diferidas = () => creditos.filter(doc => doc.saldo > 0).map(doc => {
    const dias = Math.round((HOY - doc.fecha) / 86400000);
    return {
      doc, dias, saldo: doc.saldo, cobrado: doc.total - doc.saldo,
      ivaDiferido: ivaDe(doc, doc.saldo),
      vencido: dias > 90, faltan: 90 - dias
    };
  }).sort((a, b) => b.dias - a.dias);
  /* se numeran en orden de fecha, como los habría emitido la caja */
  reps.sort((a, b) => a.fecha - b.fecha).forEach(r => {
    r.cons = consREP(r.locId, r.term); r.id = "REP-" + r.cons;
    r.situacion = "1"; r.clave = D.clave(r.cons, r.fecha, r.situacion);
    /* los cobros del histórico también se asientan (los de antes de setiembre van en la migración) */
    asentarCobro(r, D.documentos.find(x => x.cons === r.docCons));
  });
  reps.sort((a, b) => b.fecha - a.fecha);

  /* ═══ 8 · CONSECUTIVOS POR SUCURSAL Y TERMINAL ═════════════════════
     Se leen de las series reales y se recalculan en cada vista. Un salto
     es cualquier número asignado de la serie que no tiene comprobante. */
  const SERIES_VISTAS = ["FE", "TE", "NC", "ND", "REP"];
  const tramos = nums => {
    const out = [];
    nums.forEach(n => { const u = out[out.length - 1]; if (u && n === u[1] + 1) u[1] = n; else out.push([n, n]); });
    return out.map(([a, b]) => a === b ? String(a) : a + " a " + b).join(", ");
  };

  function consecutivos() {
    const hoy = HOY.toDateString();
    const porSerie = {};
    D.documentos.concat(reps).forEach(x => (porSerie[x.cons.slice(0, 12)] ||= []).push(x));
    const filas = [];
    D.locales.filter(l => l.tipo === "tienda").forEach(l => {
      for (let t = 1; t <= l.terminales; t++) {
        SERIES_VISTAS.forEach(sig => {
          const docs = porSerie[`${l.cod}-${pad(t, 5)}-${D.TIPO_COD[sig]}`] || [];
          const usados = new Set(docs.map(x => +x.cons.slice(-10)));
          const { desde, hasta } = D.rangoSerie(sig, l.id, t);
          const faltan = [];
          for (let n = desde; n <= hasta; n++) if (!usados.has(n)) faltan.push(n);
          const registrados = D.sinDocumento.filter(x => x.locId === l.id && x.term === t && x.tipo === sig).length;
          filas.push({
            locId: l.id, cod: l.cod, term: t, sig, tipoCod: tipoDe(sig).cod,
            ultimo: usados.size ? Math.max(...usados) : desde - 1,
            delDia: docs.filter(x => x.fecha.toDateString() === hoy).length,
            salto: faltan.length > 0,
            saltoDetalle: faltan.length ? "faltan " + tramos(faltan) +
              (registrados === faltan.length ? " · con registro de auditoría" : " · sin justificar") : undefined
          });
        });
      }
    });
    return filas;
  }

  /* ═══ 9 · COMPROBANTES RECIBIDOS ═══════════════════════════════════ */
  const recibidos = () => D.recibidos.map(r => Object.assign({}, r, {
    tipoCod: /crédito/.test(r.tipo) ? "03" : /Tiquete/.test(r.tipo) ? "04" : "01",
    creditoEnRiesgo: r.estado === "Sin aceptar" ? r.iva : 0
  }));

  /* ═══ 10 · IVA DEL PERÍODO ═════════════════════════════════════════ */
  function ivaMes() {
    const m = HOY.getMonth(), y = HOY.getFullYear();
    const delMes = D.documentos.filter(d => d.fecha.getMonth() === m && d.fecha.getFullYear() === y);
    /* la nota de crédito devuelve IVA: resta del débito del mes */
    const contado = delMes.filter(d => d.condicion !== "Crédito");
    const debitoVentas = contado.filter(d => d.tipo !== "NC").reduce((s, d) => s + d.iva, 0);
    const ivaNC = contado.filter(d => d.tipo === "NC").reduce((s, d) => s + d.iva, 0);
    const debitoContado = debitoVentas - ivaNC;
    const debitoREP = reps.filter(r => r.fecha.getMonth() === m && r.fecha.getFullYear() === y)
      .reduce((s, r) => s + r.iva, 0);
    const recib = recibidos();
    /* la nota de crédito de un proveedor devuelve crédito fiscal: resta */
    const creditoFiscal = recib.filter(r => /Aceptado/.test(r.estado)).reduce((s, r) => s + (/crédito/.test(r.tipo) ? -r.iva : r.iva), 0);
    const enRiesgo = recib.reduce((s, r) => s + r.creditoEnRiesgo, 0);
    const dif = diferidas();
    const diferidoPend = dif.filter(x => !x.vencido).reduce((s, x) => s + x.ivaDiferido, 0);
    const diferidoVencido = dif.filter(x => x.vencido).reduce((s, x) => s + x.ivaDiferido, 0);
    const debito = debitoContado + debitoREP + diferidoVencido;
    return {
      debitoContado, debitoVentas, ivaNC, debitoREP, diferidoVencido, diferidoPend,
      debito, creditoFiscal, enRiesgo,
      aPagar: Math.max(0, debito - creditoFiscal),
      saldoFavor: Math.max(0, creditoFiscal - debito),
      docs: delMes.length
    };
  }

  /* ═══ 11 · ACCIONES ════════════════════════════════════════════════ */
  function reintentar() {
    let n = 0;
    D.documentos.forEach(doc => {
      const c = registrar(doc);
      if (c.estado !== "Aceptado" && (!c.err || c.err.auto)) {
        c.estado = "Aceptado"; c.err = null; c.intentos++; c.enviado = c.enviado || D.ahora(); c.respuesta = D.ahora(); n++;
      }
    });
    reps.forEach(r => { if (r.estado !== "Aceptado") { r.estado = "Aceptado"; n++; } });
    return n;
  }
  /* al volver el enlace sale lo que la caja encoló: comprobantes y REP */
  function transmitirCola() {
    let n = 0;
    D.documentos.forEach(doc => {
      if (doc.hacienda !== "En cola") return;
      const c = registrar(doc);
      c.estado = "Aceptado"; c.enviado = D.ahora(); c.respuesta = D.ahora(); n++;
    });
    reps.forEach(r => { if (r.estado === "En cola") { r.estado = "Aceptado"; n++; } });
    return n;
  }
  function aceptarRecibidos() {
    let n = 0;
    D.recibidos.forEach(r => { if (r.estado === "Sin aceptar" && r.ocLigada) { D.aceptarRecibido(r, "Aceptado"); n++; } });
    return n;
  }
  /* asiento de un cobro: entra a caja si es efectivo y al banco lo demás; el
     IVA del abono pasa del diferido al IVA por pagar del mes del REP */
  function asentarCobro(rep, d) {
    rep.asiento = D.asentar(rep.fecha, rep.cons, `Cobro de ${d.cons} · REP`, [
      { cta: D.cuentaMedio(rep.medio), debe: rep.monto, haber: 0 },
      { cta: "1-01-03-001", debe: 0, haber: rep.monto },
      { cta: "2-01-02-002", debe: rep.iva, haber: 0 },
      { cta: "2-01-02-001", debe: 0, haber: rep.iva }
    ]).id;
  }
  /* cobro de una factura a crédito: la única vía, la usen la caja o Facturación.
     Valida, emite el REP desde la caja que cobra, baja la cartera y asienta.
     Devuelve { error } si no se puede aplicar. */
  function aplicarCobro(d, o) {
    const monto = Math.round(o.monto || 0);
    if (monto <= 0 || monto > d.saldo) return { error: "El abono debe estar entre ₡1 y el saldo de ₡" + d.saldo.toLocaleString("es-CR") + "." };
    if (!D.puedeEmitir(o.locId, o.term)) return { error: "El REP sale de una caja de tienda. Cambie de local o de terminal en la barra superior." };
    try { D.exigePeriodoAbierto(D.ahora()); } catch (e) { return { error: e.message }; }
    const fecha = D.ahora(), situacion = o.offline ? "3" : "1";
    const cons = consREP(o.locId, o.term);
    const rep = {
      id: "REP-" + cons, cons, clave: D.clave(cons, fecha, situacion), situacion, locId: o.locId, term: o.term || 1,
      docCons: d.cons, docClave: d.clave, cliId: d.clienteId,
      fecha, monto, iva: ivaDe(d, monto), medio: o.medio || "Transferencia",
      estado: o.offline ? "En cola" : "Aceptado",
      saldoAnterior: d.saldo, saldoNuevo: d.saldo - monto, parcial: monto < d.saldo
    };
    reps.unshift(rep);
    d.saldo -= monto;
    if (D.cliById[d.clienteId]) D.cliById[d.clienteId].saldo -= monto;
    asentarCobro(rep, d);
    return { rep };
  }

  /* ═══ 12 · CONFIGURACIÓN DEL EMISOR ════════════════════════════════ */
  /* es la misma ficha de D.emisor (lo que se edite en Sistema se ve aquí);
     solo se le agrega lo que se calcula */
  const EMISOR = D.emisor;
  EMISOR.proveedorSistema = "Smart Serve Solutions · 3-102-946797";
  Object.defineProperties(EMISOR, {
    sucursales: { get: () => D.locales.filter(l => l.tipo === "tienda").length },
    terminales: { get: () => D.locales.reduce((s, l) => s + (l.tipo === "tienda" ? l.terminales || 0 : 0), 0) }
  });

  w.FIS = {
    NORMA, TIPOS, tipoDe, SITUACIONES, CLAVE_SEG, CONS_SEG, TARIFAS, PLAZOS,
    ERRORES, LLAVE, CABYS, get EXONERACIONES() { return exoneraciones(); }, EMISOR,
    capa, registrar, emitidos, delDia, cola, reps, get diferidas() { return diferidas(); },
    get consecutivos() { return consecutivos(); }, recibidos, ivaMes,
    reintentar, transmitirCola, aceptarRecibidos, aplicarCobro, consREP
  };
})(window);
