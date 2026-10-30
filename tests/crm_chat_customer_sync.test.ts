import { describe, it, expect, afterAll } from 'vitest';
import prisma from '../src/prisma.js';
import { createOrUpdateCustomer } from '../src/modules/customers/customers.service.js';

describe('T1: Autovinculación preventiva de chats huérfanos al registrar/actualizar clientes', () => {
  const createdCustomerIds: number[] = [];
  const createdConversationIds: number[] = [];

  afterAll(async () => {
    // Limpieza
    if (createdConversationIds.length > 0) {
      await prisma.chatMessage.deleteMany({
        where: { conversationId: { in: createdConversationIds } },
      });
      await prisma.chatConversation.deleteMany({
        where: { id: { in: createdConversationIds } },
      });
    }
    if (createdCustomerIds.length > 0) {
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } },
      });
    }
  });

  it('debe vincular automáticamente una conversación huérfana al crear un cliente por número telefónico (10 dígitos)', async () => {
    const testPhone10 = `300${Date.now().toString().slice(-7)}`;
    const fullJid = `57${testPhone10}@s.whatsapp.net`;

    // 1. Crear conversación huérfana previa (como si WhatsApp hubiera recibido mensaje entrante)
    const orphanConv = await prisma.chatConversation.create({
      data: {
        remoteJid: fullJid,
        phoneNumber: `57${testPhone10}`,
        contactName: 'Contacto Desconocido',
        lastMessageText: 'Hola YogurArte, quiero cotizar',
        lastMessageTimestamp: new Date(),
        customerId: null,
      },
    });
    createdConversationIds.push(orphanConv.id);

    // 2. Crear cliente desde el sistema con el formato local de 10 dígitos
    const customer = await createOrUpdateCustomer({
      fullName: 'Cliente Autovinculado Test',
      phone: testPhone10,
      address: 'Calle 10 # 5-20, Fonseca',
    });
    createdCustomerIds.push(customer.id);

    // 3. Verificar que la conversación ahora tiene customerId asignado
    const updatedConv = await prisma.chatConversation.findUnique({
      where: { id: orphanConv.id },
    });

    expect(updatedConv).not.toBeNull();
    expect(updatedConv?.customerId).toBe(customer.id);
  });

  it('debe vincular automáticamente una conversación huérfana al crear un cliente por nombre de usuario (@usuario)', async () => {
    const randomUser = `user_${Date.now().toString().slice(-6)}`;

    // 1. Crear conversación previa con pushName o username en el contacto
    const orphanConv = await prisma.chatConversation.create({
      data: {
        remoteJid: `${Date.now().toString().slice(-8)}@lid`,
        phoneNumber: `${Date.now().toString().slice(-8)}`,
        contactName: randomUser,
        lastMessageText: 'Hola desde mi cuenta de WhatsApp',
        lastMessageTimestamp: new Date(),
        customerId: null,
      },
    });
    createdConversationIds.push(orphanConv.id);

    // 2. Crear cliente registrado como @usuario
    const customer = await createOrUpdateCustomer({
      fullName: 'Usuario Instagram / WhatsApp',
      phone: `@${randomUser}`,
      address: 'Fonseca',
    });
    createdCustomerIds.push(customer.id);

    // 3. Verificar vinculación
    const updatedConv = await prisma.chatConversation.findUnique({
      where: { id: orphanConv.id },
    });

    expect(updatedConv).not.toBeNull();
    expect(updatedConv?.customerId).toBe(customer.id);
  });
});
