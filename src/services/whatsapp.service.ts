import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  WASocket,
  WAMessage,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import prisma from '../prisma.js';
import { usePrismaAuthState, clearPrismaAuthSession } from './whatsappAuth.service.js';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

class WhatsAppService {
  private sock: WASocket | null = null;
  public io: SocketIOServer | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private isInitializing: boolean = false;
  private reconnectAttempts: number = 0;

  constructor() {}

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  public emitSocket(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  public getStatus() {
    if (!this.sock && !this.isInitializing && this.status === 'DISCONNECTED') {
      this.init().catch((err) => console.error('Error auto-init WhatsApp:', err));
    }
    return {
      status: this.status,
      qr: this.qrCodeDataUrl,
      user: this.sock?.user || null,
      phoneNumber: this.sock?.user?.id ? this.sock.user.id.split(':')[0] : null,
    };
  }

  public async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.status = 'CONNECTING';
    this.broadcastStatus();

    try {
      // Carga de sesión persistente desde Neon PostgreSQL
      const { state, saveCreds } = await usePrismaAuthState('main');
      let version: [number, number, number] = [2, 3000, 1043857760];
      try {
        const vRes = await fetchLatestBaileysVersion();
        if (vRes?.version) version = vRes.version;
      } catch (vErr) {
        console.warn('Usando versión Baileys de respaldo:', vErr);
      }

      console.log(`📱 Iniciando WhatsApp Baileys v${version.join('.')} con persistencia en Neon DB`);

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        browser: Browsers.ubuntu('Chrome'),
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 320,
              color: {
                dark: '#2E1065',
                light: '#FFFFFF',
              },
            });
            this.status = 'CONNECTING';
            this.broadcastStatus();
            console.log('📷 Código QR de WhatsApp generado y listo para escanear');
          } catch (qrErr) {
            console.error('Error generando DataURL del código QR:', qrErr);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`⚠️ Conexión de WhatsApp cerrada. Código: ${statusCode}. Reconectar: ${shouldReconnect}`);
          this.status = 'DISCONNECTED';
          this.qrCodeDataUrl = null;
          this.broadcastStatus();

          if (statusCode === DisconnectReason.loggedOut) {
            console.log('🚪 Sesión cerrada por el usuario. Limpiando credenciales de Neon DB...');
            await this.clearAuthData();
            this.isInitializing = false;
            setTimeout(() => this.init(), 2000);
          } else if (shouldReconnect) {
            this.reconnectAttempts++;
            const delay = Math.min(10000, 2000 * this.reconnectAttempts);
            console.log(`🔄 Reintentando conexión a WhatsApp en ${delay / 1000}s (Intento ${this.reconnectAttempts})...`);
            this.isInitializing = false;
            setTimeout(() => this.init(), delay);
          } else {
            this.isInitializing = false;
          }
        } else if (connection === 'open') {
          console.log(`✅ ¡WhatsApp de YogurArte conectado exitosamente! Usuario: ${this.sock?.user?.id}`);
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.reconnectAttempts = 0;
          this.isInitializing = false;
          this.broadcastStatus();

          // Limpiar/unificar chats duplicados por LID
          this.mergeDuplicateConversations().catch((e) => console.warn('Aviso merge chats:', e));
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        try {
          // Procesar mensajes tanto 'notify' (entrantes) como 'append' (enviados desde el teléfono WhatsApp Business)
          for (const msg of m.messages) {
            await this.processIncomingMessage(msg);
          }
        } catch (err) {
          console.error('Error procesando mensajes upsert de Baileys:', err);
        }
      });

    } catch (error) {
      console.error('Error al inicializar el servicio de WhatsApp:', error);
      this.status = 'DISCONNECTED';
      this.isInitializing = false;
      this.broadcastStatus();
    }
  }

  private broadcastStatus() {
    if (this.io) {
      this.io.emit('whatsapp:status', this.getStatus());
    }
  }

  private async clearAuthData() {
    await clearPrismaAuthSession('main');
  }

  public async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (e) {
      console.warn('Aviso al cerrar socket de WhatsApp:', e);
    }
    await this.clearAuthData();
    this.status = 'DISCONNECTED';
    this.qrCodeDataUrl = null;
    this.sock = null;
    this.isInitializing = false;
    this.broadcastStatus();

    setTimeout(() => this.init(), 1500);
    return { success: true, message: 'Sesión de WhatsApp cerrada' };
  }

  public async refreshQR() {
    try {
      if (this.sock) {
        try {
          this.sock.end(undefined);
        } catch (e) {}
      }
    } catch (e) {}

    // Limpiar claves incompletas previas si se fuerza nuevo QR
    if (this.status !== 'CONNECTED') {
      await this.clearAuthData();
    }

    this.status = 'CONNECTING';
    this.qrCodeDataUrl = null;
    this.sock = null;
    this.isInitializing = false;
    this.broadcastStatus();
    await this.init();
    return this.getStatus();
  }

  /**
   * Guarda un buffer de medios de WhatsApp en el almacenamiento estático en disco para carga instantánea
   */
  private async saveMediaBuffer(messageId: string, ext: string, buffer: Buffer): Promise<string> {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat-media');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const safeId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeId}.${ext}`;
      const filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, buffer);
      return `/uploads/chat-media/${filename}`;
    } catch (e) {
      console.warn('Aviso: guardando en Base64 por error al escribir archivo:', e);
      let mime = 'image/jpeg';
      if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'ogg') mime = 'audio/ogg';
      else if (ext === 'm4a') mime = 'audio/mp4';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }
  }

  /**
   * Procesa un mensaje entrante o saliente de WhatsApp
   */
  private async processIncomingMessage(msg: WAMessage) {
    if (!msg.message) return;
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid.includes('@broadcast') || remoteJid.includes('status@broadcast')) {
      return;
    }

    const fromMe = Boolean(msg.key.fromMe);
    const messageId = msg.key.id || `MSG-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const pushName = msg.pushName || null;

    let text = '';
    let messageType = 'TEXT';
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;

    if (msg.message.conversation) {
      text = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      text = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage) {
      messageType = 'IMAGE';
      text = msg.message.imageMessage.caption || '📷 Imagen';
      mediaMimeType = 'image/jpeg';
      try {
        if (this.sock) {
          const buffer = (await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
              logger: pino({ level: 'silent' }),
              reuploadRequest: this.sock.updateMediaMessage,
            }
          )) as Buffer;
          if (buffer) {
            mediaUrl = await this.saveMediaBuffer(messageId, 'jpg', buffer);
          }
        }
      } catch (err) {
        console.warn('Aviso: no se pudo descargar imagen:', err);
      }
    } else if (msg.message.stickerMessage) {
      messageType = 'STICKER';
      text = '✨ Sticker';
      mediaMimeType = 'image/webp';
      try {
        if (this.sock) {
          const buffer = (await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
              logger: pino({ level: 'silent' }),
              reuploadRequest: this.sock.updateMediaMessage,
            }
          )) as Buffer;
          if (buffer) {
            // Opción B: Persistencia directa en Base64 para stickers (15-50 KB) para que no dependan del disco efímero de Render
            if (buffer.length <= 120 * 1024) {
              mediaUrl = `data:image/webp;base64,${buffer.toString('base64')}`;
            } else {
              mediaUrl = await this.saveMediaBuffer(messageId, 'webp', buffer);
            }
          }
        }
      } catch (err) {
        console.warn('Aviso: no se pudo descargar sticker:', err);
      }
    } else if (msg.message.audioMessage) {
      messageType = 'AUDIO';
      text = '🎵 Nota de voz / Audio';
      mediaMimeType = msg.message.audioMessage.mimetype || 'audio/ogg; codecs=opus';
      const ext = mediaMimeType.includes('mp4') ? 'm4a' : 'ogg';
      try {
        if (this.sock) {
          const buffer = (await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
              logger: pino({ level: 'silent' }),
              reuploadRequest: this.sock.updateMediaMessage,
            }
          )) as Buffer;
          if (buffer) {
            mediaUrl = await this.saveMediaBuffer(messageId, ext, buffer);
          }
        }
      } catch (err) {
        console.warn('Aviso: no se pudo descargar nota de voz:', err);
      }
    } else if (msg.message.videoMessage) {
      messageType = 'VIDEO';
      text = msg.message.videoMessage.caption || '🎥 Video';
    } else if (msg.message.documentMessage) {
      messageType = 'DOCUMENT';
      text = msg.message.documentMessage.fileName || '📄 Documento';
    } else if (msg.message.locationMessage) {
      messageType = 'LOCATION';
      text = '📍 Ubicación';
    } else if (msg.message.contactMessage) {
      messageType = 'CONTACT';
      text = '👤 Contacto';
    }

    if (!text && messageType === 'TEXT' && !mediaUrl) {
      return;
    }

    const messageDate = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000)
      : new Date();

    const rawNumber = remoteJid.split('@')[0];
    const cleanNumber = rawNumber.replace(/\D/g, '');
    const isLid = remoteJid.endsWith('@lid');

    // 1. Buscar si ya existe una conversación exactamente con este remoteJid
    let conversation = await prisma.chatConversation.findUnique({
      where: { remoteJid },
      include: { customer: true },
    });

    // 2. Si es un LID, intentar resolver el número de teléfono real usando el mapeo que Baileys guarda en WhatsAppAuthSession
    let mappedPhoneNumber: string | null = null;
    if (isLid) {
      try {
        const lidRecord = await prisma.whatsAppAuthSession.findUnique({
          where: { id: `main:lid-mapping-${cleanNumber}_reverse` },
        });
        if (lidRecord && lidRecord.value) {
          const parsed = JSON.parse(lidRecord.value);
          if (parsed && typeof parsed === 'string') {
            mappedPhoneNumber = parsed.replace(/\D/g, '');
          }
        }
      } catch (e) {
        console.warn('Aviso: error al buscar lid-mapping en BD:', e);
      }
    }

    // 3. Si el mensaje cita/responde a un mensaje previo (quoted message), encontrar la conversación original
    if (!conversation) {
      const contextInfo =
        (msg.message as any)?.extendedTextMessage?.contextInfo ||
        (msg.message as any)?.imageMessage?.contextInfo ||
        (msg.message as any)?.audioMessage?.contextInfo ||
        (msg.message as any)?.videoMessage?.contextInfo ||
        (msg.message as any)?.documentMessage?.contextInfo ||
        (msg.message as any)?.stickerMessage?.contextInfo;

      if (contextInfo?.stanzaId) {
        const quotedMsg = await prisma.chatMessage.findUnique({
          where: { messageId: contextInfo.stanzaId },
          include: { conversation: { include: { customer: true } } },
        });
        if (quotedMsg?.conversation) {
          conversation = quotedMsg.conversation;
        }
      }
    }

    // 4. Si aún no hay conversación, intentar identificar al cliente
    let matchingCustomer: any = conversation?.customer || null;

    // A. Buscar por número telefónico mapeado o directo (si no es LID o si se resolvió el LID)
    const phoneToSearch = mappedPhoneNumber || (!isLid ? cleanNumber : null);
    if (!matchingCustomer && phoneToSearch && phoneToSearch.length >= 7) {
      const last10 = phoneToSearch.slice(-10);
      matchingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: phoneToSearch },
            { phone: last10 },
            { phone: { contains: last10 } },
          ],
        },
      });
    }

    // B. Si no, buscar por saludo en plantilla (ej: "Hola *Augusto*")
    if (!matchingCustomer && text) {
      const greetingMatch = text.match(/Hola\s+\*?([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,35}?)\*?[,!\n]/i);
      if (greetingMatch && greetingMatch[1]) {
        const potentialName = greetingMatch[1].trim();
        matchingCustomer = await prisma.customer.findFirst({
          where: {
            fullName: { contains: potentialName, mode: 'insensitive' },
          },
        });
      }
    }

    // C. Si es mensaje entrante y tenemos pushName, buscar por palabras del pushName (ej: "AugustoMejia" -> "Augusto")
    if (!matchingCustomer && !fromMe && pushName && pushName.trim().length >= 3) {
      const cleanPush = pushName.trim();
      const pushWords = cleanPush
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[\s_-]+/)
        .filter((w) => w.length >= 3);

      matchingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { fullName: { contains: cleanPush, mode: 'insensitive' } },
            ...pushWords.map((w) => ({ fullName: { contains: w, mode: 'insensitive' as const } })),
          ],
        },
      });

      if (!matchingCustomer) {
        const allCusts = await prisma.customer.findMany({
          where: { isActive: true },
          select: { id: true, fullName: true, phone: true, address: true },
        });
        const cleanPushLower = cleanPush.toLowerCase();
        matchingCustomer = allCusts.find((c) => {
          const fn = c.fullName.toLowerCase().trim();
          return fn.length >= 3 && cleanPushLower.includes(fn);
        });
      }
    }

    // 5. Si encontramos un cliente o un teléfono pero no teníamos conversación por remoteJid exacto,
    // buscar si ya existe una conversación previa para este cliente o teléfono
    if (!conversation && (matchingCustomer || phoneToSearch)) {
      const existingConv = await prisma.chatConversation.findFirst({
        where: {
          OR: [
            ...(matchingCustomer ? [{ customerId: matchingCustomer.id }] : []),
            ...(phoneToSearch ? [{ phoneNumber: phoneToSearch }] : []),
            ...(phoneToSearch ? [{ remoteJid: `${phoneToSearch}@s.whatsapp.net` }] : []),
          ],
        },
        include: { customer: true },
      });

      if (existingConv) {
        conversation = existingConv;
      }
    }

    // 6. Determinar nombre de contacto y teléfono de forma segura
    let contactName = matchingCustomer?.fullName || conversation?.contactName;
    if (!contactName) {
      if (!fromMe && pushName) {
        contactName = pushName;
      } else if (phoneToSearch) {
        contactName = phoneToSearch;
      } else {
        contactName = `Chat WhatsApp (${cleanNumber.slice(-4)})`;
      }
    }

    const effectivePhone =
      matchingCustomer?.phone?.replace(/\D/g, '') ||
      phoneToSearch ||
      conversation?.phoneNumber ||
      cleanNumber;

    // 7. Crear o actualizar conversación
    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          remoteJid,
          phoneNumber: effectivePhone,
          contactName,
          unreadCount: fromMe ? 0 : 1,
          lastMessageText: text || (messageType === 'STICKER' ? '✨ Sticker' : '📷 Imagen'),
          lastMessageTimestamp: messageDate,
          lastMessageFromMe: fromMe,
          customerId: matchingCustomer?.id || null,
        },
        include: { customer: true },
      });
    } else {
      const shouldUpdateJid = isLid && !conversation.remoteJid.includes('@lid');

      conversation = await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
          remoteJid: shouldUpdateJid ? remoteJid : conversation.remoteJid,
          phoneNumber: effectivePhone,
          contactName: (!conversation.customerId && matchingCustomer)
            ? matchingCustomer.fullName
            : conversation.contactName,
          customerId: conversation.customerId || matchingCustomer?.id || null,
          lastMessageText: text || (messageType === 'STICKER' ? '✨ Sticker' : '📷 Imagen'),
          lastMessageTimestamp: messageDate,
          lastMessageFromMe: fromMe,
          unreadCount: fromMe ? conversation.unreadCount : conversation.unreadCount + 1,
        },
        include: { customer: true },
      });
    }

    // Guardar el mensaje
    const existingMsg = await prisma.chatMessage.findUnique({
      where: { messageId },
    });

    let savedMessage = existingMsg;
    if (!existingMsg) {
      savedMessage = await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          messageId,
          fromMe,
          senderName: fromMe ? 'YogurArte' : (pushName || conversation.contactName || 'Cliente'),
          messageType,
          text,
          mediaUrl,
          mediaMimeType,
          status: fromMe ? 'SENT' : 'DELIVERED',
          timestamp: messageDate,
        },
      });

      if (this.io && savedMessage) {
        this.io.emit('whatsapp:message', {
          conversation,
          message: savedMessage,
        });
      }
    } else if (mediaUrl && !existingMsg.mediaUrl) {
      savedMessage = await prisma.chatMessage.update({
        where: { id: existingMsg.id },
        data: { mediaUrl, mediaMimeType },
      });
      if (this.io) {
        this.io.emit('whatsapp:media_updated', {
          messageId,
          mediaUrl,
          mediaMimeType,
        });
      }
    }
  }

  /**
   * Envía un mensaje saliente a través de WhatsApp
   */
  public async sendMessage(remoteJid: string, text: string, optionalName?: string, optionalCustomerId?: number) {
    if (!this.sock || this.status !== 'CONNECTED') {
      throw new Error('WhatsApp no está conectado actualmente. Por favor escanea el código QR.');
    }

    let cleanJid = remoteJid.trim();
    if (!cleanJid.includes('@')) {
      let rawDigits = cleanJid.replace(/\D/g, '');
      if (rawDigits.length === 10 && rawDigits.startsWith('3')) {
        rawDigits = `57${rawDigits}`;
      }
      cleanJid = `${rawDigits}@s.whatsapp.net`;
    } else if (!cleanJid.endsWith('@s.whatsapp.net') && !cleanJid.endsWith('@lid') && !cleanJid.endsWith('@g.us')) {
      let rawDigits = cleanJid.replace(/\D/g, '');
      if (rawDigits.length >= 7) {
        if (rawDigits.length === 10 && rawDigits.startsWith('3')) {
          rawDigits = `57${rawDigits}`;
        }
        cleanJid = `${rawDigits}@s.whatsapp.net`;
      } else {
        throw new Error(`El destinatario "${remoteJid}" no corresponde a un JID o número de WhatsApp válido`);
      }
    }
    const cleanNumber = cleanJid.split('@')[0].replace(/\D/g, '');

    const sentMsg = await this.sock.sendMessage(cleanJid, { text: text.trim() });
    const messageId = sentMsg?.key?.id || `OUT-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    let conversation = await prisma.chatConversation.findUnique({
      where: { remoteJid: cleanJid },
      include: { customer: true },
    });

    if (!conversation) {
      const last10 = cleanNumber.slice(-10);
      const matchingCustomer = optionalCustomerId
        ? await prisma.customer.findUnique({ where: { id: optionalCustomerId } })
        : await prisma.customer.findFirst({
            where: {
              OR: [
                { phone: cleanNumber },
                { phone: last10 },
                { phone: { contains: last10 } },
              ],
            },
          });

      // Si existe un chat previo con LID para este mismo cliente, reutilizarlo
      let existingLidConv = null;
      if (matchingCustomer) {
        existingLidConv = await prisma.chatConversation.findFirst({
          where: {
            customerId: matchingCustomer.id,
            remoteJid: { contains: '@lid' },
          },
          include: { customer: true },
        });
      }

      if (existingLidConv) {
        conversation = await prisma.chatConversation.update({
          where: { id: existingLidConv.id },
          data: {
            lastMessageText: text.trim(),
            lastMessageTimestamp: now,
            lastMessageFromMe: true,
          },
          include: { customer: true },
        });
      } else {
        conversation = await prisma.chatConversation.create({
          data: {
            remoteJid: cleanJid,
            phoneNumber: cleanNumber,
            contactName: optionalName || matchingCustomer?.fullName || cleanNumber,
            unreadCount: 0,
            lastMessageText: text.trim(),
            lastMessageTimestamp: now,
            lastMessageFromMe: true,
            customerId: matchingCustomer?.id || optionalCustomerId || null,
          },
          include: { customer: true },
        });
      }
    } else {
      conversation = await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
          contactName: optionalName && (!conversation.contactName || conversation.contactName === cleanNumber) ? optionalName : conversation.contactName,
          customerId: optionalCustomerId || conversation.customerId,
          lastMessageText: text.trim(),
          lastMessageTimestamp: now,
          lastMessageFromMe: true,
        },
        include: { customer: true },
      });
    }

    const savedMessage = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        messageId,
        fromMe: true,
        senderName: 'YogurArte',
        messageType: 'TEXT',
        text: text.trim(),
        status: 'SENT',
        timestamp: now,
      },
    });

    if (this.io) {
      this.io.emit('whatsapp:message', {
        conversation,
        message: savedMessage,
      });
    }

    return {
      success: true,
      conversation,
      message: savedMessage,
    };
  }

  public async markConversationAsRead(conversationId: number) {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conv) return;

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    if (this.io) {
      this.io.emit('whatsapp:conversation_read', { conversationId });
    }
  }

  /**
   * Rutina para fusionar automáticamente chats duplicados (LID vs Phone JID)
   */
  public async mergeDuplicateConversations() {
    try {
      const lidConversations = await prisma.chatConversation.findMany({
        where: { remoteJid: { contains: '@lid' } },
        include: { messages: true, customer: true },
      });

      for (const lidConv of lidConversations) {
        // Buscar si hay otra conversación con el mismo cliente o nombre
        let primaryConv = null;
        if (lidConv.customerId) {
          primaryConv = await prisma.chatConversation.findFirst({
            where: {
              customerId: lidConv.customerId,
              id: { not: lidConv.id },
            },
          });
        } else if (lidConv.contactName && !lidConv.contactName.startsWith('+') && isNaN(Number(lidConv.contactName))) {
          primaryConv = await prisma.chatConversation.findFirst({
            where: {
              contactName: { contains: lidConv.contactName, mode: 'insensitive' },
              id: { not: lidConv.id },
            },
          });
        }

        if (primaryConv) {
          console.log(`🔗 Fusionando chat LID #${lidConv.id} en chat principal #${primaryConv.id} (${primaryConv.contactName})`);
          // Mover mensajes
          await prisma.chatMessage.updateMany({
            where: { conversationId: lidConv.id },
            data: { conversationId: primaryConv.id },
          });

          // Actualizar último mensaje del chat principal
          const lastMsg = await prisma.chatMessage.findFirst({
            where: { conversationId: primaryConv.id },
            orderBy: { timestamp: 'desc' },
          });

          if (lastMsg) {
            await prisma.chatConversation.update({
              where: { id: primaryConv.id },
              data: {
                lastMessageText: lastMsg.text,
                lastMessageTimestamp: lastMsg.timestamp,
                lastMessageFromMe: lastMsg.fromMe,
              },
            });
          }

          // Eliminar conversación LID duplicada
          await prisma.chatConversation.delete({
            where: { id: lidConv.id },
          });
        }
      }
    } catch (err) {
      console.warn('Error en mergeDuplicateConversations:', err);
    }
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
