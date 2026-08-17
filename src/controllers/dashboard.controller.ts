import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const { period, date, month } = req.query;
    const now = new Date();

    const getColombiaDateStr = (d = new Date()) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d); // "YYYY-MM-DD"
    };

    const todayStr = getColombiaDateStr(now);

    const orderWhere: any = {};
    const expenseWhere: any = {};
    const purchaseWhere: any = {};

    let activeFilterDate = '';

    if (date && typeof date === 'string') {
      activeFilterDate = date.split('T')[0];
    } else if (period === 'today') {
      activeFilterDate = todayStr;
    } else if (period === 'tomorrow') {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      activeFilterDate = getColombiaDateStr(tmrw);
    }

    if (activeFilterDate) {
      const dayStart = new Date(`${activeFilterDate}T00:00:00.000Z`);
      const dayEnd = new Date(`${activeFilterDate}T23:59:59.999Z`);
      const dayRange = { gte: dayStart, lte: dayEnd };

      orderWhere.OR = [
        { deliveryDate: dayRange },
        {
          AND: [
            { deliveryDate: null },
            { orderDate: dayRange },
          ],
        },
      ];
      expenseWhere.expenseDate = dayRange;
      purchaseWhere.purchaseDate = dayRange;
    } else if (month && typeof month === 'string') {
      const [year, m] = month.split('-').map(Number);
      if (year && m) {
        const startOfMonth = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
        const monthRange = { gte: startOfMonth, lte: endOfMonth };
        orderWhere.OR = [
          { orderDate: monthRange },
          { deliveryDate: monthRange },
        ];
        expenseWhere.expenseDate = monthRange;
        purchaseWhere.purchaseDate = monthRange;
      }
    } else if (period === 'month') {
      const [year, m] = todayStr.split('-').map(Number);
      const startOfMonth = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
      const monthRange = { gte: startOfMonth, lte: endOfMonth };
      orderWhere.OR = [
        { orderDate: monthRange },
        { deliveryDate: monthRange },
      ];
      expenseWhere.expenseDate = monthRange;
      purchaseWhere.purchaseDate = monthRange;
    } else if (period === 'week') {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const mondayStr = getColombiaDateStr(monday);
      const startOfWeek = new Date(`${mondayStr}T00:00:00.000Z`);

      orderWhere.OR = [
        { orderDate: { gte: startOfWeek } },
        { deliveryDate: { gte: startOfWeek } },
      ];
      expenseWhere.expenseDate = { gte: startOfWeek };
      purchaseWhere.purchaseDate = { gte: startOfWeek };
    }

    // 1. Consultar pedidos
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: { customer: true },
      orderBy: { orderDate: 'desc' },
    });

    // 2. Consultar compras de materia prima
    const purchases = await prisma.purchase.findMany({
      where: purchaseWhere,
    });

    // 3. Consultar gastos generales
    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
    });

    // 4. Consultar insumos con bajo stock
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { isActive: true },
    });
    const lowStockMaterials = rawMaterials.filter((m) => m.currentStock <= m.minStockAlert);

    // 5. Consultar lotes de producción activos
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [batchesThisMonth, allActiveBatches] = await Promise.all([
      prisma.productionBatch.findMany({
        where: {
          isActive: true,
          preparationDate: { gte: startOfCurrentMonth },
        },
      }),
      prisma.productionBatch.findMany({
        where: { isActive: true },
      }),
    ]);

    // Cálculos Generales
    const totalOrdersCount = orders.length;
    const totalLitersSold = orders.reduce((sum, o) => sum + o.totalLiters, 0);
    const totalSalesAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCashCollected = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalPendingToCollect = orders.reduce((sum, o) => sum + o.pendingAmount, 0);

    // Cálculos de Pedidos ENTREGADOS (Cobros Reales en la Calle)
    const deliveredOrders = orders.filter((o) => o.deliveryStatus === 'DELIVERED');
    const deliveredUnpaidOrders = deliveredOrders.filter((o) => o.pendingAmount > 0);
    const deliveredPendingToCollect = deliveredUnpaidOrders.reduce((sum, o) => sum + o.pendingAmount, 0);
    const deliveredPaidAmount = deliveredOrders.reduce((sum, o) => sum + o.paidAmount, 0);
    const deliveredTotalSales = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Cálculos de Pedidos EN PROCESO (En preparación o pendientes de entrega)
    const inProcessOrders = orders.filter((o) => o.deliveryStatus !== 'DELIVERED');
    const inProcessPendingToCollect = inProcessOrders.reduce((sum, o) => sum + o.pendingAmount, 0);
    const inProcessPaidAmount = inProcessOrders.reduce((sum, o) => sum + o.paidAmount, 0);
    const inProcessTotalSales = inProcessOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Cálculos de Litros
    const totalLitersAll = orders.reduce((sum, o) => sum + o.totalLiters, 0);
    const deliveredLiters = deliveredOrders.reduce((sum, o) => sum + o.totalLiters, 0);
    const inProcessLiters = inProcessOrders.reduce((sum, o) => sum + o.totalLiters, 0);

    const totalRawMaterialPurchases = purchases.reduce((sum, p) => sum + p.totalCost, 0);
    const totalGeneralExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalRawMaterialPurchases + totalGeneralExpenses;

    const netProfit = totalCashCollected - totalExpenses;

    const totalLitersProducedThisMonth = batchesThisMonth.reduce((sum, b) => sum + b.totalLitersProduced, 0);
    const totalLitersProducedAllTime = allActiveBatches.reduce((sum, b) => sum + b.totalLitersProduced, 0);
    const totalBatchesCountThisMonth = batchesThisMonth.length;

    // Conteo por estado de pago
    const ordersPaidCount = orders.filter((o) => o.paymentStatus === 'PAID').length;
    const ordersPartialCount = orders.filter((o) => o.paymentStatus === 'PARTIAL').length;
    const ordersPendingCount = orders.filter((o) => o.paymentStatus === 'PENDING').length;

    // Conteo por estado de entrega
    const ordersDeliveredCount = deliveredOrders.length;
    const ordersInRouteCount = orders.filter((o) => o.deliveryStatus === 'IN_ROUTE').length;
    const ordersPendingDeliveryCount = inProcessOrders.length;

    res.json({
      kpis: {
        totalOrdersCount,
        totalLitersAll,
        totalLitersSold: deliveredLiters,
        deliveredLiters,
        inProcessLiters,
        totalSalesAmount,
        totalCashCollected,
        totalPendingToCollect,
        deliveredPendingToCollect,
        deliveredPaidAmount,
        deliveredTotalSales,
        inProcessPendingToCollect,
        inProcessPaidAmount,
        inProcessTotalSales,
        totalRawMaterialPurchases,
        totalGeneralExpenses,
        totalExpenses,
        netProfit,
        totalLitersProducedThisMonth,
        totalLitersProducedAllTime,
        totalBatchesCountThisMonth,
      },
      deliveredStats: {
        deliveredOrdersCount: deliveredOrders.length,
        deliveredUnpaidCount: deliveredUnpaidOrders.length,
        deliveredPaidCount: deliveredOrders.filter((o) => o.pendingAmount === 0).length,
        deliveredPendingToCollect,
        deliveredPaidAmount,
        deliveredTotalSales,
        deliveredUnpaidOrders: deliveredUnpaidOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customer?.fullName || 'Cliente',
          customerPhone: o.customer?.phone || '',
          deliveryAddress: o.deliveryAddress || o.customer?.address || 'Fonseca',
          totalAmount: o.totalAmount,
          paidAmount: o.paidAmount,
          pendingAmount: o.pendingAmount,
          totalLiters: o.totalLiters,
          flavor: o.flavor,
          deliveryDate: o.deliveryDate || o.orderDate,
        })),
      },
      inProcessStats: {
        inProcessOrdersCount: inProcessOrders.length,
        inProcessPendingToCollect,
        inProcessPaidAmount,
        inProcessTotalSales,
      },
      paymentBreakdown: {
        paid: ordersPaidCount,
        partial: ordersPartialCount,
        pending: ordersPendingCount,
      },
      deliveryBreakdown: {
        delivered: ordersDeliveredCount,
        inRoute: ordersInRouteCount,
        pendingDelivery: ordersPendingDeliveryCount,
      },
      lowStockAlerts: lowStockMaterials.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        currentStock: m.currentStock,
        minStockAlert: m.minStockAlert,
        unit: m.unit,
      })),
      recentOrders: orders.slice(0, 6),
      inventorySummary: rawMaterials,
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen del dashboard' });
  }
};
