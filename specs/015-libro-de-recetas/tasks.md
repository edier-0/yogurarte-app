# Tareas de Implementación — Spec 015: Libro de Recetas y Estandarización de Producción

Estado: listo para ejecución

## Principios de Ejecución
- **Alcance atómico:** Cada tarea está dimensionada para completarse en un ciclo de 20 a 30 minutos.
- **Disciplina TDD innegociable (Patrón Prove-It):** Para cada tarea de lógica o backend, se escribe primero el test que falle en rojo (`vitest`), luego el código mínimo necesario para ponerlo en verde, y finalmente se refactoriza.
- **Git PR Workflow:** Todo el trabajo se desarrollará en la rama dedicada `feature/recipe-book-sop`, integrando exclusivamente mediante Pull Request hacia `develop` previa autorización del usuario, y sincronizando posteriormente a `main`.
- **Actualización continua:** Al finalizar cada tarea o fase, se actualizará `MEMORY.md`.

---

## Fase 1: Modelo de Datos y Persistencia Prisma

- [x] **T1.1. Modelado Prisma de Recetas (`Recipe`, `RecipeIngredient`, `RecipeStep`).**  
  Declarar los modelos `Recipe`, `RecipeIngredient` y `RecipeStep` en `prisma/schema.prisma` con sus atributos, índices, claves foráneas e integridad referencial (`outputMaterialId`, `createdById`, `recipeId`, `rawMaterialId`). Configurar relaciones inversas en `User`, `RawMaterial`, `ProductionBatch`, `BatchPackaging` y `SupplyPreparation`.  
  *RF asociados:* RF-1, RF-3, RF-4, RF-8, RF-22.  
  *Hecho cuando:* `npx prisma validate` y `npx prisma generate` compilen exitosamente sin advertencias de esquema.

- [x] **T1.2. Migración aditiva de base de datos y verificación de integridad.**  
  Ejecutar la migración aditiva a PostgreSQL (`npx prisma db push`) verificando que no se pierdan ni bloqueen datos históricos existentes de lotes, compras o clientes.  
  *RF asociados:* RF-20, RF-21.  
  *Hecho cuando:* Las nuevas tablas existan en la base de datos y `npx tsc --noEmit` confirme que los tipos generados de Prisma Client están disponibles.

- [x] **T1.3. Datos Semilla Oficiales (Seed de Recetas Maestras de YogurArte).**  
  Agregar a `prisma/seed.ts` las recetas estándar fundacionales de la fábrica protegidas contra sobreescritura destructiva: `REC-MERM-FRESA` (Elaboración), `REC-FASEA-BASE` (Fase A) y `REC-FASEB-FRESA-TRAD`, `REC-FASEB-MORA-TRAD` (Fase B).  
  *RF asociados:* RF-1, RF-3, RF-7, RF-8.  
  *Hecho cuando:* `npx tsx prisma/seed.ts` ejecute y pueble las recetas base asociadas al usuario administrador.

---

## Fase 2: Esquemas Zod y Serializador RBAC de Confidencialidad

- [x] **T2.1. Pruebas Unitarias TDD de Esquemas Zod (`tests/recipes_schema.test.ts`).**  
  Escribir pruebas unitarias que verifiquen las reglas de validación en rojo: categorías válidas, `baseYield > 0`, exigencia de `baseLiters > 0` y `flavor` en Fase B, validación de coherencia física `baseYield >= baseLiters` (Art. 5.6 Constitución), `outputMaterialId` en Elaboraciones, y rechazo de recetas sin ingredientes en Elaboración/Fase A.  
  *RF asociados:* RF-1, RF-3, RF-5, RF-19.  
  *Hecho cuando:* `npx vitest run tests/recipes_schema.test.ts` falle en rojo con los errores esperados.

- [x] **T2.2. Implementación de Esquemas Zod (`src/modules/recipes/recipes.schema.ts`).**  
  Implementar `createRecipeSchema`, `updateRecipeSchema`, `recipeQuerySchema` y `simulatePresentationSchema` con refinamientos de dominio y mensajes de error en español para poner las pruebas de T2.1 en verde.  
  *RF asociados:* RF-1, RF-3, RF-5, RF-19.  
  *Hecho cuando:* `npx vitest run tests/recipes_schema.test.ts` pase al 100% en verde.

- [x] **T2.3. Pruebas Unitarias TDD de Serializador de Confidencialidad (`tests/recipes_serializer.test.ts`).**  
  Escribir pruebas en rojo que garanticen que cuando el rol sea `PRODUCCION` u `OPERADOR`, se omitan completamente los campos monetarios (`avgCost`, `unitCost`, `totalCost`, `theoreticalUnitCost`, `packagingCost`, `marginPercentage`, `projectedProfit`), y que se preserven íntegros para `ADMIN` y `SOCIO`.  
  *RF asociados:* RF-13, RF-14, RNF-2.  
  *Hecho cuando:* `npx vitest run tests/recipes_serializer.test.ts` falle en rojo.

- [x] **T2.4. Implementación del Serializador RBAC (`src/modules/recipes/recipes.serializer.ts`).**  
  Implementar la función `sanitizeRecipeForRole(recipe, role)` y `sanitizeRecipeListForRole(recipes, role)` para censurar costos estrictamente en backend y poner las pruebas de T2.3 en verde.  
  *RF asociados:* RF-13, RF-14, RNF-2.  
  *Hecho cuando:* `npx vitest run tests/recipes_serializer.test.ts` pase al 100% en verde.

---

## Fase 3: Backend — Lógica de Dominio y Endpoints REST (`src/modules/recipes/`)

- [x] **T3.1. Pruebas de Integración TDD de API de Recetas (`tests/recipes_api.test.ts`).**  
  Crear suite de pruebas Supertest en rojo para `/api/recipes`: CRUD completo, filtros por categoría/sabor/estado, cálculo teórico unitario considerando merma en elaboraciones, rechazo de eliminación con dependencias (`ARCHIVAR`), y simulación de presentación comercial sin tapas separadas.  
  *RF asociados:* RF-2, RF-5.1, RF-6, RF-13.2, RF-20, RF-23.  
  *Hecho cuando:* `npx vitest run tests/recipes_api.test.ts` falle en rojo.

- [x] **T3.2. Servicio de Dominio (`src/modules/recipes/recipes.service.ts`).**  
  Implementar la lógica de negocio:
  1. Creación y actualización de recetas dentro de transacciones interactivas atómicas (`prisma.$transaction`).
  2. Jerarquía de costeo de Base Láctea (lote Fase A completado $\rightarrow$ receta activa Fase A $\rightarrow$ \$0 con warning).
  3. Costeo de insumos compuestos heredando `costPerUnit` de última preparación si `avgCost == 0`.
  4. Cálculo de costo teórico unitario ($\text{Costo Total} / \text{baseYield}$).
  5. Simulación de rentabilidad por presentación: resolución de `BOTELLA_<PRESENTACION>` (o `ENVASE_<PRESENTACION>`) y `ETIQUETA_<PRESENTACION>`, costo de líquido proporcional, utilidad y margen con semáforo.  
  *RF asociados:* RF-5, RF-5.1, RF-6, RF-13.2, RF-20, RF-23.  
  *Hecho cuando:* Los métodos del servicio resuelvan los cálculos de costeo y transacciones correctamente.

- [x] **T3.3. Controlador, Rutas y Montaje en App (`src/modules/recipes/recipes.controller.ts`, `recipes.routes.ts`, `src/app.ts`).**  
  Implementar controladores con manejo de errores `next(error)`, configurar rutas con middlewares `requireAuth`, `requireRole(['ADMIN', 'SOCIO'])` en mutaciones, aplicar `sanitizeRecipeForRole` y montar el router `/api/recipes` en `src/app.ts`.  
  *RF asociados:* RF-2, RF-14, RF-19, RF-23.  
  *Hecho cuando:* `npx vitest run tests/recipes_api.test.ts` pase al 100% en verde.

---

## Fase 4: Backend — Optimización de Insumos Compuestos en Inventario

- [x] **T4.1. Pruebas TDD de Insumos Editables en Preparaciones (`tests/inventory_prepare.test.ts`).**  
  Escribir pruebas en rojo para `POST /api/inventory/materials/:id/prepare` verificando que cuando se envíe un array opcional de `ingredients` (con cantidades reales ajustadas en planta), el servicio descuente del Kardex esas cantidades personalizadas en lugar del ratio teórico estático.  
  *RF asociados:* RF-15, RF-17, Caso Límite 11.  
  *Hecho cuando:* `npx vitest run tests/inventory_prepare.test.ts` falle en rojo.

- [x] **T4.2. Extensión de Esquema y Servicio de Preparaciones (`src/modules/inventory/`).**  
  Extender `prepareCompoundSchema` en `inventory.schema.ts` para validar `ingredients` opcional y adaptar `prepareCompoundMaterial` en `inventory.service.ts` para procesar los insumos reales.  
  *RF asociados:* RF-15, RF-17, Caso Límite 11.  
  *Hecho cuando:* `npx vitest run tests/inventory_prepare.test.ts` pase al 100% en verde.

---

## Fase 5: Frontend — Cliente API y Catálogo del Libro de Recetas

- [x] **T5.1. Módulo de API en Frontend (`frontend/src/api/recipes.ts`).**  
  Crear los métodos de llamada HTTP tipados con Axios (`getRecipes`, `getRecipeById`, `createRecipe`, `updateRecipe`, `deleteRecipe`, `toggleArchiveRecipe`, `simulatePresentation`) respetando los contratos del backend.  
  *RF asociados:* RF-2, RF-13.2, RF-19, RF-20.  
  *Hecho cuando:* El módulo compile sin errores de TypeScript en el cliente.

- [x] **T5.2. Vista Principal del Recetario (`frontend/src/views/production/RecipesView.vue`).**  
  Construir la vista principal con:
  1. Barra superior con buscador reactivo por nombre y código.
  2. Selector de pestañas por categoría (`Todas`, `Elaboraciones / Mermeladas`, `Fase A (Base Láctea)`, `Fase B (Saborización)`).
  3. Cuadrícula de tarjetas con badges de estado, rendimiento base y costo/margen (solo visible si el rol es admin/socio).
  4. Botón "Nueva Receta" (protegido por rol).  
  *RF asociados:* RF-1, RF-2, RF-7, RF-13, RF-14.  
  *Hecho cuando:* La vista renderice el catálogo reactivamente y se integre en la ruta `/produccion/recetario`.

- [x] **T5.3. Registro de Rutas y Menú de Navegación (`frontend/src/router/routes.ts`, Sidebar).**  
  Añadir la ruta `/produccion/recetario` con roles `['ADMIN', 'OPERADOR']` y agregar el elemento de menú "Libro de Recetas" en la barra lateral bajo `Planta & Producción` con ícono `BookOpen`.  
  *RF asociados:* RF-1, RF-2, RNF-3.  
  *Hecho cuando:* El usuario autenticado pueda navegar desde la barra lateral a la nueva vista.

---

## Fase 6: Frontend — Ficha Técnica, Escalador y Simulador de Rentabilidad

- [x] **T6.1. Componente Escalador Dinámico de Lotes (`frontend/src/components/production/recipes/RecipeScaler.vue`).**  
  Implementar el escalador reactivo en cliente ($< 50$ ms): input "Cantidad a Preparar" que recalcula en tiempo real las materias primas necesarias, aplicando redondeo `Math.ceil` para empaques y 2 decimales para materias primas, manteniendo fijos los tiempos biológicos de proceso.  
  *RF asociados:* RF-10, RF-11, RF-12, RF-12.1, RNF-1.  
  *Hecho cuando:* El componente recalcule cantidades instantáneamente ante cambios en el input sin mostrar valores negativos.

- [x] **T6.2. Componente de Procedimiento SOP (`frontend/src/components/production/recipes/RecipeStepsList.vue`).**  
  Implementar la visualización estructurada de pasos con insignias de tiempos estimados, temperatura nominal y de tolerancia (ej. `42 °C [40 °C - 44 °C]`) y alertas visuales para controles de calidad críticos.  
  *RF asociados:* RF-8, RF-9.  
  *Hecho cuando:* Los pasos se ordenen secuencialmente destacando los puntos de control.

- [x] **T6.3. Simulador Interactivo de Rentabilidad por Presentación (`frontend/src/components/production/recipes/RecipeProfitSimulator.vue`).**  
  Construir el simulador interactivo para recetas de Fase B:
  1. Selector desplegable de presentaciones activas (`ProductPresentation`).
  2. Mapeo automático de `BOTELLA_*` y `ETIQUETA_*` (sin tapas separadas).
  3. Desglose visual de Costo Líquido + Costo Empaques = Costo Total Unidad.
  4. Comparativa con Precio Oficial (`defaultPrice`), Utilidad en COP y Margen % con semáforo visual (verde $\ge 40\%$, amarillo $25\%-39.9\%$, rojo $< 25\%$).  
  *RF asociados:* RF-13.1, RF-13.2, RNF-1.  
  *Hecho cuando:* Al cambiar de presentación en el selector, el cálculo y el semáforo de margen se actualicen instantáneamente en pantalla.

- [x] **T6.4. Modal Principal de Detalle (`frontend/src/components/production/recipes/RecipeDetailModal.vue`).**  
  Integrar el Escalador, la lista SOP de pasos, el Simulador de Rentabilidad (en pestaña dedicada para admin/socio) y las acciones de edición/impresión cumpliendo la estructura fija de 3 capas de la Constitución.  
  *RF asociados:* RF-2, RF-8, RF-10, RF-13, RF-14, Art. 10.2 Constitución.  
  *Hecho cuando:* El modal abra y permita conmutar entre ficha técnica y simulador fluidamente en móvil y escritorio.

---

## Fase 7: Frontend — Ficha de Planta Limpia para Impresión

- [x] **T7.1. Vista y Estilos de Impresión (`frontend/src/components/production/recipes/RecipePrintView.vue`).**  
  Diseñar la vista limpia optimizada para `@media print`: tipografía legible de alto contraste, encabezado con logo de YogurArte, tabla clara de ingredientes escalados o base, tabla secuencial de pasos con temperaturas y advertencias de calidad, ocultando botones, barras de navegación y fondos innecesarios.  
  *RF asociados:* RF-18, RNF-3.  
  *Hecho cuando:* Al pulsar "Imprimir Ficha de Planta", se dispare `window.print()` mostrando la previsualización en una sola hoja o diseño optimizado sin elementos de la app.

---

## Fase 8: Frontend — Modal de Creación y Edición de Recetas

- [x] **T8.1. Formulario Dinámico de Receta (`frontend/src/components/production/recipes/RecipeFormModal.vue`).**  
  Crear el modal de creación y edición (restringido a `ADMIN` y `SOCIO`):
  1. Campos generales (código, nombre, categoría, sabor, insumo de salida si es elaboración, rendimiento base, unidad).
  2. Selector dinámico de ingredientes (`RawMaterial`) con inputs de cantidad y unidad (permitido vacío para Yogur Natural en Fase B).
  3. Editor interactivo de pasos reordenables con tiempos, temperaturas y control de calidad.
  4. Validaciones reactivas en cliente antes de enviar.  
  *RF asociados:* RF-3, RF-4, RF-7, RF-8, RF-19.  
  *Hecho cuando:* Un administrador pueda crear una nueva receta completa con ingredientes y pasos, y editarla con guardado exitoso en base de datos.

---

## Fase 9: Frontend — Integración en Planta y Optimización de Modales Existentes

- [x] **T9.1. Optimización del Modal de Preparaciones (`frontend/src/components/production/PrepareCompoundModal.vue`).**  
  Transformar la lista de insumos de solo lectura en una tabla interactiva:
  1. Permitir editar in situ los inputs de cantidad real pesada en la paila para esa tanda puntual.
  2. Botón para cargar receta de categoría `ELABORACION`, autoseleccionando el insumo de salida y precargando los ingredientes escalados.
  3. Enviar los `ingredients` modificados al backend para descontar el inventario real sin obligar a editar el insumo en catálogo.  
  *RF asociados:* RF-15, RF-17, Caso Límite 11.  
  *Hecho cuando:* El operario pueda cambiar la cantidad a fabricar, ajustar los gramos reales de fruta o azúcar en la tabla y registrar la preparación exitosamente.

- [x] **T9.2. Integración en el Modal de Envasado (`frontend/src/components/production/PackagingModal.vue` y `BatchModal.vue`).**  
  Añadir selector de recetas activas de Fase B y Fase A:
  1. En `PackagingModal.vue`, al seleccionar una receta de Fase B, precargar automáticamente sabor, litros de base y mermelada requerida.
  2. En `BatchModal.vue`, al seleccionar una receta de Fase A, precargar automáticamente volumen esperado y dosis de cultivo en el checklist.
  3. Calcular automáticamente las botellas y etiquetas requeridas al digitar las cantidades envasadas por presentación.  
  *RF asociados:* RF-16, RF-16.1, RF-17.  
  *Hecho cuando:* El operario pueda precargar una receta en un clic y ajustar manualmente los datos antes de confirmar la orden en planta.

---

## Fase 10: Validación Integral, Calidad y Git PR Workflow

- [ ] **T10.1. Verificación Integral de Pruebas y Compilación.**  
  Ejecutar todas las suites de pruebas backend (`npm test` o `npx vitest run`), typecheck estricto (`npx tsc --noEmit`) y empaquetado del frontend (`npm --prefix frontend run build`).  
  *RF asociados:* Todos los RF y RNF.  
  *Hecho cuando:* Cero errores de TypeScript, 100% de pruebas unitarias/integración en verde y build de Vite exitoso.

- [ ] **T10.2. Auditoría DevSecOps y Confidencialidad.**  
  Auditar que ningún token, costo o dato reservado se filtre en la API para usuarios de planta, y verificar cero fallbacks de credenciales hardcodeadas en scripts o tests.  
  *RF asociados:* RF-14, RNF-2.  
  *Hecho cuando:* La auditoría de seguridad y pruebas de rol confirmen blindaje total.

- [ ] **T10.3. Flujo Git PR Workflow hacia `develop` y sincronización a `main`.**  
  Sincronizar con `origin/develop`, consultar al usuario para abrir el Pull Request, gestionarlo y aceptarlo tras confirmación, sincronizar en local, integrar a `main`, y solicitar autorización previa para la eliminación de la rama temática conforme al Artículo 16 de la Constitución.  
  *RF asociados:* Art. 16 Constitución.  
  *Hecho cuando:* El PR esté integrado en `develop` y `main`, con historial limpio y confirmación del usuario.