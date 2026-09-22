# Cambios

## 2026-09-21 · Sistema · Una pantalla por opción, según la matriz

Antes había 8 opciones de menú pero solo 2 con pantalla, y las dos abrían la misma «Configuración».
Ahora cada opción tiene la suya y los 11 requerimientos SIS quedan en el menú (SIS-011 no aparecía).
Es demostración: se ve cómo queda cada catálogo y funcionan las acciones que cuentan la historia.

| Sección | Opción | Pestañas | Requerimientos |
|---|---|---|---|
| Organización y locales | Empresa, locales y áreas | Locales y bodegas · Áreas · Razón social | SIS-001, 002, 003 |
| Organización y locales | Territorios de clientes | Territorio × local donde compra | SIS-004 |
| Catálogo y clasificación | Categorías, marcas y departamentos | Categorías (padre → hija) · Marcas · Departamentos | SIS-006, 007 |
| Catálogo y clasificación | Ubicación física de artículos | Por local · Sin ubicación | SIS-009 |
| Reglas de negocio y documentos | Términos de pago | Contado, conta ruta, crédito 15–90, atípicos, pronto pago | SIS-005 |
| Reglas de negocio y documentos | Estados de los documentos | Flujos · Cambios de nombre | SIS-008, 011 |
| Reglas de negocio y documentos | Versiones y ambiente de pruebas | Próxima versión · Ambiente de pruebas · Historial · Respaldos | SIS-010 |
| Preferencias | Este equipo | Modo oscuro, terminal, simular caída del enlace | — |

- La **tienda virtual** deja de ser «esclava» del local 2: es un área con su propia venta.
- **Renombrar** un estado, una categoría o un departamento guarda el historial y no cambia lo ya
  emitido (SIS-011).
- **Próxima versión**: notas y aceptación por área; no se puede aceptar hasta que todas prueben (HAL-08).
- **Ambiente de pruebas** refrescado con los datos personales enmascarados (HAL-03).
- **Respaldos y copia de la base** para Santa Rosa (nota de la sesión 2 en MIG-001).
- Acciones que funcionan: agregar local, renombrar, ubicar un artículo, crear término de pago, aceptar
  versión, refrescar pruebas, solicitar copia, modo oscuro.
- Archivos: `mod-sys.js` (la antigua «Configuración» se reemplazó; usuarios y bitácora no cambiaron) y
  `nav.js` (árbol de Sistema; la pantalla `config` ahora es «Este equipo»). El margen por familia que
  vivía aquí está en Ventas › Precios, descuentos y márgenes.

## 2026-09-21 · Ventas · Reglas de productos relacionados: una por artículo, hasta 6 sugeridos

- `ven-auto.js`: cada regla es ahora **un artículo que dispara la sugerencia y hasta 6 sugeridos** en el
  orden en que salen en la caja; cada sugerido conserva su cantidad (por unidad o fija), su porqué y
  su historial de mostradas y aceptadas. Las 19 reglas anteriores quedaron reagrupadas en 23, una por
  artículo (el tubo PVC ½" trae los 6: codo, cemento solvente, unión, teflón, tee y llave de paso).
  Aprobar un par aprendido lo suma a la regla del artículo, o crea la regla si no existe; si ya tiene 6,
  avisa.
- `mod-venta-gestion.js`, pestaña *Reglas*: una fila por artículo con sus sugeridos numerados y un
  buscador. **Clic en la fila abre el panel para editarla.** En el panel, el artículo y los sugeridos se
  eligen con un **campo de texto que filtra al escribir** (código, nombre, marca o código de barras,
  tolera acentos, ↑ ↓ ⏎), nunca con un combo, porque en producción son más de 15 000 artículos. Los
  sugeridos se ordenan con ↑ ↓, se quitan con ✕ y se validan (porqué obligatorio, cantidad mayor que
  cero). Si se elige un artículo que ya tiene regla, se abre esa regla.
- `mod-venta.js`: la caja muestra hasta 6 sugeridos y acepta ⌥1–6 / Alt 1–6.
- El **porqué de cada sugerido** queda a la vista: en el panel cada sugerido trae sus campos rotulados
  «Cantidad» y «Por qué se sugiere · lo lee el vendedor en la caja» (obligatorio; al agregar un sugerido
  el cursor queda ahí), y en la lista de reglas cada sugerido se muestra con su porqué y su cantidad.

## 2026-09-21 · Ventas · Sugerencia de productos relacionados (VEN-016)

Lo que el vendedor experto sugiere de memoria, en la caja para todos. Deja de ser «Próximamente».

- **En la caja** (`mod-venta.js`): debajo de la factura en curso aparece «Suele llevarse con…» para la
  línea elegida o recién agregada (sin línea elegida, para toda la factura). Hasta cuatro complementos
  con la cantidad ya calculada sobre la línea (28 láminas → 224 tornillos con empaque) y el porqué.
  Se agregan con un clic o con ⌥1–4 / Alt 1–4 sin soltar el teclado; nunca interrumpe la venta.
  No sugiere lo que ya está en la factura.
- **Corrección en la caja**: el atajo de teclado se registraba otra vez en cada repintado y una tecla
  podía ejecutarse varias veces (F3 guardaba varias proformas). Ahora se registra una sola vez.
- **Nueva opción** Ventas › Mostrador › Sugerencia de productos relacionados (`mod-venta-gestion.js`),
  con tres pestañas: *En la caja* (mostradas, aceptadas, venta adicional y resultados por vendedor:
  el nuevo acepta más, el experto ya lo sabía), *Reglas* (qué sugerir con cada artículo, en qué
  cantidad y por qué; se crean y se activan o desactivan) y *Aprendidas de las ventas* (pares que el
  sistema encuentra cada noche en 90 días de facturas, con confianza y relación contra el azar; llegan a
  la caja solo si alguien los aprueba, y la coincidencia se marca para descartarla).
- `ven-auto.js`: 19 reglas de ejemplo (techo, concreto, varilla, bloque, fontanería, grifería, pintura,
  eléctrico, riego), 6 pares detectados, resultados por vendedor y un pendiente en «Pendientes de
  ventas» cuando hay pares por revisar.
- `nav.js`: la opción ya tiene pantalla y palabras clave por pestaña. `index.html`: estilos de la
  tarjeta de sugerencias.

## 2026-09-21 · Ventas · El módulo reagrupado por tareas, según la matriz

Los 27 requerimientos VEN quedan en 11 opciones, una por tarea de quien vende (no una por
requerimiento); lo que antes era una opción ahora es una pestaña. La caja no cambió de lugar.

| Sección | Opción | Pestañas | Requerimientos |
|---|---|---|---|
| Mostrador | Facturación en el punto de venta | (sin cambios de diseño) | VEN-001, 002, 013, 018, 020, 021, 022, 024 |
| Mostrador | **Pendientes de ventas** | Una vista: autorizar, entregar, dar seguimiento, caja | — |
| Mostrador | **Caja y turnos** | Mi caja · Cajas del local · Terminales y cajeros | VEN-025, 027 |
| Antes y después | Cotizaciones y pedidos | Proformas · Pedidos · Ventas perdidas | VEN-003, 019 |
| Antes y después | Entregas y retiros | Por despachar · Retiros en otro local · En ruta y entregados | VEN-004, 005, 006 |
| Antes y después | Documentos y devoluciones | Documentos emitidos · Devolver mercadería · Notas de crédito | VEN-011, 012 |
| Clientes y precios | Clientes | Ficha · Crédito · Compras | VEN-023 (y CXC-001/002 desde Cobros) |
| Clientes y precios | **Precios, descuentos y márgenes** | Por categoría de cliente · Volumen y convenios · Márgenes mínimos · Autorizaciones | VEN-007, 008, 009, 010, 014, 015 |
| Clientes y precios | **Vendedores y comisiones** | Desempeño · Metas y comisiones · Clave en mostrador | VEN-026 |

Quedan como «Próximamente» VEN-016 (sugerencia de relacionados, vive dentro de la caja) y VEN-017
(autogestión, fase 3).

Archivos:

- `ven-auto.js` (**nuevo**): datos y lógica de lo que la venta hace sola (`window.VENX`): descuentos por
  categoría y volumen con tope por margen, convenios, márgenes, autorizaciones de un solo uso con
  consumo y barrido, cajas y turnos, proformas y pedidos con peso y flete, entregas con reserva en el
  local de retiro y constancia de quién recibe, devoluciones con concepto y firma, ficha del cliente,
  bloqueo de crédito, vendedores, metas y comisiones, y `pendientes()`.
- `mod-venta-gestion.js` (**nuevo**): las ocho opciones de arriba (sin la caja).
- `mod-venta.js`: salen documentos, cotizaciones, despachos y clientes (se mudaron). En la caja, tres
  enganches mínimos: el descuento de la categoría del cliente y por volumen se aplica solo (un
  descuento digitado a mano no se toca); la autorización de margen se consume al aplicar la factura y
  se cierra al cancelarla; la observación de la línea viaja al documento.
- `nav.js`: árbol de Ventas con tres secciones y palabras clave por pestaña; en Cobros y pagos,
  «Límite y bloqueo de crédito» abre la misma pantalla de Clientes en la pestaña Crédito.
- `index.html`: carga `ven-auto.js` y `mod-venta-gestion.js`.

Verificado: 51 pantallas y las 23 pestañas nuevas sin errores; 24 recorridos completos (arqueo con
diferencia justificada, pedido de WhatsApp a factura, retiro en otro local con firma, devolución con
aprobación, autorización consumida en la factura, etc.); sin desborde en 1920, 1366, retina y móvil.

## 2026-09-21 · POS · Cantidad y precio se editan en la misma fila

En monitor grande cada fila de «Factura en curso» dejaba un espacio vacío, y cambiar la
cantidad obligaba a seleccionar la fila primero. Revisión con criterio UX:

- `mod-venta.js`: la columna **Cant.** trae `−  campo  +` en cada fila (un clic en vez de dos);
  **P. unit.** se ve igual que antes pero es editable en la fila. En los campos: ⏎ confirma y
  vuelve al escáner, Tab / Mayús+Tab recorren cantidad → precio → siguiente fila, ↑ ↓ ajustan
  la cantidad, Esc descarta. La fila editada queda seleccionada para que el panel muestre su detalle.
- El panel derecho ya no tiene cantidad ni precio unitario (estaban repetidos): queda
  presentación, descuento, observaciones, autorización de margen y el resumen de la línea.
- Cambiar el precio sigue siendo un permiso (sesión 1): con el perfil *Mostrador* el precio se ve
  pero no se edita; con *Gerencia* sí. Un precio bajo el margen mínimo sigue pidiendo autorización.
- `index.html`: estilos `.qstep` (− campo +) y `.celed` (celda editable que parece texto hasta
  pasar el mouse).

## 2026-09-21 · UI · Escala de lectura en monitores grandes

En monitores grandes la letra se veía pequeña. Ahora todo el sistema se agranda solo,
igual que el zoom del navegador (letra, espacios e íconos en la misma proporción),
según el monitor donde esté la ventana:

- Laptop retina (13" a 16"): sin cambio.
- Monitor normal desde 18" (1366 a 1680 px de ancho) o cualquiera de 1920 px: **+10 %**.
- Monitor de 2560 px o más (27" QHD, 4K): **+15 %**.
- Ventana de menos de 1200 px de ancho: sin cambio, para no apretar el diseño.

Archivos compartidos tocados (cambios pequeños):

- `index.html`: script de escala en el encabezado (fija `--z` antes de pintar y lo recalcula al cambiar de monitor o tamaño), `html { zoom: var(--z) }`, y las alturas en `vh` del armazón, el menú, las listas y las conversaciones divididas entre `--z` para que lo que llenaba la pantalla la siga llenando.
- `core.js`: `rectZ()` y `anchoZ()` traducen coordenadas de pantalla al espacio CSS (el popover del local caía corrido con el zoom), y un observador divide entre `--z` las alturas en `vh` que las pantallas escriben en línea (`h: "calc(100dvh - 470px)"` de las tablas y similares). Ningún módulo se tocó.
- `shell.js`: los consejos flotantes usan `rectZ()` / `anchoZ()`.

Verificado en las 47 pantallas con perfiles de laptop retina 13", monitor 18,5" (1366),
22" (1920), 27" (2560) y ventana angosta: sin desbordes ni errores, y el popover del
local y los consejos caen justo debajo de su ancla.

## 2026-09-21 · Unificación de las tres carpetas

Base: `servecore-fsr-fuentes-v15 - RRHH` (la más reciente, 19–20 set). Es idéntica
al artefacto publicado "ServeCore FSR · rediseño" y ya trae:

- Contabilidad rediseñada (6 opciones: bandeja, conciliaciones, libros, informes, cierre, reglas; todo automático, el contador revisa y una persona aprueba el cierre).
- Nómina y RRHH (19-set).
- Inventarios con ubicaciones físicas, presentaciones y cantidades decimales (20-set).

Se le sumó lo que solo existía en `ServeCore-FSR-rediseno - POS`:

- `mod-venta.js`: teclas de la caja como botones clicables (F2, F3, F4, F6, F7, F8, F10), F3 guardar como proforma, F7 apartar, **F10 cancelar factura** (confirma, vacía, borra el borrador, libera lo apartado, deja bitácora y no gasta consecutivo), y borrador del nodo local con hora real.
- `index.html`: estilos `.kbdb` y la barra de teclas convertida en fila de acciones en pantallas angostas.
- Se combinó a mano con el POS de la base: se conservan las cantidades decimales, las presentaciones y la ubicación del artículo, y además cada cambio actualiza el borrador.

Lo que se descartó por estar superado en la base:

- `ServeCore-FSR-fuentes - Conta`: versión anterior (18-set) de contabilidad, nómina e inventario, con 13 pantallas contables sueltas que luego se reagruparon. No tenía nada que no esté en la base (la única diferencia es un nombre de ejemplo en `con-data.js`).
- `mod-fin.js` (carpetas POS y Conta): bancos, contabilidad y nómina viejos; hoy viven en `mod-conta.js`, `mod-nomina.js` y `mod-planilla.js`.
- En la carpeta POS, `nav.js` y `mod-compra.js` traían el menú y la pantalla fiscal anteriores; se mantienen los de la base.
