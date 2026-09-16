// valida_pbip.js — Validador de proyectos Power BI PBIP (TMDL + PBIR)
// Uso: node valida_pbip.js <raiz-del-proyecto>
// Verifica: JSON valido (y sin BOM), artefactos requeridos, Property en visuales,
//           tabs en TMDL, medidas/columnas duplicadas, cultura en TransformColumnTypes,
//           calloutValue en tarjeta clasica, ComparisonKind en filtros, layout
//           (fuera de lienzo / solapes), paginas registradas y tema registrado en disco.
const fs = require('fs'), path = require('path');

const root = process.argv[2];
if (!root || !fs.existsSync(root)) { console.error('Uso: node valida_pbip.js <raiz>'); process.exit(1); }

let errores = 0, avisos = 0;
const err = (m) => { errores++; console.log('  ERROR:', m); };
const aviso = (m) => { avisos++; console.log('  aviso:', m); };

function walk(dir, cb) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, cb); else cb(p);
  }
}

// 1. Artefactos requeridos
const rep = path.join(root, fs.readdirSync(root).find(d => d.endsWith('.Report')) || '');
const sm = path.join(root, fs.readdirSync(root).find(d => d.endsWith('.SemanticModel')) || '');
console.log('Proyecto:', path.basename(root));
if (!fs.existsSync(rep)) err('No existe carpeta .Report');
if (!fs.existsSync(sm)) err('No existe carpeta .SemanticModel');
if (rep && !fs.existsSync(path.join(rep, 'definition.pbir'))) err('Falta Report/definition.pbir');
if (sm && !fs.existsSync(path.join(sm, 'definition.pbism'))) err('Falta SemanticModel/definition.pbism (error clasico: es pbism, NO pbir)');

// 2. Todo JSON parsea y no tiene BOM
walk(root, (p) => {
  if (p.endsWith('.json')) {
    const buf = fs.readFileSync(p);
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) err(`JSON con BOM: ${path.relative(root, p)} (rompe parsers estrictos; guardar UTF-8 sin BOM)`);
    try { JSON.parse(buf.toString('utf8').replace(/^\uFEFF/, '')); } catch (e) { err(`JSON invalido: ${path.relative(root, p)} -> ${e.message}`); }
  }
});

// 3. TMDL: sin indentacion con espacios, sin medidas/columnas duplicadas
const medidasGlobal = new Map();
if (fs.existsSync(path.join(sm, 'definition'))) {
  walk(path.join(sm, 'definition'), (p) => {
    if (!p.endsWith('.tmdl')) return;
    const rel = path.relative(root, p);
    const texto = fs.readFileSync(p, 'utf8');
    const lineas = texto.split('\n');
    const malas = lineas.filter(l => /^ /.test(l)).length;
    if (malas > 0) err(`${rel}: ${malas} lineas indentadas con ESPACIOS (TMDL exige tabs)`);
    const nombres = new Map();
    const reMedida = /^\tmeasure\s+(?:'([^']+)'|([^=\s]+))\s*=/gm;
    const reColumna = /^\tcolumn\s+(?:'([^']+)'|(\S+))\s*$/gm;
    for (const re of [reMedida, reColumna]) {
      let m;
      while ((m = re.exec(texto))) {
        const nombre = m[1] || m[2];
        nombres.set(nombre, (nombres.get(nombre) || 0) + 1);
      }
    }
    for (const [nombre, n] of nombres) if (n > 1) err(`${rel}: '${nombre}' declarado ${n} veces (TMDL no admite duplicados; Desktop no abre)`);
    let m;
    while ((m = reMedida.exec(texto))) {
      const nombre = m[1] || m[2];
      if (medidasGlobal.has(nombre) && medidasGlobal.get(nombre) !== rel) err(`Medida '${nombre}' definida en ${medidasGlobal.get(nombre)} y en ${rel}`);
      medidasGlobal.set(nombre, rel);
    }
    if (/Table\.TransformColumnTypes\(/.test(texto)) {
      const llamadas = texto.match(/Table\.TransformColumnTypes\([^\n]*/g) || [];
      for (const c of llamadas) {
        if (!/,"[a-z]{2}-[A-Z]{2}"\)|,\s*"[a-z]{2}-[A-Z]{2}"\)/.test(c) && /type number|type date|Int64\.Type/.test(c)) {
          aviso(`${rel}: Table.TransformColumnTypes sin cultura explicita ("en-US") — riesgo de parseo 2424.15 -> 242415`);
        }
      }
    }
  });
}

// 4. Visuales
const pagesDir = path.join(rep, 'definition', 'pages');
if (fs.existsSync(pagesDir)) {
  const pages = fs.readdirSync(pagesDir).filter(d => fs.statSync(path.join(pagesDir, d)).isDirectory());
  for (const pg of pages) {
    const pgJson = path.join(pagesDir, pg, 'page.json');
    let ancho = 1280, alto = 720;
    if (!fs.existsSync(pgJson)) err(`Falta page.json en pagina ${pg}`);
    else { try {
      const p = JSON.parse(fs.readFileSync(pgJson, 'utf8'));
      ancho = p.width || ancho; alto = p.height || alto;
      const bg = p.objects && p.objects.background && p.objects.background[0];
      if (bg && bg.properties && 'show' in bg.properties) err(`page.json ${pg}: 'show' no es valido en objects.background.properties (schema estricto de pagina)`);
    } catch (e) {} }
    const vDir = path.join(pagesDir, pg, 'visuals');
    if (!fs.existsSync(vDir)) continue;
    const cajas = [];
    for (const v of fs.readdirSync(vDir)) {
      const vf = path.join(vDir, v, 'visual.json');
      if (!fs.existsSync(vf)) { err(`Falta visual.json en ${pg}/visuals/${v}`); continue; }
      const j = JSON.parse(fs.readFileSync(vf, 'utf8'));
      (function scan(o) {
        if (Array.isArray(o)) { o.forEach(scan); return; }
        if (typeof o !== 'object' || !o) return;
        const hasCM = 'Column' in o || 'Measure' in o;
        if (hasCM) {
          if ('Property' in o) err(`Property a nivel field en ${pg}/${v} (debe ir dentro de Column/Measure)`);
          const inner = o.Column || o.Measure;
          if (!inner || !('Property' in inner)) err(`Falta Property dentro de ${o.Column ? 'Column' : 'Measure'} en ${pg}/${v}`);
          else scan(inner);
        }
        for (const k in o) { if (k === 'Property') continue; scan(o[k]); }
      })(j);
      const tipo = j.visual && j.visual.visualType;
      if (j.visual && j.visual.filterConfig) err(`${pg}/${v}: filterConfig DENTRO de 'visual' (va en la raiz del visual.json, junto a 'visual')`);
      if (tipo === 'card' && j.visual.objects && j.visual.objects.calloutValue) {
        err(`${pg}/${v}: calloutValue en tarjeta clasica 'card' (pertenece a cardVisual; usar labels/categoryLabels)`);
      }
      const filtros = (j.visual && j.visual.filterConfig) || j.filterConfig;
      if (filtros && /ComparisonKind/.test(JSON.stringify(filtros))) {
        aviso(`${pg}/${v}: ComparisonKind en filtro — preferir filtro categorico con lista de meses/valores`);
      }
      const pos = j.position || {};
      if (typeof pos.x === 'number' && typeof pos.y === 'number' && typeof pos.width === 'number' && typeof pos.height === 'number') {
        if (pos.x < 0 || pos.y < 0 || pos.x + pos.width > ancho || pos.y + pos.height > alto) err(`${pg}/${v}: visual fuera del lienzo (${pos.x},${pos.y},${pos.width}x${pos.height})`);
        else if (pos.y + pos.height > alto - 6) aviso(`${pg}/${v}: borde inferior en ${pos.y + pos.height} (maximo recomendado ${alto - 6})`);
        if (tipo === 'slicer' && pos.height < 60) {
          if (pos.height < 44) err(`${pg}/${v}: slicer height ${pos.height} < 44 — el dropdown se desborda y tapa la fila siguiente`);
          else aviso(`${pg}/${v}: slicer height ${pos.height} < 60 (estandar de casa; riesgo de desborde visual)`);
        }
        if ((tipo === 'tableEx' || tipo === 'pivotTable') && pos.height < 240) aviso(`${pg}/${v}: ${tipo} height ${pos.height} < 240 — puede recortar filas (subir alto o bajar rowPadding)`);
        cajas.push({ id: v, x: pos.x, y: pos.y, r: pos.x + pos.width, b: pos.y + pos.height });
      }
    }
    for (let i = 0; i < cajas.length; i++) for (let k = i + 1; k < cajas.length; k++) {
      const a = cajas[i], b = cajas[k];
      const anchoSolape = Math.min(a.r, b.r) - Math.max(a.x, b.x);
      const altoSolape = Math.min(a.b, b.b) - Math.max(a.y, b.y);
      if (anchoSolape > 1 && altoSolape > 1) aviso(`${pg}: visuales ${a.id} y ${b.id} se solapan (${Math.round(anchoSolape)}x${Math.round(altoSolape)} px) — confirmar si es intencional`);
    }
  }
  // 5. pages.json vs carpetas
  const pj = JSON.parse(fs.readFileSync(path.join(pagesDir, 'pages.json'), 'utf8'));
  for (const id of pj.pageOrder) if (!fs.existsSync(path.join(pagesDir, id, 'page.json'))) err(`pages.json referencia pagina inexistente: ${id}`);
  for (const d of pages) if (!pj.pageOrder.includes(d)) aviso(`Pagina ${d} existe en disco pero no esta en pageOrder`);
}

// 6. Tema registrado: el archivo customTheme debe existir en disco
const rjPath = path.join(rep, 'definition', 'report.json');
if (fs.existsSync(rjPath)) {
  try {
    const rj = JSON.parse(fs.readFileSync(rjPath, 'utf8'));
    const ct = rj.themeCollection && rj.themeCollection.customTheme;
    if (ct && ct.name) {
      const archivo = path.join(rep, 'StaticResources', 'RegisteredResources', ct.name);
      if (!fs.existsSync(archivo)) err(`customTheme '${ct.name}' registrado en report.json pero falta en StaticResources/RegisteredResources/`);
    }
    const pkg = (rj.resourcePackages || []).find(p => p.name === 'RegisteredResources');
    if (pkg && !pkg.items.every(i => fs.existsSync(path.join(rep, 'StaticResources', 'RegisteredResources', i.path)))) {
      err('resourcePackages RegisteredResources referencia archivos inexistentes');
    }
  } catch (e) {}
}

console.log(errores === 0 ? `\nOK: proyecto valido (${avisos} avisos)` : `\nFALLO: ${errores} errores, ${avisos} avisos`);
process.exit(errores === 0 ? 0 : 1);
