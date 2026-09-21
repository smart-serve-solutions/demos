/* ═══════════════════════════════════════════════════════════════════
   ServeCore — datos de demostración
   Los volúmenes y las reglas vienen del levantamiento de Ferretería
   Santa Rosa (sesiones de agosto y setiembre de 2026). Las cifras son
   de ejemplo; la estructura no.
   ═══════════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";

  /* generador estable: la demo se ve igual cada vez que se abre */
  let _s = 20260913;
  const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const chance = p => rnd() < p;

  const HOY = new Date(2026, 8, 13, 11, 40); // sábado 13 de setiembre de 2026
  const dayAgo = n => new Date(HOY.getTime() - n * 86400000);

  /* ── locales ────────────────────────────────────────────────── */
  const locales = [
    { id: "L1", cod: "002", nom: "Santa Rosa", tipo: "tienda", terminales: 3, dir: "Santa Rosa de Turrialba" },
    { id: "L2", cod: "003", nom: "Turrialba", tipo: "tienda", terminales: 4, dir: "Centro de Turrialba" },
    { id: "L3", cod: "004", nom: "Pacayas", tipo: "tienda", terminales: 2, dir: "Pacayas de Alvarado" },
    { id: "L4", cod: "005", nom: "Cervantes", tipo: "tienda", terminales: 2, dir: "Cervantes de Alvarado" },
    { id: "L5", cod: "006", nom: "Pejibaye", tipo: "tienda", terminales: 1, dir: "Pejibaye de Jiménez" },
    { id: "L6", cod: "007", nom: "El Centro", tipo: "tienda", terminales: 2, dir: "Turrialba centro", sinBodega: true },
    { id: "L7", cod: "008", nom: "Tucurrique", tipo: "tienda", terminales: 1, dir: "Tucurrique de Jiménez" },
    { id: "CD", cod: "010", nom: "CEDI Isabel", tipo: "cedi", terminales: 0, dir: "La Isabel · 55 000 m²" },
    { id: "B1", cod: "011", nom: "Bodega 1", tipo: "bodega", terminales: 0, dir: "Contigua a Santa Rosa" },
    { id: "B2", cod: "012", nom: "Bodega 2", tipo: "bodega", terminales: 0, dir: "Turrialba" }
  ];
  const tiendas = locales.filter(l => l.tipo === "tienda");

  /* ── familias con su margen mínimo ──────────────────────────── */
  const familias = [
    { id: "MAT", nom: "Materiales de construcción", min: 15 },
    { id: "TEC", nom: "Techos", min: 18 },
    { id: "FON", nom: "Fontanería", min: 25 },
    { id: "ELE", nom: "Eléctrico", min: 24 },
    { id: "HER", nom: "Herramienta manual", min: 30 },
    { id: "PIN", nom: "Pinturas", min: 26 },
    { id: "FGE", nom: "Ferretería general", min: 32 },
    { id: "JAR", nom: "Jardín y riego", min: 28 },
    { id: "SEG", nom: "Seguridad industrial", min: 30 },
    { id: "TAL", nom: "Taller y servicios", min: 0, servicio: true },
    { id: "INS", nom: "Instalaciones", min: 0, servicio: true },
    { id: "LOG", nom: "Logística", min: 0, servicio: true },
    { id: "COM", nom: "Comercial", min: 0, servicio: true }
  ];
  const subcats = {
    MAT: ["Cemento y agregados", "Varilla y perfilería", "Bloques y prefabricados"],
    TEC: ["Láminas", "Perfilería de techo", "Sellos y tornillería"],
    FON: ["Tubería PVC", "Accesorios PVC", "Grifería"],
    ELE: ["Cable y alambre", "Iluminación", "Canalización"],
    HER: ["Herramienta de golpe", "Herramienta de corte", "Medición"],
    PIN: ["Látex", "Esmaltes", "Accesorios de pintura"],
    FGE: ["Tornillería", "Clavos y fijación", "Candados y cerrajería"],
    JAR: ["Riego", "Jardinería"],
    SEG: ["Protección personal"],
    TAL: ["Taller"],
    INS: ["Instalación"],
    LOG: ["Flete"],
    COM: ["Patrocinio"]
  };

  /* cod, desc, fam, sub, marca, unidad, costo, precio, cabys, ean, ubicación */
  const ART = [
    ["FER-01042", "Cemento UG gris 50 kg", "MAT", 0, "Holcim", "Saco", 7180, 8450, "3744001000100", "7501234500011", "A1-01"],
    ["FER-01045", "Cemento de alta resistencia 50 kg", "MAT", 0, "Cemex", "Saco", 7940, 9350, "3744001000100", "7501234500028", "A1-02"],
    ["FER-01060", "Arena fina lavada", "MAT", 0, "Río Reventazón", "m³", 18500, 24900, "1533001000000", "", "PATIO-1"],
    ["FER-01062", "Piedra cuartilla", "MAT", 0, "Quebrador Turrialba", "m³", 21000, 27800, "1533001000000", "", "PATIO-2"],
    ["FER-02218", "Varilla deformada #3 × 6 m", "MAT", 1, "Arcelor", "Unid", 2710, 3190, "4111201000000", "7441002100031", "B2-04"],
    ["FER-02220", "Varilla deformada #4 × 6 m", "MAT", 1, "Arcelor", "Unid", 4820, 5680, "4111201000000", "7441002100048", "B2-05"],
    ["FER-02240", "Alambre de amarre negro #16", "MAT", 1, "Arcelor", "kg", 1055, 1240, "4111301000000", "", "B2-08"],
    ["FER-01880", "Bloque de concreto 12 × 20 × 40", "MAT", 2, "Productos de Concreto", "Unid", 462, 560, "3730001000000", "", "PATIO-3"],
    ["FER-01884", "Bloque de concreto 15 × 20 × 40", "MAT", 2, "Productos de Concreto", "Unid", 588, 715, "3730001000000", "", "PATIO-3"],
    ["FER-01890", "Baldosa de concreto 40 × 40", "MAT", 2, "Prefabricados FSR", "Unid", 1180, 1590, "3730001000000", "", "PATIO-4"],

    ["FER-03771", "Lámina zinc esmaltada #26 × 3,66 m", "TEC", 0, "Metalco", "Unid", 12420, 15150, "4118101000000", "7441003770019", "C1-01"],
    ["FER-03774", "Lámina zinc esmaltada #26 × 4,88 m", "TEC", 0, "Metalco", "Unid", 16560, 20200, "4118101000000", "7441003770026", "C1-02"],
    ["FER-03780", "Lámina translúcida #26 × 3,66 m", "TEC", 0, "Ricalit", "Unid", 15900, 19800, "3610001000000", "", "C1-04"],
    ["FER-03810", "Perling 2 × 4 × 6 m", "TEC", 1, "Arcelor", "Unid", 9840, 11900, "4111401000000", "", "C2-01"],
    ["FER-03840", "Tornillo punta broca c/empaque 2½\"", "TEC", 2, "Metalco", "Unid", 62, 95, "4118901000000", "", "C3-06"],

    ["FER-00915", "Tubo PVC SDR-26 ½\" × 6 m", "FON", 0, "Amanco", "Unid", 1985, 2640, "3610101000000", "7441000915013", "D1-01"],
    ["FER-00917", "Tubo PVC SDR-26 ¾\" × 6 m", "FON", 0, "Amanco", "Unid", 2740, 3640, "3610101000000", "7441000917017", "D1-02"],
    ["FER-03220", "Tubo PVC sanitario 4\" × 6 m", "FON", 0, "Amanco", "Unid", 6480, 8620, "3610101000000", "7441003220015", "D1-08"],
    ["FER-01120", "Codo PVC 90° ½\"", "FON", 1, "Amanco", "Unid", 118, 165, "3610102000000", "", "D2-01"],
    ["FER-01122", "Tee PVC ½\"", "FON", 1, "Amanco", "Unid", 142, 198, "3610102000000", "", "D2-02"],
    ["FER-02310", "Unión PVC ½\"", "FON", 1, "Amanco", "Unid", 96, 135, "3610102000000", "", "D2-03"],
    ["FER-02455", "Reducción PVC ¾\" a ½\"", "FON", 1, "Amanco", "Unid", 168, 235, "3610102000000", "", "D2-05"],
    ["FER-01330", "Cemento solvente PVC 118 ml", "FON", 1, "Amanco", "Unid", 1640, 2290, "3520201000000", "", "D2-11"],
    ["FER-01455", "Cinta teflón ½\" × 10 m", "FON", 1, "Tuboplast", "Unid", 212, 395, "2431100000100", "7441002385017", "D2-14"],
    ["FER-06001", "Teflón líquido sellador 50 ml", "FON", 1, "Tuboplast", "Unid", 1520, 2340, "3520201000000", "", "D2-15"],
    ["FER-03004", "Llave de chorro bronce ½\"", "FON", 2, "Bronco", "Unid", 3240, 4980, "4289201000000", "", "D3-02"],
    ["FER-03118", "Sifón lavatorio PVC", "FON", 2, "Amanco", "Unid", 1095, 1620, "3610102000000", "", "D3-07"],
    ["FER-02201", "Válvula de paso PVC ½\"", "FON", 2, "Amanco", "Unid", 4100, 5900, "3610102000000", "", "D3-09"],

    ["FER-04101", "Cable THHN #12 negro", "ELE", 0, "Conducen", "m", 388, 520, "4631001000000", "", "E1-02"],
    ["FER-04104", "Cable THHN #10 blanco", "ELE", 0, "Conducen", "m", 612, 820, "4631001000000", "", "E1-03"],
    ["FER-04220", "Bombillo LED 9 W luz fría", "ELE", 1, "Sylvania", "Unid", 890, 1450, "4653001000000", "7441004220011", "E2-01"],
    ["FER-04225", "Panel LED 18 W sobreponer", "ELE", 1, "Sylvania", "Unid", 6400, 9800, "4653001000000", "", "E2-05"],
    ["FER-04310", "Tubo conduit EMT ½\" × 3 m", "ELE", 2, "Conduflex", "Unid", 1980, 2740, "4118201000000", "", "E3-01"],
    ["FER-04330", "Caja rectangular metálica", "ELE", 2, "Conduflex", "Unid", 340, 520, "4118201000000", "", "E3-04"],

    ["FER-04502", "Disco de corte 4½\" metal", "HER", 1, "Bosch", "Unid", 940, 1380, "4292101000000", "7441004502016", "F1-03"],
    ["FER-04510", "Martillo de uña 16 oz", "HER", 0, "Truper", "Unid", 4200, 6900, "4291101000000", "7501206645013", "F1-08"],
    ["FER-04520", "Juego de destornilladores 6 pzas", "HER", 0, "Truper", "Juego", 5800, 9400, "4291101000000", "", "F1-12"],
    ["FER-04540", "Cinta métrica 5 m", "HER", 2, "Truper", "Unid", 2100, 3450, "4291101000000", "7501206640018", "F2-02"],
    ["FER-04560", "Nivel de burbuja 24\"", "HER", 2, "Stanley", "Unid", 6900, 11200, "4291101000000", "", "F2-05"],

    ["FER-05120", "Pintura látex blanco cubeta 3,78 L", "PIN", 0, "Sur", "Cubeta", 15400, 21400, "3511101000000", "7441005120014", "G1-01"],
    ["FER-05124", "Pintura látex hueso cubeta 3,78 L", "PIN", 0, "Sur", "Cubeta", 15400, 21400, "3511101000000", "", "G1-02"],
    ["FER-05210", "Esmalte anticorrosivo negro 1 gl", "PIN", 1, "Protecto", "Galón", 18900, 26800, "3511101000000", "", "G2-01"],
    ["FER-05310", "Rodillo felpa 9\" con mango", "PIN", 2, "Sur", "Unid", 1650, 2790, "4292901000000", "", "G3-03"],

    ["FER-07010", "Tornillo autorroscante #8 × 1\"", "FGE", 0, "Fixer", "Unid", 22, 38, "4118901000000", "", "H1-01"],
    ["FER-07040", "Clavo de acero 2½\"", "FGE", 1, "Arcelor", "kg", 1180, 1750, "4118901000000", "", "H1-06"],
    ["FER-07120", "Candado de 50 mm", "FGE", 2, "Yale", "Unid", 3900, 6200, "4289301000000", "", "H2-02"],

    ["FER-08010", "Manguera jardín ½\" × 15 m", "JAR", 0, "Amanco", "Unid", 5640, 8200, "3610103000000", "", "I1-01"],
    ["FER-08040", "Aspersor plástico giratorio", "JAR", 0, "Amanco", "Unid", 1980, 2950, "3610103000000", "", "I1-04"],

    ["FER-09010", "Casco de seguridad blanco", "SEG", 0, "Steelpro", "Unid", 4200, 6400, "2822001000000", "", "J1-01"],
    ["FER-09020", "Guante de nitrilo talla L", "SEG", 0, "Steelpro", "Par", 980, 1650, "2822001000000", "", "J1-04"]
  ];

  /* peso unitario en kilogramos: lo usa la caja para el flete y la carga del vehículo */
  const PESO = {
    "FER-01042": 50, "FER-01045": 50, "FER-01060": 1450, "FER-01062": 1500,
    "FER-02218": 3.4, "FER-02220": 6, "FER-02240": 1, "FER-01880": 12,
    "FER-01884": 14, "FER-01890": 18, "FER-03771": 9.1, "FER-03774": 12.1,
    "FER-03780": 5.2, "FER-03810": 18.5, "FER-03840": 0.01, "FER-00915": 1.8,
    "FER-00917": 2.4, "FER-03220": 7.2, "FER-01120": 0.02, "FER-01122": 0.03,
    "FER-02310": 0.02, "FER-02455": 0.03, "FER-01330": 0.15, "FER-01455": 0.03,
    "FER-06001": 0.06, "FER-03004": 0.32, "FER-03118": 0.22, "FER-02201": 0.18,
    "FER-04101": 0.05, "FER-04104": 0.08, "FER-04220": 0.09, "FER-04225": 0.55,
    "FER-04310": 1.1, "FER-04330": 0.14, "FER-04502": 0.05, "FER-04510": 0.68,
    "FER-04520": 0.9, "FER-04540": 0.24, "FER-04560": 0.85, "FER-05120": 5.6,
    "FER-05124": 5.6, "FER-05210": 4.4, "FER-05310": 0.18, "FER-07010": 0.004,
    "FER-07040": 1, "FER-07120": 0.28, "FER-08010": 2.1, "FER-08040": 0.12,
    "FER-09010": 0.38, "FER-09020": 0.08
  };
  /* la medida sale de la propia descripción: el catálogo no la repite a mano */
  const medidaDe = d => {
    const m = d.match(/×\s*([\d.,]+\s*(?:m|cm|mm|L|kg|ml|oz|W|")\b)/i)
      || d.match(/\b([\d.,]+\s*(?:m|cm|mm|L|kg|ml|oz|W)\b)(?!\w)/i);
    return m ? m[1].replace(/\s+/g, " ") : "";
  };

  const articulos = ART.map((a, i) => ({
    id: "A" + (i + 1),
    cod: a[0], desc: a[1], nom: a[1], fam: a[2], sub: subcats[a[2]][a[3]], marca: a[4], unidad: a[5],
    costo: a[6], precio: a[7], cabys: a[8], ean: a[9], ubic: a[10],
    tipo: "Producto", peso: PESO[a[0]] || 0, medida: medidaDe(a[1]),
    margen: +(((a[7] - a[6]) / a[7]) * 100).toFixed(1)
  }));

  /* servicios: el catálogo no es solo mercadería — mano de obra, taller, flete
     y patrocinios se cotizan y se facturan con el mismo cuerpo del documento */
  const SERVICIOS = [
    ["SRV-001", "Corte de tubo PVC o hierro", "TAL", "Taller", "Corte", 0, 800, "Taller"],
    ["SRV-002", "Duplicado de llave · cerrajería", "TAL", "Taller", "Servicio", 0, 1200, "Taller"],
    ["SRV-003", "Mano de obra — instalación de grifería", "INS", "Instalación", "Hora", 0, 8500, "Campo"],
    ["SRV-004", "Transporte y flete a domicilio", "LOG", "Flete", "Viaje", 0, 0, "Ruta"],
    ["SRV-005", "Patrocinio de evento local", "COM", "Patrocinio", "Evento", 0, 45000, "—"]
  ];
  SERVICIOS.forEach((s, i) => articulos.push({
    id: "S" + (i + 1), cod: s[0], desc: s[1], nom: s[1], fam: s[2], sub: s[3],
    marca: "—", unidad: s[4], costo: s[5], precio: s[6], cabys: "8511000000000", ean: "", ubic: s[7],
    tipo: "Servicio", peso: 0, medida: "",
    margen: s[6] ? 100 : null
  }));
  const famById = {}; familias.forEach(f => famById[f.id] = f);
  /* el precio de lista siempre respeta el margen mínimo de su familia:
     si alguien vende por debajo es por una excepción autorizada, no por el catálogo */
  articulos.forEach(a => {
    if (a.tipo === "Servicio") return;
    const min = famById[a.fam].min + 3;
    const piso = Math.ceil(a.costo / (1 - min / 100) / 5) * 5;
    if (a.precio < piso) a.precio = piso;
    a.margen = +(((a.precio - a.costo) / a.precio) * 100).toFixed(1);
  });
  const artById = {}; articulos.forEach(a => artById[a.id] = a);

  /* ── existencias por local ──────────────────────────────────── */
  const existencias = {};
  articulos.forEach(a => {
    if (a.tipo === "Servicio") return;
    existencias[a.id] = {};
    const escala = a.precio > 12000 ? 0.12 : a.precio > 3000 ? 0.5 : 1;
    locales.forEach(l => {
      if (l.tipo === "bodega" && !chance(0.35)) return;
      if (l.id === "L6" && !chance(0.7)) return;
      const base = l.tipo === "cedi" ? ri(300, 2600) : ri(8, 260);
      const cant = Math.round(base * escala);
      existencias[a.id][l.id] = {
        cant,
        comp: chance(0.25) ? ri(1, Math.max(2, Math.round(cant * 0.12))) : 0,
        min: Math.max(4, Math.round(cant * (l.tipo === "cedi" ? 0.35 : 0.4)))
      };
    });
  });
  const stock = (artId, locId) => (existencias[artId] && existencias[artId][locId]) || null;
  const stockTotal = artId => Object.values(existencias[artId] || {}).reduce((s, e) => s + e.cant, 0);
  const disp = (artId, locId) => { const e = stock(artId, locId); return e ? e.cant - e.comp : 0; };

  /* ── clientes ───────────────────────────────────────────────── */
  const CLI = [
    ["3-101-482910", "Constructora Vindas y Asociados S.A.", "Jurídica", "Maestro de obra", 4000000, 30, "Turrialba centro", "8712-4409"],
    ["1-0894-0231", "Marvin Céspedes Araya", "Física", "Maestro de obra", 900000, 15, "Santa Rosa", "8845-1120"],
    ["3-101-771204", "Desarrollos Reventazón S.A.", "Jurídica", "Constructora", 12000000, 30, "Turrialba", "2556-3300"],
    ["3-007-045612", "ASADA de Tucurrique", "Jurídica", "Institucional", 6000000, 45, "Tucurrique", "2531-8800"],
    ["1-0712-0455", "Rosa Emilia Mata Solano", "Física", "Consumidor final", 0, 0, "Pacayas", "8390-2277"],
    ["3-101-338890", "Ingeniería Quesada Ltda.", "Jurídica", "Ingeniero", 3500000, 30, "Cartago", "2591-4477"],
    ["1-1023-0876", "Luis Fernando Brenes Ureña", "Física", "Maestro de obra", 700000, 15, "Cervantes", "8611-9034"],
    ["3-004-101889", "Municipalidad de Jiménez", "Jurídica", "Institucional", 8000000, 60, "Juan Viñas", "2538-1010"],
    ["1-0655-0198", "Carlos Alberto Ramírez Mora", "Física", "Consumidor final", 0, 0, "El Centro", "8877-0912"],
    ["3-101-556201", "Techos y Estructuras del Este S.A.", "Jurídica", "Constructora", 5000000, 30, "Turrialba", "2556-9911"],
    ["1-0988-0344", "Ana Yancy Solís Vargas", "Física", "Consumidor final", 0, 0, "Pejibaye", "8422-6655"],
    ["3-102-889011", "Finca La Esperanza S.R.L.", "Jurídica", "Agropecuario", 2500000, 30, "Pejibaye", "8700-4488"],
    ["1-0433-0122", "José Manuel Alfaro Chinchilla", "Física", "Maestro de obra", 600000, 15, "Turrialba", "8355-7712"],
    ["3-101-224477", "Coopeagri R.L.", "Jurídica", "Institucional", 7000000, 45, "Turrialba", "2556-4040"]
  ];
  const clientes = CLI.map((c, i) => ({
    id: "C" + (i + 1), ced: c[0], nom: c[1], tipoCed: c[2], categoria: c[3],
    limite: c[4], plazo: c[5], dir: c[6], tel: c[7],
    saldo: 0, exonerado: c[1].indexOf("Municipalidad") === 0 || c[1].indexOf("ASADA") === 0,
    autorizados: c[2] === "Jurídica" ? ["Bodeguero de obra", "Chofer autorizado"] : [],
    desde: `${ri(2015, 2024)}`
  }));
  const cliById = {}; clientes.forEach(c => cliById[c.id] = c);

  /* ── proveedores ────────────────────────────────────────────── */
  const PROV = [
    ["3-101-023456", "Amanco Costa Rica S.A.", 30, "CR15015201001023456", "Fontanería"],
    ["3-101-004411", "Holcim Costa Rica S.A.", 15, "CR21015201001004411", "Cemento"],
    ["3-101-118820", "Arcelor Mittal C.R.", 45, "CR33015201001118820", "Acero"],
    ["3-101-667712", "Metalco S.A.", 30, "CR41015201001667712", "Techos"],
    ["3-101-990312", "Tuboplast de Costa Rica", 30, "CR52015201001990312", "Accesorios"],
    ["3-101-445509", "Grupo Sur S.A.", 30, "CR63015201001445509", "Pinturas"],
    ["3-101-772103", "Truper Costa Rica", 60, "CR74015201001772103", "Herramienta"],
    ["3-101-330277", "Conducen S.A.", 30, "CR85015201001330277", "Eléctrico"],
    ["3-101-556644", "Productos de Concreto S.A.", 30, "CR96015201001556644", "Prefabricados"]
  ];
  const proveedores = PROV.map((p, i) => ({
    id: "P" + (i + 1), ced: p[0], nom: p[1], plazo: p[2], cuenta: p[3], linea: p[4], saldo: 0
  }));
  const provById = {}; proveedores.forEach(p => provById[p.id] = p);

  /* ── catálogo contable ──────────────────────────────────────── */
  const cuentas = [
    ["1-01-01-001", "Caja general", "Activo"],
    ["1-01-02-001", "Banco Nacional cta. corriente", "Activo"],
    ["1-01-02-002", "BAC San José cta. corriente", "Activo"],
    ["1-01-03-001", "Cuentas por cobrar clientes", "Activo"],
    ["1-01-04-001", "Inventario de mercadería", "Activo"],
    ["1-01-05-001", "IVA soportado (crédito fiscal)", "Activo"],
    ["1-02-01-001", "Mobiliario y equipo", "Activo"],
    ["1-02-01-002", "Flota vehicular", "Activo"],
    ["2-01-01-001", "Cuentas por pagar proveedores", "Pasivo"],
    ["2-01-02-001", "IVA repercutido (débito fiscal)", "Pasivo"],
    ["2-01-02-002", "IVA por pagar diferido", "Pasivo"],
    ["2-01-03-001", "Cargas sociales por pagar", "Pasivo"],
    ["2-01-03-002", "Salarios por pagar", "Pasivo"],
    ["3-01-01-001", "Capital social", "Patrimonio"],
    ["3-02-01-001", "Utilidades acumuladas", "Patrimonio"],
    ["4-01-01-001", "Ventas de mercadería", "Ingreso"],
    ["4-01-02-001", "Descuentos sobre ventas", "Ingreso"],
    ["4-02-01-001", "Otros ingresos", "Ingreso"],
    ["5-01-01-001", "Costo de la mercadería vendida", "Costo"],
    ["6-01-01-001", "Salarios", "Gasto"],
    ["6-01-01-002", "Cargas sociales patronales", "Gasto"],
    ["6-01-02-001", "Combustible y transporte", "Gasto"],
    ["6-01-02-002", "Servicios públicos", "Gasto"],
    ["6-01-03-001", "Merma de inventario", "Gasto"],
    ["6-01-04-001", "Publicidad", "Gasto"]
  ].map(c => ({ cod: c[0], nom: c[1], tipo: c[2], debe: 0, haber: 0 }));
  const ctaByCod = {}; cuentas.forEach(c => ctaByCod[c.cod] = c);

  /* ── secuencias y documentos ────────────────────────────────── */
  const seq = { FE: 34800, TE: 12400, NC: 2110, ND: 340, REP: 8800, PROF: 5600, PED: 2400, OC: 4400, TR: 900, AJ: 300, AS: 12000 };
  const pad = (n, l) => String(n).padStart(l, "0");
  function consecutivo(tipo, locId, term) {
    const l = locales.find(x => x.id === locId) || locales[0];
    const codTipo = { FE: "01", ND: "02", NC: "03", TE: "04", REP: "05" }[tipo] || "01";
    seq[tipo] = (seq[tipo] || 1) + 1;
    return `${l.cod}-${pad(term || 1, 5)}-${codTipo}-${pad(seq[tipo], 10)}`;
  }
  function clave(cons) {
    const d = HOY;
    return `506${pad(d.getDate(), 2)}${pad(d.getMonth() + 1, 2)}${String(d.getFullYear()).slice(2)}3102946797${cons.replace(/-/g, "")}1${pad(ri(10000000, 99999999), 8)}`;
  }

  const IVA = 0.13;
  function totalizar(lineas) {
    let grav = 0, desc = 0, exe = 0;
    lineas.forEach(l => {
      const bruto = l.cant * l.precio;
      const d = bruto * (l.desc || 0) / 100;
      desc += d;
      if (l.exento) exe += bruto - d; else grav += bruto - d;
    });
    const iva = Math.round(grav * IVA);
    return { grav: Math.round(grav), desc: Math.round(desc), exe: Math.round(exe), iva, total: Math.round(grav + exe + iva) };
  }
  function costoLineas(lineas) {
    return lineas.reduce((s, l) => s + l.cant * (artById[l.artId] ? artById[l.artId].costo : 0), 0);
  }

  /* ── kardex ─────────────────────────────────────────────────── */
  const kardex = [];
  let kseq = 0;
  function mover(artId, locId, cant, tipo, doc, fecha, nota) {
    const e = existencias[artId] || (existencias[artId] = {});
    if (!e[locId]) e[locId] = { cant: 0, comp: 0, min: 10 };
    e[locId].cant += cant;
    kseq++;
    kardex.push({
      id: "K" + kseq, fecha: fecha || HOY, artId, locId, tipo, doc,
      entrada: cant > 0 ? cant : 0, salida: cant < 0 ? -cant : 0,
      saldo: e[locId].cant, costo: artById[artId] ? artById[artId].costo : 0, nota: nota || ""
    });
    return e[locId].cant;
  }

  /* ── asientos ───────────────────────────────────────────────── */
  const asientos = [];
  function asentar(fecha, origen, glosa, detalle) {
    seq.AS++;
    const a = { id: "AS-" + seq.AS, num: seq.AS, fecha, origen, glosa, detalle };
    detalle.forEach(d => {
      const c = ctaByCod[d.cta];
      if (c) { c.debe += d.debe || 0; c.haber += d.haber || 0; }
    });
    asientos.push(a);
    return a;
  }

  /* ── documentos de venta ────────────────────────────────────── */
  const documentos = [];
  const MEDIOS = ["Efectivo", "Tarjeta", "SINPE móvil", "Transferencia", "Cheque"];
  const VENDEDORES = ["Kevin Solano", "Marta Rojas", "Jonathan Ureña", "Sofía Camacho", "Randall Mata", "Yeimy Picado"];

  function emitir(opts) {
    const t = totalizar(opts.lineas);
    const tipo = opts.tipo || "FE";
    const cons = consecutivo(tipo, opts.locId, opts.term || 1);
    const doc = {
      id: tipo + "-" + cons.slice(-6), tipo, cons, clave: clave(cons),
      fecha: opts.fecha || HOY, locId: opts.locId, term: opts.term || 1,
      clienteId: opts.clienteId, vendedor: opts.vendedor || pick(VENDEDORES),
      lineas: opts.lineas, ...t,
      condicion: opts.condicion || "Contado", medio: opts.medio || "Efectivo",
      hacienda: opts.hacienda || "Aceptado",
      costo: costoLineas(opts.lineas),
      saldo: opts.condicion === "Crédito" ? t.total : 0,
      despacho: opts.despacho || null
    };
    doc.margen = doc.grav ? +(((doc.grav - doc.costo) / doc.grav) * 100).toFixed(1) : 0;
    documentos.unshift(doc);

    /* inventario */
    opts.lineas.forEach(l => mover(l.artId, opts.locId, -l.cant, "Venta", doc.cons, doc.fecha));

    /* contabilidad */
    const det = [];
    if (doc.condicion === "Crédito") det.push({ cta: "1-01-03-001", debe: doc.total, haber: 0 });
    else det.push({ cta: doc.medio === "Efectivo" ? "1-01-01-001" : "1-01-02-001", debe: doc.total, haber: 0 });
    det.push({ cta: "4-01-01-001", debe: 0, haber: doc.grav + doc.exe });
    det.push({ cta: doc.condicion === "Crédito" ? "2-01-02-002" : "2-01-02-001", debe: 0, haber: doc.iva });
    det.push({ cta: "5-01-01-001", debe: doc.costo, haber: 0 });
    det.push({ cta: "1-01-04-001", debe: 0, haber: doc.costo });
    asentar(doc.fecha, doc.cons, `Venta ${doc.tipo} a ${cliById[doc.clienteId] ? cliById[doc.clienteId].nom : "consumidor final"}`, det);

    if (doc.condicion === "Crédito" && cliById[doc.clienteId]) cliById[doc.clienteId].saldo += doc.total;
    return doc;
  }

  /* cartera vieja: ventas a crédito de los últimos cinco meses, para que
     la antigüedad de saldos tenga los cinco tramos con algo adentro */
  const artVenta = articulos.filter(a => a.tipo === "Producto" && a.precio < 30000);
  const conCredito = clientes.filter(c => c.limite > 0);
  for (let i = 0; i < 46; i++) {
    const cli = pick(conCredito);
    const dias = ri(12, 165);
    const f = dayAgo(dias);
    const lineas = [];
    for (let j = 0; j < ri(2, 6); j++) {
      const a = pick(artVenta);
      if (lineas.some(x => x.artId === a.id)) continue;
      lineas.push({ artId: a.id, cant: ri(2, a.precio > 8000 ? 12 : 60), precio: a.precio, desc: chance(0.2) ? pick([3, 5, 8]) : 0 });
    }
    if (!lineas.length) continue;
    const loc = pick(tiendas);
    const doc = emitir({
      tipo: "FE", locId: loc.id, term: ri(1, loc.terminales), clienteId: cli.id,
      fecha: new Date(f.getFullYear(), f.getMonth(), f.getDate(), ri(7, 17), ri(0, 59)),
      lineas, condicion: "Crédito", medio: "Crédito"
    });
    /* la mayoría ya se cobró; lo que queda es la cartera que se gestiona */
    if (chance(0.52)) { cli.saldo -= doc.saldo; doc.saldo = 0; }
    else if (chance(0.35)) { const abono = Math.round(doc.saldo * 0.6); doc.saldo -= abono; cli.saldo -= abono; }
  }

  /* histórico: siete días de operación en los siete locales */
  for (let d = 7; d >= 0; d--) {
    const fecha = dayAgo(d);
    const caida = d === 2; /* 11 de setiembre */
    tiendas.forEach(loc => {
      const base = { L1: 14, L2: 18, L3: 8, L4: 6, L5: 4, L6: 10, L7: 5 }[loc.id];
      const n = Math.max(1, Math.round(base * (caida ? 0.62 : d === 1 ? 1.25 : 1) * (d === 0 ? 0.72 : 1)));
      for (let k = 0; k < n; k++) {
        const nl = ri(1, 5);
        const lineas = [];
        for (let j = 0; j < nl; j++) {
          const a = pick(artVenta);
          if (lineas.some(x => x.artId === a.id)) continue;
          lineas.push({ artId: a.id, cant: ri(1, a.precio > 8000 ? 6 : 40), precio: a.precio, desc: chance(0.18) ? pick([3, 5, 8, 10]) : 0 });
        }
        if (!lineas.length) continue;
        const credito = chance(0.28);
        const cli = credito ? pick(clientes.filter(c => c.limite > 0)) : (chance(0.4) ? pick(clientes) : null);
        emitir({
          tipo: chance(0.14) ? "TE" : "FE",
          locId: loc.id, term: ri(1, loc.terminales),
          clienteId: cli ? cli.id : null,
          fecha: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), ri(7, 17), ri(0, 59)),
          lineas,
          condicion: credito ? "Crédito" : "Contado",
          medio: credito ? "Crédito" : pick(MEDIOS),
          hacienda: d === 0 && chance(0.04) ? "En cola" : "Aceptado"
        });
      }
    });
  }
  documentos.sort((a, b) => b.fecha - a.fecha);

  /* casos que la demo necesita mostrar */
  const forz = (art, loc, cant, comp, min) => {
    const a = articulos.find(x => x.cod === art);
    if (a) existencias[a.id][loc] = { cant, comp: comp || 0, min: min || 20 };
  };
  forz("FER-01455", "L1", 86, 12, 40); forz("FER-01455", "L5", 3, 3, 20);
  forz("FER-01455", "CD", 1480, 260, 600); forz("FER-01455", "L2", 210, 0, 80);
  forz("FER-03771", "L1", 42, 6, 30); forz("FER-03771", "CD", 520, 40, 300);
  forz("FER-00915", "L1", 118, 4, 60); forz("FER-00915", "CD", 610, 20, 400);
  forz("FER-01042", "L1", 240, 40, 150); forz("FER-01042", "CD", 1240, 0, 800);
  forz("FER-02201", "L5", 0, 0, 12);
  /* la operación real llega a existencias negativas; para la demo se deja
     un solo caso deliberado y el resto se normaliza */
  articulos.forEach(a => Object.keys(existencias[a.id] || {}).forEach(l => {
    const e = existencias[a.id][l];
    if (e.cant < 0) e.cant = ri(0, Math.max(4, e.min));
    if (e.comp > e.cant) e.comp = Math.max(0, Math.round(e.cant * 0.15));
  }));
  forz("FER-02201", "L5", 0, 0, 12);


  /* notas de crédito */
  for (let i = 0; i < 6; i++) {
    const base = documentos[ri(3, 40)];
    if (!base || base.tipo === "NC") continue;
    const l = base.lineas[0];
    const lineas = [{ artId: l.artId, cant: Math.max(1, Math.round(l.cant / 2)), precio: l.precio, desc: 0 }];
    const t = totalizar(lineas);
    const cons = consecutivo("NC", base.locId, base.term);
    documentos.push({
      id: "NC-" + cons.slice(-6), tipo: "NC", cons, clave: clave(cons), fecha: dayAgo(ri(0, 5)),
      locId: base.locId, term: base.term, clienteId: base.clienteId, vendedor: base.vendedor,
      lineas, ...t, condicion: "Contado", medio: "Devolución", hacienda: "Aceptado",
      costo: costoLineas(lineas), saldo: 0, refiere: base.cons,
      concepto: pick(["Devolución de mercadería", "Descuento posterior", "Garantía", "Error de facturación"]),
      margen: 0
    });
    lineas.forEach(x => mover(x.artId, base.locId, x.cant, "Devolución", cons, HOY));
  }

  /* ── proformas y pedidos pendientes ─────────────────────────── */
  const proformas = [];
  for (let i = 0; i < 9; i++) {
    const cli = pick(clientes);
    const lineas = [];
    for (let j = 0; j < ri(2, 6); j++) { const a = pick(artVenta); if (!lineas.some(x => x.artId === a.id)) lineas.push({ artId: a.id, cant: ri(2, 30), precio: a.precio, desc: 0 }); }
    const t = totalizar(lineas);
    seq.PROF++;
    proformas.push({
      id: "PF-" + seq.PROF, cons: "PROF-" + pad(seq.PROF, 6), tipo: chance(0.4) ? "Pedido" : "Proforma",
      fecha: dayAgo(ri(0, 12)), clienteId: cli.id, locId: pick(tiendas).id, lineas, ...t,
      vence: dayAgo(ri(-10, -1)), estado: chance(0.25) ? "Vencida" : "Vigente",
      origen: chance(0.3) ? "Tienda virtual" : "Mostrador"
    });
  }

  /* ── despachos / mercadería comprometida ────────────────────── */
  const despachos = [];
  documentos.filter(d => d.tipo === "FE").slice(0, 14).forEach((d, i) => {
    if (!chance(0.55)) return;
    despachos.push({
      id: "DS-" + pad(4200 + i, 5), doc: d.cons, clienteId: d.clienteId, locId: d.locId,
      lineas: d.lineas.slice(0, ri(1, d.lineas.length)),
      estado: pick(["Pendiente de alistar", "Alistado", "En ruta", "Entregado"]),
      retiroEn: chance(0.3) ? pick(tiendas).id : d.locId,
      ruta: pick(["Turrialba centro", "Pejibaye", "Pacayas–Cervantes", "Tucurrique", "Retiro en local"]),
      vehiculo: pick(["Cabezal 12", "Cabezal 07", "Furgoneta 3", "Camión 5"]),
      fecha: dayAgo(ri(0, 3))
    });
  });

  /* ── compras y recepciones ──────────────────────────────────── */
  const compras = [];
  function crearOC(provId, locId, items, estado, fecha) {
    seq.OC++;
    const lineas = items.map(it => ({ artId: it.a, cant: it.c, costo: it.k || artById[it.a].costo, var: it.v || 0 }));
    const sub = lineas.reduce((s, l) => s + l.cant * l.costo, 0);
    const oc = {
      id: "OC-" + seq.OC, cons: "OC-2026-" + pad(seq.OC, 6), provId, locId, fecha: fecha || dayAgo(ri(1, 20)),
      lineas, sub, iva: Math.round(sub * IVA), total: Math.round(sub * 1.13),
      estado: estado || "Registrada", plazo: provById[provId].plazo, recibido: 0
    };
    compras.push(oc);
    return oc;
  }
  const fonArt = articulos.filter(a => a.fam === "FON");
  const ocPrincipal = crearOC("P1", "CD", [
    { a: articulos.find(a => a.cod === "FER-00915").id, c: 600, v: 1.2 },
    { a: articulos.find(a => a.cod === "FER-00917").id, c: 400, v: 0 },
    { a: articulos.find(a => a.cod === "FER-01120").id, c: 2400, v: -0.8 },
    { a: articulos.find(a => a.cod === "FER-01122").id, c: 1800, v: 2.1 },
    { a: articulos.find(a => a.cod === "FER-01330").id, c: 300, v: 3.4 },
    { a: articulos.find(a => a.cod === "FER-01455").id, c: 1200, v: 1.4 },
    { a: articulos.find(a => a.cod === "FER-02201").id, c: 250, k: 41, v: -99 },
    { a: articulos.find(a => a.cod === "FER-02310").id, c: 2000, v: 0 },
    { a: articulos.find(a => a.cod === "FER-02455").id, c: 900, v: 1.8 },
    { a: articulos.find(a => a.cod === "FER-03118").id, c: 240, v: -1.4 },
    { a: articulos.find(a => a.cod === "FER-03220").id, c: 120, v: 3.1 },
    { a: articulos.find(a => a.cod === "FER-03004").id, c: 180, v: 2.9 },
    { a: articulos.find(a => a.cod === "FER-08010").id, c: 90, v: 5.2 }
  ], "Registrada", dayAgo(2));
  ocPrincipal.cons = "OC-2026-004412";
  ocPrincipal.facturaProv = { num: "00100001010000019887", monto: 0 };

  [["P2", "CD"], ["P3", "B1"], ["P4", "CD"], ["P6", "L2"], ["P7", "CD"], ["P8", "B1"]].forEach(([p, l]) => {
    const pool = articulos.filter(a => provById[p].linea === "Cemento" ? a.fam === "MAT"
      : provById[p].linea === "Acero" ? a.fam === "MAT"
      : provById[p].linea === "Techos" ? a.fam === "TEC"
      : provById[p].linea === "Pinturas" ? a.fam === "PIN"
      : provById[p].linea === "Herramienta" ? a.fam === "HER"
      : provById[p].linea === "Eléctrico" ? a.fam === "ELE" : true);
    const items = [];
    for (let i = 0; i < ri(3, 7); i++) { const a = pick(pool.length ? pool : articulos); if (!items.some(x => x.a === a.id)) items.push({ a: a.id, c: ri(30, 800), v: +(rnd() * 8 - 3).toFixed(1) }); }
    crearOC(p, l, items, pick(["Registrada", "Aplicada", "Aplicada", "Recibida parcial"]));
  });

  /* compras aplicadas: ingresan mercadería y generan asiento */
  compras.filter(c => c.estado === "Aplicada").forEach(oc => {
    oc.lineas.forEach(l => mover(l.artId, oc.locId, l.cant, "Compra", oc.cons, oc.fecha));
    asentar(oc.fecha, oc.cons, `Compra a ${provById[oc.provId].nom}`, [
      { cta: "1-01-04-001", debe: oc.sub, haber: 0 },
      { cta: "1-01-05-001", debe: oc.iva, haber: 0 },
      { cta: "2-01-01-001", debe: 0, haber: oc.total }
    ]);
    provById[oc.provId].saldo += oc.total;
  });

  /* ── comprobantes electrónicos recibidos de proveedores ─────── */
  const recibidos = [];
  for (let i = 0; i < 52; i++) {
    const p = pick(proveedores);
    const monto = ri(120000, 9800000);
    const dias = ri(0, 9);
    recibidos.push({
      id: "R" + i, clave: "506" + pad(ri(1, 28), 2) + "092631" + p.ced.replace(/-/g, "") + pad(ri(1, 999999), 6),
      provId: p.id, fecha: dayAgo(dias), monto, iva: Math.round(monto * 0.13 / 1.13),
      tipo: chance(0.86) ? "Factura electrónica" : chance(0.5) ? "Nota de crédito" : "Tiquete electrónico",
      estado: i < 47 ? "Sin aceptar" : pick(["Aceptado", "Aceptado parcial", "Rechazado"]),
      venceEn: 8 - dias,
      ocLigada: chance(0.6) ? pick(compras).cons : null
    });
  }

  /* ── cuentas por pagar ──────────────────────────────────────── */
  const cxp = [];
  proveedores.forEach(p => {
    for (let i = 0; i < ri(2, 5); i++) {
      const monto = ri(300000, 12000000);
      const emit = ri(1, 55);
      cxp.push({
        id: "CP" + cxp.length, provId: p.id, doc: "FE-" + pad(ri(100000, 999999), 6),
        fecha: dayAgo(emit), vence: dayAgo(emit - p.plazo), monto, saldo: chance(0.25) ? Math.round(monto * 0.4) : monto,
        dias: emit - p.plazo
      });
      p.saldo += monto;
    }
  });

  /* ── nómina ─────────────────────────────────────────────────── */
  const PUESTOS = [
    ["Gerente general", 1850000], ["Contador general", 1250000], ["Encargado de TI", 1100000],
    ["Jefe de proveeduría", 980000], ["Jefe de bodega", 820000], ["Administrador de local", 760000],
    ["Vendedor de piso", 545000], ["Cajero", 512000], ["Bodeguero", 498000],
    ["Chofer", 560000], ["Mecánico", 640000], ["Misceláneo", 462000]
  ];
  const NOMBRES = ["Adrián Vindas Mora", "Sonia Calderón Ruiz", "Andrey Ramírez Solano", "Óscar Jiménez Ureña",
    "Kevin Solano Mata", "Marta Rojas Picado", "Jonathan Ureña Salas", "Sofía Camacho Vega",
    "Randall Mata Brenes", "Yeimy Picado Cruz", "Wilberth Araya Mora", "Greivin Sánchez Loría",
    "Katherine Vargas Soto", "Esteban Quirós Mena", "Marvin Zúñiga Alfaro", "Priscilla Núñez Rojas",
    "Álvaro Cordero Vindas", "Dennis Fallas Chacón"];
  const colaboradores = NOMBRES.map((n, i) => {
    const p = PUESTOS[Math.min(i, PUESTOS.length - 1)] || pick(PUESTOS);
    const puesto = i < PUESTOS.length ? p : pick(PUESTOS);
    return {
      id: "E" + (i + 1), nom: n, ced: `${ri(1, 3)}-${pad(ri(400, 1200), 4)}-${pad(ri(1, 999), 4)}`,
      puesto: puesto[0], salario: puesto[1] + ri(-20000, 40000),
      locId: pick(locales).id, ingreso: `${ri(2012, 2025)}-${pad(ri(1, 12), 2)}-${pad(ri(1, 28), 2)}`,
      cuenta: "CR" + ri(10, 99) + "015108410" + pad(ri(1, 999999), 6),
      jornada: pick(["Diurna", "Diurna", "Mixta"])
    };
  });

  /* ── conversaciones del agente de WhatsApp ──────────────────── */
  const waThreads = [
    {
      id: "W1", nom: "Marvin Céspedes", tel: "8845-1120", clienteId: "C2", estado: "Atendido por el agente", hora: "11:32",
      msgs: [
        { de: "cli", t: "Buenas, tienen cinta teflón de 1/2?", h: "11:28" },
        { de: "bot", t: "Buenos días don Marvin. Sí. Cinta teflón ½\" × 10 m, código FER-01455, a ₡395 con IVA incluido.", h: "11:28" },
        { de: "bot", t: "Disponible ahora: Santa Rosa 74 · Turrialba 210 · Pacayas 40. En Pejibaye está agotada.", h: "11:28" },
        { de: "cli", t: "Perfecto, aparteme 50 en Santa Rosa", h: "11:30" },
        { de: "bot", t: "Listo. Aparté 50 unidades en Santa Rosa a nombre suyo, reserva RS-00418, vence hoy a las 6:00 p.m. Total ₡19 750.", h: "11:31" },
        { de: "bot", t: "¿Se lo dejo como pedido para pasar a caja, o le genero el enlace de pago SINPE?", h: "11:31" }
      ]
    },
    {
      id: "W2", nom: "Desarrollos Reventazón", tel: "2556-3300", clienteId: "C3", estado: "Escalado a persona", hora: "10:54",
      msgs: [
        { de: "cli", t: "Necesito cotización de 400 varillas #4 y 120 sacos de cemento para entrega el lunes en Turrialba", h: "10:41" },
        { de: "bot", t: "Con gusto. Varilla #4 × 6 m a ₡5 680 y cemento UG 50 kg a ₡8 450, precios con IVA.", h: "10:42" },
        { de: "bot", t: "400 varillas: hay 180 en CEDI Isabel y 240 en Bodega 1. Alcanza. 120 sacos: hay 1 240 en el CEDI.", h: "10:42" },
        { de: "bot", t: "El monto pasa de ₡3 200 000 y su categoría tiene precio negociado. Le paso con proveeduría para confirmar el precio y el transporte.", h: "10:43" },
        { de: "sys", t: "Escalado a Óscar Jiménez (Jefe de proveeduría) · esperando respuesta hace 11 min", h: "10:43" }
      ]
    },
    {
      id: "W3", nom: "Ana Yancy Solís", tel: "8422-6655", clienteId: "C11", estado: "Transferencia validada", hora: "10:12",
      msgs: [
        { de: "cli", t: "Ya hice la transferencia de la factura de ayer", h: "10:06" },
        { de: "cli", t: "[comprobante_bn.jpg]", h: "10:06", img: true },
        { de: "bot", t: "Recibido. Leí ₡184 600 del Banco Nacional, referencia 88301442, a nombre de Ana Yancy Solís Vargas.", h: "10:07" },
        { de: "bot", t: "Corresponde a la factura 006-00001-01-0000034790. Lo pasé a validación.", h: "10:07" },
        { de: "sys", t: "Validado por Sonia Calderón (Contabilidad) a las 10:11", h: "10:11" },
        { de: "bot", t: "Confirmado don... doña Ana Yancy, su pago quedó aplicado. Le envío el recibo electrónico de pago al correo.", h: "10:12" }
      ]
    },
    {
      id: "W4", nom: "Ingeniería Quesada Ltda.", tel: "2591-4477", clienteId: "C6", estado: "Recordatorio de cobro", hora: "09:00",
      msgs: [
        { de: "bot", t: "Buenos días. Le recordamos que la factura 003-00002-01-0000034611 por ₡1 284 300 vence el martes 16 de setiembre.", h: "09:00" },
        { de: "bot", t: "Puede pagar por SINPE al 8712-0000 o por transferencia a la cuenta CR15015201001023456. Si ya pagó, mándeme el comprobante y lo aplico.", h: "09:00" },
        { de: "cli", t: "Gracias, lo pasamos el lunes", h: "09:14" },
        { de: "bot", t: "Anotado. Le vuelvo a escribir el lunes en la tarde si no ha entrado.", h: "09:14" }
      ]
    },
    {
      id: "W5", nom: "Carlos Ramírez", tel: "8877-0912", clienteId: "C9", estado: "Atendido por el agente", hora: "08:41",
      msgs: [
        { de: "cli", t: "cuanto vale la lamina de zinc esmaltada", h: "08:39" },
        { de: "bot", t: "Lámina zinc esmaltada #26: de 3,66 m a ₡15 150 y de 4,88 m a ₡20 200, con IVA.", h: "08:40" },
        { de: "bot", t: "En El Centro hay 12 de la de 3,66 m. Si necesita más, en el CEDI hay 520 y se las bajamos mañana.", h: "08:40" },
        { de: "cli", t: "y me hacen precio por 30?", h: "08:41" },
        { de: "bot", t: "Por 30 unidades aplica el descuento por volumen de la familia Techos. Le confirmo con un vendedor porque el margen mínimo de esa familia está en 18 %.", h: "08:41" }
      ]
    },
    {
      id: "W6", nom: "Finca La Esperanza", tel: "8700-4488", clienteId: "C12", estado: "Pedido creado", hora: "07:55",
      msgs: [
        { de: "cli", t: "Buenos días, mandeme 6 rollos de manguera de 15m y 20 aspersores", h: "07:52" },
        { de: "bot", t: "Manguera ½\" × 15 m a ₡8 200 y aspersor giratorio a ₡2 950. Total ₡108 200 con IVA.", h: "07:53" },
        { de: "bot", t: "Su cuenta tiene crédito a 30 días con ₡1 840 000 disponibles. ¿Lo cargo a crédito?", h: "07:53" },
        { de: "cli", t: "Si por favor, y que salga en la ruta de Pejibaye", h: "07:54" },
        { de: "bot", t: "Listo. Pedido PED-002401 creado, cargado a crédito y asignado a la ruta de Pejibaye del lunes. Le aviso cuando salga el camión.", h: "07:55" }
      ]
    }
  ];

  /* ── usuarios, roles y bitácora ─────────────────────────────── */
  const roles = [
    { id: "R1", nom: "Gerencia", desc: "Ve todo, autoriza excepciones, no opera caja" },
    { id: "R2", nom: "Administrador de local", desc: "Opera su local completo y autoriza en su ámbito" },
    { id: "R3", nom: "Cajero", desc: "Cobra, no registra ni modifica documentos" },
    { id: "R4", nom: "Vendedor de piso", desc: "Registra la venta, no cobra" },
    { id: "R5", nom: "Proveeduría", desc: "Compras, órdenes, subasta y proveedores" },
    { id: "R6", nom: "Bodega", desc: "Recepción, traslados, conteo y merma" },
    { id: "R7", nom: "Contabilidad", desc: "Asientos, bancos, impuestos y planilla" },
    { id: "R8", nom: "TI", desc: "Administración del sistema y bitácora" }
  ];
  const PERMISOS = [
    "Facturar", "Cobrar", "Anular documento", "Vender bajo margen", "Autorizar excepciones",
    "Registrar compra", "Recibir mercadería", "Ajustar inventario", "Ver costos",
    "Exportar a Excel", "Ver contabilidad", "Administrar usuarios"
  ];
  const matriz = {
    R1: [0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0],
    R2: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0],
    R3: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    R4: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    R5: [0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0],
    R6: [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    R7: [0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0],
    R8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1]
  };
  const usuarios = colaboradores.slice(0, 14).map((c, i) => ({
    id: "U" + (i + 1), nom: c.nom, usuario: c.nom.split(" ")[0].toLowerCase() + "." + c.nom.split(" ")[1].toLowerCase(),
    rolId: i === 0 ? "R1" : i === 1 ? "R7" : i === 2 ? "R8" : i === 3 ? "R5" : i === 4 ? "R6" : pick(["R2", "R3", "R4"]),
    locId: c.locId, activo: i !== 13, ultimo: dayAgo(ri(0, 6)), doble: i < 4
  }));

  const bitacora = [];
  const ACC = [
    ["Autorizó venta bajo margen", "Lámina zinc #26 · margen −12,4 % en factura 002-00001-01-0000034821", "Alta", "18,0 %", "−12,4 %"],
    ["Modificó precio de artículo", "FER-05120 Pintura látex blanco", "Media", "₡20 900", "₡21 400"],
    ["Anuló documento", "TE 003-00002-04-0000012388", "Alta", "Aplicado", "Anulado"],
    ["Cambió límite de crédito", "Cliente Desarrollos Reventazón S.A.", "Alta", "₡8 000 000", "₡12 000 000"],
    ["Ajustó inventario por merma", "FER-05210 Esmalte anticorrosivo · 3 unidades", "Media", "42", "39"],
    ["Ingresó al módulo", "Cuentas por pagar", "Baja", "", ""],
    ["Exportó a Excel", "Listado de clientes · 78 412 registros", "Alta", "", ""],
    ["Creó usuario", "yeimy.picado · rol Cajero", "Media", "", "Activo"],
    ["Modificó margen mínimo de familia", "Familia Techos", "Alta", "20,0 %", "18,0 %"],
    ["Recibió mercadería", "OC-2026-004409 · 168 de 184 líneas", "Baja", "", ""],
    ["Aplicó nota de crédito", "NC 002-00001-03-0000002108", "Media", "", "₡84 300"],
    ["Cerró caja", "Terminal 2 · Turrialba · diferencia ₡0", "Baja", "", ""],
    ["Intento de acceso fallido", "usuario dennis.fallas · 3 intentos", "Alta", "", ""],
    ["Cambió condición de pago en la orden", "OC-2026-004412 · Amanco", "Media", "30 días", "45 días"],
    ["Generó archivo de pago al banco", "85 transferencias · ₡148 320 900", "Alta", "", ""],
    ["Rechazó comprobante de proveedor", "Clave 50612092631...", "Media", "Sin aceptar", "Rechazado"],
    ["Modificó CABYS de artículo", "FER-01455 Cinta teflón", "Alta", "2431100000000", "2431100000100"],
    ["Trasladó mercadería", "TR-000914 · CEDI → Pejibaye · 12 líneas", "Baja", "", ""]
  ];
  ACC.forEach((a, i) => {
    const u = pick(usuarios);
    bitacora.push({
      id: "BT" + i, fecha: new Date(HOY.getTime() - ri(1, 5000) * 60000),
      usuario: u.nom, rol: roles.find(r => r.id === u.rolId).nom, locId: u.locId,
      accion: a[0], detalle: a[1], sev: a[2], antes: a[3], despues: a[4],
      ip: `10.${ri(1, 9)}.${ri(1, 250)}.${ri(2, 250)}`
    });
  });
  bitacora.sort((a, b) => b.fecha - a.fecha);

  /* ── movimientos bancarios y conciliación ───────────────────── */
  const banco = [];
  for (let i = 0; i < 26; i++) {
    const dep = chance(0.55);
    const monto = ri(180000, 14000000);
    banco.push({
      id: "MB" + i, fecha: dayAgo(ri(0, 20)),
      desc: dep ? pick(["Depósito de caja Santa Rosa", "Depósito de caja Turrialba", "Transferencia recibida", "SINPE recibido", "Liquidación de datáfono"])
        : pick(["Pago a proveedor", "Planilla quincenal", "Pago de servicios", "Comisión bancaria", "Retiro de efectivo"]),
      debe: dep ? monto : 0, haber: dep ? 0 : monto,
      conciliado: chance(0.72),
      ref: pad(ri(100000, 999999), 8)
    });
  }
  banco.sort((a, b) => b.fecha - a.fecha);

  /* ── traslados ──────────────────────────────────────────────── */
  const traslados = [];
  for (let i = 0; i < 8; i++) {
    seq.TR++;
    const orig = chance(0.7) ? "CD" : "B1";
    const dest = pick(tiendas).id;
    const lineas = [];
    for (let j = 0; j < ri(2, 8); j++) { const a = pick(articulos); if (!lineas.some(x => x.artId === a.id)) lineas.push({ artId: a.id, cant: ri(5, 120) }); }
    traslados.push({
      id: "TR" + seq.TR, cons: "TR-" + pad(seq.TR, 6), origen: orig, destino: dest,
      fecha: dayAgo(ri(0, 9)), lineas, estado: pick(["En tránsito", "Recibido", "Recibido", "Registrado"]),
      chofer: pick(["Wilberth Araya", "Greivin Sánchez", "Esteban Quirós"]),
      vehiculo: pick(["Cabezal 12", "Furgoneta 3", "Camión 5"])
    });
  }

  /* ── ajustes y conteo cíclico ───────────────────────────────── */
  const ajustes = [];
  for (let i = 0; i < 10; i++) {
    seq.AJ++;
    const a = pick(articulos);
    const cant = ri(1, 12) * (chance(0.75) ? -1 : 1);
    ajustes.push({
      id: "AJ" + seq.AJ, cons: "AJ-" + pad(seq.AJ, 6), artId: a.id, locId: pick(locales).id,
      cant, fecha: dayAgo(ri(0, 14)),
      motivo: cant < 0 ? pick(["Producto quebrado", "Producto dañado por lluvia", "Merma de bodega", "Producto vencido", "Faltante en conteo"])
        : pick(["Sobrante en conteo", "Devolución sin documento", "Corrección de error de digitación"]),
      evidencia: chance(0.7) ? ri(1, 3) + " fotografías" : "Sin evidencia",
      autoriza: pick(["Óscar Jiménez", "Adrián Vindas", "Marta Rojas"]),
      costo: Math.abs(cant) * a.costo
    });
  }
  const conteos = tiendas.slice(0, 5).map((l, i) => ({
    id: "CT" + i, locId: l.id, familia: pick(familias).nom, fecha: dayAgo(ri(0, 20)),
    contados: ri(80, 420), diferencias: ri(2, 26), exactitud: +(95 + rnd() * 4.6).toFixed(1),
    estado: chance(0.6) ? "Cerrado" : "En proceso"
  }));

  /* ── rutas y tarifario ──────────────────────────────────────── */
  const rutas = [
    { id: "RT1", nom: "Turrialba centro", km: 12, entregas: 14, vehiculo: "Furgoneta 3", chofer: "Wilberth Araya", tarifa: 6500, estado: "En ruta" },
    { id: "RT2", nom: "Pejibaye", km: 34, entregas: 6, vehiculo: "Camión 5", chofer: "Greivin Sánchez", tarifa: 18500, estado: "Programada" },
    { id: "RT3", nom: "Pacayas–Cervantes", km: 41, entregas: 9, vehiculo: "Cabezal 12", chofer: "Esteban Quirós", tarifa: 24000, estado: "Programada" },
    { id: "RT4", nom: "Tucurrique", km: 28, entregas: 4, vehiculo: "Furgoneta 3", chofer: "Wilberth Araya", tarifa: 15000, estado: "Completada" },
    { id: "RT5", nom: "Santa Rosa – La Isabel", km: 8, entregas: 22, vehiculo: "Cabezal 07", chofer: "Marvin Zúñiga", tarifa: 5200, estado: "En ruta" }
  ];
  const tarifario = [
    { zona: "Turrialba centro", hasta5t: 6500, hasta10t: 11000, mas10t: 18000 },
    { zona: "Santa Rosa y alrededores", hasta5t: 5200, hasta10t: 9500, mas10t: 15000 },
    { zona: "Pacayas / Cervantes", hasta5t: 14000, hasta10t: 24000, mas10t: 38000 },
    { zona: "Pejibaye", hasta5t: 12000, hasta10t: 18500, mas10t: 30000 },
    { zona: "Tucurrique", hasta5t: 10000, hasta10t: 15000, mas10t: 26000 },
    { zona: "Fuera de cantón", hasta5t: 0, hasta10t: 0, mas10t: 0, nota: "Se cotiza" }
  ];

  /* ── indicadores derivados ──────────────────────────────────── */
  function ventasDelDia(locId) {
    const h = HOY.toDateString();
    return documentos.filter(d => (d.tipo === "FE" || d.tipo === "TE") && d.fecha.toDateString() === h && (!locId || d.locId === locId));
  }
  function serieSemana() {
    const out = [];
    for (let d = 6; d >= 0; d--) {
      const f = dayAgo(d).toDateString();
      const docs = documentos.filter(x => (x.tipo === "FE" || x.tipo === "TE") && x.fecha.toDateString() === f);
      out.push({ fecha: dayAgo(d), total: docs.reduce((s, x) => s + x.total, 0), n: docs.length, caida: d === 2 });
    }
    return out;
  }
  function ventaPorLocal() {
    return tiendas.map(l => {
      const docs = ventasDelDia(l.id);
      return { loc: l, total: docs.reduce((s, d) => s + d.total, 0), n: docs.length };
    }).sort((a, b) => b.total - a.total);
  }
  function margenPorFamilia() {
    return familias.map(f => {
      let ing = 0, cos = 0;
      documentos.forEach(d => {
        if (d.tipo !== "FE" && d.tipo !== "TE") return;
        d.lineas.forEach(l => {
          const a = artById[l.artId];
          if (!a || a.fam !== f.id) return;
          ing += l.cant * l.precio * (1 - (l.desc || 0) / 100);
          cos += l.cant * a.costo;
        });
      });
      return { fam: f, margen: ing ? +(((ing - cos) / ing) * 100).toFixed(1) : 0, ing: Math.round(ing) };
    }).filter(x => x.ing > 0).sort((a, b) => b.margen - a.margen);
  }
  function bajoMinimo() {
    const out = [];
    documentos.forEach(d => {
      if (d.tipo !== "FE" && d.tipo !== "TE") return;
      d.lineas.forEach(l => {
        const a = artById[l.artId]; if (!a) return;
        const pv = l.precio * (1 - (l.desc || 0) / 100);
        const m = ((pv - a.costo) / pv) * 100;
        if (m < famById[a.fam].min) out.push({ doc: d, art: a, margen: +m.toFixed(1), min: famById[a.fam].min, perdida: Math.round((a.costo / (1 - famById[a.fam].min / 100) - pv) * l.cant) });
      });
    });
    return out;
  }
  function quiebres() {
    const out = [];
    articulos.forEach(a => {
      Object.keys(existencias[a.id] || {}).forEach(lid => {
        const e = existencias[a.id][lid];
        if (e.cant - e.comp <= 0) out.push({ art: a, locId: lid, e, tipo: "Quiebre" });
        else if (e.cant < e.min) out.push({ art: a, locId: lid, e, tipo: "Bajo mínimo" });
      });
    });
    return out;
  }

  w.DB = {
    HOY, dayAgo, rnd, ri, pick, IVA,
    locales, tiendas, familias, famById, subcats,
    articulos, artById, SERVICIOS, existencias, stock, disp, stockTotal, kardex, mover,
    clientes, cliById, proveedores, provById,
    cuentas, ctaByCod, asientos, asentar,
    documentos, proformas, despachos, emitir, totalizar, consecutivo, clave, costoLineas,
    compras, recibidos, cxp, crearOC,
    colaboradores, waThreads, roles, PERMISOS, matriz, usuarios, bitacora,
    banco, traslados, ajustes, conteos, rutas, tarifario, seq,
    ventasDelDia, serieSemana, ventaPorLocal, margenPorFamilia, bajoMinimo, quiebres,
    VENDEDORES, MEDIOS
  };
})(window);

/* ═══════════════════════════════════════════════════════════════
   Puente con el lenguaje del rediseño
   Las pantallas hablan en singular —CATALOGO, DOCS, CLIENTES— y aquí
   se resuelven contra la base simulada, en vivo: si la caja emite una
   factura, DOCS ya la trae en la siguiente lectura.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB;
  const live = (nom, fn) => Object.defineProperty(w, nom, { get: fn, configurable: true });
  const TIPO_DOC = { FE: "Factura", TE: "Tiquete", NC: "Nota de crédito", ND: "Nota de débito", REP: "Reposición" };

  w.HOY = D.HOY;
  w.LOCALES = D.locales;
  w.TIENDAS = D.tiendas;
  w.FAMILIAS = D.familias;
  w.CATALOGO = D.articulos;
  w.EXIST = D.existencias;
  w.CLIENTES = D.clientes;
  w.PROVEEDORES = D.proveedores;
  w.WA_THREADS = D.waThreads;

  w.locNom = id => { const l = D.locales.find(x => x.id === id); return l ? l.nom : id; };
  w.locEtiqueta = l => (/^L\d+$/.test(l.id) ? "Local " + l.id.slice(1) : null);
  w.famNom = id => { const f = D.famById[id]; return f ? f.nom : id; };
  w.famMin = id => { const f = D.famById[id]; return f ? f.min : 0; };
  w.catById = id => D.artById[id];
  w.cliById = id => D.cliById[id];
  w.provById = id => D.provById[id];
  w.stockTotal = id => D.stockTotal(id);
  w.stockEnLocal = (id, locId) => { const e = D.stock(id, locId); return e ? e.cant : 0; };
  w.dispEnLocal = (id, locId) => D.disp(id, locId);
  w.catBuscar = q => {
    const t = String(q).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (!t) return [];
    return D.articulos.filter(a =>
      (a.cod + " " + a.desc + " " + a.marca + " " + (a.ean || "")).normalize("NFD")
        .replace(/[̀-ͯ]/g, "").toLowerCase().includes(t)).slice(0, 8);
  };
  w.pesoLineas = lineas => lineas.reduce((s, l) => {
    const a = D.artById[l.artId]; return s + (a ? a.peso * l.cant : 0);
  }, 0);

  live("DOCS", () => D.documentos.map(d => ({
    id: d.id, cons: d.cons, tipo: TIPO_DOC[d.tipo] || d.tipo, cliId: d.clienteId, locId: d.locId,
    vendedor: d.vendedor, total: d.total, margen: d.margen, saldo: d.saldo, fecha: d.fecha,
    estado: d.hacienda === "Aceptado" ? "Aceptada" : d.hacienda, doc: d
  })));
  live("COTIZACIONES", () => D.proformas.map(p => ({
    id: p.id, cons: p.cons, cliId: p.clienteId, locId: p.locId, total: p.total,
    estado: p.estado, items: p.lineas.length, fecha: p.fecha, doc: p
  })));
  live("DESPACHOS", () => D.despachos.map(e => {
    const r = D.rutas.find(x => x.vehiculo === e.vehiculo);
    return {
      id: e.id, cliId: e.clienteId, locId: e.locId, estado: e.estado,
      chofer: r ? r.chofer : "—", destino: e.ruta, items: e.lineas.length,
      pesoKg: Math.round(w.pesoLineas(e.lineas)), doc: e
    };
  }));
  live("COMPRAS", () => D.compras.map(o => ({
    id: o.id, cons: o.cons, provId: o.provId, locId: o.locId, estado: o.estado,
    lineas: o.lineas.length, total: o.total, doc: o
  })));
  live("CXP", () => D.cxp.slice().sort((a, b) => a.vence - b.vence));
  live("VENTA_LOCAL", () => D.ventaPorLocal().map(x => [x.loc.nom, x.total]));
  live("VENTA_7D", () => D.serieSemana().map(x => x.total));
  live("MARGEN_FAM", () => D.margenPorFamilia().map(x => ({ nom: x.fam.nom, margen: x.margen, min: x.fam.min })));
})(window);
