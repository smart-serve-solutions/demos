# Cambios

## 2026-10-01 · Ventas · Alta de clientes

- **Nuevo cliente** en Clientes › Ficha y en la caja (al identificar al cliente). Si la búsqueda no encontró a nadie,
  el formulario se abre con lo que se escribió (nombre o cédula); al crearlo desde la caja, queda asociado a la venta.
- La identificación se valida como la pide Hacienda:
  - física de 9 dígitos que no empieza en 0
  - jurídica de 10 dígitos que empieza en 3
  - DIMEX de 11 o 12 dígitos
  - NITE de 10 dígitos

  Se guarda con el formato oficial (1-0234-0567, 3-101-123456), y no deja repetir una cédula que ya existe.
- Pide nombre o razón social, teléfono, correo para los comprobantes, dirección con su zona de flete, categoría (que
  define los descuentos de la caja) y actividad económica (sugerida según la categoría).
- Todo cliente nace **de contado**. El crédito se solicita en Clientes › Crédito, donde se fija el límite y el plazo.
  El alta queda en la bitácora.
- **Editar** en los datos fiscales ya edita: nombre, teléfono, correo de comprobantes, dirección fiscal y zona,
  categoría y actividad económica.
  - Cada campo que cambia queda en la bitácora con el valor anterior y el nuevo, y con quién lo cambió.
  - La identificación no se edita: si la cédula está mal, se crea el cliente correcto y se inactiva el anterior, así
    las facturas emitidas no cambian de receptor.

Archivos: `mod-venta-gestion.js`, `mod-venta.js`.

## 2026-09-29 · Integraciones e IA · «Integración con Hacienda» se queda en el módulo

- La opción del menú abría el Panel fiscal de Facturación electrónica y sacaba al usuario del módulo. Ahora abre el
  Panel de integraciones con la tarjeta de Hacienda resaltada: estado de la conexión, cola, rechazos, llave
  criptográfica y reintento de envíos. Desde la tarjeta, «Ver comprobantes» sigue llevando a Facturación.

Archivos: `nav.js`, `mod-ia.js`.

## 2026-09-29 · Taller · Revisión de KPIs aplicada y borrador de compra

- Las tres pantallas del Taller siguen la regla de KPIs: sin fila de tarjetas arriba.
  - **Tablero de órdenes:** una línea de resumen (órdenes abiertas, esperando repuestos en ámbar, mantenimiento de
    flota del mes y lo facturado a clientes).
  - **Órdenes, Bodega de repuestos y Reparación de herramientas:** filtros con número sobre la lista (por ejemplo,
    «Esperando repuestos», «Bajo el mínimo sin pedido» y «Esperando al cliente», en ámbar cuando hay algo que
    atender). Los montos de la bodega (valor, reservado y consumido en el mes) van en la misma línea, a la derecha.
- «Pedir a compras» registra un **borrador**, que toma su consecutivo `OC-2026-…` cuando Proveeduría lo aprueba (el
  cambio de numeración de Compras).

Archivos: `mod-taller.js`.

## 2026-09-29 · Todos los módulos · Revisión de KPIs aplicada (sin filas de tarjetas arriba)

Tras aprobar el piloto del Agente de WhatsApp se aplicó la misma regla a las demás pantallas. De las 72 que abrían
con una fila de 4 tarjetas (122–182 px), hoy ninguna lo hace salvo las que se quedan a propósito. El trabajo sube
100–150 px en cada una.

- **Filtros con número sobre la lista (14):** Agente de WhatsApp · Integraciones externas · Cola de envío de Hacienda ·
  Comprobantes recibidos · Despachos · Traslados en camino · Precios que siguen al costo · Proformas · Autorizaciones
  de venta · Notas de crédito · Ajustes y mermas · Archivos al banco · Alertas pendientes · Sesiones abiertas.
  Tocar un filtro filtra la lista; ámbar o rojo (con ícono) solo cuando hay algo que atender. Lo que no cuenta la
  lista (montos, tasas) va en una línea a la derecha.
- **Una línea de resumen (38):** Rutas, Liquidación de rutas, Líneas y bloqueos, Gestión de cobro, Recibos, Cuentas
  por pagar, Notas de proveedor, Caja chica (fondos y tarjeta), Nómina (movimientos, puestos, salidas, asistencia,
  horas extra, vacaciones, incapacidades, calendario), Facturación (inicio, REP, contingencia, consecutivos, CABYS),
  Conciliaciones (caja e inventario), Saldos y movimientos, Cierre › Impuestos, Kardex, Apartados, Segunda y
  devoluciones, Códigos y etiquetas, Plan de conteo, Usuarios, Políticas, Autorizaciones de excepción, Bitácora,
  Ambiente de pruebas, Qué avisa y Rendimiento. El detalle de cada cifra queda al pasar el mouse.
- **Se quitaron (6)**, eran datos fijos que ya están en la pantalla: Llave criptográfica, Períodos contables,
  Catálogo de cuentas, Cuentas por familia y proveedor, Reglas de conciliación y Locales y bodegas.
- **Se quedan (14)** porque la cifra es el contenido: Cómo vamos hoy, estados financieros, por local y familia,
  presupuesto, activos fijos, resumen y reportes de nómina, CCSS, impuesto al salario, aguinaldo, IVA del período,
  desempeño de vendedores, productos relacionados y ventas perdidas.
- `core.js` (compartido): `ts()` recibe los mismos argumentos que `stat()` y arma la línea; `resumen()`, `filtrar()` y
  `onFiltro()` completan las piezas. La cifra va antes de la etiqueta solo si es una cantidad pura («6
  conversaciones», pero «semana 37 de 50»). `index.html`: estilos `.resumen`, `.ffila` y filtros en rojo.
- Recorrido completo: 182 pantallas y pestañas sin errores, y los 56 filtros probados uno por uno.

Archivos: `core.js`, `index.html`, `mod-venta.js`, `mod-venta-gestion.js`, `mod-inv.js`, `mod-cobros.js`,
`mod-nomina.js`, `mod-planilla.js`, `mod-fiscal.js`, `mod-conta.js`, `mod-ia.js`, `mod-sys.js`, `mod-sys-bi.js`.

## 2026-09-29 · Integraciones e IA · Piloto de la revisión de KPIs en el Agente de WhatsApp

- Se quitó la fila de 4 tarjetas. Las cifras del día van en **una línea bajo el título** (conversaciones, resueltas
  solas por el agente, pasaron a una persona y cuántas siguen sin tomar, pedidos y pagos con su monto).
- Las que cuentan conversaciones son **filtros con número** en la bandeja: Todas · Con una persona · Con pedido ·
  Con pago. Tocar uno filtra la lista; «Con una persona» se marca en ámbar mientras haya alguna sin tomar.
- La bandeja y el chat suben ~150 px (en 1366 × 768 el chat empieza en 290 px en vez de ~450).
- Piezas comunes nuevas para aplicar la regla en las demás pantallas si el piloto se aprueba: `tira()` y
  `fchips()` en `core.js`, con sus estilos `.tira` y `.fchips` en `index.html` (cambios pequeños en compartidos).
  La regla y la clasificación de las 72 pantallas están en el documento del proyecto «revision-kpis».

Archivos: `mod-ia.js`, `core.js`, `index.html`.

## 2026-09-29 · Compras · El consecutivo de la orden se asigna al aprobar

- Un borrador lleva número temporal (**Borrador 0412**, clave `BOR-0412`) y toma su consecutivo oficial
  `OC-2026-…` al aprobarse. Eliminar un borrador ya no deja hueco en la serie (SIS-008). La ficha dice «número
  temporal · el consecutivo se asigna al aprobar» y, ya aprobada, «fue el borrador 0412»; la bitácora y el aviso
  de aprobación registran el cambio de número.
- `data.js` (compartido, cambio pequeño): `seq.BOR`, `crearOC` numera los borradores aparte y `consecutivoOC(oc)`
  asigna el oficial. La orden del recorrido de la demo es ahora `BOR-0412` (marcada `principal`); se ajustaron las
  referencias en Inicio (bodega), Reportería (alerta de costo) y la bitácora de ejemplo.
- Las referencias guardadas con el número de borrador (cotizaciones, copias, selección) siguen funcionando:
  `ocDe` busca por consecutivo o por el borrador que fue.

Archivos: `data.js`, `mod-compra.js`, `mod-inicio.js`, `mod-bi.js`.

## 2026-09-29 · POS · Enter para cobrar y para aplicar sin necesitar el foco

- En la caja, **Enter cobra** estando el foco donde esté (o con el campo de escaneo vacío: escanear, escanear…
  Enter). Se respeta el Enter propio del escaneo con texto, de las líneas y de un botón enfocado.
- En el cobro, **Enter aplica** desde el monto, la referencia o sin foco. Si falta dinero, avisa cuánto y sugiere
  F9 para agregar otro medio. Mantener Enter presionado no aplica dos veces. El botón Aplicar muestra ⏎.

Archivos: `mod-venta.js`.

## 2026-09-29 · Compras · Eliminar el borrador de una orden y estados más claros

- **Eliminar borrador**: una orden que todavía es borrador (registrada, nunca aprobada) se puede eliminar, con
  confirmación que muestra proveedor, destino, líneas y total. Sale de la lista y queda en la bitácora quién la
  eliminó y qué tenía. Una orden aprobada no se elimina: se **anula** con motivo (Anular solo aparece en aprobadas).
  «Copiar a otro local» ahora ofrece eliminar el borrador original en vez de anularlo.
- **Aprobada no es aplicada.** Aprobar deja la orden firme ante el proveedor (no se edita, se envía con su QR);
  aplicar es registrar su factura: ahí entra el inventario, la cuenta por pagar y el asiento. Las etiquetas dicen
  el estado y lo que sigue: Borrador · Aprobada · por recibir · Recibida · falta la factura · Recibida con faltantes ·
  Aplicada · cerrada · Anulada. El paso 4 del recorrido se llama «Factura aplicada» y las barras de «qué sigue»
  lo explican. La clave interna de los estados no cambió.

Archivos: `mod-compra.js`.

## 2026-09-29 · POS · Teclas F en el cobro

- En la hoja «Cobro de la factura» los medios de pago se eligen con **F1–F8** en el orden de la cuadrícula
  (Efectivo, Tarjeta, SINPE móvil, Transferencia, Cheque, Anticipo, Dólares, Crédito) y **F9** agrega el pago para
  seguir con otro medio. La hoja es modal y la caja de atrás queda inhabilitada, así que las F se reusan sin choque.
  Se escuchan en captura: aunque el foco quede fuera de un campo, F1 y F9 ya no saltan a la caja o al inicio con la
  hoja abierta. Crédito deshabilitado avisa por qué. Alt+1–8 queda como alias.

Archivos: `mod-venta.js`.

## 2026-09-29 · Inventario · Fotos de artículos y vista previa grande

- La ficha del artículo muestra la foto en grande (184 × 138, antes un ícono de 64 × 64), con el número de fotos;
  un clic la amplía con su crédito. Sin foto, el cuadro invita a agregarla.
- 16 artículos traen foto real de ejemplo de Wikimedia Commons (licencia libre; autor y licencia en `FOTOS` de
  `img-productos.js`). Orden: `productos/<código>.jpg` → foto de Commons (requiere internet) → ilustración.
  La misma foto sale en las tarjetas del agente de WhatsApp.

Archivos: `img-productos.js`, `mod-inv.js`, `index.html` (estilos `.foto-prev` y `.foto-grande`).

## 2026-09-29 · Sistema / Ventas · Fondo de apertura por caja

- Validado en la sesión 2 y en VEN-025/027: cada terminal (caja) de cada local tiene su propio fondo («inició con
  100 000», «dejó el fondo en 50 o 100 000»). Parámetros generales › «Fondo de apertura por caja» abre la lista de
  todas las cajas, filtrable por local, con el fondo editable de cada una, «mismo fondo a las cajas mostradas», el
  fondo sugerido para una caja nueva y motivo obligatorio; cada cambio queda en la bitácora con antes y después.
  Rige desde el próximo turno.
- `VENX.TERMINALES[].fondo` y `VENX.fondoDe(local, caja)`: los usa la apertura de turno, el retiro sugerido, la
  columna «Fondo» de Caja y turnos › Terminales y de Sistema › Terminales, la ficha de la terminal (nueva o
  existente) y el saldo inicial de caja en contabilidad.

Archivos: `ven-auto.js`, `mod-sys.js`, `mod-venta-gestion.js`, `con-data.js`.

## 2026-09-28 · Taller · Órdenes de trabajo, bodega de repuestos y reparación de herramientas

- **TAL-001 · Órdenes de trabajo del taller automotriz**:
  - Tablero por estado: recibida, en diagnóstico, esperando repuestos, en reparación, lista para entregar.
  - Cada orden lleva mecánico, repuestos, horas y bitácora.
  - La orden de la **flota propia** no se factura. Al cerrarla, los repuestos salen de la bodega con asiento a
    Mantenimiento y reparaciones (6-01-02-005) contra Inventario. Las horas del mecánico se informan para el costo
    por unidad; no se asientan, porque ya están en la planilla.
  - La orden de un **cliente** se factura (contado o crédito, con el mismo control de crédito que la caja) desde la
    caja 3 de Santa Rosa. Los repuestos salen de la bodega del taller y la mano de obra va como servicio.
  - Pestaña de vehículos con el mantenimiento preventivo de la flota por kilometraje (horas en el montacargas) y el
    historial de los vehículos de clientes.
- **TAL-002 · Bodega de repuestos del taller**:
  - Es un local nuevo (013 · Bodega del taller) con la familia «Repuestos del taller» (automotriz y herramientas
    eléctricas). Sus existencias entran en la migración al 31 de agosto como parte del inventario.
  - Muestra existencia, lo reservado por orden, disponible y mínimo, y el kardex de cada repuesto.
  - «Pedir a compras» registra la orden a la distribuidora de repuestos (proveedor nuevo) para que Proveeduría la
    apruebe. Al recibirla, la mercadería entra a la bodega del taller.
- **TAL-003 · Reparación de herramientas**:
  - Flujo de la boleta: se recibe con serie y accesorios, se diagnostica y se envía presupuesto. Si el cliente
    aprueba, se repara, se factura y se entrega.
  - Si el cliente no aprueba, se cobra solo el diagnóstico.
  - En **garantía** (contra la factura de compra) no se cobra: los repuestos quedan en Reclamos a proveedores
    (1-01-03-005).
- `D.emitir()` acepta `bodega`: la mercadería sale de esa bodega aunque la factura sea de la caja de una tienda.
  Los servicios ya no generan movimiento de inventario.
- Los repuestos del taller no entran en las ventas de ejemplo ni en las respuestas del agente de WhatsApp: no se
  venden en las tiendas.

Archivos: `tal-data.js` (nuevo), `mod-taller.js` (nuevo), `data.js`, `nav.js`, `index.html`, `mod-cobros.js`,
`mod-ia.js`.

## 2026-09-28 · Integraciones e IA · Imágenes de producto en las conversaciones

- Cuando el agente de WhatsApp habla de un producto (precio, cotización o reserva), lo muestra en una tarjeta con su
  imagen, descripción, código, precio (y cantidad pedida) y existencia en tiendas.
- `img-productos.js`: si existe la foto real en `productos/<código>.jpg` se usa esa; si no, una ilustración del tipo
  de producto dibujada en el propio demo (saco, montón, varilla, bloque, lámina, tubo, codo, tee, cinta, llave,
  cable, bombillo, pintura, tornillo, candado, manguera, casco…), con el color y el texto del artículo. Para poner
  fotos reales basta con copiarlas a esa carpeta con el código como nombre.
- El comprobante de pago que manda el cliente se ve como imagen, con el monto, la referencia y el titular.

Archivos: `img-productos.js` (nuevo), `mod-ia.js`, `index.html`.

## 2026-09-28 · Integraciones e IA · Agente de WhatsApp real y panel de integraciones

- **El agente de WhatsApp trabaja con el sistema**, no con un guion:
  - Cotiza con el inventario y los precios reales (con IVA incluido y la exoneración del cliente), y dice dónde
    hay existencia.
  - **Aparta** mercadería (compromete la existencia del local, con número de reserva).
  - **Crea pedidos** reales en Ventas › Pedidos: a crédito si el cliente tiene disponible y no está bloqueado; si
    no, con enlace de pago.
  - **Aplica pagos** con su REP y su asiento: primero a un pedido que espera ese monto, si no a las facturas más
    viejas. Solo toma un monto con signo de colones o separador de miles (no confunde el número de una factura).
  - Reconoce al cliente por su **cédula** en una conversación nueva.
  - **Escala a una persona** lo que no le toca: pedidos de más de ₡3,2 M (proveeduría), pagos de más de ₡500 000 o
    que no calzan (contabilidad), precio por volumen y reclamos (jefatura de piso). Escalada, deja de responder.
  - **Tomar la conversación** funciona: el agente se calla, la persona de la sesión responde con su nombre (y puede
    simular al cliente), queda en la bitácora, y la puede devolver al agente.
  - Las cifras de arriba se calculan de las conversaciones, los pedidos y los pagos.
  - Las conversaciones del día se generan pasando los mensajes del cliente por el mismo agente: la reserva de
    teflón, el pedido de la finca, el pago de la transferencia y el recordatorio de cobro son documentos reales.
    Antes citaban un pedido, una reserva y facturas que no existían.
- **Panel de integraciones** (Integraciones e IA › Integraciones externas): Hacienda, Banco Nacional, tipo de cambio
  del BCCR, WhatsApp, correo de comprobantes, datáfonos y nodos locales, cada uno con su estado real, sus cifras,
  la última actividad y la acción que lo resuelve (reintentar envíos, reenviar correos rebotados, simular la caída
  del enlace, ir a la conciliación…), más una bitácora de lo que entró y salió por cada conexión.

Archivos: `mod-ia.js`, `nav.js`, `index.html`.

## 2026-09-28 · Sistema + Reportería y BI · Alertas, permisos y límites pasan a Sistema

Para no duplicar lo que ya existía en Sistema, se movió lo que en Reportería era configuración o bandeja de avisos.

- Nuevo `mod-sys-bi.js` (carga después de `mod-sys.js`): sobrescribe `sis-alertas` con las pestañas Pendientes,
  Resueltas y «Qué avisa» (la pantalla de reglas que ya existía); agrega `BI.accesoReportes` (matriz perfil × grupo
  de reportes) y la pantalla nueva `sis-rendimiento` (exportación y límites, consultas y réplica, modelo de datos).
- `mod-sys.js` (cambios pequeños): pestaña «Acceso a reportes» en Roles y permisos; la política «Exportar a Excel»
  apunta a esa pestaña; excepción de ejemplo «Permiso de exportación» y `BI.agregarExcepcion` para que las
  solicitudes de Reportería lleguen a Autorización de excepciones.
- `mod-bi.js`: las alertas enlazan a `sis-alertas`; la tarjeta «Alertas recientes» dice que se atienden y configuran
  en Sistema, con enlace; `BI.pedirPermiso` reemplaza a `BI.SOLIC` (ya no hay lista propia de solicitudes).
- `mod-bi-control.js`: solo queda Mis descargas y reportes en curso.
- `nav.js`: Reportería sin «Alertas» ni «Permisos de exportación y réplica»; Sistema con «Acceso a reportes»
  (REP-003, REP-004), Notificaciones y alertas (REP-006) y «Rendimiento de reportes» en Mantenimiento y preferencias.

Archivos: `mod-sys-bi.js`, `mod-sys.js`, `mod-bi.js`, `mod-bi-control.js`, `nav.js`, `index.html`, `README.md`.

## 2026-09-28 · Reportería y BI · Migas de pan para volver

- `shell.js` (compartido, cambio pequeño): una pantalla puede definir `trail()` con sus propios niveles de
  migas; los que traen `fn` son botones para volver a ese nivel.
- `mod-bi.js` (Todos los reportes): las migas quedan «Todos los reportes › [reporte] › Resultado»; el primer
  nivel vuelve a la lista y el nombre del reporte vuelve a los filtros. El botón «Todos los reportes» /
  «Volver a los filtros» de arriba a la derecha se conserva.

Archivos: `shell.js`, `mod-bi.js`.

## 2026-09-28 · Reportería y BI · Módulo rehecho contra la matriz (REP-001 a REP-009)

Revisado con el arquitecto ERP/BI (lógica de negocio) y el consultor UX (pantallas). Antes: 3 pantallas, sin
pantalla para exportación ni límites de consulta, tablero sin refresco.

- **Menú por tarea** (`nav.js`): Panorama (Cómo vamos hoy · Comparar) → Reportes (Todos los reportes ·
  Pregúntele a ServeCore) → Seguimiento y control (Alertas · Mis descargas y reportes en curso · Permisos de
  exportación y réplica). Los REP se reparten entre pantallas, no uno por opción.
- **Cómo vamos hoy** (`mod-bi.js`, REP-001/006): venta del día, mes con meta, tiquete, margen; cifras
  secundarias (ventas perdidas, cartera vencida, comprobantes, alertas); curva por hora contra el año pasado;
  los 7 locales con margen; margen por familia; semáforo de inventario por cobertura; alertas recientes.
  Refresco automático cada 30 s con contador, «actualizado hace», pausa y destello del número que cambió.
  Selector Hoy/Semana/Mes. **Modo pantalla de oficina** (fondo oscuro, cifras grandes, 2 vistas que rotan,
  franja de alertas críticas, Esc para salir). Cada cifra abre el reporte que la explica.
- **Comparar** (REP-002): frase «Comparar [ventas] del [año] contra [año anterior] por [local]», barras
  agrupadas o evolución mensual, «lo que dicen los números» en palabras, mapa de calor local × familia y
  tabla plegada.
- **Todos los reportes** (REP-007/008/009): un solo acceso con búsqueda por sinónimos, grupos, favoritos,
  recientes y programados; 34 reportes (los 5 operativos de venta marcados). Flujo **filtros → generar →
  resultado**: nada se genera al abrir (REP-008), migas y «Volver» en cada nivel, validación de fechas en
  lenguaje de negocio, resultado con gráfico primero, comparativo con variación (lo malo en rojo aunque suba),
  tabla ordenable, exportar, favorito, programar, compartir (enlace que no abre sesión) y PDF. «Ver como»
  Gerencia/Bodega/Mostrador muestra candados por perfil.
- **Sin tope de período** (REP-003): un período de más de 2 años no se bloquea; se calcula el alcance, pasa
  a segundo plano en la réplica y aparece en Mis descargas.
- **Exportación con permiso** (REP-004): permiso aparte de ver; sin permiso, botón con candado y «Solicitar
  permiso»; con datos sensibles o más de 50 000 filas pide motivo; queda en bitácora.
- **Pregúntele a ServeCore** (REP-005): muestra «lo que entendí» en fichas, «Ajustar filtros» abre el reporte
  con esos filtros, exportar con permiso, guardar como reporte y preguntas recientes.
- **Alertas** (`mod-bi-control.js`, REP-006): pendientes con acción, tomar y resolver con nota; resueltas;
  reglas con umbral, destinatarios, canales y encendido (costo fuera de rango, venta bajo costo, casilla sin
  reversar, fallo con Hacienda, exportación masiva, consulta lenta).
- **Mis descargas**: cola con progreso, listo, cancelar, reintentar y error explicado sin códigos técnicos;
  historial de exportaciones con las rechazadas por permiso.
- **Permisos de exportación y réplica**: solicitudes por resolver, matriz perfil × grupo de reportes, reglas
  (máscara de datos personales, marca de agua, tope de filas, motivo), límites de consultas grandes, estado de
  la réplica con el recorrido caja → base → réplica, y modelo de datos (hechos y dimensiones).
- Preguntas y reportes salen de `mod-ia.js` (queda solo el agente de WhatsApp). `index.html` carga los dos
  archivos nuevos después de `mod-ia.js`.

Archivos: `mod-bi.js` (nuevo), `mod-bi-control.js` (nuevo), `mod-ia.js`, `nav.js`, `index.html`, `README.md`.

## 2026-09-26 · Inventarios · Campo de proveedores del sugerido más compacto

- `mod-inv.js` (Reposición › Sugerido de compra): las etiquetas de proveedores van dentro del mismo campo,
  con el texto de búsqueda a continuación (mide lo mismo que Local, Familia y Días, y crece solo si hay muchas
  etiquetas). El campo comparte fila con «Sin ventas atípicas», «Con temporadas activas» y «Generar sugerido»,
  así la tarjeta de filtros baja una fila. Clic en cualquier parte del campo pone el cursor; Retroceso con el
  texto vacío quita la última etiqueta.

Archivos: `mod-inv.js`.

## 2026-09-26 · Inventarios + Compras · Proveedores del sugerido con buscador

- `mod-inv.js` (Reposición › Sugerido de compra): las casillas de proveedores (una por proveedor, no escala a
  cientos) pasan a un buscador por nombre, cédula o línea; cada proveedor elegido queda como etiqueta con ✕.
  Sin etiquetas, el sugerido toma todos los proveedores, como antes. Si Compras no cargara, vuelven las casillas.
- `mod-compra.js`: expone su buscador en `A.compras.ui` para que lo usen las pantallas vecinas.
- Queda como idea, sin hacer: cambiar el proveedor por línea en el resultado del sugerido y proveedores
  alternos por artículo en el catálogo.

Archivos: `mod-inv.js`, `mod-compra.js`.

## 2026-09-26 · Compras / Proveeduría · Buscadores, cotizar desde cero y alta de proveedores

Revisión del usuario sobre la versión anterior.

- **Buscador con resultados al digitar** (`mod-compra.js`): reemplaza los combos donde la lista es larga.
  Proveedor de la orden nueva, artículos de la orden, artículos e invitados de la cotización. Busca por
  nombre, código, cédula, marca, línea o código de barras; flechas y Enter eligen; el lector (código exacto
  o `24*código`) entra directo. Con el campo vacío sugiere lo que se le compra a ese proveedor o los
  proveedores con más compras. Antes el campo de artículos solo reaccionaba a un código exacto con Enter.
- **Cotizar a proveedores** se arma completo en su propia opción: bandeja de cotizaciones y **Nueva
  cotización**. Recorrido Artículos → Proveedores → Envío y respuestas → Adjudicación, con la barra «qué
  sigue». Los artículos se agregan con el buscador, se pegan desde Excel o se traen del sugerido de compra
  (vuelven a la misma cotización en borrador). Se invita a **cualquier** proveedor con el buscador;
  los sugeridos (los que surten esos artículos y los de mejor cumplimiento) son botones de un toque. Borrador
  editable y descartable hasta enviarse.
- **Proveedores**: búsqueda en la lista, **Nuevo proveedor** y **Editar datos** en el mismo cajón (cédula,
  razón social, línea, plazo, IBAN, contacto, correo y WhatsApp). La cédula no cambia y la cuenta bancaria se
  cambia en Cobros y pagos; un proveedor no se borra, se inactiva (SEG-007) y deja de aparecer en órdenes y
  cotizaciones. Desde la orden se abre el mismo cajón sin salir (COM-018).
- Botón «Desde el sugerido» de Órdenes pasa a «Sugerido de compra».

Archivos: `mod-compra.js`.

## 2026-09-26 · Compras / Proveeduría · Ciclo completo de la compra, auditado contra la matriz

Auditoría del módulo (auditor de proveeduría) y corrección. Antes: la orden no se creaba ni se anulaba, la
recepción era estática, «Aplicar compra» metía al kardex el 100 % de lo pedido sin factura ni recepción, el
costo promedio no se recalculaba y un XML aceptado antes de aplicar la orden duplicaba la cuenta por pagar.

- **Menú por flujo** (`nav.js`): Comprar (Cotizar · Órdenes) → Recibir y registrar (Recepción · Registrar
  compra) → Proveedores (· Importaciones, próximamente). Cubre COM-001 a COM-022, cada uno una vez.
- **Órdenes de compra** (`mod-compra.js`): bandeja por estado (abiertas, por aprobar, por recibir, por registrar,
  cerradas) y la orden con su recorrido y la barra «qué sigue». Registrada → Aprobada → Recibida (parcial) →
  Aplicada · Anulada con motivo (COM-001, SIS-008). Líneas editables mientras está registrada, con Enter que baja
  de línea, alta por código o escáner (`24*código`), plantilla pegada desde Excel con revisión previa (COM-015),
  copia a otro local (COM-016), QR (COM-004), negociación y plazo especial con motivo (COM-011, COM-017), ficha
  del proveedor en un cajón sin salir de la orden (COM-018), autoconsumo al gasto (COM-012), suma corrida a la
  vista y tabla alta (COM-021). La variación se calcula contra el costo vigente; sobre ±15 % bloquea la aprobación
  hasta corregir o que Gerencia autorice con motivo (COM-008). Aprobación masiva con resumen.
- **Recepción en bodega**: escaneo real con foco permanente, multiplicador, pitido y aviso distinto para «bien»,
  «excede lo pedido» y «no está en la orden»; recepción ciega opcional; «llenar con lo pedido» para contar por
  excepción; lo no solicitado queda con trazabilidad sin crear artículo (COM-020); placa, transportista, sello y
  fotos obligatorios al cerrar (COM-019); faltante queda pendiente o se cierra corto, sobrante se devuelve o se
  acepta (COM-003, COM-006). **Reparto a los locales** con sugerido por mínimos y existencia de cada tienda, que
  genera los traslados en tránsito con `INVX.crearTraslado` (COM-009).
- **Registrar compra**: la factura del proveedor se toma del buzón (XML ligado a la orden) y se coteja en tres vías
  pedido · recibido · facturado con tolerancia de precio. Entra al kardex lo recibido al precio de la factura,
  se recalcula el costo promedio (negativo en cero), sale un asiento y una cuenta por pagar, el mensaje de receptor
  es total o parcial y lo facturado de más queda como nota de crédito por pedir (COM-002, COM-005, FEL-003,
  FEL-006, INV-002/003). Lo pendiente abre una orden aprobada por lo que falta (COM-007).
- **Cotizar a proveedores**: preselección de invitados con plazo y cumplimiento, carga de respuestas, cuadro con
  último costo y existencia, adjudicación por línea (sugerida, por precio o manual) con explicación calculada, y
  crea las órdenes de verdad (COM-010, COM-013, COM-014).
- **Proveedores**: negociaciones vigentes y desempeño de 90 días (a tiempo y completas, líneas surtidas, entrega
  real contra prometida, variación de precio).
- **Separación de funciones**: compra Proveeduría, aprueba Gerencia (nunca quien hizo la orden), recibe Bodega,
  registra Proveeduría o Contabilidad (nunca quien recibió). Cada paso firma en la bitácora y en el historial de
  la orden. La barra ofrece «Entrar como…» para la demo.
- `data.js` (compartido, autorizado): Óscar Jiménez (Proveeduría) y Kevin Solano (Bodega) en la sesión;
  `aceptarRecibido` ya no asienta el XML de una orden sin aplicar (la compra lo registra una sola vez);
  `D.costoPromedio` y `D.cotejoRecibido`; el costo de cada línea sembrada sale de su variación; un XML por orden,
  con sus líneas; negociaciones por proveedor (mismos términos que `PRONTO` de Cobros); el consecutivo de orden
  nunca se repite (antes el sugerido podía crear otra OC-2026-004412).
- `fis-data.js` (autorizado): «Aceptar todos» en Comprobantes recibidos solo acepta los que cuadran con su compra
  registrada.
- `mod-inv.js` (autorizado): «Cotizar a proveedores» del sugerido crea la subasta en Compras en vez de solo avisar.

Pendiente fuera de alcance: `con-auto.js` (Contabilidad) sigue aceptando en bloque los comprobantes con orden sin
cotejar; `mod-cobros.js` podría leer `proveedor.negociaciones` en vez de su `PRONTO`; el tope de ±15 % de Sistema ›
Parámetros todavía es solo de lectura.

Archivos: `mod-compra.js`, `nav.js`, `data.js`, `fis-data.js`, `mod-inv.js`.

## 2026-09-26 · POS + Ventas · Crédito con abono al facturar

Al combinar un pago (p. ej. efectivo) con Crédito, el pago se descartaba: la factura salía a crédito por el
total y el historial solo mostraba el crédito.

- `mod-venta.js`: al escoger **Crédito** se conservan los pagos ya agregados y también el monto parcial
  digitado sin agregar (el monto completo que trae el campo por defecto no cuenta). La hoja muestra cada
  abono (con ✕ para quitarlo) y **Queda a crédito**. Al aplicar, la factura sale a crédito por el total y
  cada abono se registra con `FIS.aplicarCobro` —la misma vía de Cobros—: emite su REP, baja el saldo de la
  factura y del cliente y asienta (el IVA del abono pasa de diferido a por pagar). La factura guarda
  `doc.abonos` con medio, monto, referencia y REP. Si lo agregado cubre todo, avisa que no queda nada a crédito.
- `mod-venta-gestion.js`: el historial muestra «Efectivo + Crédito» en la columna Pago y en el detalle cada
  abono con su REP, lo que quedó a crédito, vencimiento y saldo.
- `ven-auto.js`: en el resumen del turno, Crédito suma solo lo que quedó por cobrar, y los abonos cobrados en
  la caja suman a su medio (antes solo el efectivo), para que el lote del datáfono cuadre.

## 2026-09-26 · POS · El monto del cobro conserva el formato mientras se digita

- `mod-venta.js`: el campo **Monto** del cobro separa los miles con espacio en cada tecla (antes se veía
  «1 000000» al digitar) y el cursor se queda junto al dígito que se estaba editando. En **Dólares** acepta
  coma o punto como decimal, con hasta dos decimales, y el monto convertido también sale con miles separados.

## 2026-09-26 · Ventas + Facturación · Historial de ventas con cómo se pagó

«Documentos emitidos» (Ventas) y «Comprobantes emitidos» (Facturación) se llamaban casi igual y no quedaba
claro dónde se ven las facturas con su detalle.

- `mod-venta-gestion.js`: la pestaña pasa a **Historial de ventas**. La lista cambia la columna «Cond.» por
  **Pago** (crédito o los medios usados, p. ej. «Tarjeta + Efectivo») y el buscador también encuentra por
  vendedor. El detalle agrega la celda **Vendedor** y un bloque **Cómo se pagó**: cada pago con su monto y
  referencia (dólares con su tipo de cambio y el vuelto), o, si fue a crédito, plazo, vencimiento, orden de
  compra, quién retiró y saldo pendiente.
- `mod-fiscal.js` y `nav.js`: «Comprobantes emitidos» de Facturación pasa a **Estado ante Hacienda** (clave,
  XML y respuesta de Hacienda); el menú y los textos de ayuda se ajustaron a los dos nombres nuevos.

## 2026-09-26 · POS · El crédito es un medio de pago más y la venta nunca se bloquea

Desde «Controles de la caja» (22-set, commit 514b04f), un cliente con crédito abría el cobro en una hoja
«Factura a crédito» sin medios de pago, y si tenía el crédito bloqueado por mora o límite la caja no dejaba
cobrar. Ahora:

- `mod-venta.js`: una sola hoja «Cobro de la factura». A clientes con crédito se les agrega el medio
  **Crédito N días** (Alt+8), preseleccionado. Escoger efectivo, tarjeta, SINPE, etc. (o pagos mixtos) cobra
  la factura de contado; escoger Crédito muestra orden de compra, quién retira, disponible y aviso del REP.
- Si el crédito no procede (mora, límite, sin sobregiro autorizado) solo se deshabilita el medio Crédito con
  una nota corta; la venta se cobra con cualquier otro medio. El seguimiento de la mora vive en Cobros.
- La factura guarda la condición según el medio escogido; el sobregiro solo se consume si fue a crédito.
- Se conserva el resto de ese commit: pagos mixtos, turno obligatorio, arqueo ciego y autorización de margen.

## 2026-09-23 · Cobros y pagos + Nómina · Pagos al banco: una sola bandeja para proveedores y planilla

El archivo plano del Banco Nacional es el mismo para proveedores y para planilla, así que el proceso de pago
ya no se repite en los dos módulos. Proveeduría (lote de facturas) y Nómina (corrida aprobada) **preparan**;
Cobros y pagos › **Pagos al banco** firma, genera el archivo, registra la validación del módulo local, marca el
envío y confirma con su asiento.

- **Bandeja única** (`cob-archivo`): lotes de los dos orígenes con filtro, pasos (firmas · archivo · módulo local
  · banco · confirmado), la planilla primero y con aviso de la fecha legal de pago, y un archivo por lote
  (concepto «SALARIO» o «PAGO PROGRAMADO»). Pestañas: Bandeja, Historial, Firmas y responsables, Cuentas de
  proveedores y Estructura del archivo.
- **Firmas y responsables parametrizables por origen**: cantidad de firmas (1 a 3), quiénes pueden firmar (con
  límite por lote), quién genera y valida el archivo (por omisión Andrey Ramírez, TI) y quién lo sube al banco
  (por omisión Adrián Vindas, gerencia). Quien preparó nunca firma y nadie firma dos veces; los cambios quedan
  en la bitácora.
- **Nómina** (`mod-planilla.js`, paso Pago): «Enviar a Pagos al banco» en lugar de generar el archivo; el paso
  muestra el lote y su estado, y si tesorería lo devuelve permite reenviarlo. Al confirmar el pago la planilla
  queda «Pagada» y se registra el asiento de salarios por pagar contra el banco, que el asiento de la planilla
  cancela (verificado: queda en cero).
- **Análisis de pagos a proveedores** (`cxp`): vencimientos y lote; la pestaña de lotes pasa a seguimiento y
  las firmas se hacen en la bandeja.
- `nom-data.js`: las cuentas de los colaboradores tenían 19 caracteres; ahora son IBAN válidos de 22 (con el
  código del banco de cada persona), sin cambiar el resto de los datos de ejemplo.
- `nav.js`: la sección se llama «Pagos»; «Pagos al banco» cita CXP-002, CXP-003 y CXP-004, y «Análisis de pagos
  a proveedores» CXP-001.

Archivos: `mod-cobros.js`, `mod-planilla.js`, `nom-data.js`, `nav.js`.

## 2026-09-23 · Cobros y pagos · Sin acceso directo al archivo de planilla

Se quitó del menú de Cobros y pagos «Archivo plano de planilla (Banco Nacional)»: era un acceso directo que
llevaba a Nómina › Planilla › Pago y cambiaba de módulo sin aviso. El archivo sale de la corrida aprobada, así que
queda solo en Nómina, donde CXP-003 ya estaba citado. La sección pasa a llamarse «Caja menor» (caja chica y
tarjeta empresarial). Cobros y pagos queda con 10 opciones.

Archivo: `nav.js`.

## 2026-09-23 · Cobros y pagos · Buscador de clientes y proveedores

Con miles de clientes y cientos de proveedores un combo no sirve. En Cobros y pagos, cada campo de cliente o
proveedor es ahora un buscador que muestra resultados al digitar (nombre, cédula o teléfono), con las letras
coincidentes resaltadas, hasta 8 resultados y el total de coincidencias, y se maneja con ↑ ↓, Enter y Esc. Aplica
en el recibo de dinero, estado de cuenta, gestión de cobro, anticipos, identificación de transferencias,
solicitud de crédito, cambio de cuenta de proveedor y notas a proveedor. Las listas largas (líneas de crédito,
antigüedad por cliente, documentos por cobrar, facturas por pagar y proveedores del estado de cuenta) tienen un
filtro en vivo.

Archivo: `mod-cobros.js`.

## 2026-09-23 · Cobros y pagos · Módulo completo de cuentas por cobrar y por pagar

Revisión con el auditor contable contra la matriz (CXC-001 a CXC-005, CXP-001 a CXP-007). El módulo tenía
dos pantallas (antigüedad y vencimientos); ahora tiene una opción por tarea, cada una con el asiento que genera
a la vista. Todo lo que mueve saldos usa las funciones del resto del sistema (`FIS.aplicarCobro`, `D.asentar`):
el auxiliar de clientes, el de proveedores y el de anticipos siguen cuadrando con el mayor después de cada acción.

- **Crédito de clientes** (CXC-001/002): líneas de toda la cartera (límite, saldo, comprometido, disponible,
  días promedio de pago, estado en la caja), solicitudes de línea con segregación (solicita · analiza · aprueba),
  bitácora de excepciones con autorizador y clave, y política de crédito (días de bloqueo, tramos, recordatorios).
- **Conta ruta** (CXC-004): facturas a un día con ruta y chofer, liquidación desde la lista (sale el REP) y
  liquidación del efectivo por chofer. Se emiten seis facturas de ejemplo con `D.emitir`; los clientes de contado
  C5, C9 y C11 quedan con plazo 1 día.
- **Análisis y gestión de cobro** (CXC-003): antigüedad en los seis tramos de la política (91–120 y más de 120
  separados), por cliente, con cuadre contra 1-01-03-001; documentos con IVA diferido y asiento de la venta;
  estado de cuenta por obra con saldo corrido; gestión de cobro (promesas, bitácora); estimación de incobrables
  con el ajuste propuesto y candidatas a castigo.
- **Recibos de dinero**: un recibo aplica a varias facturas con hasta cuatro medios, referencia obligatoria,
  saldo a favor aplicable, remanente a anticipo, un REP por factura cobrada, anulación con reversa y autorización,
  y la bandeja de transferencias que llegan por WhatsApp (INT-007).
- **Anticipos de cliente** (CXC-005): saldos a favor con su origen, registro, aplicación y devolución; depósitos
  sin identificar (se registran contra 2-01-06-002 y se identifican después).
- **Pagos a proveedores** (CXP-001/004): auxiliar único (facturas migradas, compras aplicadas, comprobantes
  aceptados, gastos por XML y notas), selección con totales vivos, pronto pago por negociación (COM-011), notas de
  crédito aplicadas solas, retenidas y comprobantes sin aceptar fuera del pago; lotes con dos firmas distintas a
  quien preparó y límite por firmante.
- **Archivo plano del Banco Nacional** (CXP-002): líneas 1-2-3-4 con la cuenta tomada de la ficha, validaciones
  (IBAN de 22 caracteres y módulo 97, fecha, totales, duplicados, firmas), descarga del .txt, llave del módulo
  local, envío y confirmación con asiento. Cambio de cuenta de proveedor con respaldo y segunda aprobación.
- **Estado de cuenta del proveedor** (CXP-007) y **notas de crédito y débito** (CXP-006) con los ocho conceptos,
  cuenta por concepto, validación de la clave de 50 dígitos (cédula del emisor, tipo 03) y detección de duplicados.
- **Caja chica y tarjeta empresarial** (CXP-005): fondos fijos por local, vales con o sin factura electrónica,
  arqueo, liquidación y reposición; movimientos de la tarjeta con comprobante y asiento del pago.

Correcciones de datos y compartidos (cambios pequeños):

- `data.js`: el saldo del proveedor sumaba el monto original de las facturas migradas aunque estuvieran abonadas
  (el detalle daba ₡29,5 M menos que el saldo). Ahora suma el saldo. Las cuentas IBAN de los proveedores tenían
  19 caracteres: ahora son IBAN válidos de 22. Cuentas nuevas en el catálogo: 2-01-01-003 Tarjeta empresarial por
  pagar, 2-01-06-002 Depósitos sin identificar y 5-01-02-001 Descuentos y bonificaciones sobre compras.
- `con-auto.js`: la antigüedad de Contabilidad cortaba en «más de 90» y aplicaba 25 % a todo; ahora separa 91–120
  (25 %) y más de 120 (50 %) como dice la política. El auxiliar de proveedores respeta el saldo de un gasto pagado.
- `nav.js`: árbol de Cobros y pagos (11 opciones) y sus pantallas en el índice. `index.html`: carga
  `mod-cobros.js` y la antigüedad de seis tramos cabe en una fila.
- `mod-venta.js` y `mod-compra.js`: las pantallas `cxc` y `cxp` se mudaron a `mod-cobros.js` (mismo id);
  Compras › Proveedores muestra el mismo auxiliar y enlaza al estado de cuenta completo.

Archivos: `mod-cobros.js` (nuevo), `data.js`, `con-auto.js`, `nav.js`, `index.html`, `mod-venta.js`, `mod-compra.js`.

## 2026-09-23 · Contabilidad · Ajustes de la revisión final para la demo

Hallazgos 1 a 6 y 10 de la revisión final de preparación para la demo.

- **No se aprueba un mes que no terminó.** El cierre de setiembre se prepara, se revisa y se envía, pero aprobarlo el
  13 de setiembre dejaría la caja sin poder facturar; ahora lo explica y no lo permite.
- **Cruce de inventario real y en vivo.** La diferencia de Pacayas existe de verdad: 3 esmaltes salieron del kardex
  con el asiento de la merma retenido, así que el libro queda arriba del kardex por ese monto hasta aprobarla en la
  bandeja; al aprobarla, la cuenta y el kardex quedan iguales. Se quitó la diferencia inventada de la Bodega 1. La
  tabla se recalcula con cada venta y la nota explica la diferencia con los datos.
- **D-150 en vivo:** el borrador de Contabilidad es el mismo número que Facturación y muestra aparte «Menos: IVA de
  notas de crédito». Aceptar comprobantes desde la bandeja crea la cuenta por pagar y el crédito fiscal, y el de
  «sin orden» ya no acepta también los que tienen orden.
- **Resumen del cierre del mes**, no del acumulado del año (este aparte), y cuenta los asientos manuales de verdad.
  La migración trae la renta estimada de enero a agosto, así el ajuste de renta del cierre es solo del mes.
- **Períodos:** enero a agosto muestran que los revisó contabilidad y los aprobó gerencia, «migrado» en lugar de
  cero asientos y sin botón de reabrir. La banda del cierre muestra quién lo envió.
- **Bitácora de Contabilidad** con la persona de la sesión, su cargo, su local y su equipo.
- El SINPE sin identificar dice «Marcar como identificado», que es lo que hace.

Archivos: `con-auto.js`, `con-data.js`, `fis-data.js`, `mod-conta.js`.

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
