# Spec 011 — Optimización del Build de Docker mediante Empaquetado de Artefactos Locales

Estado: aprobada

## Contexto y objetivo
Al construir la imagen de Docker mediante `docker compose up --build -d`, el proceso fallaba sistemáticamente por timeouts de red (`EIDLETIMEOUT` en `registry.npmjs.org:443`). La investigación técnica reveló que:
1. El conmutador virtual de Windows (`vEthernet (WSL (Hyper-V firewall))`) sufre de saturación y congelamiento de sockets TCP cuando un contenedor Linux intenta descargar paquetes masivos desde internet adentro de WSL2.
2. `prisma/schema.prisma` ya cuenta con `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`, por lo que el binario de Linux de Prisma (`libquery_engine-linux-musl-openssl-3.0.x.so.node`) ya se genera de forma nativa en la máquina host.
3. Todas las dependencias de producción de YogurArte (Express, Vue, Zod, etc.) son código JavaScript puro multiplataforma.
4. En la máquina física Windows, la compilación de TypeScript (`npx tsc`) y del frontend Vue (`vite build`) tarda apenas 7 segundos.

El objetivo es cambiar la estrategia de construcción de Docker a empaquetado directo de artefactos precompilados locales (`node_modules`, `dist/`, `public/`), eliminando por completo cualquier descarga de red adentro del contenedor durante el build, y reduciendo el tiempo de construcción de más de 18 minutos (fallido) a menos de 10 segundos.

## Requisitos funcionales (EARS)
- RF-1: CUANDO el usuario ejecuta `docker compose up --build -d`, EL SISTEMA debe construir la imagen y levantar los contenedores sin fallar por problemas de red ni timeouts de npm.
- RF-2: CUANDO se compila la imagen de Docker, EL SISTEMA debe empaquetar directamente los artefactos locales (`dist/`, `public/`, `node_modules`) que ya contienen el cliente de Prisma generado para Linux Alpine.
- RF-3: CUANDO el contenedor `app` arranca en producción, EL SISTEMA debe ejecutar `docker-entrypoint.sh` sincronizando la base de datos con `npx prisma db push --skip-generate` utilizando el CLI local de Prisma sin requerir acceso a internet.
- RF-4: CUANDO los servicios estén arriba, EL SISTEMA debe responder exitosamente (HTTP 200) en el endpoint `/api/health`.

## Requisitos no funcionales
- RNF-1 (Rendimiento): El build de Docker debe completarse en menos de 15 segundos.
- RNF-2 (Compatibilidad): No alterar el código fuente ni las pruebas existentes (`npm test`, `npx tsc --noEmit`).
- RNF-3 (Seguridad): Mantener las políticas de hardening del contenedor (usuario no root `node`, `dumb-init` en PID 1).

## Casos límite
- Esquema de base de datos actualizado: La compilación local con `npm run build` regenera el cliente de Prisma para `native` y `linux-musl-openssl-3.0.x` antes del empaquetado.
- Exclusión de archivos innecesarios: `.dockerignore` debe ignorar carpetas pesadas de desarrollo (`.git`, `tests`, `specs`, `backups`, `scratch`, `docs`) para mantener el contexto de build ligero.

## Fuera de alcance
- Modificación de esquemas de Prisma o lógica de negocio.
