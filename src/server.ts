import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import ordersRoutes from './routes/orders.routes.js';
import batchesRoutes from './routes/batches.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import customersRoutes from './routes/customers.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import usersRoutes from './routes/users.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger de Peticiones HTTP en Tiempo Real para la API
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    if (originalUrl.startsWith('/api') && originalUrl !== '/api/health') {
      const duration = Date.now() - start;
      const status = res.statusCode;
      let icon = '📡';
      if (status >= 400) icon = '❌';
      else if (method === 'POST') icon = '✨';
      else if (method === 'PUT') icon = '✏️';
      else if (method === 'DELETE') icon = '🗑️';

      console.log(`${icon} [${new Date().toLocaleTimeString('es-CO')}] ${method} ${originalUrl} -> ${status} (${duration}ms)`);
    }
  });

  next();
});

// Servir archivos estáticos del frontend
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Rutas de la API
app.use('/api/orders', ordersRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', app: 'YogurArte API', timestamp: new Date().toISOString() });
});

// Fallback para SPA: cualquier ruta no-API sirve index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Manejador global de errores
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor YogurArte corriendo en http://localhost:${PORT}`);
  console.log(`📁 Frontend servido desde: ${publicPath}`);
});
