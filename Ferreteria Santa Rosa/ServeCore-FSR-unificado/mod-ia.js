/* ═══════════════════════════════════════════════════════════════
   Integraciones e IA — el agente de WhatsApp y el panel de integraciones.
   (Las preguntas en lenguaje natural y los reportes pasaron a mod-bi.js.)
   El agente trabaja con el sistema real: cotiza con el inventario y los
   precios, crea pedidos, aparta mercadería y aplica pagos con su REP y su
   asiento. Lo que no le toca decidir lo escala a una persona.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI, F = w.FIS, V = w.VENX;
  const { $, $$, esc, norm, grp, c, dec, fecha, fh, hora, icon, tag, card, stat, table,
    openSheet, closeSheet, toast, locNom, cliNom, ini } = U;

  /* ══ REGLAS DEL AGENTE ═══════════════════════════════════════
     Lo que el agente resuelve solo y lo que pasa a una persona. */
  const REGLAS = {
    montoEscala: 3200000,          /* pedidos más grandes: proveeduría confirma precio y transporte */
    pagoSolo: 500000,              /* pagos hasta este monto se aplican solos; más, los valida contabilidad */
    vence: "6:00 p.m."             /* las reservas vencen el mismo día */
  };
  const PERSONA = {
    proveeduria: "Óscar Jiménez (Jefe de proveeduría)",
    contabilidad: "Sonia Calderón (Contabilidad)",
    piso: "Marta Rojas (Jefatura de piso)"
  };
  const RESERVAS = [];
  const pad = (n, l) => String(n).padStart(l, "0");

  /* ── entender el mensaje ─────────────────────────────────── */
  const raiz = t => t.replace(/(es|s)$/, "");
  /* el artículo que mejor calza con el texto (singular o plural). Las palabras de la
     descripción pesan más que la familia o la marca; los nombres de
     los locales no cuentan («en Turrialba» no es un artículo) y «#4» sí cuenta */
  const LUGARES = D.locales.map(l => norm(l.nom)).join(" ").split(" ");
  function buscarArt(texto) {
    const tok = norm(texto).split(/[^a-z0-9#½]+/).filter(x => (x.length > 2 || /[#\d]/.test(x)) && LUGARES.indexOf(x) < 0 &&
      !/^(de|del|los|las|una|uno|con|para|por|que|me|tienen|hay|precio|cuanto|vale|rollos|sacos|unidades|necesito|cotizacion|entrega|lunes|mandeme|ocupo|quiero)$/.test(x));
    if (!tok.length) return [];
    return D.articulos.filter(a => a.tipo === "Producto").map(a => {
      const d = norm(a.desc), o = norm(a.sub + " " + a.marca);
      const pts = tok.reduce((s, x) => s + (d.includes(x) ? 3 : d.includes(raiz(x)) ? 2 : o.includes(x) || o.includes(raiz(x)) ? 1 : 0), 0);
      return { a, pts };
    }).filter(x => x.pts > 1).sort((x, y) => y.pts - x.pts).map(x => x.a);
  }
  /* «6 rollos de manguera de 15m y 20 aspersores» → [{art, cant}] */
  function leerLineas(texto) {
    return texto.split(/,|;|\s+y\s+|\s+e\s+|\+/i).map(p => {
      const m = p.match(/(\d+(?:[.,]\d+)?)\s*(?!m\b|mm\b|cm\b|kg\b|")/);
      if (!m) return null;
      const arts = buscarArt(p.replace(m[0], " "));
      return arts.length ? { a: arts[0], cant: +m[1].replace(",", ".") } : null;
    }).filter(Boolean);
  }
  const leerRef = t => (t.match(/\b\d{8,}\b/) || [])[0] || null;
  /* un monto se reconoce por el signo de colones, la palabra «colones» o el separador de
     miles; un número suelto (el de una factura, por ejemplo) no es un monto */
  function leerMonto(t) {
    const s = t.replace(leerRef(t) || "~", " ").replace(/factura\s*[\d-]+/gi, " ");
    const nums = (s.match(/₡\s*\d[\d .]*\d|\d{1,3}(?:[ .]\d{3})+|\d{4,7}(?=\s*colones)/g) || []).map(x => +x.replace(/\D/g, ""));
    return nums.length ? Math.max(...nums) : 0;
  }
  const leerCedula = t => (t.match(/\b\d-\d{3,4}-\d{3,6}\b/) || [])[0] || null;
  const localEn = t => D.tiendas.find(l => norm(t).includes(norm(l.nom)));
  const localDe = cli => (cli && D.tiendas.find(l => norm(l.nom) === norm(cli.dir))) || D.tiendas[0];
  const facturasAbiertas = cli => D.documentos.filter(d => d.clienteId === cli.id && d.saldo > 0 && d.tipo !== "NC").sort((a, b) => a.fecha - b.fecha);
  const dispo = a => D.tiendas.concat(D.locales.filter(l => l.tipo !== "tienda")).map(l => ({ l, d: D.disp(a.id, l.id) })).filter(x => x.d > 0).sort((x, y) => y.d - x.d);

  /* ── lo que el agente hace ────────────────────────────────── */
  function escalar(th, a, motivo, out) {
    th.estado = "Escalado a persona";
    th.escalado = { a, motivo, desde: D.ahora() };
    out.push({ de: "sys", t: "Escalado a " + a + " · " + motivo });
  }
  function crearPedido(th, p) {
    const cli = D.cliById[th.clienteId];
    D.seq.PROF++;
    const lineas = p.lineas.map(x => ({ artId: x.a.id, cant: x.cant, precio: x.a.precio, desc: 0 }));
    const ped = Object.assign({
      id: "PF-" + D.seq.PROF, cons: "PROF-" + pad(D.seq.PROF, 6), tipo: "Pedido", fecha: D.ahora(), clienteId: cli.id,
      locId: localDe(cli).id, lineas, vence: new Date(D.ahora().getTime() + 7 * 86400000), estado: "Vigente",
      origen: "WhatsApp", vendedor: "Agente de WhatsApp", creadoPor: "Agente", conversacion: th.id,
      estadoPed: p.modo === "credito" ? "Listo para facturar" : "Esperando pago", condicion: p.modo === "credito" ? "Crédito" : "Contado"
    }, D.totalizar(lineas, { exoneracion: D.exoneracionDe(cli.id) }));
    D.proformas.unshift(ped);
    if (V) { V.prep(ped); if (p.modo !== "credito") V.enviarLink(ped, "WhatsApp"); }
    return ped;
  }
  /* aplica un pago: primero a un pedido que espera ese monto, si no a las facturas más viejas */
  function aplicarPago(th, monto, medio, ref, out) {
    const cli = D.cliById[th.clienteId];
    const ped = D.proformas.find(p => p.clienteId === cli.id && p.estadoPed === "Esperando pago" && Math.abs(p.total - monto) <= 1);
    if (ped) {
      V.confirmarPago(ped);
      th.pagos = (th.pagos || 0) + monto;
      out.push({ de: "bot", t: `Recibido: ${c(monto)} por ${medio.toLowerCase()}${ref ? ", referencia " + ref : ""}. Corresponde al pedido ${ped.cons}; quedó pagado y pasa a facturar.` });
      return true;
    }
    const docs = facturasAbiertas(cli), debe = docs.reduce((s, d) => s + d.saldo, 0);
    if (!docs.length) { escalar(th, PERSONA.contabilidad, "pago de " + c(monto) + " sin facturas abiertas", out); out.splice(out.length - 1, 0, { de: "bot", t: "Recibí el comprobante, pero no tiene facturas pendientes con nosotros. Lo reviso con contabilidad para dejarlo como saldo a favor." }); return false; }
    if (monto > debe) { out.push({ de: "bot", t: `El monto (${c(monto)}) pasa lo que debe (${c(debe)}). Para no aplicarlo mal, lo reviso con contabilidad.` }); escalar(th, PERSONA.contabilidad, "pago mayor que la deuda", out); return false; }
    if (monto > REGLAS.pagoSolo) { out.push({ de: "bot", t: `Recibí ${c(monto)}${ref ? ", referencia " + ref : ""}. Por el monto, contabilidad lo valida antes de aplicarlo; le aviso apenas quede.` }); escalar(th, PERSONA.contabilidad, "validar pago de " + c(monto), out); return false; }
    let resto = monto;
    const reps = [];
    docs.forEach(d => {
      if (!resto) return;
      const m = Math.min(resto, d.saldo);
      const r = F.aplicarCobro(d, { monto: m, medio, locId: "L1", term: 1 });
      if (r.error) return;
      r.rep.canal = "WhatsApp"; r.rep.ref = ref;
      reps.push({ d, rep: r.rep, m }); resto -= m;
    });
    th.pagos = (th.pagos || 0) + (monto - resto);
    out.push({ de: "bot", t: `Recibido: ${c(monto)} por ${medio.toLowerCase()}${ref ? ", referencia " + ref : ""}. ` +
      reps.map(x => `Lo apliqué a la factura ${x.d.cons}${x.d.saldo ? " (queda un saldo de " + c(x.d.saldo) + ")" : ""}`).join("; ") +
      `. Le envío al correo el recibo electrónico de pago ${reps.map(x => x.rep.cons).join(", ")}.` });
    out.push({ de: "sys", t: "Aplicado por el agente · regla: pagos hasta " + c(REGLAS.pagoSolo) + " con comprobante legible se aplican solos" });
    return true;
  }

  /* ── la respuesta ─────────────────────────────────────────── */
  function contestar(th, q) {
    const out = [];
    const n = norm(q);
    const cli = th.clienteId ? D.cliById[th.clienteId] : null;
    const si = /^(si|sí|dale|ok|listo|de acuerdo|por favor|claro|hagale|hágale)\b/.test(n) || /\bsi por favor\b/.test(n);

    /* una respuesta a lo que el agente preguntó */
    if (th.pend && (si || /^no\b/.test(n))) {
      const p = th.pend; th.pend = null;
      if (/^no\b/.test(n)) { out.push({ de: "bot", t: "Entendido, no lo proceso. Si necesita algo más, aquí estoy." }); return out; }
      if (p.tipo === "pedido") {
        const ped = crearPedido(th, p);
        th.estado = "Pedido creado"; th.pedidos = (th.pedidos || []).concat(ped.cons);
        const ruta = /ruta|entreg|envi/.test(n) || p.entrega;
        out.push({ de: "bot", t: `Listo. Pedido ${ped.cons} por ${c(ped.total)} ` + (p.modo === "credito"
          ? `cargado a crédito${ruta ? " y en la ruta a " + localDe(cli).nom + (ped.flete && ped.flete.monto ? " (flete " + c(ped.flete.monto) + ")" : "") : ""}. Un vendedor lo factura y le aviso cuando salga.`
          : `creado. Le mandé el enlace de pago ${ped.link ? ped.link.codigo : ""}; en cuanto entre el pago se factura.`) });
      }
      return out;
    }

    /* un pago con su comprobante */
    if (/(sinpe|transferencia|transferi|deposit|pague|pagué|comprobante|ya pag)/.test(n)) {
      const monto = leerMonto(q), ref = leerRef(q);
      if (!cli) { out.push({ de: "bot", t: "Con gusto lo aplico. ¿Me indica la cédula a nombre de quien está la cuenta?" }); th.pend = null; return out; }
      if (!monto) { out.push({ de: "bot", t: "Recibido. ¿Me confirma el monto y el número de referencia del comprobante? Así lo aplico a la factura correcta." }); return out; }
      aplicarPago(th, monto, /sinpe/.test(n) ? "SINPE móvil" : "Transferencia", ref, out);
      return out;
    }

    /* identificarse con la cédula */
    const ced = leerCedula(q);
    if (!cli && ced) {
      const k = D.clientes.find(x => x.ced === ced);
      if (!k) { out.push({ de: "bot", t: "No encuentro esa cédula entre nuestros clientes. Le paso con un vendedor para abrirle la cuenta." }); escalar(th, PERSONA.piso, "cliente nuevo", out); return out; }
      th.clienteId = k.id; th.nom = k.nom;
      out.push({ de: "bot", t: `Gracias, ${k.nom.replace(/\.$/, "")}. Ya tengo su cuenta${k.limite ? ` con crédito a ${k.plazo} días` : ""}. ¿En qué le ayudo?` });
      return out;
    }

    if (/(debo|deuda|saldo|estado de cuenta)/.test(n)) {
      if (!cli) { out.push({ de: "bot", t: "Con gusto. ¿Me indica la cédula a nombre de quien está la cuenta?" }); return out; }
      const docs = facturasAbiertas(cli);
      if (!docs.length) { out.push({ de: "bot", t: "No tiene saldo pendiente con nosotros. Su última compra quedó al día." }); return out; }
      out.push({ de: "bot", t: `Su saldo es de ${c(docs.reduce((s, d) => s + d.saldo, 0))} en ${docs.length} factura(s). La más antigua es la ${docs[0].cons}, del ${fecha(docs[0].fecha)}. Puede pagar por SINPE al 8712-0000 o por transferencia; si me manda el comprobante lo aplico de una vez.` });
      return out;
    }
    if (/(reclamo|queja|malo|mala|defect|no sirve|devolv|devolu|garantia)/.test(n)) {
      out.push({ de: "bot", t: "Lamento el inconveniente. Le paso con la jefatura de piso para resolverlo con usted." });
      escalar(th, PERSONA.piso, "reclamo o devolución", out);
      return out;
    }
    if (/(precio|descuento|rebaja|mejor precio)/.test(n) && /\d/.test(n) && !leerLineas(q).length) {
      out.push({ de: "bot", t: "Por volumen puede aplicar un descuento, pero el precio lo confirma una persona para no pasar el margen mínimo de la familia. Ya le paso con la jefatura de piso." });
      escalar(th, PERSONA.piso, "precio por volumen", out);
      return out;
    }
    if (/(factura|xml|pdf)/.test(n) && !/(pag|transfer)/.test(n)) { out.push({ de: "bot", t: "Le reenvío al correo el XML y el PDF de sus últimos comprobantes. Si necesita uno específico, dígame el número y se lo mando." }); return out; }
    if (/(horario|abren|cierran)/.test(n)) { out.push({ de: "bot", t: "Abrimos de lunes a viernes de 7:00 a.m. a 5:30 p.m., sábados de 7:00 a.m. a 4:00 p.m. y domingos de 8:00 a.m. a 12:00 m.d. en Santa Rosa y Turrialba." }); return out; }
    if (/(corte|duplicado de llave|instalacion|mano de obra|taller)/.test(n)) {
      const s = D.articulos.filter(a => a.tipo === "Servicio" && a.precio);
      out.push({ de: "bot", t: `Sí, en el taller hacemos ${s.slice(0, 3).map(x => x.desc.toLowerCase() + " a " + c(x.precio)).join(", ")}. ¿Se lo agendo para hoy?` });
      return out;
    }

    /* apartar mercadería */
    const lineas = leerLineas(q);
    if (/(apart|reserv)/.test(n) && (lineas.length || th.ultimoArt)) {
      if (!cli) { out.push({ de: "bot", t: "Con gusto se lo aparto. ¿Me indica la cédula a nombre de quien lo dejo?" }); return out; }
      const x = lineas[0] || { a: th.ultimoArt, cant: +(n.match(/\d+/) || [1])[0] };
      const l = localEn(q) || localDe(cli), e = D.stock(x.a.id, l.id), dsp = D.disp(x.a.id, l.id);
      if (!e || dsp < x.cant) { out.push({ de: "bot", t: `En ${l.nom} solo hay ${Math.max(0, dsp)} disponibles de ${x.a.desc}. ¿Le aparto esas o se las bajamos del CEDI para mañana?` }); return out; }
      e.comp += x.cant;
      const rs = { id: "RS-" + pad(418 + RESERVAS.length, 5), artId: x.a.id, locId: l.id, cant: x.cant, clienteId: cli.id, fecha: D.ahora(), conversacion: th.id };
      RESERVAS.push(rs);
      out.push({ de: "bot", t: `Listo. Aparté ${x.cant} × ${x.a.desc} en ${l.nom} a nombre suyo, reserva ${rs.id}, vence hoy a las ${REGLAS.vence} Total ${c(x.cant * x.a.precio)}.`, arts: [{ id: x.a.id, cant: x.cant }] });
      out.push({ de: "bot", t: "¿Se lo dejo como pedido para pasar a caja, o le genero el enlace de pago SINPE?" });
      return out;
    }

    /* un pedido o una cotización con cantidades */
    if (lineas.length && /(mand|ocup|necesit|quier|pedido|envi|cotiz|traiga|deme|me da|alist)/.test(n)) {
      const lin = lineas.map(x => ({ artId: x.a.id, cant: x.cant, precio: x.a.precio, desc: 0 }));
      const t = D.totalizar(lin, cli ? { exoneracion: D.exoneracionDe(cli.id) } : {});
      out.push({ de: "bot", t: lineas.map(x => `${x.cant} × ${x.a.desc} a ${c(x.a.precio)}`).join(" · ") + `. Total ${c(t.total)} con IVA${t.ivaExon ? " (con su exoneración)" : ""}.`, arts: lineas.map(x => ({ id: x.a.id, cant: x.cant })) });
      const faltan = lineas.filter(x => dispo(x.a).reduce((s, y) => s + y.d, 0) < x.cant);
      out.push({ de: "bot", t: lineas.map(x => { const d = dispo(x.a); return x.a.desc.split(" ").slice(0, 3).join(" ") + ": " + (d.length ? d.slice(0, 2).map(y => y.l.nom + " " + grp(y.d)).join(" · ") : "sin existencia"); }).join(". ") + "." + (faltan.length ? " No alcanza para todo; un vendedor le confirma plazos." : " Alcanza.") });
      if (t.total > REGLAS.montoEscala || /cotiz/.test(n) && t.total > REGLAS.montoEscala / 2) {
        out.push({ de: "bot", t: `El monto pasa de ${c(REGLAS.montoEscala)}${cli && cli.categoria !== "Consumidor final" ? " y su categoría tiene precio negociado" : ""}. Le paso con proveeduría para confirmar el precio y el transporte.` });
        escalar(th, PERSONA.proveeduria, "pedido de " + c(t.total), out);
        return out;
      }
      if (!cli) { th.pend = null; out.push({ de: "bot", t: "Para dejarle el pedido necesito su cédula. ¿Me la indica?" }); return out; }
      const disp = cli.limite ? cli.limite - cli.saldo : 0;
      const bq = V ? V.bloqueo(cli.id) : null;
      const credito = cli.limite && disp >= t.total && !(bq && bq.k === "cr");
      th.pend = { tipo: "pedido", lineas, modo: credito ? "credito" : "link", entrega: /(ruta|entreg|envi|mand)/.test(n) };
      const porque = !cli.limite ? "" : bq && bq.k === "cr" ? (bq.t === "Límite excedido" ? "Su cuenta pasa el límite de crédito. " : "Su crédito está bloqueado por facturas vencidas. ") : "Esta compra pasa su crédito disponible (" + c(Math.max(0, Math.round(disp))) + "). ";
      out.push({ de: "bot", t: credito ? `Su cuenta tiene crédito a ${cli.plazo} días con ${c(Math.round(disp))} disponibles. ¿Lo cargo a crédito?`
        : porque + "¿Le genero el enlace de pago para dejar el pedido listo?" });
      return out;
    }

    /* precio y existencia */
    const arts = lineas.length ? lineas.map(x => x.a) : buscarArt(q);
    if (arts.length) {
      const a = arts[0]; th.ultimoArt = a;
      const d = dispo(a).filter(x => x.l.tipo === "tienda"), agot = D.tiendas.filter(l => D.disp(a.id, l.id) <= 0);
      out.push({ de: "bot", t: `${a.desc}, código ${a.cod}, a ${c(a.precio)} con IVA incluido.` + (arts.length > 1 ? ` También tengo ${arts.slice(1, 3).map(x => x.desc + " a " + c(x.precio)).join(" y ")}.` : ""),
        arts: arts.slice(0, 3).map(x => ({ id: x.id })) });
      out.push({ de: "bot", t: (d.length ? "Disponible ahora: " + d.slice(0, 3).map(x => x.l.nom + " " + grp(x.d)).join(" · ") + "." : "No hay en las tiendas en este momento.") +
        (agot.length ? ` Agotado en ${agot.slice(0, 2).map(x => x.nom).join(", ")}${D.disp(a.id, "CD") > 0 ? ", pero en el CEDI hay " + grp(D.disp(a.id, "CD")) + " y se los bajamos mañana" : ""}.` : "") });
      return out;
    }
    out.push({ de: "bot", t: "No encontré ese artículo con ese nombre. ¿Me da el código o me describe para qué lo necesita? También puedo pasarle con un vendedor de piso." });
    return out;
  }

  /* un mensaje del cliente entra a la conversación y el agente responde (si le toca) */
  function recibir(th, texto, h) {
    th.msgs.push({ de: "cli", t: texto, h });
    th.hora = h;
    if (th.tomada || th.estado === "Escalado a persona") return;
    contestar(th, texto).forEach(m => th.msgs.push(Object.assign({ h }, m)));
  }

  /* ── las conversaciones del día, generadas por el mismo agente ──
     Los mensajes del cliente son de ejemplo; lo que el agente contesta,
     reserva, pide y aplica es real y queda en el sistema. */
  (function sembrar() {
    const byId = id => D.waThreads.find(x => x.id === id);
    D.waThreads.forEach(t => { t.guion = t.msgs; t.msgs = []; });
    const guion = (id, pasos) => { const t = byId(id); if (!t) return; pasos.forEach(([h, txt, de]) => de ? t.msgs.push({ de, t: txt, h }) : recibir(t, txt, h)); t.estado = t.estado === "Escalado a persona" ? t.estado : t.estado; };
    const set = (id, o) => { const t = byId(id); if (t) Object.assign(t, o); };
    ["W1", "W2", "W3", "W4", "W5", "W6"].forEach(id => set(id, { estado: "Atendido por el agente", tomada: null, escalado: null, pend: null }));
    guion("W1", [["11:28", "Buenas, tienen cinta teflón de 1/2?"], ["11:30", "Perfecto, apárteme 50 en Santa Rosa"]]);
    guion("W2", [["10:41", "Necesito cotización de 400 varillas #4 y 120 sacos de cemento para entrega el lunes en Turrialba"]]);
    guion("W5", [["08:39", "cuanto vale la lamina de zinc esmaltada"], ["08:41", "y me hacen precio por 30?"]]);
    guion("W6", [["07:52", "Buenos días, mándeme 6 rollos de manguera de 15m y 20 aspersores"], ["07:54", "Si por favor, y que salga en la ruta"]]);
    /* un pago real: el cliente con la factura a crédito más vieja que el agente puede aplicar solo */
    const t3 = byId("W3");
    const d3 = D.documentos.filter(d => d.condicion === "Crédito" && d.saldo > 50000 && d.saldo <= REGLAS.pagoSolo && d.clienteId && !["C2", "C3", "C9", "C12"].includes(d.clienteId)).sort((a, b) => a.fecha - b.fecha)[0];
    if (t3 && d3) {
      const k = D.cliById[d3.clienteId];
      Object.assign(t3, { clienteId: k.id, nom: k.nom, tel: k.tel || t3.tel });
      recibir(t3, "Ya hice la transferencia de la factura " + d3.cons.slice(-6), "10:06");
      t3.msgs.push({ de: "cli", t: "Comprobante de transferencia", h: "10:06", img: { tipo: "comprobante", monto: c(d3.saldo), ref: "88301442", nombre: k.nom } });
      recibir(t3, "Le transferí " + c(d3.saldo) + ", referencia 88301442", "10:07");
    }
    /* un recordatorio de cobro de una factura real que vence esta semana */
    const t4 = byId("W4");
    const d4 = D.documentos.filter(d => d.condicion === "Crédito" && d.saldo > 0 && d.clienteId && (!d3 || d.clienteId !== d3.clienteId)).map(d => ({ d, vence: new Date(d.fecha.getTime() + ((D.cliById[d.clienteId] || {}).plazo || 30) * 86400000) }))
      .filter(x => x.vence >= D.HOY).sort((a, b) => a.vence - b.vence)[0];
    if (t4 && d4) {
      const k = D.cliById[d4.d.clienteId];
      Object.assign(t4, { clienteId: k.id, nom: k.nom, tel: k.tel || t4.tel, estado: "Recordatorio de cobro" });
      t4.msgs.push({ de: "bot", h: "09:00", t: `Buenos días. Le recordamos que la factura ${d4.d.cons} por ${c(d4.d.saldo)} vence ${d4.vence.toDateString() === D.HOY.toDateString() ? "hoy" : "el " + (U.fechaL ? U.fechaL(d4.vence) : fecha(d4.vence))}.` });
      t4.msgs.push({ de: "bot", h: "09:00", t: "Puede pagar por SINPE al 8712-0000 o por transferencia a la cuenta CR15015201001023456. Si ya pagó, mándeme el comprobante y lo aplico." });
      t4.msgs.push({ de: "cli", h: "09:14", t: "Gracias, lo pasamos el lunes" });
      t4.msgs.push({ de: "bot", h: "09:14", t: "Anotado. Le vuelvo a escribir el lunes en la tarde si no ha entrado." });
    }
    D.waThreads.forEach(t => { delete t.guion; if (t.msgs.length) t.hora = t.msgs[t.msgs.length - 1].h; });
    D.waThreads.sort((a, b) => b.hora.localeCompare(a.hora));
  })();

  /* ── cifras del agente, calculadas ────────────────────────── */
  function cifras() {
    const T = D.waThreads;
    const esc = T.filter(t => t.escalado).length, tom = T.filter(t => t.tomada).length;
    const peds = D.proformas.filter(p => p.creadoPor === "Agente");
    const reps = F.reps.filter(r => r.canal === "WhatsApp");
    return {
      conv: T.length, esc, tom, solas: T.length - esc - tom,
      peds: peds.length, pedMonto: peds.reduce((s, p) => s + p.total, 0),
      pagos: reps.length + D.proformas.filter(p => p.creadoPor === "Agente" && p.estadoPed === "Pagado · por facturar").length,
      pagoMonto: T.reduce((s, t) => s + (t.pagos || 0), 0), reservas: RESERVAS.length
    };
  }

  /* ══ AGENTE DE WHATSAPP ══════════════════════════════════════ */
  let comoCliente = false;
  A.screen("whatsapp", {
    title: "Agente de WhatsApp",
    sub: () => "Consulta el mismo inventario que la caja · crea pedidos, aparta y aplica pagos · lo que no le toca lo escala",
    pad: "pad-tight",
    render(v) {
      const th = D.waThreads.find(t => t.id === S.waSel) || D.waThreads[0];
      S.waSel = th.id;
      const k = cifras();
      const quien = th.tomada ? th.tomada : null;
      /* los productos que se mencionan van con su foto (o su ilustración), precio y existencia */
      const tarjetas = arts => `<div class="wa-arts">${arts.map(x => { const a = D.artById[x.id]; if (!a) return ""; const d = D.tiendas.reduce((s, l) => s + Math.max(0, D.disp(a.id, l.id)), 0);
        return `<div class="wa-art">${w.PRODIMG ? w.PRODIMG.img(a, "wa-art-img") : ""}<div class="wa-art-b"><b>${esc(a.desc)}</b><span class="num">${esc(a.cod)}</span>
          <span class="num wa-art-p">${c(a.precio)}${x.cant ? ` <span class="dim">× ${grp(x.cant)}</span>` : ""}</span><span class="dim" style="font-size:11px">${d ? grp(d) + " en tiendas" : "sin existencia en tiendas"}</span></div></div>`; }).join("")}</div>`;
      const imagen = m => m.img && m.img.tipo === "comprobante" && w.PRODIMG ? `<img class="wa-foto" src="${w.PRODIMG.comprobante(m.img)}" alt="Comprobante de transferencia">` : "";
      const burbuja = m => m.de === "sys" ? `<div class="bub sys">${esc(m.t)}</div>`
        : `<div class="bub ${m.de === "per" ? "bot per" : m.de}${m.arts || m.img ? " con-img" : ""}">${m.de === "bot" ? `<div class="botline">${icon("sparkle", 'style="width:12px;height:12px"')}Agente ServeCore</div>` : m.de === "per" ? `<div class="botline">${icon("users", 'style="width:12px;height:12px"')}${esc(m.por)}</div>` : ""}${m.img ? imagen(m) : esc(m.t)}${m.arts ? tarjetas(m.arts) : ""}<span class="h">${esc(m.h)}</span></div>`;
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Conversaciones hoy", grp(k.conv), { txt: k.solas + " resueltas por el agente sin intervenir", dir: "up" })}
          ${stat("Pasaron a una persona", grp(k.esc + k.tom), { txt: "monto alto, precio, pago grande o reclamo", dir: "" }, "var(--warn)")}
          ${stat("Pedidos creados por el agente", grp(k.peds), { txt: c(k.pedMonto) + " · están en Ventas › Pedidos", dir: "up" }, "var(--ok)")}
          ${stat("Pagos aplicados", grp(k.pagos), { txt: c(k.pagoMonto) + " con su REP y su asiento", dir: "" })}
        </div>
        <div class="split ancho" style="align-items:stretch;min-height:540px">
          ${card({
        actions: `<button class="btn sm" id="waNueva">${icon("plus")}Nueva</button>`,
        body: `<div class="mut" style="font-size:12px;margin-bottom:6px">Conversaciones del día</div>
          <div class="mitems" style="max-height:none">${D.waThreads.map(t => `
            <button class="mitem" data-w="${t.id}" aria-selected="${t.id === th.id}" style="align-items:flex-start">
              <span class="avatar" style="margin-top:2px">${esc(ini(t.nom))}</span>
              <span style="flex:1;min-width:0"><span class="itd">${esc(t.nom)}</span>
                <span class="mut" style="font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((t.msgs[t.msgs.length - 1] || { t: "—" }).t)}</span>
                <span style="margin-top:5px;display:inline-block">${tag(t.tomada ? "Atendido por " + t.tomada.split(" ")[0] : t.estado, t.escalado ? "wa" : t.tomada ? "acc" : "ok")}</span></span>
              <span class="dim num" style="font-size:11px">${esc(t.hora || "")}</span></button>`).join("")}</div>`
      })}
          <div class="card" style="display:flex;flex-direction:column;overflow:hidden">
            <div class="card-h" style="padding:15px 17px;border-bottom:1px solid var(--hair)">
              <span class="avatar">${esc(ini(th.nom))}</span>
              <div><h3 style="font-size:15px">${esc(th.nom)}</h3>
                <div class="mut num" style="font-size:12px">${esc(th.tel)}${th.clienteId ? " · " + esc(cliNom(th.clienteId)) : " · sin ficha de cliente"}</div></div>
              <div class="card-a">
                ${th.clienteId ? `<button class="btn sm" id="verCli">${icon("users")}Ver cliente</button>` : ""}
                ${(th.pedidos || []).length ? `<button class="btn sm" id="verPed">${icon("file")}Ver pedido</button>` : ""}
                ${quien ? `<button class="btn sm" id="devolver">${icon("sparkle")}Devolver al agente</button>` : `<button class="btn sm pri" id="tomar">${icon("chat")}Tomar la conversación</button>`}</div>
            </div>
            ${th.escalado && !quien ? `<div class="alert wa" style="margin:10px 14px 0;border:1px solid var(--warn-line);border-radius:10px">${icon("alert")}<div><b>El agente dejó de responder</b><div class="mut" style="font-size:12.5px">Escalado a ${esc(th.escalado.a)} · ${esc(th.escalado.motivo)}. Tome la conversación para seguir con el cliente.</div></div></div>` : ""}
            <div class="chat" style="flex:1;max-height:none">${th.msgs.map(burbuja).join("")}</div>
            <div style="padding:12px 15px;border-top:1px solid var(--hair);display:flex;gap:9px;align-items:center">
              ${quien ? `<button class="btn sm" id="modo" aria-pressed="${comoCliente}">${comoCliente ? "Escribo como cliente" : "Escribo como " + esc(D.sesion.corto)}</button>` : ""}
              <input class="inp" id="wamsg" style="flex:1" placeholder="${quien && !comoCliente ? "Responda al cliente como " + esc(D.sesion.corto) : "Escriba como cliente y el agente responde con datos reales del sistema"}">
              <button class="btn pri" id="wasend">Enviar</button></div>
            <div style="padding:9px 15px;border-top:1px solid var(--hair-2);background:var(--surface-2);font-size:12.5px;color:var(--ink-3);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${icon("info", 'style="width:15px;height:15px"')}Pruebe: «tienen cemento» · «apárteme 10 en Turrialba» · «mándeme 5 sacos de cemento y 10 varillas #3» · «cuánto debo» · «le transferí ₡50 000 referencia 12345678» · «tengo un reclamo».</div>
          </div>
        </div></div>`;
      const ch = $(".chat", v);
      if (ch) ch.scrollTop = ch.scrollHeight;
    },
    wire(v) {
      const th = () => D.waThreads.find(x => x.id === S.waSel);
      $$("[data-w]", v).forEach(b => b.addEventListener("click", () => { S.waSel = b.dataset.w; comoCliente = false; A.refresh(); }));
      const vc = $("#verCli", v); if (vc) vc.addEventListener("click", () => A.go("clientes", th().clienteId));
      const vp = $("#verPed", v); if (vp) vp.addEventListener("click", () => A.go("cotizaciones", "pedidos"));
      const t2 = $("#tomar", v);
      if (t2) t2.addEventListener("click", () => {
        const t = th(); t.tomada = D.sesion.corto; t.estado = "Atendido por " + D.sesion.corto;
        t.msgs.push({ de: "sys", t: D.sesion.corto + " tomó la conversación · el agente deja de responder", h: hora(D.ahora()) });
        D.bitacora.unshift({ id: "BTW" + Date.now(), fecha: D.ahora(), usuario: D.sesion.nom, rol: D.sesion.cargo, locId: S.locId, accion: "Tomó una conversación de WhatsApp", detalle: t.nom + (t.escalado ? " · " + t.escalado.motivo : ""), sev: "Baja", antes: "", despues: "", ip: D.sesion.ip });
        comoCliente = false; A.refresh();
      });
      const dv = $("#devolver", v);
      if (dv) dv.addEventListener("click", () => {
        const t = th(); t.msgs.push({ de: "sys", t: t.tomada + " devolvió la conversación al agente", h: hora(D.ahora()) });
        t.tomada = null; t.escalado = null; t.estado = "Atendido por el agente"; A.refresh();
      });
      const md = $("#modo", v); if (md) md.addEventListener("click", () => { comoCliente = !comoCliente; A.refresh(); });
      const nv = $("#waNueva", v);
      if (nv) nv.addEventListener("click", () => {
        const id = "W" + (D.waThreads.length + 1 + Math.floor(Math.random() * 900));
        const tel = "8" + pad(Math.floor(Math.random() * 1000), 3) + "-" + pad(Math.floor(Math.random() * 10000), 4);
        D.waThreads.unshift({ id, nom: "Número nuevo " + tel, tel, clienteId: null, estado: "Atendido por el agente", hora: hora(D.ahora()), msgs: [] });
        S.waSel = id; A.refresh();
        toast("Conversación nueva", "Escriba como el cliente. Si da su cédula, el agente lo reconoce y abre su cuenta.", "in");
      });
      const inp = $("#wamsg", v), snd = $("#wasend", v);
      function enviar() {
        const q = inp.value.trim(); if (!q) return;
        const t = th(), h = hora(D.ahora());
        try {
          if (t.tomada && !comoCliente) { t.msgs.push({ de: "per", por: D.sesion.corto, t: q, h }); t.hora = h; }
          else recibir(t, q, h);
        } catch (e) { toast("El agente no pudo completar la acción", e.message, "cr"); }
        A.refresh();
        const n = $("#wamsg"); if (n) n.focus();
      }
      if (snd) snd.addEventListener("click", enviar);
      if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") enviar(); });
    }
  });

  /* ══ PANEL DE INTEGRACIONES ══════════════════════════════════
     Cada conexión con su estado real: lo que salió, lo que falta y lo
     que falló, calculado de los mismos datos que usan los módulos. */
  function conexiones() {
    const AU = w.AUTO, now = D.ahora();
    const hoy = x => x && x.toDateString() === D.HOY.toDateString();
    const em = F.emitidos(), cola = F.cola();
    const rech = cola.filter(x => x.estado === "Rechazado"), proc = cola.filter(x => x.estado !== "Rechazado");
    const ultResp = em.map(x => x.respuesta).filter(Boolean).sort((a, b) => b - a)[0];
    const tc = D.tcDe(now);
    const bnPend = D.banco.filter(b => !b.conciliado);
    const sinCorreo = em.filter(x => x.correo === false && hoy(x.doc.fecha));
    const T = D.waThreads, esc2 = T.filter(t => t.escalado && !t.tomada);
    const lotes = AU ? AU.lotes : [], lotesNo = lotes.filter(x => x.estado === "No acreditado"), lotesTr = lotes.filter(x => x.estado === "En tránsito");
    return [
      { id: "hacienda", t: "Hacienda · TRIBU-CR", ic: "file", d: "Comprobantes 4.4: firma, envío y respuesta",
        estado: S.offline ? ["Sin enlace · contingencia", "wa"] : rech.length ? ["Con rechazos", "cr"] : ["En línea", "ok"],
        ult: ultResp, datos: [["Emitidos hoy", grp(em.filter(x => hoy(x.doc.fecha)).length)], ["En proceso o en cola", grp(proc.length)], ["Rechazados", grp(rech.length)], ["Llave criptográfica", "vence en " + grp(F.LLAVE.faltan) + " días"]],
        acc: [["Reintentar envíos", "hac-reintentar"], ["Ver comprobantes", "go:fiscal"]] },
      { id: "banco", t: "Banco Nacional", ic: "bank", d: "Lectura del estado de cuenta y archivos de pago",
        estado: bnPend.length ? ["Partidas por conciliar", "wa"] : ["Conciliado", "ok"],
        ult: new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.max(6, now.getHours()), 0),
        datos: [["Movimientos leídos", grp(D.banco.length)], ["Sin conciliar", grp(bnPend.length)], ["Lectura", "6:00 y cada hora"], ["Archivos de pago", "planilla y proveedores (TXT)"]],
        acc: [["Ver conciliación", "go:con-conciliaciones|banco"]] },
      { id: "bccr", t: "Banco Central · tipo de cambio", ic: "chart", d: "Compra y venta del día, guardados por fecha",
        estado: /Manual/.test(tc.fuente) ? ["Registrado a mano", "wa"] : ["Automático", "ok"],
        ult: tc.fecha, datos: [["Compra", "₡" + dec(tc.compra, 2)], ["Venta", "₡" + dec(tc.venta, 2)], ["Fuente", tc.fuente]],
        acc: [["Ver historial", "go:sis-pagos|monedas"]] },
      { id: "whatsapp", t: "WhatsApp Business", ic: "chat", d: "Agente de consultas, pedidos y cobros",
        estado: esc2.length ? [esc2.length + " esperando a una persona", "wa"] : ["Atendiendo", "ok"],
        ult: now, datos: [["Conversaciones hoy", grp(T.length)], ["Escaladas sin tomar", grp(esc2.length)], ["Pedidos creados", grp(cifras().peds)], ["Recordatorios de cobro", grp(T.filter(t => t.estado === "Recordatorio de cobro").length)]],
        acc: [["Abrir el agente", "go:whatsapp"]] },
      { id: "correo", t: "Correo de comprobantes", ic: "mail", d: "XML y PDF a cada cliente, y los que llegan de proveedores",
        estado: sinCorreo.length ? [sinCorreo.length + " sin entregar", "wa"] : ["Entregando", "ok"],
        ult: now, datos: [["Enviados hoy", grp(em.filter(x => hoy(x.doc.fecha) && x.correo !== false).length)], ["Rebotados hoy", grp(sinCorreo.length)], ["Comprobantes de proveedor sin aceptar", grp(D.recibidos.filter(r => r.estado === "Sin aceptar").length)]],
        acc: sinCorreo.length ? [["Reenviar los rebotados", "correo-reenviar"], ["Ver recibidos", "go:fel-recibidos"]] : [["Ver recibidos", "go:fel-recibidos"]] },
      { id: "datafono", t: "Datáfonos · adquirente", ic: "card", d: "Lotes diarios de tarjeta, netos de comisión",
        estado: lotesNo.length ? ["Lote sin acreditar", "cr"] : ["Al día", "ok"],
        ult: now, datos: [["Lotes de la semana", grp(lotes.length)], ["En tránsito (hoy)", grp(lotesTr.length)], ["Sin acreditar", grp(lotesNo.length)], ["Comisión", dec(AU ? AU.POLITICA.comisionDatafono : 2.75, 2) + " %"]],
        acc: [["Ver cajas y datáfono", "go:con-conciliaciones|caja"]] },
      { id: "nodo", t: "Nodos locales de las tiendas", ic: "server", d: "Si se cae el enlace, cada tienda sigue facturando y encola",
        estado: S.offline ? ["Enlace caído en " + locNom(S.locId), "cr"] : ["7 tiendas en línea", "ok"],
        ult: now, datos: [["Réplica", S.offline ? "detenida" : "hace 4 s"], ["En cola para Hacienda", grp(S.offline ? S.queue : cola.filter(x => x.estado === "En cola").length)]],
        acc: [[S.offline ? "Restablecer el enlace" : "Simular caída del enlace", "enlace"]] }
    ];
  }
  /* bitácora de integraciones: lo último que entró y salió por cada conexión */
  function eventos() {
    const ev = [];
    F.emitidos().filter(x => x.respuesta).slice(0, 400).forEach(x => ev.push({ f: x.respuesta, c: "Hacienda", t: (x.estado === "Rechazado" ? "Rechazó " : "Aceptó ") + x.doc.cons, k: x.estado === "Rechazado" ? "cr" : "ok" }));
    D.banco.forEach(b => ev.push({ f: b.fecha, c: "Banco Nacional", t: (b.debe ? "Entrada " : "Salida ") + c(b.debe || b.haber) + " · " + b.desc, k: b.conciliado ? "ok" : "wa" }));
    D.tipoCambio.forEach(x => ev.push({ f: x.fecha, c: "Banco Central", t: "Tipo de cambio ₡" + dec(x.compra, 2) + " / ₡" + dec(x.venta, 2) + " · " + x.fuente, k: /Manual/.test(x.fuente) ? "wa" : "ok" }));
    D.waThreads.forEach(t => (t.msgs || []).filter(m => m.de === "sys").forEach(m => ev.push({ f: new Date(D.HOY.getFullYear(), D.HOY.getMonth(), D.HOY.getDate(), +m.h.slice(0, 2), +m.h.slice(3, 5)), c: "WhatsApp", t: t.nom + " · " + m.t, k: /Escalado/.test(m.t) ? "wa" : "ok" })));
    return ev.filter(x => x.f && x.f <= D.ahora()).sort((a, b) => b.f - a.f).slice(0, 40);
  }
  A.screen("integraciones", {
    title: "Panel de integraciones",
    sub: () => "Cada conexión con su estado real · lo que salió, lo que falta y lo que falló",
    render(v) {
      const X = conexiones();
      const mal = X.filter(x => x.estado[1] !== "ok");
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Conexiones", grp(X.length), { txt: "Hacienda, bancos, WhatsApp, correo, datáfonos y nodos", dir: "" })}
          ${stat("En línea", grp(X.length - mal.length), { txt: "sin nada pendiente", dir: "up" }, "var(--ok)")}
          ${stat("Con algo por atender", grp(mal.length), { txt: mal.map(x => x.t.split(" ·")[0]).join(", ") || "nada", dir: mal.length ? "down" : "up" }, mal.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Integraciones simuladas", "Demo", { txt: "en producción son servicios reales; aquí los datos salen del sistema", dir: "" })}
        </div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(330px,1fr));align-items:stretch">
          ${X.map(x => card({
        title: x.t, hint: x.d, chip: " " + tag(x.estado[0], x.estado[1], x.estado[1] === "ok" ? "check" : "alert"),
        body: `<dl class="kv">${x.datos.map(d => `<dt>${esc(d[0])}</dt><dd class="num">${esc(String(d[1]))}</dd>`).join("")}
            <dt>Última actividad</dt><dd class="num">${x.ult ? fh(x.ult) : "—"}</dd></dl>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${x.acc.map(a => `<button class="btn sm" data-int="${esc(a[1])}">${esc(a[0])}</button>`).join("")}</div>`
      })).join("")}
        </div>
        ${card({
        title: "Bitácora de integraciones", hint: "lo último que entró y salió por cada conexión",
        body: table({
          h: "calc(100dvh - 520px)",
          cols: [
            { t: "Fecha y hora", cls: "mono", fmt: r => fh(r.f) },
            { t: "Conexión", fmt: r => `<b>${esc(r.c)}</b>` },
            { t: "Evento", fmt: r => esc(r.t) },
            { t: "", fmt: r => tag(r.k === "ok" ? "OK" : r.k === "cr" ? "Error" : "Pendiente", r.k) }
          ], rows: eventos()
        })
      })}</div>`;
    },
    wire(v) {
      $$("[data-int]", v).forEach(b => b.addEventListener("click", () => {
        const a = b.dataset.int;
        if (a.indexOf("go:") === 0) { const [scr, arg] = a.slice(3).split("|"); return A.go(scr, arg); }
        if (a === "hac-reintentar") { const n = F.reintentar(); toast(n ? n + " comprobantes reenviados" : "Nada que reintentar", n ? "Hacienda los aceptó. Los rechazos que necesitan corrección quedan en Facturación." : "No hay envíos pendientes que se puedan reintentar solos.", n ? "ok" : "in"); return A.refresh(); }
        if (a === "correo-reenviar") { let n = 0; F.emitidos().forEach(x => { if (x.correo === false) { F.capa[x.doc.id].correo = true; n++; } }); toast(n + " correos reenviados", "Los comprobantes se volvieron a enviar al correo registrado de cada cliente.", "ok"); return A.refresh(); }
        if (a === "enlace") { const n = $("#btnNet"); if (n) n.click(); A.refresh(); }
      }));
    }
  });

  w.AGENTE = { REGLAS, RESERVAS, contestar, recibir, cifras, conexiones };
})(window);
