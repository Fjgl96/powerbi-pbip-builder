# Patrones TMDL (modelo semántico)

Reglas que no fallan: **indentación SOLO con tabuladores** (un espacio = riesgo de parseo), nombres de tabla con espacios van entre comillas simples (`'Tabla de Medidas'`), `lineageTag` opcional en columnas (Desktop lo agrega al guardar), **una sola definición por medida** (duplicarla impide abrir el PBIP) y **cultura explícita** en el paso de tipos M.

## database.tmdl
```
database
	compatibilityLevel: 1606
```

## model.tmdl
```
model Model
	culture: es-ES
	defaultPowerBIDataSourceVersion: powerBI_V3
	sourceQueryCulture: es-ES

annotation PBI_QueryOrder = ["Ventas","Presupuesto","Clientes","Productos","Vendedores","Calendario","Medidas"]

annotation __PBI_TimeIntelligenceEnabled = 0

ref table Ventas
ref table Presupuesto
ref table Clientes
ref table Productos
ref table Vendedores
ref table Calendario
ref table Medidas
```
- `__PBI_TimeIntelligenceEnabled = 0` evita que Desktop genere las `LocalDateTable_*` (16 tablas basura en el Molinos).
- La lista `PBI_QueryOrder` define el orden del panel Datos.

## Tabla de hechos desde CSV (patrón M)

```
table Ventas
	lineageTag: <guid>

	partition Ventas = m
		mode: import
		source =
				let
				    Origen = Csv.Document(File.Contents("C:\ruta\ventas.csv"), [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
				    #"Encabezados promovidos" = Table.PromoteHeaders(Origen, [PromoteAllScalars = true]),
				    #"Tipo cambiado" = Table.TransformColumnTypes(#"Encabezados promovidos", {{"venta_id", Int64.Type}, {"fecha_venta", type date}, {"importe_venta", type number}, {"cantidad", type number}}, "en-US")
				in
				    #"Tipo cambiado"

	column venta_id
		dataType: int64
		isHidden
		summarizeBy: none
		sourceColumn: venta_id

		annotation SummarizationSetBy = Automatic

	column fecha_venta
		dataType: dateTime
		formatString: Short Date
		summarizeBy: none
		sourceColumn: fecha_venta

		annotation SummarizationSetBy = Automatic

	column importe_venta
		dataType: double
		formatString: #,0
		summarizeBy: sum
		sourceColumn: importe_venta

		annotation SummarizationSetBy = Automatic
```

Puntos clave:
- `Encoding = 65001` (UTF-8 con BOM) y `QuoteStyle.Csv` (tolera comas dentro de comillas).
- **Cultura explícita en el cambio de tipos**: `Table.TransformColumnTypes(..., "en-US")`. Sin ese argumento el CSV invariante se parsea con la cultura del modelo (`es-ES`): `2424.15` → `242415` → total inflado ×75-90 (caso real: S/ 1,816,317,649 en lugar de 24,018,370). El modelo sigue en `es-ES`; la cultura del paso de tipos va aparte.
- IDs ocultos con `isHidden` + `summarizeBy: none`; montos con `summarizeBy: sum`.
- `dataType: dateTime` aunque el M sea `type date` (el motor guarda fechas como datetime).
- Columnas derivadas mejor en M que como columnas calculadas DAX:
  `Table.AddColumn(#"Tipo cambiado", "FechaPresup", each #datetime([anio], [mes], 1, 0, 0, 0), type datetime)`
  ⚠️ `#datetime` exige **6 argumentos** (año, mes, día, hora, minuto, segundo). `#date` exige 3.

## Tabla dimensión
Igual que hechos, pero todas las columnas de negocio visibles con `summarizeBy: none` y el ID oculto.

## Calendario desde calendario.csv del usuario (recomendado)
Partición M que lee el CSV, renombrando `fecha → Date`, `anio_mes → MesAnio` y `mes_nombre → nombre_mes`. **Todo nombre de columna del CSV debe coincidir con el `sourceColumn` declarado en el TMDL**: si el M no renombra, el refresh por MCP falla con *"The 'nombre_mes' column does not exist in the rowset"* (aunque Desktop a veces lo tolere por posición). Columna de orden: si `MesAnio` es `yyyy-MM`, ordena lexicográfico correcto sin `sortByColumn`. Si es `MM-yyyy`, agregar columna `OrdenMes` entera y `sortByColumn: OrdenMes` en `MesAnio`.
**Recortar el calendario al último hecho**: `Table.SelectRows(#"Tipo cambiado", each [fecha] <= #date(2026, 6, 30))` (fecha del último registro real). Un mes extra futuro rompe `TOTALYTD` (tarjetas YTD en blanco aunque el mensual funcione).

## Tabla de medidas
```
table Medidas
	partition Medidas = calculated
		mode: import
		source =
				ROW("Dummy", 1)

	column Dummy
		dataType: int64
		isHidden
		summarizeBy: none
		sourceColumn: Dummy

		annotation SummarizationSetBy = Automatic

	measure 'Venta Real' = SUM(Ventas[importe_venta])
		formatString: #,0
		lineageTag: <guid>

	measure 'Cumplimiento %' = DIVIDE([Venta Real], [Venta Ppto])
		formatString: 0.0%
		lineageTag: <guid>
```
⚠️ Las tablas calculadas DAX a mano son la causa #1 de `Id. de columna no válido` al abrir. Para calendarios usa M, no `CALENDAR()`.

## relationships.tmdl
```
relationship Ventas_Calendario
	fromColumn: Ventas.fecha_venta
	toColumn: Calendario.Date

relationship Ventas_Clientes
	fromColumn: Ventas.cliente_id
	toColumn: Clientes.cliente_id
```
- `fromColumn` = lado muchos, `toColumn` = lado uno (dimensión). Cardinalidad se infiere.
- Solo UNA relación activa por par de tablas.
- **Una sola ruta por dimensión→hecho**: si `Ventas` llega a `Zonas` por `Clientes` y también por `Vendedores`, Desktop no abre (`PFE_XL_USERELATIONSHIP_AMBIGUOUS_PATH — 'Ventas'->'Clientes'->'Zonas' y 'Ventas'->'Vendedores'->'Zonas'`). Elegir la ruta oficial (la geográfica: `Clientes.zona_id → Zonas`) y dejar el atributo sobrante (`Vendedores.zona_id`) sin relación. Antes de relacionar: listar todos los caminos dimensión→hecho y decidir cuál es el oficial.
- **Nunca relacionar un hecho con una dimensión por un atributo que el hecho no tiene** (el modelo compila pero las medidas del hecho no responden a esa dimensión).

## Medidas recomendadas para Real vs Presupuesto
```
measure 'Venta Real' = SUM(Ventas[importe_venta])            -- #,0
measure 'Venta Ppto' = SUM(Presupuesto[monto_presup])        -- #,0
measure 'Cumplimiento %' = DIVIDE([Venta Real], [Venta Ppto]) -- 0.0%
measure 'Desviación' = [Venta Real] - [Venta Ppto]            -- #,0
measure 'Venta Real YTD' = TOTALYTD([Venta Real], Calendario[Date])  -- #,0
```
Siempre `DIVIDE` (nunca `/`), siempre formato en la medida, y nombres en español sin caracteres raros.

⚠️ **Unicidad de medidas**: el generador debe emitir cada medida UNA sola vez. Un duplicado (doble edición) produce al abrir: *"No se pueden combinar objetos TMDL porque ambos declaran la misma propiedad: expression — Measure 'X'"*. `valida_pbip.js` lo detecta; no ignorar su aviso.
