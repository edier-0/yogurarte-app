import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  WAMessage,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import prisma from '../prisma.js';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

class WhatsAppService {
  private sock: WASocket | null = null;
  private io: SocketIOServer | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private authFolder: string = path.join(process.cwd(), 'auth_info_baileys');
  private isInitializing: boolean = false;
  private reconnectAttempts: number = 0;

  constructor() {
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
    }
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  public getStatus() {
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
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Iniciando WhatsApp Baileys v${version.join('.')} (Latest: ${isLatest})`);

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        browser: ['YogurArte CRM', 'Chrome', '1.0.0'],
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
            console.log('🚪 Sesión cerrada por el usuario. Limpiando credenciales...');
            this.clearAuthFolder();
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
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        try {
          if (m.type !== 'notify') return;

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

  private clearAuthFolder() {
    try {
      if (fs.existsSync(this.authFolder)) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        fs.mkdirSync(this.authFolder, { recursive: true });
      }
    } catch (err) {
      console.error('Error limpiando carpeta de autenticación:', err);
    }
  }

  public async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (e) {
      console.warn('Aviso al cerrar socket de WhatsApp:', e);
    }
    this.clearAuthFolder();
    this.status = 'DISCONNECTED';
    this.qrCodeDataUrl = null;
    this.sock = null;
    this.isInitializing = false;
    this.broadcastStatus();

    setTimeout(() => this.init(), 1500);
    return { success: true };
  }

  private async processIncomingMessage(msg: WAMessage) {
    if (!msg.message) return;
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid.includes('@broadcast') || remoteJid.includes('status@broadcast')) {
      return;
    }

    const fromMe = Boolean(msg.key.fromMe);
    const messageId = msg.key.id || `MSG-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const pushName = msg.pushName || null;

    const rawNumber = remoteJid.split('@')[0];
    const cleanNumber = rawNumber.replace(/\D/g, '');

    let text = '';
    let messageType = 'TEXT';

    if (msg.message.conversation) {
      text = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      text = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage) {
      messageType = 'IMAGE';
      text = msg.message.imageMessage.caption || '📷 Imagen';
    } else if (msg.message.audioMessage) {
      messageType = 'AUDIO';
      text = '🎵 Nota de voz / Audio';
    } else if (msg.message.videoMessage) {
      messageType = 'VIDEO';
      text = msg.message.videoMessage.caption || '🎥 Video';
    } else if (msg.message.documentMessage) {
      messageType = 'DOCUMENT';
      text = msg.message.documentMessage.fileName || '📄 Documento';
    } else if (msg.message.stickerMessage) {
      messageType = 'STICKER';
      text = '✨ Sticker';
    } else if (msg.message.locationMessage) {
      messageType = 'LOCATION';
      text = '📍 Ubicación';
    } else if (msg.message.contactMessage) {
      messageType = 'CONTACT';
      text = '👤 Contacto';
    }

    if (!text && messageType === 'TEXT') {
      return;
    }

    const messageDate = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000)
      : new Date();

    let conversation = await prisma.chatConversation.findUnique({
      where: { remoteJid },
      include: { customer: true },
    });

    if (!conversation) {
      let matchedCustomerId: number | null = null;
      let matchedContactName: string | null = pushName;

      const last10 = cleanNumber.slice(-10);
      const matchingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: cleanNumber },
            { phone: last10 },
            { phone: { contains: last10 } },
          ],
        },
      });

      if (matchingCustomer) {
        matchedCustomerId = matchingCustomer.id;
        matchedContactName = matchingCustomer.fullName;
      }

      conversation = await prisma.chatConversation.create({
        data: {
          remoteJid,
          phoneNumber: cleanNumber,
          contactName: matchedContactName || pushName || cleanNumber,
          unreadCount: fromMe ? 0 : 1,
          lastMessageText: text,
          lastMessageTimestamp: messageDate,
          lastMessageFromMe: fromMe,
          customerId: matchedCustomerId,
        },
        include: { customer: true },
      });
    } else {
      conversation = await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
          contactName: pushName && !conversation.customerId ? pushName : conversation.contactName,
          lastMessageText: text,
          lastMessageTimestamp: messageDate,
          lastMessageFromMe: fromMe,
          unreadCount: fromMe ? conversation.unreadCount : conversation.unreadCount + 1,
        },
        include: { customer: true },
      });
    }

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
          status: fromMe ? 'SENT' : 'DELIVERED',
          timestamp: messageDate,
        },
      });
    }

    if (this.io && savedMessage) {
      this.io.emit('whatsapp:message', {
        conversation,
        message: savedMessage,
      });
    }
  }

  public async sendMessage(remoteJid: string, text: string) {
    if (!this.sock || this.status !== 'CONNECTED') {
      throw new Error('WhatsApp no está conectado actualmente. Por favor escanea el código QR.');
    }

    const cleanJid = remoteJid.includes('@') ? remoteJid : `${remoteJid.replace(/\D/g, '')}@s.whatsapp.net`;
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
      const matchingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: cleanNumber },
            { phone: last10 },
            { phone: { contains: last10 } },
          ],
        },
      });

      conversation = await prisma.chatConversation.create({
        data: {
          remoteJid: cleanJid,
          phoneNumber: cleanNumber,
          contactName: matchingCustomer?.fullName || cleanNumber,
          unreadCount: 0,
          lastMessageText: text.trim(),
          lastMessageTimestamp: now,
          lastMessageFromMe: true,
          customerId: matchingCustomer?.id || null,
        },
        include: { customer: true },
      });
    } else {
      conversation = await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
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
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
