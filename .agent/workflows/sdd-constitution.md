---
description: Crea o audita docs/constitution.md definiendo como máximo 6 principios rectores innegociables (~10-15 líneas) ejecutado directamente por el agente principal.
---

# Workflow: Creación y Auditoría de la Constitución (`/sdd-constitution`)

Este workflow establece o audita el contrato supremo de gobernanza del proyecto (`docs/constitution.md`).
Es ejecutado directamente por el **agente principal / root**, ya que la constitución define las reglas rectoras innegociables para todos los componentes, módulos y subagentes del sistema.

---

## Principios Fundacionales del Workflow

1. **Brevedad y Máxima Síntesis**:
   - La constitución debe contener estrictamente **como máximo 6 principios innegociables**.
   - Longitud total aproximada: **~10 a 15 líneas**.
   - Prohibido convertir la constitución en un manual de procedimientos, guía de estilo o checklist operativo (esas reglas pertenecen a `AGENTS.md` o a las skills).
2. **Jerarquía Inviolable**:
   - Todo código, spec, plan, tarea y validación técnica se supedita a `docs/constitution.md`.
   - Si una spec o plan contradice la constitución, la spec debe rechazarse o ajustarse de inmediato.

---

## Modos de Operación

### Modo A: Creación Inicial (Día 0)

1. **Entrevista de Invariantes (Tarjetas de Selección con Opción Libre)**:
   El agente principal analiza el proyecto y consulta al usuario sobre los límites absolutos estructurando cada pregunta en tarjetas de selección (herramienta interactiva `ask_question` si existe, o tarjetas Markdown `[A] (Recomendada)`, `[B]`, `[O] Escribir otra respuesta`):
   - Invariante de seguridad y credenciales (`(Recommended) Prohibición total de secretos en código y uso estricto de .env sin fallbacks`, `Auditoría manual de claves`).
   - Política de pruebas y build (`(Recommended) Verificación previa obligatoria en CI con tests en verde y compilación limpia antes de merge`, `Tests solo en PRs mayores`).
   - Invariantes de persistencia y base de datos (`(Recommended) Esquemas reversibles y migraciones idempotentes no destructivas`, `Ajustes directos permitidos`).
   - Modularidad y acoplamiento (`(Recommended) Módulos desacoplados que solo se comunican por contratos públicos`, `Acceso directo entre capas`).
2. **Redacción del Borrador**:
   A partir de `templates/constitution.md.template`, redacta el borrador con la siguiente estructura:
   ```markdown
   # docs/constitution.md — Constitución Técnica del Proyecto

   1. **Seguridad y Cero Secretos**: Queda terminantemente prohibido commitear credenciales, tokens o claves de API. Toda configuración sensible se inyecta por variables de entorno (.env).
   2. **Verificación Previa Obligatoria (TDD / Tests)**: Ningún cambio se integra sin pruebas automatizadas en verde y compilación limpia.
   3. **Integridad de Datos**: Las modificaciones al esquema de base de datos deben ser reversibles y no destructivas sin migración previa.
   4. **Límites Modulares**: Ningún módulo accede a datos privados de otro módulo excepto a través de sus contratos públicos expuestos.
   5. **Especificación Previa (SDD)**: Queda prohibido escribir código de producción sin una spec técnica aprobada.
   6. **Gobernanza Git**: La rama base nunca recibe merges directos locales; toda integración se realiza mediante Pull Request validado por CI.
   ```
3. **Validación Humana**:
   Presenta el borrador al usuario. Solo se escribe en `docs/constitution.md` tras su aprobación explícita.

---

### Modo B: Auditoría de Constitución Existente

Si `docs/constitution.md` ya existe:
1. **Verificación de Límites**:
   - Comprueba que no supere los 6 principios rectores.
   - Comprueba que no exceda las ~15 líneas.
2. **Detección de Desviaciones**:
   - Si la constitución contiene comandos específicos, versiones de paquetes o detalles operacionales que cambian con frecuencia, propone al usuario moverlos a `AGENTS.md`.
   - Si se detectan principios ambiguos o no testeables, propone una redacción formal y concisa.
3. **Consolidación**:
   Presenta la propuesta de poda o ajuste y actualiza el archivo únicamente con el consentimiento del usuario.
