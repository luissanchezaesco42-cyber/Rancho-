# Cotizador (APK) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una app de cotizaciones profesionales (celular y PC) empaquetada como APK de Android, con PDF al estilo de la factura de Cytech.

**Architecture:** App web de JavaScript sin framework (Vite + módulos ES), datos en `localStorage`, PDF generado en el cliente con jsPDF. Capacitor la empaqueta como app Android; un workflow de GitHub Actions compila el APK debug.

**Tech Stack:** Vite, Vitest + jsdom, jsPDF + jspdf-autotable, Capacitor (core, cli, android, filesystem, share), GitHub Actions (Java 21, Node 22).

**Spec:** `docs/superpowers/specs/2026-11-15-cotizador-apk-design.md`

## Global Constraints

- Idioma de toda la interfaz y del PDF: español de Colombia. Moneda COP, sin decimales (`$ 1.234.567`, punto como separador de miles).
- IVA por defecto 19 %, editable por ítem. Descuento en % por ítem.
- Consecutivo `COT-0001` (4 dígitos, relleno con ceros), automático.
- El PDF dice "COTIZACIÓN" y nunca aparenta ser factura electrónica (sin CUFE, QR ni firma).
- Funciona sin internet: ninguna librería se carga desde CDN.
- Datos solo en el dispositivo (`localStorage`, claves con prefijo `cotizador.`).
- Capacitor: `appId` `com.rancho.cotizador`, `appName` `Cotizador`, `webDir` `dist`.
- APK debug, descargable como artefacto `cotizador-debug-apk` de GitHub Actions.
- Todo el código vive en la raíz del repo; no hay backend.

## Review Focus

1. Campos numéricos vacíos, con texto o negativos y descuento fuera de 0–100: se tratan como 0 (o se limitan a 0–100), nunca `NaN` en pantalla ni en el PDF (Tareas 2 y 7).
2. Cantidades decimales (la factura de referencia usa metros, "Lm"): los totales se redondean por línea a pesos enteros y suman igual que lo mostrado (Tarea 2).
3. Borrar la última cotización no debe reutilizar su número (Tarea 3).
4. Almacenamiento vacío o con JSON dañado: la app abre con valores por defecto (Tarea 3).
5. Descripciones largas y muchas ítems: el PDF ajusta el texto y pagina sin cortar filas; una cotización sin ítems igual genera un PDF válido (Tarea 4).

---

### Task 1: Proyecto base y total en letras

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `src/main.js`
- Create: `src/lib/numberToWords.js`
- Test: `tests/numberToWords.test.js`

**Interfaces:**
- Produces: `numberToWords(amount: number): string` — texto en mayúsculas terminado en `PESOS CON 00/100 M.L.` (`PESO` si es 1). Redondea al entero; lanza `RangeError` si es negativo o no finito; soporta hasta 999.999.999.999.

- [ ] **Step 1: Crear el proyecto.** `package.json` con `"type": "module"` y scripts `dev`, `build` (`vite build`), `test` (`vitest run`). Dependencias de desarrollo: `vite`, `vitest`, `jsdom`; dependencias: `jspdf`, `jspdf-autotable`. `vite.config.js` con `base: './'` y `test: { environment: 'jsdom' }`. `.gitignore`: `node_modules`, `dist`, `android/app/build`, `android/build`, `android/.gradle`, `android/local.properties`. `index.html` con `<div id="app">` y `<script type="module" src="/src/main.js">`, meta viewport y `lang="es"`. Ejecutar `npm install`.
- [ ] **Step 2: Escribir las pruebas que fallan** en `tests/numberToWords.test.js` con estos casos exactos:
  - `numberToWords(864443)` → `'OCHOCIENTOS SESENTA Y CUATRO MIL CUATROCIENTOS CUARENTA Y TRES PESOS CON 00/100 M.L.'` (el total real de la factura de referencia)
  - `0` → `'CERO PESOS CON 00/100 M.L.'`; `1` → `'UN PESO CON 00/100 M.L.'`; `21` → `'VEINTIÚN PESOS CON 00/100 M.L.'`
  - `100` → `'CIEN PESOS CON 00/100 M.L.'`; `1000` → `'MIL PESOS CON 00/100 M.L.'`
  - `1000000` → `'UN MILLÓN DE PESOS CON 00/100 M.L.'`; `2500000` → `'DOS MILLONES QUINIENTOS MIL PESOS CON 00/100 M.L.'`
  - `-5` y `NaN` lanzan `RangeError`.
- [ ] **Step 3: Verificar que fallan:** `npx vitest run tests/numberToWords.test.js` → FAIL (módulo no existe).
- [ ] **Step 4: Implementar `numberToWords`** en `src/lib/numberToWords.js` (algoritmo por grupos de millones/miles/unidades con las reglas de "UN"/"VEINTIÚN", "CIEN"/"CIENTO", "DE" antes de PESOS cuando el último grupo es millón exacto).
- [ ] **Step 5: Verificar que pasan:** mismo comando → PASS.
- [ ] **Step 6: Commit** `feat: project scaffold and amount in words`.

---

### Task 2: Cálculo de totales y formato

**Files:**
- Create: `src/lib/totals.js`, `src/lib/format.js`
- Test: `tests/totals.test.js`, `tests/format.test.js`

**Interfaces:**
- Produces (`totals.js`):
  - `type Item = { ref: string, description: string, unit: string, qty: number, unitPrice: number, discountPct: number, ivaPct: number }`
  - `toNumber(v: unknown): number` — vacío, texto no numérico, `NaN` o negativo → 0; acepta coma decimal (`"2,5"` → 2.5).
  - `calcLine(item: Item): { gross: number, discount: number, iva: number, total: number }` — `gross = round(qty*unitPrice)`; `discount = round(gross*clamp(discountPct,0,100)/100)`; `iva = round((gross-discount)*ivaPct/100)`; `total = gross-discount+iva`. Todo entero.
  - `calcTotals(items: Item[]): { gross: number, discount: number, iva: number, total: number }` — suma de las líneas.
- Produces (`format.js`): `formatCOP(n: number): string` (`1234567` → `'$ 1.234.567'`, negativos `'-$ 1.000'`), `formatDate(iso: string): string` (`'2026-11-15'` → `'15/11/2026'`), `addDays(iso: string, days: number): string`, `todayISO(): string`, `formatNumber(n: number): string` (cantidad: entero sin decimales, decimal hasta 2 con coma: `2.5` → `'2,5'`).

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `calcLine({qty:2, unitPrice:10000, discountPct:10, ivaPct:19, ...})` → `{gross:20000, discount:2000, iva:3420, total:21420}`
  - `calcLine` con `qty: 2.5`, `unitPrice: 9850`, `ivaPct: 0` → `gross: 24625`
  - `calcLine` con `discountPct: 150` → `discount === gross`; con `discountPct: -20` → `discount === 0`
  - `calcLine` con `qty: NaN` y `unitPrice: '' as any` → todos 0
  - `calcTotals([])` → todo 0; `calcTotals` de dos líneas suma `gross`, `discount`, `iva` y `total` y `total === gross - discount + iva`
  - `toNumber('2,5') === 2.5`, `toNumber('abc') === 0`, `toNumber(-3) === 0`
  - `formatCOP`, `formatDate`, `addDays('2026-11-30', 15) === '2026-12-15'`, `formatNumber` con los ejemplos anteriores.
- [ ] **Step 2: Verificar que fallan:** `npx vitest run tests/totals.test.js tests/format.test.js` → FAIL.
- [ ] **Step 3: Implementar** las funciones con las firmas de arriba. `formatCOP` y `formatNumber` sin `Intl` (regex de miles) para no depender del WebView.
- [ ] **Step 4: Verificar que pasan** → PASS.
- [ ] **Step 5: Commit** `feat: quote totals and formatting`.

---

### Task 3: Almacenamiento local

**Files:**
- Create: `src/lib/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: `Item`, `todayISO` de tareas anteriores.
- Produces:
  - `type Company = { name, nit, address, city, phone, email: string, logoDataUrl: string | null, defaultIva: number }` (defecto: textos vacíos, `logoDataUrl: null`, `defaultIva: 19`)
  - `type Client = { id: string, name, nit, city, address, phone, email: string }`
  - `type Product = { id: string, ref, description, unit: string, unitPrice: number, ivaPct: number }`
  - `type Quote = { id: string, number: string, date: string, validDays: number, paymentTerms: string, seller: string, notes: string, client: Omit<Client,'id'>, items: Item[] }`
  - `loadCompany(): Company`, `saveCompany(c: Company): void`
  - `listClients(): Client[]`, `saveClient(c: Omit<Client,'id'> & { id?: string }): Client`, `deleteClient(id: string): void`
  - `listProducts(): Product[]`, `saveProduct(p: Omit<Product,'id'> & { id?: string }): Product`, `deleteProduct(id: string): void`
  - `listQuotes(): Quote[]` (más reciente primero), `getQuote(id: string): Quote | undefined`
  - `saveQuote(q: Omit<Quote,'id'|'number'> & { id?: string, number?: string }): Quote` — si es nueva, asigna `id` y el siguiente número
  - `deleteQuote(id: string): void`, `duplicateQuote(id: string): Quote` (nuevo número, fecha de hoy, mismos ítems y cliente)
  - `resetStoreForTests(): void` solo borra claves con prefijo `cotizador.`.
- El contador de consecutivo se guarda aparte (`cotizador.counter`), nunca se deriva de las cotizaciones existentes.

- [ ] **Step 1: Escribir las pruebas que fallan** (con `localStorage.clear()` en `beforeEach`):
  - `loadCompany()` sin datos → `defaultIva === 19`, `logoDataUrl === null`
  - la primera `saveQuote` devuelve `number === 'COT-0001'`, la segunda `'COT-0002'`
  - **borrar `COT-0002` y guardar otra → `'COT-0003'`**
  - guardar con `id` existente actualiza sin cambiar `number` ni crear duplicados
  - `duplicateQuote` devuelve un número nuevo y `date === todayISO()`
  - con `localStorage.setItem('cotizador.quotes', '{no es json')` → `listQuotes()` devuelve `[]` y `loadCompany()` los valores por defecto, sin lanzar
  - `saveClient` asigna `id` y `listClients` lo devuelve; `deleteClient` lo quita.
- [ ] **Step 2: Verificar que fallan:** `npx vitest run tests/store.test.js` → FAIL.
- [ ] **Step 3: Implementar** con un par de helpers privados `read(key, fallback)` (try/catch + `JSON.parse`) y `write(key, value)`. Ids con `crypto.randomUUID()`.
- [ ] **Step 4: Verificar que pasan** → PASS.
- [ ] **Step 5: Commit** `feat: local storage layer`.

---

### Task 4: Generación del PDF

**Files:**
- Create: `src/lib/pdf.js`
- Test: `tests/pdf.test.js`

**Interfaces:**
- Consumes: `Quote`, `Company`, `calcLine`, `calcTotals`, `numberToWords`, `formatCOP`, `formatDate`, `addDays`, `formatNumber`.
- Produces: `buildQuotePdf(quote: Quote, company: Company): jsPDF` y `quotePdfFileName(quote: Quote): string` (`'COT-0001.pdf'`).
- Diseño A4 vertical, mismo orden que la factura de referencia: (1) encabezado con logo a la izquierda (si hay) y a su lado nombre, NIT, dirección, teléfono y correo de la empresa; recuadro a la derecha con "COTIZACIÓN" y el número; (2) recuadro del cliente (Cliente, NIT/Cédula, Ciudad, Dirección, Teléfono); (3) fila con Fecha, Válida hasta, Forma de pago, Vendedor; (4) tabla con columnas ITEM, REFERENCIA, DESCRIPCIÓN, UND, CANT., VR. UNIDAD, %DCTO, TOTAL; (5) bloque de totales (TOTAL BRUTO, DESCUENTO, VALOR IVA, TOTAL A PAGAR); (6) `SON: <numberToWords(total)>`; (7) observaciones; (8) pie "Esta cotización no constituye factura de venta. Precios sujetos a cambio después de la fecha de vigencia." Usar `jspdf-autotable` para la tabla, con cabecera repetida en cada página.

- [ ] **Step 1: Escribir las pruebas que fallan** (documento con `compress: false` para poder buscar texto en `doc.output()`):
  - con una cotización de 3 ítems: la salida empieza con `%PDF`, contiene `COT-0001`, el nombre del cliente y la frase `SON:`; `doc.getNumberOfPages() === 1`
  - con 80 ítems: `getNumberOfPages() > 1`
  - con una descripción de 300 caracteres: no lanza y el PDF contiene el inicio de la descripción
  - con `items: []`: genera un PDF válido (empieza con `%PDF`) y el texto `CERO PESOS`
  - con `company.logoDataUrl === null` no lanza; con un PNG de 1×1 en data URL no lanza
  - `quotePdfFileName` devuelve `'COT-0001.pdf'`.
- [ ] **Step 2: Verificar que fallan:** `npx vitest run tests/pdf.test.js` → FAIL.
- [ ] **Step 3: Implementar** `buildQuotePdf` y `quotePdfFileName`. Colores sobrios (gris oscuro y una línea de acento), fuente Helvetica, recuadros con `doc.rect`.
- [ ] **Step 4: Verificar que pasan** → PASS.
- [ ] **Step 5: Commit** `feat: quote pdf generation`.

---

### Task 5: Estructura de la app y datos de la empresa

**Files:**
- Create: `src/ui/dom.js`, `src/ui/router.js`, `src/ui/screens/company.js`, `src/styles.css`
- Modify: `src/main.js`
- Test: `tests/router.test.js`, `tests/company.test.js`

**Interfaces:**
- Consumes: `loadCompany`, `saveCompany`.
- Produces:
  - `h(tag: string, attrs?: Record<string, any>, ...children: (Node | string)[]): HTMLElement` — `attrs` admite `class`, `on<Evento>` (funciones) y atributos normales.
  - `matchRoute(hash: string): { name: 'quotes' | 'quote' | 'clients' | 'products' | 'company', params: Record<string,string> }` — `''`/`'#/'` → `quotes`; `'#/quote/new'` → `quote` con `{ id: 'new' }`; `'#/quote/abc'` → `quote` con `{ id: 'abc' }`; desconocida → `quotes`.
  - Cada pantalla exporta `render(params: Record<string,string>): HTMLElement`.
  - `main.js` monta una barra de navegación (Cotizaciones, Clientes, Productos, Empresa; abajo en celular, a la izquierda en pantallas anchas) y repinta al cambiar `location.hash`.

- [ ] **Step 1: Escribir las pruebas que fallan:**
  - `matchRoute` con los cinco ejemplos anteriores
  - `company.test.js`: renderizar la pantalla, escribir un nombre y un NIT en sus campos (`name="name"`, `name="nit"`), enviar el formulario y comprobar que `loadCompany().name` y `.nit` se guardaron.
- [ ] **Step 2: Verificar que fallan** → FAIL.
- [ ] **Step 3: Implementar** `h`, `matchRoute`, el arranque en `main.js` y la pantalla de empresa (campos: nombre, NIT, dirección, ciudad, teléfono, correo, IVA por defecto, logo). El logo se lee con `FileReader` como data URL y se reduce a máx. 400 px de ancho con un `canvas` (solo en el navegador; no se prueba en jsdom). CSS mobile-first, botones de al menos 44 px de alto.
- [ ] **Step 4: Verificar que pasan** → PASS.
- [ ] **Step 5: Commit** `feat: app shell, router and company settings`.

---

### Task 6: Clientes y productos

**Files:**
- Create: `src/ui/screens/clients.js`, `src/ui/screens/products.js`
- Test: `tests/clients.test.js`, `tests/products.test.js`

**Interfaces:**
- Consumes: `listClients`, `saveClient`, `deleteClient`, `listProducts`, `saveProduct`, `deleteProduct`, `h`.
- Produces: `render()` de cada pantalla: lista con buscador, formulario para crear/editar (campos con `name` igual a las propiedades del tipo) y botón Eliminar con confirmación.

- [ ] **Step 1: Escribir las pruebas que fallan:** renderizar clientes, enviar el formulario con `name="name"` = `'LOVAZ LOGISTICA AVANZADA S.A.S'` y `name="nit"` = `'901747177'`; comprobar que aparece en la lista y en `listClients()`. Igual para productos con `ref` = `'PLG45'`, `description` = `'PLUG RJ-45 NETLINK'`, `unitPrice` = `500`.
- [ ] **Step 2: Verificar que fallan** → FAIL.
- [ ] **Step 3: Implementar** ambas pantallas. En productos, `unit` por defecto `UND` e `ivaPct` por defecto `loadCompany().defaultIva`.
- [ ] **Step 4: Verificar que pasan** → PASS.
- [ ] **Step 5: Commit** `feat: clients and products screens`.

---

### Task 7: Editor de cotización

**Files:**
- Create: `src/ui/screens/quoteEditor.js`
- Modify: `src/ui/router.js` (si hace falta registrar la pantalla), `src/main.js`
- Test: `tests/quoteEditor.test.js`

**Interfaces:**
- Consumes: `calcLine`, `calcTotals`, `toNumber`, `formatCOP`, `saveQuote`, `getQuote`, `listClients`, `listProducts`, `loadCompany`, `todayISO`.
- Produces: `render({ id })` — con `id === 'new'` abre una cotización vacía (fecha de hoy, `validDays` 15, un ítem vacío con `ivaPct` = IVA por defecto); con un id existente la carga. Selector de cliente guardado (rellena los campos) más campos editables; filas de ítems con selector de producto (autocompleta referencia, descripción, unidad, precio, IVA), botones añadir/quitar fila; los totales (bruto, descuento, IVA, total) se recalculan al escribir; botón Guardar llama `saveQuote` y navega a `#/quotes`.

- [ ] **Step 1: Escribir las pruebas que fallan:**
  - abrir `new`, poner `qty` 2, `unitPrice` 10000, `discountPct` 10, `ivaPct` 19 en la primera fila: el texto del total muestra `$ 21.420`
  - dejar `qty` vacío o escribir `abc`: el total muestra `$ 0` y nunca contiene `NaN`
  - `discountPct` 150: el descuento mostrado es igual al bruto
  - guardar: `listQuotes()` tiene una cotización con `number === 'COT-0001'` y `location.hash === '#/quotes'`
  - abrir un id existente carga sus ítems y al guardar no cambia el número.
- [ ] **Step 2: Verificar que fallan** → FAIL.
- [ ] **Step 3: Implementar** la pantalla; las entradas numéricas son `inputmode="decimal"` y pasan por `toNumber` antes de calcular.
- [ ] **Step 4: Verificar que pasan** → PASS.
- [ ] **Step 5: Commit** `feat: quote editor`.

---

### Task 8: Historial y compartir PDF

**Files:**
- Create: `src/lib/share.js`, `src/ui/screens/quotes.js`
- Test: `tests/share.test.js`, `tests/quotes.test.js`

**Interfaces:**
- Consumes: `listQuotes`, `duplicateQuote`, `deleteQuote`, `loadCompany`, `buildQuotePdf`, `quotePdfFileName`, `calcTotals`, `formatCOP`, `formatDate`.
- Produces:
  - `shareQuotePdf(quote: Quote, company: Company): Promise<void>` — en Android (`Capacitor.isNativePlatform()`): `@capacitor/filesystem` guarda el PDF en `Directory.Cache` y `@capacitor/share` abre la hoja de compartir con ese archivo; en navegador: `navigator.share` con archivo si `navigator.canShare` lo permite, si no, descarga mediante un `<a download>`.
  - `quotes.js` `render()`: buscador por número o nombre de cliente; cada fila muestra número, cliente, fecha y total, con acciones Compartir PDF, Ver PDF (abre en pestaña nueva en navegador), Editar (`#/quote/<id>`), Duplicar y Eliminar con confirmación; botón flotante "Nueva cotización" → `#/quote/new`; mensaje de lista vacía.

- [ ] **Step 1: Escribir las pruebas que fallan:**
  - `shareQuotePdf` en jsdom (sin `navigator.share`): crea un `<a>` con `download === 'COT-0001.pdf'` y lo hace clic (mockear `URL.createObjectURL`)
  - `quotes.test.js`: con dos cotizaciones guardadas la lista muestra ambas; el buscador con el nombre de un cliente deja solo una; Duplicar añade una tercera con número nuevo; Eliminar (con `confirm` mockeado a `true`) la quita.
- [ ] **Step 2: Verificar que fallan** → FAIL.
- [ ] **Step 3: Implementar** ambos archivos; instalar `@capacitor/core`, `@capacitor/filesystem` y `@capacitor/share`.
- [ ] **Step 4: Verificar que pasan** → PASS, y ejecutar `npm test` completo → todo PASS.
- [ ] **Step 5: Commit** `feat: quote history and pdf sharing`.

---

### Task 9: APK con Capacitor y GitHub Actions

**Files:**
- Create: `capacitor.config.json`, `.github/workflows/android-apk.yml`, `README.md` (reemplaza el actual), carpeta `android/` generada
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Consumes: el resultado de `npm run build` (`dist/`).
- Produces: artefacto `cotizador-debug-apk` con `app-debug.apk`.

- [ ] **Step 1: Instalar Capacitor:** `npm i @capacitor/cli @capacitor/android` y crear `capacitor.config.json` con los valores de Global Constraints.
- [ ] **Step 2: Generar el proyecto Android:** `npm run build && npx cap add android && npx cap sync android`. Comprobar que existe `android/app/src/main/AndroidManifest.xml` y que `npm run build` genera `dist/index.html`.
- [ ] **Step 3: Crear el workflow** `.github/workflows/android-apk.yml`: dispara en `push` a la rama de trabajo y en `workflow_dispatch`; pasos: checkout, `actions/setup-node` (Node 22), `actions/setup-java` (Temurin 21), `npm ci`, `npm test`, `npm run build`, `npx cap sync android`, `cd android && ./gradlew assembleDebug`, `actions/upload-artifact` de `android/app/build/outputs/apk/debug/app-debug.apk` con nombre `cotizador-debug-apk`.
- [ ] **Step 4: README en español:** qué es, cómo descargar el APK desde la pestaña Actions, cómo instalarlo en el celular (permitir orígenes desconocidos), cómo correrlo en el PC (`npm run dev`).
- [ ] **Step 5: Commit y push** a `ccr-be9674b0-rwuv73` (`git push -u origin ccr-be9674b0-rwuv73`).
- [ ] **Step 6: Verificar el APK:** con `mcp__github__actions_list` revisar la ejecución del workflow hasta que `conclusion` sea `success` y que el artefacto `cotizador-debug-apk` aparezca en la lista. Si falla, leer los registros con `mcp__github__get_job_logs`, corregir y repetir.

---

## Autorrevisión

- **Cobertura del diseño:** datos de empresa y logo (T5), clientes y productos reutilizables (T6), ítems y cálculo con IVA/descuento (T2, T7), total en letras (T1, T4), consecutivo, vigencia, forma de pago, vendedor y observaciones (T3, T7), PDF estilo Cytech con aviso de que no es factura (T4), compartir (T8), historial con buscar/duplicar/editar (T8), funcionamiento sin internet (todas las librerías van empaquetadas), APK compilado en Actions (T9).
- **Consistencia de tipos:** `Item`, `Quote`, `Company`, `Client` y `Product` se definen una vez (T2, T3) y se reutilizan con los mismos nombres en T4–T8.
- **Fuera de alcance, como dice el diseño:** remisiones, facturas DIAN, varios usuarios, inventario, sincronización, Play Store.
