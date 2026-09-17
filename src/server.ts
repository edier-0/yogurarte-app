import { server, publicPath } from './app.js';
import prisma from './prisma.js';
import { whatsappService } from './services/whatsapp.service.js';

const PORT = process.env.PORT || 3000;

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
