# Estructura de un proyecto PBIP

Árbol completo validado en producción (agosto 2026, Desktop 2.157). Los nombres `X` = nombre del proyecto.

```text
C:\Temp\X\
├── X.pbip
├── X.Report\
│   ├── .platform
│   ├── definition.pbir
│   ├── definition\
│   │   ├── report.json
│   │   ├── version.json
│   │   └── pages\
│   │       ├── pages.json
│   │       └── <id20hex>\
│   │           ├── page.json
│   │           └── visuals\<id20hex>\visual.json
│   ├── StaticResources\SharedResources\BaseThemes\CY24SU10.json
│   └── StaticResources\RegisteredResources\tema-elite.json   ← tema propio (opcional pero elite)
└── X.SemanticModel\
    ├── .platform
    ├── definition.pbism          ← OJO: pbism, NO pbir (este archivo falta = error de apertura)
    └── definition\
        ├── database.tmdl
        ├── model.tmdl
        ├── relationships.tmdl
        └── Tables\*.tmdl
```

Opcionales que Desktop regenera solo (NO crear): `.pbi/localSettings.json`, `diagramLayout.json`, `cultures/`, `expressions.tmdl`.

## Contenidos exactos

**X.pbip**
```json
{
  "version": "1.0",
  "artifacts": [{ "report": { "path": "X.Report" } }],
  "settings": { "enableAutoRecovery": true }
}
```

**X.Report/definition.pbir**
```json
{
  "version": "4.0",
  "datasetReference": { "byPath": { "path": "../X.SemanticModel" } }
}
```

**X.SemanticModel/definition.pbism**
```json
{ "version": "4.2", "settings": {} }
```

**.platform** (uno por carpeta, cambiar displayName y logicalId por GUIDs nuevos)
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  "metadata": { "type": "Report", "displayName": "X" },
  "config": { "version": "2.0", "logicalId": "<guid-nuevo>" }
}
```
(Tipo: `Report` para X.Report, `SemanticModel` para X.SemanticModel.)

**definition/report.json** (con tema propio registrado; la sintaxis `customTheme` + `RegisteredResources` está verificada contra Desktop/MCP)
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.3.0/schema.json",
  "themeCollection": {
    "baseTheme": {
      "name": "CY24SU10",
      "reportVersionAtImport": { "visual": "1.8.100", "report": "2.0.100", "page": "1.3.100" },
      "type": "SharedResources"
    },
    "customTheme": {
      "name": "tema-elite.json",
      "reportVersionAtImport": { "visual": "2.7.0", "report": "3.2.0", "page": "2.3.0" },
      "type": "RegisteredResources"
    }
  },
  "resourcePackages": [
    {
      "name": "SharedResources",
      "type": "SharedResources",
      "items": [
        { "name": "CY24SU10", "path": "BaseThemes/CY24SU10.json", "type": "BaseTheme" }
      ]
    },
    {
      "name": "RegisteredResources",
      "type": "RegisteredResources",
      "items": [
        { "name": "tema-elite.json", "path": "tema-elite.json", "type": "CustomTheme" }
      ]
    }
  ],
  "settings": {
    "useStylableVisualContainerHeader": true,
    "exportDataMode": "AllowSummarized",
    "defaultDrillFilterOtherVisuals": true,
    "allowChangeFilterTypes": true,
    "useEnhancedTooltips": true,
    "useDefaultAggregateDisplayName": true
  }
}
```
El nombre del archivo puede ser limpio (`tema-elite.json`); el archivo va en
`X.Report/StaticResources/RegisteredResources/` y basta que `customTheme.name`
coincida con el `items[].name/path`. Para tema default, omitir `customTheme` y el
paquete `RegisteredResources`.

⚠️ **JSON sin BOM**: todos los `.json` del PBIP en UTF-8 **sin BOM**. Node
(`fs.writeFileSync(p, c, 'utf8')`) no escribe BOM; `Set-Content -Encoding UTF8` de
PowerShell 5.1 **sí lo agrega** y rompe el parseo estricto (`Unexpected token '﻿'`).
Editar JSON con Node o con herramientas que no inyecten BOM.

**page.json** (ids: 20 caracteres hex; lienzo 1280×720; fondo de página opcional con la paleta elite)
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
  "name": "<id20hex>",
  "displayName": "Resumen Ejecutivo",
  "displayOption": "FitToPage",
  "height": 720,
  "width": 1280,
  "objects": {
    "background": [
      {
        "properties": {
          "color": { "solid": { "color": { "expr": { "Literal": { "Value": "'#E9EEF3'" } } } } },
          "transparency": { "expr": { "Literal": { "Value": "0D" } } }
        }
      }
    ]
  }
}
```
⚠️ En el `objects.background` de **página** solo van `color` y `transparency`. Un
`show` adicional rompe el esquema estricto al abrir: *"Se ha incluido una
propiedad 'show' adicional en /objects/background/0/properties"*. (El fondo de
los contenedores de **visuales** sí admite `show`.) Nota: `pbir_set_page_background`
del MCP de reportes puede agregar `show`; si se usa esa vía, quitarlo después o
revisar con `valida_pbip.js`.

**definition/version.json**
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
  "version": "2.0.0"
}
```

**definition/pages/pages.json**
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json",
  "pageOrder": ["<id-pagina-1>", "<id-pagina-2>"],
  "activePageName": "<id-pagina-1>"
}
```

## Cómo crear uno nuevo rápido

1. Copiar el scaffold desde un proyecto que ya cargue (p. ej. `C:\Temp\AndesBebidas`, `C:\Temp\VentasPpto`) y renombrar: carpeta, `.pbip`, `definition.pbir` (path), `.platform` (displayName + GUIDs nuevos).
2. Vaciar `pages/` y `Tables/` y escribir los propios — o partir de `scripts/plantilla_gen_pbip.js` del skill, que ya genera scaffold + TMDL + PBIR con el tema y la plantilla elite aplicados.
3. Copiar el tema: `StaticResources/SharedResources/BaseThemes/CY24SU10.json` (base) + `assets/tema-elite.json` del skill a `StaticResources/RegisteredResources/` y registrarlo en `report.json` (bloque de arriba).
