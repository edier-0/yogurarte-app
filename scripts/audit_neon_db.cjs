/**
 * Script de auditoría de sólo lectura contra Neon DB
 * Utiliza SELECTs seguros compatibles con el esquema actual de Neon DB
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const neonUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: { url: neonUrl },
  },
});

function formatCOP(val) {
  return `$ ${(val || 0).toLocaleString('es-CO')}`;
}

async function auditNeonDb() {
  console.log('📡 Conectando a Neon DB en AWS us-east-2...');
  console.log(`URL: ${neonUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  try {
    // 1. AUDITORÍA DE CLIENTES Y CARTERA PENDIENTE
    console.log('=====================================================');
    console.log('👤 1. AUDITORÍA DE CLIENTES Y CARTERA PENDIENTE');
    console.log('=====================================================');

    const totalCustomersCount = await prisma.customer.count();
    const activeCustomersCount = await prisma.customer.count({ where: { isActive: true } });

    // Traer todos los pedidos no cancelados con saldo pendiente
    const pendingOrders = await prisma.order.findMany({
      where: {
        deliveryStatus: { not: 'CANCELLED' },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      include: {
        customer: true,
      },
      orderBy: { orderDate: 'asc' },
    });

    // Agrupar por cliente
    const customerDebtMap = new Map();

    for (const order of pendingOrders) {
      const cId = order.customerId;
      const unpaid = (order.totalAmount || 0) - (order.paidAmount || 0);
      if (unpaid <= 0) continue;

      if (!customerDebtMap.has(cId)) {
        customerDebtMap.set(cId, {
          customer: order.customer,
          deliveredDebt: 0,
          inProcessDebt: 0,
          totalDebt: 0,
          deliveredOrdersCount: 0,
          inProcessOrdersCount: 0,
          orders: [],
        });
      }

      const record = customerDebtMap.get(cId);
      record.totalDebt += unpaid;
      record.orders.push({
        id: order.id,
        orderCode: order.orderNumber || `#${order.id}`,
        deliveryStatus: order.deliveryStatus,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        pending: unpaid,
        orderDate: order.orderDate,
      });

      if (order.deliveryStatus === 'DELIVERED') {
        record.deliveredDebt += unpaid;
        record.deliveredOrdersCount += 1;
      } else {
        record.inProcessDebt += unpaid;
        record.inProcessOrdersCount += 1;
      }
    }

    const customersWithDebt = Array.from(customerDebtMap.values()).sort(
      (a, b) => b.totalDebt - a.totalDebt
    );

    const totalDeliveredDebt = customersWithDebt.reduce((sum, c) => sum + c.deliveredDebt, 0);
    const totalInProcessDebt = customersWithDebt.reduce((sum, c) => sum + c.inProcessDebt, 0);
    const grandTotalDebt = customersWithDebt.reduce((sum, c) => sum + c.totalDebt, 0);

    console.log(`• Total Clientes Registrados: ${totalCustomersCount} (${activeCustomersCount} activos)`);
    console.log(`• Clientes con Saldo Pendiente (Deuda > 0): ${customersWithDebt.length}`);
    console.log(`• Total Cartera Entregada Pendiente de Cobro: ${formatCOP(totalDeliveredDebt)}`);
    console.log(`• Total Pedidos en Camino/Encargos Pendientes: ${formatCOP(totalInProcessDebt)}`);
    console.log(`• Cartera Total Acumulada: ${formatCOP(grandTotalDebt)}\n`);

    console.log('--- Listado de Clientes con Deuda Actual ---');
    customersWithDebt.forEach((item, idx) => {
      console.log(
        `${idx + 1}. [ID ${item.customer.id}] ${item.customer.fullName} (${item.customer.phone || 'Sin tel'}):`
      );
      console.log(
        `   - Deuda Entregada: ${formatCOP(item.deliveredDebt)} (${item.deliveredOrdersCount} pedidos entregados)`
      );
      if (item.inProcessDebt > 0) {
        console.log(
          `   - Pedidos en Proceso: ${formatCOP(item.inProcessDebt)} (${item.inProcessOrdersCount} pedidos)`
        );
      }
      console.log(`   - TOTAL DEUDA: ${formatCOP(item.totalDebt)}`);
      item.orders.forEach((o) => {
        console.log(
          `     * Pedido ${o.orderCode} [${o.deliveryStatus}]: Total ${formatCOP(o.totalAmount)} | Pagado ${formatCOP(o.paidAmount)} | Pendiente ${formatCOP(o.pending)}`
        );
      });
    });

    // 2. AUDITORÍA DE CAJA Y FLUJO DE FONDOS
    console.log('\n=====================================================');
    console.log('💵 2. AUDITORÍA CONSOLIDADA DE CAJA Y SALDOS');
    console.log('=====================================================');

    // Usamos SQL crudo para las tablas con campos nuevos en el schema local pero antiguos en Neon
    const [
      allCashMovements,
      allOrderPayments,
      allPurchases,
      allExpenses,
      allStaffPayments,
      allCreditPayments,
    ] = await Promise.all([
      prisma.$queryRaw`SELECT * FROM "CashMovement" ORDER BY "movementDate" ASC`,
      prisma.$queryRaw`SELECT * FROM "OrderPayment" ORDER BY "paymentDate" ASC`,
      prisma.$queryRaw`SELECT * FROM "Purchase" ORDER BY "purchaseDate" ASC`,
      prisma.$queryRaw`SELECT * FROM "Expense" ORDER BY "expenseDate" ASC`,
      prisma.$queryRaw`SELECT * FROM "StaffPayment" ORDER BY "paymentDate" ASC`,
      prisma.$queryRaw`SELECT * FROM "CreditPayment" ORDER BY "paymentDate" ASC`,
    ]);

    const isCash = (m) => !m || m.toUpperCase().trim() === 'EFECTIVO';

    let cashInHand = 0;
    let digitalBank = 0;

    let totalInflowCash = 0;
    let totalInflowBank = 0;
    let totalOutflowCash = 0;
    let totalOutflowBank = 0;

    // A. Movimientos de Caja Directos (Base inicial, aportes, retiros)
    let totalBaseInicial = 0;
    let totalAportes = 0;
    let totalRetirosBase = 0;
    let totalAjustesCaja = 0;

    for (const m of allCashMovements) {
      const amount = Number(m.amount) || 0;
      const cash = isCash(m.paymentMethod);
      if (m.type === 'BASE_INICIAL' || m.type === 'APORTE_SOCIO' || m.type === 'INGRESO') {
        if (m.type === 'BASE_INICIAL') totalBaseInicial += amount;
        if (m.type === 'APORTE_SOCIO') totalAportes += amount;

        if (cash) {
          cashInHand += amount;
          totalInflowCash += amount;
        } else {
          digitalBank += amount;
          totalInflowBank += amount;
        }
      } else if (m.type === 'RETIRO_BASE' || m.type === 'EGRESO') {
        totalRetirosBase += amount;
        if (cash) {
          cashInHand -= amount;
          totalOutflowCash += amount;
        } else {
          digitalBank -= amount;
          totalOutflowBank += amount;
        }
      } else if (m.type === 'AJUSTE_CAJA' || m.type === 'AJUSTE_SOBRANTE') {
        totalAjustesCaja += amount;
        if (cash) {
          cashInHand += amount;
          totalInflowCash += amount;
        } else {
          digitalBank += amount;
          totalInflowBank += amount;
        }
      } else if (m.type === 'AJUSTE_FALTANTE') {
        totalAjustesCaja -= amount;
        if (cash) {
          cashInHand -= amount;
          totalOutflowCash += amount;
        } else {
          digitalBank -= amount;
          totalOutflowBank += amount;
        }
      } else if (m.type === 'TRASLADO_EFECTIVO_A_BANCO') {
        cashInHand -= amount;
        digitalBank += amount;
      } else if (m.type === 'TRASLADO_BANCO_A_EFECTIVO') {
        cashInHand += amount;
        digitalBank -= amount;
      }
    }

    // B. Recaudos de Pedidos (OrderPayment)
    let totalOrderPaymentsCash = 0;
    let totalOrderPaymentsBank = 0;

    for (const p of allOrderPayments) {
      const amount = Number(p.amount) || 0;
      if (isCash(p.paymentMethod)) {
        cashInHand += amount;
        totalInflowCash += amount;
        totalOrderPaymentsCash += amount;
      } else {
        digitalBank += amount;
        totalInflowBank += amount;
        totalOrderPaymentsBank += amount;
      }
    }

    // C. Compras de Insumos (Purchases)
    let totalPurchasesCash = 0;
    let totalPurchasesBank = 0;

    for (const pur of allPurchases) {
      const amount = Number(pur.totalCost) || 0;
      if (isCash(pur.paymentMethod)) {
        cashInHand -= amount;
        totalOutflowCash += amount;
        totalPurchasesCash += amount;
      } else {
        digitalBank -= amount;
        totalOutflowBank += amount;
        totalPurchasesBank += amount;
      }
    }

    // D. Gastos Operativos (Expenses)
    let totalExpensesCash = 0;
    let totalExpensesBank = 0;

    for (const exp of allExpenses) {
      const amount = Number(exp.amount) || 0;
      if (isCash(exp.paymentMethod)) {
        cashInHand -= amount;
        totalOutflowCash += amount;
        totalExpensesCash += amount;
      } else {
        digitalBank -= amount;
        totalOutflowBank += amount;
        totalExpensesBank += amount;
      }
    }

    // E. Nómina y Retiros de Personal/Socios (StaffPayment)
    let totalStaffCash = 0;
    let totalStaffBank = 0;

    for (const sp of allStaffPayments) {
      const amount = Number(sp.netAmount) || 0;
      if (isCash(sp.paymentMethod)) {
        cashInHand -= amount;
        totalOutflowCash += amount;
        totalStaffCash += amount;
      } else {
        digitalBank -= amount;
        totalOutflowBank += amount;
        totalStaffBank += amount;
      }
    }

    // F. Pagos de Créditos / Cuotas (CreditPayment)
    let totalCreditPaymentsCash = 0;
    let totalCreditPaymentsBank = 0;

    for (const cp of allCreditPayments) {
      const amount = Number(cp.amount) || 0;
      if (amount <= 0 || cp.actionType === 'CUOTA_OMITIDA_APLAZADA') continue;
      if (isCash(cp.paymentMethod)) {
        cashInHand -= amount;
        totalOutflowCash += amount;
        totalCreditPaymentsCash += amount;
      } else {
        digitalBank -= amount;
        totalOutflowBank += amount;
        totalCreditPaymentsBank += amount;
      }
    }

    console.log(`• Saldo Total Consolidado en Caja: ${formatCOP(cashInHand + digitalBank)}`);
    console.log(`  - Efectivo en Mano (Caja Física): ${formatCOP(cashInHand)}`);
    console.log(`  - Bancos / Digital (Nequi / Bancolombia / Transferencias): ${formatCOP(digitalBank)}\n`);

    console.log('--- Detalle de Entradas Consolidadas ---');
    console.log(`  * Recaudos por Ventas de Pedidos: ${formatCOP(totalOrderPaymentsCash + totalOrderPaymentsBank)}`);
    console.log(`      - Efectivo: ${formatCOP(totalOrderPaymentsCash)}`);
    console.log(`      - Digital: ${formatCOP(totalOrderPaymentsBank)}`);
    console.log(`  * Base Inicial Inyectada: ${formatCOP(totalBaseInicial)}`);
    console.log(`  * Aportes de Socios: ${formatCOP(totalAportes)}`);
    console.log(`  * Ajustes / Sobrantes: ${formatCOP(totalAjustesCaja)}`);
    console.log(`  => TOTAL ENTRADAS: ${formatCOP(totalInflowCash + totalInflowBank)} (Efectivo: ${formatCOP(totalInflowCash)}, Digital: ${formatCOP(totalInflowBank)})\n`);

    console.log('--- Detalle de Salidas Consolidadas ---');
    console.log(`  * Compras de Materia Prima / Insumos: ${formatCOP(totalPurchasesCash + totalPurchasesBank)} (Efectivo: ${formatCOP(totalPurchasesCash)}, Digital: ${formatCOP(totalPurchasesBank)})`);
    console.log(`  * Gastos Operativos: ${formatCOP(totalExpensesCash + totalExpensesBank)} (Efectivo: ${formatCOP(totalExpensesCash)}, Digital: ${formatCOP(totalExpensesBank)})`);
    console.log(`  * Nómina y Retiros de Socios: ${formatCOP(totalStaffCash + totalStaffBank)} (Efectivo: ${formatCOP(totalStaffCash)}, Digital: ${formatCOP(totalStaffBank)})`);
    console.log(`  * Pagos de Créditos: ${formatCOP(totalCreditPaymentsCash + totalCreditPaymentsBank)}`);
    console.log(`  * Retiros de Base: ${formatCOP(totalRetirosBase)}`);
    console.log(`  => TOTAL SALIDAS: ${formatCOP(totalOutflowCash + totalOutflowBank)} (Efectivo: ${formatCOP(totalOutflowCash)}, Digital: ${formatCOP(totalOutflowBank)})\n`);

    // 3. AUDITORÍA DE MATERIA PRIMA E INSUMOS
    console.log('=====================================================');
    console.log('📦 3. AUDITORÍA DE MATERIA PRIMA E INSUMOS');
    console.log('=====================================================');

    const rawMaterials = await prisma.$queryRaw`
      SELECT id, code, name, category, unit, "currentStock", "minStockAlert", "avgCost", "isActive"
      FROM "RawMaterial"
      ORDER BY category ASC, name ASC
    `;

    console.log(`• Total Insumos en Catálogo de Neon DB: ${rawMaterials.length}`);

    const categoriesCount = {};
    rawMaterials.forEach((m) => {
      categoriesCount[m.category] = (categoriesCount[m.category] || 0) + 1;
    });

    console.log(`  Desglose por Categoría:`);
    for (const [cat, count] of Object.entries(categoriesCount)) {
      console.log(`    - ${cat}: ${count} insumos`);
    }

    console.log('\n--- Listado Completo de Insumos y Stock Actual en Neon DB ---');
    rawMaterials.forEach((m) => {
      console.log(
        `• [${m.code}] ${m.name} | Cat: ${m.category} | Stock: ${m.currentStock} ${m.unit} | Costo PMP: ${formatCOP(m.avgCost)} | Activo: ${m.isActive ? 'SÍ' : 'NO'}`
      );
    });

    // 4. AUDITORÍA DE LOTES Y FRACCIONES
    console.log('\n=====================================================');
    console.log('🍶 4. AUDITORÍA DE LOTES Y FRACCIONES');
    console.log('=====================================================');

    const batches = await prisma.$queryRaw`
      SELECT id, "batchCode", flavor, "totalLitersProduced", status, "milkUsedLiters", "preparationDate"
      FROM "ProductionBatch"
      ORDER BY "preparationDate" DESC
    `;

    const packagings = await prisma.$queryRaw`
      SELECT id, "packagingCode", "batchId", flavor, "bottles1L", "bottles2L", "totalLiters"
      FROM "BatchPackaging"
      ORDER BY "packagedAt" DESC
    `;

    console.log(`• Total Lotes Madre (Fase A) en Neon DB: ${batches.length}`);
    console.log(`• Total Fracciones Envasadas (Fase B) en Neon DB: ${packagings.length}\n`);

    batches.forEach((b) => {
      const batchPackagings = packagings.filter((p) => p.batchId === b.id);
      console.log(
        `  - Lote [${b.batchCode}] (${b.flavor}): ${b.totalLitersProduced} L producidos (Leche: ${b.milkUsedLiters} L) | Estado: ${b.status} | Fracciones vinculadas: ${batchPackagings.length}`
      );
      batchPackagings.forEach((p) => {
        console.log(
          `      * Fracción [${p.packagingCode || 'F-' + p.id}] Sabor ${p.flavor}: ${p.totalLiters} L (${p.bottles1L}x1L, ${p.bottles2L}x2L)`
        );
      });
    });

    // 5. RESUMEN GLOBAL DE TABLAS EN NEON DB
    console.log('\n=====================================================');
    console.log('📊 5. CONTEO GLOBAL DE REGISTROS POR TABLA EN NEON DB');
    console.log('=====================================================');

    const tableCounts = await Promise.all([
      prisma.user.count().then((c) => ({ table: 'User', count: c })),
      prisma.customer.count().then((c) => ({ table: 'Customer', count: c })),
      prisma.$queryRaw`SELECT count(*) FROM "Order"`.then((res) => ({ table: 'Order', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "OrderItem"`.then((res) => ({ table: 'OrderItem', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "OrderPayment"`.then((res) => ({ table: 'OrderPayment', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "ProductionBatch"`.then((res) => ({ table: 'ProductionBatch', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "BatchPackaging"`.then((res) => ({ table: 'BatchPackaging', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "RawMaterial"`.then((res) => ({ table: 'RawMaterial', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "Purchase"`.then((res) => ({ table: 'Purchase', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "Expense"`.then((res) => ({ table: 'Expense', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "CashMovement"`.then((res) => ({ table: 'CashMovement', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "StaffMember"`.then((res) => ({ table: 'StaffMember', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "StaffPayment"`.then((res) => ({ table: 'StaffPayment', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "CreditObligation"`.then((res) => ({ table: 'CreditObligation', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "CreditPayment"`.then((res) => ({ table: 'CreditPayment', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "ChatConversation"`.then((res) => ({ table: 'ChatConversation', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "ChatMessage"`.then((res) => ({ table: 'ChatMessage', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "RecurringSchedule"`.then((res) => ({ table: 'RecurringSchedule', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "CrmQuickReply"`.then((res) => ({ table: 'CrmQuickReply', count: Number(res[0].count) })),
      prisma.$queryRaw`SELECT count(*) FROM "ProductFlavor"`.then((res) => ({ table: 'ProductFlavor', count: Number(res[0].count) })),
    ]);

    tableCounts.forEach((tc) => {
      console.log(`  • ${tc.table.padEnd(20)}: ${tc.count} registros`);
    });

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditNeonDb();
