# Tareas 012 — Optimización del Build de Docker y Compatibilidad CI/Local

- [x] **T1. Eliminar override huérfano de `sharp` en `package.json` y sincronizar lockfile.** RF-1, RNF-2
  - Hecho cuando: `package.json` no contenga `sharp` en overrides y no provoque descargas de 35 MB de C++.
- [x] **T2. Configurar Dockerfile Multi-Stage autónomo y endurecido.** RF-1, RF-2, RNF-3
  - Hecho cuando: Dockerfile use cache mounts de BuildKit, flags de resiliencia (`--ignore-scripts`, `--legacy-peer-deps`) y poda limpia de dependencias.
- [x] **T3. Incorporar reutilización inteligente de `.prisma` en `.dockerignore` y Dockerfile.** RF-3, RNF-1
  - Hecho cuando: Si el motor de Linux existe localmente se reutilice en 0.3s, y si es CI se genere de forma autónoma.
- [x] **T4. Ejecutar simulación completa de CI (Job 1 y Job 2) y levantar servicios.** RF-1, RF-4, RNF-1
  - Hecho cuando: `docker build -t yogurarte-app:ci .` finalice con éxito (exit code 0), los contenedores queden `healthy` y `/api/health` responda 200 OK.
- [x] **T5. Actualizar documentación y MEMORY.md.** RNF-2
  - Hecho cuando: `MEMORY.md` registre las decisiones arquitectónicas y aprendizajes del build de Docker.
