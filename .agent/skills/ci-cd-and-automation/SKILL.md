---
name: ci-cd-and-automation
description: Automatiza y gestiona el pipeline de CI/CD en GitHub Actions y compuertas de calidad. Usar al modificar workflows, agregar pruebas automatizadas o auditar el proceso de despliegue en YogurArte.
---

# CI/CD & Pipeline Automation — YogurArte

Guía canónica para la automatización de compuertas de calidad e integración continua en YogurArte. El pipeline de CI/CD (`.github/workflows/ci.yml`) es el mecanismo de aplicación estricta de todas las demás skills: garantiza que ningún cambio llegue a las ramas base (`develop` o `main`) sin haber superado de forma automatizada las pruebas, tipos, auditoría de seguridad y empaquetado de contenedores.

---

## 1. Principios del Pipeline de Integración Continua

1. **Desplazar a la Izquierda (*Shift Left*):** Detectar problemas lo más temprano posible. Un fallo de tipos en `tsc` tarda 5 segundos en detectarse; el mismo fallo descubierto en runtime en producción cuesta horas.
2. **Fallar Rápido (*Fail-Fast*):** Cualquier paso que falle (tipos, tests, auditoría o build de Docker) detiene inmediatamente el pipeline y marca el Pull Request en rojo.
3. **Cancelación en Progreso (*Cancel-in-Progress*):** Si se envían nuevos commits a una rama abierta con PR, el workflow en ejecución anterior se cancela automáticamente para ahorrar minutos de cómputo en GitHub Actions.

---

## 2. Anatomía del Pipeline de YogurArte (`ci.yml`)

El pipeline opera en dos trabajos (*jobs*) complementarios y secuenciales:

```
Pull Request hacia develop/main
   │
   ▼
┌────────────────────────────────────────────────────────┐
│ JOB 1: Type Check & Integration Tests (test)           │
│   ├── 🐘 Servicio Postgres 16 en contenedor Alpine     │
│   ├── 📦 npm ci (con npm 11)                           │
│   ├── 🛡️ npm audit --omit=dev --audit-level=high       │
│   ├── 🍶 npx prisma generate                           │
│   ├── 🔍 npx tsc --noEmit                              │
│   ├── 🎨 npm --prefix frontend run build               │
│   ├── 🗄️ npx prisma db push --skip-generate           │
│   └── 🧪 npx vitest run (Suite 27/27)                  │
└────────────────────────────────────────────────────────┘
   │
   ▼ (Si Job 1 pasa en verde)
┌────────────────────────────────────────────────────────┐
│ JOB 2: Docker Image Build Test (docker-build)          │
│   ├── 🐳 Setup Docker Buildx                           │
│   └── 🔨 Build Multi-Stage autónomo (sin host deps)   │
└────────────────────────────────────────────────────────┘
   │
   ▼
✅ PR listo para revisión y fusión (Squash & Merge)
```

---

## 3. Compuertas de Calidad Específicas

### Compuerta 1: Auditoría de Dependencias (DevSecOps)
```bash
npm audit --omit=dev --audit-level=high
```
Bloquea el PR si alguna dependencia de producción introduce vulnerabilidades de severidad alta o crítica.

### Compuerta 2: Tipado Estricto de TypeScript
```bash
npx tsc --noEmit
```
Verifica que todos los módulos en `src/` respeten los contratos de tipos sin errores de compilación ni `any` indebidos.

### Compuerta 3: Empaquetado del Frontend (Vite)
```bash
npm --prefix frontend run build
```
Valida que `vue-tsc` no encuentre errores de tipos en componentes Vue 3 y que los assets se compilen limpiamente en `public/`.

### Compuerta 4: Pruebas de Integración y Base de Datos
```bash
npx prisma db push --skip-generate
npx vitest run
```
Sincroniza el esquema relacional en el contenedor PostgreSQL de CI y corre la suite completa de pruebas unitarias e integración con Vitest.

### Compuerta 5: Construcción de Imagen Docker Multi-Stage
```bash
docker build --no-cache -t yogurarte:ci .
```
Comprueba que el `Dockerfile` sea 100% autónomo y capaz de compilar backend, frontend y Prisma sin depender de archivos de la máquina física local.

---

## 4. Resolución de Fallos en CI

Si el pipeline de GitHub Actions se marca en rojo en un Pull Request:

1. **Consultar los Logs del Workflow:** Identificar el step exacto que falló (ej. `Type Check` o `Vitest`).
2. **Reproducir en Local:** Ejecutar el comando exacto en tu terminal local:
   ```bash
   npx tsc --noEmit
   # o bien:
   npx vitest run
   ```
3. **Corregir en la Rama Temática:** No intentes solucionar el problema creando commits directos en `develop`. Corrige en tu rama temática (`feature/*`, `fix/*`).
4. **Pushear y Revalidar:**
   ```bash
   git push origin <tipo>/<nombre-tarea>
   ```
   GitHub Actions reanudará automáticamente el pipeline.

---

## 5. Checklist de Verificación
- [ ] Todo nuevo endpoint o módulo cuenta con prueba automatizada en Vitest.
- [ ] Ningún secreto ni variable privada se pasa en texto plano en el archivo `.github/workflows/ci.yml`.
- [ ] La compilación y empaquetado de Docker funciona en limpio sin `node_modules` del host.
