# Rancho Ruiseñor · Menú Studio

Sin base de datos ni almacenamiento del navegador. Flujo de trabajo:

1. `cd menu-app && node server.mjs` y abre http://127.0.0.1:4173
2. Al abrir, **importa** tu `.zip` (o pulsa "Empezar de cero" la primera vez).
3. Edita productos, precios e imágenes.
4. **Exporta** (`Exportar datos (.zip)`): genera `data.json` + carpeta `images/`.
   Ese mismo `.zip` se importa la próxima vez para seguir trabajando.

Si cierras la pestaña con cambios sin exportar, el navegador avisa.
