---
name: deprecation-and-migration
description: Gestiona la deprecación, retiro seguro de código legacy y migraciones de esquema sin tiempo de inactividad. Usar al retirar sistemas antiguos o modificar tablas en producción en YogurArte.
---

# Deprecation & Migration — YogurArte

El código es un pasivo de mantenimiento, no un activo. Cada línea de código acarrea costos continuos de soporte, seguridad y carga cognitiva. Esta skill guía la deprecación controlada y la migración segura de datos, APIs y componentes sin provocar caídas de servicio (*zero-downtime*) ni romper a los clientes que consumen el sistema.

---

## 1. El Patrón Expandir y Contraer (*Expand & Contract*) en Base de Datos

Al modificar esquemas relacionales en PostgreSQL con Prisma (`schema.prisma`), **queda prohibido renombrar o eliminar columnas activas en un solo paso destructivo**. Aplica el ciclo en 3 fases:

```
FASE 1: EXPANDIR          FASE 2: TRANSICIÓN           FASE 3: CONTRAER
┌─────────────────┐       ┌─────────────────┐          ┌─────────────────┐
│ Columna Antigua │       │ Columna Antigua ──(Migrar) │                 │
│        +        │  ──►  │        +         Datos     │  ──►            │
│ Columna Nueva   │       │ Columna Nueva   ◄───────── │ Columna Nueva   │
│   (Opcional)    │       │ (Doble Escritura)          │  (Definitiva)   │
└─────────────────┘       └─────────────────┘          └─────────────────┘
```

1. **Fase 1 (Expandir):** Agrega el nuevo campo como opcional o con valor por defecto en `schema.prisma`. Aplica la migración sin tocar el campo viejo.
2. **Fase 2 (Transición):** Actualiza el servicio (`service.ts`) para escribir en ambos campos (*doble escritura*) y leer del nuevo. Ejecuta un script seguro de backfill para migrar registros históricos.
3. **Fase 3 (Contraer):** Una vez verificado que el 100% del tráfico usa el nuevo campo, retira el campo antiguo del esquema y ejecuta la poda en base de datos.

---

## 2. Gestión de Carpetas y Rutas Legacy en YogurArte

Actualmente conviven restos de la arquitectura anterior (`src/controllers/`, `src/routes/`, `src/schemas/`) junto a la arquitectura modular canónica (`src/modules/<dominio>/`).

### Reglas Innegociables:
- **Prohibido agregar features en carpetas legacy:** Todo nuevo código pertenece exclusivamente a `src/modules/<dominio>/`.
- **Preservación de Alias:** Conservar compatibilidad con rutas legadas que el frontend o integraciones de WhatsApp consumen (ej. `/api/auth` y `/api/users`; `/api/customers` y `/api/clientes`).
- **Migración Progresiva:** Para migrar un endpoint legacy:
  1. Reubica la lógica en `src/modules/<dominio>/`.
  2. Haz que la ruta legacy delegue como alias transparente al nuevo controlador.
  3. Actualiza el frontend para llamar al nuevo endpoint.
  4. Retira la ruta legacy solo tras verificar que no recibe tráfico.

---

## 3. Checklist de Deprecación Segura
- [ ] La alternativa de reemplazo está 100% implementada y probada antes de marcar algo como deprecado.
- [ ] No existen dependencias huérfanas en el frontend llamando al endpoint a retirar.
- [ ] Las migraciones de base de datos se aplicaron sin bloqueos de tabla destructivos.
- [ ] Se documentó el cambio en `MEMORY.md`.
