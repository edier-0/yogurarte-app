---
name: code-review-and-quality
description: Realiza revisión de código multidimensional antes de cualquier merge o PR. Evalúa corrección, legibilidad, arquitectura, seguridad y rendimiento en YogurArte.
---

# Code Review & Quality Gates — YogurArte

Revisión exhaustiva multidimensional de código con compuertas de calidad obligatorias. Todo cambio debe ser auditado antes de solicitar la apertura de un Pull Request o autorizar su integración hacia `develop`.

> **El Estándar de Aprobación Senior:** Aprueba un cambio cuando definitivamente mejore la salud general, robustez y claridad del código, incluso si no es 100% idéntico a cómo lo habrías escrito tú. No bloquees por preferencias estéticas menores si el código cumple las convenciones del proyecto y no introduce deuda técnica.

---

## 1. Cuándo Aplicar Esta Skill

- Antes de abrir cualquier Pull Request hacia `develop` (como parte de los Quality Gates de `git-pr-workflow`).
- Al finalizar la implementación de una característica o tarea de una spec.
- Al evaluar código generado por subagentes o colaboradores externos.
- Al concluir una corrección de bugs (verificando tanto el fix como el test de regresión).

---

## 2. Los Cinco Ejes de la Revisión

```
                      REVISIÓN MULTIAXIAL
                               │
       ┌───────────────┬───────┴───────┬───────────────┐
       ▼               ▼               ▼               ▼
1. Corrección   2. Legibilidad   3. Arquitectura   4. Seguridad   5. Rendimiento
   y Dominio       y Estilo        y Capas           DevSecOps       y Base Datos
```

### Eje 1: Corrección Funcional e Invariantes de Dominio
- ¿El código cumple exactamente con lo especificado en la spec (`spec.md`)?
- ¿Se respetan los invariantes constitucionales de YogurArte?
  - **Deuda:** No existe columna de deuda en `Customer`; se calcula dinámicamente (`pedidos entregados - pagos`).
  - **Caja Bimonetaria:** Fondos en `EFECTIVO` y transferencias (`NEQUI`/`BANCOLOMBIA`) permanecen estrictamente separados.
  - **Fase A vs Fase B:** Las fracciones comerciales y salidas pertenecen exclusivamente a `BatchPackaging` (Fase B), nunca al Lote Madre crudo (Fase A).
  - **Separación de Identidad:** `User` (autenticación) vs `StaffMember` (liquidaciones, colaboradores, nómina).
- ¿Se manejan todos los casos límite (valores en 0, nulos, cancelaciones)?
- ¿Todos los tests nuevos y existentes pasan en verde (`npx vitest run`)?

### Eje 2: Legibilidad, Estilo y Convenciones del Repositorio
- **Idioma del Proyecto:** ¿Los comentarios, textos de interfaz (UI) y mensajes de error de la API están redactados en **español**?
- **Imports ESM:** ¿Los imports relativos en TypeScript terminan obligatoriamente con el sufijo `.js` (`import { orderService } from './orders.service.js'`)?
- **Claridad de Nombres:** Nombres de variables y funciones autodescriptivos; prohibido el uso de nombres genéricos crudos (`data`, `temp`, `res2`).
- **Control de Flujo:** ¿Se evitan anidamientos profundos mediante cláusulas de guarda (*early returns*)?
- **Cero Código Muerto:** ¿Se eliminaron `console.log` de depuración, código comentado o variables sin uso?

### Eje 3: Arquitectura y Desacoplamiento de Capas
- **Controladores Delgados:** El controlador Express solo valida la entrada con Zod y delega al servicio mediante `next(error)`.
- **Servicios con Reglas de Negocio:** Toda la lógica de cálculo, transformaciones y llamadas a Prisma reside en el servicio del módulo (`src/modules/<dominio>/`).
- **Manejo Centralizado de Errores:** Se utiliza exclusivamente la clase `AppError` con sus respectivos códigos de estado HTTP (400, 401, 404, 409).
- **Arquitectura de Modales en Frontend:** Si se modificó la interfaz, los modales deben respetar las 3 capas fijas (cabecera fija, cuerpo con scroll `flex-1 overflow-y-auto min-h-0`, y pie fijo).

### Eje 4: Seguridad y DevSecOps
- **Prohibición Total de Fallbacks de Credenciales:** Confirmar que no existan cadenas de conexión ni contraseñas como fallback (`|| 'postgresql://...'`) en ningún archivo tocado.
- **Validación con Zod:** Toda entrada externa (`req.body`, `req.query`, `req.params`) pasa por un schema estricto.
- **Autorización RBAC:** Los endpoints protegidos aplican los middlewares `requireAuth` y `requireRole(...)`.
- **Higiene de Secretos:** Confirmar que `.env` y credenciales privadas no hayan sido añadidos al commit (`git status`).

### Eje 5: Rendimiento y Base de Datos
- **Problema N+1 en Prisma:** ¿Se usan includes adecuados (`include: { items: true }`) en lugar de consultas en bucle `for...of (await prisma...)`?
- **Transacciones Interactivas:** ¿Las operaciones que tocan inventario, caja y pagos están envueltas en `prisma.$transaction`?
- **Indices y Filtrado:** ¿Las consultas a tablas con alto volumen usan índices apropiados y filtros de fecha en zona horaria Colombia (`UTC-5`)?

---

## 3. Matriz de Decisión y Calificación de Hallazgos

| Tipo de Hallazgo | Nivel de Severidad | Acción Requerida |
| :--- | :--- | :--- |
| **Vulnerabilidad de Seguridad o Fuga de Credenciales** | 🔴 Bloqueante | Detener de inmediato. Corregir antes de cualquier commit. |
| **Violación de Invariante Constitucional o Fallo de Test** | 🔴 Bloqueante | No se aprueba el cambio. Debe resolverse en la rama temática. |
| **Regresión de Rendimiento Crítica (ej. N+1 masivo)** | 🟠 Importante | Corregir antes de abrir el PR. |
| **Oportunidad de Simplificación o Nombres Poco Claros** | 🟡 Sugerencia | Aplicar `code-simplification` si no retrasa el objetivo. |
| **Preferencia Personal Estética sin Impacto Técnico** | 🟢 Omitir | No bloquear la entrega. |

---

## 4. Checklist de Aprobación de Quality Gate
Antes de declarar el código listo para la apertura de Pull Request:
- [ ] Backend compila sin advertencias de tipos (`npx tsc --noEmit`).
- [ ] Frontend compila limpiamente (`npm --prefix frontend run build`).
- [ ] Pruebas unitarias y de integración pasando al 100% (`npx vitest run`).
- [ ] Cero secretos o credenciales expuestas en el diff (`git diff --staged`).
- [ ] Convenciones de arquitectura y español respetadas en UI y API.
