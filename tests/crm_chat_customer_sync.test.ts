import { describe, it, expect, afterAll } from 'vitest';
import prisma from '../src/prisma.js';
import { createOrUpdateCustomer } from '../src/modules/customers/customers.service.js';
import { whatsappService } from '../src/services/whatsapp.service.js';

describe('T1 & T2: Sincronización y prevención de bifurcación de chats', () => {
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

  it('T1: debe vincular automáticamente una conversación huérfana al crear un cliente por número telefónico (10 dígitos)', async () => {
    const testPhone10 = `300${Date.now().toString().slice(-7)}`;
    const fullJid = `57${testPhone10}@s.whatsapp.net`;

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

    const customer = await createOrUpdateCustomer({
      fullName: 'Cliente Autovinculado Test',
      phone: testPhone10,
      address: 'Calle 10 # 5-20, Fonseca',
    });
    createdCustomerIds.push(customer.id);

    const updatedConv = await prisma.chatConversation.findUnique({
      where: { id: orphanConv.id },
    });

    expect(updatedConv).not.toBeNull();
    expect(updatedConv?.customerId).toBe(customer.id);
  });

  it('T1: debe vincular automáticamente una conversación huérfana al crear un cliente por nombre de usuario (@usuario)', async () => {
    const randomUser = `user_${Date.now().toString().slice(-6)}`;

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

    const customer = await createOrUpdateCustomer({
      fullName: 'Usuario Instagram / WhatsApp',
      phone: `@${randomUser}`,
      address: 'Fonseca',
    });
    createdCustomerIds.push(customer.id);

    const updatedConv = await prisma.chatConversation.findUnique({
      where: { id: orphanConv.id },
    });

    expect(updatedConv).not.toBeNull();
    expect(updatedConv?.customerId).toBe(customer.id);
  });

  it('T2: debe reutilizar la conversación existente del cliente y NO crear un segundo chat bifurcado al enviar mensaje', async () => {
    const phoneDigits = `311${Date.now().toString().slice(-7)}`;
    const lidJid = `${Date.now().toString().slice(-9)}@lid`;

    // 1. Cliente registrado en el sistema
    const customer = await prisma.customer.create({
      data: {
        fullName: 'Carlos Anti Bifurcación',
        phone: phoneDigits,
        address: 'Fonseca, La Guajira',
      },
    });
    createdCustomerIds.push(customer.id);

    // 2. Chat previo existente para este cliente (incluso con LID o número alternativo)
    const existingChat = await prisma.chatConversation.create({
      data: {
        remoteJid: lidJid,
        phoneNumber: phoneDigits,
        contactName: 'Carlos Anti Bifurcación',
        lastMessageText: 'Mensaje previo del cliente',
        lastMessageTimestamp: new Date(Date.now() - 60000),
        customerId: customer.id,
      },
    });
    createdConversationIds.push(existingChat.id);

    // 3. Simular despacho de mensaje predeterminado a su número canónico
    const canonicalJid = `57${phoneDigits}@s.whatsapp.net`;
    const resolvedConv = await whatsappService.resolveOrCreateConversationForOutgoing(
      canonicalJid,
      `57${phoneDigits}`,
      '🥛 ¡Hola Carlos! Tu pedido ha sido confirmado con éxito.',
      customer.fullName,
      customer.id
    );

    // 4. Debe reutilizar existingChat.id y NO crear una segunda fila
    expect(resolvedConv.id).toBe(existingChat.id);
    expect(resolvedConv.lastMessageText).toContain('Tu pedido ha sido confirmado');

    const totalChatsForCustomer = await prisma.chatConversation.count({
      where: { customerId: customer.id },
    });
    expect(totalChatsForCustomer).toBe(1);
  });

  it('T3: resolveRecipientJid debe resolver el JID canónico para cliente con @usuario si posee conversación', async () => {
    const randomUser = `ana_${Date.now().toString().slice(-6)}`;
    const phoneJid = `57300${Date.now().toString().slice(-7)}@s.whatsapp.net`;

    const customer = await prisma.customer.create({
      data: {
        fullName: 'Ana Yogur Especial',
        phone: `@${randomUser}`,
        address: 'Fonseca',
      },
    });
    createdCustomerIds.push(customer.id);

    const chat = await prisma.chatConversation.create({
      data: {
        remoteJid: phoneJid,
        phoneNumber: phoneJid.split('@')[0],
        contactName: 'Ana Yogur Especial',
        customerId: customer.id,
      },
    });
    createdConversationIds.push(chat.id);

    const { resolveRecipientJid } = await import('../src/modules/crm/crm.service.js');

    // Con customerId
    const resolvedWithId = await resolveRecipientJid(`@${randomUser}`, customer.id);
    expect(resolvedWithId).toBe(phoneJid);

    // Sin customerId (búsqueda inversa por @usuario)
    const resolvedWithoutId = await resolveRecipientJid(`@${randomUser}`);
    expect(resolvedWithoutId).toBe(phoneJid);
  });

  it('T3: mergeChats debe consolidar bidireccionalmente hilos y mensajes para clientes con @usuario', async () => {
    const randomUser = `felipe_${Date.now().toString().slice(-6)}`;
    const jid1 = `${Date.now().toString().slice(-8)}@lid`;
    const jid2 = `57315${Date.now().toString().slice(-7)}@s.whatsapp.net`;

    const customer = await prisma.customer.create({
      data: {
        fullName: 'Felipe Usuario',
        phone: `@${randomUser}`,
        address: 'Fonseca',
      },
    });
    createdCustomerIds.push(customer.id);

    // Chat 1: entrante original huérfano con LID
    const chat1 = await prisma.chatConversation.create({
      data: {
        remoteJid: jid1,
        phoneNumber: jid1.split('@')[0],
        contactName: randomUser,
        customerId: null,
      },
    });
    createdConversationIds.push(chat1.id);

    // Chat 2: vinculado al cliente con su número
    const chat2 = await prisma.chatConversation.create({
      data: {
        remoteJid: jid2,
        phoneNumber: jid2.split('@')[0],
        contactName: 'Felipe Usuario',
        customerId: customer.id,
      },
    });
    createdConversationIds.push(chat2.id);

    // Mensajes en ambos chats
    const msg1 = await prisma.chatMessage.create({
      data: {
        conversationId: chat1.id,
        messageId: `MSG1-${Date.now()}`,
        text: 'Mensaje del chat 1',
      },
    });
    const msg2 = await prisma.chatMessage.create({
      data: {
        conversationId: chat2.id,
        messageId: `MSG2-${Date.now()}`,
        text: 'Mensaje del chat 2',
      },
    });

    const { mergeChats } = await import('../src/modules/crm/crm.service.js');
    const result = await mergeChats({
      sourceChatId: chat1.id,
      targetClientId: customer.id,
    });

    expect(result).toHaveProperty('id');
    expect(result.id).toBe(chat2.id);

    // Chat 1 debe haber sido eliminado
    const deletedChat = await prisma.chatConversation.findUnique({
      where: { id: chat1.id },
    });
    expect(deletedChat).toBeNull();

    // Mensajes de chat 1 deben haber sido transferidos al chat canónico (chat2)
    const transferredMsg1 = await prisma.chatMessage.findUnique({
      where: { id: msg1.id },
    });
    expect(transferredMsg1?.conversationId).toBe(chat2.id);
  });
});
