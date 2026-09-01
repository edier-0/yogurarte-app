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
    const cashMovementWhere: any = {};
    const dischargeWhere: any = {};

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
      cashMovementWhere.movementDate = dayRange;
      dischargeWhere.dischargeDate = dayRange;
    } else if (customDateRange) {
      orderWhere.OR = [
        { orderDate: customDateRange },
        { deliveryDate: customDateRange },
      ];
      expenseWhere.expenseDate = customDateRange;
      purchaseWhere.purchaseDate = customDateRange;
      staffPaymentWhere.paymentDate = customDateRange;
      cashMovementWhere.movementDate = customDateRange;
      dischargeWhere.dischargeDate = customDateRange;
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
        cashMovementWhere.movementDate = monthRange;
        dischargeWhere.dischargeDate = monthRange;
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
      cashMovementWhere.movementDate = monthRange;
      dischargeWhere.dischargeDate = monthRange;
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
      cashMovementWhere.movementDate = { gte: startOfWeek };
      dischargeWhere.dischargeDate = { gte: startOfWeek };
    }

    // 1. Consultar todas las entidades en paralelo para máxima velocidad (PostgreSQL Connection Pooling)
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      orders,
      purchases,
      expenses,
      staffPayments,
      cashMovements,
      activeCreditObligations,
      rawMaterials,
      batchesThisMonth,
      allActiveBatches,
      batchDischarges,
    ] = await Promise.all([
      // 1. Pedidos del período
      prisma.order.findMany({
        where: orderWhere,
        include: {
          customer: true,
          items: true,
          payments: {
            orderBy: { paymentDate: 'asc' },
          },
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
      }),

      // 2. Compras de materia prima
      prisma.purchase.findMany({
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
      }),

      // 3. Gastos generales
      prisma.expense.findMany({
        where: expenseWhere,
        orderBy: { expenseDate: 'desc' },
      }),

      // 4. Pagos de nómina y retiros de socios
      prisma.staffPayment.findMany({
        where: staffPaymentWhere,
        include: {
          staff: true,
        },
        orderBy: { paymentDate: 'desc' },
      }),

      // 5. Movimientos de caja (Bases iniciales, aportes y retiros)
      prisma.cashMovement.findMany({
        where: cashMovementWhere,
        orderBy: { movementDate: 'desc' },
      }),

      // 6. Créditos y obligaciones activas
      prisma.creditObligation.findMany({
        where: { status: 'ACTIVO' },
        orderBy: { nextDueDate: 'asc' },
      }),

      // 7. Insumos activos para alerta de bajo stock
      prisma.rawMaterial.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          currentStock: true,
          minStockAlert: true,
          unit: true,
          category: true,
        },
      }),

      // 8. Lotes producidos este mes
      prisma.productionBatch.findMany({
        where: {
          isActive: true,
          preparationDate: { gte: startOfCurrentMonth },
        },
        select: {
          id: true,
          totalLitersProduced: true,
          yieldPercentage: true,
          totalCost: true,
        },
      }),

      // 9. Todos los lotes activos
      prisma.productionBatch.findMany({
        where: { isActive: true },
        select: {
          id: true,
          batchCode: true,
          flavor: true,
          status: true,
          totalLitersProduced: true,
        },
      }),

      // 10. Retiros de lote (socios, consumo propio, mermas)
      prisma.batchDischarge.findMany({
        where: dischargeWhere,
        include: {
          batch: {
            select: {
              id: true,
              batchCode: true,
              flavor: true,
            },
          },
          staffMember: {
            select: {
              id: true,
              fullName: true,
              role: true,
              type: true,
            },
          },
        },
        orderBy: { dischargeDate: 'desc' },
      }),
    ]);

    const lowStockMaterials = rawMaterials.filter((m) => m.currentStock <= m.minStockAlert);

    // Mapeo y cálculo de retiros / entregas a socios
    const partnerDischarges = (batchDischarges || []).map((d) => {
      const batchCode = d.batch?.batchCode || 'Lote';
      const flavor = d.batch?.flavor || 'Natural';
      const partnerName = d.staffMember?.fullName || (d.reasonType === 'CONSUMO_SOCIO' ? 'Socio' : d.reasonType);
      const bottlesSummary = `${d.quantityBottles}x ${d.bottleSize} (${flavor})`;
      return {
        id: d.id,
        batchId: d.batchId,
        batchCode,
        flavor,
        partnerName,
        role: d.staffMember?.role || 'Socio',
        staffType: d.staffMember?.type || 'SOCIO',
        bottleSize: d.bottleSize,
        quantityBottles: d.quantityBottles,
        totalLiters: d.totalLiters,
        unitPrice: d.unitPrice,
        totalAmount: d.totalAmount,
        reasonType: d.reasonType,
        notes: d.notes,
        registeredBy: d.registeredBy,
        dischargeDate: d.dischargeDate,
        bottlesSummary,
      };
    });

    const totalPartnerDischargedLiters = partnerDischarges
      .filter((d) => d.reasonType === 'CONSUMO_SOCIO' || d.staffType === 'SOCIO' || d.partnerName)
      .reduce((sum, d) => sum + d.totalLiters, 0);

    const totalPartnerDischargedAmount = partnerDischarges
      .filter((d) => d.reasonType === 'CONSUMO_SOCIO' || d.staffType === 'SOCIO' || d.partnerName)
      .reduce((sum, d) => sum + d.totalAmount, 0);

    const totalAllDischargedLiters = partnerDischarges.reduce((sum, d) => sum + d.totalLiters, 0);

    // Cálculos de Nómina y Retiros
    const payrollPayments = staffPayments.filter((p) => p.paymentType !== 'RETIRO_SOCIO');
    const ownerDrawPayments = staffPayments.filter((p) => p.paymentType === 'RETIRO_SOCIO');
    const totalPayrollExpenses = payrollPayments.reduce((sum, p) => sum + p.netAmount, 0);
    const totalOwnerDraws = ownerDrawPayments.reduce((sum, p) => sum + p.netAmount, 0);

    // Cálculos de Movimientos de Caja (Bases, Aportes y Ajustes)
    const totalInjections = cashMovements
      .filter((m) => m.type === 'BASE_INICIAL' || m.type === 'APORTE_SOCIO' || m.type === 'AJUSTE_CAJA' || m.type === 'AJUSTE_SOBRANTE')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalWithdrawals = cashMovements
      .filter((m) => m.type === 'RETIRO_BASE' || m.type === 'AJUSTE_FALTANTE')
      .reduce((sum, m) => sum + m.amount, 0);

    const netCashInjections = totalInjections - totalWithdrawals;

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
    const totalDispatchedLiters = deliveredLiters + totalPartnerDischargedLiters;

    const totalRawMaterialPurchases = purchases.reduce((sum, p) => sum + p.totalCost, 0);
    const totalGeneralExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalRawMaterialPurchases + totalGeneralExpenses + totalPayrollExpenses;
    const totalOutflow = totalRawMaterialPurchases + totalGeneralExpenses + totalPayrollExpenses + totalOwnerDraws + totalWithdrawals;

    const netProfit = totalCashCollected - totalExpenses;

    // Helper para clasificar Efectivo vs Transferencias (Nequi / Bancolombia)
    const isCash = (m?: string | null) => !m || m.toUpperCase().trim() === 'EFECTIVO';

    let cashInHand = 0;
    let digitalBank = 0;
    let totalInflowCash = 0;
    let totalInflowBank = 0;
    let totalOutflowCash = 0;
    let totalOutflowBank = 0;

    // 1. Movimientos de Caja (Bases, Aportes, Retiros, Ajustes y Traslados)
    for (const m of cashMovements) {
      if (m.type === 'BASE_INICIAL' || m.type === 'APORTE_SOCIO' || m.type === 'AJUSTE_CAJA' || m.type === 'AJUSTE_SOBRANTE') {
        if (isCash(m.paymentMethod)) {
          cashInHand += m.amount;
          totalInflowCash += m.amount;
        } else {
          digitalBank += m.amount;
          totalInflowBank += m.amount;
        }
      } else if (m.type === 'RETIRO_BASE' || m.type === 'AJUSTE_FALTANTE') {
        if (isCash(m.paymentMethod)) {
          cashInHand -= m.amount;
          totalOutflowCash += m.amount;
        } else {
          digitalBank -= m.amount;
          totalOutflowBank += m.amount;
        }
      } else if (m.type === 'TRASLADO_EFECTIVO_A_BANCO') {
        cashInHand -= m.amount;
        digitalBank += m.amount;
      } else if (m.type === 'TRASLADO_BANCO_A_EFECTIVO') {
        cashInHand += m.amount;
        digitalBank -= m.amount;
      }
    }

    // 2. Pedidos Cobrados (Ventas)
    for (const o of orders) {
      if (o.payments && o.payments.length > 0) {
        for (const p of o.payments) {
          if (p.amount > 0) {
            if (isCash(p.paymentMethod)) {
              cashInHand += p.amount;
              totalInflowCash += p.amount;
            } else {
              digitalBank += p.amount;
              totalInflowBank += p.amount;
            }
          }
        }
      } else if (o.paidAmount > 0) {
        if (isCash(o.paymentMethod)) {
          cashInHand += o.paidAmount;
          totalInflowCash += o.paidAmount;
        } else {
          digitalBank += o.paidAmount;
          totalInflowBank += o.paidAmount;
        }
      }
    }

    // 3. Compras de Insumos
    for (const p of purchases) {
      if (isCash(p.paymentMethod)) {
        cashInHand -= p.totalCost;
        totalOutflowCash += p.totalCost;
      } else {
        digitalBank -= p.totalCost;
        totalOutflowBank += p.totalCost;
      }
    }

    // 4. Gastos Generales
    for (const e of expenses) {
      if (isCash(e.paymentMethod)) {
        cashInHand -= e.amount;
        totalOutflowCash += e.amount;
      } else {
        digitalBank -= e.amount;
        totalOutflowBank += e.amount;
      }
    }

    // 5. Nómina y Retiros (solo salidas monetarias reales en Efectivo o Bancos)
    for (const sp of staffPayments) {
      if (sp.paymentMethod === 'ESPECIE_PRODUCTO' || sp.paymentMethod === 'ESPECIE') {
        continue;
      }
      if (isCash(sp.paymentMethod)) {
        cashInHand -= sp.netAmount;
        totalOutflowCash += sp.netAmount;
      } else {
        digitalBank -= sp.netAmount;
        totalOutflowBank += sp.netAmount;
      }
    }

    const cashBalance = cashInHand + digitalBank;

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
          id: number;
          orderNumber: string;
          customerName: string;
          customerPhone: string;
          address: string;
          liters: number;
          bottlesSummary: string;
          totalAmount: number;
          paidAmount: number;
          pendingAmount: number;
          paymentStatus?: string;
          paymentMethod?: string;
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
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customer?.fullName || 'Cliente',
          customerPhone: o.customer?.phone || '',
          address: o.deliveryAddress || o.customer?.address || 'Fonseca',
          liters: o.totalLiters,
          bottlesSummary,
          totalAmount: o.totalAmount,
          paidAmount: o.paidAmount,
          pendingAmount: o.pendingAmount,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod || 'EFECTIVO',
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
        partnerDischargedLiters: totalPartnerDischargedLiters,
        partnerDischargedAmount: totalPartnerDischargedAmount,
        totalAllDischargedLiters,
        totalDispatchedLiters,
        inProcessLiters,
        totalSalesAmount,
        totalInjections,
        totalWithdrawals,
        netCashInjections,
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
        totalOutflow,
        cashBalance,
        cashInHand,
        digitalBank,
        totalInflowCash,
        totalInflowBank,
        totalOutflowCash,
        totalOutflowBank,
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
          paymentMethod: o.paymentMethod || 'EFECTIVO',
          deliveryDate: o.deliveryDate || o.orderDate,
        })),
      },
      inProcessStats: {
        inProcessOrdersCount: inProcessOrders.length,
        inProcessPendingToCollect,
        inProcessPaidAmount,
        inProcessTotalSales,
        inProcessPaidCount: inProcessOrders.filter((o) => o.paymentStatus === 'PAID').length,
        inProcessPartialCount: inProcessOrders.filter((o) => o.paymentStatus === 'PARTIAL').length,
        inProcessPendingCount: inProcessOrders.filter((o) => o.paymentStatus === 'PENDING').length,
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
        cashFlow: {
          totalInflow: totalInjections + totalCashCollected,
          totalInjections,
          totalWithdrawals,
          netCashInjections,
          totalSalesCollected: totalCashCollected,
          totalOutflow,
          cashBalance,
          cashInHand,
          digitalBank,
          totalInflowCash,
          totalInflowBank,
          totalOutflowCash,
          totalOutflowBank,
          inflows: [
            ...cashMovements
              .filter((m) => m.type === 'BASE_INICIAL' || m.type === 'APORTE_SOCIO' || m.type === 'AJUSTE_CAJA' || m.type === 'AJUSTE_SOBRANTE')
              .map((m) => ({
                id: `cash_inj_${m.id}`,
                rawId: m.id,
                orderNumber: m.type === 'BASE_INICIAL' ? '🏦 BASE-INICIAL' : m.type === 'AJUSTE_SOBRANTE' ? '⚖️ AJUSTE-SOBRANTE (+)' : m.type === 'AJUSTE_CAJA' ? '⚖️ AJUSTE-CAJA' : '💼 APORTE-BOLSILLO',
                date: m.movementDate,
                customerName: m.registeredBy || 'Edier',
                customerPhone: '',
                amount: m.amount,
                totalAmount: m.amount,
                pendingAmount: 0,
                flavor: m.concept,
                liters: 0,
                deliveryStatus: 'DEPOSITADO',
                paymentStatus: 'PAID',
                paymentMethod: m.paymentMethod || 'EFECTIVO',
                notes: m.notes,
                isCashMovement: true,
                movementType: m.type,
                category: m.type,
                categoryLabel: m.type === 'AJUSTE_SOBRANTE' ? '⚖️ Ajuste Sobrante (+)' : m.type === 'AJUSTE_CAJA' ? '⚖️ Ajuste de Caja' : '🏦 Base / Aporte',
                rawMovement: m,
              })),
            ...orders
              .filter((o) => o.paidAmount > 0)
              .flatMap((o) => {
                if (o.payments && o.payments.length > 0) {
                  return o.payments
                    .filter((p) => p.amount > 0)
                    .map((p) => ({
                      id: `order_pay_${p.id}`,
                      rawId: o.id,
                      paymentId: p.id,
                      orderNumber: o.orderNumber,
                      date: p.paymentDate || o.deliveryDate || o.orderDate,
                      customerName: o.customer?.fullName || 'Cliente',
                      customerPhone: o.customer?.phone || '',
                      amount: p.amount,
                      totalAmount: o.totalAmount,
                      pendingAmount: o.pendingAmount,
                      flavor: o.flavor,
                      liters: o.totalLiters,
                      deliveryStatus: o.deliveryStatus,
                      deliveryType: o.deliveryType,
                      deliveryFee: o.deliveryFee || 0,
                      paymentStatus: o.paymentStatus,
                      paymentMethod: p.paymentMethod || 'EFECTIVO',
                      notes: p.notes || o.notes,
                      isCashMovement: false,
                      movementType: 'VENTA',
                    }));
                }
                return [{
                  id: String(o.id),
                  rawId: o.id,
                  paymentId: null as number | null,
                  orderNumber: o.orderNumber,
                  date: o.deliveryDate || o.orderDate,
                  customerName: o.customer?.fullName || 'Cliente',
                  customerPhone: o.customer?.phone || '',
                  amount: o.paidAmount,
                  totalAmount: o.totalAmount,
                  pendingAmount: o.pendingAmount,
                  flavor: o.flavor,
                  liters: o.totalLiters,
                  deliveryStatus: o.deliveryStatus,
                  deliveryType: o.deliveryType,
                  deliveryFee: o.deliveryFee || 0,
                  paymentStatus: o.paymentStatus,
                  paymentMethod: o.paymentMethod || 'EFECTIVO',
                  notes: o.notes,
                  isCashMovement: false,
                  movementType: 'VENTA',
                }];
              }),
          ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          outflows: [
            ...purchases.map((p) => ({
              id: `purch_${p.id}`,
              rawId: p.id,
              date: p.purchaseDate,
              category: 'COMPRA_INSUMO',
              categoryLabel: '🥛 Compra Insumo',
              description: `${p.rawMaterial?.name || 'Insumo'} (${p.quantity} ${p.rawMaterial?.unit || 'und'})`,
              amount: p.totalCost,
              supplier: p.supplier || 'Proveedor local',
              paymentMethod: p.paymentMethod || 'EFECTIVO',
              notes: p.notes,
            })),
            ...expenses.map((e) => ({
              id: `exp_${e.id}`,
              rawId: e.id,
              date: e.expenseDate,
              category: 'GASTO_GENERAL',
              categoryLabel: `⚙️ ${e.category}`,
              description: e.description,
              amount: e.amount,
              notes: e.notes,
              registeredBy: e.registeredBy,
              paymentMethod: e.paymentMethod || 'EFECTIVO',
            })),
            ...payrollPayments.map((p) => ({
              id: `pay_${p.id}`,
              rawId: p.id,
              date: p.paymentDate,
              category: 'NOMINA',
              categoryLabel: '👥 Nómina',
              description: `${p.staff?.fullName || 'Personal'} - ${p.calculationDetails || 'Pago'}`,
              amount: p.netAmount,
              paymentMethod: p.paymentMethod || 'EFECTIVO',
              notes: p.notes,
            })),
            ...ownerDrawPayments.map((p) => ({
              id: `draw_${p.id}`,
              rawId: p.id,
              date: p.paymentDate,
              category: 'RETIRO_SOCIO',
              categoryLabel: '💼 Retiro Socio',
              description: `${p.staff?.fullName || 'Socio'} - ${p.calculationDetails || 'Retiro'}`,
              amount: p.netAmount,
              paymentMethod: p.paymentMethod || 'EFECTIVO',
              notes: p.notes,
            })),
            ...cashMovements
              .filter((m) => m.type === 'RETIRO_BASE' || m.type === 'AJUSTE_FALTANTE')
              .map((m) => ({
                id: `cash_ret_${m.id}`,
                rawId: m.id,
                date: m.movementDate,
                category: m.type,
                categoryLabel: m.type === 'AJUSTE_FALTANTE' ? '⚖️ Ajuste Faltante / 4x1000 (-)' : '🏦 Retiro de Base',
                description: `${m.concept} (${m.registeredBy || 'Edier'})`,
                amount: m.amount,
                notes: m.notes,
                paymentMethod: m.paymentMethod || 'EFECTIVO',
                isCashMovement: true,
                rawMovement: m,
              })),
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          transfers: cashMovements
            .filter((m) => m.type === 'TRASLADO_EFECTIVO_A_BANCO' || m.type === 'TRASLADO_BANCO_A_EFECTIVO')
            .map((m) => ({
              id: `cash_trans_${m.id}`,
              rawId: m.id,
              date: m.movementDate,
              type: m.type,
              category: 'TRASLADO',
              categoryLabel: m.type === 'TRASLADO_EFECTIVO_A_BANCO' ? '🔄 Efectivo ➔ Transferencia' : '🔄 Transferencia ➔ Efectivo',
              description: m.concept,
              amount: m.amount,
              paymentMethod: m.type === 'TRASLADO_EFECTIVO_A_BANCO' ? 'EFECTIVO ➔ TRANSFERENCIA' : 'TRANSFERENCIA ➔ EFECTIVO',
              notes: m.notes,
              registeredBy: m.registeredBy || 'Edier',
              isCashMovement: true,
              rawMovement: m,
            })),
        },
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
          partnerDischarges,
          dischargesSummary: {
            totalPartnerLiters: totalPartnerDischargedLiters,
            totalPartnerAmount: totalPartnerDischargedAmount,
            totalAllDischargedLiters,
            dischargesCount: partnerDischarges.length,
          },
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
      creditSummary: {
        totalRemainingDebt: activeCreditObligations.reduce((sum, c) => sum + c.remainingBalance, 0),
        activeCreditsCount: activeCreditObligations.length,
        activeCredits: activeCreditObligations,
      },
      recentOrders: orders.slice(0, 8),
      periodOrders: orders,
      inventorySummary: rawMaterials,
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen del dashboard' });
  }
};
