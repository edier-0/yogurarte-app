---
name: doubt-driven-development
description: Somete decisiones críticas a una revisión adversarial para identificar fallos ocultos. Usar en lógica contable, transacciones de caja, migraciones o cambios de alto riesgo en YogurArte.
---

# Doubt-Driven Development — YogurArte

Una respuesta expresada con seguridad no garantiza que sea correcta. En sesiones largas de trabajo, las suposiciones tienden a transformarse silenciosamente en "hechos" sin que nadie las cuestione. El desarrollo guiado por la duda (*Doubt-Driven Development*) es la postura disciplinada de someter decisiones críticas a un examen adversarial —orientado a **refutar**, no a justificar complacientemente— mientras corregir el rumbo aún es económico.

---

## 1. Cuándo Aplicar Esta Skill

Una decisión es **crítica o no trivial** en YogurArte cuando:
- Afecta la **integridad financiera o contable**: cálculo dinámico de cartera de clientes, balance bimonetario de caja, o liquidación de jornales/socios.
- Cruza fronteras transaccionales complejas que involucran simultáneamente pedidos, kardex e inventario de presentaciones en Fase B.
- Introduce una migración de esquema en PostgreSQL/Neon que altere tablas con datos en producción.
- Afecta el flujo de autenticación, roles RBAC o variables sensibles de entorno.
- El agente siente la tentación de afirmar *"esto es seguro"* o *"esto no romperá nada"* sin evidencia irrefutable.

> **Cuándo NO usar:** Operaciones mecánicas (formateo, cambio de nombres de variables), tareas de bajo impacto o cuando la corrección sea evidente y verificable por el compilador de TypeScript.

---

## 2. El Proceso de Examen Adversarial en 4 Pasos

```
1. FORMULAR   ──► Explicitar la decisión técnica y la afirmación de seguridad
2. ATACAR     ──► "¿Cómo puede fallar esto en producción?" (Rol de abogado del diablo)
3. CONTRASTAR ──► Verificar contra los Artículos de la Constitución y casos límite
4. CONCLUIR   ──► Mantener, corregir o blindar con una prueba automatizada
```

### Paso 1: Formular la Afirmación
Escribe con claridad qué estás asumiendo:
> *"Afirmo que actualizar el stock en Fase B dentro de esta transacción previene condiciones de carrera si dos usuarios venden la última botella de 1 L simultáneamente."*

### Paso 2: Atacar la Afirmación (Pensamiento Adversarial)
Hazte las preguntas incómodas:
- ¿Qué sucede si la conexión con PostgreSQL se interrumpe a mitad de la transacción?
- ¿Qué pasa si el pedido se cancela 5 minutos después? ¿El stock se revierte limpiamente en el Kardex o queda huérfano?
- ¿Qué ocurre a las 7:01 PM con la zona horaria de Colombia si el servidor corre en UTC?
- ¿Qué ocurre si la base de datos de Neon escala o tiene latencia de réplica?

### Paso 3: Contrastar contra Invariantes Constitucionales
- ¿Esta solución guarda deuda en una columna estática de `Customer`? (Prohibido por Art. 3).
- ¿Mezcla efectivo con transferencias electrónicas? (Prohibido por Art. 4).
- ¿Asigna salidas de ventas al lote madre crudo en vez de la fracción de Fase B? (Prohibido por Art. 5).

### Paso 4: Veredicto y Blindaje
- Si encuentras un modo de fallo: **corrígelo antes de commitear**.
- Si la solución resiste el ataque: **agrega una prueba en Vitest que documente el caso límite superado**.
