# Spec 012 — Optimización del Build de Docker y Compatibilidad CI/Local

Estado: aprobada

## Contexto y objetivo
Al construir la imagen de Docker mediante `docker compose up --build -d`, el proceso fallaba sistemáticamente por timeouts de red (`EIDLETIMEOUT` en `registry.npmjs.org:443`). La investigación técnica reveló que:
1. El conmutador virtual de Windows (`vEthernet (WSL (Hyper-V firewall))`) sufre de saturación y congelamiento de sockets TCP cuando un contenedor Linux intenta descargar paquetes masivos desde internet adentro de WSL2.
2. La dependencia huérfana `sharp` en `overrides` de `package.json` forzaba la descarga de 35 MB de binarios C++ que saturaban el adaptador de red en WSL2.
3. El script de postinstall de `@prisma/engines` intentaba descargar binarios de red de forma descontrolada durante `npm ci`.
4. El pipeline remoto de GitHub Actions requería una compilación autónoma desde el código fuente sin depender de archivos del host.

El objetivo es implementar un Dockerfile Multi-Stage autónomo, endurecido y resiliente, que use BuildKit cache mounts, `--ignore-scripts`, reutilice el motor nativo de Linux en local y compile de forma autónoma en CI/remoto.

## Requisitos funcionales (EARS)
- RF-1: CUANDO el usuario ejecuta `docker compose up --build -d`, EL SISTEMA debe construir la imagen y levantar los contenedores sin fallar por problemas de red ni timeouts de npm.
- RF-2: CUANDO se compila la imagen en CI o remoto, EL SISTEMA debe construir de forma 100% autónoma a partir del código fuente.
- RF-3: CUANDO se detecta el motor de Linux predescargado en local, EL SISTEMA debe reutilizarlo evitando descargas de red lentas en WSL2.
- RF-4: CUANDO los servicios estén arriba, EL SISTEMA debe responder exitosamente (HTTP 200) en el endpoint `/api/health`.

## Requisitos no funcionales
- RNF-1 (Rendimiento): El build de Docker debe completarse sin timeouts ni bloqueos de red.
- RNF-2 (Compatibilidad): No alterar el código de negocio ni romper las pruebas existentes (`vitest`, `npx tsc --noEmit`).
- RNF-3 (Seguridad): Mantener las políticas de hardening del contenedor (usuario no root `node`, `dumb-init` en PID 1).

## Casos límite
- Si `node_modules/.prisma` no existe (entorno CI limpio), el builder ejecuta `npx prisma generate` de forma autónoma.
- Si no hay conexión de internet en runtime, la app inicia con los binarios pre-empaquetados y no bloquea el servidor.
