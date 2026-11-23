---
description: Implementa una tarea atómica bajo el ciclo estricto TDD (Red-Green-Refactor), verificando línea base, staging quirúrgico, commit convencional y cero push intermedio.
---

# Workflow: Implementación Atómica con TDD (`/sdd-implement`)

Este workflow ejecuta una tarea individual de `specs/NNN-nombre/tasks.md`. Es ejecutado por `@implementer` bajo la coordinación del agente principal, garantizando desarrollo guiado por pruebas (TDD), compuertas de seguridad y commits atómicos.

---

## Parámetros e Inferencia de Tarea

```bash
/sdd-implement [Tn]
```
- **Sin argumento**: Escanea `specs/NNN-nombre/tasks.md` y selecciona automáticamente la primera tarea pendiente (`- [ ]`).
- **Con argumento (ej. `/sdd-implement T2`)**: Ejecuta específicamente la tarea solicitada.
- **Si todas las tareas están completas (`- [x]`)**: Informa al usuario que la implementación está finalizada y sugiere ejecutar `/sdd-validate`.

---

## Fase 1: Recuperación de Sesión y Comprobación de Línea Base

1. **Recuperación tras Interrupción Abrupta**:
   - Ejecuta `git status --porcelain`.
   - Si detecta cambios no commiteados residuales de una sesión previa:
     - Consulta al usuario: *"Se detectaron cambios residuales no commiteados en el árbol de trabajo. ¿Deseas (1) reanudar el trabajo sobre estos archivos existentes, o (2) descartarlos (`git checkout . && git clean -fd`) para reiniciar la tarea desde el último commit limpio?"*
2. **Comprobación de Línea Base (*Baseline Check*)**:
   - Antes de escribir o modificar código, corre `TEST_COMMAND` (o la suite acotada al módulo en monorrepositorios).
   - **Regla Innegociable**: Si los tests ya están fallando antes de iniciar la tarea (*failing baseline*), el subagente **DEBE DETENERSE DE INMEDIATO**. Está terminantemente prohibido construir código sobre una base rota.
   - *Exención Greenfield*: Si el proyecto carece de tests y la tarea activa es `T1: Configurar runner de pruebas`, la comprobación previa de línea base se exime de forma natural; al terminar T1, se valida la prueba de sanidad mínima.

---

## Fase 2: Ciclo TDD (Red - Green - Refactor)

1. **Paso 1: ROJO (Red)**:
   - Redacta las pruebas automatizadas que definen el comportamiento esperado según los criterios de aceptación de la tarea.
   - Ejecuta los tests y verifica que **fallen por la razón esperada** (no por errores de sintaxis).
2. **Paso 2: VERDE (Green)**:
   - Escribe la cantidad mínima y necesaria de código de producción para que los tests pasen.
   - Ejecuta los tests y comprueba que pasen al 100%.
3. **Paso 3: REFACTOR (Refactorización y Linters)**:
   - Limpia el código, elimina duplicaciones y aplica mejores prácticas manteniendo los tests en verde.
   - Si existen `LINT_COMMAND` o `TYPECHECK_COMMAND`, ejecútalos sobre los archivos tocados por la tarea y corrige advertencias o fallos de tipado introducidos.

### Protocolo ante Bloqueo Técnico
Si durante la implementación surge un obstáculo insalvable (incompatibilidad de dependencias o contradicción en el plan), `@implementer` se detiene y emite:
```markdown
BLOQUEO TÉCNICO: <descripción del problema>
```
El Coordinador ofrece al usuario: (1) ajustar manualmente, o (2) invocar a `@planner` para reformular la tarea vía `/sdd-change`. Queda prohibido improvisar o cambiar contratos sin autorización humana.

---

## Fase 3: Compuertas de Calidad Pre-Commit y DevSecOps

Antes de commitear, se validan obligatoriamente tres condiciones:
1. **Tests en Verde**: `TEST_COMMAND` pasa exitosamente.
2. **Chequeo de Tipos y Linters**: Cero errores introducidos en los archivos modificados.
3. **Auditoría DevSecOps de Secretos**:
   - Si existe `SECURITY_CHECK_COMMAND`, se ejecuta sobre los archivos de la tarea.
   - Inspección visual del diff buscando: contraseñas, tokens de API, claves privadas o fallbacks inseguros en código (`||'postgresql://...'`).
   - Si se detecta algún secreto, el commit se **ABORTA** de inmediato.

---

## Fase 4: Staging Quirúrgico y Commit Convencional

1. **Staging Quirúrgico**:
   - Añade al área de preparación **únicamente** los archivos modificados o creados para la tarea:
     ```bash
     git add <archivo1> <archivo2> specs/NNN-nombre/tasks.md
     ```
   - **PROHIBICIÓN ESTRICTA**: Prohibido usar `git add .` o `git add -A`.
2. **Commit Atómico Convencional**:
   - Redacta el commit con el formato estricto:
     ```bash
     git commit -m "<tipo>(<NNN>): <Tn> - <descripción en español>"
     ```
   - Tipos válidos: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`.
   - Ejemplo: `git commit -m "feat(001): T2 - implementar servicio de autenticación"`
3. **PROHIBICIÓN TOTAL DE `git push` INTERMEDIO**:
   - Queda terminantemente prohibido hacer `git push` a la rama remota tras cada tarea individual. Los commits permanecen locales para proteger el repositorio remoto y permitir reversiones limpias si fuera necesario.

---

## Fase 5: Actualización de Estado y Siguiente Paso

1. Marca la tarea como completada en `specs/NNN-nombre/tasks.md`:
   - Cambia `- [ ] Tn: ...` a `- [x] Tn: ...` y remueve la sub-viñeta de checkpoint.
2. Si es la primera tarea, asegura que `spec.md` tenga `Estado: en_progreso`.
3. Reporta el avance y sugiere el siguiente paso:
   - Si quedan tareas pendientes: sugiere ejecutar la siguiente tarea con `/sdd-implement`.
   - Si se completó la última tarea: sugiere pasar a la validación integral con `/sdd-validate`.
