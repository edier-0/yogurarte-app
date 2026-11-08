---
name: shipping-and-launch
description: Prepara y valida despliegues a producción con listas de verificación, monitoreo y planes de reversión (rollback). Usar al liberar versiones o sincronizar main en YogurArte.
---

# Shipping & Production Launch — YogurArte

Guía para desplegar a producción con absoluta certidumbre. El objetivo de ingeniería no es simplemente "hacer push", sino desplegar de forma segura, con compuertas de calidad automatizadas, supervisión activa de estado y un plan de contingencia (*rollback*) probado en caso de anomalías.

---

## 1. La Lista de Verificación Pre-Lanzamiento (Pre-Launch Checklist)

Antes de integrar un cambio en `main` y enviarlo a producción, deben verificarse todos los elementos:

### A. Calidad de Código y Pruebas
- [ ] Compilación estricta de TypeScript aprobada sin errores (`npx tsc --noEmit`).
- [ ] Empaquetado de frontend en Vite completado limpiamente (`npm --prefix frontend run build`).
- [ ] Suite completa de pruebas unitarias e integración en verde (`npx vitest run`).
- [ ] Golden-Master de balance y costeo pasando (`tests/golden_master.test.ts`).
- [ ] Cero `console.log` o código de depuración en los archivos modificados.

### B. Seguridad y DevSecOps
- [ ] Escaneo de secretos limpio: ninguna contraseña, token JWT o credencial expuesta en git diff.
- [ ] Política de cero fallbacks cumplida: todos los scripts exigen explícitamente variables desde `.env`.
- [ ] Auditoría de dependencias de producción limpia: `npm audit --omit=dev --audit-level=high`.
- [ ] Permisos RBAC validados en los endpoints nuevos o modificados.

### C. Base de Datos y Persistencia
- [ ] Esquema Prisma sincronizado en el entorno destino (`prisma migrate deploy` o `prisma db push --skip-generate`).
- [ ] Backup de seguridad de la base de datos generado antes de cualquier cambio destructivo de datos.
- [ ] Cero consultas N+1 en las rutas afectadas.

### D. Contenedores y Runtime
- [ ] Imagen de Docker construida con arquitectura multi-stage (`docker-hardening`).
- [ ] Proceso ejecutándose como usuario no root (`node`).
- [ ] Endpoint de salud respondiendo correctamente (`/api/health` en HTTP 200).

---

## 2. Secuencia de Despliegue hacia `main`

Siguiendo el protocolo canónico de **`git-pr-workflow`**:

```bash
# 1. Asegurar que develop esté actualizado con el PR recién fusionado en GitHub
git checkout develop
git pull origin develop

# 2. Sincronizar a producción (main) sin PR intermedio
git checkout main
git merge develop
git push origin main

# 3. Retornar inmediatamente a develop
git checkout develop
```

---

## 3. Plan de Contingencia y Reversión (*Rollback Plan*)

Si se detecta una regresión crítica en producción tras el despliegue:

1. **Reversión Inmediata de Git:**
   ```bash
   git checkout main
   git revert -m 1 HEAD # Si fue un merge commit
   git push origin main
   ```
2. **Reversión de Contenedor:**
   Reiniciar el contenedor con la imagen previa estable de Docker.
3. **Reversión de Base de Datos:**
   Restaurar el snapshot de Neon o backup preventivo si la migración de datos corrompió registros.
