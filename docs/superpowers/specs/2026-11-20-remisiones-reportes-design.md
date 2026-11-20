# Remisiones, reportes y anexos — diseño (etapa 2)

## Intención
Completar el flujo de cotizar → entregar. Quitar de la app todo lo de facturas: la factura electrónica la emite un proveedor tecnológico autorizado por la DIAN, no esta app. Convertir en funciones reales todo lo que aún decía "Pronto".

## Alcance
- **Quitar facturas:** menú, botones, tarjetas, prefijo y "convertir en factura". La cotización sigue diciendo que no es factura de venta.
- **Remisiones (notas de entrega):** crear, editar, duplicar, eliminar, buscar, filtrar por estado, exportar CSV, compartir PDF. Numeración propia (REM-0001), prefijo y próximo número configurables.
- **Convertir cotización en remisión:** copia cliente e ítems y guarda la referencia a la cotización de origen.
- **Reportes:** resumen por periodo de cotizaciones y remisiones.
- **Anexos:** adjuntar fotos a una cotización; salen como páginas finales del PDF.

## Decisiones (mías, corregibles)
- Remisión: campos fecha, cliente, dirección de entrega, orden de compra, despachado por, transporte/placa, observaciones, cotización de origen. Estados: Pendiente, Entregada, Anulada.
- La remisión no muestra precios por defecto; una casilla "Mostrar valores" los incluye (con totales). El PDF lleva espacios de firma de "Entregado por" y "Recibido por (nombre, cédula y fecha)".
- Reportes: periodos Este mes / Mes anterior / Últimos 3 meses / Este año / Todo. Tasa de aprobación = aprobadas ÷ (enviadas + aprobadas + rechazadas). Top 5 clientes y productos por valor. Tendencia de los últimos 6 meses.
- Anexos: solo imágenes (se reducen a 1280 px, JPEG), máximo 5 por cotización, por el límite de almacenamiento del teléfono. No se admiten PDF.
- Menú del celular: Inicio, Cotizaciones, Remisiones, Clientes, Más. Productos, Reportes y Empresa pasan a "Más".

## No objetivos
Facturas y facturación electrónica (proveedor externo), inventario, varios usuarios, sincronización.

## Riesgos
Almacenamiento local limitado (~5 MB): se avisa con un mensaje claro si no hay espacio al guardar.
