# Cambios

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
