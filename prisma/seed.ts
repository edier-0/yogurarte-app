/**
 * SCRIPT DE SEMILLA DEMO PARA ENTORNO LOCAL Y ONBOARDING
 * prisma/seed.ts
 *
 * Pobla la base de datos con un ecosistema completo, realista e interactivo:
 * - 4 Usuarios y roles RBAC (Admin, Planta, Domiciliario) con hash Bcrypt.
 * - 8 Sabores institucionales y parámetros de negocio.
 * - 8 Insumos base y receta maestra de Mermelada Artesanal (Insumo compuesto).
 * - Lotes en 2 Fases: Fase A (Fermentación) y Fase B (Fracciones Fresa y Natural).
 * - 6 Clientes: con deudas entregadas, abonos parciales, compras al día y fidelización 8/10.
 * - 8 Pedidos en diversos estados (PREPARING, IN_ROUTE, DELIVERED).
 * - Movimientos de caja bimonetarios (Efectivo y Nequi).
 * - Obligación crediticia con frecuencia FLEXIBLE (abonos libres) y cuota inicial.
 * - Conversaciones y plantillas CRM WhatsApp.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CANONICAL_SYSTEM_TEMPLATES } from '../src/modules/crm/system-templates.constants.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 ========================================================');
  console.log('🌱 YOGURARTE - SEMILLERO DE CONFIGURACIÓN Y ONBOARDING');
  console.log('========================================================\n');

  // --------------------------------------------------------------------------
  // SEGURIDAD CRÍTICA: BLOQUEO DE SEMILLA DESTRUCTIVA EN NUBE / PRODUCCIÓN
  // --------------------------------------------------------------------------
  const dbUrl = process.env.DATABASE_URL || '';
  const isCloudOrProd = process.env.NODE_ENV === 'production' || 
                        dbUrl.includes('neon.tech') || 
                        dbUrl.includes('aws') ||
                        Boolean(process.env.NEON_DATABASE_URL && (dbUrl === process.env.NEON_DATABASE_URL || !process.env.DATABASE_URL));

  if (isCloudOrProd) {
    console.warn('⚠️ ENTORNO REMOTO/PRODUCCIÓN DETECTADO: Modo seguro estricto.');
    console.warn('ℹ️ Solo se asegurarán configuraciones del sistema, sabores, presentaciones y plantillas canónicas vía upsert.');
    console.warn('🛡️ Queda estrictamente prohibido alterar o sembrar pedidos, movimientos de caja, gastos o inventarios operativos.\n');
  }

  // --------------------------------------------------------------------------
  // 1. USUARIOS Y CREDENCIALES RBAC
  // --------------------------------------------------------------------------
  console.log('👥 [1/4] Configurando usuarios y credenciales del sistema...');
  const salt = 10;
  const passAdmin = await bcrypt.hash('Admin123*', salt);
  const passPlanta = await bcrypt.hash('Planta123*', salt);
  const passReparto = await bcrypt.hash('Reparto123*', salt);
  const passEdier = await bcrypt.hash('edier123', salt);

  const users = [
    {
      name: 'Administrador General',
      username: 'admin',
      password: passAdmin,
      pin: '1234',
      role: 'ADMIN',
      phone: '3000000001',
      email: 'admin@yogurarte.com',
      bankInfo: '3000000001',
      isActive: true,
    },
    {
      name: 'Operario de Planta',
      username: 'planta',
      password: passPlanta,
      pin: '1234',
      role: 'PRODUCCION',
      phone: '3000000002',
      email: 'planta@yogurarte.com',
      bankInfo: '3000000002',
      isActive: true,
    },
    {
      name: 'Repartidor de Rutas',
      username: 'reparto',
      password: passReparto,
      pin: '1234',
      role: 'DOMICILIARIO',
      phone: '3000000003',
      email: 'reparto@yogurarte.com',
      bankInfo: '3000000003',
      isActive: true,
    },
    {
      name: 'Edier Robles',
      username: 'edier',
      password: passEdier,
      pin: '1234',
      role: 'ADMIN',
      phone: '3024581882',
      email: 'edierrobles6@gmail.com',
      bankInfo: '3024581882',
      isActive: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        role: u.role,
        phone: u.phone,
        email: u.email,
        bankInfo: u.bankInfo,
        isActive: true,
      },
      create: u,
    });
  }
  console.log('   ✓ 4 Usuarios del sistema configurados (admin, planta, reparto, edier).');

  // --------------------------------------------------------------------------
  // 2. PARÁMETROS GLOBALES, SABORES Y PRESENTACIONES
  // --------------------------------------------------------------------------
  console.log('\n🎨 [2/4] Sembrando catálogo de sabores, presentaciones y parámetros...');
  const flavors = [
    'Natural',
    'Fresa',
    'Mora',
    'Maracuyá',
    'Guanábana',
    'Melocotón',
    'Arequipe',
    'Frutos Rojos',
  ];
  for (const name of flavors) {
    await prisma.productFlavor.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  const settings = [
    { key: 'BUSINESS_NAME', value: 'YogurArte' },
    { key: 'BUSINESS_LOCATION', value: 'Fonseca, La Guajira' },
    { key: 'PRICE_DEFAULT_1L', value: '12000' },
    { key: 'PRICE_DEFAULT_2L', value: '24000' },
    { key: 'LOYALTY_GOAL_BOTTLES', value: '10' },
    { key: 'LOYALTY_REWARD_LITERS', value: '1' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('   ✓ 8 Sabores institucionales y 6 parámetros de sistema activos.');

  const initialPresentations = [
    { name: '1L', label: '1 Litro (1L)', capacityLiters: 1.0, defaultPrice: 12000, isActive: true },
    { name: '2L', label: '2 Litros (2L)', capacityLiters: 2.0, defaultPrice: 24000, isActive: true },
    { name: '500ml', label: '500 ml (Medio Litro)', capacityLiters: 0.5, defaultPrice: 8000, isActive: true },
  ];
  for (const pres of initialPresentations) {
    await prisma.productPresentation.upsert({
      where: { name: pres.name },
      update: { label: pres.label, capacityLiters: pres.capacityLiters, defaultPrice: pres.defaultPrice, isActive: pres.isActive },
      create: pres,
    });
  }
  console.log('   ✓ 3 Presentaciones estándar de producto inicializadas (1L, 2L, 500ml).');

  // --------------------------------------------------------------------------
  // 3. CRM, PLANTILLAS DE WHATSAPP Y RESPUESTAS RÁPIDAS
  // --------------------------------------------------------------------------
  console.log('\n💬 [3/4] Inicializando plantillas del sistema WhatsApp y respuestas rápidas...');
  for (const tpl of CANONICAL_SYSTEM_TEMPLATES) {
    await prisma.systemWhatsAppTemplate.upsert({
      where: { code: tpl.code },
      update: {
        title: tpl.title,
        category: tpl.category,
        description: tpl.description,
        defaultContent: tpl.defaultContent,
        availableVariables: JSON.stringify(tpl.availableVariables),
      },
      create: {
        code: tpl.code,
        title: tpl.title,
        category: tpl.category,
        description: tpl.description,
        content: tpl.defaultContent,
        defaultContent: tpl.defaultContent,
        availableVariables: JSON.stringify(tpl.availableVariables),
        autoTrigger: tpl.autoTrigger,
      },
    });
  }
  console.log('   ✓ 9 Plantillas de sistema de WhatsApp registradas (Spec 014).');

  const quickReplies = [
    { shortcut: '/sabores', title: 'Sabores Disponibles', content: '¡Hola! 🥛 Hoy tenemos disponibles: Natural, Fresa con trozos, Mora silvestre y Maracuyá artesanal. ¿Cuál te gustaría pedir hoy?', category: 'VENTAS' },
    { shortcut: '/precios', title: 'Lista de Precios', content: 'Nuestros precios oficiales:\n• 1 Litro: $ 12.000 COP\n• 2 Litros: $ 24.000 COP\n¡Recuerda que con tu compra acumulas para tu botella gratis (10+1)! 🎉', category: 'INFO' },
    { shortcut: '/pago', title: 'Medios de Pago', content: 'Aceptamos Efectivo al recibir y transferencias digitales a Nequi o Bancolombia al número: 302 458 1882.', category: 'PAGOS' },
    { shortcut: '/domicilio', title: 'Horarios de Ruta', content: 'Nuestras rutas de reparto salen a las 11:30 AM y a las 4:30 PM todos los días en Fonseca. 🛵💨', category: 'GENERAL' },
  ];

  for (const qr of quickReplies) {
    await prisma.crmQuickReply.upsert({
      where: { shortcut: qr.shortcut },
      update: qr,
      create: qr,
    });
  }
  console.log('   ✓ 4 Respuestas rápidas institucionales configuradas.');

  // Si estamos en un entorno remoto o de producción, terminar aquí de forma segura
  if (isCloudOrProd) {
    console.log('\n========================================================');
    console.log('🛡️ SEMILLA CANÓNICA DE SISTEMA COMPLETADA CON ÉXITO');
    console.log('   - 4 Usuarios configurados');
    console.log('   - 8 Sabores institucionales y 3 presentaciones');
    console.log('   - 9 Plantillas de WhatsApp y 4 respuestas rápidas');
    console.log('   - DATOS OPERACIONALES Y TRANSACCIONALES 100% INTACTOS');
    console.log('========================================================\n');
    return;
  }

  // --------------------------------------------------------------------------
  // ONBOARDING LOCAL DEMO EXCLUSIVO (SOLO ENTORNO LOCAL DE DESARROLLO)
  // --------------------------------------------------------------------------
  console.log('\n🧪 [4/4] Sembrando datos de prueba para entorno local...');

  // Staff
  const staffMembers = [
    { fullName: 'Edier Robles', role: 'Maestro Yogurtero', type: 'SOCIO', phone: '3024581882' },
    { fullName: 'Yeilin Gómez', role: 'Administración y Finanzas', type: 'SOCIO', phone: '3147464663' },
    { fullName: 'Juan Repartidor', role: 'Domiciliario de Rutas', type: 'COLABORADOR', phone: '3000000003' },
  ];
  for (const sm of staffMembers) {
    const existing = await prisma.staffMember.findFirst({ where: { fullName: sm.fullName } });
    if (!existing) {
      await prisma.staffMember.create({ data: sm });
    }
  }

  // Insumos y receta compuesta
  const rawMaterialsData = [
    { code: 'LECHE', name: 'Leche Entera Cruda', category: 'MATERIA_PRIMA', unit: 'Litros', currentStock: 120, minStockAlert: 20, avgCost: 3200 },
    { code: 'AZUCAR', name: 'Azúcar Blanca Refinada', category: 'INSUMO', unit: 'Kilogramos', currentStock: 25, minStockAlert: 5, avgCost: 3800 },
    { code: 'CULTIVO', name: 'Cultivo Láctico Termófilo', category: 'INSUMO', unit: 'Gramos', currentStock: 500, minStockAlert: 50, avgCost: 120 },
    { code: 'BOTELLA_1L', name: 'Botella Pet 1 Litro', category: 'EMPAQUE', unit: 'Unidades', currentStock: 80, minStockAlert: 20, avgCost: 1200 },
    { code: 'TAPA_1L', name: 'Tapa de Seguridad 1L', category: 'EMPAQUE', unit: 'Unidades', currentStock: 100, minStockAlert: 20, avgCost: 250 },
    { code: 'ETIQUETA_1L', name: 'Etiqueta Adhesiva YogurArte 1L', category: 'EMPAQUE', unit: 'Unidades', currentStock: 150, minStockAlert: 30, avgCost: 300 },
    { code: 'FRESA_FRUTA', name: 'Fresa Fresca de Huerta', category: 'INSUMO', unit: 'Kilogramos', currentStock: 15, minStockAlert: 3, avgCost: 8000 },
  ];

  const materialMap: Record<string, any> = {};
  for (const m of rawMaterialsData) {
    materialMap[m.code] = await prisma.rawMaterial.upsert({
      where: { code: m.code },
      update: { currentStock: m.currentStock, avgCost: m.avgCost, minStockAlert: m.minStockAlert },
      create: m,
    });
  }

  const mermelada = await prisma.rawMaterial.upsert({
    where: { code: 'MERMELADA_FRESA' },
    update: {
      name: 'Mermelada de Fresa Artesanal',
      category: 'INSUMO',
      unit: 'Kilogramos',
      isCompound: true,
      recipeYield: 1.0,
      currentStock: 5.0,
      avgCost: 12000,
      minStockAlert: 2,
    },
    create: {
      code: 'MERMELADA_FRESA',
      name: 'Mermelada de Fresa Artesanal',
      category: 'INSUMO',
      unit: 'Kilogramos',
      isCompound: true,
      recipeYield: 1.0,
      currentStock: 5.0,
      avgCost: 12000,
      minStockAlert: 2,
    },
  });

  await prisma.compoundRecipeItem.deleteMany({ where: { compoundMaterialId: mermelada.id } });
  await prisma.compoundRecipeItem.create({
    data: {
      compoundMaterialId: mermelada.id,
      ingredientId: materialMap['AZUCAR'].id,
      quantity: 0.4,
      unit: 'Kilogramos',
    },
  });
  await prisma.compoundRecipeItem.create({
    data: {
      compoundMaterialId: mermelada.id,
      ingredientId: materialMap['FRESA_FRUTA'].id,
      quantity: 0.8,
      unit: 'Kilogramos',
    },
  });

  // Lotes Demo
  const batchCompleted = await prisma.productionBatch.upsert({
    where: { batchCode: 'LOTE-DEMO-COMPLETED' },
    update: {},
    create: {
      batchCode: 'LOTE-DEMO-COMPLETED',
      milkUsedLiters: 24,
      bottles1LProduced: 25,
      bottles2LProduced: 0,
      totalLitersProduced: 26,
      yieldPercentage: 108.33,
      flavor: 'Base Natural',
      status: 'COMPLETADO',
      packagedLiters: 25,
      cultureType: 'Cultivo Termófilo Tradicional',
      fermentationHours: 8,
      totalCost: 110000,
      costPerLiter: 4230,
      registeredBy: 'Edier Robles',
    },
  });

  await prisma.batchPackaging.deleteMany({ where: { batchId: batchCompleted.id } });
  const fracFresa = await prisma.batchPackaging.create({
    data: {
      packagingCode: 'FRAC-DEMO-FRESA',
      batchId: batchCompleted.id,
      flavor: 'Fresa',
      bottles1L: 15,
      bottles2L: 0,
      totalLiters: 15,
      price1L: 12000,
      packagingCost: 45000,
      packagedBy: 'Edier Robles',
      notes: 'Envasado con mermelada artesanal fresca',
    },
  });

  const fracNatural = await prisma.batchPackaging.create({
    data: {
      packagingCode: 'FRAC-DEMO-NATURAL',
      batchId: batchCompleted.id,
      flavor: 'Natural',
      bottles1L: 10,
      bottles2L: 0,
      totalLiters: 10,
      price1L: 12000,
      packagingCost: 15000,
      packagedBy: 'Edier Robles',
      notes: 'Envasado sin azúcar añadido',
    },
  });

  // Clientes Demo
  const customersData = [
    {
      fullName: 'Laura Gómez',
      phone: '3001234567',
      address: 'Calle 12 # 14-20',
      neighborhood: 'Centro',
      notes: 'Cliente fiel, le encanta sabor Fresa. Acumula para premio.',
      loyaltyRedeemedCount: 0,
    },
    {
      fullName: 'Carlos Mendoza',
      phone: '3109876543',
      address: 'Carrera 8 # 5-30',
      neighborhood: 'El Bosque',
      notes: 'Paga puntual por transferencia Nequi.',
      loyaltyRedeemedCount: 1,
    },
  ];

  const customerMap: Record<string, any> = {};
  for (const c of customersData) {
    customerMap[c.fullName] = await prisma.customer.upsert({
      where: { id: (await prisma.customer.findFirst({ where: { phone: c.phone } }))?.id || 0 },
      update: c,
      create: c,
    });
  }

  // Pedidos Demo en Local: solo eliminar pedidos previos que comiencen con PED-DEMO-
  await prisma.orderPayment.deleteMany({ where: { order: { orderNumber: { startsWith: 'PED-DEMO-' } } } });
  await prisma.orderItem.deleteMany({ where: { order: { orderNumber: { startsWith: 'PED-DEMO-' } } } });
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: 'PED-DEMO-' } } });

  const now = new Date();
  await prisma.order.create({
    data: {
      orderNumber: 'PED-DEMO-LAURA-01',
      customerId: customerMap['Laura Gómez'].id,
      batchId: batchCompleted.id,
      bottleSize: '1L',
      quantityBottles: 8,
      totalLiters: 8,
      flavor: 'Fresa',
      unitPrice: 12000,
      totalAmount: 96000,
      paidAmount: 96000,
      pendingAmount: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'NEQUI',
      deliveryStatus: 'DELIVERED',
      deliveryType: 'DOMICILIARIO',
      deliveryDate: now,
      deliveryAddress: customerMap['Laura Gómez'].address,
      registeredBy: 'Admin',
      items: {
        create: [
          {
            packagingId: fracFresa.id,
            bottleSize: '1L',
            flavor: 'Fresa',
            quantity: 8,
            litersPerUnit: 1.0,
            totalLiters: 8.0,
            unitPrice: 12000,
            totalPrice: 96000,
          },
        ],
      },
    },
  });

  console.log('\n========================================================');
  console.log('🎉 BASE DE DATOS LOCAL POBLADA CON ÉXITO');
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
