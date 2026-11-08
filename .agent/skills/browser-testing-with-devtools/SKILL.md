---
name: browser-testing-with-devtools
description: Pruebas y verificación interactiva en el navegador mediante Chrome DevTools MCP. Usar para inspeccionar el DOM, capturar errores de consola y validar la UI en tiempo real en YogurArte.
---

# Browser Testing with DevTools — YogurArte

Guía para la verificación y pruebas interactivas de la interfaz de usuario en tiempo de ejecución utilizando el servidor MCP de Chrome DevTools (`chrome-devtools`). Proporciona al agente ojos directos en el navegador para auditar el DOM real, registrar errores de consola de Vue 3, inspeccionar peticiones de red de Axios y verificar visualmente la responsividad móvil.

---

## 1. Cuándo Aplicar Esta Skill

- Al desarrollar o modificar componentes Vue 3 en `frontend/src/`.
- Al depurar errores visuales en modales comerciales (comprobar la regla de las 3 capas fijas).
- Al auditar llamadas de red fallidas de Axios hacia la API (`/api/orders`, `/api/customers`).
- Al comprobar la experiencia móvil en viewport estrecho (375px) para domiciliarios y operarios.
- Al verificar que los cambios no generen advertencias de reactividad o errores en la consola del navegador.

> **Cuándo NO usar:** Cambios exclusivamente en backend (servicios, scripts de BD, controladores) donde `vitest` o `supertest` son suficientes.

---

## 2. Herramientas MCP Disponibles en el Entorno

El servidor `chrome-devtools` expone las siguientes herramientas nativas:

| Herramienta MCP | Acción | Uso Típico en YogurArte |
| :--- | :--- | :--- |
| `puppeteer_navigate` | Abre una URL en el navegador | Navegar al frontend local: `http://localhost:5173`. |
| `puppeteer_screenshot` | Captura imagen de pantalla | Validar visualmente el diseño del modal o tabla de pedidos. |
| `puppeteer_click` | Simula click en un elemento | Abrir modales, pulsar botones de confirmación o filtros. |
| `puppeteer_fill` | Rellena campos de texto/inputs | Probar formularios de comanda o inicio de sesión. |
| `puppeteer_evaluate` | Ejecuta JavaScript en la página | Consultar estado de Pinia, variables del DOM o scroll. |

---

## 3. Protocolo de Pruebas de Interfaz

1. **Levantar el Servidor de Desarrollo:**
   Asegurar que Vite esté corriendo (`npm run dev:client` en `http://localhost:5173`) y la API en el puerto 3000.
2. **Navegar a la Vista:**
   Usar `puppeteer_navigate` a la ruta en prueba (ej. `http://localhost:5173/pedidos`).
3. **Auditar Consola y Red:**
   Verificar que no aparezcan excepciones rojas (`Uncaught TypeError`, `401 Unauthorized` o `500 Server Error`).
4. **Verificar Interacción:**
   Simular el flujo completo del usuario (abrir modal $\rightarrow$ ingresar producto $\rightarrow$ confirmar).
5. **Capturar Evidencia:**
   Tomar captura de pantalla con `puppeteer_screenshot` para validar la correcta alineación y ausencia de desbordamientos.
