import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const { period, date, startDate, endDate, month } = req.query;
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
    const staffPaymentWhere: any = {};

    let activeFilterDate = '';
    let customDateRange: { gte: Date; lte: Date } | null = null;

    if (date && typeof date === 'string') {
      activeFilterDate = date.split('T')[0];
    } else if (startDate || endDate) {
      const s = startDate ? String(startDate).split('T')[0] : '2020-01-01';
      const e = endDate ? String(endDate).split('T')[0] : '2099-12-31';
      customDateRange = {
        gte: new Date(`${s}T00:00:00.000Z`),
        lte: new Date(`${e}T23:59:59.999Z`),
      };
    } else if (period === 'today') {
      activeFilterDate = todayStr;
    } else if (period === 'yesterday') {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      activeFilterDate = getColombiaDateStr(yest);
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
        { orderDate: dayRange },
        { deliveryDate: dayRange },
      ];
      expenseWhere.expenseDate = dayRange;
      purchaseWhere.purchaseDate = dayRange;
      staffPaymentWhere.paymentDate = dayRange;
    } else if (customDateRange) {
      orderWhere.OR = [
        { orderDate: customDateRange },
        { deliveryDate: customDateRange },
      ];
      expenseWhere.expenseDate = customDateRange;
      purchaseWhere.purchaseDate = customDateRange;
      staffPaymentWhere.paymentDate = customDateRange;
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
        staffPaymentWhere.paymentDate = monthRange;
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
      staffPaymentWhere.paymentDate = monthRange;
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
      staffPaymentWhere.paymentDate = { gte: startOfWeek };
    }

    // 1. Consultar pedidos
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        customer: true,
        items: true,
        batch: {
          select: {
            id: true,
            batchCode: true,
            flavor: true,
            price1L: true,
            price2L: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    // 2. Consultar compras de materia prima
    const purchases = await prisma.purchase.findMany({
      where: purchaseWhere,
      include: {
        rawMaterial: {
          select: {
            name: true,
            category: true,
            unit: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    // 3. Consultar gastos generales
    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { expenseDate: 'desc' },
    });

    // 4. Consultar pagos de nómina y retiros de socios
    const staffPayments = await prisma.staffPayment.findMany({
      where: staffPaymentWhere,
      include: {
        staff: true,
      },
      orderBy: { paymentDate: 'desc' },
    });

    // 5. Consultar insumos con bajo stock
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { isActive: true },
    });
    const lowStockMaterials = rawMaterials.filter((m) => m.currentStock <= m.minStockAlert);

    // 6. Consultar lotes de producción activos
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

    // Cálculos de Nómina y Retiros
    const payrollPayments = staffPayments.filter((p) => p.paymentType !== 'RETIRO_SOCIO');
    const ownerDrawPayments = staffPayments.filter((p) => p.paymentType === 'RETIRO_SOCIO');
    const totalPayrollExpenses = payrollPayments.reduce((sum, p) => sum + p.netAmount, 0);
    const totalOwnerDraws = ownerDrawPayments.reduce((sum, p) => sum + p.netAmount, 0);

    // Cálculos Generales
    const totalOrdersCount = orders.length;
    const totalLitersSold = orders.reduce((sum, o) => sum + o.totalLiters, 0);
    const totalSalesAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCashCollected = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalPendingToCollect = orders.reduce((sum, o) => sum + o.pendingAmount, 0);

    // Cálculos de Pedidos ENTREGADOS
    const deliveredOrders = orders.filter((o) => o.deliveryStatus === 'DELIVERED');
    const deliveredUnpaidOrders = deliveredOrders.filter((o) => o.pendingAmount > 0);
    const deliveredPendingToCollect = deliveredUnpaidOrders.reduce((sum, o) => sum + o.pendingAmount, 0);
    const deliveredPaidAmount = deliveredOrders.reduce((sum, o) => sum + o.paidAmount, 0);
    const deliveredTotalSales = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Cálculos de Pedidos EN PROCESO
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
    const totalExpenses = totalRawMaterialPurchases + totalGeneralExpenses + totalPayrollExpenses;

    const netProfit = totalCashCollected - totalExpenses;

    const totalLitersProducedThisMonth = batchesThisMonth.reduce((sum, b) => sum + b.totalLitersProduced, 0);
    const totalLitersProducedAllTime = allActiveBatches.reduce((sum, b) => sum + b.totalLitersProduced, 0);
    const totalBatchesCountThisMonth = batchesThisMonth.length;

    // Agrupación de Ventas por Lote y Sabor para Modales Interactivos
    const groupByBatchAndFlavor = (orderList: typeof orders) => {
      const groups: Record<string, {
        batchCode: string;
        flavor: string;
        totalLiters: number;
        totalBottles1L: number;
        totalBottles2L: number;
        totalAmount: number;
        paidAmount: number;
        pendingAmount: number;
        ordersCount: number;
        customers: Array<{
          orderNumber: string;
          customerName: string;
          customerPhone: string;
          address: string;
          liters: number;
          bottlesSummary: string;
          totalAmount: number;
          paidAmount: number;
          pendingAmount: number;
          deliveryStatus: string;
          orderDate: Date;
          deliveryDate: Date | null;
        }>;
      }> = {};

      orderList.forEach((o) => {
        const batchCode = o.batch?.batchCode || 'Sin Lote Asignado';
        const flavor = o.batch?.flavor || o.flavor || 'Natural';
        const key = `${batchCode}___${flavor}`;

        if (!groups[key]) {
          groups[key] = {
            batchCode,
            flavor,
            totalLiters: 0,
            totalBottles1L: 0,
            totalBottles2L: 0,
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            ordersCount: 0,
            customers: [],
          };
        }

        const g = groups[key];
        g.totalLiters += o.totalLiters;
        g.totalAmount += o.totalAmount;
        g.paidAmount += o.paidAmount;
        g.pendingAmount += o.pendingAmount;
        g.ordersCount += 1;

        if (o.items && o.items.length > 0) {
          o.items.forEach((item) => {
            if (item.bottleSize === '1L') g.totalBottles1L += item.quantity;
            if (item.bottleSize === '2L') g.totalBottles2L += item.quantity;
          });
        } else {
          if (o.bottleSize === '1L') g.totalBottles1L += o.quantityBottles;
          if (o.bottleSize === '2L') g.totalBottles2L += o.quantityBottles;
        }

        const bottlesSummary = o.items && o.items.length > 0
          ? o.items.map((it) => `${it.quantity}x ${it.bottleSize} (${it.flavor})`).join(', ')
          : `${o.quantityBottles}x ${o.bottleSize} (${o.flavor})`;

        g.customers.push({
          orderNumber: o.orderNumber,
          customerName: o.customer?.fullName || 'Cliente',
          customerPhone: o.customer?.phone || '',
          address: o.deliveryAddress || o.customer?.address || 'Fonseca',
          liters: o.totalLiters,
          bottlesSummary,
          totalAmount: o.totalAmount,
          paidAmount: o.paidAmount,
          pendingAmount: o.pendingAmount,
          deliveryStatus: o.deliveryStatus,
          orderDate: o.orderDate,
          deliveryDate: o.deliveryDate,
        });
      });

      return Object.values(groups);
    };

    const deliveredGroups = groupByBatchAndFlavor(deliveredOrders);
    const inProcessGroups = groupByBatchAndFlavor(inProcessOrders);
    const allGroups = groupByBatchAndFlavor(orders);

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
        totalPayrollExpenses,
        totalOwnerDraws,
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
      detailedBreakdowns: {
        expenses: {
          rawMaterials: purchases.map((p) => ({
            id: p.id,
            date: p.purchaseDate,
            name: p.rawMaterial?.name || 'Insumo',
            category: p.rawMaterial?.category || 'INSUMO',
            quantity: p.quantity,
            unit: p.rawMaterial?.unit || 'Und',
            unitCost: p.unitCost,
            totalCost: p.totalCost,
            supplier: p.supplier || 'Proveedor local',
          })),
          generalExpenses: expenses.map((e) => ({
            id: e.id,
            date: e.expenseDate,
            category: e.category,
            description: e.description,
            amount: e.amount,
            notes: e.notes,
          })),
          payroll: payrollPayments.map((p) => ({
            id: p.id,
            date: p.paymentDate,
            staffName: p.staff?.fullName || 'Colaborador',
            role: p.staff?.role || 'Personal',
            paymentType: p.paymentType,
            calculationDetails: p.calculationDetails || 'Pago nómina',
            netAmount: p.netAmount,
            paymentMethod: p.paymentMethod,
            period: p.periodStart && p.periodEnd ? `${p.periodStart.toISOString().split('T')[0]} al ${p.periodEnd.toISOString().split('T')[0]}` : null,
          })),
          ownerDraws: ownerDrawPayments.map((p) => ({
            id: p.id,
            date: p.paymentDate,
            staffName: p.staff?.fullName || 'Socio',
            calculationDetails: p.calculationDetails || 'Retiro de utilidades',
            netAmount: p.netAmount,
            paymentMethod: p.paymentMethod,
          })),
        },
        salesByBatchAndFlavor: {
          delivered: deliveredGroups,
          inProcess: inProcessGroups,
          all: allGroups,
        },
      },
      lowStockAlerts: lowStockMaterials.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        currentStock: m.currentStock,
        minStockAlert: m.minStockAlert,
        unit: m.unit,
      })),
      recentOrders: orders.slice(0, 8),
      periodOrders: orders,
      inventorySummary: rawMaterials,
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen del dashboard' });
  }
};
