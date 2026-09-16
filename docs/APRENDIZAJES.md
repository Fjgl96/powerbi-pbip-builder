# Aprendizajes — powerbi-pbip-builder

Catálogo consolidado de **síntoma → causa → regla**, extraído de las sesiones
reales (Andes Bebidas y Cordillera Alimentos) y de la investigación de diseño
(8 agentes, fuentes citadas en `references/diseno-elite.md`).

---

## 1. Modelo (TMDL / M / DAX)

| Síntoma | Causa | Regla |
|---|---|---|
| Total inflado ×75-90 (`2424.15` → `242415`) | `Table.TransformColumnTypes` sin cultura: el CSV invariante (punto decimal) se parsea con `es-ES` (`.`=miles) | Pasar `"en-US"` explícito al paso de tipos. El modelo puede seguir en `es-ES` |
| `No se pueden combinar objetos TMDL ... misma propiedad: expression` | Medida definida 2 veces (doble edición) | Una definición por medida; `valida_pbip.js` lo detecta |
| `PFE_XL_USERELATIONSHIP_AMBIGUOUS_PATH` | Dos rutas activas dimensión→hecho (`Zonas` vía `Clientes` y vía `Vendedores`) | Una sola ruta oficial; el atributo sobrante queda sin relación |
| `The 'X' column does not exist in the rowset` (refresh MCP/XMLA) | El M no renombra `mes_nombre→nombre_mes` y el TMDL declara `sourceColumn: nombre_mes`. Desktop a veces lo tolera por posición, el refresh estricto no | Todo nombre del CSV debe coincidir con `sourceColumn`; renombrar en M (`fecha→Date`, `anio_mes→MesAnio`, `mes_nombre→nombre_mes`) |
| Refresh procesa el modelo "a medias" y falla la transacción al abrir | Refresh Full disparado durante la carga inicial de Desktop (concurrencia) | Esperar 60-90 s a que Desktop termine; recién entonces refrescar por MCP |
| Variables DAX colisionan (`_cm` y `_cM`) | DAX es **case-insensitive** para variables | Nombres únicos reales (`_cumMin`, `_cumMax`) |
| Separadores `8,0%` vs `8.0%` entre títulos y visuales | `FORMAT` usa la cultura del modelo | `FORMAT(x, fmt, "en-US")` en medidas de texto (coincide con formato peruano) |
| YTD total en blanco con mensual OK | Calendario con fechas futuras respecto al último hecho | `Table.SelectRows(..., each [fecha] <= #date(AAAA,M,D))` al último hecho |
| Cumplimiento por categoría = venta categoría ÷ meta total | `Presupuesto[categoria]` sin dimensión compartida | Dimensión `Categorias` relacionada a `Productos` y a `Presupuesto`; el corte queda comparable |
| Cumplimientos >200% / 6-9% absurdos | Ppto de grano distinto (subset sesgado / sin vendedor) | Regla de oro: el ppto define qué se puede comparar; vendedores contra cuota, medir "comparable" si el grano difiere |

---

## 2. Esquema PBIR (validación estricta al abrir)

| Síntoma | Causa | Regla |
|---|---|---|
| `Required artifact is missing ... definition.pbir` (en SemanticModel) | Se declaró `definition.pbir` | El modelo usa `definition.pbism` (`{"version":"4.2","settings":{}}`) |
| `Property adicional/no incluida en field` | `Property` fuera de `Column`/`Measure` | Va **dentro**, también en `sortDefinition` |
| `propiedad 'show' adicional en /objects/background/0/properties` (page.json) | `show` no existe en el fondo de **página** | Solo `color` + `transparency` (el fondo de visuales sí admite `show`) |
| `propiedad 'filterConfig' adicional en /visual` | Filtro visual dentro de `visual` | `filterConfig` en la **raíz** del `visual.json`, junto a `visual`. `pbir_list_filters` lo confirma |
| `Unexpected token '﻿'` / JSON no parsea | BOM inyectado (PowerShell `Set-Content -Encoding UTF8`) | JSON en UTF-8 **sin BOM**; editar con Node |
| Banner no reconocido / falla de márgenes | `textbox` en (0,0,1280,52) | El banner es un **shape** rectangle (x0,y0,1280,52) con el título en `objects.text` |
| `COLUMN_MISALIGN` en wireframe | Filas contiguas con el mismo número de visuales y grillas distintas | Compartir grilla o usar conteos distintos; validador 0/0 en el layout canónico |
| Dropdown de slicer desbordado / tapa la fila siguiente | Slicer con h=44 (mínimo técnico) | Slicer h≥60 (estándar de casa); validador: error <44, aviso <60 |
| Última fila de tabla/matriz recortada | `rowPadding` alto + altura insuficiente | `rowPadding 4`; tabla/matriz ≥240 px de alto (aviso del validador) |
| Tooltip no aparece | Falta binding o la página no está registrada | Página `type: Tooltip` (320×240, `HiddenInViewMode`) en `pageOrder` + `visualContainerObjects.visualTooltip` (`type 'ReportPage'`, `section = name` de la página) |

---

## 3. Visuales y formato condicional

| Tema | Regla verificada |
|---|---|
| Tarjeta clásica `card` | No tiene `calloutValue` (es de `cardVisual`). Usar `objects.labels`/`categoryLabels`. **Mejor: migrar a `cardVisual`** |
| `cardVisual` moderno | Bucket de datos se llama **`Data`**; `accentBar`/`label`/`value` con `selector.id: 'default'`; `referenceLabel` con `selector.data[matchingOption 0] + metadata:<queryRef del campo principal> + id field-<uuid> + order` (forma verificada contra PBIP real) |
| Fondo semáforo de tarjeta | `visualContainerObjects.background` con `Conditional Cases` + `Default` (capturado de Desktop; funciona) |
| Cubetas/reglas en celdas | `values.backColor`/`fontColor` con `Conditional.Cases` + **`DefaultValue`**; selector `data[matchingOption 1]` **y** `metadata` (ambos obligatorios) |
| Iconos de estado | `values.icon` (`kind:"Icon"`) con `Conditional`; solo nombres del catálogo (`TrafficHigh/Medium/Low`, `Symbol*`, `Circle*`…): nombre inválido cierra Desktop |
| Data bars | `columnFormatting.dataBars` con selector **solo `metadata`** (con `dataViewWildcard` desaparecen); tinte claro para no pelear con el texto |
| Gradiente en celdas/barras | `FillRule` (2/3 stops) con hex **`Literal`** y sin `expr` dentro de los stops; `linearGradient3` siempre con `min`+`mid`+`max` |
| Filtro de tiempo | Categórico `In` con lista explícita (nunca `ComparisonKind` opaco). Helper `filtroCategorico()` |
| Título con hallazgo | **Dinámico por medida** (`text.expr.Measure`) con fallback `ISBLANK`; se actualiza con datos y filtros. El banner (shape) queda estático |
| Color de datos | Vivos (`#44C088/#F2C14E/#ED7373`) para **rellenos amplios**; oscuros (`#0F7B4F/#B7791F/#C0392B`) para **trazos finos y texto** (WCAG 1.4.11); comparación `#6B7C8C`; texto atenuado `#5A6B7B` |
| Semáforo y daltonismo | El color solo no alcanza: sumar redundancia no cromática (iconos, signos, texto de estado) |
| Headers de visual | Ocultos por defecto en el tema (`visualHeader.show=false`) — limpieza visual estándar |

---

## 4. Proceso de trabajo (ciclo IA + Desktop)

1. **Nunca editar archivos con Desktop abierto** (un `Ctrl+S` los sobrescribe).
   Ciclo: diagnosticar → cerrar (sin guardar si no hay cambios) → backup →
   editar/generar → validar → reabrir → refresh → verificar.
2. **Validadores antes de abrir**: `valida_pbip.js` (estructura) y, con MCP de
   reportes, `pbir_validate_wireframe` + `pbir_audit_theme_compliance`.
3. **Verificación visual automatizable**: capturar la ventana de Desktop con
   `PrintWindow` (sin depender del foco) y leer la imagen; el modelo vivo por MCP
   confirma números (`COUNTROWS`, medidas) contra `validacion.txt`.
4. **Regla del diff**: todo ajuste que se haga en la GUI se lee del `visual.json`
   y se lleva al generador; nada queda solo en el archivo.
5. **Empaquetado de cada lección**: síntoma → causa → regla en este documento,
   y al catálogo de `SKILL.md` si el agente puede aplicarla solo.

---

## 5. Diseño (destilado de la investigación)

- Una página = una pregunta; el banner lleva el titular y los títulos de visual
  **agregan información nueva** (no repiten el banner).
- Grid canónico validado 0/0: banner 0-52 · slicers 57/60 · KPIs 122/90 ·
  héroes 217/245 · detalle 467/247 · borde ≤714.
- Contraste WCAG: aceptar solo pares ≥4.5:1 en texto y ≥3:1 en gráficos
  (tabla de ratios en `references/diseno-elite.md`).
- Máximo 1-2 focos semáforo por página; el color es presupuesto de atención.
- Tooltip de detalle (320×240) para el drill-in sin ensuciar la página ejecutiva.
- Benchmarks de referencia: Microsoft Power BI Showcase, Zebra BI (IBCS),
  SQLBI (3-30-300, bullets), storytellingwithdata (action titles), NN/g (jerarquía).