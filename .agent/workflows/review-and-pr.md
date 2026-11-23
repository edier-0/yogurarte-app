---
description: Sincroniza la rama temática, resuelve colisiones numéricas, abre el Pull Request en 3 niveles, gestiona release a main y limpia ramas tras autorización.
---

# Workflow: Revisión Final, Pull Request y Sincronización (`/review-and-pr`)

Este workflow gestiona la fase final de integración en Git: sincronización con la rama base, resolución asistida de conflictos y colisiones de numeración, publicación de la rama, apertura del Pull Request en 3 niveles de degradación elegante, sincronización a producción y limpieza post-merge con confirmación explícita.

---

## Pre-Condiciones

1. La spec debe estar en `Estado: validada` tras la aprobación de `@reviewer` en `/sdd-validate`.
2. Todos los tests de la suite (`TEST_COMMAND`) deben estar en verde.
3. El árbol de trabajo debe estar limpio sin cambios residuales.

---

## Fase 1: Sincronización Pre-PR y Resolución de Conflictos

1. **Sincronización con la Rama Base**:
   - Lee `PR_TARGET_BRANCH` de `AGENTS.md` (por defecto `develop` o `main`).
   - Si existe repositorio remoto configurado (`origin`):
     ```bash
     git fetch origin
     git rebase origin/<base_branch>
     ```
   - Si opera en modo local-first / offline (sin remoto):
     ```bash
     git rebase <base_branch>
     ```
2. **Tratamiento de Conflictos Git**:
   - **Conflictos Mecánicos Triviales**: Si surgen conflictos menores (orden de imports, líneas adyacentes o formato en manifiestos), el agente los resuelve, continúa el rebase (`git rebase --continue`) y ejecuta `TEST_COMMAND` para asegurar que todo permanezca en verde.
   - **Conflictos de Lógica o Negocio**: Si el conflicto toca reglas de negocio o decisiones de arquitectura, el agente **SE DETIENE DE INMEDIATO**, muestra las líneas en conflicto y solicita al usuario resolver el conflicto manualmente.

---

## Fase 2: Detección y Resolución de Colisiones Numéricas

Si durante la sincronización se detecta que otro PR concurrente integró una carpeta con el mismo identificador numérico en la rama base (ej. ya existe `specs/003-notificaciones/` y la rama actual también es `003-perfil`):
1. `@planner` calcula el siguiente correlativo libre disponible `max(NNN) + 1` (ej. `004`).
2. Renombra la carpeta local: `specs/003-perfil/` -> `specs/004-perfil/`.
3. Actualiza el identificador en `spec.md`, `plan.md` y `tasks.md`.
4. En modo `branch_pr`, renombra concurrentemente la rama local de Git para mantener alineación 1:1:
   ```bash
   git branch -m feature/003-perfil feature/004-perfil
   ```
5. Realiza un commit de ajuste: `chore(004): reasignar identificador correlativo por colisión de numeración`.

---

## Fase 3: Publicación (Push) de la Rama Temática

Una vez rebasada y sincronizada limpiamente en local:
1. Publica la rama temática al repositorio remoto:
   ```bash
   git push -u origin <tipo>/<NNN-slug>
   ```
   *(Si se aplicó rebase y la rama ya existía en remoto: `git push --force-with-lease origin <tipo>/<NNN-slug>`)*.

---

## Fase 4: Apertura del Pull Request (Estrategia en 3 Niveles)

El sistema intenta abrir el Pull Request utilizando la mejor herramienta disponible:

1. **Nivel 1: Servidor GitHub MCP (Nativo)**:
   - Si el servidor MCP `github` está disponible y autenticado, invoca la herramienta `create_pull_request`:
     - Base: `<base_branch>` (ej. `develop` o `main`).
     - Head: `<tipo>/<NNN-slug>`.
     - Título: `<tipo>(<NNN>): <nombre descriptivo de la feature>`.
     - Cuerpo: Resumen de requerimientos funcionales, criterios de aceptación, comandos de verificación y referencia a `specs/NNN-slug/spec.md`.
2. **Nivel 2: GitHub CLI (`gh`)**:
   - Si no hay MCP pero `gh` está instalado en la consola del sistema:
     ```bash
     gh pr create --base <base_branch> --head <tipo>/<NNN-slug> --title "<tipo>(<NNN>): <nombre>" --body "<resumen>"
     ```
3. **Nivel 3: Enlace Web Directo (Degradación Manual Asistida)**:
   - Si no hay MCP ni CLI disponible, genera e imprime la URL de apertura en el navegador:
     ```
     https://github.com/<owner>/<repo>/compare/<base_branch>...<tipo>/<NNN-slug>?expand=1
     ```

---

## Fase 5: Fusión y Sincronización a Producción (`main`)

1. **Autorización de Merge**:
   - Revisa `AGENT_CAN_MERGE` en `AGENTS.md`.
   - Si es `true`: consulta confirmación al usuario antes de proceder a la fusión.
   - Si es `false`: notifica que el PR queda abierto a la espera de revisión y aprobación humana en GitHub.
2. **Sincronización Asistida a Producción (`main`)**:
   - Si la rama base del PR fue `develop`, tras fusionar en `develop`, consulta al usuario:
     > *"¿Deseas sincronizar estos cambios a producción (`main`) ahora?"*
   - Si el usuario autoriza:
     - Sincroniza localmente: `git checkout develop && git pull origin develop`.
     - Intenta fusionar y publicar en `main`:
       ```bash
       git checkout main && git merge develop && git push origin main
       ```
     - **Manejo de Ramas Protegidas en `main`**: Si GitHub rechaza el push directo por reglas de protección de rama (`protected branch hook`), crea automáticamente un Pull Request de Release (`compare: develop -> base: main`), reporta el enlace y solicita aprobación en GitHub.

---

## Fase 6: Protocolo Estricto de Limpieza Post-Merge

Tras confirmarse la integración del PR en la rama base:
1. **REGLA MANDATORIA DE AUTORIZACIÓN**:
   - El agente **DEBE PREGUNTAR SIEMPRE AL USUARIO** antes de eliminar cualquier rama local o remota.
   - Queda terminantemente prohibido ejecutar `git branch -d` o `git push origin --delete` de forma automática sin permiso explícito.
2. Tras la confirmación del usuario, ejecuta la limpieza:
   ```bash
   git checkout <base_branch>
   git pull origin <base_branch>
   git branch -d <tipo>/<NNN-slug>
   git push origin --delete <tipo>/<NNN-slug>
   ```

---

## Fase 7: Cierre de la Especificación y Memoria

1. `@planner` actualiza el encabezado de `specs/NNN-nombre/spec.md`:
   ```markdown
   - **Estado**: completada
   - **Fecha de Cierre**: AAAA-MM-DD
   ```
2. Registra el resumen en `MEMORY.md`:
   - Feature implementada y cerrada.
   - Decisiones de arquitectura tomadas y su justificación.
   - Poda activa para mantener `MEMORY.md` por debajo de ~50 líneas.
3. Emite un mensaje final de felicitación y cierre de ciclo:
   > *"🎉 Feature [NNN] integrada y cerrada con éxito. El repositorio está limpio, sincronizado y listo para la próxima especificación."*
