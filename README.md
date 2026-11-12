# Dragones del Rancho

Juego para Android estilo Dragon City, en Kotlin nativo, 100 % offline y en español.
Los gráficos se dibujan por código (sin imágenes).

## Instalar
Descarga `dist/dragones-del-rancho.apk` en tu móvil (Android 8.0 o superior) y ábrelo.
Android pedirá permitir "instalar apps de origen desconocido" para tu navegador o gestor de archivos.

## Cómo se juega
- **Ciudad:** construye hábitats en la isla, coloca dragones del mismo elemento y toca las monedas para recoger el oro que producen (también mientras la app está cerrada, hasta un tope).
- **Criadero:** fusiona dos dragones para obtener un huevo. Algunas parejas de elementos dan dragones híbridos (consulta las recetas). Puedes acelerar la incubación con gemas.
- **Batalla:** combate por turnos contra oleadas cada vez más fuertes (jefe cada 5). Ataque básico y habilidad con enfriamiento. Ventajas elementales: x2 / x0.5.
- **Colección:** alimenta dragones para subirlos de nivel (máx. 20) o véndelos.
- **Tienda:** dragones básicos, hábitats, comida y gemas (se compran con oro).

## Compilar
Requiere JDK 17+ y el SDK de Android (plataforma 34).

```
echo "sdk.dir=/ruta/al/android-sdk" > local.properties
gradle :app:assembleRelease      # APK en app/build/outputs/apk/release/
gradle :app:testDebugUnitTest    # tests de lógica y capturas de pantalla (build/shots)
```

El APK de release se firma con la clave de depuración para poder instalarse directamente.
Para publicarlo en Google Play habría que firmarlo con tu propia clave.

## Estructura
`model` (datos) · `logic` (reglas y combate, sin Android) · `data` (guardado JSON) · `render` (dibujo de dragones) · `ui` (pantallas).
Diseño completo en `docs/superpowers/specs/`.
