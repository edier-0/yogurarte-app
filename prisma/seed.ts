import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando y preparando la base de datos de YogurArte...');

  // 1. Hashear contraseñas con bcrypt (cost factor 10)
  const passwordEdier = await bcrypt.hash('edier123', 10);
  const passwordYeilin = await bcrypt.hash('yeilin123', 10);
  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordOperador = await bcrypt.hash('operador123', 10);
  const passwordDomiciliario = await bcrypt.hash('domiciliario123', 10);

  // 2. Definición de Usuarios: Administradores reales de Neon Tech + Credenciales de Prueba por Rol
  const usersToSeed = [
    // --- Administradores Oficiales de Neon Tech ---
    {
      name: 'Edier Robles',
      username: 'edier',
      password: passwordEdier,
      pin: '1234',
      phone: '3024581882',
      email: 'edierrobles6@gmail.com',
      bankInfo: '3024581882',
      role: 'ADMIN',
      isActive: true,
    },
    {
      name: 'Yeilin Gomez',
      username: 'yeilin',
      password: passwordYeilin,
      pin: '1234',
      phone: '3147464663',
      email: 'gomezyeilin23@gmail.com',
      bankInfo: '3116709583',
      role: 'ADMIN',
      isActive: true,
    },

    // --- Credenciales Locales de Prueba para Cada Rol (RBAC) ---
    {
      name: 'Administrador General',
      username: 'admin',
      password: passwordAdmin,
      pin: '1234',
      phone: '3000000001',
      email: 'admin@yogurarte.com',
      bankInfo: '3000000001',
      role: 'ADMIN',
      isActive: true,
    },
    {
      name: 'Operador de Planta',
      username: 'operador',
      password: passwordOperador,
      pin: '1234',
      phone: '3000000002',
      email: 'operador@yogurarte.com',
      bankInfo: '3000000002',
      role: 'OPERADOR',
      isActive: true,
    },
    {
      name: 'Domiciliario Repartidor',
      username: 'domiciliario',
      password: passwordDomiciliario,
      pin: '1234',
      phone: '3000000003',
      email: 'domiciliario@yogurarte.com',
      bankInfo: '3000000003',
      role: 'DOMICILIARIO',
      isActive: true,
    },
  ];

  // 3. Upsert de usuarios para preservar idempotencia sin romper claves foráneas existentes
  console.log('👥 Sincronizando usuarios administradores y de prueba...');
  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        password: u.password,
        pin: u.pin,
        phone: u.phone,
        email: u.email,
        bankInfo: u.bankInfo,
        role: u.role,
        isActive: u.isActive,
      },
      create: u,
    });
  }

  console.log('✅ Usuarios sincronizados exitosamente con contraseñas Bcrypt:');
  console.log('   👑 ADMIN:        edier       / edier123        (Edier Robles - Neon Tech)');
  console.log('   👑 ADMIN:        yeilin      / yeilin123       (Yeilin Gomez - Neon Tech)');
  console.log('   👑 ADMIN:        admin       / admin123        (Administrador General)');
  console.log('   🏭 OPERADOR:     operador    / operador123     (Planta y Producción)');
  console.log('   🛵 DOMICILIARIO: domiciliario / domiciliario123 (Rutas y Despachos)');

  // 4. Insumos base (upsert por código)
  const initialMaterials = [
    {
      code: 'LECHE',
      name: 'Leche Entera Cruda',
      category: 'MATERIA_PRIMA',
      unit: 'Litros',
      currentStock: 100,
      minStockAlert: 20,
      avgCost: 2500,
    },
    {
      code: 'BOTELLA_1L',
      name: 'Botella Plástica 1 Litro',
      category: 'EMPAQUE',
      unit: 'Unidades',
      currentStock: 50,
      minStockAlert: 20,
      avgCost: 1200,
    },
    {
      code: 'BOTELLA_2L',
      name: 'Botella Plástica 2 Litros',
      category: 'EMPAQUE',
      unit: 'Unidades',
      currentStock: 30,
      minStockAlert: 10,
      avgCost: 2000,
    },
    {
      code: 'ETIQUETA',
      name: 'Etiqueta Adhesiva YogurArte',
      category: 'EMPAQUE',
      unit: 'Unidades',
      currentStock: 150,
      minStockAlert: 30,
      avgCost: 400,
    },
  ];

  for (const mat of initialMaterials) {
    await prisma.rawMaterial.upsert({
      where: { code: mat.code },
      update: {
        name: mat.name,
        category: mat.category,
        unit: mat.unit,
        minStockAlert: mat.minStockAlert,
        avgCost: mat.avgCost,
      },
      create: mat,
    });
  }

  console.log('📦 Insumos base inicializados y verificados.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
