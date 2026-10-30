# Plan de Arquitectura — Spec 010: Auditoría Dinámica de Presentaciones en Fase B y Alerta Proactiva de Fidelización

## 1. Archivos y Responsabilidades

| Archivo | Responsabilidad Principal | RF que cubre |
| :--- | :--- | :--- |
| `src/modules/crm/crm.schema.ts` | Extender `getLoyaltyQuerySchema` para admitir el filtro opcional `customerId`. | RF-1 |
| `src/modules/crm/crm.service.ts` | Optimizar `getLoyaltyOverview` para consultar un cliente individual cuando se provee `customerId`. | RF-1, RF-2 |
| `src/modules/batches/batches.service.ts` | Enriquecer `computePackagingPresentations` con desglose de `loyaltyDischarged` y actualizar cálculo de ingresos proyectados en `getBatchSummary`. | RF-4, RF-5, RF-6, RF-7 |
| `frontend/src/components/operations/OrderFormModal.vue` | Detectar reactivamente saldo de fidelización al seleccionar cliente, renderizar banner de aviso y conectar `RedeemRewardModal` sin perder el pedido. | RF-1, RF-2, RF-3 |
| `frontend/src/components/production/PackagingSummaryModal.vue` | Visualizar presentaciones dinámicas, desglosar botellas por fidelización en la tabla y rotular claramente los descargos `PREMIO_FIDELIZACION` en la pestaña de salidas. | RF-4, RF-5 |
| `tests/loyalty_phase_b_audit.test.ts` | Pruebas de integración automatizadas para verificación de API, auditoría y redención. | RF-1 al RF-7 |

---

## 2. Decisiones Justificadas y Alternativas Descartadas

- **Decisión 1: Integrar `RedeemRewardModal` dentro del flujo de `OrderFormModal`:**
  - *Por qué*: Permite al operador canjear el premio del cliente en un solo clic dentro del mismo modal sin perder los ítems de pedido que ya tenía digitados.
  - *Alternativa descartada*: Redirigir mediante Vue Router a `/crm?tab=loyalty`. Descartada porque expira el estado local del formulario de comanda y genera frustración al usuario.
- **Decisión 2: Discriminar descargos por `reasonType` en `computePackagingPresentations`:**
  - *Por qué*: Provee métricas segregadas (`loyaltyDischarged`, `partnerDischarged`, `otherDischarged`) directamente desde el motor canónico de lotes para que cualquier consumidor (API, modales, reportes) tenga datos exactos sin recalcular.
  - *Alternativa descartada*: Clasificar los descargos en el frontend mediante filtros de texto sobre `notes`. Descartada por fragilidad ante cambios de texto y violación de la verdad única.
- **Decisión 3: Parametrizar `customerId` en `GET /api/crm/loyalty`:**
  - *Por qué*: Reutiliza la lógica integral de fidelización ya probada, reduciendo la consulta en base de datos a un solo cliente específico con respuesta en menos de 20 ms.
  - *Alternativa descartada*: Crear un endpoint nuevo exclusivo para la alerta. Descartada para evitar duplicar código de consulta de pedidos y acumuladores de litros.

---

## 3. Algoritmos y Lógica de Dominio

### Algoritmo: Desglose de Descargos en `computePackagingPresentations`
```typescript
Para cada presentación 'p' en rawPresentations:
  1. Encontrar matchingDischarges comparando tamaño y capacidad en litros.
  2. loyaltyDischarges = matchingDischarges.filter(d => d.reasonType === 'PREMIO_FIDELIZACION')
  3. partnerDischarges = matchingDischarges.filter(d => d.reasonType === 'CONSUMO_SOCIO')
  4. loyaltyDischarged = sum(loyaltyDischarges.quantityBottles)
  5. partnerDischarged = sum(partnerDischarges.quantityBottles)
  6. totalDischarged = sum(matchingDischarges.quantityBottles)
  7. free = max(0, p.quantity - sold - totalDischarged)
  8. Retornar presentación con:
       { ..., sold, discharged: totalDischarged, loyaltyDischarged, partnerDischarged, free }

En el balance global de la fracción:
  totalLoyaltyLiters = sum(p.loyaltyDischarged * p.capacityLiters)
  totalLoyaltyBottles = sum(p.loyaltyDischarged)
```

### Algoritmo: Verificación Reactiva de Fidelización en `OrderFormModal`
```typescript
CUANDO customerId cambia (y es un número válido > 0):
  1. Consultar GET /api/crm/loyalty?customerId=${customerId}
  2. SI la respuesta contiene cliente y rewardsAvailable > 0:
       customerLoyalty.value = cliente
     SINO:
       customerLoyalty.value = null
  3. SI el usuario presiona "Redimir Premio":
       Abrir diálogo RedeemRewardModal con customer = customerLoyalty.value
  4. AL confirmar redención (evento 'redeemed'):
       Refrescar saldo de fidelización del cliente
       Refrescar lotes/fracciones disponibles en inventario
```

---

## 4. Estrategia de Pruebas

Pruebas en Vitest (`tests/loyalty_phase_b_audit.test.ts`):
1. **Consulta con filtro individual**: `GET /api/crm/loyalty?customerId=:id` responde en formato JSON con la tarjeta del cliente y cálculo proporcional exacto. (RF-1)
2. **Redención y descargo atómico**: `POST /api/crm/loyalty/redeem` descuenta inventario de la fracción con `reasonType: 'PREMIO_FIDELIZACION'`. (RF-3)
3. **Auditoría dinámica de fracción**: `GET /api/batches/packagings/:id` refleja `loyaltyDischarged` en las presentaciones y en la lista de descargos con su etiqueta de $0 COP. (RF-4, RF-5)
4. **Independencia de Fase A**: `GET /api/batches/:id/summary` suma ingresos proyectados dinámicamente y mantiene su foco lácteo a granel. (RF-6, RF-7)
