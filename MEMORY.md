# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001 a 015 completadas y sincronizadas en `main` y `develop`.
- Spec 015 (Libro de Recetas y Estandarización de Producción) 100% completada, verificada y desplegada:
  - PR #37 (`feature/recipe-book-sop`) fusionado en `develop` y sincronizado en `main`.
  - PR #38 (`fix/ci-recipes-test-isolation`) resolvió aislamiento de tests en CI limpio; fusionado en `develop` y `main`.
  - CI / CD Pipeline en GitHub Actions: **100% en verde** tanto en `develop` como en `main`.
  - 41/41 tests pasando (29 Spec 015 + 12 Golden Master). Build de frontend y backend 100% limpio.
- Rama actual: `develop`.

## Decisiones (y por qué)
- Desacoplamiento de sabor y presentación: evita triplicar recetas por tamaño.
- Insumos editables en preparación de compuestos: elimina la fricción operativa de reconfigurar recetas fijas en almacén cada vez que se cocina una cantidad distinta o con fruta real ajustada.
- Envase con tapa integrada: refleja la operación física real en Fonseca (sin gestión separada de tapas).
- Confidencialidad RBAC en backend: operarios de producción no reciben costos unitarios ni márgenes brutos.
- Aislamiento total en CI: los tests de integración siembran autónomamente sus fixtures base sin depender de `prisma db seed`.

## Próximos pasos
- Ciclo Spec 015 cerrado satisfactoriamente. Listo para la siguiente spec o requerimiento del producto.
