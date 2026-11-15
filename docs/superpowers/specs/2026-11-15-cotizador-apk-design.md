# Cotizador (APK) — diseño

## Intención y por qué
El usuario necesita crear documentos comerciales profesionales (cotizaciones, luego remisiones y facturas) con el estilo de la factura de Cytech Calidad y Tecnología S.A.S. (Barranquilla, Colombia). Debe funcionar en celular y PC. Primera etapa: solo cotizaciones, entregadas como APK de Android.

## Objetivos
- Crear, guardar, buscar, duplicar y editar cotizaciones.
- PDF con aspecto profesional, basado en la factura de referencia: encabezado de empresa, bloque de cliente, condiciones, tabla de ítems, totales y total en letras.
- Compartir el PDF (WhatsApp/correo) desde el celular.
- Compilar un APK instalable sin necesitar el SDK de Android local.

## No objetivos (por ahora)
Remisiones, facturas, facturación electrónica DIAN, varios usuarios, inventario, sincronización PC-celular, publicación en Play Store.

## Antiobjetivos
Una app que genere un PDF que parezca factura electrónica válida ante la DIAN (CUFE, QR, firma). Las cotizaciones deben decir claramente que son cotizaciones.

## Restricciones
- Entorno de desarrollo: Java, Node 22 y Gradle disponibles; sin Android SDK.
- Moneda COP, sin decimales; IVA 19 % por defecto, editable por ítem.
- Funciona sin internet; datos locales.

## Enfoques considerados
1. **App web (HTML/CSS/JS) empaquetada con Capacitor; APK compilado en GitHub Actions (elegido).** Un solo código para celular y PC; no depende de instalar el SDK aquí. Contra: APK solo de pruebas (debug).
2. App web instalable (PWA) sin APK: más simple, pero el usuario pidió APK.
3. Instalar el SDK de Android en el entorno y compilar aquí: depende de que la red permita descargarlo; incierto.
4. App nativa Android (Kotlin) o programa de escritorio aparte: dos proyectos que mantener; descartado.

El usuario aprobó el enfoque 1.

## Decisiones (del asistente, aprobadas en conversación)
- Datos en almacenamiento local del dispositivo (localStorage/IndexedDB).
- Datos de empresa (nombre, NIT, dirección, teléfono, correo, logo) configurables una vez.
- Clientes y productos guardados y reutilizables.
- Ítem: referencia, descripción, unidad, cantidad, valor unitario, % descuento, % IVA.
- Totales: bruto, descuento, IVA, total; total en letras en español.
- Consecutivo automático COT-0001…, fecha, validez, forma de pago, vendedor, observaciones.
- PDF generado en el cliente y compartido con la hoja de compartir del sistema.
- APK debug generado por un workflow de GitHub Actions y descargable como artefacto.

## A criterio del constructor
Elección de librería de PDF, estructura de carpetas, estilos exactos, pruebas del cálculo de totales y del conversor de número a letras.
