---
name: frontend-ui-engineering
description: Construye interfaces de usuario profesionales, accesibles y responsivas en Vue 3 y Tailwind. Usar al crear o modificar componentes, vistas, modales o flujos de estado en YogurArte.
---

# Frontend UI Engineering — YogurArte

Guía canónica de ingeniería de interfaz de usuario para YogurArte. Diseñada para construir vistas y componentes en Vue 3 que sean altamente usables, accesibles, visualmente pulidos y optimizados para dispositivos móviles (domiciliarios y operarios) y escritorio (administración y contabilidad).

---

## 1. Stack Tecnológico de Frontend

- **Framework:** Vue 3 con Composition API y `<script setup lang="ts">`.
- **Compilador y Bundler:** Vite 5 con TypeScript estricto (`vue-tsc`).
- **Enrutamiento:** Vue Router 4 (`frontend/src/router/routes.ts`).
- **Gestión de Estado:** Pinia (`frontend/src/stores/`).
- **Estilos y Utilidades:** Tailwind CSS 3.4 + Reka UI (componentes accesibles sin estilos).
- **Iconografía:** `lucide-vue-next`.
- **Cliente HTTP:** Axios centralizado en `frontend/src/api/client.ts`.

---

## 2. La Regla Constitucional de los Modales (3 Capas Fijas)

Por mandato del **Artículo 10 de la Constitución de YogurArte**, todo modal comercial u operativo debe estructurarse obligatoriamente en **3 capas fijas** para erradicar saltos visuales y desbordamientos en pantallas móviles:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl">
      
      <!-- CAPA 1: Cabecera Fija -->
      <header class="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ title }}</h2>
        <button 
          @click="emit('close')" 
          class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Cerrar modal"
        >
          <XIcon class="h-5 w-5" />
        </button>
      </header>

      <!-- CAPA 2: Cuerpo Desplazable (Scrollable Body) -->
      <div class="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
        <slot />
      </div>

      <!-- CAPA 3: Pie de Acción Fijo -->
      <footer class="flex shrink-0 items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4 rounded-b-xl">
        <button 
          type="button" 
          @click="emit('close')" 
          class="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          :disabled="loading" 
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {{ loading ? 'Guardando...' : 'Confirmar' }}
        </button>
      </footer>

    </div>
  </div>
</template>
```

> **Invariante:** `flex-1 overflow-y-auto min-h-0` en el cuerpo asegura que los inputs nunca empujen los botones de acción fuera de la pantalla en dispositivos móviles.

---

## 3. Estados de Interfaz Obligatorios en Toda Vista

Ninguna vista o componente de listado/detalle puede considerarse terminado sin manejar explícitamente los 4 estados de ciclo de vida:

1. **Estado de Carga (*Loading State*):** Mostrar Skeleton loaders o spinners mientras la petición de red se resuelve; nunca dejar una pantalla en blanco.
2. **Estado Vacío (*Empty State*):** Si no hay registros (ej. sin pedidos hoy o sin lotes en fermentación), mostrar una ilustración o ícono, un mensaje explicativo en español y un botón de acción principal ("Crear Nuevo Lote").
3. **Estado de Error (*Error State*):** Mostrar alertas contextuales con mensajes claros traducidos, permitiendo reintentar la operación (`Reintentar`).
4. **Estado de Éxito (*Data State*):** Presentación clara de datos con tipografía legible y formateo numérico en moneda colombiana (`$ COP`).

---

## 4. Responsividad Móvil y Usabilidad Táctil

Dado que los operarios en planta y los domiciliarios en calle operan con teléfonos móviles:

- **Objetivos Táctiles (Tap Targets):** Botones e interactivos deben medir al menos **44×44 px** (`h-11`, `p-3`).
- **Contraste de Color:** Ratios de contraste $\ge 4.5:1$ conforme a WCAG AA para lectura bajo el sol en La Guajira.
- **Teclados Virtuales Móviles:** Usar tipos de input semánticos:
  - `type="number"` o `inputmode="numeric"` para cantidades y dinero.
  - `type="tel"` para números de teléfono de clientes.
  - `type="date"` con control de zona horaria local.

---

## 5. Patrón Canónico de Vistas con Pinia y Axios

```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
const items = ref<Order[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchOrders = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await apiClient.get('/orders');
    items.value = response.data.data;
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Error al cargar los pedidos';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchOrders);
</script>
```

---

## 6. Verificación de Calidad Frontend
Antes de dar por completado un cambio en la interfaz:
- [ ] Compilación sin errores de TypeScript: `npm --prefix frontend run build`.
- [ ] Verificado en viewport móvil (375px) y escritorio (1280px).
- [ ] Modales cumplen la estructura de 3 capas sin salto de scroll.
- [ ] Textos, mensajes y modales 100% en español.
- [ ] Inputs numéricos y fechas validados antes del envío.
