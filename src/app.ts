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

import ordersRoutes from './modules/orders/orders.routes.js';
import batchesRoutes from './modules/batches/batches.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import {
  expensesRouter as expensesRoutes,
  cashMovementsRouter as cashMovementsRoutes,
  creditsRouter as creditsRoutes,
  dashboardRouter as dashboardRoutes,
} from './modules/finance/finance.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import preparationsRoutes from './routes/preparations.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import crmRoutes from './routes/crm.routes.js';
import { whatsappService } from './services/whatsapp.service.js';

import { requireAuth } from './shared/middlewares/auth.middleware.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/error.middleware.js';

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

// 4. Logger de Peticiones HTTP en Tiempo Real para la API (silenciado en entorno de pruebas)
if (process.env.NODE_ENV !== 'test') {
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
}

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

// Fallback para /uploads: Si el archivo no existe en disco (reinicio de Render), servir placeholder SVG y evitar index.html
app.use('/uploads', (req: Request, res: Response) => {
  const placeholderPath = path.join(publicPath, 'assets', 'media-placeholder.svg');
  if (fs.existsSync(placeholderPath)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(placeholderPath);
  }
  return res.status(404).json({ error: 'Archivo multimedia no encontrado', code: 'MEDIA_NOT_FOUND' });
});

// 7. Servir archivos estáticos del frontend con caché controlada
const publicPath = path.join(__dirname, '../public');
app.use(
  express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  })
);

// 8. Rutas Públicas de la API
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'YogurArte API',
    security: 'JWT + Helmet + RateLimit + Bcrypt',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Autenticación y Usuarios (Login público + Me y Admin protegidos)
app.use('/api/users', authRoutes);

// 9. Rutas Protegidas de la API (Requieren Token JWT Válido)
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

// 10. Manejador 404 para rutas API no encontradas
app.use(notFoundHandler);

// 11. Fallback para SPA: cualquier ruta no-API sirve index.html
app.get('*', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 12. Manejador centralizado de errores
app.use(errorHandler);

export { app, server, io, publicPath };
export default app;
