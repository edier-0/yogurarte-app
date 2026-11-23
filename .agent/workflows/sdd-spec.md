---
description: Inicializa una nueva especificación formal creando la rama temática aislada y specs/NNN-nombre/spec.md en sintaxis EARS bajo estado borrador.
---

# Workflow: Creación de Especificación Formal (`/sdd-spec`)

Este workflow inicia el ciclo Spec-Driven Development (SDD). Es ejecutado por el Coordinador en colaboración con `@planner` para capturar requerimientos, verificar la limpieza de Git, ramificar tempranamente y redactar la especificación funcional.

---

## Parámetros de Invocación

```bash
/sdd-spec [slug-o-numero]
```
- **Sin argumentos**: Asigna automáticamente el siguiente número correlativo `max(NNN) + 1` (ej. `001-<nombre>`).
- **Con argumento explícito**: Permite forzar el identificador (ej. `/sdd-spec 005-nueva-feature`) o el tipo de rama (ej. `/sdd-spec fix/002-jwt-expiry`).

---

## Fase 1: Comprobación de Git y Árbol de Trabajo Limpio

1. **Abortar Procesos Residuales**:
   - Si existen estados residuales de Git en el árbol (`REBASE-APPLY`, `MERGE_HEAD`), ejecuta:
     ```bash
     git rebase --abort 2>/dev/null || git merge --abort 2>/dev/null || true
     ```
2. **Comprobación de Árbol Limpio Pre-Ramificación**:
   - Ejecuta `git status --porcelain`.
   - Si existen archivos modificados, staged o no rastreados:
     - **DETENERSE INMEDIATAMENTE**.
     - Notifica al usuario: *"El árbol de trabajo tiene cambios sin commitear. Por favor realiza un commit, descarta los cambios o guárdalos en stash (`git stash`) antes de iniciar una nueva spec."*
3. **Sincronización con la Rama Base**:
   - Lee `PR_TARGET_BRANCH` de `AGENTS.md` (por defecto `develop` o `main`).
   - Si existe remoto configurado: `git fetch origin && git checkout <base_branch> && git pull origin <base_branch>`.
   - Si opera en modo local-first (sin remoto): `git checkout <base_branch>`.

---

## Fase 2: Determinación de Número, Slug y Rama Temática

1. **Cálculo del Número de Spec**:
   - Escanea la carpeta `specs/` en la raíz del proyecto.
   - Si existen carpetas como `001-auth` y `002-pagos`, calcula `NNN = 003`.
   - Si el usuario suministró un número en el comando, respeta la anulación manual.
2. **Sanitización del Slug de la Rama**:
   - Toma el nombre descriptivo y normaliza estrictamente a *kebab-case*:
     - Convertir a minúsculas.
     - Sustituir espacios por guiones simples (`-`).
     - Suprimir tildes y caracteres diacríticos (`á -> a`, `ñ -> n`).
     - Eliminar cualquier carácter que no sea `[a-z0-9-]`.
     - Longitud máxima recomendada: 30 caracteres.
3. **Creación de Rama Temática (Según `GIT_WORKFLOW_MODE`)**:
   - **En modo `branch_pr` (por defecto)**:
     - Determina el prefijo `<tipo>`: `feature/` por defecto (o `fix/`, `refactor/`, `chore/`, `docs/`, `test/` si se especificó).
     - Crea la rama temática desde la rama base:
       ```bash
       git checkout -b <tipo>/<NNN-slug>
       ```
     - Esta ramificación temprana encapsula spec, plan, tareas y código en un historial aislado.
   - **En modo `trunk`**:
     - Permanece en `main` asegurando que esté limpia y sincronizada.

---

## Fase 3: Entrevista Técnica de Requerimientos

El Coordinador (o `@planner`) entrevista al usuario mediante preguntas directas y concretas:
1. **Problema y Contexto**: ¿Qué necesidad de negocio o problema técnico resuelve esta feature?
2. **Actores y Flujos**: ¿Quiénes interactúan con el sistema y cuál es el flujo principal esperado?
3. **Casos Límite y Errores**: ¿Qué condiciones excepcionales, fallos de red, validaciones de datos o estados de borde deben contemplarse?
4. **Criterios de Éxito**: ¿Cómo sabremos que la funcionalidad está terminada y correcta?

---

## Fase 4: Redacción de `specs/NNN-slug/spec.md`

`@planner` genera el archivo `specs/NNN-slug/spec.md` utilizando la plantilla `templates/specs/spec.md.template`.

### Reglas Estrictas de Redacción:
1. **Sintaxis Formal EARS en Español para Requerimientos Funcionales**:
   - **Requerimiento ubicuo**: `EL SISTEMA [hará X]`
   - **Disparado por evento**: `CUANDO [evento], EL SISTEMA [hará X]`
   - **Disparado por estado**: `MIENTRAS [estado], EL SISTEMA [hará X]`
   - **Condicional / Opcional**: `SI [condición], ENTONCES EL SISTEMA [hará X]`
   - **Complejo (Evento + Estado)**: `MIENTRAS [estado], CUANDO [evento], EL SISTEMA [hará X]`
2. **Cero Adjetivos Vagos**: Prohibido usar expresiones como *"rápido"*, *"eficiente"*, *"amigable"* o *"seguro"* sin una métrica verificable asociada.
3. **Encabezado y Metadatos**:
   ```markdown
   # Spec NNN: [Nombre de la Feature]

   - **Identificador**: NNN-[slug]
   - **Estado**: borrador
   - **Fecha de Creación**: AAAA-MM-DD
   - **Rama Base**: develop
   - **Rama de Trabajo**: feature/NNN-slug
   ```

---

## Fase 5: Confirmación y Siguiente Paso

1. Muestra el resumen de la spec creada y la ruta del archivo:
   - [spec.md](file:///specs/NNN-slug/spec.md)
2. Notifica el estado actual (`borrador`) e indica el siguiente comando obligatorio:
   > *"Spec inicializada en estado `borrador`. Para auditar ambigüedades, contradicciones y casos límite antes del plan técnico, ejecuta `/sdd-clarify`."*
