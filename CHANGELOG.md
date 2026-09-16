# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) · Versionado semántico.

## [2.1.0] — 2026-09-15

Iteración "Cordillera" (rediseño elite + lecciones de esquema estricto).

### Agregado
- **Títulos dinámicos por medida** (`text.expr.Measure` + medidas DAX con fallback
  `ISBLANK` y locale `"en-US"` para separadores consistentes).
- **Página de tooltip** (`page type=Tooltip` 320×240 + `visualTooltip` en el visual;
  patrón documentado en `references/pbir-visuales.md` y usado en el ranking).
- **Tarjetas `cardVisual` con `accentBar` y `referenceLabel`** (delta vs meta dentro
  de la tarjeta; forma verificada contra un PBIP real).
- **Formas CF verificadas**: cubetas con `Conditional`+`DefaultValue`, iconos
  (`values.icon`, catálogo Traffic*), data bars (`columnFormatting`, selector solo
  `metadata`), color de fuente por signo.
- **Paleta accesible**: trío oscuro para trazos `#0F7B4F`/`#B7791F`/`#C0392B`,
  comparación `#6B7C8C`, texto atenuado unificado en `#5A6B7B` (ratios WCAG en la guía).
- **Reglas de validador**: altura de slicer (error <44, aviso <60), tabla/matriz
  (<240 aviso), altura y solapes ya existentes.
- `README.md`, `CHANGELOG.md`, `docs/APRENDIZAJES.md` y `.gitignore` (repo versionable).

### Cambiado
- **Layout canónico** a slicers h=60 y filas re-balanceadas (fix del dropdown que
  se desbordaba y tapaba la fila siguiente): banner 0-52 · slicers 57/60 ·
  KPIs 122/90 · héroes 217/245 · detalle 467/247.
- `visualHeader` oculto por defecto en el tema (limpieza visual).
- Plantilla: mismas constantes de layout, `nombre_mes` renombrado en M (fix del
  refresh MCP), helpers CF nuevos.

### Corregido
- **`filterConfig` va en la RAÍZ del `visual.json`** (no dentro de `visual`) y
  `objects.background` de página **no admite `show`** — ambos causaban
  "propiedad adicional" al abrir. Validados y documentados.
- Renombre `mes_nombre → nombre_mes` obligatorio si el TMDL declara
  `sourceColumn: nombre_mes` (error de refresh: *column does not exist in the rowset*).
- Variables DAX son case-insensitive (`_cm` vs `_cM` colisionan) — regla en aprendizajes.
- `rowPadding` 6 recortaba filas de tabla/matriz; queda en 4 con las alturas canónicas.

## [2.0.0] — 2026-09-14

Primer empaquetado del skill (post-Andes Bebidas).

### Agregado
- `SKILL.md` v2: flujos A (reporte nuevo desde CSV), B (modelo vivo MCP) y C
  (rediseño en disco), catálogo de errores, reglas duras, medidas patrón.
- `references/estructura-pbip.md` (árbol + metadata, registro de tema propio
  verificado contra Desktop/MCP), `tmdl-patrones.md`, `pbir-visuales.md`
  (condicional, tarjeta clásica), `diseno-elite.md` (guía ejecutable) y
  `auditoria-modelos.md`.
- `assets/tema-elite.json` (tema IBCS), `scripts/plantilla_gen_pbip.js`
  (generador + demo autocontenido), `scripts/valida_pbip.js` v2 (BOM, duplicados
  TMDL, cultura, calloutValue, layout, tema).
- Catálogo: cultura `en-US` en `TransformColumnTypes`, rutas ambiguas
  (`PFE_XL_USERELATIONSHIP_AMBIGUOUS_PATH`), medida duplicada, `calloutValue` en
  `card`, `ComparisonKind` en filtros, BOM en JSON.