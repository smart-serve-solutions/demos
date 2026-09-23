# Cambios

## 2026-09-22 · Contabilidad de Ventas · Asientos que faltaban y cuentas reales

Hallazgos C4, C6 y F4 de la auditoría del POS y 4 y 5 de Configuración.

- **Un solo catálogo de cuentas** en `data.js`. Contabilidad agregaba cuentas por su lado en `con-data.js` y
  `con-auto.js`; ahora solo agrupa. Cuentas nuevas: tarjetas por liquidar, reclamos a proveedores, bancos BCR,
  Popular y BN dólares, anticipos y saldos a favor de clientes, devoluciones sobre ventas, impuesto al salario
  retenido y deducciones de terceros por pagar.
- **Cada medio de pago tiene su cuenta** (`D.CUENTA_MEDIO`): efectivo a Caja, tarjeta a «Tarjetas por liquidar»,
  SINPE, transferencia y cheque al banco, anticipo contra el pasivo con el cliente. Antes todo lo que no era
  efectivo iba al Banco Nacional. En Configuración › Medios de pago la cuenta se escoge del catálogo, la caja la
  usa al asentar y el cambio queda en la bitácora con la cuenta anterior y la nueva.
- **Lotes del datáfono reales:** salen de lo cobrado con tarjeta en cada local y día (menos lo devuelto a la
  tarjeta), y el lote acreditado se asienta: banco por el neto, comisión a gastos financieros, se cancela lo
  que estaba por liquidar. «Tarjetas por liquidar» queda con saldo igual a lo que está en tránsito.
- **La nota de crédito se asienta:** devoluciones (o descuentos, si el concepto es descuento, financiera o
  promocional), IVA a la cuenta donde quedó el de la factura, y el reintegro a caja, tarjeta, banco, cuenta por
  cobrar o saldo a favor. Si vuelve mercadería se reversa el costo: al inventario, a reclamos al proveedor o a
  merma, según el destino. Lo que excede el saldo de la factura queda a favor del cliente. Las NC del histórico
  tienen su asiento y su reintegro sigue a cómo se pagó la factura.
- **Anticipos:** el pago de un pedido por link entra al banco como anticipo del cliente; en la caja, «Anticipo»
  solo alcanza hasta el saldo a favor y lo rebaja.
- **Cierre de caja en Ventas:** la diferencia se asienta. Dentro de la tolerancia va a «Diferencias de caja»; un
  faltante mayor se le carga al cajero en cuentas por cobrar a colaboradores.
- **Cuentas bancarias** con su cuenta contable; una cuenta bancaria nueva abre su cuenta en el catálogo.
- **Departamentos con centro de costo** en lugar de cuentas que no existían («5-01-01 Gastos de ventas» es el
  costo de la mercadería). Planilla: el impuesto al salario y las deducciones de terceros ya no caen en
  «Salarios por pagar».

Archivos: `data.js`, `con-data.js`, `con-auto.js`, `ven-auto.js`, `mod-venta.js`, `mod-venta-gestion.js`,
`mod-sys.js`, `mod-planilla.js`.

## 2026-09-22 · Ventas y Facturación · IVA por tarifa y exoneraciones

Hallazgo C1 de la auditoría del POS: el IVA era un 13 % fijo para todo y las exoneraciones registradas
nunca se aplicaban.

- **Tarifa por línea desde el CABYS.** Cada artículo lleva su tarifa y su código de tarifa del XML 4.4
  (13 % = 08, 1 % = 02…). Se agregaron dos insumos agropecuarios al 1 %: fertilizante 10-30-10 y manguera de
  riego agrícola. Los servicios de instalación y de flete llevan su propio CABYS (antes todos usaban el de taller).
- **`D.totalizar` calcula línea por línea:** base, IVA y exoneración de cada línea, y el encabezado es la suma de
  las líneas ya redondeadas (no puede aparecer el rechazo 4001). Devuelve el desglose por tarifa (`porTarifa`),
  el IVA exonerado y la referencia de la exoneración.
- **Exoneraciones en una sola fuente:** la ficha del cliente (`c.exoneraciones`). La caja, la ficha de Ventas y
  Facturación la leen de ahí; se aplica la vigente a la fecha del documento (`D.exoneracionDe`). La Municipalidad
  y la ASADA ya no pagan IVA, y la factura guarda el número de autorización.
- La nota de crédito devuelve el IVA con la misma exoneración de la factura que corrige.
- **REP e IVA diferido proporcionales** al IVA real de la factura (antes 13/113 fijo, que cobraba IVA a
  las exoneradas y sobrestimaba lo que llevaba líneas al 1 %).
- Caja, detalle del comprobante, ficha del artículo y plantillas muestran el IVA por tarifa y lo exonerado.
- La actividad económica del receptor va con 6 dígitos, igual que la del emisor.
- **Partida doble obligatoria:** `D.asentar` rechaza un asiento cuyos débitos no igualen los créditos. Encontró
  de inmediato las compras, que redondeaban por separado el subtotal, el IVA y el total (₡1 de diferencia).

Archivos: `data.js`, `fis-data.js`, `ven-auto.js`, `mod-venta.js`, `mod-venta-gestion.js`, `mod-inv.js`,
`mod-sys.js`.

## 2026-09-22 · Sistema · Un solo emisor, numeración real y terminales

Hallazgos 3, 9, 10 y 13 de la auditoría de Configuración.

- **Una sola ficha del emisor** (`D.emisor`). Sistema la edita y la leen la clave numérica, Facturación, las
  plantillas y la planilla. Antes Sistema tenía su copia con la cédula `3-101-XXXXXX` y una actividad de 4
  dígitos, y editarla no cambiaba lo que emitía Facturación.
- Domicilio fiscal codificado como lo pide el XML 4.4: provincia, cantón y distrito (3-05-09, Santa Rosa de
  Turrialba) más otras señas (hasta 250 caracteres). Tipo de identificación con código (02 · jurídica).
  La ficha valida que el cantón y el distrito pertenezcan a la provincia y pide el motivo del cambio, que queda
  en la bitácora con los valores de antes y de después.
- **Plantillas con un comprobante real** del histórico: consecutivo, clave de 50 dígitos, actividad, condición
  de venta, medio de pago, situación, CABYS por línea, y en el tiquete de 80 mm el desglose de subtotal e IVA.
- **Numeración de documentos:** una fila por cada comprobante fiscal (FE, TE, NC, ND, REP, FEC) con el próximo
  número real de la caja activa; los internos (proforma, OC, traslado, ajuste, asiento) muestran su próximo
  número real y el formato que de verdad se usa (`PROF-{n}`, `AJ-{n}`).
- **Terminales:** una terminal nueva existe desde que se crea (cuenta en el local, aparece en la lista, puede
  facturar y su serie empieza en 1). Los textos ya no dicen que la terminal «se registra ante Hacienda»: la
  numeración la administra el emisor y Hacienda valida que la serie no tenga saltos ni repetidos.
- La bitácora de Sistema usa el reloj de la demo.

Archivos: `data.js`, `fis-data.js`, `mod-fiscal.js`, `mod-sys.js`.

## 2026-09-22 · Facturación · Estado ante Hacienda único y cobro con REP en una sola vía

Segunda revisión de la auditoría contable sobre la numeración fiscal.

- **Estado ante Hacienda en un solo lugar.** Vive en el documento (`doc.hacienda`) y la capa fiscal solo agrega
  el historial del envío (`FIS.registrar`). Antes lo que se emitía en la sesión no tenía capa y aparecía en la
  cola para siempre, aunque la caja lo anunciara como aceptado; y un 3.5 % del histórico decía «Rechazado» en
  Facturación y «Aceptado» en Ventas. Ventas muestra ahora el estado real (en cola, en proceso, rechazado).
- **Reconexión.** Al restablecer el enlace, lo que la caja encoló (comprobantes y REP) se transmite y queda
  aceptado (`FIS.transmitirCola`).
- **Contingencia decidida al emitir.** La situación 2 se asigna en la emisión, no después; las NC copian la
  clave definitiva de su factura (antes podían apuntar a una clave que ya no existía, el rechazo 4120). En
  contingencia o sin enlace, el envío a Hacienda sale después de la emisión y no en segundos.
- **Cobro con REP, una sola vía** (`FIS.aplicarCobro`), la usen Cuentas por cobrar o Facturación: valida el
  monto (entre ₡1 y el saldo), emite el REP desde la caja que cobra con el medio elegido, baja la cartera,
  guarda saldo anterior y nuevo, y asienta (efectivo a Caja, lo demás a Banco; IVA del diferido al del mes).
  Antes, en Facturación se ignoraban el monto y el medio, no bajaba el saldo ni asentaba, y se podía emitir
  otro REP por el mismo saldo.
- Se quitó el botón «Emitir REP del cobro seleccionado», que mostraba el aviso sin emitir nada; el cobro se
  aplica con clic en la factura.
- **REP del histórico = lo que la cartera cobró** (total − saldo), en uno o dos abonos entre la factura y hoy.
  Antes se sorteaban aparte y había facturas con saldo completo con REP por hasta el 70 %.
- «Del mes» en la tabla de tipos de comprobante cuenta solo setiembre.

Archivos: `data.js`, `fis-data.js`, `mod-fiscal.js`, `mod-venta.js`, `mod-venta-gestion.js`, `ven-auto.js`,
`shell.js`.

## 2026-09-22 · Facturación · Consecutivo por sucursal y terminal, y clave numérica de 50 dígitos

Hallazgos de la auditoría contable (POS C2 y C3, Configuración 1 y 2). Antes había un solo contador por
tipo de comprobante para las 15 terminales, así que cada serie `002-00001-01-…` quedaba con saltos (el
rechazo 4110 que el propio demo documenta), y la clave usaba la cédula de Smart Serve y medía 48 dígitos.

- Cada serie es sucursal + terminal + tipo; cada caja arrastra su propia historia. `D.consecutivo()`,
  `D.ultimoConsec()` y `D.proximoConsec()` son la única fuente; Facturación, la caja y «Este equipo» la leen.
- El REP usa el código **10** (antes 05, que es la confirmación de aceptación) y sale de la misma serie
  que la caja; se agregó FEC (08).
- Clave numérica: cédula del emisor 3-101-118844 rellenada a 12, fecha del documento (no la de hoy) y
  situación del comprobante (1 normal, 3 sin internet cuando la caja está sin enlace).
- Los datos base del emisor viven en `D.emisor`; Facturación y la planilla del SICERE los leen de ahí.
- Los datos de ejemplo se emiten en orden de fecha: las series quedan correlativas también en el tiempo,
  las notas de crédito siempre son posteriores a su factura y los REP se numeran por fecha de cobro.
- La tabla «Series por terminal» se calcula de las series reales y se actualiza con cada venta. Un salto
  es cualquier número asignado sin comprobante; se indica si tiene registro de auditoría (`D.sinDocumento`).
  El de demostración es real y queda a mitad de la serie: tres tiquetes de Turrialba caja 2 cuya firma falló.
- Reloj de la demo (`D.ahora()`): arranca en HOY al abrir y avanza con el tiempo real. Lo que se emite en la
  sesión queda después del histórico; las ventas del día llegan hasta las 11:40.
- Situación del comprobante coherente entre la caja, la capa fiscal y la clave (dígito 42): contingencia (2)
  cuando Hacienda no respondió, sin internet (3) en la caída de enlace del 11 de setiembre y con la caja offline.
- Cobro de cuentas por cobrar: emite el REP completo (clave, medio elegido, monto del abono, parcial) desde la
  caja que cobra; rechaza montos en cero o mayores al saldo. Antes gastaba un número de REP sin crear documento.
- Solo las cajas de tienda emiten (`D.puedeEmitir`): la caja, las NC y los REP avisan si el local es el CEDI o
  una bodega, y al cambiar de local la terminal se ajusta a una que exista.
- La NC guarda la referencia completa al documento que corrige: consecutivo, clave, tipo y fecha.
- El ejemplo de la clave y el archivo de la llave criptográfica salen de los datos reales del emisor.

Archivos: `data.js`, `fis-data.js`, `ven-auto.js`, `mod-venta.js`, `mod-venta-gestion.js`, `shell.js`,
`mod-planilla.js`.

## 2026-09-22 · Sistema · Seguridad y Auditoría pasa a Sistema / Configuración

Usuarios, roles y permisos ya estaban en Sistema como accesos directos y repetidos en Seguridad y Auditoría.
Ahora el módulo Seguridad y Auditoría sale del menú y todo vive en Sistema / Configuración, que pasa a
contar sus 23 requerimientos (11 SIS + 12 SEG). El menú queda con 14 módulos.

| Sección | Opciones |
|---|---|
| Organización y locales | Empresa y estructura (locales, terminales, áreas, **departamentos**, razón social) · Territorios de clientes |
| Usuarios y seguridad | Usuarios y accesos · Roles y permisos · Políticas de acceso y sesión |
| Control y auditoría | Autorización de excepciones · Bitácora de auditoría |
| Catálogo y clasificación | Categorías, marcas y unidades · Ubicación física de artículos |
| Reglas de negocio y documentos | Parámetros generales · Términos de pago · Medios de pago y monedas · Estados, numeración y motivos |
| Impresión, avisos y conexiones | Plantillas y mensajes · Notificaciones y alertas · Conexiones con otros sistemas |
| Mantenimiento y preferencias | Versiones y ambiente de pruebas · Este equipo |

- Departamentos pasa de Categorías a «Empresa y estructura»: es estructura de la empresa (ligada a la planilla),
  no clasificación del catálogo. Así «Categorías, marcas y unidades» cabe completo en las migas de pan.
- Migas de pan revisadas en las 18 opciones y sus pestañas: todas dicen Sistema / Configuración › sección ›
  opción › pestaña, el título de la pantalla coincide con la opción y ninguna se recorta en 1280, 1366 ni 1920.
- Las pantallas no cambiaron de identificador (`usuarios`, `seg-roles`, `seg-politicas`, `seg-autorizaciones`,
  `historial`), así que los enlaces internos siguen funcionando.

Archivos: `nav.js` (módulo quitado, árbol de Sistema reorganizado, catálogo de pantallas) y `mod-sys.js`
(pestaña Departamentos movida, títulos y comentarios).

## 2026-09-22 · Sistema y Seguridad · Usuarios, roles, permisos y configuración completa

Pedido: «le faltan aspectos, por ejemplo usuarios, roles, permisos… en categorías no hay opción para
agregar ni editar». Se revisó la matriz (SIS, SEG, INF, INT, hallazgos HAL-01 a HAL-08) y las dos
sesiones con el cliente. Es demostración: todo se ve como quedará y las acciones principales responden.

**Seguridad y Auditoría** (antes 2 pantallas simples; ahora 5, y los 12 requerimientos SEG en el menú)

| Opción | Pestañas | Requerimientos |
|---|---|---|
| Usuarios y accesos | Usuarios · Solicitudes de acceso · Sesiones abiertas · Revisión de accesos | SEG-008 |
| Roles y permisos | Roles (pantallas y acciones, acciones especiales, campos sensibles, usuarios) · Segregación de funciones · Vista de conjunto | SEG-001, 002, 003, 006 |
| Políticas de acceso y sesión | Sesión, contraseñas, doble factor, mostrador compartido, documentos, protección de datos | SEG-010, 011, 012 |
| Autorización de excepciones | Pendientes · Quién autoriza qué · Historial | SEG-005, 009 |
| Bitácora de auditoría | Bitácora · Registros inactivados · Qué se registra | SEG-004, 007 |

- Usuario nuevo sin contraseña dictada: le llega una invitación. Varios roles y varios locales por persona, acceso temporal con fecha de retiro.
- Permisos por módulo › opción del menú con Ver, Registrar, Modificar, Eliminar, Importar y Exportar. Solo se cambian con «Modificar permisos» y «Guardar cambios»: cuenta los cambios y deja bitácora.
- Duplicar un rol copia todo y lo abre en edición (SEG-003). Campos sensibles oculto/ver/editar (SEG-002, Fase 2).
- Segregación: funciones que no se combinan, excepciones aprobadas (Pejibaye, Tucurrique) y suplentes.
- Autorizaciones: TI ve la bandeja y recuerda; «Ver como autorizador» muestra el mensaje que le llega a quien aprueba, con comentario obligatorio.
- Bitácora con «Autorizó», sin eventos sin autor (los procesos firman como «Sistema»), detalle por fila, inactivados con reactivar y nivel de detalle configurable.

**Sistema / Configuración** (de 8 a 13 opciones)

- Nueva sección **Usuarios y acceso**: accesos directos a Seguridad (no suman requerimientos).
- Empresa, locales y áreas: editar e inactivar locales, pestaña nueva **Terminales y dispositivos**, agregar y editar áreas, editar razón social y logotipo.
- Territorios: agregar y editar.
- Categorías: **Categoría**, **Subcategoría** y **Editar** en cada fila (con CABYS sugerido e inactivar bloqueado si tiene artículos). Marcas y departamentos con agregar y editar. Pestaña nueva **Unidades y presentaciones**.
- Ubicación física: editar la estructura de cada local.
- Nuevas: **Parámetros generales** (los de caja y crédito son los mismos de `VENX.PARAM`: cambiarlos cambia la caja), **Medios de pago y monedas** (medios con código del comprobante 4.4, tipo de cambio del BCCR, cuentas bancarias), **Plantillas y mensajes** (vista previa de factura, factura a crédito con firma, tiquete, etiqueta; textos de correo y WhatsApp), **Notificaciones y alertas** (evento, a quién, por dónde) y **Conexiones con otros sistemas** (Hacienda, CABYS, BCCR, Banco Nacional, WhatsApp, correo, nodos locales).
- Términos de pago: editar e inactivar. Estados pasa a **Estados, numeración y motivos** (numeración al aplicar y catálogo de motivos con detalle obligatorio).
- Todo cambio pide motivo y queda en la bitácora con antes y después.

Archivos: `mod-sys.js` (módulo) y `nav.js` (árboles de Sistema y Seguridad, catálogo de pantallas).
Nota: el `nav.js` de esta carpeta había vuelto a una versión anterior (sin el menú nuevo de Ventas ni
el de Sistema); se restauró sobre la última versión buena. Ningún otro archivo cambió.

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
