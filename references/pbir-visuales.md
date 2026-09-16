# Patrones PBIR (visual.json)

Esquema: `https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.12.0/schema.json`

## Regla #1 que rompe la carga

`Property` va **DENTRO** del objeto `Column`/`Measure`, nunca al nivel de `field`:

```json
✅ CORRECTO
"field": {
  "Measure": {
    "Expression": { "SourceRef": { "Entity": "Medidas" } },
    "Property": "Venta Real"
  }
}

❌ INVALIDO (aunque proyectos guardados por Desktop lo usen, uno externo pasa validación estricta)
"field": {
  "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } } },
  "Property": "Venta Real"
}
```

Esto aplica a TODAS las proyecciones Y a todos los `sortDefinition`.

## Tema y estilo: reparto correcto

El estilo global (fondo de página `#E9EEF3`, contenedores blancos con borde
`#E2E8EF`, tipografía, ejes, banding de tablas) lo aporta
`assets/tema-elite.json` registrado en `report.json` — ver
`references/estructura-pbip.md`. **Per-visual solo excepciones**:

| Se escribe per-visual | Viene del tema |
|---|---|
| `visualContainerObjects.title` (título con hallazgo) | Bordes, radius, sombras, paddings |
| `objects.labels`/`categoryLabels` en tarjetas KPI | Estilo de ejes y gridlines |
| `visualContainerObjects.background` con CF semáforo | Banding de tabla/matriz, growToFit |
| `objects.dataPoint.fill` con gradiente (barras) | Etiquetas encendidas en barras/columnas |
| `objects.values.backColor` con CF gradiente (matriz/tabla) | Estilo de línea suavizada + área |
| `displayName` humano en proyecciones | Estilo de slicer (header/items) |
| `sortDefinition` | Padding 0 de textbox |

Demasiados overrides = el tema deja de mandar (`pbir_audit_theme_compliance` los
lista). Si un ajuste se hace en la GUI, leer el diff del `visual.json` y llevarlo
al generador (replicable), nunca dejarlo solo en el archivo.

## Estructura base

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.12.0/schema.json",
  "name": "<id20hex>",
  "position": { "x": 25, "y": 15, "z": 0, "height": 95, "width": 293, "tabOrder": 0 },
  "visual": {
    "visualType": "card",
    "query": { "queryState": { "Values": { "projections": [ ... ] } } },
    "visualContainerObjects": { "title": [ { "properties": { "show": { "expr": { "Literal": { "Value": "false" } } } } } ] },
    "drillFilterOtherVisuals": true
  }
}
```

## Proyecciones por rol

| visualType | Roles | Proyecciones |
|---|---|---|
| `card` | `Values` | UNA medida por tarjeta (varias medidas = error "cubo Campos contiene demasiadas columnas") |
| `lineChart` | `Category` + `Y` | Category: columna de mes (`active: true`); Y: 2+ medidas |
| `columnChart` | `Category` + `Y` | Igual; sort por medida Descending para rankings |
| `tableEx` | `Values` | Columnas y medidas en orden |
| `slicer` | `Values` | + `objects.data[0].properties.mode = "'Dropdown'"` |

Proyección de medida (con nombre bonito):
```json
{
  "field": {
    "Measure": {
      "Expression": { "SourceRef": { "Entity": "Medidas" } },
      "Property": "Venta Real"
    }
  },
  "queryRef": "Medidas.Venta Real",
  "nativeQueryRef": "Venta Real",
  "displayName": "Venta Real (S/)"
}
```

Proyección de columna:
```json
{
  "field": {
    "Column": {
      "Expression": { "SourceRef": { "Entity": "Calendario" } },
      "Property": "MesAnio"
    }
  },
  "queryRef": "Calendario.MesAnio",
  "nativeQueryRef": "MesAnio",
  "active": true
}
```

## Ordenamiento (sortDefinition)

```json
"sortDefinition": {
  "sort": [
    {
      "field": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Venta Real" } },
      "direction": "Descending"
    }
  ]
}
```

## Título del visual

```json
"visualContainerObjects": {
  "title": [{ "properties": {
    "show": { "expr": { "Literal": { "Value": "true" } } },
    "text": { "expr": { "Literal": { "Value": "'Real vs Presupuesto por mes (S/) - 2025'" } } }
  } }]
}
```
Nota el formato del texto: **entre comillas simples dentro de las dobles**.

**Título dinámico (recomendado para hallazgos)**: el texto es una medida de texto;
se recalcula con los datos y respeta los filtros. La medida debe manejar el vacío
(`IF(ISBLANK(...), "Texto neutro", ...)`) y fijar el locale del formateo para que
los separadores coincidan con los visuales (ej. `FORMAT(valor, "#,0", "en-US")`):

```json
"visualContainerObjects": {
  "title": [{ "properties": {
    "show": { "expr": { "Literal": { "Value": "true" } } },
    "text": { "expr": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Título Combo" } } }
  } }]
}
```

## Tarjeta KPI clásica (`card`)

Una medida por tarjeta. El estilo del valor va en `objects.labels`, la etiqueta en
`objects.categoryLabels`. ⚠️ `calloutValue` **no existe en `card`** (es de
`cardVisual`): si se usa, el color y las etiquetas no aplican.

```json
"objects": {
  "labels": [{ "properties": {
    "fontSize": { "expr": { "Literal": { "Value": "22D" } } },
    "labelDisplayUnits": { "expr": { "Literal": { "Value": "1D" } } },
    "color": { "solid": { "color": { "expr": { "Measure": {
      "Expression": { "SourceRef": { "Entity": "Medidas" } },
      "Property": "KPI Cumplimiento YTD Color" } } } } }
  } }],
  "categoryLabels": [{ "properties": {
    "show": { "expr": { "Literal": { "Value": "true" } } },
    "fontSize": { "expr": { "Literal": { "Value": "10D" } } },
    "color": { "solid": { "color": { "expr": { "Literal": { "Value": "'#5A6B7B'" } } } } }
  } }]
}
```

- `labelDisplayUnits`: `0D` unidades, `1D` miles, `2D` millones, `3D` miles de millones (concordar con el `formatString` de la medida).
- `KPI ... Color`: medida DAX que devuelve hex según umbral (`IF([Cumplimiento %] >= 0.98, "#44C088", ...)`).
- Ancho mínimo 293 px para un `#,0` de 9 dígitos (a 215 px se trunca `758 mi...`).

## Formato condicional (semáforo y gradientes)

### Fondo semáforo de tarjeta (reglas)

`visualContainerObjects.background` del propio visual. Notas: `ComparisonKind: 2`
= `>=`; los umbrales van en `Literal` numérico con sufijo `D`; el default cubre
el caso rojo.

```json
"visualContainerObjects": {
  "background": [{ "properties": {
    "show": { "expr": { "Literal": { "Value": "true" } } },
    "color": { "solid": { "color": { "expr": { "Conditional": {
      "Cases": [
        { "Condition": { "Comparison": { "ComparisonKind": 2,
            "Left": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Cumplimiento YTD %" } },
            "Right": { "Literal": { "Value": "0.98D" } } } },
          "Value": { "Literal": { "Value": "'#E3F5EB'" } } },
        { "Condition": { "Comparison": { "ComparisonKind": 2,
            "Left": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Cumplimiento YTD %" } },
            "Right": { "Literal": { "Value": "0.9D" } } } },
          "Value": { "Literal": { "Value": "'#FCF1DC'" } } }
      ],
      "Default": { "Literal": { "Value": "'#FBE5E5'" } }
    } } } } }
  } }]
}
```

### Gradiente de celdas (matriz/tabla) — `FillRule linearGradient3`

Va en `objects.values[0]` con selector `dataViewWildcard.matchingOption 1` y
`metadata` con la medida. Colores **`Literal` hex** (con `ThemeDataColor` dentro
de `FillRule` el relleno sale negro).

```json
"objects": {
  "values": [{
    "properties": {
      "backColor": { "solid": { "color": { "expr": { "FillRule": {
        "Input": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Cumplimiento %" } },
        "FillRule": { "linearGradient3": {
          "min": { "color": { "Literal": { "Value": "'#ED7373'" } } },
          "mid": { "color": { "Literal": { "Value": "'#F2C14E'" } } },
          "max": { "color": { "Literal": { "Value": "'#44C088'" } } },
          "nullColoringStrategy": { "strategy": { "Literal": { "Value": "'asZero'" } } }
        } } } } } } }
    },
    "selector": { "data": [{ "dataViewWildcard": { "matchingOption": 1 } }], "metadata": "Medidas.Cumplimiento %" }
  }]
}
```

### Gradiente de barras — `dataPoint.fill linearGradient2`

Barras monocromas es el anti-patrón #2: un solo color porque PBI asigna por
serie, no por categoría. Gradiente tin→base del color de la medida, con selector
`dataViewWildcard.matchingOption 0`:

```json
"objects": {
  "dataPoint": [{
    "properties": {
      "fill": { "solid": { "color": { "expr": { "FillRule": {
        "Input": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Venta Neta" } },
        "FillRule": { "linearGradient2": {
          "min": { "color": { "Literal": { "Value": "'#8FA6B8'" } } },
          "max": { "color": { "Literal": { "Value": "'#0C3549'" } } } } }
      } } } } }
    },
    "selector": { "data": [{ "dataViewWildcard": { "matchingOption": 0 } }] }
  }]
}
```

### Cubetas y reglas en celdas — `values` + `Conditional`

`backColor`/`fontColor` se resuelven con `Conditional.Cases` (el operador es
`Comparison`; `ComparisonKind`: 0 `=`, 1 `>`, 2 `>=`, 3 `<`, 4 `<=`) y el fallback
se llama **`DefaultValue`** (no `Default`). Selector de celdas: `data:
[{ dataViewWildcard: { matchingOption: 1 } }]` **y** `metadata` (ambos
obligatorios; en charts la CF va en `dataPoint` y NO se incluye `metadata`).
Ejemplo de cubetas de cumplimiento:

```json
"values": [{
  "properties": { "backColor": { "solid": { "color": { "expr": { "Conditional": {
    "Cases": [
      { "Condition": { "Comparison": { "ComparisonKind": 3,
          "Left": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Cumplimiento %" } },
          "Right": { "Literal": { "Value": "0.9D" } } } },
        "Value": { "Literal": { "Value": "'#FBE5E5'" } } },
      { "Condition": { "Comparison": { "ComparisonKind": 3,
          "Left": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Cumplimiento %" } },
          "Right": { "Literal": { "Value": "0.98D" } } } },
        "Value": { "Literal": { "Value": "'#FCF1DC'" } } },
      { "Condition": { "Comparison": { "ComparisonKind": 2,
          "Left": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Cumplimiento %" } },
          "Right": { "Literal": { "Value": "0.98D" } } } },
        "Value": { "Literal": { "Value": "'#E3F5EB'" } } }
    ],
    "DefaultValue": { "Literal": { "Value": "'#FFFFFF'" } }
  } } } } } },
  "selector": { "data": [{ "dataViewWildcard": { "matchingOption": 1 } }], "metadata": "Medidas.Cumplimiento %" }
}]
```

### Iconos de estado — `values.icon`

```json
"icon": {
  "kind": "Icon",
  "layout": { "expr": { "Literal": { "Value": "'Before'" } } },
  "verticalAlignment": { "expr": { "Literal": { "Value": "'Middle'" } } },
  "value": { "expr": { "Conditional": {
    "Cases": [{ "Condition": { "Comparison": { "ComparisonKind": 2, "Left": { "Measure": { "Expression": { "SourceRef": { "Entity": "Medidas" } }, "Property": "Cumplimiento %" } }, "Right": { "Literal": { "Value": "0.98D" } } } },
      "Value": { "Literal": { "Value": "'TrafficHigh'" } } }],
    "DefaultValue": { "Literal": { "Value": "'TrafficLow'" } }
  } } }
}
```
Solo nombres del catálogo (TrafficHigh/Medium/Low, Symbol*, Circle*, Flag*…):
un nombre inválido cierra Desktop.

### Data bars — `columnFormatting.dataBars`

Van en `objects.columnFormatting` (NO en `values`) con selector **solo**
`metadata` (con `dataViewWildcard` las barras desaparecen). Props:
`positiveColor`, `negativeColor`, `axisColor`, `reverseDirection`, `hideText`
(colores con `expr` normal). Usar tinte claro para no pelear con el texto.

Helpers en los generadores: `cfSemaforo()` (fondo de tarjeta), `cfCubetas()`,
`cfIconos()`, `cfFontSigno()` y `dataBars()` — emiten estas estructuras tal cual.

## Textbox (banner y notas)

`paragraphs` es array nativo (nunca stringificado). Formato del banner: título
13 pt `#0C3549` + subtítulo 8.5 pt `#5A6B7B`. Altura anti-scrollbar:
`h ≥ max(18, ⌈pt × 25/16⌉) + padding` (13 pt → ≥ 22 px; con padding 8/8 → ≥ 38 px;
el textbox del tema tiene padding 0). Fuente: `objects.general[0].properties.paragraphs`.

## Referencias de color y utilidades

- Semáforo KPI Cumplimiento: ≥98 % `#E3F5EB` · ≥90 % `#FCF1DC` · resto `#FBE5E5`.
- Semáforo KPI Margen: ≥18 % verde · ≥12 % ámbar · resto rojo (mismos fondos).
- Gradiente celdas: min `#ED7373` → mid `#F2C14E` → max `#44C088`.

## Filtro categórico verificado (ventana de meses)

Para ventanas de tiempo usar filtro categórico `In` con la lista explícita
(nunca `ComparisonKind`, cuyo enum es ambiguo). Sintaxis verificada contra
Desktop/MCP: va en `filterConfig` en la **RAÍZ del `visual.json`** (junto a
`visual`, NO dentro de él; en página va en `page.json`). Un `filterConfig`
dentro de `visual` rompe el esquema estricto: *"propiedad 'filterConfig'
adicional en /visual"*. El `$schema` sigue siendo visualContainer/2.12.0.

```json
"filterConfig": {
  "filters": [{
    "name": "<id20hex>",
    "field": { "Column": { "Expression": { "SourceRef": { "Entity": "Calendario" } }, "Property": "MesAnio" } },
    "type": "Categorical",
    "filter": {
      "From": [{ "Name": "c", "Entity": "Calendario", "Type": 0 }],
      "Where": [{ "Condition": { "In": {
        "Expressions": [{ "Column": { "Expression": { "SourceRef": { "Source": "c" } }, "Property": "MesAnio" } }],
        "Values": [[{ "Literal": { "Value": "'2025-07'" } }], [{ "Literal": { "Value": "'2025-08'" } }]]
      } } }]
    }
  }]
}
```
Helper `filtroCategorico(entity, column, valores)` en `plantilla_gen_pbip.js` y
en los generadores de proyecto. También aquí el `Property` va DENTRO de `Column`.

## Técnica recomendada: script generador

No escribir los 15 visual.json a mano. Crear `gen_visuals.js` con funciones (`projColumn`, `projMeasure`, `card`, `slicer`, `lineChart`, `columnChart`, `table`) y una lista de jobs `[pageId, visualId, json]`, ejecutar con `node` y validar. Beneficios: un solo lugar donde corregir el formato (cuando el validador exigió `Property` adentro, fue cambiar 2 funciones), regeneración idempotente, y cero errores de coma.

Layout canónico (coords exactas y validación en `diseno-elite.md` §3):
- Banner shape (0,0,1280,52) con título en `objects.text`.
- Slicers y=57 h=44 · KPIs y=106 h=90 · héroes y=201 h=260 · detalle y=466 h=248 · borde ≤714.

## Banner (shape con texto)

El validador del wireframe solo reconoce como banner un **shape** en
(0,0,1280,52); con textbox falla márgenes. Serialización verificada:

```json
"objects": {
  "shape": [{ "properties": { "tileShape": { "expr": { "Literal": { "Value": "'rectangle'" } } } } }],
  "rotation": [{ "properties": { "shapeAngle": { "expr": { "Literal": { "Value": "0L" } } } } }],
  "fill": [{ "properties": { "fillColor": { "solid": { "color": { "expr": { "Literal": { "Value": "'#FFFFFF'" } } } } } } }, "selector": { "id": "default" } }],
  "outline": [{ "properties": { "show": { "expr": { "Literal": { "Value": "false" } } } } }],
  "text": [
    { "properties": { "show": { "expr": { "Literal": { "Value": "true" } } } } },
    { "properties": {
        "text": { "expr": { "Literal": { "Value": "'Mi título con hallazgo'" } } },
        "fontColor": { "solid": { "color": { "expr": { "Literal": { "Value": "'#0C3549'" } } } } },
        "verticalAlignment": { "expr": { "Literal": { "Value": "'middle'" } } },
        "bold": { "expr": { "Literal": { "Value": "true" } } },
        "fontSize": { "expr": { "Literal": { "Value": "17D" } } }
      },
      "selector": { "id": "default" } }
  ]
}
```

En textbox (no banner) la negrita se expresa `"fontWeight": "bold"` dentro de
`textStyle`; en los ítems de shape, `"bold": { "expr": { "Literal": { "Value": "true" } } }`.

## Validación antes de abrir

Ejecutar `scripts/valida_pbip.js <raíz>`. Detecta: JSON inválido o con BOM,
`Property` fuera de `Column`/`Measure` (proyecciones y `sortDefinition`),
indentación con espacios en TMDL, medidas TMDL duplicadas, `TransformColumnTypes`
sin cultura explícita, `calloutValue` en tarjeta clásica, `ComparisonKind` en
filtros, visuales fuera del lienzo o solapados, páginas sin registrar y temas
`customTheme` sin archivo en `StaticResources/RegisteredResources/`.
