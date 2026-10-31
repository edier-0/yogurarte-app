# Tareas 011 — Optimización del Build de Docker

- [x] **T1. Eliminar override huérfano de `sharp` en `package.json` y actualizar `package-lock.json`.** RF-2
  - Hecho cuando: `package.json` no contenga `sharp` en overrides y `package-lock.json` se encuentre sincronizado.
- [x] **T2. Compilar aplicación en el host.** RF-2
  - Hecho cuando: `npm run build` genere `dist/`, `public/` y el cliente de Prisma para Linux en `node_modules/.prisma/client`.
- [x] **T3. Actualizar `.dockerignore` y `Dockerfile` para empaquetado directo de artefactos.** RF-1, RF-2, RNF-1, RNF-3
  - Hecho cuando: `Dockerfile` copie los artefactos locales sin ejecutar descargas de npm y `.dockerignore` permita `dist/` y `node_modules/`.
- [x] **T4. Ejecutar `docker compose up --build -d` y verificar salud de los contenedores.** RF-1, RF-3, RF-4, RNF-1
  - Hecho cuando: Las imágenes se construyan en menos de 15 segundos y los contenedores `yogurarte_postgres` y `yogurarte_app` reporten `healthy` con respuesta 200 en `/api/health`.
- [x] **T5. Actualizar `MEMORY.md` y preparar commit.** RNF-2
  - Hecho cuando: `MEMORY.md` registre la decisión y el diario del proyecto quede al día.
