import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando toda la base de datos de YogurArte...');

  // 1. Eliminar datos existentes (tablas hijas primero)
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.batchItemUsage.deleteMany({});
  await prisma.productionBatch.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.rawMaterial.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✨ Base de datos limpia.');

  // 2. Crear los dos usuarios administradores con sus credenciales
  const user1 = await prisma.user.create({
    data: {
      name: 'Edier',
      username: 'edier',
      password: 'edier123',
      pin: '1234',
      role: 'ADMIN',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Yeilin',
      username: 'yeilin',
      password: 'yeilin123',
      pin: '1234',
      role: 'ADMIN',
    },
  });

  console.log('👥 Usuarios creados con éxito:');
  console.log('   👤 Usuario 1: edier / Contraseña: edier123');
  console.log('   👤 Usuario 2: yeilin / Contraseña: yeilin123');

  // 3. Crear insumos base con stock 0
  const initialMaterials = [
    {
      code: 'LECHE',
      name: 'Leche Entera Cruda',
      category: 'MATERIA_PRIMA',
      unit: 'Litros',
      currentStock: 0,
      minStockAlert: 10,
      avgCost: 2500,
    },
    {
      code: 'BOTELLA_1L',
      name: 'Botella Plástica 1 Litro',
      category: 'EMPAQUE',
      unit: 'Unidades',
      currentStock: 0,
      minStockAlert: 20,
      avgCost: 1200,
    },
    {
      code: 'BOTELLA_2L',
      name: 'Botella Plástica 2 Litros',
      category: 'EMPAQUE',
      unit: 'Unidades',
      currentStock: 0,
      minStockAlert: 10,
      avgCost: 2000,
    },
    {
      code: 'ETIQUETA',
      name: 'Etiqueta Adhesiva YogurArte',
      category: 'EMPAQUE',
      unit: 'Unidades',
      currentStock: 0,
      minStockAlert: 30,
      avgCost: 400,
    },
  ];

  for (const mat of initialMaterials) {
    await prisma.rawMaterial.create({
      data: mat,
    });
  }

  console.log('📦 Insumos base inicializados con stock 0.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
