# Auditoría de modelos semánticos existentes

Caso real de referencia: "Control de Presupuesto" (Molinos Asociados) — 42 tablas, 85 medidas, donde ~38 medidas devolvían ≈0 por una relación faltante.

## Conexión (Power BI Desktop abierto con el modelo)

Servidor MCP `powerbi-modeling-mcp` ya registrado a nivel usuario (funciona para cualquier modelo):
1. `connection_operations` → `ListLocalInstances` → identifica puerto/PID y título de ventana (confirma qué archivo está abierto).
2. `connection_operations` → `Connect` con `Data Source=localhost:<puerto>;Application Name=MCP-PBIModeling`.
3. Si algo recién creado da "needs to be recalculated": `model_operations` → `Refresh` con `refreshType: Calculate`. La llamada hace timeout a los 30s pero el proceso sigue en background: esperar 60-90s y reintentar la consulta.

## Checklist de auditoría (en este orden)

1. **Inventario**: `table_operations List` (tablas, columnas, medidas por tabla), `measure_operations List` + `Get` de TODAS las expresiones, `relationship_operations List` completo, `partition_operations Get` (código M = lineage real de fuentes).
2. **Integridad de relaciones vs medidas**: para cada medida que filtra por una dimensión, verificar que exista la relación. Síntoma clásico de relación faltante: medida que filtra `DIM_X` pero suma de un hecho sin relación → devuelve ≈0 (partida doble) o el total sin filtrar.
   - Prueba ground truth: `TREATAS` construye el puente a mano:
     ```dax
     EVALUATE ROW(
       "MedidaActual", [Ventas],
       "MedidaCorrecta", CALCULATE(-SUM('Libro Diario'[Total]),
           TREATAS(SELECTCOLUMNS(FILTER(DIM_PCGA, [Descripcion Cta2D]="VENTAS"), "C", [AcctCode]),
                   'Libro Diario'[CTA_7D]))
     )
     ```
     Si actual ≈ 0 y TREATAS = 143.6M → confirmado. Esto además sirve de medida puente temporal.
3. **Calidad de claves**: cobertura FK (filas del hecho sin match en dimensión via `LOOKUPVALUE`/`EXCEPT`), duplicados en claves de dimensiones (`DISTINCTCOUNT` vs `COUNTROWS`), blancos en columnas de análisis (ej. 60% sin Centro de Costo).
4. **Generaciones de medidas**: buscar patrones viejos (`FILTER(ALL(...))`, `IFERROR(...,"")`, fechas hardcodeadas `DATE(2022,12,31)`, hack `0+CALCULATE`) vs nuevos (`VAR`, `KEEPFILTERS+TREATAS`, `SELECTEDVALUE`, `DIVIDE` con BLANK). Buscar duplicadas exactas y versiones conviviendo (X y X_Limitada).
5. **Inconsistencias lógicas**: rangos de cuentas distintos entre medidas hermanas (70-77 vs 70-76), `Clase` contradictoria (ESF vs EERR para el mismo rango), signos (ingresos como créditos llegan negativos: ¿se niegan?).
6. **Tablas problemáticas**: huérfanas (sin relaciones ni medidas que las usen), copias del mismo origen (mismo tamaño = mismo contenido), dimensiones duplicadas (dos tablas leyendo la misma entidad del dataflow), `Table.Distinct` por cuenta en el M (¡conserva fila arbitraria — NO es un saldo confiable!), tablas calculadas de millones de filas (memoria).
7. **Plan contable / jerarquías**: unicidad de códigos, población de campos de clasificación (91% sin tipo de gasto = oportunidad), jerarquía 2D→5D completa.

## Presentación de resultados

Informe con: crítico (rompe números) / inconsistencias / calidad de datos / redundancia. Con cifras reales de las pruebas DAX, no suposiciones. Luego **re-consultar alcance** antes de escribir (corrección mínima vs limpieza estructural vs nada).

## Correcciones típicas (seguras y reversibles)

- Crear relación ManyToOne faltante (validar antes: claves 100% matcheadas, único lado único).
- Corregir filtros contradictorios en medidas (`Clase="ESF"` para cuentas EERR).
- Negar ingresos en resultados: `-([EvolucionIngresos]) - [EvolucionGastos]`.
- Mover duplicadas a `displayFolder: "ZZ_Deprecadas (no usar)"` (no borrar: los visuales pueden usarlas).
- Renombrar tablas riesgosas (`ZZ_MiTabla_REVISAR`) solo si ningún visual las referencia (verificar con grep de `"Entity"` en los visuales del reporte si es PBIP).
- Eliminar tablas con `shouldCascadeDelete: true` solo tras verificar que ninguna medida ni visual las usa.

## Para replicar el modelo en otros agentes (Claude, etc.)

El MCP `powerbi-modeling-mcp` registrado a nivel usuario + los patrones PBIP de este skill son agnósticos del cliente. El mismo `.pbip` se abre en Desktop y el mismo servidor MCP se registra en cualquier host compatible.
