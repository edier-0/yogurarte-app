---
name: debugging-and-error-recovery
description: Guía la depuración sistemática de causa raíz y recuperación ante fallos. Usar cuando fallen tests, se rompa el build, surjan bugs en runtime o el comportamiento no coincida con lo esperado en YogurArte.
---

# Debugging & Error Recovery — YogurArte

Guía de depuración sistemática con triaje estructurado para la resolución de errores y fallos en YogurArte. Cuando algo se rompa, detén la creación de nuevas características, preserva la evidencia y sigue un método riguroso para identificar y solucionar la causa raíz. Adivinar o cambiar código al azar consume tiempo y oculta los problemas reales.

---

## 1. La Regla de "Parar la Línea" (Stop-the-Line)

Ante cualquier comportamiento inesperado o error:

```
1. PARAR      ──► Detener de inmediato la adición de nuevas características
2. PRESERVAR  ──► Guardar los logs de error, trazas y pasos de reproducción
3. DIAGNOSTICAR► Aplicar el triaje sistemático (de la causa al síntoma)
4. CORREGIR   ──► Implementar la solución mínima que resuelva la causa raíz
5. BLINDAR    ──► Crear una prueba de regresión automatizada permanente
6. REANUDAR   ──► Continuar solo tras verificar el sistema en verde
```

> **Advertencia Senior:** Jamás avances hacia la siguiente tarea de una spec si la prueba actual está fallando. Los errores se acumulan exponencialmente: una inconsistencia en el cálculo de inventario de hoy provocará descuadres contables y de caja mañana.

---

## 2. El Triaje Sistemático en 5 Pasos

### Paso 1: Reproducir de Forma Determinista
Haz que el fallo ocurra a voluntad. Si no puedes reproducir el error consistentemente, no podrás confirmar que tu solución realmente lo resolvió:
- **En Backend/Servicios:** Escribe un test enfocado en `tests/<dominio>.test.ts` que simule la petición fallida (Patrón *Prove-It*).
- **En Compilación/Build:** Ejecuta el comando exacto que falló (`npx tsc --noEmit` o `npm --prefix frontend run build`).
- **En Docker/Contenedores:** Consulta los logs con `docker compose logs app` o inspecciona el healthcheck.

### Paso 2: Aislar y Localizar
Reduce la superficie de búsqueda para encontrar el origen exacto:
- **Inspección de Pila (*Stack Trace*):** Identifica el primer archivo de nuestro código fuente (`src/modules/...`) en la traza de error, descartando wrappers internos de Node o librerías de `node_modules`.
- **Diferencial de Git Reciente:** ¿Qué cambió entre el último estado que funcionaba y el actual?
  ```bash
  git diff HEAD~1
  # o revisar cambios no commiteados:
  git diff
  ```
- **Aislamiento de Componentes:** Si falla una transacción Prisma, aísla si el error proviene de la restricción de clave foránea, de un valor `null` no admitido, o de la lógica de negocio.

### Paso 3: Identificar la Causa Raíz (Los 5 Por Qués)
No te conformes con mitigar el síntoma superficial:
- *Síntoma:* La API devuelve HTTP 500 al registrar un pedido.
- *¿Por qué 1?* Porque la función arrojó `TypeError: Cannot read properties of undefined (reading 'price')`.
- *¿Por qué 2?* Porque el producto con ID enviado no tenía precio asignado en la base de datos.
- *¿Por qué 3?* Porque el esquema Zod permitió enviar un `packagingId` inexistente sin validar existencia previa.
- *Causa Raíz:* Falta de validación en el servicio antes de operar y ausencia de un `AppError('Presentación no encontrada', 404)`.

### Paso 4: Corrección Quirúrgica
Aplica la solución más simple y directa que elimine la causa raíz identificada:
- No realices refactorizaciones no solicitadas en el mismo commit del bugfix.
- Asegúrate de canalizar el error con la clase estándar `AppError`.
- Prohibido silenciar el error mediante bloques `try / catch` vacíos o fallbacks silenciosos.

### Paso 5: Blindar contra Recurrencia (Prueba de Regresión)
Cada bug solucionado debe dejar como legado una prueba automatizada en Vitest que garantice que el error nunca volverá a ocurrir en el proyecto:
```typescript
it('REGRESIÓN: debe arrojar AppError(404) si se intenta crear pedido con producto inexistente', async () => {
  await expect(
    orderService.createOrder({ items: [{ packagingId: 'id-inexistente', quantity: 1 }] })
  ).rejects.toThrow(new AppError('Presentación no encontrada', 404));
});
```

---

## 3. Matriz de Diagnóstico Rápido en YogurArte

| Error Frecuente | Causa Típica en Nuestro Stack | Acción Correctiva |
| :--- | :--- | :--- |
| `Cannot find module './xxx' or its corresponding type declarations` | Falta la extensión `.js` en el import ESM de TypeScript. | Agregar `.js` al final del path relativo (`import ... from './orders.service.js'`). |
| `PrismaClientKnownRequestError: Foreign key constraint failed` | Se intenta insertar un registro con un `id` padre que no existe en BD. | Validar existencia de la entidad previa a la inserción y lanzar `AppError(404)`. |
| `TypeError: Cannot read properties of undefined` | Falta validación Zod o acceso desprotegido a propiedades anidadas. | Incorporar schema Zod con tipado estricto y verificar propiedades con optional chaining `?.`. |
| `EIDLETIMEOUT` en Docker Build | Congestión de sockets de red en WSL2 al descargar dependencias masivas. | Aplicar `docker-hardening`: usar `--mount=type=cache,target=/root/.npm` e `--ignore-scripts`. |
| Salto de fecha de pedidos a las 7:00 PM | Uso de `.split('T')[0]` UTC en lugar de zona horaria Colombia (`America/Bogota`). | Utilizar los helpers de zona horaria oficiales del proyecto (`getColombiaStartOfDay`). |

---

## 4. Checklist de Cierre y Verificación
- [ ] El error se reprodujo inicialmente de manera confiable con un test en rojo.
- [ ] La corrección quirúrgica resolvió la causa raíz sin introducir efectos colaterales.
- [ ] El test de regresión pasa en verde de forma estable.
- [ ] Toda la suite del módulo pasa sin fallos (`npx vitest run tests/<modulo>.test.ts`).
- [ ] La compilación estricta de TypeScript no arroja advertencias (`npx tsc --noEmit`).
