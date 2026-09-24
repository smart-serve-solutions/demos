/* ═══════════════════════════════════════════════════════════════
   Navegación — los 27 módulos, su árbol de tres niveles y el
   índice de pantallas. Es el mapa que alimenta el menú desplegable,
   las migas de pan y el buscador del menú.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
     Módulos — grupos e producto / servicios (todo visible, nada escondido)
     ═══════════════════════════════════════════════════════════════ */
  var MODULES = [
    { id: "sistema", t: "Sistema / Configuración", ic: "gear" },
    { id: "inventarios", t: "Inventarios", ic: "box" },
    { id: "ventas", t: "Ventas / POS", ic: "cart" },
    { id: "compras", t: "Compras / Proveeduría", ic: "truck" },
    /* cuentas por cobrar y por pagar en un solo módulo operativo: lo usan
       quienes cobran y quienes pagan; contabilidad solo recibe sus asientos
       y concilia los saldos (Contabilidad › Conciliaciones) */
    { id: "cobros", t: "Cobros y pagos", ic: "wallet" },
    { id: "fel", t: "Facturación Electrónica", ic: "file" },
    { id: "bi", t: "Reportería y BI", ic: "chart" },
    { id: "ia", t: "Integraciones e IA", ic: "sparkle" },
    // { id: "infra", t: "Infraestructura", ic: "server" },
    { id: "contab", t: "Contabilidad", ic: "scale" },
    { id: "rrhh", t: "Nómina y RRHH", ic: "users" },
    { id: "logistica", t: "Logística y Transporte", ic: "route" },
    { id: "taller", t: "Taller", ic: "wrench" },
    { id: "produccion", t: "Producción", ic: "factory" },
    { id: "migracion", t: "Migración de Datos", ic: "upload" },
  ];

  /* Árbol de navegación: módulo (nivel 1) → sección (nivel 2) → requerimiento/
     subsección (nivel 3), en el mismo orden y con el mismo texto que la matriz
     de requerimientos (126 producto / servicios en 17 módulos). "screen" referencia un id real
     de SCREENS/RENDERERS (pantalla ya construida en el demo). "action" referencia
     una función existente que no vive detrás de un id de pantalla (la vista de
     app móvil de bodega, que hoy es un modal). Sin screen ni action = todavía no
     tiene pantalla propia en el demo ("Próximamente"), pero queda visible. */
  var MENU_TREE = {
    migracion: [
      {
        t: "Preparación (Fase 0)",
        ic: "file",
        items: [
          { t: "Export completo de Sistema Actual", reqs: ["MIG-001"] },
          {
            t: "Diagnóstico y saneamiento de maestros",
            reqs: ["MIG-002"],
          },
          {
            t: "Usuario de consulta en Sistema Actual",
            reqs: ["MIG-005"],
          },
        ],
      },
      {
        t: "Migración de saldos e históricos (Fase 1)",
        ic: "history",
        items: [
          { t: "Migración de saldos", reqs: ["MIG-003"] },
          {
            t: "Migración de histórico transaccional",
            reqs: ["MIG-004"],
          },
        ],
      },
    ],
    /* Sistema / Configuración: una pantalla por opción. Desde el 22-set
       incluye lo que era el módulo Seguridad y Auditoría (usuarios, roles
       y permisos, políticas, autorizaciones y bitácora): los requerimientos
       SEG se cuentan aquí. */
    sistema: [
      {
        t: "Organización y locales",
        ic: "pin",
        items: [
          {
            t: "Empresa y estructura",
            d: "Locales y bodegas sin límite, terminales, áreas, departamentos y razón social",
            reqs: ["SIS-001", "SIS-002", "SIS-003", "SIS-006"],
            screen: "sis-locales",
            tabs: [
              {
                t: "Locales y bodegas",
                id: "locales",
                kw: "local bodega cedi sucursal cajas nodo agregar local horario",
              },
              {
                t: "Terminales y dispositivos",
                id: "terminales",
                kw: "terminal caja impresora lector datafono gaveta balanza consecutivo",
              },
              {
                t: "Áreas",
                id: "areas",
                kw: "tienda virtual sala de acabados taller planta area",
              },
              {
                t: "Departamentos",
                id: "departamentos",
                kw: "departamento planilla centro de costo jefatura",
              },
              {
                t: "Razón social",
                id: "empresa",
                kw: "razon social cedula juridica multiempresa sociedad logotipo",
              },
            ],
          },
          {
            t: "Territorios de clientes",
            d: "Dónde vive el cliente y en qué local compra",
            reqs: ["SIS-004"],
            screen: "sis-territorios",
          },
        ],
      },
      {
        t: "Usuarios y seguridad",
        ic: "lock",
        items: [
          {
            t: "Usuarios y accesos",
            d: "Altas sin contraseñas dictadas, roles por local, solicitudes, sesiones y revisión",
            reqs: ["SEG-008"],
            screen: "usuarios",
            tabs: [
              {
                t: "Usuarios",
                id: "usuarios",
                kw: "usuario nuevo usuario invitacion inactivar local doble factor",
              },
              {
                t: "Solicitudes de acceso",
                id: "solicitudes",
                kw: "solicitud acceso aprobar pedir gerencia",
              },
              {
                t: "Sesiones abiertas",
                id: "sesiones",
                kw: "sesion abierta cerrar sesion equipo",
              },
              {
                t: "Revisión de accesos",
                id: "revision",
                kw: "revision accesos acceso total auditoria",
              },
            ],
          },
          {
            t: "Roles y permisos",
            d: "Por pantalla y acción, acciones especiales, campos sensibles, clonado y segregación",
            reqs: ["SEG-001", "SEG-002", "SEG-003", "SEG-006"],
            screen: "seg-roles",
            tabs: [
              {
                t: "Roles",
                id: "roles",
                kw: "rol perfil permiso ver registrar modificar eliminar importar exportar duplicar clonar campo",
              },
              {
                t: "Segregación de funciones",
                id: "segregacion",
                kw: "segregacion incompatibles suplentes excepcion",
              },
              {
                t: "Vista de conjunto",
                id: "matriz",
                kw: "matriz permisos roles",
              },
            ],
          },
          {
            t: "Políticas de acceso y sesión",
            d: "Sesión que muere de verdad, contraseñas, doble factor y enlaces sin credenciales",
            reqs: ["SEG-010", "SEG-011", "SEG-012"],
            screen: "seg-politicas",
            tabs: [
              {
                t: "Políticas de acceso y sesión",
                id: "",
                kw: "sesion contraseña doble factor enlace pdf exportar excel inyeccion seguridad",
              },
            ],
          },
        ],
      },
      {
        t: "Control y auditoría",
        ic: "history",
        items: [
          {
            t: "Autorización de excepciones",
            d: "Quién autoriza qué, aviso por correo o WhatsApp y registro de la respuesta",
            reqs: ["SEG-005", "SEG-009"],
            screen: "seg-autorizaciones",
            tabs: [
              {
                t: "Pendientes",
                id: "pendientes",
                kw: "autorizacion pendiente aprobar rechazar excepcion jerarquica",
              },
              {
                t: "Quién autoriza qué",
                id: "reglas",
                kw: "nivel monto autoriza canal vigencia anulacion",
              },
              {
                t: "Historial",
                id: "historial",
                kw: "autorizaciones resueltas",
              },
            ],
          },
          {
            t: "Bitácora de auditoría",
            d: "Quién, cuándo, antes y después, quién autorizó; lo inactivado y qué se registra",
            reqs: ["SEG-004", "SEG-007"],
            screen: "historial",
            tabs: [
              {
                t: "Bitácora",
                id: "bitacora",
                kw: "bitacora auditoria log cambios valor anterior trazabilidad",
              },
              {
                t: "Registros inactivados",
                id: "inactivados",
                kw: "inactivado reactivar eliminar",
              },
              {
                t: "Qué se registra",
                id: "registro",
                kw: "nivel de detalle retencion",
              },
            ],
          },
        ],
      },
      {
        t: "Catálogo y clasificación",
        ic: "layers",
        items: [
          {
            t: "Categorías, marcas y unidades",
            d: "Categorías padre e hija, marcas, unidades de medida y presentaciones",
            reqs: ["SIS-007"],
            screen: "sis-categorias",
            tabs: [
              {
                t: "Categorías",
                id: "categorias",
                kw: "categoria familia subcategoria padre hija jerarquia nueva categoria",
              },
              { t: "Marcas", id: "marcas", kw: "marca gerencia de marca" },
              {
                t: "Unidades y presentaciones",
                id: "unidades",
                kw: "unidad de medida kilo metro decimales presentacion caja rollo saco",
              },
            ],
          },
          {
            t: "Ubicación física de artículos",
            d: "Pasillo, anaquel, cara y estante; segunda ubicación en trastienda",
            reqs: ["SIS-009"],
            screen: "sis-ubicaciones",
            tabs: [
              {
                t: "Por local",
                id: "estructura",
                kw: "pasillo anaquel cara estante trastienda estructura",
              },
              {
                t: "Sin ubicación",
                id: "sin",
                kw: "sin ubicacion ubicar articulo",
              },
            ],
          },
        ],
      },
      {
        t: "Reglas de negocio y documentos",
        ic: "gear",
        items: [
          {
            t: "Parámetros generales",
            d: "Caja, márgenes, costos, crédito, compras y reportes, con motivo en cada cambio",
            reqs: [],
            screen: "sis-parametros",
            tabs: [
              {
                t: "Parámetros generales",
                id: "",
                kw: "parametro fondo de caja tope efectivo proforma apartado redondeo variacion de costo barrido bloqueo",
              },
            ],
          },
          {
            t: "Términos de pago",
            d: "Contado, conta ruta, crédito a 15–90 días, plazos negociados y pronto pago",
            reqs: ["SIS-005"],
            screen: "sis-terminos",
          },
          {
            t: "Medios de pago y monedas",
            d: "Lo que acepta la caja, tipo de cambio del Banco Central y cuentas bancarias",
            reqs: [],
            screen: "sis-pagos",
            tabs: [
              {
                t: "Medios de pago",
                id: "medios",
                kw: "efectivo tarjeta sinpe transferencia cheque anticipo",
              },
              {
                t: "Monedas y tipo de cambio",
                id: "monedas",
                kw: "dolares tipo de cambio bccr banco central",
              },
              {
                t: "Cuentas bancarias",
                id: "cuentas",
                kw: "banco nacional bcr popular cuenta iban",
              },
            ],
          },
          {
            t: "Estados, numeración y motivos",
            d: "Registrado, aplicado, anulado; numeración al aplicar; motivos obligatorios",
            reqs: ["SIS-008", "SIS-011"],
            screen: "sis-estados",
            tabs: [
              {
                t: "Flujos",
                id: "flujos",
                kw: "estado registrado aplicado anulado irreversible",
              },
              {
                t: "Numeración",
                id: "numeracion",
                kw: "consecutivo numero documento formato",
              },
              {
                t: "Motivos",
                id: "motivos",
                kw: "motivo anulacion devolucion ajuste venta perdida concepto nota de credito",
              },
              {
                t: "Cambios de nombre",
                id: "nombres",
                kw: "renombrar historial integridad catalogo",
              },
            ],
          },
        ],
      },
      {
        t: "Impresión, avisos y conexiones",
        ic: "bell",
        items: [
          {
            t: "Plantillas y mensajes",
            d: "Factura, tiquete, proforma y etiquetas; textos de correo y WhatsApp",
            reqs: [],
            screen: "sis-plantillas",
            tabs: [
              {
                t: "Documentos impresos",
                id: "impresos",
                kw: "plantilla impresion factura tiquete proforma firma etiqueta logo",
              },
              {
                t: "Correo y WhatsApp",
                id: "mensajes",
                kw: "correo remitente whatsapp mensaje recordatorio",
              },
            ],
          },
          {
            t: "Notificaciones y alertas",
            d: "Qué evento avisa, a quién y por dónde",
            reqs: [],
            screen: "sis-alertas",
            tabs: [
              {
                t: "Notificaciones y alertas",
                id: "",
                kw: "alerta aviso notificacion correo whatsapp gerencia evento critico",
              },
            ],
          },
          {
            t: "Conexiones con otros sistemas",
            d: "Hacienda, Banco Central, Banco Nacional, WhatsApp, correo y nodos locales",
            reqs: [],
            screen: "sis-integraciones",
            tabs: [
              {
                t: "Conexiones",
                id: "",
                kw: "integracion hacienda bccr banco nacional whatsapp correo nodo api credenciales",
              },
            ],
          },
        ],
      },
      {
        t: "Mantenimiento y preferencias",
        ic: "upload",
        items: [
          // COMENTADO POR QUE NO SE REQUIERE EN EL DEMO, NO DESCOMENTAR
          // {
          //   t: "Versiones y ambiente de pruebas",
          //   d: "Notas de versión, aceptación escrita, pruebas anonimizadas y respaldos",
          //   reqs: ["SIS-010"],
          //   screen: "sis-versiones",
          //   tabs: [
          //     { t: "Próxima versión", id: "proxima", kw: "release notes version aceptacion publicar" },
          //     { t: "Ambiente de pruebas", id: "pruebas", kw: "pruebas anonimizado enmascarar datos" },
          //     { t: "Historial", id: "historial", kw: "versiones publicadas" },
          //     { t: "Respaldos y copia de la base", id: "respaldos", kw: "respaldo backup copia base de datos" },
          //   ],
          // },
          {
            t: "Este equipo",
            d: "Modo oscuro, terminal y simulación de caída del enlace",
            reqs: [],
            screen: "config",
          },
        ],
      },
    ],
    /* Inventario: seis opciones, una por tarea de la bodega — no una por
       requerimiento. Lo que antes era una opción ahora es una pestaña.
       Pendientes de bodega reúne lo que necesita a una persona hoy; lo
       demás lo hace el sistema (inv-auto.js). */
    inventarios: [
      {
        t: "Bodega día a día",
        ic: "box",
        items: [
          {
            t: "Pendientes de bodega",
            d: "Lo que hay que atender hoy; lo demás corre solo",
            reqs: [],
            screen: "bodega",
            tabs: [
              {
                t: "Pendientes de bodega",
                id: "",
                kw: "bandeja pendientes hoy recibir despachar atender",
              },
            ],
          },
          {
            t: "Existencias",
            d: "Por local, kardex, apartados, contra pedido y segunda",
            reqs: [
              "INV-003",
              "INV-004",
              "INV-005",
              "INV-009",
              "INV-010",
              "INV-020",
            ],
            screen: "existencias",
            tabs: [
              {
                t: "Por local",
                id: "local",
                kw: "existencia disponible matriz local bodega cedi quiebre minimo",
              },
              {
                t: "Kardex",
                id: "kardex",
                kw: "movimientos entradas salidas saldo corrido",
              },
              {
                t: "Apartados y contra pedido",
                id: "comprometido",
                kw: "apartado reservado comprometido venta sin existencia contra pedido negativo despachar",
              },
              {
                t: "Segunda y devoluciones",
                id: "segunda",
                kw: "producto de segunda dañado rayado devolucion proveedor bodega de devoluciones",
              },
            ],
          },
          {
            t: "Traslados",
            d: "Sugerido del CEDI, recibido con escáner y diferencias",
            reqs: ["INV-006"],
            screen: "traslados",
            tabs: [
              {
                t: "Sugerido del CEDI",
                id: "sugerido",
                kw: "traslado sugerido reabastecer tiendas cedi camion peso",
              },
              {
                t: "En camino",
                id: "camino",
                kw: "recibir traslado transito diferencias faltante escanear",
              },
              {
                t: "Historial",
                id: "historial",
                kw: "traslados anteriores chofer vehiculo",
              },
            ],
          },
          {
            t: "Conteos y ajustes",
            d: "Conteo del día, mermas con foto y plan del año",
            reqs: ["INV-007", "INV-008"],
            screen: "ajustes",
            tabs: [
              {
                t: "Conteo de hoy",
                id: "conteo",
                kw: "conteo ciclico inventario fisico contar a ciegas pasillo",
              },
              {
                t: "Ajustes y mermas",
                id: "ajustes",
                kw: "merma ajuste quebrado dañado vencido foto evidencia aprobacion",
              },
              {
                t: "Plan del año",
                id: "plan",
                kw: "plan conteo 50 semanas familias prioritarias",
              },
            ],
          },
        ],
      },
      {
        t: "Catálogo y reposición",
        ic: "layers",
        items: [
          {
            t: "Catálogo",
            d: "Artículos, precios, códigos y etiquetas, carga masiva",
            reqs: [
              "INV-001",
              "INV-002",
              "INV-011",
              "INV-014",
              "INV-015",
              "INV-016",
              "INV-017",
              "INV-018",
              "INV-019",
              "INV-022",
            ],
            screen: "catalogo",
            tabs: [
              {
                t: "Artículos",
                id: "articulos",
                kw: "producto servicio ficha nuevo articulo copiar clonar presentaciones unidades decimales cabys peso ultimo costo",
              },
              {
                t: "Precios",
                id: "precios",
                kw: "precio costo nuevo cambio masivo margen aprobar",
              },
              {
                t: "Códigos y etiquetas",
                id: "codigos",
                kw: "codigo de barras etiqueta estante ubicacion foto imprimir",
              },
              {
                t: "Carga masiva",
                id: "carga",
                kw: "importar plantilla excel migracion",
              },
            ],
          },
          {
            t: "Reposición",
            d: "Sugerido de compra, ventas atípicas y temporadas",
            reqs: ["INV-012", "INV-013", "INV-021"],
            screen: "reposicion",
            tabs: [
              {
                t: "Sugerido de compra",
                id: "sugerido",
                kw: "sugerido pedido compra orden proveedor dias de inventario cedi",
              },
              {
                t: "Ventas atípicas",
                id: "atipicas",
                kw: "licitacion proyecto venta grande excluir",
              },
              {
                t: "Temporadas",
                id: "temporadas",
                kw: "estacionalidad lluvias zafra cafe verano clases",
              },
            ],
          },
        ],
      },
    ],
    /* Ventas: una opción por tarea de quien vende, no una por requerimiento.
       Lo que antes era una opción ahora es una pestaña. Pendientes de ventas
       reúne lo que necesita a una persona hoy; lo que la venta deduce lo hace
       sola (ven-auto.js). La caja no cambió de lugar. */
    ventas: [
      {
        t: "Mostrador",
        ic: "cart",
        items: [
          {
            t: "Facturación en el punto de venta",
            d: "Caja por teclado y escáner, borrador continuo, medios de pago y existencias de otros locales",
            reqs: [
              "VEN-001",
              "VEN-002",
              "VEN-013",
              "VEN-018",
              "VEN-020",
              "VEN-021",
              "VEN-022",
              "VEN-024",
            ],
            screen: "pos",
          },
          {
            t: "Pendientes de ventas",
            d: "Lo que necesita a una persona hoy; lo demás corre solo",
            reqs: [],
            screen: "ven-pendientes",
            tabs: [
              {
                t: "Pendientes de ventas",
                id: "",
                kw: "bandeja pendientes hoy autorizar entregar seguimiento caja",
              },
            ],
          },
          {
            t: "Caja y turnos",
            d: "Apertura con fondo, retiros, arqueo y cierre; terminales y cajeros",
            reqs: ["VEN-025", "VEN-027"],
            screen: "caja",
            tabs: [
              {
                t: "Mi caja",
                id: "mia",
                kw: "apertura fondo arqueo cierre retiro efectivo turno medios de pago",
              },
              {
                t: "Cajas del local",
                id: "local",
                kw: "administrador cajas abiertas diferencias justificar cierre",
              },
              {
                t: "Terminales y cajeros",
                id: "terminales",
                kw: "terminal consecutivo sucursal habilitar cajero turnos",
              },
            ],
          },
          {
            t: "Sugerencia de productos relacionados",
            d: "Complementos al agregar un artículo en la caja; reglas del experto y pares aprendidos de las ventas",
            reqs: ["VEN-016"],
            screen: "ven-relacionados",
            tabs: [
              {
                t: "En la caja",
                id: "caja",
                kw: "complementos sugeridos aceptados venta adicional vendedor nuevo",
              },
              {
                t: "Reglas",
                id: "reglas",
                kw: "regla complemento cantidad por unidad experto",
              },
              {
                t: "Aprendidas de las ventas",
                id: "aprendidas",
                kw: "ia inteligencia artificial se compran juntos facturas aprobar",
              },
            ],
          },
          {
            t: "Autogestión del cliente",
            d: "Catálogo con fotos y quiosco, empezando por un área piloto",
            reqs: ["VEN-017"],
          },
        ],
      },
      {
        t: "Antes y después de la venta",
        ic: "file",
        items: [
          {
            t: "Cotizaciones y pedidos",
            d: "Proformas con peso y flete, pedidos de WhatsApp y web, link de pago y ventas perdidas",
            reqs: ["VEN-003", "VEN-019"],
            screen: "cotizaciones",
            tabs: [
              {
                t: "Proformas",
                id: "proformas",
                kw: "proforma cotizacion convertir factura peso flete vence",
              },
              {
                t: "Pedidos",
                id: "pedidos",
                kw: "pedido whatsapp pagina web tienda virtual link de pago sinpe qr",
              },
              {
                t: "Ventas perdidas",
                id: "perdidas",
                kw: "venta perdida motivo proforma vencida precio existencia",
              },
            ],
          },
          {
            t: "Entregas y retiros",
            d: "Mercadería no despachada, despachos con estado y retiro en otro local",
            reqs: ["VEN-004", "VEN-005", "VEN-006"],
            screen: "despachos",
            tabs: [
              {
                t: "Por despachar",
                id: "pordespachar",
                kw: "no despachada pendiente alistar voluminoso despacho",
              },
              {
                t: "Retiros en otro local",
                id: "retiros",
                kw: "retiro otro local reserva mercaderia comprometida",
              },
              {
                t: "En ruta y entregados",
                id: "ruta",
                kw: "entregado firma autorizado retirar constancia ruta vehiculo sobrepeso",
              },
            ],
          },
          {
            t: "Documentos y devoluciones",
            d: "Comprobantes emitidos, devolución con firma del cliente y notas de crédito",
            reqs: ["VEN-011", "VEN-012"],
            screen: "documentos",
            tabs: [
              {
                t: "Documentos emitidos",
                id: "emitidos",
                kw: "factura tiquete reimprimir reenviar xml comprobante",
              },
              {
                t: "Devolver mercadería",
                id: "devolver",
                kw: "devolucion boleta firma digital reintegro",
              },
              {
                t: "Notas de crédito",
                id: "notas",
                kw: "nota de credito concepto garantia exoneracion financiera intereses promocional rebajo planilla",
              },
            ],
          },
        ],
      },
      {
        t: "Clientes y precios",
        ic: "users",
        items: [
          {
            t: "Clientes",
            d: "Ficha completa, crédito y compras",
            reqs: ["VEN-023"],
            screen: "clientes",
            tabs: [
              {
                t: "Ficha",
                id: "ficha",
                kw: "autorizados a retirar exoneracion actividad economica contactos direcciones categoria",
              },
              {
                t: "Crédito",
                id: "credito",
                kw: "limite plazo bloqueo sobregiro vencidas",
              },
              {
                t: "Compras",
                id: "compras",
                kw: "historial compras documentos familia",
              },
            ],
          },
          {
            t: "Precios, descuentos y márgenes",
            d: "Categorías de cliente, volumen, convenios, márgenes mínimos y autorizaciones",
            reqs: [
              "VEN-007",
              "VEN-008",
              "VEN-009",
              "VEN-010",
              "VEN-014",
              "VEN-015",
            ],
            screen: "ven-precios",
            tabs: [
              {
                t: "Por categoría de cliente",
                id: "categorias",
                kw: "maestro de obra ingeniero fontanero electricista ebanista descuento categoria",
              },
              {
                t: "Volumen y convenios",
                id: "volumen",
                kw: "descuento por volumen cantidad convenio proveedor reconoce",
              },
              {
                t: "Márgenes mínimos",
                id: "margenes",
                kw: "utilidad minima familia ver costo sadic local contable",
              },
              {
                t: "Autorizaciones",
                id: "autorizaciones",
                kw: "autorizacion venta bajo costo un solo uso barrido reversion",
              },
            ],
          },
          {
            t: "Vendedores y comisiones",
            d: "Desempeño, metas, comisiones y clave en mostrador compartido",
            reqs: ["VEN-026"],
            screen: "ven-vendedores",
            tabs: [
              {
                t: "Desempeño",
                id: "desempeno",
                kw: "vendedor venta margen tiquete descuento",
              },
              {
                t: "Metas y comisiones",
                id: "comisiones",
                kw: "meta comision familia bono",
              },
              {
                t: "Clave en mostrador",
                id: "mostrador",
                kw: "clave vendedor mostrador compartido identificacion",
              },
            ],
          },
        ],
      },
    ],
    compras: [
      {
        t: "Órdenes de compra",
        ic: "truck",
        items: [
          {
            t: "Órdenes de compra",
            reqs: ["COM-001", "COM-002", "COM-007", "COM-004"],
            screen: "ordenes",
          },
        ],
      },
      {
        t: "Recepción en bodega",
        ic: "scan",
        items: [
          {
            t: "Recepción en bodega",
            reqs: ["COM-003", "COM-006", "COM-005"],
            screen: "ordenes",
          },
        ],
      },
      {
        t: "Proveedores y negociación",
        ic: "users",
        items: [
          {
            t: "Múltiples negociaciones por proveedor",
            reqs: ["COM-011"],
            screen: "proveedores",
          },
          {
            t: "Solicitud de cotización a varios proveedores",
            reqs: ["COM-010"],
            screen: "subasta",
          },
        ],
      },
      {
        t: "Costos y distribución",
        ic: "scale",
        items: [
          { t: "Control de variación de costo", reqs: ["COM-008"] },
          { t: "Autoconsumo", reqs: ["COM-012"] },
          {
            t: "Distribución de mercadería entre sucursales",
            reqs: ["COM-009"],
          },
        ],
      },
    ],
    /* Cobros y pagos: antes eran dos módulos (Cuentas por Cobrar y
       Cuentas por Pagar). Los requerimientos CXC y CXP no cambian. */
    cobros: [
      {
        t: "Crédito de clientes",
        ic: "users",
        items: [
          {
            t: "Límite y bloqueo de crédito de clientes",
            d: "Líneas, bloqueos en la caja, solicitudes y excepciones",
            reqs: ["CXC-001", "CXC-002"],
            screen: "cob-credito",
          },
          {
            t: "Conta ruta (crédito de un día)",
            d: "Facturas a un día con entrega, liquidadas sin ir a cuentas por cobrar",
            reqs: ["CXC-004"],
            screen: "cob-ruta",
          },
        ],
      },
      {
        t: "Gestión de cobro",
        ic: "wallet",
        items: [
          {
            t: "Análisis de crédito y gestión de cobro",
            d: "Antigüedad, estado de cuenta, gestiones e incobrables",
            reqs: ["CXC-003"],
            screen: "cxc",
          },
          {
            t: "Recibos de dinero",
            d: "Pago a varias facturas, varios medios, REP y transferencias por WhatsApp",
            reqs: ["CXC-003"],
            screen: "cob-recibos",
          },
          {
            t: "Anticipos de cliente",
            d: "Adelantos, saldos a favor y transferencias no identificadas",
            reqs: ["CXC-005"],
            screen: "cob-anticipos",
          },
        ],
      },
      {
        t: "Pagos",
        ic: "bank",
        items: [
          {
            t: "Análisis de pagos a proveedores",
            d: "Vencimientos, pronto pago y lote de la semana",
            reqs: ["CXP-001"],
            screen: "cxp",
          },
          {
            /* bandeja única: proveedores y planilla se firman, se generan
               (archivo plano BN) y se confirman aquí; Nómina solo envía */
            t: "Pagos al banco (firma y archivo plano BN)",
            d: "Proveedores y planilla: firma mancomunada, archivo y confirmación",
            reqs: ["CXP-002", "CXP-003", "CXP-004"],
            screen: "cob-archivo",
          },
          {
            t: "Estado de cuenta del proveedor",
            d: "Saldo, facturas, pagos y notas aplicadas",
            reqs: ["CXP-007"],
            screen: "cob-estado-prov",
          },
          {
            t: "Notas de crédito y débito a proveedor",
            d: "Conceptos configurables, clave validada y aplicación",
            reqs: ["CXP-006"],
            screen: "cob-notas-prov",
          },
        ],
      },
      {
        /* el archivo de planilla (CXP-003) vive solo en Nómina › Planilla ›
           Pago: sale de la corrida aprobada y ya está citado allá */
        t: "Caja menor",
        ic: "wallet",
        items: [
          {
            t: "Caja chica y tarjeta empresarial",
            d: "Fondos por local, vales, reposición y tarjeta de la empresa",
            reqs: ["CXP-005"],
            screen: "cob-cajachica",
          },
        ],
      },
    ],
    fel: [
      {
        t: "Emisión",
        ic: "file",
        items: [
          { t: "Panel fiscal", reqs: ["FEL-001"], screen: "fiscal" },
          {
            t: "Comprobantes emitidos",
            reqs: ["FEL-006"],
            screen: "fel-emitidos",
          },
          {
            t: "Cola de envío y errores de Hacienda",
            reqs: ["FEL-007"],
            screen: "fel-cola",
          },
          {
            t: "Consecutivos y clave numérica",
            reqs: ["FEL-008"],
            screen: "fel-consecutivos",
          },
        ],
      },
      {
        t: "Recepción y cobro",
        ic: "swap",
        items: [
          {
            t: "Comprobantes recibidos y mensaje de receptor",
            reqs: ["FEL-003"],
            screen: "fel-recibidos",
          },
          {
            t: "Recibo electrónico de pago e IVA diferido",
            reqs: ["FEL-009"],
            screen: "fel-rep",
          },
        ],
      },
      {
        t: "Continuidad y credenciales",
        ic: "alert",
        items: [
          {
            t: "Contingencia ante caída de Hacienda",
            reqs: ["FEL-004"],
            screen: "fel-contingencia",
          },
          { t: "Llave criptográfica", reqs: ["FEL-002"], screen: "fel-llave" },
        ],
      },
      {
        t: "Impuestos y datos fiscales",
        ic: "scale",
        items: [
          {
            t: "CABYS, tarifas y exoneraciones",
            reqs: ["FEL-010"],
            screen: "fel-cabys",
          },
          {
            t: "IVA del período y declaración D-150",
            reqs: ["FEL-011"],
            screen: "fel-iva",
          },
          {
            t: "Actividades económicas y configuración",
            reqs: ["FEL-005"],
            screen: "fel-config",
          },
        ],
      },
    ],
    bi: [
      {
        t: "Tableros y reportes",
        ic: "chart",
        items: [
          {
            t: "Tablero de gerencia y alertas críticas",
            reqs: ["REP-001", "REP-006"],
            screen: "inicio",
          },
          {
            t: "Reportes gráficos y comparativos",
            reqs: ["REP-002"],
            screen: "reportes",
          },
          {
            t: "Exportación y límites de consulta",
            reqs: ["REP-003", "REP-004"],
          },
        ],
      },
      {
        t: "Reportería en lenguaje natural",
        ic: "sparkle",
        items: [
          {
            t: "Reportería en lenguaje natural",
            reqs: ["REP-005"],
            screen: "preguntas",
          },
        ],
      },
    ],
    ia: [
      {
        t: "Canales con el cliente",
        ic: "chat",
        items: [
          {
            t: "Bot de WhatsApp (disponibilidad y precio)",
            reqs: ["INT-001", "INT-002"],
            screen: "whatsapp",
          },
          { t: "Publicación a redes sociales", reqs: ["INT-005"] },
        ],
      },
      {
        t: "Integraciones externas",
        ic: "bank",
        items: [
          {
            t: "Integración con Hacienda",
            reqs: ["INT-003"],
            screen: "fiscal",
          },
          {
            /* acceso directo: la pantalla vive en Contabilidad › Conciliaciones */
            t: "Integración con Banco Nacional",
            reqs: ["INT-004"],
            screen: "con-conciliaciones",
            arg: "banco",
            alias: true,
          },
        ],
      },
      {
        t: "Aplicaciones móviles",
        ic: "phone",
        items: [
          {
            t: "Aplicación móvil de bodega",
            reqs: ["INT-006"],
            action: "appmovil",
          },
        ],
      },
    ],
    // infra: [
    //   {
    //     t: "Disponibilidad y continuidad",
    //     ic: "server",
    //     items: [
    //       {
    //         t: "Continuidad operativa: híbrido nube + local y doble enlace",
    //         reqs: ["INF-001", "INF-002"],
    //       },
    //       { t: "Respaldos y recuperación", reqs: ["INF-006"] },
    //     ],
    //   },
    //   {
    //     t: "Desempeño y capacidad",
    //     ic: "chart",
    //     items: [
    //       {
    //         t: "Concurrencia, volumen y rendimiento",
    //         reqs: ["INF-003", "INF-004", "INF-005"],
    //       },
    //     ],
    //   },
    //   {
    //     t: "Seguridad y cumplimiento",
    //     ic: "lock",
    //     items: [
    //       { t: "Seguridad perimetral", reqs: ["INF-007"] },
    //       { t: "Retención de datos", reqs: ["INF-008"] },
    //     ],
    //   },
    // ],
    /* Contabilidad: seis opciones, ordenadas por lo que hace el contador —
       revisar, cuadrar, consultar, informar, cerrar y configurar. El
       sistema registra y cruza solo; el contador atiende la bandeja y una
       persona aprueba el cierre. Lo que antes era una opción ahora es una
       pestaña. En la matriz consolidada solo existen CON-001 a CON-005;
       CON-006 a CON-015 son códigos del demo. CON-005 es «Configuración
       contable por ítem»: vive en Reglas › Cuentas por familia y proveedor. */
    contab: [
      {
        t: "Revisión diaria",
        ic: "book",
        items: [
          {
            t: "Bandeja",
            d: "Lo que el sistema no pudo resolver solo",
            reqs: ["CON-002"],
            screen: "contabilidad",
            tabs: [
              {
                t: "Bandeja del contador",
                id: "",
                kw: "pendientes revisar aprobar sugerencias excepciones panel contable whatsapp gastos por confirmar",
              },
            ],
          },
          {
            t: "Conciliaciones",
            d: "Banco, cajas, inventario y cartera contra su cuenta",
            reqs: ["CON-001"],
            screen: "con-conciliaciones",
            tabs: [
              {
                t: "Banco",
                id: "banco",
                kw: "conciliación bancaria banco nacional movimientos estado de cuenta transferencias",
              },
              {
                t: "Caja y medios de pago",
                id: "caja",
                kw: "cierre de caja depósitos datáfono tarjetas sinpe faltantes sobrantes",
              },
              {
                t: "Inventario",
                id: "inventario",
                kw: "kardex costo promedio ajustes de costo merma venta sin existencia",
              },
              {
                t: "Cartera y proveedores",
                id: "cartera",
                kw: "cuentas por cobrar por pagar auxiliar antigüedad incobrables estimación",
              },
            ],
          },
          {
            // Excepción intencional: INV-001 ("Catálogo: Productos,
            // Servicios, Activos, Materia Prima, etc") describe tanto
            // el catálogo vendible como los activos fijos, así que ese
            // mismo requerimiento se cita en ambos módulos a pedido del
            // cliente. Los activos viven en Libros › Activos fijos.
            t: "Libros",
            d: "Saldos, movimientos, asientos y activos fijos",
            reqs: ["CON-006", "CON-007", "CON-008", "CON-003", "INV-001"],
            screen: "con-libros",
            tabs: [
              {
                t: "Saldos y movimientos",
                id: "saldos",
                kw: "balance de comprobación libro mayor saldo corrido cuenta",
              },
              {
                t: "Asientos",
                id: "asientos",
                kw: "libro diario partidas glosa origen regla asiento manual exportar neo",
              },
              {
                t: "Activos fijos",
                id: "activos",
                kw: "depreciación reglamento vida útil tasas registrar activo",
              },
            ],
          },
        ],
      },
      {
        t: "Cierre e informes",
        ic: "scale",
        items: [
          {
            t: "Informes",
            d: "Estados financieros, por local y familia, presupuesto",
            reqs: ["CON-009", "CON-010", "CON-011", "CON-012", "CON-014"],
            screen: "con-informes",
            tabs: [
              {
                t: "Estados financieros",
                id: "estados",
                kw: "estado de resultados situación financiera balance general flujo de efectivo niif",
              },
              {
                t: "Por local y familia",
                id: "local",
                kw: "centros de costo tiendas sucursales margen por familia",
              },
              {
                t: "Presupuesto",
                id: "presupuesto",
                kw: "ejecución presupuestaria planeado real desvío",
              },
            ],
          },
          {
            t: "Cierre",
            d: "Lista de cierre, aprobación final e impuestos",
            reqs: ["CON-013", "CON-004"],
            screen: "con-cierre",
            tabs: [
              {
                t: "Lista de cierre",
                id: "lista",
                kw: "cerrar mes aprobación final aprobar enviar gerencia devolver",
              },
              {
                t: "Impuestos",
                id: "impuestos",
                kw: "iva 150 retenciones 138 renta pagos parciales patentes municipales tribu-cr calendario tributario borrador",
              },
              {
                t: "Períodos",
                id: "periodos",
                kw: "reabrir bloqueo meses cerrados",
              },
            ],
          },
          {
            t: "Reglas",
            d: "Las cuentas y reglas que hacen que todo corra solo",
            reqs: ["CON-005", "CON-015"],
            screen: "con-reglas",
            tabs: [
              {
                t: "Catálogo de cuentas",
                id: "catalogo",
                kw: "plan contable cuentas niveles nueva cuenta niif marco",
              },
              {
                t: "Cuentas por familia y proveedor",
                id: "cuentas",
                kw: "configuración contable por ítem artículo proveedor gasto cuenta de destino",
              },
              {
                t: "Reglas de conciliación",
                id: "conciliacion",
                kw: "reglas aprendidas cruce automático tolerancia",
              },
              {
                t: "Asientos automáticos",
                id: "asientos",
                kw: "asiento automático documento política exportación neo convivencia",
              },
            ],
          },
        ],
      },
    ],
    /* Nómina: seis opciones, una por tarea — no una por requerimiento.
       Cada opción es un espacio de trabajo; lo que antes era una opción
       de menú ahora es una pestaña (o un paso, en Planilla). "d" se ve
       debajo del nombre en el menú y "tabs" alimenta el buscador, que
       lleva directo a la pestaña ("aguinaldo" → Obligaciones de ley ›
       Aguinaldo). NOM-004 a NOM-018 son códigos del demo: la matriz
       consolidada solo trae NOM-001, NOM-002, NOM-003 y CXP-003. */
    rrhh: [
      {
        t: "Trabajo diario",
        ic: "users",
        items: [
          {
            t: "Panel de nómina",
            d: "Lo pendiente, las planillas en curso y los reportes",
            reqs: ["NOM-017"],
            screen: "nomina",
            tabs: [
              {
                t: "Resumen y pendientes",
                id: "resumen",
                kw: "alertas qué falta atención",
              },
              {
                t: "Reportes de nómina",
                id: "reportes",
                kw: "costo rotación ausentismo indicadores por local por área",
              },
            ],
          },
          {
            t: "Planilla",
            d: "De las novedades al pago y el asiento, paso a paso",
            reqs: ["NOM-001", "NOM-002", "NOM-010", "NOM-011", "CXP-003"],
            screen: "nom-planilla",
            tabs: [
              {
                t: "Novedades del periodo",
                id: "novedades",
                kw: "comisiones adelantos embargos rebajos deducciones préstamos compras de personal preplanilla",
              },
              {
                t: "Cálculo de la planilla",
                id: "calculo",
                kw: "corrida colilla recalcular",
              },
              {
                t: "Aprobación de la corrida",
                id: "aprobacion",
                kw: "resumen patronal cargas firma gerencia",
              },
              {
                t: "Pago y archivo del banco",
                id: "pago",
                kw: "archivo plano banco nacional colillas depósitos sinpe transferencias",
              },
              {
                t: "Asiento y provisiones",
                id: "asiento",
                kw: "contabilidad contabilizar pasivo laboral",
              },
              {
                t: "Periodos de planilla",
                id: "periodos",
                kw: "semanal quincenal mensual historial abrir periodo",
              },
            ],
          },
          {
            t: "Personal",
            d: "Expedientes, movimientos, puestos y salidas",
            reqs: ["NOM-003", "NOM-004", "NOM-005", "NOM-016"],
            screen: "nom-personal",
            tabs: [
              {
                t: "Colaboradores",
                id: "colab",
                kw: "expediente ficha cédula ingreso contratación dependientes",
              },
              {
                t: "Movimientos de personal",
                id: "mov",
                kw: "ingresos salidas aumentos traslados ccss",
              },
              {
                t: "Puestos y salarios",
                id: "puestos",
                kw: "estructura salarial salario mínimo decreto categorías bandas",
              },
              {
                t: "Salidas y liquidaciones",
                id: "salidas",
                kw: "liquidación finiquito preaviso cesantía despido renuncia fcl",
              },
            ],
          },
          {
            t: "Tiempo y ausencias",
            d: "Asistencia, horas extra, vacaciones e incapacidades",
            reqs: ["NOM-006", "NOM-007", "NOM-008", "NOM-009"],
            screen: "nom-tiempo",
            tabs: [
              {
                t: "Asistencia",
                id: "asist",
                kw: "marcas reloj tardías ausencias jornadas",
              },
              {
                t: "Horas extra y feriados",
                id: "extras",
                kw: "recargo tope jornadas de ley",
              },
              { t: "Vacaciones", id: "vac", kw: "saldos solicitud disfrute" },
              {
                t: "Incapacidades y permisos",
                id: "incap",
                kw: "boleta ccss ins maternidad licencias subsidio",
              },
            ],
          },
        ],
      },
      {
        t: "Cumplimiento y ajustes",
        ic: "shield",
        items: [
          {
            t: "Obligaciones de ley",
            d: "CCSS, impuesto al salario, terceros y aguinaldo",
            reqs: ["NOM-012", "NOM-013", "NOM-014", "NOM-015"],
            screen: "nom-obligaciones",
            tabs: [
              {
                t: "Calendario y terceros",
                id: "cal",
                kw: "plazos entidades pensión alimentaria embargo solidarista orden de rebajos ins",
              },
              {
                t: "CCSS · SICERE",
                id: "ccss",
                kw: "cuotas obrero patronal planilla de la ccss",
              },
              {
                t: "Impuesto al salario",
                id: "renta",
                kw: "renta tramos tribu-cr f-138 d-103 crédito hijos cónyuge retención",
              },
              { t: "Aguinaldo", id: "agui", kw: "décimo tercer mes diciembre" },
            ],
          },
          {
            t: "Configuración",
            d: "Tasas, tramos, conceptos y políticas",
            reqs: ["NOM-018"],
            screen: "nom-config",
            tabs: [
              {
                t: "Tasas y tramos",
                id: "tasas",
                kw: "cuotas ivm sem salarios mínimos vigencia",
              },
              {
                t: "Conceptos",
                id: "conceptos",
                kw: "códigos de ingreso y deducción",
              },
              {
                t: "Políticas",
                id: "politicas",
                kw: "esquemas semanal quincenal mensual integraciones salario escolar adelantos",
              },
            ],
          },
        ],
      },
    ],
    logistica: [
      {
        t: "Rutas y tarifario",
        ic: "route",
        items: [
          {
            t: "Tarifario y rutas programadas",
            reqs: ["LOG-001", "LOG-002"],
            screen: "rutas",
          },
          {
            t: "Selección de vehículo y control de sobrepeso",
            reqs: ["LOG-003", "LOG-004"],
          },
        ],
      },
      {
        t: "Seguimiento y postventa",
        ic: "clock",
        items: [
          { t: "Métricas de ruta", reqs: ["LOG-005"] },
          { t: "Postventa tras la entrega", reqs: ["LOG-006"] },
        ],
      },
    ],
    taller: [
      {
        t: "Taller automotriz",
        ic: "wrench",
        items: [
          {
            t: "Órdenes de trabajo del taller automotriz",
            reqs: ["TAL-001"],
          },
          { t: "Bodega de repuestos del taller", reqs: ["TAL-002"] },
        ],
      },
      {
        t: "Reparación de herramientas",
        ic: "wrench",
        items: [
          {
            t: "Taller de reparación de herramientas",
            reqs: ["TAL-003"],
          },
        ],
      },
    ],
    produccion: [
      {
        t: "Producción de prefabricados",
        ic: "factory",
        items: [{ t: "Producción de prefabricados", reqs: ["PRD-001"] }],
      },
      {
        t: "Traslado a punto de venta",
        ic: "truck",
        items: [
          {
            t: "Traslado de planta a local de venta",
            reqs: ["PRD-002"],
          },
        ],
      },
    ],
  };

  function menuFlatten() {
    var out = [];
    MODULES.forEach(function (m) {
      (MENU_TREE[m.id] || []).forEach(function (sec) {
        sec.items.forEach(function (it) {
          out.push({
            modId: m.id,
            modT: m.t,
            modIc: m.ic,
            secT: sec.t,
            t: it.t,
            d: it.d,
            reqs: it.reqs || [],
            screen: it.screen,
            action: it.action,
            arg: it.arg,
            tabs: it.tabs || [],
          });
        });
      });
    });
    return out;
  }
  // Cantidad de requerimientos de la matriz que aporta un módulo
  // (suma reqs.length de cada opción de menú; no es lo mismo que la
  // cantidad de opciones de menú, que hoy es menor porque varios
  // requerimientos comparten una sola opción).
  function menuReqCount(modId) {
    var n = 0;
    (MENU_TREE[modId] || []).forEach(function (sec) {
      sec.items.forEach(function (it) {
        n += (it.reqs || []).length;
      });
    });
    return n;
  }
  // Cantidad de opciones de menú (nivel 3) de un módulo.
  function menuCount(modId) {
    var n = 0;
    (MENU_TREE[modId] || []).forEach(function (sec) {
      n += sec.items.length;
    });
    return n;
  }
  // Ubica una pantalla dentro del árbol de navegación (para las migas de pan).
  function menuPathFor(screenId) {
    for (var i = 0; i < MODULES.length; i++) {
      var m = MODULES[i];
      var secs = MENU_TREE[m.id] || [];
      for (var j = 0; j < secs.length; j++) {
        var sec = secs[j];
        for (var k = 0; k < sec.items.length; k++) {
          if (sec.items[k].screen === screenId && !sec.items[k].alias) {
            return { mod: m, sec: sec, item: sec.items[k] };
          }
        }
      }
    }
    return null;
  }
  var SCREENS = {
    pos: {
      t: "Punto de venta",
      ic: "cart",
      g: "Ventas",
      d: "Facturación ágil, con escaneo y catálogo táctil",
    },
    documentos: {
      t: "Documentos y devoluciones",
      ic: "file",
      g: "Ventas",
      d: "Comprobantes, devoluciones con firma y notas de crédito",
    },
    cotizaciones: {
      t: "Cotizaciones y pedidos",
      ic: "file",
      g: "Ventas",
      d: "Proformas, pedidos, link de pago y ventas perdidas",
    },
    despachos: {
      t: "Entregas y retiros",
      ic: "box",
      g: "Ventas",
      d: "Por despachar, retiros en otro local y entregados",
    },
    rutas: {
      t: "Rutas y transporte",
      ic: "route",
      g: "Ventas",
      d: "Tarifario por peso y rutas del día",
    },
    clientes: {
      t: "Clientes",
      ic: "users",
      g: "Clientes",
      d: "Ficha, crédito y compras",
    },
    "ven-pendientes": {
      t: "Pendientes de ventas",
      ic: "check",
      g: "Ventas",
      d: "Lo que hay que atender hoy en ventas",
    },
    caja: {
      t: "Caja y turnos",
      ic: "cash",
      g: "Ventas",
      d: "Apertura, retiros, arqueo, cierre y terminales",
    },
    "ven-precios": {
      t: "Precios, descuentos y márgenes",
      ic: "wallet",
      g: "Ventas",
      d: "Categorías, volumen, convenios, márgenes y autorizaciones",
    },
    "ven-relacionados": {
      t: "Sugerencia de productos relacionados",
      ic: "sparkle",
      g: "Ventas",
      d: "Complementos sugeridos en la caja, reglas y pares aprendidos",
    },
    "ven-vendedores": {
      t: "Vendedores y comisiones",
      ic: "users",
      g: "Ventas",
      d: "Desempeño, metas, comisiones y clave en mostrador",
    },
    cxc: {
      t: "Análisis y gestión de cobro",
      ic: "wallet",
      g: "Cobros y pagos",
      d: "Antigüedad, estado de cuenta, gestiones e incobrables",
    },
    "cob-credito": {
      t: "Crédito de clientes",
      ic: "users",
      g: "Cobros y pagos",
      d: "Líneas, bloqueos, solicitudes y excepciones",
    },
    "cob-ruta": {
      t: "Conta ruta",
      ic: "route",
      g: "Cobros y pagos",
      d: "Crédito de un día con entrega a domicilio",
    },
    "cob-recibos": {
      t: "Recibos de dinero",
      ic: "cash",
      g: "Cobros y pagos",
      d: "Pagos a varias facturas, REP y transferencias por WhatsApp",
    },
    "cob-anticipos": {
      t: "Anticipos de cliente",
      ic: "wallet",
      g: "Cobros y pagos",
      d: "Adelantos, saldos a favor y depósitos sin identificar",
    },
    "sis-locales": {
      t: "Empresa y estructura",
      ic: "pin",
      g: "Sistema",
      d: "Locales, terminales, áreas, departamentos y razón social",
    },
    "sis-territorios": {
      t: "Territorios de clientes",
      ic: "pin",
      g: "Sistema",
      d: "Dónde vive el cliente y dónde compra",
    },
    "sis-categorias": {
      t: "Categorías, marcas y unidades",
      ic: "layers",
      g: "Sistema",
      d: "Categorías, marcas, unidades y presentaciones",
    },
    "sis-ubicaciones": {
      t: "Ubicación física de artículos",
      ic: "pin",
      g: "Sistema",
      d: "Pasillo, anaquel, cara y estante",
    },
    "sis-terminos": {
      t: "Términos de pago",
      ic: "calc",
      g: "Sistema",
      d: "Plazos de clientes y proveedores",
    },
    "sis-estados": {
      t: "Estados, numeración y motivos",
      ic: "gear",
      g: "Sistema",
      d: "Flujos, numeración, motivos y nombres",
    },
    "sis-parametros": {
      t: "Parámetros generales",
      ic: "gear",
      g: "Sistema",
      d: "Caja, márgenes, costos, crédito y reportes",
    },
    "sis-pagos": {
      t: "Medios de pago y monedas",
      ic: "card",
      g: "Sistema",
      d: "Medios de pago, tipo de cambio y cuentas",
    },
    "sis-plantillas": {
      t: "Plantillas y mensajes",
      ic: "print",
      g: "Sistema",
      d: "Documentos impresos, correo y WhatsApp",
    },
    "sis-alertas": {
      t: "Notificaciones y alertas",
      ic: "bell",
      g: "Sistema",
      d: "Qué evento avisa, a quién y por dónde",
    },
    "sis-integraciones": {
      t: "Conexiones con otros sistemas",
      ic: "link",
      g: "Sistema",
      d: "Hacienda, bancos, WhatsApp, correo y nodos",
    },
    "sis-versiones": {
      t: "Versiones y ambiente de pruebas",
      ic: "upload",
      g: "Sistema",
      d: "Notas, aceptación, pruebas y respaldos",
    },
    bodega: {
      t: "Pendientes de bodega",
      ic: "check",
      g: "Catálogo",
      d: "Lo que hay que atender hoy en la bodega",
    },
    catalogo: {
      t: "Catálogo",
      ic: "box",
      g: "Catálogo",
      d: "Artículos, precios, códigos y etiquetas, carga masiva",
    },
    existencias: {
      t: "Existencias",
      ic: "layers",
      g: "Catálogo",
      d: "Por local, kardex, apartados, contra pedido y segunda",
    },
    traslados: {
      t: "Traslados",
      ic: "route",
      g: "Catálogo",
      d: "Sugerido del CEDI, recibido con escáner y diferencias",
    },
    ajustes: {
      t: "Conteos y ajustes",
      ic: "check",
      g: "Catálogo",
      d: "Conteo del día, mermas con foto y plan del año",
    },
    reposicion: {
      t: "Reposición",
      ic: "sparkle",
      g: "Catálogo",
      d: "Sugerido de compra, ventas atípicas y temporadas",
    },
    subasta: {
      t: "Cotizar a proveedores",
      ic: "scale",
      g: "Compras",
      d: "Comparar precios antes de adjudicar",
    },
    ordenes: {
      t: "Órdenes y recepción",
      ic: "truck",
      g: "Compras",
      d: "Orden de compra y recepción en bodega",
    },
    proveedores: {
      t: "Proveedores",
      ic: "users",
      g: "Compras",
      d: "Ficha, plazo y estado de cuenta",
    },
    cxp: {
      t: "Análisis de pagos a proveedores",
      ic: "bank",
      g: "Cobros y pagos",
      d: "Vencimientos, pronto pago y lote de la semana",
    },
    "cob-archivo": {
      t: "Pagos al banco",
      ic: "upload",
      g: "Cobros y pagos",
      d: "Proveedores y planilla: firmas, archivo plano BN y confirmación",
    },
    "cob-estado-prov": {
      t: "Estado de cuenta del proveedor",
      ic: "file",
      g: "Cobros y pagos",
      d: "Saldo, facturas, pagos y notas aplicadas",
    },
    "cob-notas-prov": {
      t: "Notas a proveedor",
      ic: "swap",
      g: "Cobros y pagos",
      d: "Notas de crédito y débito con conceptos configurables",
    },
    "cob-cajachica": {
      t: "Caja chica y tarjeta",
      ic: "card",
      g: "Cobros y pagos",
      d: "Fondos, vales, reposición y tarjeta empresarial",
    },
    fiscal: {
      t: "Facturación electrónica",
      ic: "file",
      g: "Fiscal",
      d: "Panel del módulo: emisión, plazos y alertas",
    },
    "fel-emitidos": {
      t: "Comprobantes emitidos",
      ic: "file",
      g: "Fiscal",
      d: "Clave, XML y respuesta de Hacienda",
    },
    "fel-recibidos": {
      t: "Comprobantes recibidos",
      ic: "swap",
      g: "Fiscal",
      d: "Mensaje de receptor y crédito fiscal",
    },
    "fel-rep": {
      t: "Recibo electrónico de pago",
      ic: "wallet",
      g: "Fiscal",
      d: "IVA diferido y tope de 90 días",
    },
    "fel-cola": {
      t: "Cola de envío y errores",
      ic: "upload",
      g: "Fiscal",
      d: "Rechazos con su código y su causa",
    },
    "fel-contingencia": {
      t: "Contingencia",
      ic: "server",
      g: "Fiscal",
      d: "Provisionales y conversión en 2 días",
    },
    "fel-consecutivos": {
      t: "Consecutivos y clave",
      ic: "layers",
      g: "Fiscal",
      d: "Serie por sucursal y terminal",
    },
    "fel-llave": {
      t: "Llave criptográfica",
      ic: "lock",
      g: "Fiscal",
      d: "Custodia en la nube y vencimiento",
    },
    "fel-cabys": {
      t: "CABYS, tarifas y exoneraciones",
      ic: "book",
      g: "Fiscal",
      d: "El código decide la tarifa de IVA",
    },
    "fel-iva": {
      t: "IVA del período",
      ic: "scale",
      g: "Fiscal",
      d: "Débito, crédito y declaración D-150",
    },
    "fel-config": {
      t: "Configuración fiscal",
      ic: "gear",
      g: "Fiscal",
      d: "Emisor, actividades y parámetros",
    },
    contabilidad: {
      t: "Bandeja del contador",
      ic: "check",
      g: "Contabilidad",
      d: "Lo que el sistema no pudo resolver solo",
    },
    "con-conciliaciones": {
      t: "Conciliaciones",
      ic: "swap",
      g: "Contabilidad",
      d: "Banco, cajas, inventario y cartera contra su cuenta",
    },
    "con-libros": {
      t: "Libros",
      ic: "book",
      g: "Contabilidad",
      d: "Saldos, movimientos, asientos y activos fijos",
    },
    "con-informes": {
      t: "Informes",
      ic: "chart",
      g: "Contabilidad",
      d: "Estados financieros, por local y familia, presupuesto",
    },
    "con-cierre": {
      t: "Cierre",
      ic: "lock",
      g: "Contabilidad",
      d: "Lista de cierre, aprobación final e impuestos",
    },
    "con-reglas": {
      t: "Reglas contables",
      ic: "gear",
      g: "Contabilidad",
      d: "Cuentas y reglas que hacen que todo corra solo",
    },
    nomina: {
      t: "Panel de nómina",
      ic: "users",
      g: "Nómina",
      d: "Lo pendiente, las planillas en curso y los reportes",
    },
    "nom-planilla": {
      t: "Planilla",
      ic: "wallet",
      g: "Nómina",
      d: "Novedades, cálculo, aprobación, pago y asiento",
    },
    "nom-personal": {
      t: "Personal",
      ic: "badge",
      g: "Nómina",
      d: "Expedientes, movimientos, puestos y salidas",
    },
    "nom-tiempo": {
      t: "Tiempo y ausencias",
      ic: "clock",
      g: "Nómina",
      d: "Asistencia, horas extra, vacaciones e incapacidades",
    },
    "nom-obligaciones": {
      t: "Obligaciones de ley",
      ic: "shield",
      g: "Nómina",
      d: "CCSS, impuesto al salario, terceros y aguinaldo",
    },
    "nom-config": {
      t: "Configuración de nómina",
      ic: "gear",
      g: "Nómina",
      d: "Tasas, tramos, conceptos y políticas",
    },
    whatsapp: {
      t: "Agente de WhatsApp",
      ic: "chat",
      g: "Inteligencia",
      d: "Atiende consultas con el inventario real",
    },
    preguntas: {
      t: "Preguntas en lenguaje natural",
      ic: "sparkle",
      g: "Inteligencia",
      d: "Consulte datos sin un reporte preprogramado",
    },
    reportes: {
      t: "Reportes",
      ic: "chart",
      g: "Inteligencia",
      d: "Catálogo de reportes, con gráfico primero",
    },
    usuarios: {
      t: "Usuarios y accesos",
      ic: "users",
      g: "Sistema",
      d: "Usuarios, solicitudes, sesiones y revisión de accesos",
    },
    "seg-roles": {
      t: "Roles y permisos",
      ic: "lock",
      g: "Sistema",
      d: "Pantallas, acciones, campos y segregación",
    },
    "seg-politicas": {
      t: "Políticas de acceso y sesión",
      ic: "shield",
      g: "Sistema",
      d: "Sesión, contraseñas, doble factor y enlaces",
    },
    "seg-autorizaciones": {
      t: "Autorización de excepciones",
      ic: "scale",
      g: "Sistema",
      d: "Pendientes, quién autoriza qué e historial",
    },
    historial: {
      t: "Bitácora de auditoría",
      ic: "history",
      g: "Sistema",
      d: "Quién, cuándo, qué valor cambió y quién autorizó",
    },
    config: {
      t: "Este equipo",
      ic: "sun",
      g: "Sistema",
      d: "Modo oscuro, terminal y simulación de caída del enlace",
    },
  };

  w.NAV = {
    MODULES: MODULES,
    MENU_TREE: MENU_TREE,
    SCREENS: SCREENS,
    menuFlatten,
    menuReqCount,
    menuCount,
    menuPathFor,
  };
})(window);
