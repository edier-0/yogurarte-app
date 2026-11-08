---
name: git-pr-workflow
description: Flujo estricto de Git, ramas protegidas, Pull Requests en GitHub y sincronización en YogurArte. Usar para cualquier ciclo de desarrollo, commit, push, rebase, PR y eliminación de ramas.
---

# Git & PR Workflow — YogurArte

Protocolo canónico de control de versiones y ciclo de vida de Pull Requests para YogurArte. Codifica la experiencia de un ingeniero de software senior y DevOps para garantizar aislamiento total, trazabilidad, cero regresiones y despliegues limpios hacia producción.

---

## 1. Principios Innegociables de Rama y Aislamiento

1. **Ramas Protegidas y Base:**
   - `develop`: Rama permanente de integración de desarrollo. Todo feature, fix, chore o refactor converge aquí exclusivamente mediante Pull Request remoto.
   - `main`: Rama permanente de producción. Siempre debe ser estable y desplegable. Solo recibe cambios mediante sincronización directa desde `develop` tras haber sido integrados y validados vía PR.
2. **Aislamiento Total (Feature Branches Dedicadas):**
   - **PROHIBIDO** commitear directamente sobre `develop` o `main`.
   - Todo trabajo se ejecuta en una rama temática aislada partiendo siempre del estado más reciente de `origin/develop`.
   - Nombres de ramas obligatorios con prefijo semántico:
     - `feature/<nombre>`: Nuevas funcionalidades de negocio.
     - `fix/<nombre>`: Correcciones de bugs, hotfixes o afinamiento de build.
     - `chore/<nombre>`: Mantenimiento, dependencias, configuración de herramientas o linters.
     - `refactor/<nombre>`: Reestructuración de código sin alterar comportamiento.
     - `docs/<nombre>`: Documentación, especificaciones SDD, arquitectura o constitución.
3. **Prohibición de Merges Locales a Ramas Base:**
   - La rama local `develop` (o `main`) **NUNCA** recibe merges manuales directos de la rama de trabajo (`git merge feature/...` en local está terminantemente prohibido).
   - El Pull Request en GitHub es el **único** mecanismo autorizado para integrar cambios hacia `develop`.
4. **Protocolo Estricto de Consultas al Usuario (Puntos de Control Humanos):**
   - **Pregunta 1:** Preguntar y obtener confirmación del usuario **ANTES** de abrir el Pull Request en GitHub (salvo orden expresa de ejecución desatendida).
   - **Pregunta 2:** Preguntar y obtener confirmación del usuario **ANTES** de fusionar (merge) el Pull Request (salvo orden expresa de ejecución desatendida).
   - **Pregunta 3 (Salvaguarda Inviolable):** Preguntar y obtener autorización explícita **ANTES** de eliminar cualquier rama, ya sea local (`git branch -d`) o remota (`git push origin --delete`). **Nunca** borrar ramas de forma automática o desatendida.

---

## 2. Secuencia Operativa Paso a Paso (Ciclo de Vida Completo)

```
[develop] ───────────────────────────────────────────────┬─► (PR remoto fusionado) ─► [main]
    │                                                    ▲
    └──► [tipo/nombre-tarea] ──► Commits ──► Pre-Push ───┘
                                 Atómicos    Checks
```

### Paso 1: Inicialización Limpia de Rama
Partir siempre del estado idéntico al servidor remoto (`origin/develop`):
```bash
git checkout develop
git pull origin develop
git checkout -b <tipo>/<nombre-tarea>
```

### Paso 2: Desarrollo y Commits Atómicos
1. Aplicar la metodología **SDD** y ciclo **Red-Green-Refactor**:
   - Pruebas primero en rojo.
   - Implementación mínima necesaria.
   - Pruebas en verde (`vitest` / `npx tsc --noEmit`).
2. Realizar commits granulares y autocontenidos. Un commit debe resolver una sola unidad lógica de cambio.
3. Mensajes en español con formato **Conventional Commits**:
   - `feat(modulo): descripción clara del cambio`
   - `fix(docker): resolver congelamiento de dependencias en WSL2`
   - `docs(skills): documentar flujo canonico de git y pr`
   - `test(orders): agregar casos limite para calculo de deuda dinamica`
   - `chore(deps): actualizar dependencias y podar paquetes no utilizados`
4. **Verificación de estado antes de commitear:**
   ```bash
   git status
   git diff --staged
   ```
   *Regla de Oro:* Jamás commitear archivos `.env`, credenciales hardcodeadas, carpetas de build (`dist/`), ni temporales.

### Paso 3: Puertas de Calidad Pre-Integración (Quality Gates)
Antes de sincronizar o publicar la rama, es **obligatorio** ejecutar y aprobar todas las verificaciones locales:
1. **Tipado Backend:**
   ```bash
   npx tsc --noEmit
   ```
2. **Build de Frontend:**
   ```bash
   npm --prefix frontend run build
   ```
3. **Pruebas Automatizadas:**
   ```bash
   npx vitest run
   ```
4. **Inspección de Secretos y Linters (DevSecOps):**
   - Verificar que no existan credenciales como fallback (`|| 'postgresql://...'`) en scripts o tests.
   - Confirmar que `.dockerignore` y `.gitignore` cubren los archivos sensibles.

### Paso 4: Sincronización Pre-PR con `develop`
Para evitar conflictos en remoto y mantener un historial limpio:
```bash
git fetch origin
git rebase origin/develop
```
*(Alternativa si se requiere preservar contexto de merge explícito: `git merge origin/develop`).*

> **Resolución de Conflictos:**
> Si surgen conflictos durante el rebase/merge, resolverlos exclusivamente dentro de `<tipo>/<nombre-tarea>`, volver a ejecutar los Quality Gates (`npx tsc --noEmit && npm test`), y continuar:
> ```bash
> git add <archivos-resueltos>
> git rebase --continue
> ```

### Paso 5: Publicación (Push) al Remoto
Publicar la rama temática al repositorio de GitHub:
```bash
git push origin <tipo>/<nombre-tarea>
```
*(Si se aplicó rebase y la rama ya había sido enviada previamente a remoto, usar siempre `--force-with-lease`, **nunca** `--force` crudo):*
```bash
git push --force-with-lease origin <tipo>/<nombre-tarea>
```

### Paso 6: Apertura del Pull Request (PR)
1. **Checkpoint:** Solicitar autorización al usuario:
   > *"He completado el desarrollo y verificado los Quality Gates (tipos, tests, build) exitosamente. ¿Deseas que proceda a abrir el Pull Request hacia `develop`?"*
2. Una vez confirmada la acción, abrir el PR hacia `develop` (vía GitHub MCP tool `create_pull_request`):
   - **Base Branch:** `develop`
   - **Head Branch:** `<tipo>/<nombre-tarea>`
   - **Título:** Formato semántico claro (ej. `fix(docker): optimizar construccion multi-stage para ci y local`)
   - **Cuerpo del PR:**
     - Contexto y justificación del cambio.
     - Resumen técnico de modificaciones.
     - Checklist de pruebas y validaciones ejecutadas.
     - Referencia a Spec o Issue si aplica (`Closes #XX` o `Spec 011`).

### Paso 7: Fusión y Aceptación del PR
1. Verificar que los checks de CI en GitHub Actions pasen en verde.
2. **Checkpoint:** Solicitar autorización al usuario antes de fusionar:
   > *"El Pull Request #XX está listo, con todas las revisiones y validaciones de CI aprobadas. ¿Confirmas la fusión (Squash and Merge) hacia `develop`?"*
3. Tras la confirmación, ejecutar el merge (vía GitHub MCP tool `merge_pull_request` con método `squash` o el configurado).

### Paso 8: Sincronización a Producción (`main`)
Una vez integrado en `develop` vía GitHub:
```bash
git checkout develop
git pull origin develop
git checkout main
git merge develop
git push origin main
git checkout develop
```
*Nota:* No se abre PR intermedio entre `develop` y `main` porque `develop` ya consolidó y validó los cambios aprobados.

### Paso 9: Salvaguarda Obligatoria para Eliminación de Ramas
Una vez que el cambio está desplegado en `develop` y `main`:
1. **REGLA ESTRICTA:** Preguntar explícitamente al usuario:
   > *"Los cambios han sido fusionados y sincronizados con éxito en `develop` y `main`. ¿Autorizas la eliminación de la rama temática `<tipo>/<nombre-tarea>` en local y remoto?"*
2. **Únicamente tras recibir aprobación afirmativa:**
   ```bash
   git checkout develop
   git pull origin develop
   git branch -d <tipo>/<nombre-tarea>
   git push origin --delete <tipo>/<nombre-tarea>
   ```
3. Si el usuario prefiere conservar la rama, se mantiene sin cambios.

---

## 3. Matriz de Control de Errores y Casos Límite (Senior Playbook)

| Escenario de Riesgo | Acción Correctiva Inmediata |
| :--- | :--- |
| **Commit accidental en `develop` o `main`** | No hacer push. Mover el commit a una rama nueva: `git branch <tipo>/<nombre> && git reset --hard origin/<rama-base>`. |
| **Cambios sin commitear al necesitar cambiar de rama** | Usar stash con nombre descriptivo: `git stash push -m "WIP: <descripcion>"`. Nunca descartar con `checkout .` sin autorización. |
| **Credencial o secreto commiteado localmente (sin push)** | Deshacer el commit preservando archivos: `git reset HEAD~1`, extraer el secreto a `.env`, añadir a `.gitignore` y recommitear. |
| **Fallo en CI de GitHub Actions** | Inspeccionar logs del workflow, reproducir exactamente en local (`npx vitest run`, `docker build`), corregir en la rama temática y pushear. |
| **Conflictos de Rebase complejos** | Si el rebase se vuelve inestable o destructivo, abortar con `git rebase --abort`. Usar `git merge origin/develop` preservando el árbol de trabajo. |
| **Divergencia entre local y remoto** | Nunca forzar con `push --force`. Usar `git fetch` y contrastar con `git log origin/<rama>..<rama>` para auditar diferencias. |

---

## 4. Referencia Cruzada en el Proyecto
- **Constitución del Software:** [docs/constitution.md](file:///c:/Users/edier/Documents/YOGURES/docs/constitution.md) (Artículo 16).
- **Reglas del Proyecto:** [AGENTS.md](file:///c:/Users/edier/Documents/YOGURES/AGENTS.md) (Directiva de Flujo de Trabajo en Git).
- **Catálogo de Skills:** [.agent/skills/using-agent-skills/SKILL.md](file:///c:/Users/edier/Documents/YOGURES/.agent/skills/using-agent-skills/SKILL.md).
