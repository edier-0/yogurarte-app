---
name: test-driven-development
description: Guía el desarrollo guiado por pruebas mediante el ciclo Red-Green-Refactor. Usar al implementar nueva lógica, corregir errores o modificar cualquier comportamiento existente en YogurArte.
---

# Test-Driven Development (TDD) — YogurArte

Escribe una prueba que falle antes de escribir el código que la haga pasar. Para la corrección de errores, reproduce primero el fallo con un test antes de intentar solucionarlo (Patrón *Prove-It*). Las pruebas son la evidencia de funcionamiento; "parece que funciona" no es un criterio de entrega.

---

## 1. Cuándo Usar TDD

- **Siempre que implementes nueva lógica o comportamiento de negocio** (cálculo de costos, fraccionamiento en Fase B, validación de inventario).
- **Al corregir cualquier bug** (escribe primero el test que demuestre el fallo reportado).
- **Al modificar funcionalidad existente o refactorizar.**
- **Al incorporar casos límite** (saldos negativos, valores nulos, estados de entrega `CANCELLED`).
- **Cualquier cambio con riesgo de regresión.**

> **Cuándo NO usar:** Cambios exclusivos de documentación markdown, ajustes estéticos menores de CSS puro sin lógica asociada, o actualizaciones de comentarios.

---

## 2. El Stack de Pruebas de YogurArte

Antes de ejecutar pruebas, respeta el herramental estándar del repositorio:

- **Framework de Pruebas:** `vitest` con `supertest` para endpoints HTTP.
- **Base de Datos de Pruebas:** PostgreSQL 16 (local o contenedor Docker con `TEST_DATABASE_URL`).
- **Prueba individual o enfocada:**
  ```bash
  npx vitest run tests/orders.test.ts
  ```
- **Prueba con filtro de nombre (grep):**
  ```bash
  npx vitest run -t "debe calcular la deuda dinámicamente"
  ```
- **Suite completa de integración:**
  ```bash
  npm test
  # o bien:
  npx vitest run
  ```
- **Golden-Master de Auditoría:** `tests/golden_master.test.ts` (garantiza la consistencia contable y de costeo promedio).

---

## 3. El Ciclo Red-Green-Refactor

```
       ROJO (RED)                     VERDE (GREEN)                  REFACTORIZAR
   Escribe un test que           Escribe el código mínimo         Limpia y optimiza la
   falle por la razón     ──►    necesario para que       ──►     implementación sin   ──► (repetir)
   correcta                      la prueba pase                   romper las pruebas
        │                              │                                  │
        ▼                              ▼                                  ▼
   El test FALLA                  El test PASA                     Los tests siguen
   (Error esperado)               (Verificación)                   PASANDO (Verde)
```

### Paso 1: ROJO (RED) — Escribir un Test que Falle
1. Ubica o crea la prueba en `tests/<dominio>.test.ts`.
2. Modela el comportamiento esperado desde la perspectiva del consumidor:
   - ¿Qué inputs recibe?
   - ¿Qué invariantes de base de datos se alteran?
   - ¿Qué código de estado HTTP o excepción de `AppError` debe retornar?
3. Ejecuta la prueba enfocada:
   ```bash
   npx vitest run tests/<dominio>.test.ts
   ```
4. **Verificación Crítica:** La prueba DEBE fallar, y debe fallar por la razón esperada (ejemplo: `Method not implemented` o `expected 400 received 404`), no por errores sintácticos o fallas de conexión a la base de datos.

### Paso 2: VERDE (GREEN) — Implementación Mínima
1. Escribe la menor cantidad de código posible en el servicio o controlador (`src/modules/<dominio>/`) para satisfacer la prueba.
2. Evita diseñar abstracciones prematuras en este paso; el objetivo es llevar la barra a verde.
3. Vuelve a ejecutar la prueba enfocada y confirma que pasa:
   ```bash
   npx vitest run tests/<modulo>.test.ts
   ```

### Paso 3: REFACTORIZAR — Limpieza y Estándares
1. Con la red de seguridad en verde, optimiza la legibilidad y estructura del código:
   - Extrae funciones puras o helpers reutilizables.
   - Aplica esquemas Zod rigurosos.
   - Elimina código duplicado.
   - Aplica la skill `code-simplification` si el flujo se siente sobrecargado.
2. Comprueba que todos los tests continúen pasando sin modificaciones:
   ```bash
   npx vitest run tests/<modulo>.test.ts
   npx tsc --noEmit
   ```

---

## 4. Patrones de Pruebas en YogurArte

### A. Patrón Prove-It (Reproducción de Bugs)
Jamás intentes corregir un bug sin reproducirlo primero:
```typescript
it('debe excluir pedidos con estado CANCELLED del cálculo de deuda', async () => {
  // 1. Arrange: Crear cliente y pedidos (uno entregado y uno cancelado)
  const customer = await createTestCustomer();
  await createTestOrder({ customerId: customer.id, total: 50000, status: 'DELIVERED' });
  await createTestOrder({ customerId: customer.id, total: 30000, status: 'CANCELLED' });

  // 2. Act: Consultar cartera pendiente
  const debt = await customerService.calculateDebt(customer.id);

  // 3. Assert: La deuda debe ser exactamente 50000, ignorando los 30000 cancelados
  expect(debt).toBe(50000);
});
```

### B. Pruebas de Transacciones e Integridad Financiera
Cuando se tocan simultáneamente stock, pedidos y caja, validar la atomicidad:
```typescript
it('debe revertir stock si la creación del movimiento de caja falla', async () => {
  const initialStock = await getStock(packagingId);

  await expect(
    orderService.processOrderWithPayment({ ...invalidPayload })
  ).rejects.toThrow(AppError);

  const finalStock = await getStock(packagingId);
  expect(finalStock).toBe(initialStock); // Cero impacto colateral
});
```

---

## 5. Antipatrones a Evitar (Trampas de TDD)

| Antipatrón | Por Qué es Peligroso | Corrección Obligatoria |
| :--- | :--- | :--- |
| **Escribir código antes del test** | Sesga la prueba para que coincida con lo implementado, no con lo especificado. | Borra o comenta el código nuevo; escribe el test primero y míralo fallar en rojo. |
| **Asertos vacíos o tautológicos** | `expect(res.body).toBeDefined()` pasa incluso si la lógica retorna un objeto erróneo. | Evalúa valores específicos exactos: `expect(res.body.data.currentStock).toBe(12)`. |
| **Ignorar fallas colaterales** | "Mi test pasa, pero fallaron 2 en otro archivo". | Detén la línea. Una regresión en otra suite indica acoplamiento o violación de invariantes. |
| **Mocks excesivos de Prisma** | Mockear todo Prisma oculta errores de tipos, sintaxis SQL y restricciones relacionales. | Usa la base de datos de pruebas real (`TEST_DATABASE_URL`) para integración de módulos. |

---

## 6. Verificación de Cierre
Antes de marcar la tarea como completada y proceder al commit atómico (siguiendo `git-pr-workflow`):
- [ ] La nueva prueba falló en rojo antes de la implementación.
- [ ] La nueva prueba pasa en verde de forma reproducible.
- [ ] La suite del módulo pasa completa (`npx vitest run tests/<modulo>.test.ts`).
- [ ] La compilación estricta de TypeScript aprueba sin errores (`npx tsc --noEmit`).
