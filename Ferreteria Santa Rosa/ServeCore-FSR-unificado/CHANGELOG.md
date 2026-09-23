# Cambios

## 2026-09-23 · Contabilidad · Cierre de mes real, estados desde el mayor, balance y asiento manual

Parte 3 de la auditoría de Contabilidad (C4, C7, U1 y U2) y el signo de las NC en el D-150 (parte de C5).

- **Cierre de mes con candado real.** Envía contabilidad; aprueba gerencia y nunca quien envió (se toma de la
  sesión, ya no de una lista). Al aprobar, `D.bloquearHasta` cierra el mes: ningún módulo registra con esa fecha, y
  la caja, los cobros, las NC, el cierre de caja y las compras lo avisan antes de tocar inventario, consecutivos o
  saldos (`D.exigePeriodoAbierto`). **Reabrir** funciona: solo el último mes cerrado, solo gerencia, con motivo en la
  bitácora; el candado vuelve un mes atrás. Agosto y lo anterior (la migración) no se reabren.
- **Fin de mes como propuesta.** Depreciación, provisiones, IVA diferido vencido, estimación por incobrables,
  diferencial cambiario (la cuenta en dólares al tipo de cierre) y renta estimada entran al mayor solo al aprobarlos,
  con el monto de ese momento. Antes la depreciación y las provisiones ya pesaban en el mayor sin aprobar. La
  estimación registra solo la diferencia contra la existente; la renta, lo que falta sobre lo ya registrado.
- **Estados financieros desde el mayor.** Resultados con ventas brutas, devoluciones, descuentos y ventas netas,
  servicios y diferencial aparte; la renta es la registrada (la estimada se muestra como tal y no entra al balance).
  El balance cuadra contra el mayor, no porque la renta se sume a los dos lados. Flujo de efectivo indirecto de
  setiembre calculado de los movimientos reales, con control contra caja y bancos. Presupuesto aprobado del año
  prorrateado al avance, ya no «lo real × 1,04».
- **Balance de comprobación:** saldo al 31 de agosto, debe y haber de setiembre y saldo final deudor o acreedor por
  su signo real; marca los saldos contrarios a su naturaleza. El mayor y el catálogo ya no borran el signo.
- **Asiento manual real:** cuadrícula con cuentas del catálogo (autocompletado), detalle por línea, debe y haber;
  Tab entre celdas y Enter agrega una línea; descuadre en vivo y «Registrar» solo si cuadra. Lo registra
  contabilidad o gerencia, queda marcado como manual con su autor y en la bitácora.
- **D-150:** el IVA de las notas de crédito resta del débito del mes (antes sumaba).

Archivos: `data.js`, `fis-data.js`, `con-data.js`, `con-auto.js`, `mod-conta.js`, `mod-venta.js`,
`mod-venta-gestion.js`, `mod-compra.js`, `ven-auto.js`.

## 2026-09-23 · Contabilidad · Cierres de caja, depósitos y banco con una sola fuente

Parte 2 de la auditoría de Contabilidad (C3 y U3).

- **Los cierres salen de los turnos de Ventas.** Desde el 1 de setiembre cada caja tiene su turno de 7:00 a 18:00,
  cerrado con el mismo `cerrar()` de la caja: el contado sale de lo que de verdad entró (ventas, abonos en efectivo
  y devoluciones) y las diferencias de la demo se asientan por la misma vía. Contabilidad los lee (`AUTO.cierres`
  y `AUTO.depositos` se calculan). Antes Contabilidad inventaba montos al azar y Ventas tenía otros cierres a mano,
  con otro fondo.
- **Depósitos:** al cerrar, lo contado más lo retirado a la bóveda menos el fondo pasa de la caja a «efectivo en
  tránsito» (cuenta nueva); cuando el banco lo acredita, pasa al banco. Si lo contado queda por debajo del fondo,
  no hay depósito y el fondo se repone desde la bóveda.
- **Estado de cuenta del Banco Nacional real:** lo que ya entró a la cuenta en los libros (SINPE, transferencias,
  links de pago y cobros), los depósitos de caja y los lotes del datáfono cuando se acreditan, y lo que solo el
  banco conoce (cargo mensual del datáfono, comisiones, un retiro sin documento, dos pagos a proveedores que
  tesorería no registró, un depósito por confirmar y uno que no llegó).
- **Conciliación clásica:** saldo según el estado de cuenta (saldo al 31 de agosto más sus movimientos), menos y
  más las partidas que los libros no tienen, igual a saldo según libros, con la diferencia calculada. Resolver las
  partidas en la bandeja las registra (el pago a proveedor rebaja la cuenta por pagar; el retiro sin soporte va a
  «partidas en investigación», cuenta nueva) y la conciliación queda en ₡0.
- SINPE del día desde las ventas y cobros reales. El faltante de Pejibaye ya se carga al cajero al cerrar; en la
  bandeja queda confirmar el rebajo en planilla. La bandeja avisa si un registro no se puede hacer en vez de
  trabarse, y firma con el usuario de la sesión.
- Los abonos del histórico entran en horario de caja; los cobros en efectivo cuentan en el turno que los recibe.
- La apertura de caja trae solo los fondos: lo del 31 de agosto ya se había depositado.
- Contabilidad automática (`con-auto.js`) carga después de Ventas.

Archivos: `data.js`, `fis-data.js`, `con-data.js`, `con-auto.js`, `ven-auto.js`, `mod-conta.js`, `index.html`.

## 2026-09-23 · Contabilidad · Migración al 31 de agosto y auxiliares cuadrados con el mayor

Parte 1 de la auditoría de Contabilidad (C1 y C2, y la antigüedad de F2).

- **La contabilidad en vivo empieza el 1 de setiembre.** Lo anterior entra en un solo asiento de migración al 31 de
  agosto (`CON.abrirLibros`, al final de la carga). Los documentos anteriores quedan como migrados, sin asiento
  propio (`D.migrados`). Antes, la apertura era al 1.º de enero con montos escritos a mano y convivía con asientos
  sueltos de abril a agosto.
- **Cada saldo de balance sale de su auxiliar:** cartera (facturas a crédito abiertas), inventario (kardex al
  costo), proveedores, IVA diferido, saldos a favor y tarjetas por liquidar. El mayor termina igual al auxiliar.
- **Activos fijos desde el registro**, con la depreciación hasta agosto y las cuentas que faltaban (edificios,
  maquinaria y equipo). El activo no corriente ya no sale negativo.
- Bancos, fondos de caja, cargas sociales e impuesto al salario de agosto, provisiones laborales acumuladas e IVA de
  agosto por pagar (cuenta nueva de liquidación) con su origen. Resultados de enero a agosto a la escala real de la
  empresa. Capital y utilidades de años anteriores fijos; la diferencia son inversiones a plazo del sistema anterior.
- **Cobros del histórico con asiento** (`asentarCobro`, la misma vía de la caja y de Facturación).
- **Comprobantes de proveedor aceptados** crean la cuenta por pagar y el crédito fiscal (`D.aceptarRecibido`), salvo
  que ya lo haya registrado la orden aplicada; la nota de crédito del proveedor lo reversa. Aceptar desde
  Facturación ya queda guardado (antes se modificaba una copia).
- **Cuadres calculados:** cartera y proveedores muestran la diferencia real entre auxiliar y libro, y la lista de
  cierre la usa. Se quitó el «saldo migrado de Neo» y el «₡0 · cuadra» fijo.
- La antigüedad de la cartera se mide desde el vencimiento (fecha más el plazo del cliente).
- `D.asentar` rechaza cuentas que no existen en el catálogo.

Archivos: `data.js`, `fis-data.js`, `con-data.js`, `con-auto.js`, `mod-conta.js`, `mod-fiscal.js`, `index.html`.

## 2026-09-23 · Compras e impuestos · IVA de las compras por tarifa

Decisión pendiente de la auditoría: el IVA de las compras era un 13 % fijo.

- **Orden de compra por línea** (`D.totalesCompra`): cada línea lleva el IVA de la tarifa de su artículo y la
  orden guarda el desglose por tarifa. Aplicar la compra desde Compras usa el mismo cálculo (antes recalculaba al
  13 % y sin redondear). El crédito fiscal que se asienta es ese.
- Proveedor nuevo de insumos agropecuarios (Abonos del Pacífico) con una compra aplicada para Pejibaye:
  fertilizante y manguera agrícola al 1 %, manguera de jardín al 13 %. Con el 13 % fijo, esa compra habría
  llevado unos ₡359 000 de crédito fiscal de más.
- **Comprobantes recibidos:** si vienen de una orden, su IVA sigue la mezcla de tarifas de esa orden; si no, la
  general. Las **notas de crédito de proveedores restan** crédito fiscal en el IVA del mes (antes sumaban).
- **Gastos por XML:** el IVA sale de la tarifa del gasto (`D.ivaIncluido`); los servicios comerciales de luz,
  agua, alquiler e internet van al 13 %, que queda explícito.

Archivos: `data.js`, `mod-compra.js`, `con-auto.js`, `fis-data.js`.

## 2026-09-23 · Ventas · Precios de lista con IVA incluido

Decisión pendiente de la auditoría: la caja trataba el precio de lista como si no tuviera IVA y lo sumaba
encima, mientras el propio demo decía «Precios en la caja: con IVA incluido» y el agente de WhatsApp cotizaba
«con IVA». Ahora el precio de lista es el precio al consumidor.

- `D.totalizar` separa la base y el IVA de cada línea a partir del precio con IVA (según su tarifa). Lo que paga
  el cliente es la suma de los precios de las líneas; si está exonerado, paga la base más el IVA que no cubre la
  exoneración. El encabezado sigue siendo la suma de las líneas redondeadas.
- Márgenes, piso de precio, descuento máximo, comisiones de vendedores, precio sugerido, precio de segunda,
  actualización de precios por costo nuevo y ventas bajo margen se calculan sobre el precio **sin** IVA
  (`D.sinIva`, `D.margenDe`, `D.pisoConIva`). Con el IVA adentro, algunos precios del catálogo subieron para
  seguir respetando el margen mínimo de su familia.
- La caja muestra el precio de lista con IVA, la base sin IVA, el IVA por tarifa y el total; el detalle del
  comprobante rotula los montos con IVA y el subtotal sin IVA. Las plantillas llevan cada línea con su precio y
  monto sin IVA (como el XML) y el IVA se suma abajo.
- El parámetro «Precios en la caja» queda fijo en «Con IVA incluido».
- Los precios que cita el agente de WhatsApp salen del catálogo.
- La devolución ya no multiplica por 1,13 un monto que trae el IVA incluido.

Archivos: `data.js`, `ven-auto.js`, `inv-auto.js`, `mod-inv.js`, `mod-venta.js`, `mod-venta-gestion.js`,
`mod-sys.js`.

## 2026-09-23 · Sistema / Configuración · Sesión, bitácora fiel, tipo de cambio y controles contables

Hallazgos 6, 7, 8 y 11 de la auditoría de Configuración y la parte de F4 sobre los dólares en la caja.

- **Usuario de la sesión.** El encabezado deja cambiar de persona para la demostración (Andrey · TI, Sonia ·
  contabilidad, Adrián · gerencia). Las acciones sensibles revisan el rol y, si no alcanza, lo dicen.
- **Bitácora fiel.** Sistema firma con la persona de la sesión, su cargo y su equipo (antes siempre «TI» desde la
  misma IP). El autorizador se guarda como dato, ya no se deduce del texto. Un parámetro que no se aceptó
  ya no queda anotado como si hubiera cambiado.
- **Tipo de cambio por fecha** (`D.tipoCambio`, `D.tcDe`). El registro manual es de contabilidad o gerencia,
  valida que la compra sea menor que la venta y que la variación no pase de 2 %, y queda en el historial como
  «Manual» con su vigencia, sin pisar el anterior.
- **Dólares en la caja.** Se reciben al tipo de **compra** (antes se usaba el de venta, con una pérdida que nadie
  registraba), entran a «Caja en dólares» y el vuelto sale en colones. El arqueo cuenta los dólares aparte, sin
  convertir; la diferencia se asienta al tipo de compra del día con la misma tolerancia que los colones.
  Cuentas nuevas: caja en dólares y diferencial cambiario ganado y perdido.
- **Parámetros «Contabilidad e impuestos»:** método de valuación (promedio o PEPS; UEPS no lo admiten las NIIF),
  alcance del costo, período fiscal, fecha hasta la que está cerrado, tolerancia de caja, umbral de ajuste de
  costo, comisión del datáfono y cuentas del diferencial cambiario. La tolerancia, el umbral y la comisión son
  los que usan de verdad el cierre de caja, los ajustes de costo y los lotes del datáfono.
- **Períodos cerrados:** `D.asentar` rechaza un asiento con fecha de un mes que Contabilidad ya cerró.
- **Segregación de funciones:** reglas nuevas (alta o cambio de cuenta bancaria del proveedor ↔ pagarle, que no
  se desactiva; registrar asientos ↔ aprobar el cierre; anular o devolver ↔ cobrar esa venta). Desactivar una
  regla lo hace solo gerencia, con motivo, y queda en la bitácora.

Archivos: `data.js`, `con-data.js`, `ven-auto.js`, `shell.js`, `index.html`, `mod-sys.js`, `mod-venta.js`,
`mod-venta-gestion.js`.

## 2026-09-22 · Ventas / POS · Controles de la caja

Hallazgos F1, F2, U1 y U3 de la auditoría del POS, y la parte de F4 sobre el turno.

- **Pagos mixtos.** El cobro arma una lista de pagos (hasta 4 medios, como admite la 4.4) con su referencia;
  Alt+1…6 escoge el medio. Aplicar solo se habilita cuando lo pagado cubre el total; solo el efectivo da
  vuelto (y el vuelto no se registra como ingreso); tarjeta, SINPE, transferencia, cheque y anticipo no pueden
  pasar del total. La factura guarda `doc.pagos` y el asiento lleva un débito por pago; el resumen del turno y
  los lotes del datáfono los leen de ahí.
- **Crédito controlado en la caja.** No factura a crédito si el cliente no tiene crédito, está bloqueado por
  mora o la factura pasa el disponible, salvo un sobregiro autorizado hoy que alcance (y queda consumido).
  La factura a crédito pide la orden de compra del cliente y quién retira.
- **Autorización de margen real.** La solicitud queda pendiente con su motivo; la aprueba otra persona con su
  PIN (nunca quien vende). La bitácora guarda quién pidió y quién autorizó con su propio usuario y rol. Todo
  cambio de precio en la caja queda en la bitácora con el antes y el después, y anula la autorización.
- **Turno abierto obligatorio** para cobrar.
- **Arqueo ciego.** El efectivo esperado y la diferencia se ven solo al presionar «Terminé de contar», que deja
  el conteo fijo; no se puede cerrar el turno antes.
- Se quitó el botón «Imprimir» del cobro, que no hacía nada: el comprobante se imprime al aplicar.

Archivos: `data.js`, `ven-auto.js`, `con-auto.js`, `mod-venta.js`, `mod-venta-gestion.js`, `mod-sys.js`.

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
