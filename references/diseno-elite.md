# Guía de diseño elite (ejecutable)

Destilado operativo de `microsoft/skills-for-fabric` → skill `powerbi-report-design`
(referencias: visual-cookbook, color, layout, chart-selection, anti-patterns) +
estándar IBCS + el contrato visual de la maqueta HTML de cada proyecto. **Leer
SIEMPRE antes de generar visuales.** Si el repo upstream está en disco
(`C:\Temp\skills-for-fabric\plugins\powerbi-authoring\skills\powerbi-report-design\`),
consultar sus referencias para dudas profundas; esta guía manda para lo ejecutable.

## 0. Reglas de oro

1. Una página = una pregunta de negocio (3-30-300: 3 s la entiende, 30 s la usa, 300 s la audita).
2. El título cuenta la historia con el hallazgo, no describe el gráfico (`La brecha se abre desde Ago: -694M, 86.4%`). Dos variantes válidas: **hallazgo dinámico** (medida DAX, se recalcula con datos y filtros) o **descriptivo neutro** (`Venta real vs meta por mes (S/)`, cero mantenimiento). Nunca un hallazgo estático que envejece. El banner de página queda estático (shape sin expresiones).
3. Máximo 12-15 visuales por página; si un visual no responde una pregunta distinta, se elimina.
4. La maqueta HTML aprobada es el contrato: mismas secciones, jerarquía y colores semánticos.
5. El estilo vive en el TEMA (`assets/tema-elite.json`); per-visual solo excepciones (condicional, títulos, etiquetas).
6. Todo texto de campos: `displayName` humano (nunca `sum of importe_venta` ni snake_case).

## 1. Paleta (roles fijos)

| Rol | Hex | Uso |
|---|---|---|
| Canvas | `#E9EEF3` | Fondo de página (`page.json objects.background`) |
| Superficie | `#FFFFFF` | Fondo de cada visual (tema wildcard) |
| Borde | `#E2E8EF` | Borde de contenedores, radius 6 |
| Texto principal | `#0C3549` | Títulos, valores KPI, cabeceras |
| Texto secundario | `#5A6B7B` | Ejes, subtítulos, labels de tarjeta, notas |
| Texto atenuado | `#5A6B7B` | No usar `#7A8A99` como texto pequeño (3.54:1, falla AA) |
| Actual (real) | `#0C3549` | Serie real / barras principales |
| Comparación (ppto/meta) | `#6B7C8C` | Serie presupuesto (gris ≥3:1 en trazos; `#CCCCCC`/`#B9C4CE` solo como marcadores) |
| Positivo | `#44C088` | Rellenos amplios, cubetas, fondos semáforo |
| Advertencia | `#F2C14E` | Rellenos amplios |
| Negativo | `#ED7373` | Rellenos amplios |
| Acento oscuro (trazos/texto) | `#0F7B4F` · `#B7791F` · `#C0392B` | Barras de acento 4px, barras de ranking coloreadas, texto de estado y signo (≥3:1 en gráficos; ≥4.5 en texto) |
| Semáforo fondo OK | `#E3F5EB` | Fondo tarjeta KPI |
| Semáforo fondo riesgo | `#FCF1DC` | Fondo tarjeta KPI |
| Semáforo fondo alerta | `#FBE5E5` | Fondo tarjeta KPI |

**Asignación (color.md):** misma medida → mismo color en toda la página; desglose
de una medida → gradiente de ese color; medida distinta → siguiente hue libre;
semánticos (verde/ámbar/rojo) **reservados**, nunca decorativos. Máx 5-7 colores
con carga semántica por página. El tema ya ordena `dataColors`:
`[actual, comparación, verde, rojo, ámbar, azul, violeta, naranja]`.

## 2. Tipografía (Segoe UI)

| Elemento | Tamaño | Peso |
|---|---|---|
| Banner / título de página | 17-20 pt | Bold + subtítulo 12-13 pt regular |
| Valor tarjeta KPI | 22-24 pt | Bold |
| Label tarjeta KPI | 10 pt | Regular |
| Título de visual | 12-13 pt | Semibold |
| Cabecera tabla/matriz | 10 pt | Bold |
| Cuerpo tabla / eje categoría | 10 pt | Regular |
| Etiquetas de datos | 9-10 pt | Regular |
| Pie / fuente | 8-9 pt | Regular |

## 3. Grid canónico 1280×720 (validado por `pbir_validate_wireframe`)

- Márgenes: 15 izq / 15 der / 6 abajo; gaps 5 px; borde inferior ≤714.
- Banner = **shape rectangle** en (0,0,1280,52) con el título en `objects.text` (un textbox en (0,0) NO se reconoce como banner y falla márgenes). Primera fila de contenido y=57.
- Filas contiguas con el MISMO número de visuales deben compartir grilla de columnas (si no, aviso `COLUMN_MISALIGN`); filas con distinto conteo no se comparan.
- Slicers con altura ≥44 (por debajo se corta el chevron). `tabOrder` = orden de lectura.

**Plantilla ejecutiva de 1 página (0 errores / 0 avisos en `pbir_validate_wireframe`):**

| Zona | y | h | x / ancho |
|---|---|---|---|
| Header: logo (shape 34×34) + título textbox | 6 | 36 | logo x15 w34 · título x54 w800 (borde inferior 42) |
| Fila de slicers (3) | 47 | 60 | w196 x667 / 868 / 1069 (3 ítems ≠ grilla KPI: evita `COLUMN_MISALIGN`) |
| Franja KPIs (4) | 112 | 104 | w308/311 x15 / 328 / 641 / 954 |
| Héroes (2) | 221 | 235 | x15 w622 · x642 w623 |
| Detalle (tabla/matriz) | 461 | 253 | x15 w622 · x642 w623 |

**Slicers: altura 60 mínima** (estándar de casa). Por debajo de 60 el dropdown se
desborda del contenedor y tapa la fila siguiente; por debajo de 44 directamente
no es usable. `valida_pbip.js` lo chequea (error <44, aviso <60).

Variante con **banner shape** (0,0,1280,52) en lugar del header de identidad:
sumar +10 px a las filas siguientes (slicers 57/60 · KPIs 122/104 · héroes 231/235 ·
detalle 471/243). Los gaps deben ser **exactamente 5 px** (el validador wireframe
lo exige; 9 o 15 px = error). KPIs h=104 para que quepan label + valor +
referencia (`referenceLabel`) sin recortes.

Variantes: 3 páginas elite → P1 Resumen (¿vamos a cumplir?), P2 Rentabilidad
(¿a qué costo?), P3 Foco (¿dónde actuar?). Slicers solo por el grano del hecho
que el presupuesto soporta (nunca vendedor si el ppto no lo tiene).

## 4. Selección de visual (resumen)

| Situación | Usar | Evitar |
|---|---|---|
| 1 KPI | `card` (1 medida) | `kpi` visual; varias medidas por tarjeta |
| Ranking categorías | `barChart` H, sort DESC, ≥6 categorías | donut si la pregunta es comparación |
| Tendencia ≥3 puntos de tiempo (mes numérico o fecha) | `lineChart`/combo | meses como texto, 1-2 puntos |
| Real vs meta por mes (misma unidad) | `lineChart` con 2 series (Real sólida, Meta punteada) o columnas agrupadas — **un solo eje** | combo con `Y2`: asigna eje secundario automático (anti-patrón) |
| Cumplimiento % por mes | `columnChart` con gradiente rojo→verde | pie/donut |
| Parte-de-todo ≤5 | donut solo si la pregunta es la proporción | donut >5 categorías → barras |
| Detalle exacto | `tableEx` / `pivotTable` | gráfico cuando la tarea es leer |
| Heatmap región × categoría | `pivotTable` con gradiente | matriz sin CF |

## 5. Cookbook por tipo (ejecución)

**Tarjeta KPI (`card` clásica):** una medida por tarjeta; valor con
`objects.labels` (`fontSize 22D`, `labelDisplayUnits` según magnitud, `color` por
medida semáforo); label con `objects.categoryLabels` (show, 10D, `#5A6B7B`);
fondo semáforo con `visualContainerObjects.background` + `Conditional Cases`
(ver §6). ⚠️ `calloutValue` NO existe en `card` (es de `cardVisual`): usarlo hace
que el color no aplique. Ancho mínimo 293 px para `#,0` de 9 dígitos (evita
`758 mi...` truncado).

**Real vs meta mensual (misma unidad):** evitar el combo con `Y2` — PBI asigna la
línea al **eje secundario** automáticamente y las escalas divergen (anti-patrón de
doble eje, ver §7). Usar `lineChart` de 2 series (Real sólida navy, Meta gris
punteada, sin área/marcadores) o columnas agrupadas: un solo eje, lectura directa.
`Y2` solo cuando las unidades difieren de verdad (y documentarlo en el brief).

**Barras de ranking:** `sortDefinition` por medida DESC; etiquetas encendidas
fuera del extremo; gradiente vertical `dataPoint.fill` `linearGradient2` tint→base
del color de la medida (§6); a partir de 16 categorías, filtro Top N.

**Línea:** suavizada, área tenue (transparencia 85), marcadores apagados con ≥12
puntos, densidad de etiquetas 25, línea de referencia punteada para promedio/meta.

**Tabla (`tableEx`):** `growToFit` + autoSizeColumnWidth (lo da el tema); orden por
la columna de mayor interés DESC; `displayName` humano; CF dataBar en la columna
de magnitud; fila de total solo para medidas aditivas; alto mínimo 240 px.

**Matriz (`pivotTable`):** celdas con gradiente min→mid→max sobre la medida de
cumplimiento (§6); subtotales visibles; grilla blanca (viene del tema).

**Slicers:** 1-3 por página, en la banda del banner (nunca rail vertical si son
≤3); dropdown (`mode: "'Dropdown'"`), `header.text` humano; año/mes como dropdown,
nunca `Between` salvo exploración de fechas real del analista.

**Textbox:** `paragraphs` es array nativo (nunca string). Altura mínima anti-scrollbar:
`h ≥ max(18, pt × 25/16⌉) + padding`. 13 pt → ≥ 22 px; 20 pt → ≥ 32 px. El
**banner** de página no es textbox: es shape (ver §3).

**Banner (shape con texto):** `objects.shape.tileShape` rectangle; `objects.fill`
(`selector.id: default`) con `fillColor`; `objects.outline` show false;
`objects.text`: primer ítem `show: true`, segundo ítem con
`selector.id: default` y `text`/`fontColor`/`verticalAlignment: 'middle'`/
`bold`/`fontSize 17D`. JSON exacto en `pbir-visuales.md` §Banner.

## 6. Formato condicional (catálogo)

| Técnica | Dónde | Umbral / colores |
|---|---|---|
| Fondo semáforo tarjeta | KPI cumplimiento | ≥98 % `#E3F5EB` · ≥90 % `#FCF1DC` · resto `#FBE5E5` |
| Acento lateral tarjeta (4px) | KPI (cardVisual) | Trío oscuro accesible: `#0F7B4F` / `#B7791F` / `#C0392B` |
| Cubetas de cumplimiento | Matriz/tabla | <90 % `#FBE5E5` · 90-98 % `#FCF1DC` · ≥98 % `#E3F5EB` (texto `#1E3A4F`, AAA) |
| Iconos de estado | Tabla (Cumpl. %) | `TrafficHigh`/`TrafficMedium`/`TrafficLow` (`values.icon`, catálogo cerrado) |
| Data bars | Tabla (magnitud) | `columnFormatting.dataBars`, selector SOLO `metadata`, tinte claro |
| Texto de signo | Desviación/varianza | `fontColor` Conditional `#C0392B` (<0) / `#0F7B4F` (≥0) |
| Gradiente celdas | Solo si hace falta continuo | `FillRule` min/mid/max (CVD: familia RdBu `#B2182B`→`#F7F7F7`→`#2166AC`) |
| Color por categoría | Barras con identidad | `selector.data[dataViewWildcard.matchingOption=1]` |
| Ícono/estado | Tabla control | texto `Alerta Rezagado` (`Sin Ppto`/`Rezagado`/`En riesgo`/`OK`) |

Sintaxis JSON exacta (semáforo `Conditional Cases` y `FillRule` gradientes) en
`references/pbir-visuales.md` §Condicional. Regla dura: los gradientes FillRule
usan **`Literal` hex** (nunca `ThemeDataColor`, que pinta negro).

## 7. Anti-patrones (revisar antes de validar)

- Barras monocromas (una serie = un color): usar gradiente o color por categoría.
- Campos crudos en ejes/leyendas/cabeceras (`importe_venta`, `Count of ...`).
- Porcentajes como decimal (`0.53` en vez de `53%`): formato en la medida.
- Canvas y visuales ambos blancos sin borde: se pierden los contenedores (tema lo resuelve).
- Solapamientos o salida del lienzo; slicers tapados por otros visuales.
- Donut >5 categorías; línea con <3 puntos; eje de valor truncado (barras desde 0).
- Semaforizar todo: el color es un presupuesto de atención (1-2 focos por página).
- Tarjetas con varias medidas, o títulos que describen en vez de contar.
- Unidades mezcladas S/ y % en el mismo gráfico; **doble eje con la misma unidad** (el `Y2` del combo pone la línea en eje secundario y desalinea escalas: usar un solo eje).
- Fuentes distintas a Segoe UI; más de 3 tamaños de texto en un mismo bloque.

## 8. Design Brief (obligatorio antes de escribir visuales)

Emitirlo SIEMPRE (en el chat o en `docs/`), aprobarlo con el usuario si hay
ambigüedad, y adjuntarlo al proyecto:

```yaml
Design Brief:
  proyecto: <nombre>
  identidad: { tono: ejecutivo-IBCS, firma: "<patrón visual recurrente>" }
  canvas: { w: 1280, h: 720, margen: 15, gap: 5 }
  paginas:
    - nombre: <título con hallazgo>
      pregunta: <una frase>
      arquetipo: Executive | Analytical | Comparative
      layout: <plantilla §3 o variante>
      visuales:
        - id: c01
          tipo: card
          pregunta: <métrica>
          medida: Medidas[Venta Neta YTD]
          color: { rol: actual, hex: "#0C3549" }
          cf: semaforo-cumplimiento   # §6
        - id: d01
          tipo: lineClusteredColumnComboChart
          categoria: Calendario[MesAnio]
          y: [Medidas[Venta Neta]]
          y2: [Medidas[Presupuesto]]
      space_audit: { vacio_pct: <0-20>, hero: <región más grande y por qué> }
```

**Escape mínimo** para pedidos triviales: 3 líneas — página/pregunta, identidad,
un solo visual y su medida. Sin Brief no se escribe `visual.json`.

## 9. Verificación final

1. `node scripts/valida_pbip.js <raíz>` → 0 errores.
2. Con MCP de reportes (PBI cerrado): `pbir_validate_wireframe` (grid, márgenes,
   overlap) y `pbir_audit_theme_compliance` (overrides que pelean con el tema).
3. Regla del ciclo: abrir Desktop → refresh → revisar visualmente → `Ctrl+S`.
4. Si un ajuste visual se logra en la GUI, leer el diff del `visual.json` y
   llevarlo al generador (replicable), no dejarlo solo en el archivo.