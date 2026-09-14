import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

import ordersRoutes from './routes/orders.routes.js';
import batchesRoutes from './routes/batches.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import customersRoutes from './routes/customers.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import usersRoutes from './routes/users.routes.js';
import preparationsRoutes from './routes/preparations.routes.js';
import staffRoutes from './routes/staff.routes.js';
import cashMovementsRoutes from './routes/cashMovements.routes.js';
import creditsRoutes from './routes/credits.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import crmRoutes from './routes/crm.routes.js';
import { whatsappService } from './services/whatsapp.service.js';

import { requireAuth } from './middlewares/auth.middleware.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

whatsappService.setSocketServer(io);

const PORT = process.env.PORT || 3000;

// Configuración de Proxy para entornos de producción (HTTPS / Reverse Proxy)
app.set('trust proxy', 1);

// 1. Blindaje de Cabeceras HTTP con Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Permite compatibilidad con la SPA y scripts modulares
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Compresión HTTP (Gzip/Deflate) para acelerar transferencia de red en 70-85%
app.use(compression());

// 3. Middlewares de análisis de cuerpo y CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Logger de Peticiones HTTP en Tiempo Real para la API
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

// 5. Limitador de peticiones general para la API
app.use('/api', apiLimiter);

// 6. Servir archivos multimedia de WhatsApp con caché inmutable para carga instantánea
const uploadsPath = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use(
  '/uploads',
  express.static(uploadsPath, {
    maxAge: '30d',
    immutable: true,
  })
);

// 7. Servir archivos estáticos del frontend con caché controlada
const publicPath = path.join(__dirname, '../public');
app.use(
  express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
    etag: true,
  })
);

// 6. Rutas Públicas de la API
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'YogurArte API',
    security: 'JWT + Helmet + RateLimit + Bcrypt',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Usuarios (Login público + Me y Admin protegidos)
app.use('/api/users', usersRoutes);

// 7. Rutas Protegidas de la API (Requieren Token JWT Válido)
app.use('/api/orders', requireAuth, ordersRoutes);
app.use('/api/batches', requireAuth, batchesRoutes);
app.use('/api/inventory', requireAuth, inventoryRoutes);
app.use('/api/preparations', requireAuth, preparationsRoutes);
app.use('/api/expenses', requireAuth, expensesRoutes);
app.use('/api/customers', requireAuth, customersRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/staff', requireAuth, staffRoutes);
app.use('/api/cash-movements', requireAuth, cashMovementsRoutes);
app.use('/api/credits', requireAuth, creditsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/crm', requireAuth, crmRoutes);

// 8. Manejador 404 para rutas API no encontradas
app.use(notFoundHandler);

// 9. Fallback para SPA: cualquier ruta no-API sirve index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 10. Manejador centralizado de errores
app.use(errorHandler);

import prisma from './prisma.js';

server.listen(PORT, () => {
  console.log(`🚀 Servidor YogurArte Seguro corriendo en http://localhost:${PORT}`);
  console.log(`🔒 Protección: Helmet + Rate Limiting + Bcrypt + JWT + Socket.IO`);
  console.log(`📁 Frontend servido desde: ${publicPath}`);

  // Rutina de optimización y estadísticas en PostgreSQL para índices B-Tree
  prisma
    .$executeRawUnsafe('ANALYZE;')
    .then(() => console.log('⚡ Estadísticas de PostgreSQL optimizadas (ANALYZE completado)'))
    .catch((err) => console.warn('Aviso: No se pudo ejecutar ANALYZE automático:', err.message));

  // Inicializar servicio de WhatsApp Baileys en segundo plano
  whatsappService.init().catch((err) => {
    console.error('❌ Error inicializando WhatsApp Baileys:', err);
  });
});
