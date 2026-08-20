import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getCredits = async (req: Request, res: Response) => {
  try {
    const credits = await prisma.creditObligation.findMany({
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVO first
        { nextDueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const activeCredits = credits.filter((c) => c.status === 'ACTIVO');
    const totalRemainingBalance = activeCredits.reduce((sum, c) => sum + c.remainingBalance, 0);
    const totalDebtFinanced = credits.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalPaidSoFar = credits.reduce((sum, c) => sum + (c.totalAmount - c.remainingBalance), 0);

    res.json({
      totalRemainingBalance,
      totalDebtFinanced,
      totalPaidSoFar,
      activeCount: activeCredits.length,
      totalCount: credits.length,
      credits,
    });
  } catch (error) {
    console.error('Error fetching credit obligations:', error);
    res.status(500).json({ error: 'Error al obtener créditos y compras a cuotas' });
  }
};

export const createCredit = async (req: Request, res: Response) => {
  try {
    const {
      title,
      category,
      creditor,
      principalAmount,
      interestRate,
      initialPayment,
      initialPaymentMethod,
      paymentType,
      frequency,
      installmentAmount,
      totalInstallments,
      startDate,
      nextDueDate,
      notes,
      registeredBy,
    } = req.body;

    const parsedPrincipal = Number(principalAmount);
    if (!title || !creditor || isNaN(parsedPrincipal) || parsedPrincipal <= 0) {
      return res.status(400).json({ error: 'El nombre del bien, acreedor y valor base son requeridos' });
    }

    const parsedInterestRate = Number(interestRate) || 0;
    const interestAmount = parsedPrincipal * (parsedInterestRate / 100);
    const totalAmount = parsedPrincipal + interestAmount;

    const parsedInitial = Number(initialPayment) || 0;
    const remainingBalance = Math.max(0, totalAmount - parsedInitial);

    const parsedTotalInstallments = totalInstallments ? Number(totalInstallments) : null;
    let parsedInstallmentAmount = Number(installmentAmount) || 0;

    if (parsedTotalInstallments && parsedTotalInstallments > 0 && parsedInstallmentAmount <= 0) {
      parsedInstallmentAmount = Math.round(remainingBalance / parsedTotalInstallments);
    }

    const status = remainingBalance <= 0 ? 'PAGADO_TOTAL' : 'ACTIVO';
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedNextDueDate = nextDueDate ? new Date(nextDueDate) : null;

    const credit = await prisma.creditObligation.create({
      data: {
        title: title.trim(),
        category: category || 'EQUIPO_MAQUINARIA',
        creditor: creditor.trim(),
        principalAmount: parsedPrincipal,
        interestRate: parsedInterestRate,
        totalAmount,
        initialPayment: parsedInitial,
        remainingBalance,
        paymentType: paymentType || 'CUOTAS_FIJAS',
        frequency: frequency || 'MENSUAL',
        installmentAmount: parsedInstallmentAmount,
        totalInstallments: parsedTotalInstallments,
        paidInstallments: parsedInitial > 0 ? 1 : 0,
        startDate: parsedStartDate,
        nextDueDate: parsedNextDueDate,
        status,
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
      },
    });

    // Si hubo cuota inicial, registrar el pago y el egreso en caja
    if (parsedInitial > 0) {
      const payMethod = initialPaymentMethod ? initialPaymentMethod.trim() : 'EFECTIVO';

      await prisma.creditPayment.create({
        data: {
          creditId: credit.id,
          actionType: 'CUOTA_INICIAL',
          amount: parsedInitial,
          paymentDate: parsedStartDate,
          paymentMethod: payMethod,
          installmentNumber: 0,
          justification: 'Pago de cuota inicial de contado',
          registeredBy: registeredBy || 'Edier',
        },
      });

      await prisma.expense.create({
        data: {
          category: 'INFRAESTRUCTURA',
          description: `Cuota Inicial: ${credit.title} (${credit.creditor})`,
          amount: parsedInitial,
          expenseDate: parsedStartDate,
          paymentMethod: payMethod,
          notes: `Compra a crédito #${credit.id}`,
          registeredBy: registeredBy || 'Edier',
        },
      });
    }

    const fullCredit = await prisma.creditObligation.findUnique({
      where: { id: credit.id },
      include: { payments: true },
    });

    res.status(201).json(fullCredit);
  } catch (error) {
    console.error('Error creating credit obligation:', error);
    res.status(500).json({ error: 'Error al registrar compra a crédito' });
  }
};

export const payCreditInstallment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      amount,
      paymentDate,
      paymentMethod,
      installmentNumber,
      receiptNumber,
      justification,
      nextDueDate,
      registeredBy,
    } = req.body;

    const creditId = Number(id);
    const credit = await prisma.creditObligation.findUnique({
      where: { id: creditId },
    });

    if (!credit) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Ingresa un monto de pago válido' });
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const payMethod = paymentMethod ? paymentMethod.trim() : 'EFECTIVO';
    const newRemaining = Math.max(0, credit.remainingBalance - parsedAmount);
    const newPaidCount = credit.paidInstallments + 1;
    const newStatus = newRemaining <= 0 ? 'PAGADO_TOTAL' : 'ACTIVO';
    const newNextDue = nextDueDate ? new Date(nextDueDate) : credit.nextDueDate;

    const [payment, updatedCredit] = await prisma.$transaction([
      prisma.creditPayment.create({
        data: {
          creditId,
          actionType: credit.paymentType === 'ABONOS_LIBRES' ? 'ABONO_EXTRAORDINARIO' : 'PAGO_CUOTA',
          amount: parsedAmount,
          paymentDate: payDate,
          paymentMethod: payMethod,
          installmentNumber: installmentNumber ? Number(installmentNumber) : newPaidCount,
          receiptNumber: receiptNumber ? receiptNumber.trim() : null,
          justification: justification ? justification.trim() : `Abono de cuota a ${credit.title}`,
          registeredBy: registeredBy || 'Edier',
        },
      }),
      prisma.creditObligation.update({
        where: { id: creditId },
        data: {
          remainingBalance: newRemaining,
          paidInstallments: newPaidCount,
          status: newStatus,
          nextDueDate: newStatus === 'PAGADO_TOTAL' ? null : newNextDue,
        },
        include: { payments: { orderBy: { paymentDate: 'desc' } } },
      }),
      prisma.expense.create({
        data: {
          category: 'INFRAESTRUCTURA',
          description: `Cuota ${newPaidCount}: ${credit.title} (${credit.creditor})`,
          amount: parsedAmount,
          expenseDate: payDate,
          paymentMethod: payMethod,
          notes: receiptNumber ? `Comprobante: ${receiptNumber}` : `Abono a crédito #${credit.id}`,
          registeredBy: registeredBy || 'Edier',
        },
      }),
    ]);

    res.json({
      message: newStatus === 'PAGADO_TOTAL' ? '¡Felicitaciones! Crédito pagado en su totalidad 🎉' : 'Abono registrado con éxito',
      payment,
      credit: updatedCredit,
    });
  } catch (error) {
    console.error('Error paying credit installment:', error);
    res.status(500).json({ error: 'Error al registrar abono de cuota' });
  }
};

export const skipCreditInstallment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { justification, newNextDueDate, registeredBy } = req.body;

    const creditId = Number(id);
    const credit = await prisma.creditObligation.findUnique({
      where: { id: creditId },
    });

    if (!credit) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    if (!justification || !justification.trim()) {
      return res.status(400).json({ error: 'Debes ingresar el motivo o justificación del aplazamiento' });
    }

    if (!newNextDueDate) {
      return res.status(400).json({ error: 'Debes seleccionar la nueva fecha reprogramada para la cuota' });
    }

    const payDate = new Date();
    const parsedNewNextDue = new Date(newNextDueDate);

    const [payment, updatedCredit] = await prisma.$transaction([
      prisma.creditPayment.create({
        data: {
          creditId,
          actionType: 'CUOTA_OMITIDA_APLAZADA',
          amount: 0,
          paymentDate: payDate,
          paymentMethod: 'NO_APLICA',
          justification: justification.trim(),
          registeredBy: registeredBy || 'Edier',
        },
      }),
      prisma.creditObligation.update({
        where: { id: creditId },
        data: {
          nextDueDate: parsedNewNextDue,
        },
        include: { payments: { orderBy: { paymentDate: 'desc' } } },
      }),
    ]);

    res.json({
      message: 'Cuota aplazada y reprogramada con éxito ⏭️',
      payment,
      credit: updatedCredit,
    });
  } catch (error) {
    console.error('Error skipping credit installment:', error);
    res.status(500).json({ error: 'Error al aplazar cuota' });
  }
};

export const deleteCredit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const creditId = Number(id);

    await prisma.creditObligation.delete({
      where: { id: creditId },
    });

    res.json({ message: 'Crédito eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting credit obligation:', error);
    res.status(500).json({ error: 'Error al eliminar crédito' });
  }
};
