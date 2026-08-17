# 🥛 YogurArte - Sistema de Gestión y Control

Sistema web integral desarrollado a medida para el emprendimiento de yogur artesanal natural **YogurArte** (Fonseca, La Guajira).

Permite el control de:
1. **Pedidos y Ventas**: Registro de clientes, cálculo de abonos, saldos pendientes y envío directo de comprobantes por WhatsApp.
2. **Producción (Lotes)**: Conversión de litros de leche cruda a botellas envasadas (1L y 2L) con cálculo automático de rendimiento (%) y deducción de stock.
3. **Materia Prima e Insumos**: Control de stock de Leche, Botellas 1L, Botellas 2L, Etiquetas y compras a proveedores.
4. **Gastos e Infraestructura**: Control de compras de equipos (nevera, ollas, termómetros), servicios públicos (gas, luz), domicilios y publicidad.
5. **Dashboard Financiero**: Ingresos recaudados, cuentas por cobrar, gastos y **Ganancia Neta Real**.
6. **Directorio de Clientes**: Historial de consumo y estado de cuenta por cliente.

---

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js, Express, TypeScript.
- **Base de Datos & ORM**: PostgreSQL + Prisma ORM.
- **Frontend**: HTML5 Semántico, CSS3 Moderno (Vanilla), JavaScript Modular (ES6+ SPA).
- **Contenedores**: Docker & Docker Compose (listo para despliegue local o servidor).

---

## 🚀 Cómo Ejecutar la Aplicación

### Opción 1: Con Docker Compose (Recomendado y más rápido)

Asegúrate de tener Docker Desktop abierto y ejecuta en la terminal:

```bash
docker-compose up --build
```

Esto iniciará automáticamente:
- El contenedor de PostgreSQL con persistencia de datos en el volumen `postgres_data`.
- Las migraciones de Prisma.
- La aplicación web en **http://localhost:3000**

---

### Opción 2: Desarrollo Local con Node.js y npm

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar el archivo `.env`:**
   Crea o verifica el archivo `.env` con la URL de tu base de datos PostgreSQL:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/yogurarte_db?schema=public"
   ```

3. **Generar el cliente de Prisma y ejecutar migraciones:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Cargar datos iniciales (Insumos base y Usuarios):**
   ```bash
   npm run prisma:seed
   ```

5. **Iniciar en modo desarrollo:**
   ```bash
   npm run dev
   ```

6. Abre tu navegador en **http://localhost:3000**.

---

## 📱 Acciones Rápidas
- **WhatsApp Integrado**: Al pulsar el botón "📲 WhatsApp" en cualquier pedido, se abre automáticamente el chat con el mensaje formateado listo para enviar al cliente.
- **Cambio de Usuario**: En la barra lateral o pie de página puedes alternar entre **Edier** y **Socio** para registrar quién realizó cada movimiento.
- **Abonos Parciales**: Puedes registrar pagos parciales en cualquier momento con el botón "💵 Abonar".
