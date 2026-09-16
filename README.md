# powerbi-pbip-builder

Skill para construir y reparar proyectos **Power BI (.pbip)** escribiendo archivos
(TMDL + PBIR + tema JSON), con soporte de modelos vivos vía MCP. Nace de sesiones
reales (Andes Bebidas, Cordillera Alimentos) y destila la guía de diseño de
[`microsoft/skills-for-fabric`](https://github.com/microsoft/skills-for-fabric)
(`powerbi-report-design` / `powerbi-report-authoring`) + estándares IBCS.

## Qué incluye

```
powerbi-pbip-builder/
├── SKILL.md                  ← instrucciones del agente (flujos A/B/C, catálogo de errores)
├── references/
│   ├── estructura-pbip.md    ← árbol PBIP + metadata exacta (tema registrado, fondo de página)
│   ├── tmdl-patrones.md      ← TMDL/M/relaciones/cultura/renombres
│   ├── pbir-visuales.md      ← visual.json, tarjetas, condicional, títulos dinámicos
│   ├── diseno-elite.md       ← GUÍA DE DISEÑO ejecutable (paleta, grid, cookbook, Design Brief)
│   ── auditoria-modelos.md  ← checklist MCP + TREATAS
├── assets/
│   └── tema-elite.json       ← tema propio IBCS (canvas, tipografía, semáforos, estilos por visual)
├── scripts/
│   ├── plantilla_gen_pbip.js ← generador completo (scaffold+TMDL+PBIR+tema) con datos demo
│   └── valida_pbip.js        ← validador estructural (JSON/BOM, Property, duplicados, layout, tema)
├── docs/
│   ── APRENDIZAJES.md       ← catálogo consolidado: síntoma → causa → regla
├── CHANGELOG.md
└── README.md
```

## Requisitos

- **Node.js** (scripts sin dependencias).
- **Power BI Desktop** para abrir/refrescar el `.pbip`.
- Opcional: MCP `powerbi-modeling-mcp` (modelo vivo) y MCP de reportes PBIR
  (validaciones de wireframe/tema).

## Uso rápido

```powershell
# 1. Generar un proyecto desde la plantilla (scaffold + modelo demo + página elite)
node scripts/plantilla_gen_pbip.js C:/Temp/MiProyecto

# 2. Validar antes de abrir (debe dar 0 errores)
node scripts/valida_pbip.js C:/Temp/MiProyecto

# 3. Abrir el .pbip en Power BI Desktop → Refresh → Ctrl+S
```

Para un caso real: copiar `plantilla_gen_pbip.js` al repo del proyecto, editar
CONFIG/modelo/página y ejecutar. Referencia viva: el generador de
`CordilleraAlimentos` (modelo completo, tarjetas con acento y referencia, tooltip
de zona, títulos dinámicos).

## Sistema de diseño

- **Guía**: `references/diseno-elite.md` (obligatoria antes de generar visuales).
- **Tema**: `assets/tema-elite.json` → copiar a `StaticResources/RegisteredResources/`
  y registrar en `report.json` (bloque exacto en `estructura-pbip.md`).
- **Layout canónico 1280×720** (validado 0/0 con wireframe):
  banner shape (0,0,1280,52) · slicers y=57 h=60 · KPIs y=122 h=90 ·
  héroes y=217 h=245 · detalle y=467 h=247 · borde inferior ≤714.
- **Contraste**: valores navy `#0C3549`; acentos oscuros para trazos
  (`#0F7B4F`/`#B7791F`/`#C0392B`); comparación `#6B7C8C`; cubetas pastel
  `#E3F5EB`/`#FCF1DC`/`#FBE5E5`. Detalle y verificación WCAG en la guía.

## Versionado

Fuente de verdad: <https://github.com/Fjgl96/powerbi-pbip-builder> (rama `main`).

```powershell
git clone https://github.com/Fjgl96/powerbi-pbip-builder.git
```

El ejemplar instalado en `~/.agents/skills/powerbi-pbip-builder/` es la copia
operativa: al versionar un cambio, replicarlo en la copia instalada
(o reinstalar desde el release).

- Rama `main`; releases con tag `vX.Y.Z` (ver `CHANGELOG.md`).
- Los aprendizajes nuevos van a `docs/APRENDIZAJES.md` **y** al catálogo de
  errores de `SKILL.md` si son accionables por el agente.

## Créditos

- Guía de diseño base: Microsoft `skills-for-fabric` (MIT).
- Convenciones IBCS (real vs. plan, semántica de color, notación).
- Casos reales: `AndesBebidas` (sesión IA + Power BI) y `CordilleraAlimentos`
  (rediseño elite, 2026-09).