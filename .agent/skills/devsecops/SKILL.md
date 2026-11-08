---
name: devsecops
description: Estándares de seguridad DevSecOps, política estricta de cero fallbacks de credenciales, escaneo de secretos, auditoría de dependencias y linters de seguridad en YogurArte.
---

# DevSecOps & Security Hardening — YogurArte

Guía canónica y directivas de seguridad innegociables para el desarrollo, auditoría y despliegue del sistema YogurArte. Esta skill establece los controles que previenen fugas de credenciales en repositorios, vulnerabilidades en dependencias y fallas de autorización.

---

## 1. La Regla de Oro: Prohibición Total de Fallbacks de Credenciales

Queda **terminantemente prohibido** quemar o hardcodear cadenas de conexión, contraseñas, tokens JWT o claves de API como valor por defecto o fallback (`|| 'postgresql://...'`) en scripts de utilidad, archivos de prueba, migraciones o código de aplicación.

### Patrón Prohibido (Vulnerabilidad Crítica):
```javascript
// ❌ INACEPTABLE: Si falta la variable, expone credenciales reales en el repositorio
const dbUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_SecretPass123@ep-cool-fog-12345.us-east-2.aws.neon.tech/neondb';
```

### Patrón Obligatorio (Fail-Fast Seguro):
```javascript
// ✅ CORRECTO: Exigir explícitamente la variable y fallar de inmediato
require('dotenv').config();

const dbUrl = process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.error('\n❌ ERROR DE SEGURIDAD: La variable de entorno NEON_DATABASE_URL no está definida en .env');
  console.error('👉 Por directiva constitucional de DevSecOps, está prohibido hardcodear credenciales por defecto.');
  process.exit(1);
}
```

---

## 2. Matriz de Detección de Secretos Pre-Commit

Antes de ejecutar cualquier commit o abrir un Pull Request, el agente o desarrollador debe inspeccionar el diff (`git diff --staged`) para verificar que **ninguno** de los siguientes patrones sea introducido:

| Tipo de Secreto | Patrón de Riesgo | Acción Correctiva Inmediata |
| :--- | :--- | :--- |
| **Cadena de Conexión BD** | `postgresql://`, `postgres://`, `@.*\.neon\.tech` | Mover a `.env` y usar `process.env.<VAR>`. Verificar `.gitignore`. |
| **Tokens JWT o Claves de Sesión** | `eyJhbGciOi...`, `JWT_SECRET=...` | Usar únicamente variables de entorno o valores dummy en pruebas. |
| **Credenciales de WhatsApp** | `creds.json`, claves privadas Baileys | Asegurar que `public/uploads/` y carpetas de sesión estén en `.gitignore`. |
| **Tokens de GitHub / Cloud** | `ghp_...`, `AWS_SECRET_ACCESS_KEY` | Reemplazar inmediatamente por GitHub Secrets en CI. |

---

## 3. Plantilla Segura de `.env.example`

El repositorio solo debe albergar `.env.example` con valores de plantilla ficticios y explicativos:

```env
# ==============================================================================
# PLANTILLA DE CONFIGURACIÓN DE ENTORNO — YOGURARTE
# ADVERTENCIA: NUNCA colocar credenciales de producción o tokens reales aquí.
# ==============================================================================

NODE_ENV=development
PORT=3000

# Base de datos local (PostgreSQL Docker)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/yogurarte?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/yogurarte_test?schema=public"

# Base de datos en la nube (Neon Tech - Solo en .env privado, no llenar aquí)
NEON_DATABASE_URL="postgresql://<usuario>:<password>@<host-neon>.neon.tech/<dbname>?sslmode=require"

# Seguridad y Autenticación
JWT_SECRET="reemplazar-con-un-secreto-aleatorio-seguro-minimo-32-caracteres"
JWT_EXPIRES_IN="1d"
```

---

## 4. Auditoría de Dependencias y Seguridad en CI

El pipeline de integración continua (`.github/workflows/ci.yml`) debe ejecutar de forma obligatoria las compuertas de seguridad:

1. **Auditoría de Vulnerabilidades en Producción:**
   ```bash
   npm audit --omit=dev --audit-level=high
   ```
   *Criterio de Aceptación:* Ninguna vulnerabilidad de nivel `high` o `critical` es tolerada en dependencias de producción.
2. **Superficie Reducida en Contenedores:**
   - La imagen final de Docker debe excluir todas las `devDependencies`.
   - Ningún contenedor de producción debe correr con privilegios `root` (`USER node`).

---

## 5. Validación de Entradas y Protección contra Inyección

1. **Esquemas Zod en Toda Entrada de Red:**
   - Todo endpoint en `src/modules/<modulo>/` debe validar obligatoriamente `req.body`, `req.query` y `req.params` con schemas de Zod mediante los middlewares `validateBody`, `validateQuery` y `validateParams`.
   - Prohibido pasar objetos crudos de `req.body` a llamadas de Prisma (`prisma.order.create({ data: req.body })` es una violación grave; usar siempre el tipo parseado).
2. **Encabezados de Seguridad HTTP:**
   - Express debe configurar `helmet` para protección contra XSS, Clickjacking y MIME sniffing.
   - CORS debe estar restringido a los orígenes autorizados del frontend en producción.

---

## 6. Procedimiento de Respuesta ante Fugas Accidentales

Si por error se commitea una credencial sensible antes de hacer push:
1. **NO HACER PUSH.**
2. Deshacer el commit preservando los archivos modificados:
   ```bash
   git reset HEAD~1
   ```
3. Reemplazar la credencial por la variable de entorno correspondiente.
4. Si la credencial llegó a ser publicada en el remoto:
   - Rotar y revocar inmediatamente la contraseña en Neon o el proveedor afectado.
   - Limpiar el historial de Git mediante rebase interactivo o `git-filter-repo`.
