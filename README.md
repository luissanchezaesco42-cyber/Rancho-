# Cotizador

App para crear cotizaciones y remisiones profesionales (celular y PC), con PDF, reportes y copia de seguridad. Los datos se guardan en el dispositivo y funciona sin internet.

## Instalar el APK en Android
1. En GitHub abre la pestaña **Actions** → la última ejecución de **Compilar APK**.
2. Descarga el artefacto **cotizador-debug-apk** (un .zip) y extrae `app-debug.apk`.
3. Pásalo al celular e instálalo (Android pedirá permitir instalar de orígenes desconocidos).

## Usar en el PC
```bash
npm install
npm run dev     # abre la app en el navegador
npm test        # pruebas
```

## Primeros pasos en la app
1. **Empresa:** escribe tus datos y sube tu logo.
2. **Clientes / Productos:** opcional, para reutilizarlos.
3. **Cotizaciones → + Nueva**, y luego **Compartir PDF**.

## Qué incluye
- **Cotizaciones:** estados, retenciones, anexos (fotos), exportar a Excel, enviar por correo.
- **Remisiones:** numeración propia, conversión desde una cotización, PDF con firmas de entrega y recibo.
- **Reportes:** por periodo, con clientes y productos principales.
- **Copia de seguridad** de todos los datos.

Las facturas electrónicas no se emiten desde esta app (las hace un proveedor autorizado por la DIAN). Las cotizaciones y remisiones lo indican en el PDF.
