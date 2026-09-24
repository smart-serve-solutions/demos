/* ═══════════════════════════════════════════════════════════════════
   ServeCore — base de nómina
   Reglas costarricenses vigentes en 2026: cuotas obrero-patronales de
   la CCSS y la LPT, tramos del impuesto al salario (decreto 45333-H),
   salarios mínimos del decreto 45303-MTSS, feriados de ley, jornadas,
   cesantía y preaviso del Código de Trabajo.
   Las cifras de los colaboradores son de ejemplo; las reglas no.
   ═══════════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB;

  /* generador estable: la demo se ve igual cada vez que se abre */
  let _s = 20260917;
  const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const chance = p => rnd() < p;
  const pad = (n, l) => String(n).padStart(l, "0");
  const HOY = D.HOY;                       /* sábado 13 de setiembre de 2026 */
  const r0 = n => Math.round(n);

  /* ═══ 1 · CUOTAS OBRERO-PATRONALES 2026 ════════════════════════════
     El IVM subió 0,16 p.p. para ambas partes el 1 de enero de 2026 por
     el transitorio XI del reglamento; el ajuste rige hasta 2028.        */
  const TASAS = {
    obrero: [
      { id: "sem", t: "Seguro de Salud (SEM)", ent: "CCSS", p: 5.50 },
      { id: "ivm", t: "Invalidez, Vejez y Muerte (IVM)", ent: "CCSS", p: 4.33, nota: "subió 0,16 p.p. el 1 de enero de 2026" },
      { id: "bp", t: "Ahorro obligatorio Banco Popular", ent: "BPDC", p: 1.00 }
    ],
    patrono: [
      { id: "sem", t: "Seguro de Salud (SEM)", ent: "CCSS", p: 9.25 },
      { id: "ivm", t: "Invalidez, Vejez y Muerte (IVM)", ent: "CCSS", p: 5.58, nota: "subió 0,16 p.p. el 1 de enero de 2026" },
      { id: "fodesaf", t: "Asignaciones Familiares", ent: "FODESAF", p: 5.00 },
      { id: "imas", t: "IMAS", ent: "IMAS", p: 0.50 },
      { id: "ina", t: "INA", ent: "INA", p: 1.50, nota: "patronos con cinco o más personas" },
      { id: "ins", t: "Riesgos del trabajo", ent: "INS", p: 1.00, nota: "tarifa por actividad y siniestralidad — configurable" },
      { id: "rop", t: "Pensión complementaria (ROP)", ent: "Operadora", p: 2.00 },
      { id: "fcl", t: "Fondo de Capitalización Laboral", ent: "Operadora", p: 1.50 },
      { id: "bp", t: "Aporte patronal Banco Popular", ent: "BPDC", p: 0.50 }
    ]
  };
  const suma = a => +a.reduce((s, x) => s + x.p, 0).toFixed(2);
  TASAS.totObrero = suma(TASAS.obrero);           /* 10,83 % */
  TASAS.totPatrono = suma(TASAS.patrono);         /* 26,83 % */
  TASAS.ccssObrero = 9.83;                        /* SEM + IVM */
  TASAS.ccssPatrono = 14.83;

  /* ═══ 2 · IMPUESTO AL SALARIO — decreto 45333-H ════════════════════ */
  const TRAMOS = [
    { desde: 0, hasta: 918000, p: 0 },
    { desde: 918000, hasta: 1347000, p: 10 },
    { desde: 1347000, hasta: 2364000, p: 15 },
    { desde: 2364000, hasta: 4727000, p: 20 },
    { desde: 4727000, hasta: null, p: 25 }
  ];
  const CREDITOS = { hijo: 1710, conyuge: 2590 };
  const MIN_INEMBARGABLE = 258376.22;

  function renta(brutoMensual, hijos, conyuge) {
    let imp = 0;
    const det = [];
    TRAMOS.forEach(t => {
      const tope = t.hasta == null ? brutoMensual : Math.min(brutoMensual, t.hasta);
      const base = Math.max(0, tope - t.desde);
      const monto = base * t.p / 100;
      if (base > 0) det.push({ tramo: t, base: r0(base), monto: r0(monto) });
      imp += monto;
    });
    const credito = (hijos || 0) * CREDITOS.hijo + (conyuge ? CREDITOS.conyuge : 0);
    const bruto = r0(imp);
    return { detalle: det, impuesto: bruto, credito: Math.min(bruto, credito), creditoPleno: credito, retener: Math.max(0, bruto - credito) };
  }

  /* ═══ 3 · SALARIOS MÍNIMOS — decreto 45303-MTSS (+1,63 %) ══════════ */
  const MINIMOS = [
    { cat: "No calificado", m: 373092.30 },
    { cat: "Semicalificado", m: 411390.71 },
    { cat: "Calificado", m: 419755.80 },
    { cat: "Especializado", m: 494119.00 },
    { cat: "Bachiller", m: 664078.07 },
    { cat: "Licenciado", m: 796921.00 }
  ];
  const minimoDe = cat => (MINIMOS.find(x => x.cat === cat) || MINIMOS[0]).m;

  /* ═══ 4 · JORNADAS Y FERIADOS ══════════════════════════════════════ */
  const JORNADAS = [
    { id: "diurna", t: "Diurna", horas: 8, sem: 48, rango: "5:00 a 19:00" },
    { id: "mixta", t: "Mixta", horas: 7, sem: 42, rango: "cruza las 19:00" },
    { id: "nocturna", t: "Nocturna", horas: 6, sem: 36, rango: "19:00 a 5:00" },
    { id: "acum", t: "Acumulativa 4×3", horas: 10, sem: 48, rango: "diurna, acuerdo escrito" }
  ];
  const RECARGO_EXTRA = 50;      /* art. 139 — la hora extra se paga 1,5× */
  const TOPE_EXTRA_DIA = 4, TOPE_EXTRA_SEM = 12;

  const FERIADOS = [
    ["2026-01-01", "Año Nuevo", true],
    ["2026-04-02", "Jueves Santo", true],
    ["2026-04-03", "Viernes Santo", true],
    ["2026-04-11", "Batalla de Rivas · Juan Santamaría", true],
    ["2026-05-01", "Día Internacional del Trabajo", true],
    ["2026-07-25", "Anexión del Partido de Nicoya", true],
    ["2026-08-02", "Virgen de los Ángeles", false],
    ["2026-08-15", "Día de la Madre", true],
    ["2026-08-31", "Persona Negra y Cultura Afrocostarricense", false],
    ["2026-09-15", "Independencia", true],
    ["2026-12-01", "Abolición del Ejército", false],
    ["2026-12-25", "Navidad", true]
  ].map(f => {
    const p = f[0].split("-").map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    return { iso: f[0], fecha: d, nom: f[1], oblig: f[2], dia: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getDay()] };
  });

  /* ═══ 5 · CESANTÍA Y PREAVISO — arts. 28 y 29 ══════════════════════ */
  const CESANTIA = [
    { a: "3 a 6 meses", d: 7 }, { a: "6 meses a 1 año", d: 14 },
    { a: "1 año", d: 19.5 }, { a: "2 años", d: 20 }, { a: "3 años", d: 20.5 },
    { a: "4 años", d: 21 }, { a: "5 años", d: 21.24 }, { a: "6 años", d: 21.5 },
    { a: "7 a 9 años", d: 22 }, { a: "10 años", d: 21.5 }, { a: "11 años", d: 21 },
    { a: "12 años", d: 20.5 }, { a: "13 años o más", d: 20 }
  ];
  const diasCesantiaAnio = n => n <= 1 ? 19.5 : n === 2 ? 20 : n === 3 ? 20.5 : n === 4 ? 21
    : n === 5 ? 21.24 : n === 6 ? 21.5 : n <= 9 ? 22 : n === 10 ? 21.5 : n === 11 ? 21 : n === 12 ? 20.5 : 20;
  const PREAVISO = [
    { a: "3 a 6 meses", d: "1 semana" }, { a: "6 meses a 1 año", d: "15 días" }, { a: "más de 1 año", d: "1 mes" }
  ];
  const TOPE_CESANTIA = 8;

  /* ═══ 6 · PUESTOS Y ESTRUCTURA ═════════════════════════════════════ */
  const PUESTOS = [
    ["Gerente general", "Licenciado", 2450000, "Jefaturas", "Mensual"],
    ["Gerente administrativo", "Licenciado", 1850000, "Jefaturas", "Mensual"],
    ["Contador", "Licenciado", 1250000, "Administración", "Mensual"],
    ["Encargado de TI", "Licenciado", 1150000, "Administración", "Mensual"],
    ["Encargado de compras", "Bachiller", 850000, "Administración", "Mensual"],
    ["Encargado de planilla", "Bachiller", 700000, "Administración", "Mensual"],
    ["Encargado de local", "Especializado", 720000, "Jefaturas", "Mensual"],
    ["Asistente contable", "Bachiller", 640000, "Administración", "Quincenal"],
    ["Subencargado de local", "Calificado", 585000, "Jefaturas", "Quincenal"],
    ["Encargado de bodega", "Calificado", 560000, "Bodega", "Quincenal"],
    ["Mecánico de taller", "Especializado", 560000, "Taller", "Quincenal"],
    ["Vendedor de ruta", "Calificado", 520000, "Ventas", "Quincenal"],
    ["Asistente de compras", "Calificado", 520000, "Administración", "Quincenal"],
    ["Chofer de reparto", "Calificado", 510000, "Logística", "Semanal"],
    ["Cobrador", "Calificado", 490000, "Administración", "Quincenal"],
    ["Asesor de ventas de piso", "Calificado", 480000, "Ventas", "Quincenal"],
    ["Montacarguista", "Calificado", 470000, "Bodega", "Semanal"],
    ["Dependiente de mostrador", "Semicalificado", 450000, "Ventas", "Quincenal"],
    ["Cajero", "Semicalificado", 435000, "Ventas", "Quincenal"],
    ["Oficial de seguridad", "Semicalificado", 420000, "Servicios", "Semanal"],
    ["Bodeguero", "No calificado", 395000, "Bodega", "Semanal"],
    ["Ayudante de reparto", "No calificado", 385000, "Logística", "Semanal"],
    ["Misceláneo", "No calificado", 375000, "Servicios", "Semanal"]
  ].map(p => ({ nom: p[0], cat: p[1], base: p[2], area: p[3], planilla: p[4], minimo: minimoDe(p[1]) }));
  const puestoDe = nom => PUESTOS.find(p => p.nom === nom) || PUESTOS[PUESTOS.length - 1];

  /* ═══ 7 · COLABORADORES ════════════════════════════════════════════ */
  const PILA_H = ["Adrián", "Andrey", "Kevin", "Jonathan", "Randall", "Wilberth", "Greivin", "Esteban", "Marvin",
    "Álvaro", "Dennis", "Óscar", "José", "Luis", "Carlos", "Mauricio", "Gerardo", "Fabián", "Josué", "Diego",
    "Allan", "Bryan", "Rodolfo", "Cristian", "Steven", "Warner", "Minor", "Jeison", "Keylor", "Elián"];
  const PILA_M = ["Sonia", "Marta", "Sofía", "Yeimy", "Katherine", "Priscilla", "Grettel", "Yendry", "Marielos",
    "Xinia", "Rebeca", "Hazel", "Karol", "Melissa", "Natalia", "Jessica", "Viviana", "Silvia", "Ruth", "Andrea",
    "Fiorella", "Tatiana", "Gabriela", "Ana Lucía"];
  const AP = ["Vindas", "Calderón", "Ramírez", "Jiménez", "Solano", "Rojas", "Ureña", "Camacho", "Mata", "Picado",
    "Araya", "Sánchez", "Vargas", "Quirós", "Zúñiga", "Núñez", "Cordero", "Fallas", "Brenes", "Mora", "Salas",
    "Chacón", "Loría", "Mena", "Alfaro", "Soto", "Cruz", "Céspedes", "Granados", "Villalobos", "Aguilar", "Monge",
    "Barquero", "Chinchilla", "Retana", "Bonilla"];

  /* la plantilla fija de las primeras filas amarra la demo con el resto
     del sistema: quien aparece en la barra superior y en los usuarios */
  const FIJOS = [
    ["Adrián Vindas Mora", "Gerente general", "L2"],
    ["Sonia Calderón Ruiz", "Gerente administrativo", "L2"],
    ["Andrey Ramírez Solano", "Encargado de TI", "L2"],
    ["Óscar Jiménez Ureña", "Contador", "L2"],
    ["Priscilla Núñez Rojas", "Encargado de planilla", "L2"],
    ["Álvaro Cordero Vindas", "Encargado de compras", "CD"],
    ["Kevin Solano Mata", "Cajero", "L1"],
    ["Marta Rojas Picado", "Cajero", "L2"],
    ["Yendry Chacón Mora", "Cajero", "L3"],
    ["Esteban Vindas Salas", "Cajero", "L4"],
    ["Diego Solano Brenes", "Cajero", "L5"],
    ["Grettel Araya Mena", "Cajero", "L6"],
    ["Josué Mora Alfaro", "Cajero", "L7"],
    ["Jonathan Ureña Salas", "Encargado de local", "L1"],
    ["Sofía Camacho Vega", "Encargado de local", "L2"],
    ["Randall Mata Brenes", "Encargado de bodega", "CD"],
    ["Yeimy Picado Cruz", "Asistente contable", "L2"],
    ["Wilberth Araya Mora", "Chofer de reparto", "CD"]
  ];
  const OPERADORAS = ["BN Vital", "Popular Pensiones", "BAC Pensiones", "Vida Plena", "BCR Pensiones"];
  const BANCOS = ["Banco Nacional", "BAC Credomatic", "Banco Popular"];
  const LOCS = D.locales.map(l => l.id);

  /* IBAN costarricense válido (CR + 2 dígitos de control + 0 + banco + 14 dígitos,
     módulo 97): el archivo de planilla que se genera en Pagos al banco lo valida */
  const COD_BANCO = { "Banco Nacional": "151", "BAC Credomatic": "102", "Banco Popular": "161" };
  function ibanCR(banco, cuenta) {
    const bban = "0" + (COD_BANCO[banco] || "151") + String(cuenta).replace(/\D/g, "").padStart(14, "0").slice(-14);
    let r = 0; for (const ch of bban + "122700") r = (r * 10 + +ch) % 97;
    return "CR" + String(98 - r).padStart(2, "0") + bban;
  }
  const empleados = [];
  function nuevo(nom, puestoNom, locId, i) {
    const p = puestoDe(puestoNom);
    const antig = ri(0, 14);
    const ing = new Date(2026 - antig, ri(0, 11), ri(1, 28));
    const salario = r0((p.base + ri(-25000, 60000)) / 500) * 500;
    const hijos = chance(0.55) ? ri(1, 3) : 0;
    const conyuge = chance(0.42);
    const e = {
      id: "E" + (i + 1),
      nom, ced: `${ri(1, 7)}-${pad(ri(300, 1600), 4)}-${pad(ri(1, 999), 4)}`,
      puesto: p.nom, cat: p.cat, area: p.area, locId,
      planilla: p.planilla,
      jornada: p.area === "Servicios" && chance(0.4) ? "Nocturna" : chance(0.18) ? "Mixta" : "Diurna",
      contrato: chance(0.94) ? "Indefinido" : "Plazo fijo",
      ingreso: ing,
      salario,
      minimo: p.minimo,
      hijos, conyuge,
      banco: chance(0.72) ? "Banco Nacional" : pick(BANCOS),
      cuenta: "CR" + ri(10, 99) + "015108410" + pad(ri(1, 999999), 6),
      operadora: pick(OPERADORAS),
      solidarista: chance(0.68),
      aporteSol: 5,
      tel: "8" + ri(300, 899) + "-" + pad(ri(0, 9999), 4),
      correo: nom.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "." +
        nom.split(" ")[1].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@ferreteriasantarosa.cr",
      estado: "Activo",
      vacDisfrutadas: 0, vacSaldo: 0,
      pensionAlim: 0, embargo: 0, prestamoBP: 0, adelanto: 0,
      pruebaHasta: null
    };
    e.antiguedad = +((HOY - ing) / (365.25 * 86400000)).toFixed(2);
    e.vacSaldo = Math.min(30, r0(e.antiguedad * 12 - ri(0, 9)));
    if (e.vacSaldo < 0) e.vacSaldo = ri(0, 6);
    if (e.antiguedad < 0.25) { e.pruebaHasta = new Date(ing.getTime() + 90 * 86400000); }
    if (chance(0.07)) e.pensionAlim = r0(salario * (0.15 + rnd() * 0.15) / 1000) * 1000;
    if (chance(0.05)) e.embargo = r0(salario * 0.08 / 1000) * 1000;
    if (chance(0.22)) e.prestamoBP = r0(salario * (0.04 + rnd() * 0.06) / 1000) * 1000;
    if (chance(0.15)) e.adelanto = pick([25000, 40000, 50000, 75000, 100000]);
    e.cuenta = ibanCR(e.banco, e.cuenta);
    empleados.push(e);
    return e;
  }

  FIJOS.forEach((f, i) => nuevo(f[0], f[1], f[2], i));
  const RESTO_PUESTOS = PUESTOS.filter(p => !/Gerente|Contador|TI|planilla|compras/.test(p.nom));
  while (empleados.length < 72) {
    const i = empleados.length;
    const nom = (chance(0.55) ? pick(PILA_H) : pick(PILA_M)) + " " + pick(AP) + " " + pick(AP);
    const p = pick(RESTO_PUESTOS);
    const loc = p.area === "Bodega" || p.area === "Logística" ? pick(["CD", "B1", "B2", "CD"]) : pick(LOCS.slice(0, 7));
    nuevo(nom, p.nom, loc, i);
  }

  /* estados del día: incapacidades y vacaciones en curso */
  const empById = {}; empleados.forEach(e => empById[e.id] = e);

  /* dos salidas del mes, para que la pantalla de movimientos tenga algo real */
  const salidas = [];
  [0, 1].forEach(k => {
    const e = empleados[40 + k * 9];
    e.estado = "Inactivo";
    e.salida = new Date(2026, 8, 4 + k * 3);
    e.motivo = k === 0 ? "Despido con responsabilidad patronal" : "Renuncia";
    salidas.push(e);
  });

  /* ═══ 8 · INCAPACIDADES, VACACIONES Y PERMISOS ═════════════════════ */
  const TIPO_INC = [
    { id: "CCSS", t: "Enfermedad común (CCSS)", regla: "el patrono paga el 50 % de los primeros 3 días; la CCSS subsidia el 60 % del promedio de los últimos 3 meses desde el día 4" },
    { id: "INS", t: "Riesgos del trabajo (INS)", regla: "cubre desde el primer día; el INS reconoce el subsidio y el patrono reporta el accidente" },
    { id: "MAT", t: "Licencia de maternidad", regla: "4 meses — 1 antes y 3 después del parto; se paga 50 % patrono y 50 % CCSS" }
  ];
  const incapacidades = [];
  const MOTIVOS = ["Gripe y faringitis", "Lumbalgia", "Gastroenteritis", "Cirugía ambulatoria", "Control posoperatorio",
    "Esguince de tobillo", "Corte en mano con lámina", "Golpe en bodega", "Caída en rampa de descarga"];
  for (let i = 0; i < 14; i++) {
    const e = pick(empleados.filter(x => x.estado === "Activo"));
    const tipo = chance(0.68) ? TIPO_INC[0] : chance(0.7) ? TIPO_INC[1] : TIPO_INC[2];
    const dias = tipo.id === "MAT" ? 120 : ri(1, 12);
    const desde = new Date(HOY.getTime() - ri(0, 40) * 86400000);
    const hasta = new Date(desde.getTime() + (dias - 1) * 86400000);
    const vigente = hasta >= HOY && desde <= HOY;
    if (vigente) e.estado = "Incapacitado";
    incapacidades.push({
      id: "INC-" + pad(1200 + i, 4), empId: e.id, tipo: tipo.id, tipoT: tipo.t,
      boleta: (tipo.id === "INS" ? "INS-" : "CCSS-") + ri(100000, 999999),
      motivo: tipo.id === "MAT" ? "Licencia de maternidad" : pick(MOTIVOS),
      desde, hasta, dias, vigente,
      patrono: tipo.id === "CCSS" ? Math.min(3, dias) : tipo.id === "MAT" ? 0 : 1,
      subsidio: tipo.id === "CCSS" ? 60 : tipo.id === "INS" ? 60 : 50,
      estado: vigente ? "Vigente" : "Cerrada"
    });
  }

  const vacaciones = [];
  for (let i = 0; i < 18; i++) {
    const e = pick(empleados.filter(x => x.estado === "Activo"));
    const dias = pick([3, 5, 5, 7, 10, 12]);
    const desde = new Date(HOY.getTime() + ri(-45, 50) * 86400000);
    const hasta = new Date(desde.getTime() + (dias - 1) * 86400000);
    const estado = hasta < HOY ? "Disfrutadas" : desde <= HOY ? "En curso" : chance(0.7) ? "Aprobada" : "Solicitada";
    if (estado === "En curso") e.estado = "Vacaciones";
    vacaciones.push({
      id: "VAC-" + pad(900 + i, 4), empId: e.id, dias, desde, hasta, estado,
      aprueba: estado === "Solicitada" ? null : "Sonia Calderón Ruiz",
      pagoAdelantado: chance(0.4)
    });
  }

  const PERMISOS = [
    ["Matrimonio", "Sin goce · convenio interno", 3],
    ["Fallecimiento de familiar", "Con goce de salario", 3],
    ["Nacimiento de hijo", "Licencia de paternidad", 8],
    ["Cita médica de la CCSS", "Con goce, contra comprobante", 1],
    ["Asunto personal", "Sin goce de salario", 1]
  ];

  /* ═══ 9 · ASISTENCIA Y HORAS EXTRA ═════════════════════════════════ */
  const marcas = [];
  const activos = () => empleados.filter(e => e.estado === "Activo");
  (function () {
    const base = activos();
    for (let d = 6; d >= 0; d--) {
      const dia = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() - d);
      base.forEach(e => {
        if (dia.getDay() === 0 && !chance(0.22)) return;   /* domingo: solo turnos */
        const tarde = chance(0.09);
        const falta = chance(0.025);
        const ent = falta ? null : new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 7, tarde ? ri(6, 34) : ri(-12, 4));
        const jor = e.jornada === "Nocturna" ? 6 : e.jornada === "Mixta" ? 7 : 8;
        const extra = chance(0.17) ? +(ri(1, 6) / 2).toFixed(1) : 0;
        const sal = ent ? new Date(ent.getTime() + (jor + 1 + extra) * 3600000) : null;
        marcas.push({
          empId: e.id, dia, entrada: ent, salida: sal, jornadaH: jor, extra,
          estado: falta ? "Ausencia" : tarde ? "Tardía" : "Normal",
          justificada: falta ? chance(0.55) : true, locId: e.locId
        });
      });
    }
  })();

  /* ═══ 10 · CONCEPTOS DE INGRESO Y DEDUCCIÓN ════════════════════════ */
  const CONCEPTOS = [
    { cod: "I-01", t: "Salario ordinario", tipo: "Ingreso", ccss: true, renta: true, fijo: true },
    { cod: "I-02", t: "Horas extra (recargo 50 %)", tipo: "Ingreso", ccss: true, renta: true },
    { cod: "I-03", t: "Feriado laborado (pago doble)", tipo: "Ingreso", ccss: true, renta: true },
    { cod: "I-04", t: "Comisión por ventas", tipo: "Ingreso", ccss: true, renta: true },
    { cod: "I-05", t: "Incentivo por cumplimiento de meta", tipo: "Ingreso", ccss: true, renta: true },
    { cod: "I-06", t: "Recargo nocturno", tipo: "Ingreso", ccss: true, renta: true },
    { cod: "I-07", t: "Vacaciones disfrutadas", tipo: "Ingreso", ccss: true, renta: true },
    { cod: "I-08", t: "Subsidio patronal por incapacidad", tipo: "Ingreso", ccss: false, renta: false },
    { cod: "I-09", t: "Aguinaldo", tipo: "Ingreso", ccss: false, renta: false, nota: "exento de cargas y de renta" },
    { cod: "I-10", t: "Viáticos y reembolsos", tipo: "Ingreso", ccss: false, renta: false, nota: "no tiene carácter salarial" },
    { cod: "D-01", t: "CCSS obrero (SEM + IVM)", tipo: "Deducción", orden: 1, ley: true },
    { cod: "D-02", t: "Banco Popular obrero", tipo: "Deducción", orden: 1, ley: true },
    { cod: "D-03", t: "Impuesto sobre la renta", tipo: "Deducción", orden: 1, ley: true },
    { cod: "D-04", t: "Ahorro obligatorio solidarista", tipo: "Deducción", orden: 1, ley: true },
    { cod: "D-05", t: "Pensión alimentaria", tipo: "Deducción", orden: 2, ley: true, nota: "hasta el 50 % del neto junto con el aguinaldo" },
    { cod: "D-06", t: "Embargo judicial", tipo: "Deducción", orden: 3, ley: true, nota: "solo uno a la vez" },
    { cod: "D-07", t: "Crédito Banco Popular", tipo: "Deducción", orden: 4, nota: "respeta el mínimo inembargable" },
    { cod: "D-08", t: "Crédito de la asociación solidarista", tipo: "Deducción", orden: 5 },
    { cod: "D-09", t: "Compras en la ferretería", tipo: "Deducción", orden: 5 },
    { cod: "D-10", t: "Adelanto de salario", tipo: "Deducción", orden: 5 },
    { cod: "D-11", t: "Cuota de cooperativa", tipo: "Deducción", orden: 5 }
  ];

  /* ═══ 11 · PERIODOS DE PLANILLA ════════════════════════════════════ */
  const ESTADOS = ["Abierta", "En cálculo", "Aprobada", "Pagada", "Contabilizada"];
  const periodos = [];
  const per = (id, tipo, d1, d2, estado, pago) => {
    const p = {
      id, tipo, desde: d1, hasta: d2, estado, pago,
      dias: Math.round((d2 - d1) / 86400000) + 1
    };
    periodos.push(p); return p;
  };
  /* mensuales de 2026 */
  for (let m = 0; m < 9; m++) {
    const d1 = new Date(2026, m, 1), d2 = new Date(2026, m + 1, 0);
    per("MEN-2026-" + pad(m + 1, 2), "Mensual", d1, d2,
      m < 8 ? "Contabilizada" : "Abierta", new Date(2026, m + 1, 0));
  }
  /* quincenales recientes */
  per("QUI-2026-14", "Quincenal", new Date(2026, 6, 16), new Date(2026, 6, 31), "Contabilizada", new Date(2026, 6, 31));
  per("QUI-2026-15", "Quincenal", new Date(2026, 7, 1), new Date(2026, 7, 15), "Contabilizada", new Date(2026, 7, 15));
  per("QUI-2026-16", "Quincenal", new Date(2026, 7, 16), new Date(2026, 7, 31), "Contabilizada", new Date(2026, 7, 31));
  per("QUI-2026-17", "Quincenal", new Date(2026, 8, 1), new Date(2026, 8, 15), "En cálculo", new Date(2026, 8, 15));
  /* semanales recientes */
  per("SEM-2026-34", "Semanal", new Date(2026, 7, 17), new Date(2026, 7, 23), "Contabilizada", new Date(2026, 7, 23));
  per("SEM-2026-35", "Semanal", new Date(2026, 7, 24), new Date(2026, 7, 30), "Contabilizada", new Date(2026, 7, 30));
  per("SEM-2026-36", "Semanal", new Date(2026, 7, 31), new Date(2026, 8, 6), "Pagada", new Date(2026, 8, 6));
  per("SEM-2026-37", "Semanal", new Date(2026, 8, 7), new Date(2026, 8, 13), "En cálculo", new Date(2026, 8, 13));

  const perById = {}; periodos.forEach(p => perById[p.id] = p);
  const ACTUAL = { Semanal: "SEM-2026-37", Quincenal: "QUI-2026-17", Mensual: "MEN-2026-09" };

  /* ═══ 12 · MOTOR DE CÁLCULO ════════════════════════════════════════
     Una sola función produce la colilla: la pantalla nunca calcula.     */
  const factorMes = { Semanal: 7 / 30, Quincenal: 0.5, Mensual: 1 };
  const valorHora = e => e.salario / 30 / (e.jornada === "Nocturna" ? 6 : e.jornada === "Mixta" ? 7 : 8);

  function novedades(e, per) {
    /* semilla estable por colaborador y periodo */
    let h = 0; const k = e.id + per.id;
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) & 0x7fffffff;
    const r = n => ((h = (h * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * n;
    const f = factorMes[per.tipo];
    const horasExtra = r(1) < 0.42 ? +(Math.floor(r(9) + 1) / 2).toFixed(1) : 0;
    const feriado = per.tipo !== "Semanal" && FERIADOS.some(x => x.fecha >= per.desde && x.fecha <= per.hasta) && r(1) < 0.25 ? 1 : 0;
    const comision = /Ventas/.test(e.area) && r(1) < 0.7 ? Math.round(r(140000) * f / 500) * 500 : 0;
    const incentivo = r(1) < 0.18 ? Math.round(r(90000) * f / 500) * 500 : 0;
    return { horasExtra, feriado, comision, incentivo };
  }

  function calc(e, per) {
    const f = factorMes[per.tipo];
    const nov = novedades(e, per);
    const vh = valorHora(e);
    const diario = e.salario / 30;
    const ordinario = r0(e.salario * f);
    const extra = r0(nov.horasExtra * vh * 1.5);
    const feriado = r0(nov.feriado * diario);
    const nocturno = e.jornada === "Nocturna" ? r0(ordinario * 0.0) : 0;
    const ing = [
      { cod: "I-01", t: "Salario ordinario", m: ordinario },
      nov.horasExtra ? { cod: "I-02", t: nov.horasExtra + " horas extra × " + r0(vh * 1.5), m: extra } : null,
      feriado ? { cod: "I-03", t: "Feriado laborado", m: feriado } : null,
      nov.comision ? { cod: "I-04", t: "Comisión por ventas", m: nov.comision } : null,
      nov.incentivo ? { cod: "I-05", t: "Incentivo por meta", m: nov.incentivo } : null
    ].filter(Boolean);
    const bruto = ing.reduce((s, x) => s + x.m, 0);

    /* la renta se calcula sobre la base mensualizada y se prorratea */
    const brutoMes = r0(bruto / f);
    const rt = renta(brutoMes, e.hijos, e.conyuge);
    const rentaPeriodo = r0(rt.retener * f);

    const ccss = r0(bruto * TASAS.ccssObrero / 100);
    const bp = r0(bruto * 1.00 / 100);
    const sol = e.solidarista ? r0(bruto * e.aporteSol / 100) : 0;
    const pension = e.pensionAlim ? r0(e.pensionAlim * f) : 0;
    const embargo = e.embargo ? r0(e.embargo * f) : 0;
    const prestamo = e.prestamoBP ? r0(e.prestamoBP * f) : 0;
    const adelanto = per.tipo === "Quincenal" || per.tipo === "Mensual" ? e.adelanto : 0;

    const ded = [
      { cod: "D-01", t: "CCSS obrero " + TASAS.ccssObrero + " %", m: ccss },
      { cod: "D-02", t: "Banco Popular 1 %", m: bp },
      rentaPeriodo ? { cod: "D-03", t: "Impuesto sobre la renta", m: rentaPeriodo } : null,
      sol ? { cod: "D-04", t: "Ahorro solidarista " + e.aporteSol + " %", m: sol } : null,
      pension ? { cod: "D-05", t: "Pensión alimentaria", m: pension } : null,
      embargo ? { cod: "D-06", t: "Embargo judicial", m: embargo } : null,
      prestamo ? { cod: "D-07", t: "Crédito Banco Popular", m: prestamo } : null,
      adelanto ? { cod: "D-10", t: "Adelanto de salario", m: adelanto } : null
    ].filter(Boolean);
    const totalDed = ded.reduce((s, x) => s + x.m, 0);
    const neto = bruto - totalDed;

    const patronal = TASAS.patrono.map(x => ({ id: x.id, t: x.t, p: x.p, m: r0(bruto * x.p / 100) }));
    const totalPat = patronal.reduce((s, x) => s + x.m, 0);

    const prov = {
      aguinaldo: r0(bruto / 12),
      vacaciones: r0(bruto * 4.17 / 100),
      cesantia: r0(bruto * 5.33 / 100)
    };
    return {
      e, per, ing, ded, patronal, prov, nov,
      bruto, brutoMes, totalDed, neto, totalPat,
      renta: rt, rentaPeriodo, costo: bruto + totalPat,
      valorHora: r0(vh), diario: r0(diario)
    };
  }

  const dePeriodo = per => empleados.filter(e =>
    e.planilla === per.tipo && (e.estado !== "Inactivo" || (e.salida && e.salida >= per.desde)));
  const corrida = per => dePeriodo(per).map(e => calc(e, per));
  const totales = filas => ({
    n: filas.length,
    bruto: filas.reduce((s, x) => s + x.bruto, 0),
    ded: filas.reduce((s, x) => s + x.totalDed, 0),
    neto: filas.reduce((s, x) => s + x.neto, 0),
    pat: filas.reduce((s, x) => s + x.totalPat, 0),
    renta: filas.reduce((s, x) => s + x.rentaPeriodo, 0),
    costo: filas.reduce((s, x) => s + x.costo, 0),
    prov: filas.reduce((s, x) => s + x.prov.aguinaldo + x.prov.vacaciones + x.prov.cesantia, 0)
  });

  /* ═══ 13 · AGUINALDO — 1 dic 2025 a 30 nov 2026 ════════════════════ */
  function aguinaldo(e) {
    const ini = new Date(2025, 11, 1), fin = new Date(2026, 10, 30);
    const desde = e.ingreso > ini ? e.ingreso : ini;
    const meses = Math.max(0, Math.min(12, ((fin - desde) / 86400000) / 30.42));
    const devengado = r0(e.salario * meses * 1.045);   /* salario + extras y comisiones del año */
    return { desde, hasta: fin, meses: +meses.toFixed(2), devengado, monto: r0(devengado / 12) };
  }

  /* ═══ 14 · LIQUIDACIONES ═══════════════════════════════════════════ */
  function liquidar(e, motivo, fecha) {
    fecha = fecha || HOY;
    const anios = (fecha - e.ingreso) / (365.25 * 86400000);
    const prom = e.salario * 1.04;                 /* promedio de los últimos 6 meses */
    const diario = prom / 30;
    const conResp = /Despido con responsabilidad|Indirecto/.test(motivo);
    const enteros = Math.floor(anios);
    const resto = anios - enteros;
    let diasCes = 0;
    if (conResp) {
      if (anios < 0.25) diasCes = 0;
      else if (anios < 0.5) diasCes = 7;
      else if (anios < 1) diasCes = 14;
      else {
        const tope = Math.min(enteros, TOPE_CESANTIA);
        for (let i = 1; i <= tope; i++) diasCes += diasCesantiaAnio(i);
        if (resto > 0.5 && enteros < TOPE_CESANTIA) diasCes += diasCesantiaAnio(enteros + 1);
      }
    }
    const diasPre = !conResp ? 0 : anios < 0.25 ? 0 : anios < 0.5 ? 7 : anios < 1 ? 15 : 30;
    const ag = aguinaldo(e);
    const vacDias = e.vacSaldo;
    return {
      e, motivo, fecha, anios: +anios.toFixed(2), prom: r0(prom), diario: r0(diario), conResp,
      lineas: [
        { t: "Preaviso", d: diasPre, m: r0(diasPre * diario), nota: "exento de cargas y de renta" },
        { t: "Cesantía (art. 29)", d: +diasCes.toFixed(2), m: r0(diasCes * diario), nota: "tope de 8 años" },
        { t: "Vacaciones no disfrutadas", d: vacDias, m: r0(vacDias * diario), nota: "cotiza a la CCSS" },
        { t: "Aguinaldo proporcional", d: null, m: r0(ag.monto * 0.78), nota: "exento" },
        { t: "Salario de los días trabajados", d: ri(4, 12), m: r0(ri(4, 12) * diario), nota: "cotiza a la CCSS" }
      ],
      fcl: r0(e.salario * 1.5 / 100 * Math.min(anios, 30) * 12 * 1.09)
    };
  }
  const liquidaciones = salidas.map(e => liquidar(e, e.motivo, e.salida));

  /* ═══ 15 · MOVIMIENTOS DE PERSONAL (reportables a la CCSS) ═════════ */
  const movimientos = [];
  empleados.filter(e => e.ingreso > new Date(2026, 5, 1)).slice(0, 9).forEach((e, i) => movimientos.push({
    id: "MOV-" + pad(3100 + i, 4), tipo: "Ingreso", empId: e.id, fecha: e.ingreso,
    detalle: e.puesto + " · " + w.locNom(e.locId), reportado: true, salario: e.salario
  }));
  salidas.forEach((e, i) => movimientos.push({
    id: "MOV-" + pad(3200 + i, 4), tipo: "Salida", empId: e.id, fecha: e.salida,
    detalle: e.motivo, reportado: i === 0, salario: e.salario
  }));
  empleados.slice(20, 27).forEach((e, i) => movimientos.push({
    id: "MOV-" + pad(3300 + i, 4), tipo: "Aumento", empId: e.id, fecha: new Date(2026, 0, 1),
    detalle: "Ajuste anual de salarios mínimos · +1,63 %", reportado: true, salario: e.salario
  }));
  movimientos.sort((a, b) => b.fecha - a.fecha);

  /* ═══ 16 · OBLIGACIONES DEL MES ════════════════════════════════════ */
  const OBLIGACIONES = [
    {
      ent: "CCSS", t: "Planilla ordinaria en SICERE", ic: "shield",
      plazo: "del 26 al 4.º día hábil del mes siguiente", pago: "entre el 16 y el 20",
      estado: "Presentada", detalle: "Planilla de agosto 2026 · 70 personas"
    },
    {
      ent: "CCSS", t: "Reporte de ingresos y salidas", ic: "users",
      plazo: "al ocurrir el movimiento", pago: "—",
      estado: "Pendiente", detalle: "1 salida sin reportar"
    },
    {
      ent: "Hacienda", t: "Retenciones del impuesto al salario", ic: "file",
      plazo: "primeros 15 días naturales del mes siguiente", pago: "mismo plazo",
      estado: "Pendiente", detalle: "TRIBU-CR · autoliquidativo F-138 y su informativa F-208"
    },
    {
      ent: "INS", t: "Planilla de riesgos del trabajo", ic: "shield",
      plazo: "mensual", pago: "según la póliza", estado: "Presentada", detalle: "Póliza RT 01-1147723"
    },
    {
      ent: "Operadora", t: "Traslado de FCL y ROP", ic: "bank",
      plazo: "con la planilla de la CCSS", pago: "automático", estado: "Presentada", detalle: "3,5 % patronal de 70 personas"
    },
    {
      ent: "Juzgado", t: "Depósito de pensiones alimentarias", ic: "gavel",
      plazo: "con cada pago de planilla", pago: "—", estado: "Al día", detalle: "5 personas con rebajo activo"
    },
    {
      ent: "Asociación", t: "Traslado del ahorro solidarista", ic: "wallet",
      plazo: "con cada pago de planilla", pago: "—", estado: "Al día", detalle: "48 personas afiliadas"
    }
  ];

  /* ═══ 17 · EXPORTACIÓN ═════════════════════════════════════════════ */
  w.NOM = {
    HOY, TASAS, TRAMOS, CREDITOS, MIN_INEMBARGABLE, MINIMOS, minimoDe,
    JORNADAS, RECARGO_EXTRA, TOPE_EXTRA_DIA, TOPE_EXTRA_SEM, FERIADOS,
    CESANTIA, PREAVISO, TOPE_CESANTIA, diasCesantiaAnio,
    PUESTOS, puestoDe, CONCEPTOS, TIPO_INC, PERMISOS, OBLIGACIONES, ESTADOS,
    empleados, empById, activos, salidas,
    incapacidades, vacaciones, marcas, movimientos,
    periodos, perById, ACTUAL, dePeriodo, corrida, totales,
    calc, renta, aguinaldo, liquidar, liquidaciones, valorHora, factorMes,
    emp: id => empById[id],
    nom: id => (empById[id] || {}).nom || "—"
  };
})(window);
