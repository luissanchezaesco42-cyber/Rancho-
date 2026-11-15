# APK de Rancho Menús

Contenedor Android (WebView) que lleva dentro la misma app de `../menu-app`.
Importas tu `.zip` una sola vez: los datos quedan guardados en el teléfono. Exportar sirve como respaldo.
En la APK, **Exportar** guarda el `.zip` y el PDF en la carpeta **Descargas** del teléfono.

## Compilar
Ubuntu/Debian (no necesita Gradle ni el SDK oficial):

    sudo apt-get install aapt apksigner zipalign dalvik-exchange libandroid-23-java default-jdk-headless
    ./build.sh          # genera build/rancho-menu.apk

La primera vez crea `rancho-release.keystore` (clave `rancho2026`, configurable con `KS` y `KSPASS`).
Guarda ese archivo: para actualizar la app instalada, la APK nueva debe firmarse con la misma llave.

Requiere Android 10 (API 29) o superior.
