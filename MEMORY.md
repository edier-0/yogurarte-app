# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.4.0) y `AGENTS.md` actualizados:
  - Directiva Git: aislamiento en ramas dedicadas, cero merges locales a ramas base, integración vía PR.
  - Protocolo de consultas: preguntar antes de abrir PR y antes de fusionarlo (salvo instrucción explícita de ejecutar todo).
  - El agente crea y fusiona el PR; confirmación obligatoria para eliminar ramas (local/remoto).
  - Presentaciones dinámicas en Fase B, salidas exclusivas en Fase B y alerta de fidelización 10+1.
- Spec 010 completada (T1 a T6), fusionada en `develop` y `main`.
- Rama activa: `develop`.

## Decisiones (y por qué)
- Flujo Git gobernado por PR: nunca fusionar feature branches localmente en `develop` o `main`; el PR remoto garantiza trazabilidad, CI y orden.
- Consultas de PR: el agente crea y fusiona los PRs previa aprobación del usuario en cada paso (abrir y fusionar), evitando ejecuciones no autorizadas salvo mandato expreso.
- Salvaguarda permanente de ramas: jamás borrar ramas sin consentimiento explícito.

## Aprendizajes y errores a evitar
- No hacer merge manual local de ramas temáticas a develop/main.
- Siempre preguntar antes de abrir PR, antes de fusionar y antes de borrar ramas.
- Conectar siempre redención desde la comanda sin reiniciar el formulario de pedido.

## Próximos pasos
- Repositorio limpio y sincronizado en `develop` y `main`. Listo para la siguiente spec o requerimiento.
