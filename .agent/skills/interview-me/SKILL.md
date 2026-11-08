---
name: interview-me
description: Extrae lo que el usuario realmente necesita mediante una entrevista socrática de una pregunta a la vez hasta alcanzar ~95% de certidumbre. Usar cuando el requerimiento sea ambiguo antes de redactar una spec SDD en YogurArte.
---

# Interview Me — YogurArte

Extrae lo que el usuario realmente necesita en lugar de lo que cree que debería pedir. Logra esto mediante una entrevista socrática de **una sola pregunta a la vez**, acompañada de tu mejor hipótesis, hasta alcanzar un ~95% de confianza sobre el objetivo de negocio subyacente.

> **Momento de Mínimo Coste:** El instante más económico para descubrir una discrepancia de requerimientos es **antes** de redactar cualquier especificación SDD, plan o línea de código. Una vez que comienzas a construir, cambiar de rumbo cuesta tiempo y esfuerzo.

---

## 1. Cuándo Aplicar Esta Skill

- La petición carece de al menos uno de estos elementos: **para quién** es (operario, domiciliario, socio, cliente), **por qué** se necesita ahora, qué define el **éxito** o cuál es la **restricción crítica**.
- La solicitud es genérica o convencional (ej. *"haz un dashboard"*, *"hazlo más rápido"*, *"organiza los pedidos"*).
- Estás tentado a rellenar silenciosamente requisitos ambiguos con suposiciones personales.
- Dos valores razonables entran en tensión y el usuario no ha elegido cuál priorizar (ej. simplicidad vs. flexibilidad; control estricto vs. rapidez de comanda).
- El usuario lo solicita explícitamente: *"entrevístame"*, *"hazme preguntas"*, *"cuestióname"* o `/grill-me`.

> **Cuándo NO usar:**  
> - Peticiones directas, inequívocas y autocontenidas (ej. *"corrige esta errata"*, *"agrega este índice"*).  
> - Consultas de información técnica pura (*"¿dónde se guarda el kardex?"*).  
> - Ya cuentas con $\ge 95\%$ de certeza demostrable.

---

## 2. El Proceso en 4 Pasos

### Paso 1: Formular Hipótesis con Nivel de Confianza
Antes de preguntar, escribe en una sola frase tu interpretación actual de lo que el usuario busca, junto a un porcentaje honesto de certidumbre (0–100%):

```text
HIPÓTESIS: Quieres alertar al vendedor cuando un cliente califique para su botella de premio 10+1 para incentivar la venta del día.
CONFIANZA: ~40% — falta confirmar: si el canje se registra a $0 COP en el pedido o si se redime exclusivamente en el CRM.
```

### Paso 2: Hacer UNA Sola Pregunta a la Vez
No abrumes al usuario con una lista de 5 preguntas numeradas. Realiza una sola pregunta concreta con tu mejor suposición adjunta para facilitar la respuesta:

```text
¿El domiciliario debe poder cobrar en efectivo y transferencias simultáneamente en la entrega, o el método de pago se define cerrado desde la fábrica?
(Mi suposición: Debería permitir pago mixto porque en la entrega el cliente a veces paga una parte en efectivo y el saldo por Nequi).
```

### Paso 3: Actualizar la Hipótesis
Con la respuesta del usuario:
- Ajusta el porcentaje de certidumbre.
- Si la confianza sigue por debajo del 95%, formula la siguiente pregunta enfocada.

### Paso 4: Condición de Parada ($\ge 95\%$ de Confianza)
Sabes que has terminado cuando puedes predecir con exactitud cómo respondería el usuario a los casos límite. En ese momento:
1. Presenta un resumen ejecutivo de entendimiento.
2. Solicita confirmación para transicionar formalmente a la skill **`sdd`** e iniciar la redacción de la spec (`specs/NNN-nombre/spec.md`).
