---
name: ui-ux-pro-max
description: Inteligencia y catálogo de diseño UI/UX. 67 estilos, 96 paletas, 57 combinaciones tipográficas, 25 tipos de gráficos y 99 directrices UX para Vue 3 y Tailwind en YogurArte.
---

# UI/UX Pro Max — YogurArte

Guía exhaustiva de inteligencia de diseño para aplicaciones web y móviles. Contiene una base de datos con 67 estilos visuales, 96 paletas de color, 57 combinaciones tipográficas, 99 directrices UX y 25 tipos de gráficos adaptables a Tailwind CSS y Vue 3.

---

## 1. Requisitos Previos

Verificar que Python esté instalado en la máquina:
```bash
python --version
```

---

## 2. Flujo de Trabajo para Diseño UI/UX

Cuando se requiera diseñar, mejorar o crear una interfaz en YogurArte (ej. un nuevo dashboard de producción, vista de arqueo de caja o comanda de pedidos):

### Paso 1: Analizar los Requisitos
Identifica los parámetros de la vista:
- **Tipo de Producto:** Dashboard ERP, módulo POS, CRM móvil.
- **Palabras Clave de Estilo:** Minimalista, profesional, limpio, contraste alto, artesanal.
- **Stack:** `vue` / `html-tailwind`.

### Paso 2: Generar el Sistema de Diseño
Ejecuta el buscador para obtener recomendaciones integradas de paleta, tipografía y componentes:
```bash
python .agent/skills/ui-ux-pro-max/scripts/search.py "artisan dairy food production dashboard" --design-system -p "YogurArte"
```

El script genera:
1. Paleta de colores recomendada con códigos HEX y clases Tailwind.
2. Jerarquía tipográfica adecuada para dashboards densos.
3. Efectos, sombras y bordes acordes a la identidad visual.
4. Antipatrones visuales a evitar.

### Paso 3: Búsquedas Específicas por Dominio
Para necesidades puntuales dentro de una vista:

| Necesidad | Dominio | Ejemplo de Comando |
| :--- | :--- | :--- |
| **Gráficos de ventas o producción** | `chart` | `python .agent/skills/ui-ux-pro-max/scripts/search.py "sales metrics daily production" --domain chart` |
| **Directrices de Usabilidad Móvil** | `ux` | `python .agent/skills/ui-ux-pro-max/scripts/search.py "mobile touch targets form validation" --domain ux` |
| **Estilos visuales específicos** | `style` | `python .agent/skills/ui-ux-pro-max/scripts/search.py "clean flat minimal card" --domain style` |

---

## 3. Integración con Frontend UI Engineering

Las recomendaciones extraídas mediante esta skill deben aplicarse directamente dentro de los componentes Vue 3 de `frontend/src/` respetando los estándares de **`frontend-ui-engineering`** (modales de 3 capas fijas, responsividad móvil y estados de carga).
