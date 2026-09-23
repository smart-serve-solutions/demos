/* ═══════════════════════════════════════════════════════════════════
   ServeCore — inventario que se lleva solo
   Lo que Santa Rosa hace hoy a mano en Neo, hecho por el sistema:
   unidades y presentaciones, ubicación por local, códigos y etiquetas,
   alta y copia de artículos, carga masiva con revisión previa, precios
   que siguen al costo, apartados y ventas contra pedido, producto de
   segunda y devoluciones, traslados sugeridos desde el CEDI, conteo del
   día sin ver el sistema, y un sugerido de compra que no se deja
   engañar por una licitación.
   Las cifras son de ejemplo; el comportamiento es el de producción.
   ═══════════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB;

  let _s = 20260922;
  const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const HOY = D.HOY;
  const dia = n => new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() - n, 10, 0);
  const ahora = () => { const n = new Date(); return new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate(), n.getHours(), n.getMinutes()); };
  const pad = (n, l) => String(n).padStart(l, "0");
  const byCod = cod => D.articulos.find(a => a.cod === cod);
  const loc = id => D.locales.find(l => l.id === id) || {};
  const locNom = id => loc(id).nom || id;
  const prods = () => D.articulos.filter(a => a.tipo === "Producto");
  const r5 = n => Math.ceil(n / 5) * 5;

  /* ═══ 1 · QUIÉN HACE QUÉ ═════════════════════════════════════════ */
  const GENTE = {
    bodega: { nom: "Kevin Solano Mata", rol: "Bodega" },
    compras: { nom: "Óscar Jiménez Ureña", rol: "Proveeduría" },
    gerente: { nom: "Adrián Vindas Mora", rol: "Gerente general" }
  };
  const POL = {
    aprobarAjusteDesde: 50000,   /* ajustes de inventario que necesitan el visto bueno de gerencia */
    margenSegunda: 5,            /* margen con el que sale el producto de segunda */
    diasApartado: 8,             /* días que se guarda un apartado antes de avisar */
    objetivoSobreMinimo: 8       /* puntos sobre el margen mínimo para el precio sugerido */
  };
  function anotar(accion, detalle, por, locId) {
    const p = por || GENTE.bodega;
    D.bitacora.unshift({
      id: "BT-I" + D.bitacora.length, fecha: ahora(), usuario: p.nom, rol: p.rol, locId: locId || "CD",
      accion, detalle, sev: "Media", antes: "", despues: "", ip: "10.2.14.40"
    });
  }

  /* ═══ 2 · PROVEEDOR DE CADA MARCA Y DÍAS DE ENTREGA ═════════════════ */
  const MARCA_PROV = {
    Amanco: "P1", Bronco: "P1", Holcim: "P2", Cemex: "P2", Arcelor: "P3", Metalco: "P4", Ricalit: "P4",
    Tuboplast: "P5", Fixer: "P5", Sur: "P6", Protecto: "P6", Truper: "P7", Stanley: "P7", Bosch: "P7",
    Yale: "P7", Steelpro: "P7", Conducen: "P8", Conduflex: "P8", Sylvania: "P8",
    "Productos de Concreto": "P9", "Río Reventazón": "P9", "Quebrador Turrialba": "P9", "Prefabricados FSR": "P9"
  };
  const LEAD = { P1: 3, P2: 2, P3: 5, P4: 4, P5: 3, P6: 3, P7: 8, P8: 4, P9: 2 };
  const provDe = a => MARCA_PROV[a.marca] || null;

  /* ═══ 3 · UNIDADES Y PRESENTACIONES (INV-017) ══════════════════════
     Se compra en una presentación y se vende en otra: el rollo entra
     como 100 metros y se vende por metro, con decimales.               */
  const PRES = {
    "FER-04101": { dec: true, p: [{ u: "Rollo de 100 m", f: 100, compra: true, venta: true, desc: 5 }] },
    "FER-04104": { dec: true, p: [{ u: "Rollo de 100 m", f: 100, compra: true, venta: true, desc: 5 }] },
    "FER-07040": { dec: true, p: [{ u: "Caja de 25 kg", f: 25, compra: true, venta: true, desc: 4 }] },
    "FER-02240": { dec: true, p: [{ u: "Rollo de 20 kg", f: 20, compra: true, venta: true, desc: 3 }] },
    "FER-07010": { p: [{ u: "Caja de 100", f: 100, compra: true, venta: true, desc: 8 }] },
    "FER-03840": { p: [{ u: "Bolsa de 50", f: 50, compra: true, venta: true, desc: 6 }] },
    "FER-01120": { p: [{ u: "Bolsa de 25", f: 25, compra: true, venta: true, desc: 5 }] },
    "FER-01122": { p: [{ u: "Bolsa de 25", f: 25, compra: true, venta: true, desc: 5 }] },
    "FER-02310": { p: [{ u: "Bolsa de 25", f: 25, compra: true, venta: true, desc: 5 }] },
    "FER-01042": { p: [{ u: "Tarima de 40 sacos", f: 40, compra: true }] },
    "FER-01045": { p: [{ u: "Tarima de 40 sacos", f: 40, compra: true }] },
    "FER-01880": { p: [{ u: "Tarima de 100", f: 100, compra: true }] },
    "FER-01884": { p: [{ u: "Tarima de 80", f: 80, compra: true }] },
    "FER-02218": { p: [{ u: "Atado de 10", f: 10, compra: true, venta: true, desc: 3 }] },
    "FER-09020": { p: [{ u: "Caja de 12 pares", f: 12, compra: true, venta: true, desc: 6 }] },
    "FER-01060": { dec: true, p: [{ u: "Medio metro", f: 0.5, venta: true }] },
    "FER-01062": { dec: true, p: [{ u: "Medio metro", f: 0.5, venta: true }] }
  };
  const UNIDADES = ["Unid", "m", "kg", "m³", "m²", "Saco", "Galón", "Cubeta", "Par", "Juego", "Rollo", "Caja"];
  const UNID_DEC = ["m", "kg", "m³", "m²"];
  const CONTRA_PEDIDO = ["FER-01890", "FER-03810", "FER-04225"];   /* se factura sin existencia y se despacha al llegar (INV-004) */
  prods().forEach(a => {
    const p = PRES[a.cod] || {};
    a.decimales = !!p.dec || UNID_DEC.indexOf(a.unidad) >= 0;
    const otras = (p.p || []).map(x => Object.assign({ venta: false, compra: false, desc: 0 }, x));
    a.pres = [{ u: a.unidad, f: 1, base: true, venta: true, compra: !otras.some(x => x.compra), desc: 0 }].concat(otras);
    a.contraPedido = CONTRA_PEDIDO.indexOf(a.cod) >= 0;
    a.fotos = a.ean ? ri(1, 3) : (rnd() < 0.45 ? 0 : 1);
    a.provId = provDe(a);
  });
  D.articulos.filter(a => a.tipo === "Servicio").forEach(a => {
    a.decimales = false; a.pres = [{ u: a.unidad, f: 1, base: true, venta: true, compra: false, desc: 0 }]; a.fotos = 0;
  });
  const presCompra = a => (a.pres || []).find(p => p.compra) || { u: a.unidad, f: 1 };
  const fmtCant = (n, a) => (a && a.decimales && !Number.isInteger(n) ? String(Math.round(n * 100) / 100).replace(".", ",") : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "));

  /* ═══ 4 · UBICACIÓN EN CADA LOCAL (INV-020) ════════════════════════
     Pasillo, estante y casilla. Se ve en la caja y en el conteo.       */
  const UB = {};
  prods().forEach(a => {
    UB[a.id] = {};
    Object.keys(D.existencias[a.id] || {}).forEach(l => {
      const t = loc(l).tipo;
      let code;
      if (t === "cedi") code = "R" + pad(ri(1, 24), 2) + "-" + ri(1, 5);
      else if (t === "bodega") code = "B" + ri(1, 6) + "-" + pad(ri(1, 20), 2);
      else if (/^PATIO/.test(a.ubic)) code = a.ubic;
      else code = l === "L1" ? a.ubic : a.ubic.replace(/^([A-Z])(\d)/, (m, p) => p + ri(1, 4));
      if (t === "tienda" && l !== "L1" && rnd() < 0.04) code = null;
      UB[a.id][l] = code;
    });
  });
  const ubic = (artId, locId) => (UB[artId] || {})[locId] || null;
  function ubicTexto(code) {
    if (!code) return "Sin ubicación";
    let m;
    if ((m = /^PATIO-(\d+)/.exec(code))) return "Patio " + m[1];
    if ((m = /^R(\d+)-(\d+)/.exec(code))) return "Rack " + (+m[1]) + " · nivel " + m[2];
    if ((m = /^B(\d+)-(\d+)/.exec(code))) return "Estante " + m[1] + " · casilla " + (+m[2]);
    if ((m = /^([A-Z])(\d+)-(\d+)/.exec(code))) return "Pasillo " + m[1] + " · estante " + m[2] + " · casilla " + (+m[3]);
    return code;
  }

  /* ═══ 5 · CÓDIGOS, FOTOS Y ETIQUETAS (INV-011, INV-014) ════════════ */
  const CODPROV = {};
  prods().forEach(a => { if (a.provId) CODPROV[a.id] = { provId: a.provId, cod: a.provId.replace("P", "PR") + "-" + a.cod.slice(4) }; });
  function ean13(base12) {
    const s = String(base12).slice(0, 12).padStart(12, "0");
    let t = 0;
    for (let i = 0; i < 12; i++) t += (+s[i]) * (i % 2 ? 3 : 1);
    return s + ((10 - (t % 10)) % 10);
  }
  const ETIQ = [];
  function etiqueta(artId, locId, motivo) {
    if (!ETIQ.some(e => e.artId === artId && e.locId === locId && e.motivo === motivo)) ETIQ.push({ artId, locId, motivo, fecha: ahora() });
  }
  function imprimirEtiquetas(locId) {
    const n = ETIQ.filter(e => !locId || e.locId === locId).length;
    for (let i = ETIQ.length - 1; i >= 0; i--) if (!locId || ETIQ[i].locId === locId) ETIQ.splice(i, 1);
    if (n) anotar("Imprimió etiquetas de estante", n + " etiquetas" + (locId ? " · " + locNom(locId) : ""), GENTE.bodega, locId);
    return n;
  }
  let codSeq = 0;
  function generarCodigo(artId) {
    const a = D.artById[artId];
    if (!a || a.ean) return null;
    codSeq++;
    a.ean = ean13("200" + pad(900000 + codSeq * 37 + (+String(a.id).replace(/\D/g, "") || 0), 9));
    a.eanInterno = true;
    Object.keys(D.existencias[a.id] || {}).forEach(l => etiqueta(a.id, l, "Código nuevo"));
    anotar("Generó código de barras interno", a.cod + " · " + a.desc + " · " + a.ean, GENTE.bodega);
    return a.ean;
  }
  function generarCodigos(ids) { return ids.map(generarCodigo).filter(Boolean).length; }
  function agregarFoto(artId) { const a = D.artById[artId]; if (a) { a.fotos = (a.fotos || 0) + 1; anotar("Agregó foto", a.cod + " · " + a.desc); } }
  function ubicar(artId, locId, code) {
    if (!UB[artId]) UB[artId] = {};
    UB[artId][locId] = code;
    etiqueta(artId, locId, "Ubicación nueva");
    anotar("Asignó ubicación", D.artById[artId].desc + " · " + locNom(locId) + " · " + code, GENTE.bodega, locId);
  }
  const sinCodigo = () => prods().filter(a => !a.ean);
  const sinFoto = () => prods().filter(a => !a.fotos);
  function sinUbicacion(locId) {
    const out = [];
    prods().forEach(a => Object.keys(UB[a.id] || {}).forEach(l => {
      if (!UB[a.id][l] && loc(l).tipo === "tienda" && (!locId || l === locId)) out.push({ a, locId: l });
    }));
    return out;
  }
  /* cambios de precio de ayer que todavía no tienen etiqueta en el estante */
  ["FER-05120", "FER-04220", "FER-01455"].forEach(cod => { const a = byCod(cod); if (a) ["L1", "L2", "L6"].forEach(l => { if (D.existencias[a.id][l]) etiqueta(a.id, l, "Precio nuevo"); }); });

  /* ═══ 6 · CABYS (INV-015) ══════════════════════════════════════════
     El sistema sugiere el código a partir de la descripción y avisa
     cuando Hacienda cambia o retira uno que se usa.                    */
  const CABYS = [
    ["3744001000100", "Cemento hidráulico tipo portland", "cemento saco portland hidraulico"],
    ["1533001000000", "Arena, piedra y agregados para construcción", "arena piedra cuartilla lastre agregado quintilla"],
    ["4111201000000", "Barras y varillas de acero para construcción", "varilla acero corrugada deformada barra"],
    ["4111301000000", "Alambre de hierro o acero", "alambre amarre negro galvanizado"],
    ["3730001000000", "Artículos de concreto para construcción", "bloque baldosa concreto prefabricado alcantarilla tubo concreto"],
    ["4118101000000", "Láminas de hierro o acero para techo", "lamina zinc esmaltada techo hierro"],
    ["3610001000000", "Láminas y placas de plástico", "lamina translucida policarbonato plastico"],
    ["4111401000000", "Perfiles de hierro o acero", "perling perfil tubo estructural"],
    ["4118901000000", "Tornillos, clavos y artículos de fijación", "tornillo clavo arandela tuerca perno broca fijacion"],
    ["3610101000000", "Tubos de plástico (PVC) para agua", "tubo pvc sdr sanitario tuberia"],
    ["3610102000000", "Accesorios de tubería plástica", "codo tee union reduccion adaptador valvula sifon pvc accesorio"],
    ["3610103000000", "Mangueras y accesorios de riego", "manguera aspersor riego"],
    ["3520201000000", "Pegamentos, adhesivos y selladores", "cemento solvente pegamento sellador silicon teflon liquido"],
    ["2431100000100", "Cinta de politetrafluoroetileno (teflón)", "cinta teflon"],
    ["4289201000000", "Llaves y grifería", "llave chorro grifo griferia mezcladora"],
    ["4631001000000", "Cable eléctrico de cobre aislado", "cable thhn alambre electrico cobre"],
    ["4653001000000", "Lámparas y luminarias", "bombillo led panel lampara luminaria"],
    ["4118201000000", "Tubo conduit y cajas eléctricas", "conduit emt caja rectangular octogonal"],
    ["4292101000000", "Discos abrasivos y de corte", "disco corte esmeril abrasivo"],
    ["4291101000000", "Herramientas de mano", "martillo destornillador cinta metrica nivel alicate llave herramienta"],
    ["3511101000000", "Pinturas y esmaltes", "pintura latex esmalte anticorrosivo cubeta galon"],
    ["4292901000000", "Brochas y rodillos para pintar", "brocha rodillo felpa bandeja"],
    ["4289301000000", "Candados y cerraduras", "candado cerradura llavin"],
    ["2822001000000", "Equipo de protección personal", "casco guante nitrilo lente chaleco bota"]
  ].map(x => ({ cod: x[0], desc: x[1], palabras: x[2].split(" ") }));
  const CABYS_ACT = { fecha: "12 set 2026", fuente: "Catálogo de bienes y servicios de Hacienda", retirados: 1, nuevos: 14 };
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function sugerirCabys(texto) {
    const t = norm(texto).split(/[^a-z0-9]+/).filter(x => x.length > 2);
    if (!t.length) return [];
    return CABYS.map(c => {
      let s = 0;
      t.forEach(x => { if (c.palabras.some(p => p === x || (x.length > 3 && p.indexOf(x) === 0) || (p.length > 3 && x.indexOf(p) === 0))) s += 2; else if (norm(c.desc).indexOf(x) >= 0) s += 1; });
      return { c, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3)
      .map((x, i, arr) => ({ cod: x.c.cod, desc: x.c.desc, conf: Math.min(98, Math.round(58 + 40 * x.s / (arr[0].s + (i ? 2 : 0)))) }));
  }
  const cabysDesc = cod => (CABYS.find(c => c.cod === cod) || {}).desc || "Código CABYS";

  /* ═══ 7 · ALTA Y COPIA DE ARTÍCULOS (INV-001, INV-005, INV-019) ════ */
  const codigoLibre = cod => !!String(cod || "").trim() && !D.articulos.some(a => a.cod.toLowerCase() === String(cod).trim().toLowerCase());
  function siguienteCodigo() {
    const n = Math.max.apply(null, D.articulos.map(a => +(/\d+$/.exec(a.cod) || [0])[0]).filter(x => x < 50000));
    return "FER-" + pad(n + 1, 5);
  }
  /* precios de lista al consumidor: con el IVA de la tarifa del artículo */
  const precioSugerido = (costo, fam, tarifa) => r5(D.conIva((+costo || 0) / (1 - ((D.famById[fam] || { min: 25 }).min + POL.objetivoSobreMinimo) / 100), tarifa));
  const pisoPrecio = (costo, fam, tarifa) => r5(D.conIva((+costo || 0) / (1 - ((D.famById[fam] || { min: 0 }).min) / 100), tarifa));
  let nseq = 0;
  function crear(d) {
    const err = [];
    if (!codigoLibre(d.cod)) err.push(d.cod ? "El código " + d.cod + " ya existe" : "Falta el código");
    if (!d.desc || d.desc.trim().length < 4) err.push("Falta la descripción");
    if (!D.famById[d.fam]) err.push("Falta la familia");
    if (!/^\d{13}$/.test(d.cabys || "")) err.push("Falta el código CABYS");
    if (d.tipo !== "Servicio" && !(+d.costo > 0)) err.push("Falta el costo");
    const tarifa = D.tarifaDeCabys(d.cabys);
    if (d.tipo !== "Servicio" && +d.precio < pisoPrecio(d.costo, d.fam, tarifa)) err.push("El precio queda por debajo del margen mínimo de la familia");
    if (d.tipo !== "Servicio" && !(d.locales || []).length) err.push("Marque al menos un local donde existe");
    if (err.length) return { ok: false, err };
    nseq++;
    const f = D.famById[d.fam];
    const a = {
      id: "N" + nseq, cod: d.cod.trim().toUpperCase(), desc: d.desc.trim(), nom: d.desc.trim(), fam: d.fam,
      sub: d.sub || (D.subcats[d.fam] || [""])[0], marca: d.marca || "—", unidad: d.unidad || "Unid",
      costo: Math.round(+d.costo || 0), precio: Math.round(+d.precio || 0), cabys: d.cabys, tarifa, ean: d.ean || "",
      ubic: d.ubic || "", tipo: d.tipo || "Producto", peso: +d.peso || 0, medida: d.medida || "",
      margen: +d.precio ? +D.margenDe(+d.precio, +d.costo || 0, tarifa).toFixed(1) : null,
      decimales: !!d.decimales, contraPedido: !!d.contraPedido, fotos: d.fotos || 0,
      pres: [{ u: d.unidad || "Unid", f: 1, base: true, venta: true, compra: !(d.presCompra && d.presCompra.f > 1), desc: 0 }]
        .concat(d.presCompra && d.presCompra.f > 1 ? [{ u: d.presCompra.u, f: +d.presCompra.f, compra: true, venta: false, desc: 0 }] : []),
      provId: d.provId || MARCA_PROV[d.marca] || null, nuevo: true,
      creado: { por: (d.por || GENTE.compras).nom, fecha: ahora(), desde: d.desde || null, origen: d.origen || null }
    };
    if (d.eanInterno) a.eanInterno = true;
    D.articulos.push(a); D.artById[a.id] = a;
    if (a.tipo === "Producto") {
      D.existencias[a.id] = {}; UB[a.id] = {};
      d.locales.forEach(l => {
        D.existencias[a.id][l] = { cant: 0, comp: 0, min: loc(l).tipo === "cedi" ? 40 : 6 };
        UB[a.id][l] = l === "L1" && d.ubic ? d.ubic : null;
        if (a.ean) etiqueta(a.id, l, "Artículo nuevo");
      });
      if (a.provId) CODPROV[a.id] = { provId: a.provId, cod: d.codProv || a.provId.replace("P", "PR") + "-" + a.cod.slice(4) };
    }
    anotar(d.desde ? "Copió artículo" : "Creó artículo", a.cod + " · " + a.desc + (d.desde ? " · a partir de " + d.desde : "") + " · nace sin existencia", d.por || GENTE.compras);
    return { ok: true, a };
  }
  /* productos que llegaron en una factura de proveedor y no existen en el catálogo */
  const NUEVOS_XML = [
    { id: "NX1", provId: "P1", desc: "Tubo PVC SDR-26 1\" × 6 m", codProv: "PR1-00919", costo: 3980, cant: 120, factura: "001-00001-01-0000044712", fam: "FON", sub: "Tubería PVC", unidad: "Unid", marca: "Amanco", cabys: "3610101000000", peso: 3.1, parecido: "FER-00917", estado: "Por crear" },
    { id: "NX2", provId: "P6", desc: "Brocha 3\" cerda natural", codProv: "PR6-05318", costo: 1150, cant: 48, factura: "001-00002-01-0000009381", fam: "PIN", sub: "Accesorios de pintura", unidad: "Unid", marca: "Sur", cabys: "4292901000000", peso: 0.09, parecido: "FER-05310", estado: "Por crear" },
    { id: "NX3", provId: "P5", desc: "Llave de paso de esfera ¾\" PVC", codProv: "PR5-02205", costo: 2380, cant: 60, factura: "001-00001-01-0000021177", fam: "FON", sub: "Grifería", unidad: "Unid", marca: "Tuboplast", cabys: "3610102000000", peso: 0.21, parecido: "FER-02201", estado: "Por crear" }
  ];

  /* ═══ 8 · CARGA MASIVA CON REVISIÓN PREVIA (INV-018) ═══════════════
     Desactivada en la operación normal; se habilita con permiso, se
     revisa fila por fila y solo entran las filas sin problemas.        */
  const CARGA = {
    habilitada: false, por: null, archivo: "plantilla-articulos-proveedor-conducen.xlsx",
    filas: [
      { cod: "FER-04106", desc: "Cable THHN #14 rojo", fam: "ELE", unidad: "m", cabys: "4631001000000", costo: 268, precio: 380, marca: "Conducen" },
      { cod: "FER-04108", desc: "Cable THHN #8 negro", fam: "ELE", unidad: "m", cabys: "4631001000000", costo: 1040, precio: 1450, marca: "Conducen" },
      { cod: "FER-04226", desc: "Panel LED 24 W empotrar", fam: "ELE", unidad: "Unid", cabys: "4653001000000", costo: 8900, precio: 13400, marca: "Sylvania" },
      { cod: "FER-04220", desc: "Bombillo LED 9 W luz cálida", fam: "ELE", unidad: "Unid", cabys: "4653001000000", costo: 890, precio: 1450, marca: "Sylvania" },
      { cod: "FER-04332", desc: "Caja octogonal metálica", fam: "ELE", unidad: "Unid", cabys: "", costo: 360, precio: 540, marca: "Conduflex" },
      { cod: "FER-04312", desc: "Tubo conduit EMT ¾\" × 3 m", fam: "ELE", unidad: "Unid", cabys: "4118201000000", costo: 2640, precio: 2900, marca: "Conduflex" },
      { cod: "FER-04240", desc: "Reflector LED 50 W", fam: "ELX", unidad: "Unid", cabys: "4653001000000", costo: 7200, precio: 11900, marca: "Sylvania" },
      { cod: "FER-04110", desc: "Cable dúplex #16 blanco", fam: "ELE", unidad: "m", cabys: "4631001000000", costo: 310, precio: 450, marca: "Conducen" }
    ]
  };
  function validarFila(r) {
    const p = [];
    if (!codigoLibre(r.cod)) p.push("El código ya existe en el catálogo");
    if (!D.famById[r.fam]) p.push("La familia «" + r.fam + "» no existe");
    if (!/^\d{13}$/.test(r.cabys || "")) p.push("Falta el CABYS");
    else if (!CABYS.some(c => c.cod === r.cabys)) p.push("CABYS no vigente");
    if (D.famById[r.fam] && r.precio < pisoPrecio(r.costo, r.fam, D.tarifaDeCabys(r.cabys))) p.push("Precio por debajo del margen mínimo (" + D.famById[r.fam].min + " %)");
    return p;
  }
  function habilitarCarga(por) { CARGA.habilitada = true; CARGA.por = por || GENTE.gerente; anotar("Habilitó la carga masiva", "Hasta las 18:00 de hoy", CARGA.por); }
  function importarCarga() {
    if (!CARGA.habilitada) return null;
    let ok = 0; const malas = [];
    CARGA.filas.forEach(r => {
      if (r.importada) return;
      const p = validarFila(r);
      if (p.length) { malas.push(r); return; }
      const res = crear({ cod: r.cod, desc: r.desc, fam: r.fam, unidad: r.unidad, cabys: r.cabys, costo: r.costo, precio: r.precio, marca: r.marca, tipo: "Producto", locales: ["CD"], decimales: UNID_DEC.indexOf(r.unidad) >= 0, origen: "Carga masiva" });
      if (res.ok) { r.importada = true; ok++; }
    });
    CARGA.habilitada = false;
    anotar("Importó artículos por carga masiva", ok + " importados · " + malas.length + " devueltos para corregir · la carga quedó desactivada", CARGA.por);
    return { ok, malas: malas.length };
  }

  /* ═══ 9 · PRECIOS QUE SIGUEN AL COSTO ══════════════════════════════
     Cuando una compra entra con otro costo, el sistema propone el
     precio que conserva el margen; una persona lo aprueba y las
     etiquetas afectadas pasan a la cola de impresión.                  */
  const PRECIOS = [];
  D.compras.forEach(o => o.lineas.forEach(l => {
    const a = D.artById[l.artId];
    if (!a || Math.abs(l.var) < 2.8 || Math.abs(l.var) > 15 || PRECIOS.length >= 7 || PRECIOS.some(p => p.artId === a.id)) return;
    const costoNuevo = Math.round(a.costo * (1 + l.var / 100));
    const precioNuevo = r5(D.conIva(costoNuevo / (1 - a.margen / 100), a.tarifa));
    if (precioNuevo === a.precio) return;
    PRECIOS.push({ id: "PC" + (PRECIOS.length + 1), artId: a.id, oc: o.cons, provId: o.provId, var: l.var, costoAntes: a.costo, costoNuevo, precioAntes: a.precio, precioNuevo, estado: "Por aprobar" });
  }));
  function aprobarPrecio(id, por, precio) {
    const p = PRECIOS.find(x => x.id === id);
    if (!p || p.estado !== "Por aprobar") return null;
    const a = D.artById[p.artId];
    if (precio) p.precioNuevo = r5(precio);
    a.costo = p.costoNuevo; a.precio = p.precioNuevo;
    a.margen = +D.margenDe(a.precio, a.costo, a.tarifa).toFixed(1);
    Object.keys(D.existencias[a.id] || {}).filter(l => loc(l).tipo === "tienda").forEach(l => etiqueta(a.id, l, "Precio nuevo"));
    p.estado = "Aprobado"; p.por = (por || GENTE.compras).nom;
    anotar("Aprobó precio nuevo", a.cod + " · " + a.desc + " · ₡" + p.precioAntes + " → ₡" + p.precioNuevo, por || GENTE.compras);
    return p;
  }
  function mantenerPrecio(id, por) {
    const p = PRECIOS.find(x => x.id === id);
    if (!p || p.estado !== "Por aprobar") return null;
    p.estado = "Se mantiene"; p.por = (por || GENTE.compras).nom;
    anotar("Mantuvo el precio", D.artById[p.artId].desc + " · el margen baja por el costo nuevo", por || GENTE.compras);
    return p;
  }
  function previaMasivo(fam, pct) {
    return prods().filter(a => a.fam === fam).map(a => {
      const nuevo = r5(a.precio * (1 + pct / 100));
      return { a, antes: a.precio, nuevo, margen: +D.margenDe(nuevo, a.costo, a.tarifa).toFixed(1), bajo: nuevo < pisoPrecio(a.costo, a.fam, a.tarifa) };
    });
  }
  function aplicarMasivo(fam, pct, por) {
    const filas = previaMasivo(fam, pct).filter(r => !r.bajo);
    filas.forEach(r => {
      r.a.precio = r.nuevo; r.a.margen = r.margen;
      Object.keys(D.existencias[r.a.id] || {}).filter(l => loc(l).tipo === "tienda").forEach(l => etiqueta(r.a.id, l, "Precio nuevo"));
    });
    anotar("Cambió precios por familia", D.famById[fam].nom + " · " + (pct > 0 ? "+" : "") + pct + " % · " + filas.length + " artículos", por || GENTE.compras);
    return filas.length;
  }

  /* ═══ 10 · COMPROMETIDO: APARTADOS Y VENTAS CONTRA PEDIDO (INV-003, INV-004) ═══ */
  const cli = i => D.clientes[i % D.clientes.length];
  const APARTADOS = [
    { id: "AP1", cli: cli(2), locId: "L1", doc: "002-00001-01-0000035102", lineas: [{ cod: "FER-03771", cant: 24 }, { cod: "FER-03840", cant: 300 }], fecha: dia(11), retiro: dia(3), estado: "Apartado" },
    { id: "AP2", cli: cli(5), locId: "L2", doc: "002-00002-01-0000018844", lineas: [{ cod: "FER-01042", cant: 60 }, { cod: "FER-02218", cant: 80 }], fecha: dia(2), retiro: dia(-6), estado: "Apartado" },
    { id: "AP3", cli: cli(8), locId: "L1", doc: "002-00001-01-0000035150", lineas: [{ cod: "FER-05120", cant: 6 }], fecha: dia(9), retiro: dia(1), estado: "Apartado" },
    { id: "AP4", cli: cli(11), locId: "L3", doc: "002-00001-01-0000012290", lineas: [{ cod: "FER-00915", cant: 40 }, { cod: "FER-01120", cant: 60 }], fecha: dia(1), retiro: dia(-7), estado: "Apartado" },
    { id: "AP5", cli: cli(14), locId: "L6", doc: "002-00001-01-0000008810", lineas: [{ cod: "FER-04510", cant: 2 }, { cod: "FER-04540", cant: 3 }], fecha: dia(4), retiro: dia(-4), estado: "Apartado" }
  ];
  APARTADOS.forEach(p => p.lineas.forEach(l => { l.a = byCod(l.cod); }));
  const vencido = p => p.estado === "Apartado" && p.retiro < HOY;
  function avisarApartado(id) { const p = APARTADOS.find(x => x.id === id); if (!p) return null; p.avisado = ahora(); anotar("Avisó al cliente por WhatsApp", p.cli.nom + " · apartado " + p.doc, GENTE.bodega, p.locId); return p; }
  function liberarApartado(id) {
    const p = APARTADOS.find(x => x.id === id); if (!p) return null;
    p.lineas.forEach(l => { const e = D.stock(l.a.id, p.locId); if (e) e.comp = Math.max(0, e.comp - l.cant); });
    p.estado = "Liberado"; anotar("Liberó apartado vencido", p.cli.nom + " · " + p.doc, GENTE.bodega, p.locId); return p;
  }
  function entregarApartado(id) {
    const p = APARTADOS.find(x => x.id === id); if (!p) return null;
    p.lineas.forEach(l => { const e = D.stock(l.a.id, p.locId); if (e) e.comp = Math.max(0, e.comp - l.cant); D.mover(l.a.id, p.locId, -l.cant, "Venta", p.doc, ahora(), "Entrega de apartado"); });
    p.estado = "Entregado"; anotar("Entregó apartado", p.cli.nom + " · " + p.doc, GENTE.bodega, p.locId); return p;
  }
  /* ventas hechas sin existencia: quedan en negativo hasta que entra la compra */
  const ocDe = cod => D.compras.find(o => o.estado !== "Aplicada" && o.lineas.some(l => D.artById[l.artId].cod === cod));
  const CONTRA = [
    { id: "VP1", cod: "FER-01890", locId: "L3", cant: 40, cli: cli(3), doc: "002-00001-01-0000012277", fecha: dia(4), estado: "Esperando la compra" },
    { id: "VP2", cod: "FER-03810", locId: "L6", cant: 6, cli: cli(7), doc: "002-00001-01-0000008797", fecha: dia(2), estado: "Llegó · por despachar" },
    { id: "VP3", cod: "FER-04225", locId: "L7", cant: 2, cli: cli(9), doc: "002-00001-01-0000004410", fecha: dia(1), estado: "Esperando la compra" },
    { id: "VP4", cod: "FER-01042", locId: "L5", cant: 25, cli: cli(12), doc: "002-00001-01-0000006135", fecha: dia(3), estado: "Esperando la compra" }
  ];
  CONTRA.forEach(v => {
    v.a = byCod(v.cod);
    const o = ocDe(v.cod); v.oc = o ? o.cons : null;
    const e = D.existencias[v.a.id][v.locId] || (D.existencias[v.a.id][v.locId] = { cant: 0, comp: 0, min: 6 });
    if (v.estado !== "Llegó · por despachar") { e.cant = Math.min(e.cant, 0) - v.cant; e.comp = 0; }
    if (!UB[v.a.id]) UB[v.a.id] = {};
    if (UB[v.a.id][v.locId] === undefined) UB[v.a.id][v.locId] = v.a.ubic;
  });
  function despacharContra(id) {
    const v = CONTRA.find(x => x.id === id); if (!v || v.estado !== "Llegó · por despachar") return null;
    v.estado = "Despachado"; anotar("Despachó venta contra pedido", v.a.desc + " · " + v.cli.nom, GENTE.bodega, v.locId); return v;
  }
  function negativos(locId) {
    const out = [];
    prods().forEach(a => Object.keys(D.existencias[a.id] || {}).forEach(l => {
      const e = D.existencias[a.id][l];
      if (e.cant < 0 && (!locId || l === locId)) out.push({ a, locId: l, e, venta: CONTRA.find(v => v.a.id === a.id && v.locId === l) });
    }));
    return out;
  }

  /* ═══ 11 · PRODUCTO DE SEGUNDA Y DEVOLUCIONES (INV-009, INV-010) ══ */
  const precioSegunda = a => r5(D.conIva(a.costo / (1 - POL.margenSegunda / 100), a.tarifa));
  const SEGUNDA = [
    { id: "SG1", cod: "FER-03771", locId: "L1", cant: 4, motivo: "Rayadas en la descarga del camión", fotos: 2, fecha: dia(1), estado: "Por aprobar", por: "Randall Mata Brenes" },
    { id: "SG2", cod: "FER-04225", locId: "L2", cant: 1, motivo: "Le falta la tornillería de montaje", fotos: 1, fecha: dia(0), estado: "Por aprobar", por: "Katherine Vargas Soto" },
    { id: "SG3", cod: "FER-05124", locId: "L3", cant: 2, motivo: "Cubeta abollada, sellada", fotos: 2, fecha: dia(6), estado: "A la venta", por: "Marta Rojas Picado", aprobo: "Adrián Vindas Mora" },
    { id: "SG4", cod: "FER-01890", locId: "CD", cant: 18, motivo: "Esquina quebrada en la tarima", fotos: 3, fecha: dia(9), estado: "Vendido", por: "Jonathan Ureña Salas", aprobo: "Adrián Vindas Mora" }
  ];
  SEGUNDA.forEach(s => { s.a = byCod(s.cod); s.precio = precioSegunda(s.a); });
  function aprobarSegunda(id, por, precio) {
    const s = SEGUNDA.find(x => x.id === id); if (!s || s.estado !== "Por aprobar") return null;
    if (precio) s.precio = r5(precio);
    s.estado = "A la venta"; s.aprobo = (por || GENTE.gerente).nom;
    anotar("Aprobó producto de segunda", s.a.desc + " · " + s.cant + " · ₡" + s.precio + " c/u · " + locNom(s.locId), por || GENTE.gerente, s.locId);
    return s;
  }
  function marcarSegunda(d) {
    const a = D.artById[d.artId]; if (!a) return null;
    const s = { id: "SG" + (SEGUNDA.length + 1), cod: a.cod, a, locId: d.locId, cant: +d.cant || 1, motivo: d.motivo || "Producto dañado", fotos: d.fotos || 1, fecha: ahora(), estado: "Por aprobar", por: (d.por || GENTE.bodega).nom, precio: precioSegunda(a) };
    SEGUNDA.unshift(s);
    anotar("Marcó producto de segunda", a.desc + " · " + s.cant + " · " + s.motivo, d.por || GENTE.bodega, d.locId);
    return s;
  }
  const DEVOL = [
    { id: "DV1", cod: "FER-03780", provId: "P4", cant: 3, oc: "OC-2026-004404", motivo: "Llegaron quebradas en la recepción", fecha: dia(5), estado: "Por devolver" },
    { id: "DV2", cod: "FER-04220", provId: "P8", cant: 12, oc: "OC-2026-004407", motivo: "No encienden: lote defectuoso", fecha: dia(12), estado: "Devuelto · esperando nota de crédito" },
    { id: "DV3", cod: "FER-05210", provId: "P6", cant: 2, oc: "OC-2026-004405", motivo: "Tapas sin sello de fábrica", fecha: dia(3), estado: "Por devolver" }
  ];
  DEVOL.forEach(d => { d.a = byCod(d.cod); d.monto = d.cant * d.a.costo; });
  function devolver(id) {
    const d = DEVOL.find(x => x.id === id); if (!d || d.estado !== "Por devolver") return null;
    d.estado = "Devuelto · esperando nota de crédito"; d.salio = ahora();
    anotar("Devolvió mercadería al proveedor", d.a.desc + " · " + d.cant + " · " + D.provById[d.provId].nom, GENTE.bodega, "CD");
    return d;
  }

  /* ═══ 12 · TRASLADOS (INV-006) ═════════════════════════════════════ */
  const VEHICULOS = [{ t: "Furgoneta 3", kg: 1500 }, { t: "Camión 5", kg: 8000 }, { t: "Cabezal 12", kg: 24000 }];
  const vehiculoPara = kg => (VEHICULOS.find(v => v.kg >= kg) || VEHICULOS[2]).t;
  const CHOFER = { "Furgoneta 3": "Wilberth Araya", "Camión 5": "Greivin Sánchez", "Cabezal 12": "Esteban Quirós" };
  const peso = lineas => lineas.reduce((s, l) => { const a = D.artById[l.artId]; return s + (a ? (a.peso || 0) * l.cant : 0); }, 0);
  /* lo que cada tienda vende en un mes normal: base del sugerido del CEDI (INV-021) */
  const VTA = {};
  const FACT_LOC = { L1: 1.2, L2: 1.4, L3: 0.9, L4: 0.6, L5: 0.45, L6: 1, L7: 0.5 };
  prods().forEach(a => {
    VTA[a.id] = {};
    const base = a.precio < 500 ? ri(180, 900) : a.precio < 3000 ? ri(50, 260) : a.precio < 12000 ? ri(18, 110) : ri(5, 40);
    const k = a.unidad === "m" ? 6 : a.unidad === "m³" ? 0.08 : a.unidad === "kg" ? 2 : 1;
    D.tiendas.forEach(l => { if (D.existencias[a.id][l.id]) VTA[a.id][l.id] = Math.max(1, Math.round(base * k * FACT_LOC[l.id])); });
  });
  const ventaMes = (artId, locId) => locId === "CD"
    ? Object.values(VTA[artId] || {}).reduce((s, x) => s + x, 0)
    : (VTA[artId] || {})[locId] || 0;
  function sugeridoCedi() {
    return D.tiendas.map(l => {
      const lineas = [];
      prods().forEach(a => {
        const e = D.existencias[a.id][l.id], cd = D.existencias[a.id].CD;
        if (!e || !cd) return;
        const disp = e.cant - e.comp, cdDisp = cd.cant - cd.comp;
        if (disp >= e.min || cdDisp <= 0) return;
        const quince = Math.ceil(ventaMes(a.id, l.id) / 2);
        const cant = Math.min(cdDisp, Math.max(e.min * 2 - disp, quince - disp));
        if (cant > 0) lineas.push({ artId: a.id, a, disp, min: e.min, cant: a.decimales ? Math.round(cant) : Math.ceil(cant), cdDisp });
      });
      const kg = peso(lineas);
      return { loc: l, lineas, kg, veh: vehiculoPara(kg), unidades: lineas.reduce((s, x) => s + x.cant, 0) };
    }).filter(x => x.lineas.length);
  }
  function crearTraslado(origen, destino, lineas, por) {
    D.seq.TR++;
    const cons = "TR-" + pad(D.seq.TR, 6);
    const kg = peso(lineas), veh = vehiculoPara(kg);
    const t = { id: "TR" + D.seq.TR, cons, origen, destino, fecha: ahora(), lineas: lineas.map(l => ({ artId: l.artId, cant: l.cant })), estado: "En tránsito", chofer: CHOFER[veh], vehiculo: veh, salidaAplicada: true, despacho: (por || GENTE.bodega).nom, sugerido: true };
    t.lineas.forEach(l => D.mover(l.artId, origen, -l.cant, "Traslado", cons, ahora(), "Salida hacia " + locNom(destino)));
    D.traslados.unshift(t);
    anotar("Despachó traslado", cons + " · " + locNom(origen) + " → " + locNom(destino) + " · " + t.lineas.length + " líneas · " + Math.round(kg) + " kg", por || GENTE.bodega, origen);
    return t;
  }
  const DIFS = [];
  function recibirTraslado(id, recibidos, por) {
    const t = D.traslados.find(x => x.id === id);
    if (!t || /^Recibido/.test(t.estado)) return null;
    let nd = 0;
    t.lineas.forEach(l => {
      const r = recibidos && recibidos[l.artId] != null ? +recibidos[l.artId] : l.cant;
      if (!t.salidaAplicada) D.mover(l.artId, t.origen, -l.cant, "Traslado", t.cons, ahora(), "Salida hacia " + locNom(t.destino));
      D.mover(l.artId, t.destino, r, "Traslado", t.cons, ahora(), "Recibido de " + locNom(t.origen));
      l.recibido = r;
      if (r !== l.cant) { nd++; DIFS.push({ id: "DF" + (DIFS.length + 1), t, artId: l.artId, a: D.artById[l.artId], esperado: l.cant, recibido: r, estado: "Por aclarar", fecha: ahora() }); }
    });
    t.salidaAplicada = true;
    t.estado = nd ? "Recibido con diferencias" : "Recibido";
    t.recibio = (por || GENTE.bodega).nom; t.recibidoEl = ahora();
    anotar("Recibió traslado", t.cons + " · " + locNom(t.destino) + (nd ? " · " + nd + " diferencias" : " · completo"), por || GENTE.bodega, t.destino);
    return { t, nd };
  }
  function aclararDiferencia(id, decision, por) {
    const d = DIFS.find(x => x.id === id); if (!d || d.estado !== "Por aclarar") return null;
    const falta = d.esperado - d.recibido;
    if (decision === "origen") D.mover(d.artId, d.t.origen, falta, "Traslado", d.t.cons, ahora(), "No salió del origen: regresa a su existencia");
    else if (decision === "merma") {
      const costo = Math.abs(falta) * d.a.costo;
      D.seq.AJ++;
      const cons = "AJ-" + pad(D.seq.AJ, 6);
      D.ajustes.unshift({ id: cons, cons, artId: d.artId, locId: d.t.destino, cant: 0, fecha: ahora(), motivo: "Faltante en traslado " + d.t.cons, evidencia: "Acta del chofer", autoriza: (por || GENTE.gerente).nom, costo, estado: "Aplicado" });
      D.asentar(ahora(), cons, "Faltante en traslado · " + d.a.desc, [{ cta: "6-01-03-001", debe: costo, haber: 0 }, { cta: "1-01-04-001", debe: 0, haber: costo }]);
    }
    d.estado = decision === "origen" ? "No salió del origen" : "Registrado como faltante";
    anotar("Aclaró diferencia de traslado", d.t.cons + " · " + d.a.desc + " · " + d.estado, por || GENTE.bodega, d.t.destino);
    return d;
  }
  /* un traslado de la semana llegó incompleto: el caso que la bandeja tiene que mostrar */
  (function () {
    const t = D.traslados.find(x => x.estado === "Recibido" && x.lineas.length >= 3);
    if (!t) return;
    const l = t.lineas[1];
    const r = Math.max(0, l.cant - Math.max(2, Math.round(l.cant * 0.1)));
    l.recibido = r; t.estado = "Recibido con diferencias"; t.recibio = "Yeimy Picado Cruz";
    DIFS.push({ id: "DF1", t, artId: l.artId, a: D.artById[l.artId], esperado: l.cant, recibido: r, estado: "Por aclarar", fecha: t.fecha });
  })();

  /* ═══ 13 · CONTEO DEL DÍA (INV-007, INV-008) ═══════════════════════
     Plan de 50 semanas por familia, con las prioritarias más seguido.
     Cada día el sistema arma la lista: lo del plan y lo que huele raro.
     Se cuenta a ciegas, recorriendo la tienda por pasillo.             */
  const FAM_CONTEO = D.familias.filter(f => !f.servicio);
  const PRIORITARIAS = ["FON", "ELE", "HER"];
  const PLAN = [];
  (function () {
    const ciclo = [];
    FAM_CONTEO.forEach(f => { ciclo.push(f.id); if (PRIORITARIAS.indexOf(f.id) >= 0) ciclo.push(f.id); });
    for (let s = 1; s <= 50; s++) PLAN.push({ semana: s, fam: ciclo[(s - 1) % ciclo.length] });
  })();
  const SEMANA = 37;
  const famSemana = () => PLAN.find(p => p.semana === SEMANA).fam;
  const exactitud = { L1: 97.8, L2: 96.4, L3: 98.1, L4: 95.2, L5: 94.6, L6: 97.1, L7: 96.9, CD: 98.6 };
  const CONTEOS = {};
  function motivosDe(a, l) {
    const m = [];
    const e = D.existencias[a.id][l];
    if (a.fam === famSemana()) m.push("Plan de la semana");
    if (e && e.cant < 0) m.push("Quedó en negativo");
    if (D.ajustes.some(x => x.artId === a.id && x.locId === l)) m.push("Tuvo ajuste este mes");
    if (a.precio >= 15000) m.push("Alto valor");
    if (ventaMes(a.id, l) >= 400) m.push("Alta rotación");
    if (D.traslados.some(t => t.destino === l && t.lineas.some(x => x.artId === a.id) && /diferencias/.test(t.estado))) m.push("Diferencia en traslado");
    return m;
  }
  function conteoDe(locId) {
    if (CONTEOS[locId]) return CONTEOS[locId];
    const items = prods().filter(a => D.existencias[a.id][locId]).map(a => ({ a, motivos: motivosDe(a, locId) }))
      .filter(x => x.motivos.length).sort((x, y) => y.motivos.length - x.motivos.length).slice(0, 14)
      .map(x => ({ a: x.a, motivos: x.motivos, ubic: ubic(x.a.id, locId), contado: null }))
      .sort((x, y) => String(x.ubic || "ZZ").localeCompare(String(y.ubic || "ZZ")));
    CONTEOS[locId] = { locId, items, estado: "Pendiente", fam: famSemana(), inicio: null, difs: [] };
    return CONTEOS[locId];
  }
  function contar(locId, artId, n) {
    const c = conteoDe(locId), it = c.items.find(x => x.a.id === artId);
    if (!it) return;
    it.contado = n === "" || n == null ? null : Math.max(0, +n);
    if (c.estado === "Pendiente") { c.estado = "En proceso"; c.inicio = ahora(); }
  }
  /* para el demo: el lector llena el conteo y deja tres diferencias creíbles */
  function llenarConteoDemo(locId) {
    const c = conteoDe(locId);
    c.items.forEach((it, i) => {
      const e = D.existencias[it.a.id][locId];
      const sis = Math.max(0, e.cant);
      it.contado = i === 1 ? Math.max(0, sis - Math.max(2, Math.round(sis * 0.06))) : i === 4 ? sis + 1 : i === 7 ? Math.max(0, sis - 1) : sis;
    });
    if (c.estado === "Pendiente") { c.estado = "En proceso"; c.inicio = ahora(); }
  }
  function causaProbable(a, locId, dif) {
    const t = D.traslados.find(x => x.destino === locId && x.estado === "En tránsito" && x.lineas.some(l => l.artId === a.id));
    if (t && dif < 0) return { t: "El traslado " + t.cons + " viene en camino y todavía no se recibe", k: "traslado" };
    const v = CONTRA.find(x => x.a.id === a.id && x.locId === locId && x.estado !== "Despachado");
    if (v) return { t: "Venta contra pedido " + v.doc + ": la existencia quedó en negativo hasta que entre la compra", k: "contra" };
    const ap = APARTADOS.find(p => p.locId === locId && p.estado === "Apartado" && p.lineas.some(l => l.a.id === a.id));
    if (ap && dif < 0) return { t: "Apartado de " + ap.cli.nom + ": revise si ya se entregó sin marcarlo", k: "apartado" };
    if (Math.abs(dif) <= 1) return { t: "Diferencia de una unidad: conviene recontar antes de ajustar", k: "recontar" };
    return { t: dif < 0 ? "Faltante sin causa en el sistema: merma, daño o pérdida" : "Sobrante: puede ser una entrada sin registrar", k: "ajuste" };
  }
  function cerrarConteo(locId, por) {
    const c = conteoDe(locId);
    c.difs = [];
    c.items.forEach(it => {
      if (it.contado == null) return;
      const e = D.existencias[it.a.id][locId];
      const sis = e.cant;
      const dif = it.contado - Math.max(0, sis);
      if (!dif) return;
      const causa = causaProbable(it.a, locId, dif);
      c.difs.push({ id: "CD" + locId + (c.difs.length + 1), a: it.a, sis, contado: it.contado, dif, costo: Math.abs(dif) * it.a.costo, causa, estado: causa.k === "traslado" || causa.k === "contra" ? "Explicada" : "Por decidir" });
    });
    c.estado = "Cerrado"; c.cerro = (por || GENTE.bodega).nom; c.cierre = ahora();
    const cont = c.items.filter(x => x.contado != null).length;
    exactitud[locId] = +((1 - c.difs.filter(d => d.estado !== "Explicada").length / Math.max(1, cont)) * 100).toFixed(1);
    anotar("Cerró conteo del día", locNom(locId) + " · " + cont + " artículos · " + c.difs.length + " diferencias", por || GENTE.bodega, locId);
    return c;
  }
  const AJ_PEND = [];
  D.ajustes.forEach(a => { a.estado = "Aplicado"; });
  function ajustar(locId, difId, por) {
    const c = conteoDe(locId), d = c.difs.find(x => x.id === difId);
    if (!d || d.estado !== "Por decidir") return null;
    if (d.causa.k === "recontar") { d.estado = "Recontar"; return d; }
    D.seq.AJ++;
    const cons = "AJ-" + pad(D.seq.AJ, 6);
    const aj = { id: cons, cons, artId: d.a.id, locId, cant: d.dif, fecha: ahora(), motivo: d.dif < 0 ? "Faltante en conteo" : "Sobrante en conteo", evidencia: "Conteo del día", autoriza: "", costo: d.costo, estado: "Por aprobar", difId };
    if (d.costo >= POL.aprobarAjusteDesde) {
      AJ_PEND.push(aj); D.ajustes.unshift(aj); d.estado = "Esperando aprobación";
      anotar("Propuso ajuste de inventario", d.a.desc + " · " + d.dif + " · requiere gerencia", por || GENTE.bodega, locId);
    } else { aplicarAjuste(aj, por || GENTE.bodega); D.ajustes.unshift(aj); d.estado = "Ajustado"; }
    return aj;
  }
  function aplicarAjuste(aj, por) {
    D.mover(aj.artId, aj.locId, aj.cant, "Ajuste", aj.cons, ahora(), aj.motivo);
    aj.estado = "Aplicado"; aj.autoriza = (por || GENTE.bodega).nom;
    if (aj.cant < 0) D.asentar(ahora(), aj.cons, "Merma de inventario · " + D.artById[aj.artId].desc, [{ cta: "6-01-03-001", debe: aj.costo, haber: 0 }, { cta: "1-01-04-001", debe: 0, haber: aj.costo }]);
    anotar("Ajustó inventario", D.artById[aj.artId].desc + " · " + aj.cant + " · " + aj.motivo, por, aj.locId);
  }
  function aprobarAjuste(cons, por) {
    const aj = D.ajustes.find(x => x.cons === cons);
    if (!aj || aj.estado !== "Por aprobar") return null;
    aplicarAjuste(aj, por || GENTE.gerente);
    const i = AJ_PEND.indexOf(aj); if (i >= 0) AJ_PEND.splice(i, 1);
    Object.values(CONTEOS).forEach(c => c.difs.forEach(d => { if (d.id === aj.difId) d.estado = "Ajustado"; }));
    return aj;
  }
  function rechazarAjuste(cons, por) {
    const aj = D.ajustes.find(x => x.cons === cons);
    if (!aj || aj.estado !== "Por aprobar") return null;
    aj.estado = "Rechazado · recontar"; aj.autoriza = (por || GENTE.gerente).nom;
    const i = AJ_PEND.indexOf(aj); if (i >= 0) AJ_PEND.splice(i, 1);
    Object.values(CONTEOS).forEach(c => c.difs.forEach(d => { if (d.id === aj.difId) d.estado = "Recontar"; }));
    anotar("Rechazó ajuste y pidió recontar", D.artById[aj.artId].desc, por || GENTE.gerente, aj.locId);
    return aj;
  }
  /* dos ajustes grandes de la semana esperan el visto bueno de gerencia */
  [["FER-03774", "L2", -5, "Láminas dobladas por el viento en el patio", "3 fotografías"], ["FER-04560", "L1", -8, "Faltante en conteo de herramienta", "Acta de conteo"]].forEach(x => {
    const a = byCod(x[0]); if (!a) return;
    D.seq.AJ++;
    const cons = "AJ-" + pad(D.seq.AJ, 6);
    const aj = { id: cons, cons, artId: a.id, locId: x[1], cant: x[2], fecha: dia(1), motivo: x[3], evidencia: x[4], autoriza: "", costo: Math.abs(x[2]) * a.costo, estado: "Por aprobar" };
    D.ajustes.unshift(aj); AJ_PEND.push(aj);
  });

  /* ═══ 14 · SUGERIDO DE COMPRA (INV-012, INV-013, INV-021) ══════════ */
  const ATIPICAS = [
    { id: "AT1", cod: "FER-01120", cant: 2000, cli: "Municipalidad de Turrialba", motivo: "Licitación 2026LA-000031 · acueducto de La Suiza", fecha: dia(26), excluir: true },
    { id: "AT2", cod: "FER-01042", cant: 800, cli: "Constructora Vindas y Asociados S.A.", motivo: "Proyecto Condominio Las Orquídeas", fecha: dia(18), excluir: true },
    { id: "AT3", cod: "FER-00915", cant: 600, cli: "ASADA de Tucurrique", motivo: "Cambio de tubería de la red", fecha: dia(40), excluir: true },
    { id: "AT4", cod: "FER-02218", cant: 1200, cli: "Ministerio de Obras Públicas y Transportes", motivo: "Licitación de puentes cantonales", fecha: dia(33), excluir: true }
  ];
  ATIPICAS.forEach(x => { x.a = byCod(x.cod); x.normal = x.a ? ventaMes(x.a.id, "CD") : 0; });
  const TEMPORADAS = [
    { id: "T1", t: "Lluvias", meses: "setiembre a noviembre", activa: true, ajustes: { TEC: 30, FON: 10, SEG: 10 }, nota: "Canoas, láminas, impermeabilizantes y botas de hule" },
    { id: "T2", t: "Cosecha de café", meses: "setiembre a enero", activa: true, ajustes: { SEG: 15, HER: 10 }, nota: "Guantes, cuchillos y lonas para la cogida" },
    { id: "T3", t: "Zafra de caña", meses: "enero a mayo", activa: false, ajustes: { HER: 20, SEG: 20 }, nota: "Limas, machetes y guantes" },
    { id: "T4", t: "Verano", meses: "febrero a abril", activa: false, ajustes: { JAR: 25, SEG: -30 }, nota: "Mangueras y aspersores suben; las botas de hule no se venden" },
    { id: "T5", t: "Entrada a clases", meses: "enero y febrero", activa: false, ajustes: { FGE: 10, PIN: 15 }, nota: "Mantenimiento de escuelas y colegios" }
  ];
  const factorTemporada = fam => TEMPORADAS.filter(t => t.activa).reduce((f, t) => f * (1 + (t.ajustes[fam] || 0) / 100), 1);
  function enCamino(artId, locId) {
    return D.compras.filter(o => o.estado !== "Aplicada" && o.locId === locId).reduce((s, o) => s + o.lineas.filter(l => l.artId === artId).reduce((x, l) => x + l.cant, 0), 0);
  }
  function sugerido(p) {
    const locId = p.locId || "CD", dias = +p.dias || 30;
    let arts = prods().filter(a => D.existencias[a.id][locId]);
    if (p.fam && p.fam !== "all") arts = arts.filter(a => a.fam === p.fam);
    if (p.provs && p.provs.length) arts = arts.filter(a => p.provs.indexOf(a.provId) >= 0);
    return arts.map(a => {
      const normal = ventaMes(a.id, locId);
      const atip = ATIPICAS.filter(x => x.a && x.a.id === a.id);
      const atipIncl = atip.filter(x => !x.excluir || p.excluirAtipicas === false).reduce((s, x) => s + x.cant, 0);
      const atipExcl = atip.filter(x => x.excluir && p.excluirAtipicas !== false).reduce((s, x) => s + x.cant, 0);
      const fT = p.temporadas === false ? 1 : factorTemporada(a.fam);
      const mes = (normal + atipIncl) * fT;
      const diaria = mes / 30;
      const lead = LEAD[a.provId] || 5;
      const e = D.existencias[a.id][locId];
      const exist = e.cant - e.comp;
      const camino = enCamino(a.id, locId);
      const pc = presCompra(a);
      const falta = diaria * (dias + lead) - exist - camino;
      const sug = falta > 0 ? Math.ceil(falta / pc.f) * pc.f : 0;
      const cob = diaria ? Math.floor(Math.max(0, exist + camino) / diaria) : 999;
      return { a, normal, atipExcl, atipIncl, fT, diaria, lead, exist, camino, sug, pc, cob, costo: sug * a.costo, kg: sug * (a.peso || 0) };
    }).filter(x => x.sug > 0).sort((x, y) => x.cob - y.cob);
  }
  function crearOrdenes(filas, locId, por) {
    const grupos = {};
    filas.forEach(f => { const pid = f.a.provId || "P1"; (grupos[pid] = grupos[pid] || []).push(f); });
    const ocs = Object.keys(grupos).map(pid => D.crearOC(pid, locId || "CD", grupos[pid].map(f => ({ a: f.a.id, c: f.sug, v: 0 })), "Registrada", ahora()));
    anotar("Convirtió el sugerido en órdenes de compra", ocs.length + " órdenes · " + filas.length + " artículos", por || GENTE.compras, locId);
    return ocs;
  }

  /* ═══ 15 · PENDIENTES DE BODEGA ════════════════════════════════════
     Lo que requiere a una persona hoy. Todo lo demás corre solo.       */
  function pendientes(locId, locConteo) {
    const L = l => !locId || l === locId;
    const P = [];
    const add = o => { if (o.n) P.push(o); };
    const tr = D.traslados.filter(t => (t.estado === "En tránsito" || t.estado === "Registrado") && L(t.destino));
    add({ id: "tr", grupo: "Recibir y despachar", k: "wa", ic: "truck", n: tr.length, t: tr.length + " traslado" + (tr.length === 1 ? "" : "s") + " por recibir", d: tr.slice(0, 3).map(t => t.cons + " desde " + locNom(t.origen)).join(" · "), ir: "traslados|camino", btn: "Recibir" });
    const df = DIFS.filter(d => d.estado === "Por aclarar" && L(d.t.destino));
    add({ id: "df", grupo: "Recibir y despachar", k: "cr", ic: "alert", n: df.length, t: df.length + " diferencia" + (df.length === 1 ? "" : "s") + " en traslados recibidos", d: df.map(d => d.a.desc + ": llegaron " + d.recibido + " de " + d.esperado).join(" · "), ir: "traslados|camino", btn: "Aclarar" });
    const sg = sugeridoCedi().filter(x => L(x.loc.id));
    add({ id: "sg", grupo: "Recibir y despachar", k: "in", ic: "sparkle", n: sg.length, t: "Traslado sugerido del CEDI listo para " + sg.length + " tienda" + (sg.length === 1 ? "" : "s"), d: sg.slice(0, 3).map(x => x.loc.nom + " · " + x.lineas.length + " artículos").join(" · "), ir: "traslados|sugerido", btn: "Revisar" });
    const cp = CONTRA.filter(v => v.estado === "Llegó · por despachar" && L(v.locId));
    add({ id: "cp", grupo: "Recibir y despachar", k: "wa", ic: "route", n: cp.length, t: cp.length + " venta" + (cp.length === 1 ? " contra pedido ya llegó" : "s contra pedido ya llegaron") + ": despachar al cliente", d: cp.map(v => v.a.desc + " · " + v.cli.nom).join(" · "), ir: "existencias|comprometido", btn: "Despachar" });
    const dv = DEVOL.filter(d => d.estado === "Por devolver");
    if (!locId || locId === "CD") add({ id: "dv", grupo: "Recibir y despachar", k: "in", ic: "swap", n: dv.length, t: dv.length + " devolucion" + (dv.length === 1 ? "" : "es") + " al proveedor en la bodega de devoluciones", d: dv.map(d => d.a.desc + " · " + D.provById[d.provId].nom).join(" · "), ir: "existencias|segunda", btn: "Ver" });

    const lc = locId || locConteo || "L1";
    const c = conteoDe(lc);
    if (c.estado !== "Cerrado") add({ id: "ct", grupo: "Contar y ajustar", k: "in", ic: "check", n: c.items.length, t: "Conteo de hoy en " + locNom(lc) + ": " + c.items.length + " artículos", d: "Familia de la semana: " + D.famById[c.fam].nom + ", más lo que quedó en negativo, tuvo ajustes o es de alto valor", ir: "ajustes|conteo", btn: c.estado === "En proceso" ? "Continuar" : "Empezar" });
    const ap = AJ_PEND.filter(a => L(a.locId));
    add({ id: "aj", grupo: "Contar y ajustar", k: "wa", ic: "shield", n: ap.length, t: ap.length + " ajuste" + (ap.length === 1 ? " espera" : "s esperan") + " aprobación de gerencia", d: "Pasan de ₡" + String(POL.aprobarAjusteDesde).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ": " + ap.map(a => D.artById[a.artId].desc).join(" · "), ir: "ajustes|ajustes", btn: "Revisar" });
    const ng = negativos(locId).filter(x => !x.venta);
    add({ id: "ng", grupo: "Contar y ajustar", k: "cr", ic: "alert", n: ng.length, t: ng.length + " artículo" + (ng.length === 1 ? "" : "s") + " en negativo sin venta contra pedido", d: ng.map(x => x.a.desc + " · " + locNom(x.locId)).join(" · "), ir: "existencias|comprometido", btn: "Ver" });

    const av = APARTADOS.filter(p => vencido(p) && L(p.locId));
    add({ id: "av", grupo: "Clientes y pedidos", k: "wa", ic: "clock", n: av.length, t: av.length + " apartado" + (av.length === 1 ? " pasó" : "s pasaron") + " la fecha de retiro", d: av.map(p => p.cli.nom + " · " + locNom(p.locId)).join(" · "), ir: "existencias|comprometido", btn: "Avisar o liberar" });
    const sgn = SEGUNDA.filter(s => s.estado === "Por aprobar" && L(s.locId));
    add({ id: "sgn", grupo: "Clientes y pedidos", k: "in", ic: "box", n: sgn.length, t: sgn.length + " producto" + (sgn.length === 1 ? " de segunda espera" : "s de segunda esperan") + " su precio", d: sgn.map(s => s.a.desc + " · " + s.motivo).join(" · "), ir: "existencias|segunda", btn: "Aprobar" });

    const pr = PRECIOS.filter(p => p.estado === "Por aprobar");
    if (!locId) add({ id: "pr", grupo: "Catálogo y precios", k: "wa", ic: "wallet", n: pr.length, t: pr.length + " precios por revisar: la compra entró con otro costo", d: pr.slice(0, 3).map(p => D.artById[p.artId].desc).join(" · "), ir: "catalogo|precios", btn: "Revisar" });
    const et = ETIQ.filter(e => L(e.locId));
    add({ id: "et", grupo: "Catálogo y precios", k: "in", ic: "print", n: et.length, t: et.length + " etiqueta" + (et.length === 1 ? "" : "s") + " de estante por imprimir", d: "Por precios nuevos, códigos nuevos y ubicaciones", ir: "catalogo|codigos", btn: "Imprimir" });
    const nx = NUEVOS_XML.filter(x => x.estado === "Por crear");
    if (!locId || locId === "CD") add({ id: "nx", grupo: "Catálogo y precios", k: "wa", ic: "file", n: nx.length, t: nx.length + " artículo" + (nx.length === 1 ? " nuevo llegó" : "s nuevos llegaron") + " en facturas de proveedor", d: nx.map(x => x.desc).join(" · "), ir: "catalogo|articulos", btn: "Crear" });
    const su = sinUbicacion(locId);
    add({ id: "su", grupo: "Catálogo y precios", k: "in", ic: "pin", n: su.length, t: su.length + " artículo" + (su.length === 1 ? "" : "s") + " sin ubicación en el estante", d: "El vendedor no los encuentra en la tienda", ir: "catalogo|codigos", btn: "Ubicar" });
    const sc = sinCodigo();
    add({ id: "sc", grupo: "Catálogo y precios", k: "in", ic: "scan", n: sc.length, t: sc.length + " artículos sin código de barras", d: "Se digitan a mano en la caja y en la recepción. En producción son cerca de 800", ir: "catalogo|codigos", btn: "Generar" });
    return P;
  }

  w.INVX = {
    GENTE, POL, LEAD, provDe, presCompra, fmtCant, UNIDADES, UNID_DEC,
    ubic, ubicTexto, ubicar, sinUbicacion, CODPROV, ETIQ, etiqueta, imprimirEtiquetas, generarCodigo, generarCodigos, agregarFoto, sinCodigo, sinFoto,
    CABYS, CABYS_ACT, sugerirCabys, cabysDesc, codigoLibre, siguienteCodigo, precioSugerido, pisoPrecio, crear, NUEVOS_XML,
    CARGA, validarFila, habilitarCarga, importarCarga,
    PRECIOS, aprobarPrecio, mantenerPrecio, previaMasivo, aplicarMasivo,
    APARTADOS, vencido, avisarApartado, liberarApartado, entregarApartado, CONTRA, despacharContra, negativos,
    SEGUNDA, aprobarSegunda, marcarSegunda, precioSegunda, DEVOL, devolver,
    VEHICULOS, vehiculoPara, peso, ventaMes, sugeridoCedi, crearTraslado, recibirTraslado, DIFS, aclararDiferencia,
    PLAN, SEMANA, famSemana, PRIORITARIAS, exactitud, conteoDe, contar, llenarConteoDemo, cerrarConteo, ajustar, AJ_PEND, aprobarAjuste, rechazarAjuste,
    ATIPICAS, TEMPORADAS, factorTemporada, enCamino, sugerido, crearOrdenes,
    pendientes, anotar
  };
})(window);
