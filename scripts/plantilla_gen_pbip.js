// plantilla_gen_pbip.js — Genera un PBIP completo (scaffold + TMDL + PBIR) con la
// plantilla de diseño elite y el tema propio registrado.
// Uso: 1) editar CONFIG y el modelo/pagina segun el proyecto, 2) node plantilla_gen_pbip.js,
//      3) node valida_pbip.js <ROOT> hasta 0 errores, 4) abrir el .pbip en Desktop.
// DEMO=true genera CSVs sinteticos para que el proyecto abra con datos reales de prueba.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CFG = {
  ROOT: 'C:/Temp/MiProyecto',
  NAME: 'MiProyecto',
  DATA: 'C:/Temp/MiProyecto/data',
  DEMO: true,
  PAGE_ID: 'a1b2c3d4e5f60718260a',
  PAGE_NAME: 'Pulso Comercial',
  BACKGROUND: '#E9EEF3',
  THEME_SRC: path.join(__dirname, '..', 'assets', 'tema-elite.json')
};

const VC = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.12.0/schema.json';
const argRoot = process.argv[2];
if (argRoot) { CFG.ROOT = argRoot.replace(/\\/g, '/'); CFG.NAME = path.basename(CFG.ROOT).replace(/[^A-Za-z0-9_]/g, ''); CFG.DATA = CFG.ROOT + '/data'; }
const REP = path.join(CFG.ROOT, CFG.NAME + '.Report');
const SM = path.join(CFG.ROOT, CFG.NAME + '.SemanticModel');
const PAGES = path.join(REP, 'definition', 'pages');
const DATA_M = CFG.DATA.replace(/\//g, '\\');
const uuid = () => crypto.randomUUID();
const write = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c, 'utf8'); };
const writeJson = (p, o) => write(p, JSON.stringify(o, null, 2) + '\n');

// ---------------------------------------------------------------- datos demo
const ZONAS = [
  ['Lima Moderna', 'Lima', 1.01], ['Lima Norte', 'Lima', 0.99], ['Arequipa', 'Costa Sur', 1.02],
  ['Trujillo', 'Costa Norte', 1.01], ['Cusco', 'Sierra', 0.93], ['Tarapoto', 'Selva', 0.90]
];
function rand(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function meses(desde, hasta) { const out = []; let d = new Date(Date.UTC(desde[0], desde[1] - 1, 1)); const fin = Date.UTC(hasta[0], hasta[1] - 1, 1); while (d <= fin) { out.push([d.getUTCFullYear(), d.getUTCMonth() + 1]); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); } return out; }
function generarDemoData() {
  const r = rand(42);
  const ms = meses([2024, 1], [2025, 12]);
  const lineasV = ['venta_id,fecha_venta,zona_id,importe_venta,costo_total,utilidad'];
  const lineasP = ['anio,mes,zona_id,monto_presup,utilidad_presup'];
  let id = 0;
  for (const [anio, mes] of ms) {
    for (let z = 0; z < ZONAS.length; z++) {
      const estacional = 1 + 0.18 * Math.sin(((mes - 1) / 12) * Math.PI * 2);
      const base = (62000 + z * 9000) * estacional * (0.94 + 0.12 * r());
      const margen = 0.09 + 0.07 * r();
      const importe = Math.round(base * 100) / 100;
      const utilidad = Math.round(importe * margen * 100) / 100;
      const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(3 + Math.floor(r() * 25)).padStart(2, '0')}`;
      lineasV.push(`${++id},${fecha},${z + 1},${importe.toFixed(2)},${(importe - utilidad).toFixed(2)},${utilidad.toFixed(2)}`);
      const factor = ZONAS[z][2];
      const monto = Math.round(importe * factor * (1 + 0.05 * (r() - 0.5)) * 100) / 100;
      lineasP.push(`${anio},${mes},${z + 1},${monto.toFixed(2)},${(monto * margen).toFixed(2)}`);
    }
  }
  write(path.join(CFG.DATA, 'ventas.csv'), lineasV.join('\n') + '\n');
  write(path.join(CFG.DATA, 'presupuesto.csv'), lineasP.join('\n') + '\n');
  write(path.join(CFG.DATA, 'zonas.csv'), 'zona_id,zona,region\n' + ZONAS.map(([z, rg], i) => `${i + 1},${z},${rg}`).join('\n') + '\n');
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const lineasC = ['fecha,anio,trimestre,mes,mes_nombre,anio_mes,dia_semana,es_fin_semana'];
  for (let d = new Date(Date.UTC(2024, 0, 1)); d <= new Date(Date.UTC(2025, 11, 31)); d = new Date(d.getTime() + 86400000)) {
    const anio = d.getUTCFullYear(), mes = d.getUTCMonth() + 1, dia = d.getUTCDate();
    const ds = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    lineasC.push(`${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')},${anio},${Math.ceil(mes / 3)},${mes},${nombres[mes - 1]},${anio}-${String(mes).padStart(2, '0')},${ds},${ds >= 6 ? 'Si' : 'No'}`);
  }
  write(path.join(CFG.DATA, 'calendario.csv'), lineasC.join('\n') + '\n');
  console.log('  datos demo ->', CFG.DATA);
}

// ---------------------------------------------------------------- TMDL
function tcol(name, o = {}) {
  const n = name.includes(' ') ? `'${name}'` : name;
  let s = `\tcolumn ${n}\n\t\tdataType: ${o.type || 'double'}\n`;
  if (o.fmt) s += `\t\tformatString: ${o.fmt}\n`;
  if (o.hidden) s += `\t\tisHidden\n`;
  s += `\t\tlineageTag: ${uuid()}\n\t\tsummarizeBy: ${o.sum || 'none'}\n\t\tsourceColumn: ${o.src || name}\n`;
  s += `\n\t\tannotation SummarizationSetBy = Automatic`;
  if (o.annots) for (const a of o.annots) s += `\n\n\t\tannotation ${a}`;
  return s;
}
function tmeasure(name, expr, fmt) {
  const n = name.includes(' ') ? `'${name}'` : name;
  let s = `\tmeasure ${n} = ${expr}\n`;
  if (fmt) s += `\t\tformatString: ${fmt}\n`;
  return s + `\t\tlineageTag: ${uuid()}`;
}
function mPartition(name, csvFile, types, extra = []) {
  const pasos = [
    `Origen = Csv.Document(File.Contents("${DATA_M}\\${csvFile}"), [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv])`,
    `#"Encabezados promovidos" = Table.PromoteHeaders(Origen, [PromoteAllScalars = true])`,
    `#"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos", {${types}}, "en-US")`,
    ...extra
  ];
  const lineas = pasos.map((p, i) => `\t\t\t\t    ${p}${i < pasos.length - 1 ? ',' : ''}`);
  const last = pasos[pasos.length - 1].split(' =')[0];
  return `\tpartition ${name} = m\n\t\tmode: import\n\t\tsource =\n\t\t\t\tlet\n${lineas.join('\n')}\n\t\t\t\tin\n\t\t\t\t    ${last}`;
}
const tbl = (name, body) => `table ${name}\n\tlineageTag: ${uuid()}\n\n${body}\n`;

function tablaVentas() {
  const cols = [
    tcol('venta_id', { type: 'int64', hidden: true }),
    tcol('fecha_venta', { type: 'dateTime', fmt: 'Short Date' }),
    tcol('zona_id', { type: 'int64', hidden: true }),
    tcol('importe_venta', { type: 'double', fmt: '#,0', sum: 'sum' }),
    tcol('costo_total', { type: 'double', fmt: '#,0', sum: 'sum' }),
    tcol('utilidad', { type: 'double', fmt: '#,0', sum: 'sum' })
  ].join('\n\n');
  const types = '{"venta_id", Int64.Type}, {"fecha_venta", type date}, {"zona_id", Int64.Type}, {"importe_venta", type number}, {"costo_total", type number}, {"utilidad", type number}';
  return tbl('Ventas', cols + '\n\n' + mPartition('Ventas', 'ventas.csv', types));
}
function tablaPresupuesto() {
  const cols = [
    tcol('anio', { type: 'int64', hidden: true }),
    tcol('mes', { type: 'int64', hidden: true }),
    tcol('zona_id', { type: 'int64', hidden: true }),
    tcol('monto_presup', { type: 'double', fmt: '#,0', sum: 'sum' }),
    tcol('utilidad_presup', { type: 'double', fmt: '#,0', sum: 'sum' }),
    tcol('fecha_presup', { type: 'dateTime', fmt: 'Short Date' })
  ].join('\n\n');
  const types = '{"anio", Int64.Type}, {"mes", Int64.Type}, {"zona_id", Int64.Type}, {"monto_presup", type number}, {"utilidad_presup", type number}';
  return tbl('Presupuesto', cols + '\n\n' + mPartition('Presupuesto', 'presupuesto.csv', types,
    ['#"Fecha agregada" = Table.AddColumn(#"Tipo cambiado", "fecha_presup", each #datetime([anio], [mes], 1, 0, 0, 0), type datetime)']));
}
function tablaZonas() {
  const cols = [
    tcol('zona_id', { type: 'int64', hidden: true }),
    tcol('zona', { type: 'string' }),
    tcol('region', { type: 'string' })
  ].join('\n\n');
  const types = '{"zona_id", Int64.Type}, {"zona", type text}, {"region", type text}';
  return tbl('Zonas', cols + '\n\n' + mPartition('Zonas', 'zonas.csv', types));
}
function tablaCalendario() {
  const cols = [
    tcol('Date', { type: 'dateTime', fmt: 'Short Date', annots: ['UnderlyingDateTimeDataType = Date'] }),
    tcol('anio', { type: 'int64', fmt: '0' }),
    tcol('trimestre', { type: 'int64', fmt: '0' }),
    tcol('mes', { type: 'int64', fmt: '0' }),
    tcol('nombre_mes', { type: 'string' }),
    tcol('MesAnio', { type: 'string' }),
    tcol('dia_semana', { type: 'int64', fmt: '0' }),
    tcol('es_fin_semana', { type: 'string' })
  ].join('\n\n');
  const types = '{"fecha", type date}, {"anio", Int64.Type}, {"trimestre", Int64.Type}, {"mes", Int64.Type}, {"mes_nombre", type text}, {"anio_mes", type text}, {"dia_semana", Int64.Type}, {"es_fin_semana", type text}';
  const extra = [
    '#"Filtrado" = Table.SelectRows(#"Tipo cambiado", each [fecha] <= #date(2025, 12, 31))',
    '#"Fecha renombrada" = Table.RenameColumns(#"Filtrado", {{"fecha", "Date"}})',
    '#"MesAnio renombrado" = Table.RenameColumns(#"Fecha renombrada", {{"anio_mes", "MesAnio"}})',
    '#"NombreMes renombrado" = Table.RenameColumns(#"MesAnio renombrado", {{"mes_nombre", "nombre_mes"}})'
  ];
  return tbl('Calendario', cols + '\n\n' + mPartition('Calendario', 'calendario.csv', types, extra));
}
function tablaMedidas() {
  const medidas = [
    tmeasure('Venta Neta', 'SUM(Ventas[importe_venta])', '#,0'),
    tmeasure('Presupuesto', 'SUM(Presupuesto[monto_presup])', '#,0'),
    tmeasure('Cumplimiento %', 'DIVIDE([Venta Neta], [Presupuesto])', '0.0%'),
    tmeasure('Desviación', '[Venta Neta] - [Presupuesto]', '#,0'),
    tmeasure('Utilidad', 'SUM(Ventas[utilidad])', '#,0'),
    tmeasure('Margen %', 'DIVIDE([Utilidad], [Venta Neta])', '0.0%'),
    tmeasure('Venta Neta YTD', 'TOTALYTD([Venta Neta], Calendario[Date])', '#,0'),
    tmeasure('Presupuesto YTD', 'TOTALYTD([Presupuesto], Calendario[Date])', '#,0'),
    tmeasure('Cumplimiento YTD %', 'DIVIDE([Venta Neta YTD], [Presupuesto YTD])', '0.0%'),
    tmeasure('Desviación YTD', '[Venta Neta YTD] - [Presupuesto YTD]', '#,0'),
    tmeasure('Venta Año Anterior', 'CALCULATE([Venta Neta], SAMEPERIODLASTYEAR(Calendario[Date]))', '#,0'),
    tmeasure('Crecimiento YoY %', 'DIVIDE([Venta Neta], [Venta Año Anterior]) - 1', '0.0%'),
    tmeasure('Crecimiento 12m %', 'VAR _Fin = EOMONTH(CALCULATE(MAX(Ventas[fecha_venta]), ALL(Calendario)), 0) VAR _Act = CALCULATE([Venta Neta], DATESBETWEEN(Calendario[Date], EOMONTH(_Fin, -11) + 1, _Fin)) VAR _Pre = CALCULATE([Venta Neta], DATESBETWEEN(Calendario[Date], EOMONTH(_Fin, -23) + 1, EOMONTH(_Fin, -12))) RETURN DIVIDE(_Act, _Pre) - 1', '0.0%'),
    tmeasure('KPI Cumplimiento Color', 'IF([Cumplimiento %] >= 0.98, "#44C088", IF([Cumplimiento %] >= 0.90, "#F2C14E", "#ED7373"))'),
    tmeasure('KPI Cumplimiento YTD Color', 'IF([Cumplimiento YTD %] >= 0.98, "#44C088", IF([Cumplimiento YTD %] >= 0.90, "#F2C14E", "#ED7373"))'),
    tmeasure('KPI Margen Color', 'IF([Margen %] >= 0.18, "#44C088", IF([Margen %] >= 0.12, "#F2C14E", "#ED7373"))'),
    tmeasure('KPI YoY Color', 'IF([Crecimiento YoY %] >= 0, "#44C088", "#ED7373")'),
    tmeasure('KPI Crecimiento 12m Color', 'IF([Crecimiento 12m %] >= 0, "#44C088", "#ED7373")')
  ].join('\n\n');
  const dummy = `\tcolumn Dummy\n\t\tlineageTag: ${uuid()}\n\t\tisNameInferred\n\t\tsourceColumn: [Dummy]`;
  const part = '\tpartition Medidas = calculated\n\t\tmode: import\n\t\tsource = ROW("Dummy", 1)';
  return tbl('Medidas', medidas + '\n\n' + dummy + '\n\n' + part);
}
function modelo() {
  const tablas = ['Ventas', 'Presupuesto', 'Zonas', 'Calendario', 'Medidas'];
  let s = 'model Model\n\tculture: es-ES\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: es-ES\n\n';
  s += `annotation PBI_QueryOrder = [${tablas.map(t => `"${t}"`).join(',')}]\n\n`;
  s += 'annotation __PBI_TimeIntelligenceEnabled = 0\n\n';
  for (const t of tablas) s += `ref table ${t}\n`;
  return s;
}
function relaciones() {
  return [
    'relationship Ventas_Calendario\n\tfromColumn: Ventas.fecha_venta\n\ttoColumn: Calendario.Date',
    'relationship Presupuesto_Calendario\n\tjoinOnDateBehavior: datePartOnly\n\tfromColumn: Presupuesto.fecha_presup\n\ttoColumn: Calendario.Date',
    'relationship Ventas_Zonas\n\tfromColumn: Ventas.zona_id\n\ttoColumn: Zonas.zona_id',
    'relationship Presupuesto_Zonas\n\tfromColumn: Presupuesto.zona_id\n\ttoColumn: Zonas.zona_id'
  ].join('\n\n') + '\n';
}

// ---------------------------------------------------------------- PBIR
const L = {
  m: 15, gap: 5,
  bannerH: 52,
  slicerY: 57, slicerH: 60,
  kpiY: 122, kpiH: 104, cardW: 308,
  heroY: 231, heroH: 235, halfW: 622, halfW2: 623,
  bottomY: 471, bottomH: 243
};

function projColumn(entity, property, opts = {}) {
  return {
    field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: property } },
    queryRef: `${entity}.${property}`,
    nativeQueryRef: property,
    ...(opts.active ? { active: true } : {}),
    ...(opts.displayName ? { displayName: opts.displayName } : {})
  };
}
function projMeasure(entity, property, displayName) {
  return {
    field: { Measure: { Expression: { SourceRef: { Entity: entity } }, Property: property } },
    queryRef: `${entity}.${property}`,
    nativeQueryRef: property,
    ...(displayName ? { displayName } : {})
  };
}
function sortCol(entity, property, direction) {
  return { field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: property } }, direction };
}
function sortMeasure(entity, property, direction) {
  return { field: { Measure: { Expression: { SourceRef: { Entity: entity } }, Property: property } }, direction };
}
function title(text) {
  return { title: [{ properties: { show: { expr: { Literal: { Value: 'true' } } }, text: { expr: { Literal: { Value: `'${text}'` } } } } }] };
}
function viz(name, pos, visual) {
  return { $schema: VC, name, position: { ...pos, z: pos.tabOrder }, visual: { ...visual, drillFilterOtherVisuals: true } };
}
const lit = (v) => ({ expr: { Literal: { Value: v } } });

function cfSemaforo(medida, reglas, defaultColor) {
  return [{
    properties: {
      show: lit('true'),
      color: { solid: { color: { expr: { Conditional: {
        Cases: reglas.map(([umbral, color]) => ({
          Condition: { Comparison: { ComparisonKind: 2,
            Left: { Measure: { Expression: { SourceRef: { Entity: 'Medidas' } }, Property: medida } },
            Right: { Literal: { Value: `${umbral}D` } } } },
          Value: { Literal: { Value: `'${color}'` } }
        })),
        Default: { Literal: { Value: `'${defaultColor}'` } }
      } } } } }
    }
  }];
}
function gradienteBarras(medida, minHex, maxHex) {
  return {
    dataPoint: [{
      properties: {
        fill: { solid: { color: { expr: { FillRule: {
          Input: { Measure: { Expression: { SourceRef: { Entity: 'Medidas' } }, Property: medida } },
          FillRule: { linearGradient2: {
            min: { color: { Literal: { Value: `'${minHex}'` } } },
            max: { color: { Literal: { Value: `'${maxHex}'` } } } } }
        } } } } }
      },
      selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] }
    }]
  };
}
function cfCubetas(medida, casos, defaultHex) {
  return [{
    properties: {
      backColor: { solid: { color: { expr: { Conditional: {
        Cases: casos.map(([kind, umbral, color]) => ({
          Condition: { Comparison: { ComparisonKind: kind,
            Left: { Measure: { Expression: { SourceRef: { Entity: 'Medidas' } }, Property: medida } },
            Right: { Literal: { Value: `${umbral}D` } } } },
          Value: { Literal: { Value: `'${color}'` } }
        })),
        DefaultValue: { Literal: { Value: `'${defaultHex}'` } }
      } } } } }
    },
    selector: { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: `Medidas.${medida}` }
  }];
}
function dataBars(medida, posHex, negHex, axisHex) {
  return {
    properties: {
      dataBars: {
        positiveColor: { solid: { color: { expr: { Literal: { Value: `'${posHex}'` } } } } },
        negativeColor: { solid: { color: { expr: { Literal: { Value: `'${negHex}'` } } } } },
        axisColor: { solid: { color: { expr: { Literal: { Value: `'${axisHex}'` } } } } },
        reverseDirection: { expr: { Literal: { Value: 'false' } } },
        hideText: { expr: { Literal: { Value: 'false' } } }
      }
    },
    selector: { metadata: `Medidas.${medida}` }
  };
}

function visBanner(id) {
  return viz(id, { x: 0, y: 0, width: 1280, height: L.bannerH, tabOrder: 0 }, {
    visualType: 'shape',
    objects: {
      shape: [{ properties: { tileShape: { expr: { Literal: { Value: "'rectangle'" } } } } }],
      rotation: [{ properties: { shapeAngle: { expr: { Literal: { Value: '0L' } } } } }],
      fill: [{ properties: { fillColor: { solid: { color: { expr: { Literal: { Value: "'#FFFFFF'" } } } } } }, selector: { id: 'default' } }],
      outline: [{ properties: { show: { expr: { Literal: { Value: 'false' } } } } }],
      text: [
        { properties: { show: { expr: { Literal: { Value: 'true' } } } } },
        {
          properties: {
            text: { expr: { Literal: { Value: "'Pulso Comercial · Tablero de ventas'" } } },
            fontColor: { solid: { color: { expr: { Literal: { Value: "'#0C3549'" } } } } },
            verticalAlignment: { expr: { Literal: { Value: "'middle'" } } },
            bold: { expr: { Literal: { Value: 'true' } } },
            fontSize: { expr: { Literal: { Value: '17D' } } }
          },
          selector: { id: 'default' }
        }
      ]
    }
  });
}
function visSlicer(id, entity, property, displayName, x, width, tabOrder) {
  return viz(id, { x, y: L.slicerY, width, height: L.slicerH, tabOrder }, {
    visualType: 'slicer',
    query: { queryState: { Values: { projections: [projColumn(entity, property, { active: true, displayName })] } } },
    objects: { data: [{ properties: { mode: { expr: { Literal: { Value: "'Dropdown'" } } } } }] }
  });
}
function visCard(id, medida, displayName, pos, tabOrder, opt = {}) {
  const labelsProps = {
    fontSize: { expr: { Literal: { Value: `${opt.fontSize || 22}D` } } },
    labelDisplayUnits: { expr: { Literal: { Value: opt.units || '1D' } } }
  };
  if (opt.colorMedida) labelsProps.color = { solid: { color: { expr: { Measure: { Expression: { SourceRef: { Entity: 'Medidas' } }, Property: opt.colorMedida } } } } };
  const v = viz(id, { ...pos, tabOrder }, {
    visualType: 'card',
    query: { queryState: { Values: { projections: [projMeasure('Medidas', medida, displayName)] } } },
    objects: {
      labels: [{ properties: labelsProps }],
      categoryLabels: [{ properties: {
        show: { expr: { Literal: { Value: 'true' } } },
        fontSize: { expr: { Literal: { Value: '10D' } } },
        color: { solid: { color: { expr: { Literal: { Value: "'#5A6B7B'" } } } } }
      } }]
    }
  });
  if (opt.semaforo) v.visual.visualContainerObjects = { background: cfSemaforo(opt.semaforo.medida, opt.semaforo.reglas, opt.semaforo.defaultColor) };
  return v;
}
function visCombo(id, pos, tabOrder) {
  return viz(id, { ...pos, tabOrder }, {
    visualType: 'lineChart',
    query: {
      queryState: {
        Category: { projections: [projColumn('Calendario', 'MesAnio', { active: true })] },
        Y: { projections: [projMeasure('Medidas', 'Venta Neta', 'Real (S/)'), projMeasure('Medidas', 'Presupuesto', 'Meta (S/)')] }
      },
      sortDefinition: { sort: [sortCol('Calendario', 'MesAnio', 'Ascending')] }
    },
    objects: {
      lineStyles: [
        { properties: { areaShow: { expr: { Literal: { Value: 'false' } } }, showMarker: { expr: { Literal: { Value: 'false' } } } } },
        { properties: { lineStyle: { expr: { Literal: { Value: "'dashed'" } } }, strokeWidth: { expr: { Literal: { Value: '2D' } } } }, selector: { metadata: 'Medidas.Presupuesto' } }
      ]
    },
    visualContainerObjects: title('Venta real vs meta por mes (S/)')
  });
}
function visBarrasZona(id, pos, tabOrder) {
  return viz(id, { ...pos, tabOrder }, {
    visualType: 'barChart',
    query: {
      queryState: {
        Category: { projections: [projColumn('Zonas', 'zona', { active: true })] },
        Y: { projections: [projMeasure('Medidas', 'Venta Neta', 'Venta (S/)')] }
      },
      sortDefinition: { sort: [sortMeasure('Medidas', 'Venta Neta', 'Descending')] }
    },
    objects: gradienteBarras('Venta Neta', '#8FA6B8', '#0C3549'),
    visualContainerObjects: title('Ranking de venta por zona (S/)')
  });
}
function visTablaZonas(id, pos, tabOrder) {
  return viz(id, { ...pos, tabOrder }, {
    visualType: 'tableEx',
    query: {
      queryState: {
        Values: {
          projections: [
            projColumn('Zonas', 'zona', { displayName: 'Zona' }),
            projColumn('Zonas', 'region', { displayName: 'Región' }),
            projMeasure('Medidas', 'Venta Neta', 'Venta (S/)'),
            projMeasure('Medidas', 'Presupuesto', 'Ppto (S/)'),
            projMeasure('Medidas', 'Cumplimiento %', 'Cumpl. %'),
            projMeasure('Medidas', 'Margen %', 'Margen %')
          ]
        }
      },
      sortDefinition: { sort: [sortMeasure('Medidas', 'Venta Neta', 'Descending')] }
    },
    visualContainerObjects: title('Detalle por zona')
  });
}
function visMatriz(id, pos, tabOrder) {
  return viz(id, { ...pos, tabOrder }, {
    visualType: 'pivotTable',
    query: {
      queryState: {
        Rows: { projections: [projColumn('Zonas', 'region', { active: true, displayName: 'Región' }), projColumn('Zonas', 'zona', { displayName: 'Zona' })] },
        Values: { projections: [projMeasure('Medidas', 'Venta Neta', 'Venta (S/)'), projMeasure('Medidas', 'Cumplimiento %', 'Cumpl. %')] }
      }
    },
    objects: { values: cfCubetas('Cumplimiento %', [[3, 0.9, '#FBE5E5'], [3, 0.98, '#FCF1DC'], [2, 0.98, '#E3F5EB']], '#FFFFFF') },
    visualContainerObjects: title('Venta y cumplimiento por región y zona')
  });
}

// ---------------------------------------------------------------- scaffold
function scaffold() {
  write(path.join(CFG.ROOT, `${CFG.NAME}.pbip`), JSON.stringify({
    version: '1.0',
    artifacts: [{ report: { path: `${CFG.NAME}.Report` } }],
    settings: { enableAutoRecovery: true }
  }, null, 2) + '\n');

  writeJson(path.join(REP, '.platform'), {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
    metadata: { type: 'Report', displayName: CFG.NAME },
    config: { version: '2.0', logicalId: uuid() }
  });
  writeJson(path.join(REP, 'definition.pbir'), { version: '4.0', datasetReference: { byPath: { path: `../${CFG.NAME}.SemanticModel` } } });
  writeJson(path.join(REP, 'definition', 'report.json'), {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.3.0/schema.json',
    themeCollection: {
      baseTheme: {
        name: 'CY24SU10',
        reportVersionAtImport: { visual: '1.8.100', report: '2.0.100', page: '1.3.100' },
        type: 'SharedResources'
      },
      customTheme: {
        name: 'tema-elite.json',
        reportVersionAtImport: { visual: '2.7.0', report: '3.2.0', page: '2.3.0' },
        type: 'RegisteredResources'
      }
    },
    resourcePackages: [
      {
        name: 'SharedResources',
        type: 'SharedResources',
        items: [{ name: 'CY24SU10', path: 'BaseThemes/CY24SU10.json', type: 'BaseTheme' }]
      },
      {
        name: 'RegisteredResources',
        type: 'RegisteredResources',
        items: [{ name: 'tema-elite.json', path: 'tema-elite.json', type: 'CustomTheme' }]
      }
    ],
    settings: {
      useStylableVisualContainerHeader: true,
      exportDataMode: 'AllowSummarized',
      defaultDrillFilterOtherVisuals: true,
      allowChangeFilterTypes: true,
      useEnhancedTooltips: true,
      useDefaultAggregateDisplayName: true
    }
  });
  writeJson(path.join(REP, 'definition', 'version.json'), {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json',
    version: '2.0.0'
  });
  writeJson(path.join(PAGES, 'pages.json'), {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json',
    pageOrder: [CFG.PAGE_ID],
    activePageName: CFG.PAGE_ID
  });
  writeJson(path.join(PAGES, CFG.PAGE_ID, 'page.json'), {
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json',
    name: CFG.PAGE_ID,
    displayName: CFG.PAGE_NAME,
    displayOption: 'FitToPage',
    height: 720,
    width: 1280,
    objects: {
      background: [{
        properties: {
          color: { solid: { color: lit(`'${CFG.BACKGROUND}'`) } },
          transparency: lit('0D')
        }
      }]
    }
  });

  fs.mkdirSync(path.join(REP, 'StaticResources', 'RegisteredResources'), { recursive: true });
  fs.copyFileSync(CFG.THEME_SRC, path.join(REP, 'StaticResources', 'RegisteredResources', 'tema-elite.json'));

  write(path.join(SM, '.platform'), JSON.stringify({
    $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json',
    metadata: { type: 'SemanticModel', displayName: CFG.NAME },
    config: { version: '2.0', logicalId: uuid() }
  }, null, 2) + '\n');
  writeJson(path.join(SM, 'definition.pbism'), { version: '4.2', settings: {} });
  write(path.join(SM, 'definition', 'database.tmdl'), 'database\n\tcompatibilityLevel: 1606\n');
  write(path.join(SM, 'definition', 'model.tmdl'), modelo());
  write(path.join(SM, 'definition', 'relationships.tmdl'), relaciones());
  const tablas = {
    'Ventas.tmdl': tablaVentas(),
    'Presupuesto.tmdl': tablaPresupuesto(),
    'Zonas.tmdl': tablaZonas(),
    'Calendario.tmdl': tablaCalendario(),
    'Medidas.tmdl': tablaMedidas()
  };
  for (const [archivo, contenido] of Object.entries(tablas)) write(path.join(SM, 'definition', 'tables', archivo), contenido);
  console.log('  scaffold + modelo ->', CFG.ROOT);
}

function paginaElite() {
  const { m, gap, kpiY, kpiH, cardW, heroY, heroH, halfW, halfW2, bottomY, bottomH } = L;
  const visuales = [
    visBanner('b0000000000000000001'),
    visSlicer('b0000000000000000002', 'Zonas', 'region', 'Región', 868, 196, 1),
    visSlicer('b0000000000000000003', 'Calendario', 'anio', 'Año', 1069, 196, 2),
    visCard('c0000000000000000001', 'Venta Neta YTD', 'Venta YTD (S/)', { x: m, y: kpiY, width: cardW, height: kpiH }, 3, { colorMedida: 'KPI Cumplimiento YTD Color' }),
    visCard('c0000000000000000002', 'Cumplimiento YTD %', 'Cumpl. YTD', { x: m + cardW + gap, y: kpiY, width: cardW, height: kpiH }, 4,
      { colorMedida: 'KPI Cumplimiento YTD Color', semaforo: { medida: 'Cumplimiento YTD %', reglas: [[0.98, '#E3F5EB'], [0.9, '#FCF1DC']], defaultColor: '#FBE5E5' } }),
    visCard('c0000000000000000003', 'Margen %', 'Margen %', { x: m + 2 * (cardW + gap), y: kpiY, width: cardW, height: kpiH }, 5,
      { colorMedida: 'KPI Margen Color', semaforo: { medida: 'Margen %', reglas: [[0.18, '#E3F5EB'], [0.12, '#FCF1DC']], defaultColor: '#FBE5E5' } }),
    visCard('c0000000000000000004', 'Crecimiento 12m %', 'Crec. 12m', { x: m + 3 * (cardW + gap), y: kpiY, width: 311, height: kpiH }, 6, { colorMedida: 'KPI Crecimiento 12m Color' }),
    visCombo('d0000000000000000001', { x: m, y: heroY, width: halfW, height: heroH }, 7),
    visBarrasZona('d0000000000000000002', { x: m + halfW + gap, y: heroY, width: halfW2, height: heroH }, 8),
    visTablaZonas('e0000000000000000001', { x: m, y: bottomY, width: halfW, height: bottomH }, 9),
    visMatriz('e0000000000000000002', { x: m + halfW + gap, y: bottomY, width: halfW2, height: bottomH }, 10)
  ];
  for (const v of visuales) writeJson(path.join(PAGES, CFG.PAGE_ID, 'visuals', v.name, 'visual.json'), v);
  console.log(`  pagina "${CFG.PAGE_NAME}": ${visuales.length} visuales (plantilla elite 1280x720)`);
}

console.log('Generando PBIP en', CFG.ROOT);
if (CFG.DEMO) generarDemoData();
scaffold();
paginaElite();
console.log('OK. Siguiente: node ' + path.join(__dirname, 'valida_pbip.js') + ' ' + CFG.ROOT);
console.log('Luego: abrir ' + path.join(CFG.ROOT, CFG.NAME + '.pbip') + ' en Power BI Desktop.');
