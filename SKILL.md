---
name: powerbi-pbip-builder
description: Elabora reportes Power BI (PBIP) completos desde cero o existentes, con MCP en modelo vivo o solo con archivos TMDL+PBIR, incluyendo medidas DAX, relaciones, páginas ejecutivas y corrección de gráficos y etiquetas. Aplica guía de diseño elite (paleta IBCS, tipografía, grid, tema propio, formato condicional). Usar SIEMPRE que el usuario quiera crear un reporte, cargar CSV/Excel, auditar o reparar un modelo, rediseñar páginas, o cuando un .pbip dé errores al abrir, medidas en blanco/0, totales repetidos, YTD vacío o tarjetas truncadas.
metadata:
  version: 2.1.0
---

# Power BI PBIP Builder

Construye y repara proyectos Power BI **escribiendo archivos**, nunca automatizando la GUI. El usuario solo abre el `.pbip`, valida y guarda.

**Por qué archivos y no clics:** la GUI invalida capturas (cursores, repintados) y valida estrictamente los proyectos externos — escribir archivos es determinista, auditable y visible en diff. La automatización de escritorio quedó descartada.

## Modos: MCP vivo vs archivos (decidir antes de tocar)

| Tarea | Modo | Herramienta |
|---|---|---|
| Medidas, relaciones, tablas/columnas, particiones M, refresh, DAX Execute/Validate | PBI **abierto**, modelo en memoria | MCP `powerbi-modeling-mcp` |
| Layout, posiciones, títulos, slicers, etiquetas/displayUnits, temas, `report.json`, TMDL estructural, rutas M | PBI **cerrado**, archivos en disco | Editar `X.SemanticModel/definition/**` + `X.Report/definition/pages/**` vía `gen_*.js` / `plantilla_gen_pbip.js` |
| Diagnóstico (inventario, NoData, YTD blank, 398%, cobertura) | PBI abierto | MCP solo lectura + DAX |

**Regla del ciclo:** mientras Power BI tenga el proyecto abierto, NUNCA editar archivos en disco (un `Ctrl+S` los sobrescribe). Flujo: diagnosticar por MCP → pedir `Ctrl+S` y cerrar (con guardar si el modelo está sano, sin guardar si quedó experimental) → `Copy-Item X X_bak_YYYYMMDD -Recurse` → editar → validar hasta 0 → reabrir → refresh → `Ctrl+S`.

## Flujo A — Reporte nuevo desde CSV/Excel (sin MCP)

### Fase 0 — Conocer los datos (SIEMPRE antes de diseñar)
1. Ubicar archivos. Carpeta del usuario o buscar CSV/XLSX temáticos. Por archivo: `head -3`, conteo, delimitador/encoding (BOM → `Encoding = 65001`).
2. Clasificar hechos vs dimensiones. Anotar **grano** (ej. ppto = 1 fila por cliente+producto+mes).
3. Chequeos que evitan los errores caros:
   - Rango fechas por hecho vs calendario. Calendario debe terminar en el último hecho (396 filas con un mes extra de 2026 rompe `TOTALYTD` → tarjetas en blanco).
   - Cobertura FK y de ppto: % claves del hecho en dimensión; % combos venta con ppto (ej. 1,500/13,936 = 10.8% explica cumplimientos 29-42%).
   - Unicidad: clientes/productos únicos en ventas vs ppto (ej. 60 vs 37 productos; 23 sin ppto = 43% de unidades).
   - Nombres duplicados: agrupar SIEMPRE por `*_id`, nombre solo etiqueta (40 nombres cliente duplicados + mismatch Trebol 8M vs 124k).
   - Nulos, signos (ingresos negativos en contabilidad), unidades (descartar factor 1000 verificando `cant×precio=importe` en 45k filas).
4. **Regla de oro del presupuesto:** el ppto define qué se puede comparar. Sin `vendedor_id` en ppto NUNCA cortar ppto por vendedor (repite el total, cumpl 6-9% absurdo). 100% clientes multi-vendedor + 11.8% mismatch de zonas lo confirman. Usar `cuota_mensual` para vendedores + medidas blindadas.

### Fase 1 — Diseño y contrato visual (SIEMPRE, antes de escribir)
Leer `references/diseno-elite.md` y emitir el **Design Brief** (plantilla YAML en la guía: pregunta, arquetipo, layout con coordenadas, visuales con medida+color+formato condicional). Sin Brief no se escriben `visual.json`. Si hay ambigüedad de audiencia/alcance, consultar (AskUserQuestion) antes de generar. Con MCP de reportes disponible, complementar con `pbir_guide` (`report-design`, `wireframes`, `themes`).
- Estrella: hechos + dimensiones + `Calendario` del CSV (nunca tabla calculada DAX a mano).
- Medidas: base + guardas (ver Medidas patrón).
- Ruta `C:\Temp\<NombreSimple>` sin acentos/espacios/OneDrive.

### Fase 2 — Generar
Partir de `scripts/plantilla_gen_pbip.js` (scaffold + TMDL + tema + página elite ya correctos): editar CONFIG, tablas y página del caso, ejecutar. En proyectos existentes, seguir con su `gen_*.js`. Leer `references/estructura-pbip.md` + `references/tmdl-patrones.md`; visuales con helpers (`projColumn/projMeasure/visCard/visCombo/visBarrasZona/visTablaZonas/visMatriz` + `cfSemaforo/gradienteBarras/gradienteCeldas`), nunca JSON a mano — ver `references/pbir-visuales.md`. El tema `assets/tema-elite.json` se copia a `StaticResources/RegisteredResources/` y se registra en `report.json` (bloque exacto en estructura-pbip.md).

### Fase 3 — Validación (antes de abrir)
`node scripts/valida_pbip.js <raíz>` + `node valida_visuals.js` (si existe) hasta 0 errores. Cubre: JSON inválido o con BOM, `Property` fuera de `Column`/`Measure` (proyecciones y `sortDefinition`), tabs en TMDL, medidas/columnas duplicadas, `TransformColumnTypes` sin `"en-US"`, `calloutValue` en `card` clásica, `ComparisonKind`, visuales fuera del lienzo o solapados, páginas/tema registrados en disco.

### Fase 4 — Ciclo
Abrir → error → catálogo → corregir con PBI cerrado → reabrir → `Ctrl+S`.

## Flujo B — Modelo vivo con MCP (PBI abierto, solo lectura primero)

1. `connection_operations ListLocalInstances` → `Connect` al puerto (verificar título de ventana).
2. Inventario: `table_operations List`, `measure_operations List+Get` (todas), `relationship_operations List`, `partition_operations List/Get` (estados `Ready` vs `NoData`, código M).
3. Si todo `NoData` y DAX da vacío: es refresh pendiente tras cambios estructurales, no DAX roto. `model_operations Refresh Full` (timeout 30s = normal, corre en background; esperar 60-90s) y verificar `COUNTROWS` + medidas.
4. Ground truth con `TREATAS`: reproducir ppto por zona/tipo/cliente vía nativo vs `TREATAS`; si coinciden → relación OK; si ppto por vendedor = total en las 12 filas → corte prohibido confirmado.
5. Revisar: YTD total en blanco pero mensual OK → calendario con fechas futuras; cumpl unidades >200% → canasta no comparable; duplicadas, generaciones viejas (`FILTER(ALL)`, `IFERROR`, fechas hardcodeadas) vs nuevas (`VAR`, `DIVIDE`), `LocalDateTable_*`, tablas huérfanas/calculadas gigantes.
6. Correcciones seguras por MCP: crear relación faltante (100% match), corregir filtros, mover duplicadas a `ZZ_Deprecadas`. Lo visual/estructural se difiere a Flujo C. **Reportar + re-consultar alcance antes de escribir.**

Ver `references/auditoria-modelos.md`.

## Flujo C — Rediseño elite en disco (PBI cerrado)

1. Backup + editar TMDL: filtro calendario `Table.SelectRows(..., each [Date] <= #date(2025,12,31))`, nuevas medidas (comparables, blindadas, alerta, YTD), `sortByColumn` opcional.
2. Regenerar visuales con el generador del proyecto (sobrescribir mismos IDs; nuevos IDs de 20 chars; renombrar `page.json displayName`), aplicando la plantilla elite de `references/diseno-elite.md` y el tema propio (si el proyecto aún usa el tema base CY24SU10, migrarlo).
3. Validar (los 2 scripts), reabrir, refresh, `Ctrl+S`.

## Catálogo de errores

| Síntoma | Causa | Arreglo |
|---|---|---|
| `Required artifact is missing ... definition.pbir` (en SemanticModel) | Usa `definition.pbism` | Crear `{"version":"4.2","settings":{}}` |
| `Property adicional/no incluida en field` | `Property` fuera de `Column`/`Measure` | Mover adentro en proyecciones y `sortDefinition` |
| `No se encontró la columna 'X'` | CSV v2 vs TMDL/M viejo | Re-leer headers, actualizar M + `column` |
| Aridad M (`#datetime` exige 6) | Argumentos mal | Corregir + grep constructores |
| `Referencia cíclica` | Ruido en cascada de otro error M | Buscar `Expression.Error` real primero |
| `Relación usa Id. de columna no válido` | Columna inexistente (típico tabla DAX a mano) | M o corregir nombres; calendarios en M |
| `Cubo Campos contiene demasiadas columnas` | Tarjeta con varias medidas | Una medida por tarjeta |
| `Sin título` al guardar | OneDrive/acentos/ruta larga/refresh corriendo | `Ctrl+S` primero; `C:\Temp\...` simple |
| `needs to be recalculated` | Objeto sin procesar | Refresh `Calculate`/Full vía MCP, esperar 60-90s |
| Visuales en blanco tras editar con IA | Particiones `NoData` | `Refresh Full` vía MCP, verificar `COUNTROWS` |
| Tarjetas YTD `(En blanco)`, mensual OK | Calendario con fechas futuras (396 vs 365) | Filtrar calendario a último hecho + medidas YTD robustas |
| `Cumpl Unidades 398%` / tipos 1000-11000% | Ppto cubre subset sesgado a caros (37/60 prod) | Ocultar KPI, usar `Venta Real Comparable` / `Cumplimiento Comparable %`, narrar en montos |
| Ppto por vendedor = total repetido | Ppto sin `vendedor_id` | Prohibir corte; `Venta Ppto Ajustado` + `Cumplimiento Seguro %` con `ISFILTERED(Vendedores...)→BLANK()`; vendedores vs cuota |
| Tarjeta `758 mi...` truncada | `width` 215px + `#,0` de 9 dígitos | Ensanchar a ~293px y/o DisplayUnits a millones vía `visual.objects labels` |
| Cliente con Real pero Ppto vacío | Cliente sin ppto (ej. Logística Trebol, 1/297) | `Alerta Rezagado` (`Sin Ppto`/`Rezagado`/`En riesgo`/`OK`), no imputar 0 |
| Total inflado ×75-90 (`2424.15` → `242415`) | `TransformColumnTypes` sin cultura: parsea con `es-ES` (`.` = miles) | Pasar `"en-US"` al paso de tipos (CSV invariante con punto decimal) |
| `PFE_XL_USERELATIONSHIP_AMBIGUOUS_PATH` | Dos rutas activas dim→hecho (`Zonas` vía `Clientes` y vía `Vendedores`) | Dejar una sola ruta oficial; el atributo sobrante queda sin relación (validador: revisar `relationships.tmdl`) |
| `No se pueden combinar objetos TMDL ... misma propiedad: expression` | Medida definida dos veces (doble edición del generador) | Una única definición por medida; `valida_pbip.js` lo detecta |
| Color/label de KPI no aplica (valor negro) | `calloutValue` usado en tarjeta `card` (pertenece a `cardVisual`) | Usar `objects.labels` + `objects.categoryLabels`; semáforo con CF `background` |
| Filtro de mes con `ComparisonKind` opaco | Enum ambiguo de filtro avanzado | Filtro categórico con lista explícita de meses (`In`) o dos filtros sobre `Calendario[Date]` |
| Desktop queda en `Sin título` sin cargar modelo | Diálogo de inicio de sesión pendiente tras matar el proceso | Completar/cerrar el diálogo y reabrir; verificar carga por MCP (`ListLocalInstances` + `database_operations List`) |
| `Unexpected token '﻿'` / JSON no parsea | JSON guardado con BOM (PowerShell 5.1 `Set-Content -Encoding UTF8`) | Reescribir sin BOM con Node; validar antes de abrir |
| `propiedad 'show' adicional en /objects/background/0/properties` | `show` no existe en el fondo de **página** | Dejar solo `color` + `transparency` (el fondo de visuales sí admite `show`) |
| `propiedad 'filterConfig' adicional en /visual` | Filtro visual serializado dentro de `visual` | Mover `filterConfig` a la **raíz** del `visual.json`, junto a `visual` |

## Reglas duras de formato

- **TMDL:** solo tabuladores. `database.tmdl compatibilityLevel: 1606`. `model.tmdl`: `ref table` + `annotation __PBI_TimeIntelligenceEnabled = 0`.
- **Columnas:** `dataType` + `summarizeBy` + `sourceColumn` + `annotation SummarizationSetBy = Automatic`. IDs `isHidden`.
- **M CSV:** `Csv.Document(File.Contents("<ruta>"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv])` + `PromoteHeaders` + `TransformColumnTypes(..., "en-US")` (cultura explícita: sin ella `2424.15`→`242415`). `FechaPresup = #datetime([anio],[mes],1,0,0,0)` (6 args). Filtro año: `Table.SelectRows(..., each [Date] <= #date(2025,12,31))`.
- **Sin tablas calculadas DAX** a mano (`CALENDAR()` → Id. no válido); calendario en M renombrando `fecha→Date`, `anio_mes→MesAnio` (`YYYY-MM` ordena lexicográfico), recortado al último hecho.
- **Relaciones:** una sola ruta dimensión→hecho (evita `PFE_XL_USERELATIONSHIP_AMBIGUOUS_PATH`); `fromColumn` = muchos, `toColumn` = uno; una activa por par.
- **JSON del PBIP:** UTF-8 **sin BOM**; editar con Node (PowerShell 5.1 `Set-Content -Encoding UTF8` añade BOM y rompe el parseo estricto).
- **Unicidad TMDL:** cada medida y columna se define UNA sola vez (duplicados impiden abrir).
- **PBIR:** `$schema` visualContainer/2.12.0; `Property` dentro; roles `Values` (card/table/slicer) y `Category`+`Y`/`Y2` (line/column/bar/combo); título `Literal: {"Value": "'Mi título'"}`; lienzo 1280×720; fondo de página y tema propio registrados (ver estructura-pbip.md).
- **Etiquetas programáticas:** sí — `position` (x/y/w/h), `displayName`, `visualContainerObjects.title`, `visual.objects` (`labels`: show/displayUnits/decimales/fuente/color-por-medida; CF `Conditional Cases`; gradientes `FillRule`). Para replicar un ajuste GUI: leer el diff del `visual.json` y llevarlo al generador.

## Estilo y diseño (obligatorio: `references/diseno-elite.md`)

Toda decisión visual sale de la guía de diseño: paleta IBCS (canvas `#E9EEF3`, actual `#0C3549`, comparación `#8A9BA8`, semáforos `#44C088`/`#F2C14E`/`#ED7373`), tipografía Segoe UI, grid 1280×720 (márgenes 15/15/6, gaps 5, banner 52, borde inferior ≤714), cookbook por tipo de visual, catálogo de formato condicional, anti-patrones y **Design Brief** antes de escribir. El estilo global lo aplica `assets/tema-elite.json` (registrado en `report.json`); per-visual solo excepciones justificadas (título con hallazgo, CF, `displayName`, gradientes).

Plantilla elite 1280×720 (validada 0/0 con `pbir_validate_wireframe`): banner **shape** (0,0,1280,52) con el título dentro del shape · slicers y=57 h=60 (nunca menos: el dropdown se desborda) · KPIs y=122 h=90 (4×308/311) · héroes y=217 h=245 (622+623) · detalle y=467 h=247 · borde inferior ≤714. Un textbox en (0,0) NO cuenta como banner. Una medida por tarjeta. `#,0` montos, `0.0%` %, `+#,0;-#,0` desviación. **Títulos de hallazgo dinámicos por medida** (se actualizan solos; ver pbir-visuales.md); orden cronológico en tiempo y DESC en rankings. Donut solo ≤5 categorías; barras H para rankings.
- **P1 Resumen ¿Vamos a cumplir?** KPIs Real/Ppto/Cumpl/Desv · combo Real vs Ppto por `MesAnio` + columna Cumpl% por mes · tabla brecha por zona. Título: `La brecha se abre desde Ago: -694M, 86.4%`.
- **P2 Rentabilidad ¿A qué costo?** KPIs Utilidad + Margen · margen Real vs Ppto + barras por tipo · tabla por tipo con utilidad/margen.
- **P3 Foco ¿Dónde actuar?** KPIs YTD quartet (Real/Ppto/Cumpl/Desv YTD, nunca unidades sueltas) · mix + Cumpl% por zona + línea YTD · tabla control por cliente con `Alerta Rezagado`, rezagados primero. Slicers solo por el grano del ppto (vendedor nunca como slicer global si el ppto no lo tiene).

## Medidas patrón Real vs Ppto

```tmdl
measure 'Venta Real' = SUM(Ventas[importe_venta])  -- #,0
measure 'Venta Ppto' = SUM(Presupuesto[monto_presup])  -- #,0
measure 'Cumplimiento %' = DIVIDE([Venta Real], [Venta Ppto])  -- 0.0%
measure 'Desviación' = [Venta Real] - [Venta Ppto]  -- #,0
measure 'Venta Real YTD' = TOTALYTD([Venta Real], Calendario[Date])  -- funciona si calendario recortado
measure 'Venta Ppto Ajustado' = IF(ISFILTERED(Vendedores[nombre_vendedor]) || ISFILTERED(Vendedores[vendedor_id]), BLANK(), [Venta Ppto])
measure 'Cumplimiento Seguro %' = IF(ISFILTERED(Vendedores[nombre_vendedor]) || ISFILTERED(Vendedores[vendedor_id]), BLANK(), DIVIDE([Venta Real], [Venta Ppto]))
measure 'Venta Real Comparable' = CALCULATE([Venta Real], FILTER(VALUES(Productos[producto_id]), CALCULATE(COUNTROWS(Presupuesto)) > 0))
measure 'Cumplimiento Comparable %' = DIVIDE([Venta Real Comparable], [Venta Ppto])
measure 'Desviación YTD' = [Venta Real YTD] - [Venta Ppto YTD]
measure 'Ticket Promedio' = DIVIDE([Venta Real], COUNTROWS(Ventas))
measure 'Alerta Rezagado' = VAR _C = [Cumplimiento %] RETURN IF(NOT ISBLANK([Venta Real]) && ISBLANK([Venta Ppto]), "Sin Ppto", IF(NOT ISBLANK(_C) && _C < 0.8, "Rezagado", IF(NOT ISBLANK(_C) && _C < 1, "En riesgo", IF(_C >= 1, "OK", BLANK()))))
```
Siempre `DIVIDE`, formato en la medida, español sin caracteres raros. YTD total debe probarse sin filtros (`ROW([Venta Real YTD])` ≠ blank).

## Al terminar

`Ctrl+S`; PBIX original intacto; PBIP es el activo para publicar. Con el MCP de reportes: `pbir_validate_wireframe` + `pbir_audit_theme_compliance` (detecta overrides que pelean con el tema) y revisión visual de la página antes de aceptar. Si se editó config del skill/agente, pedir reiniciar opencode.

## Implementación

- `references/estructura-pbip.md` — árbol + metadata exacta (incluye registro de tema propio y fondo de página).
- `references/tmdl-patrones.md` — TMDL/M/relaciones (cultura `"en-US"`, rutas únicas, calendario recortado, unicidad).
- `references/pbir-visuales.md` — visual.json, tarjeta KPI, condicional (semáforo/gradientes) + generador.
- `references/diseno-elite.md` — **guía de diseño ejecutable** + Design Brief. Leer antes de generar visuales.
- `references/auditoria-modelos.md` — checklist MCP + TREATAS.
- `assets/tema-elite.json` — tema propio IBCS (copiar a `RegisteredResources/` y registrar en `report.json`).
- `scripts/plantilla_gen_pbip.js` — generador de scaffold + TMDL + página elite con tema y datos demo (punto de partida).
- `scripts/valida_pbip.js` — JSON/BOM, `Property`, tabs, duplicados TMDL, cultura M, `calloutValue`, `ComparisonKind`, layout (fuera de lienzo/solapes/alturas), páginas y tema. `valida_visuals.js` del proyecto si existe.
- `docs/APRENDIZAJES.md` — catálogo consolidado síntoma→causa→regla (mantener al día).
- `CHANGELOG.md` + `README.md` — versionado del skill (fuente de verdad del repo git).
