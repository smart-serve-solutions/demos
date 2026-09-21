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

  const CLAVE_SEG = [
    ["506", 3, "Código de país"],
    ["17", 2, "Día de emisión"],
    ["09", 2, "Mes de emisión"],
    ["26", 2, "Año de emisión"],
    ["003102946797", 12, "Cédula del emisor"],
    ["00200001010000034812", 20, "Numeración consecutiva"],
    ["1", 1, "Situación del comprobante"],
    ["48201375", 8, "Código de seguridad"]
  ];
  const CONS_SEG = [
    ["002", 3, "Casa matriz o sucursal"],
    ["00001", 5, "Terminal o punto de venta"],
    ["01", 2, "Tipo de comprobante"],
    ["0000034812", 10, "Consecutivo del tipo, sin saltos"]
  ];

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
    emisor: "Ferretería Santa Rosa S.A.",
    cedula: "3-101-118844",
    ambiente: "Producción",
    archivo: "0031011188440p.p12",
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

  const EXONERACIONES = D.clientes.filter(c => c.exonerado).map((c, i) => ({
    cliId: c.id, nom: c.nom, ced: c.ced,
    tipo: pick(["Institución pública", "Autorización especial DGT", "Ley 7509 · ASADA"]),
    autorizacion: "EX-" + pad(ri(100000, 999999), 6),
    porc: pick([100, 100, 13]),
    desde: new Date(2025, ri(0, 11), ri(1, 28)),
    hasta: new Date(2027, ri(0, 11), ri(1, 28))
  }));

  /* ═══ 6 · COMPROBANTES EMITIDOS ════════════════════════════════════
     No se duplica la base: se pone una capa fiscal encima de los
     documentos que ya generó la caja.                                   */
  const capa = {};
  D.documentos.forEach(doc => {
    const dias = Math.round((HOY - doc.fecha) / 86400000);
    let estado = "Aceptado", err = null, sit = "1", intentos = 1;
    if (dias === 0 && chance(0.10)) { estado = "En proceso"; intentos = 1; }
    else if (chance(0.035)) { estado = "Rechazado"; err = pick(ERRORES.filter(e => e.cod !== "5010")); intentos = ri(1, 3); }
    else if (chance(0.03)) { estado = "Aceptado"; sit = "2"; intentos = ri(2, 4); }
    capa[doc.id] = {
      estado, err, sit, intentos,
      enviado: new Date(doc.fecha.getTime() + ri(2, 40) * 1000),
      respuesta: estado === "En proceso" ? null : new Date(doc.fecha.getTime() + ri(45, 900) * 1000),
      correo: chance(0.93)
    };
  });

  const emitidos = () => D.documentos.map(doc => Object.assign({ doc }, capa[doc.id] || {}));
  const delDia = () => emitidos().filter(x => x.doc.fecha.toDateString() === HOY.toDateString());
  const cola = () => emitidos().filter(x => x.estado !== "Aceptado");

  /* ═══ 7 · RECIBO ELECTRÓNICO DE PAGO ═══════════════════════════════
     Uno por cada abono de una venta a crédito con IVA diferido; el IVA
     se declara en el mes del REP, y a los 90 días se declara igual.     */
  const reps = [];
  let repSeq = 4180;
  const consREP = (locId, term, n) => {
    const l = D.locales.find(x => x.id === locId) || D.locales[0];
    return `${l.cod}-${pad(term, 5)}-10-${pad(n, 10)}`;
  };
  const creditos = D.documentos.filter(d => d.condicion === "Crédito" && d.total > 0);
  const diferidas = [];
  creditos.forEach(doc => {
    const dias = Math.round((HOY - doc.fecha) / 86400000);
    const abonos = doc.saldo <= 0 ? ri(1, 2) : chance(0.45) ? 1 : 0;
    let cobrado = 0;
    for (let i = 0; i < abonos; i++) {
      const monto = doc.saldo <= 0 && i === abonos - 1 ? doc.total - cobrado : r0(doc.total * (0.3 + rnd() * 0.4));
      if (monto <= 0) continue;
      cobrado += monto;
      const f = new Date(doc.fecha.getTime() + ri(5, Math.max(6, dias)) * 86400000);
      reps.push({
        id: "REP-" + (++repSeq), cons: consREP(doc.locId, doc.term || 1, repSeq),
        docCons: doc.cons, docClave: doc.clave, cliId: doc.clienteId, locId: doc.locId,
        fecha: f > HOY ? HOY : f, monto,
        iva: r0(monto * 0.13 / 1.13),
        medio: pick(["Transferencia", "SINPE móvil", "Cheque", "Efectivo"]),
        estado: chance(0.94) ? "Aceptado" : "En proceso",
        parcial: cobrado < doc.total
      });
    }
    if (doc.saldo > 0) {
      diferidas.push({
        doc, dias, saldo: doc.saldo, cobrado,
        ivaDiferido: r0(doc.saldo * 0.13 / 1.13),
        vencido: dias > 90, faltan: 90 - dias
      });
    }
  });
  reps.sort((a, b) => b.fecha - a.fecha);
  diferidas.sort((a, b) => b.dias - a.dias);

  /* ═══ 8 · CONSECUTIVOS POR SUCURSAL Y TERMINAL ═════════════════════ */
  const consecutivos = [];
  D.locales.filter(l => l.tipo === "tienda").forEach(l => {
    for (let t = 1; t <= l.terminales; t++) {
      ["FE", "TE", "NC", "ND", "REP"].forEach(sig => {
        const emitidosAqui = D.documentos.filter(d => d.locId === l.id && (d.term || 1) === t && d.tipo === sig).length;
        const base = { FE: 34800, TE: 12400, NC: 2110, ND: 340, REP: 4180 }[sig];
        consecutivos.push({
          locId: l.id, cod: l.cod, term: t, sig, tipoCod: tipoDe(sig).cod,
          ultimo: base + emitidosAqui * (t + 1) + ri(0, 40),
          delDia: sig === "FE" ? ri(8, 60) : sig === "TE" ? ri(4, 30) : ri(0, 3),
          salto: false
        });
      });
    }
  });
  /* un salto detectado, que es justamente lo que hay que poder ver */
  const conSalto = consecutivos.find(x => x.sig === "TE" && x.term === 2);
  if (conSalto) { conSalto.salto = true; conSalto.saltoDetalle = "faltan los números " + (conSalto.ultimo - 3) + " a " + (conSalto.ultimo - 1); }

  /* ═══ 9 · COMPROBANTES RECIBIDOS ═══════════════════════════════════ */
  const recibidos = () => D.recibidos.map(r => Object.assign({}, r, {
    tipoCod: /crédito/.test(r.tipo) ? "03" : /Tiquete/.test(r.tipo) ? "04" : "01",
    creditoEnRiesgo: r.estado === "Sin aceptar" ? r.iva : 0
  }));

  /* ═══ 10 · IVA DEL PERÍODO ═════════════════════════════════════════ */
  function ivaMes() {
    const m = HOY.getMonth(), y = HOY.getFullYear();
    const delMes = D.documentos.filter(d => d.fecha.getMonth() === m && d.fecha.getFullYear() === y);
    const contado = delMes.filter(d => d.condicion !== "Crédito");
    const debitoContado = contado.reduce((s, d) => s + d.iva, 0);
    const debitoREP = reps.filter(r => r.fecha.getMonth() === m && r.fecha.getFullYear() === y)
      .reduce((s, r) => s + r.iva, 0);
    const recib = recibidos();
    const creditoFiscal = recib.filter(r => /Aceptado/.test(r.estado)).reduce((s, r) => s + r.iva, 0);
    const enRiesgo = recib.reduce((s, r) => s + r.creditoEnRiesgo, 0);
    const diferidoPend = diferidas.filter(x => !x.vencido).reduce((s, x) => s + x.ivaDiferido, 0);
    const diferidoVencido = diferidas.filter(x => x.vencido).reduce((s, x) => s + x.ivaDiferido, 0);
    const debito = debitoContado + debitoREP + diferidoVencido;
    return {
      debitoContado, debitoREP, diferidoVencido, diferidoPend,
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
      const c = capa[doc.id];
      if (c && c.estado !== "Aceptado" && (!c.err || c.err.auto)) {
        c.estado = "Aceptado"; c.err = null; c.intentos++; c.respuesta = HOY; n++;
      }
    });
    return n;
  }
  function aceptarRecibidos() {
    let n = 0;
    D.recibidos.forEach(r => { if (r.estado === "Sin aceptar" && r.ocLigada) { r.estado = "Aceptado"; n++; } });
    return n;
  }
  function emitirREP(d) {
    repSeq++;
    const rep = {
      id: "REP-" + repSeq, cons: consREP(d.locId || "L1", 1, repSeq),
      docCons: d.cons, docClave: d.clave, cliId: d.clienteId, locId: d.locId,
      fecha: HOY, monto: d.saldo, iva: r0(d.saldo * 0.13 / 1.13),
      medio: "Transferencia", estado: "En proceso", parcial: false
    };
    reps.unshift(rep);
    return rep;
  }

  /* ═══ 12 · CONFIGURACIÓN DEL EMISOR ════════════════════════════════ */
  const EMISOR = {
    nombre: "Ferretería Santa Rosa S.A.",
    comercial: "Ferretería Santa Rosa",
    cedula: "3-101-118844",
    tipoCed: "Jurídica",
    actividades: [
      { cod: "471100", t: "Venta al por menor en comercios no especializados", principal: false },
      { cod: "475200", t: "Venta al por menor de artículos de ferretería, pinturas y vidrio", principal: true },
      { cod: "466300", t: "Venta al por mayor de materiales de construcción", principal: false },
      { cod: "433000", t: "Terminación y acabado de edificios", principal: false }
    ],
    correos: ["facturacion@ferreteriasantarosa.cr", "contabilidad@ferreteriasantarosa.cr"],
    proveedorSistema: "Smart Serve Solutions · 3-102-946797",
    sucursales: D.locales.filter(l => l.tipo === "tienda").length,
    terminales: D.locales.reduce((s, l) => s + (l.terminales || 0), 0)
  };

  w.FIS = {
    NORMA, TIPOS, tipoDe, SITUACIONES, CLAVE_SEG, CONS_SEG, TARIFAS, PLAZOS,
    ERRORES, LLAVE, CABYS, EXONERACIONES, EMISOR,
    capa, emitidos, delDia, cola, reps, diferidas, consecutivos, recibidos, ivaMes,
    reintentar, aceptarRecibidos, emitirREP, consREP
  };
})(window);
