# Juego estilo Dragon City (Android nativo, Kotlin) — Diseño

## Objetivo
APK Android offline en español: construir una isla con hábitats, criar y fusionar dragones, combatir por turnos y gestionar economía/tienda. Gráficos dibujados por código (sin PNG).

## Supuestos
- 100 % offline, sin cuentas ni compras reales; las gemas son moneda interna.
- Progreso guardado en el dispositivo (JSON); temporizadores y producción calculados con marca de tiempo al reabrir.
- Contenido inicial: 6 elementos (Fuego, Agua, Planta, Tierra, Aire, Rayo), 12 especies.
- UI en español.

## Arquitectura
Una única `View` personalizada con bucle de dibujo (Choreographer) que pinta ciudad, menús y combate en Canvas.

| Paquete | Responsabilidad | Depende de |
|---|---|---|
| `model` | Datos puros: `Element`, `Species`, `Dragon`, `Habitat`, `GameState` | — |
| `logic` | Reglas puras: ventajas elementales, fusión, daño, XP/nivel, producción, temporizadores | `model` |
| `data` | Guardado/carga JSON, progreso offline | `model` |
| `render` | Dibujo de dragones, isla, hábitats, efectos | `model` |
| `ui` | Pantallas Ciudad, Criadero, Tienda, Combate, Colección; navegación inferior | todos |

`model` y `logic` no importan nada de Android, por lo que se prueban con tests unitarios JVM.

## Reglas
- **Hábitats:** cada uno acepta dragones de un elemento y tiene capacidad. Cada dragón produce oro/minuto según nivel y especie. El oro se acumula (con tope) hasta recogerlo.
- **Economía:** oro (hábitats, comida), comida (sube XP del dragón), gemas (acelerar incubación, compras premium internas).
- **Fusión:** dos dragones de distinto elemento dan una especie definida por tabla de recetas (con alguna probabilidad de resultado alternativo); incubación con temporizador.
- **Combate:** 1 vs 1 por turnos. Ataque básico y habilidad con enfriamiento. Multiplicadores elementales (x2 ventaja, x0.5 desventaja). Victoria da oro, XP y gemas ocasionales; hay oleadas de enemigos de dificultad creciente.
- **Progreso:** nivel máximo de dragón 20; mejora de estadísticas por nivel.

## Pruebas
Tests unitarios de `logic` (ventajas, daño, fusión, XP, producción offline) y de `data` (round-trip de guardado). Compilación del APK con Gradle.

## Fuera de alcance
Multijugador, servidores, anuncios, compras reales, eventos, sonido avanzado.
