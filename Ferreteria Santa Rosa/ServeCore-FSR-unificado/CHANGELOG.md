# Cambios

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
