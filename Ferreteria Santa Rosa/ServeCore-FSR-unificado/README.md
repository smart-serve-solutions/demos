# ServeCore · Ferretería Santa Rosa — demo navegable (versión unificada)

Prototipo navegable de ServeCore para FSR. HTML + JavaScript sin compilar: abra
`index.html` con doble clic (o sirva la carpeta con `python3 -m http.server` y
entre a `http://localhost:8000`). Sin internet funciona igual; solo cambian las
tipografías (Manrope e IBM Plex) por las del sistema.

**Esta carpeta es la única fuente del prototipo.** Los chats no publican ni
actualizan artefactos de ServeCore; trabajan sobre estos archivos.

## Archivos

| Archivo | Qué contiene |
|---|---|
| `index.html` | CSS completo del rediseño y el armazón; carga los scripts en orden |
| `nav.js` | Árbol del menú: módulo → sección → pantalla, con los requerimientos de la matriz |
| `core.js` | Íconos, formato de cifras y piezas de interfaz (`card`, `stat`, `tag`, `table`, `seg`, `bars`, `openSheet`, `toast`…) |
| `shell.js` | Estado, barra superior, menú, migas, contingencia, ruteo y tema |
| `data.js` | Base simulada: artículos, documentos, kardex, clientes, bitácora… |
| `nom-data.js` · `fis-data.js` · `con-data.js` | Datos y reglas de nómina (CR 2026), factura electrónica 4.4 y contabilidad |
| `con-auto.js` · `inv-auto.js` · `ven-auto.js` | Automatizaciones simuladas de contabilidad, inventario y ventas |
| `mod-inicio.js` | Inicio |
| `mod-venta.js` | La caja (facturación en el punto de venta), rutas y cuentas por cobrar |
| `mod-venta-gestion.js` | Ventas alrededor de la caja: pendientes, caja y turnos, cotizaciones, entregas, devoluciones, clientes, precios y vendedores |
| `mod-inv.js` | Inventarios (bodega, existencias, traslados, conteos, catálogo, reposición) |
| `mod-compra.js` | Compras y proveedores |
| `mod-nomina.js` · `mod-planilla.js` | Nómina y RRHH |
| `mod-fiscal.js` | Facturación electrónica |
| `mod-conta.js` | Contabilidad (bandeja, conciliaciones, libros, informes, cierre, reglas) |
| `mod-ia.js` · `mod-sys.js` | IA / WhatsApp y sistema (usuarios, historial, configuración) |
| `mark.png` | Logotipo |

## Cómo agregar una pantalla

```js
APP.screen("mi-pantalla", {
  title: "Título",
  sub: () => "Línea de contexto",
  extra: () => seg("filtro", ["Uno", "Dos"], "Uno"),
  render(v) { v.innerHTML = card({ title: "…", body: table({ cols, rows }) }); },
  wire(v) { /* eventos */ }
});
```

Luego agréguela como `screen` en el árbol de `nav.js`.

## Reglas para trabajar (chats y personas)

1. Leer el archivo **actual** de esta carpeta antes de cambiarlo. Nunca partir de una copia vieja ni de un artefacto publicado.
2. Tocar solo los archivos del módulo en el que se trabaja. `index.html`, `nav.js`, `core.js`, `shell.js` y `data.js` son compartidos: cambios pequeños y anotados.
3. Anotar cada cambio en `CHANGELOG.md` (fecha, módulo, qué cambió).
4. Commit con el módulo al inicio del mensaje: `pos: …`, `conta: …`, `nomina: …`.
5. No editar el mismo archivo desde dos chats a la vez.
