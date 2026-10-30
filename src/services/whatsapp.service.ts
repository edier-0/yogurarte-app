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

/**
 * Normaliza números y JIDs de Colombia para prevenir bifurcación de chats en WhatsApp.
 * Si WhatsApp reporta formato '5793XXXXXXXX' (13 dígitos con el prefijo '9' de telefonía móvil),
 * lo normaliza al estándar canónico '573XXXXXXXX' (12 dígitos).
 */
export function normalizeColombianJid(jidOrPhone: string): string {
  if (!jidOrPhone) return jidOrPhone;
  const str = jidOrPhone.trim();
  if (str.includes('@')) {
    const parts = str.split('@');
    const rawUser = parts[0];
    const domain = parts.slice(1).join('@');
    const [userNumber, device] = rawUser.split(':');
    const normalizedUser = userNumber.replace(/^579(3\d{9})$/, '57$1');
    const fullUser = device ? `${normalizedUser}:${device}` : normalizedUser;
    return `${fullUser}@${domain}`;
  }
  const digits = str.replace(/\D/g, '');
  if (/^579(3\d{9})$/.test(digits)) {
    return digits.replace(/^579(3\d{9})$/, '57$1');
  }
  return str;
}

class WhatsAppService {
  private sock: WASocket | null = null;
  public io: SocketIOServer | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private isInitializing: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionStableTimeout: NodeJS.Timeout | null = null;

  constructor() {}

  private clearTimers() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.connectionStableTimeout) {
      clearTimeout(this.connectionStableTimeout);
      this.connectionStableTimeout = null;
    }
  }

  /**
   * Cierra limpiamente el socket previo y desvincula sus listeners para evitar sockets fantasma
   */
  private cleanupSocket() {
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.end(undefined);
      } catch (err) {
        console.warn('Aviso limpiando socket previo de WhatsApp:', err);
      }
      this.sock = null;
    }
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  public emitSocket(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  public getStatus() {
    if (this.sock?.user?.id && this.status !== 'CONNECTED') {
      console.log(`🔄 Reconciliando estado de WhatsApp a CONNECTED en getStatus() (Usuario: ${this.sock.user.id})`);
      this.status = 'CONNECTED';
      this.qrCodeDataUrl = null;
      this.isInitializing = false;
      this.broadcastStatus();
    }

    return {
      status: this.status,
      qr: this.qrCodeDataUrl,
      user: this.sock?.user || null,
      phoneNumber: this.sock?.user?.id ? normalizeColombianJid(this.sock.user.id.split(':')[0]) : null,
    };
  }

  public async init() {
    if (this.isInitializing) {
      console.log('⏳ Inicialización de WhatsApp ya en curso, ignorando llamada concurrente.');
      return;
    }

    if (this.status === 'CONNECTED' && this.sock?.user?.id) {
      console.log(`ℹ️ WhatsApp ya está conectado con usuario ${this.sock.user.id}.`);
      return;
    }

    this.clearTimers();
    this.isInitializing = true;
    this.status = 'CONNECTING';
    this.broadcastStatus();

    // Limpieza de cualquier socket anterior antes de crear uno nuevo
    this.cleanupSocket();

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

      this.sock.ev.on('creds.update', async () => {
        await saveCreds();
        if (this.sock?.user?.id && this.status !== 'CONNECTED') {
          console.log(`🔄 Reconciliando estado de WhatsApp a CONNECTED por creds.update (Usuario: ${this.sock.user.id})`);
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.isInitializing = false;
          this.broadcastStatus();
        }
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const receivedPendingNotifications = (update as any).receivedPendingNotifications;
        const isNewLogin = (update as any).isNewLogin;

        // Auto-reconciliación: Si Baileys ya tiene el usuario autenticado y no está cerrado el socket
        if (this.sock?.user?.id && connection !== 'close' && this.status !== 'CONNECTED') {
          console.log(`🔄 Reconciliando estado de WhatsApp a CONNECTED en connection.update (Usuario: ${this.sock.user.id})`);
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.isInitializing = false;
          this.broadcastStatus();
        }

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
          this.clearTimers();
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut; // 401
          const isConnectionReplaced = statusCode === DisconnectReason.connectionReplaced; // 440
          const isRestartRequired = statusCode === DisconnectReason.restartRequired; // 515

          console.log(`⚠️ Conexión de WhatsApp cerrada. Código: ${statusCode} (loggedOut=${isLoggedOut}, replaced=${isConnectionReplaced}, restartRequired=${isRestartRequired})`);
          this.status = 'DISCONNECTED';
          this.qrCodeDataUrl = null;
          this.cleanupSocket();
          this.isInitializing = false;
          this.broadcastStatus();

          // A. Desconexión terminal explícita (el usuario desvinculó el dispositivo desde WhatsApp oficial)
          if (isLoggedOut) {
            console.log(`🚪 Sesión revocada desde el dispositivo oficial (Código 401). Purgando credenciales de Neon DB.`);
            await this.clearAuthData();
            this.reconnectAttempts = 0;
            this.broadcastStatus();
            return;
          }

          // B. Conexión reemplazada por otra instancia activa (ej. rolling deploy en Render o pestaña concurrente)
          if (isConnectionReplaced) {
            console.warn(`⚠️ Conexión reemplazada por otra instancia activa (Código 440). Se detiene reconexión para no competir. NO se purgan credenciales.`);
            this.reconnectAttempts = 0;
            return;
          }

          // C. Reinicio normal de Baileys tras escanear QR o cambio de stream (Código 515)
          if (isRestartRequired) {
            console.log(`🔄 Reinicio requerido tras sincronización (Código 515). Reconectando con credenciales establecidas en 1s...`);
            this.reconnectAttempts = 0;
            this.reconnectTimeout = setTimeout(() => {
              this.init().catch((err) => console.error('Error en reconexión 515 de WhatsApp:', err));
            }, 1000);
            return;
          }

          // D. Errores transitorios de red (408, 428, 500, etc.)
          this.reconnectAttempts++;
          if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
            console.warn(`🛑 Límite máximo de ${this.MAX_RECONNECT_ATTEMPTS} reintentos de reconexión alcanzado. Pausando reconexión sin borrar credenciales.`);
            this.reconnectAttempts = 0;
            this.broadcastStatus();
          } else {
            const delay = Math.min(15000, 2000 * this.reconnectAttempts);
            console.log(`🔄 Reintentando conexión a WhatsApp en ${delay / 1000}s (Intento ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
            this.reconnectTimeout = setTimeout(() => {
              this.init().catch((err) => console.error('Error en reintento de conexión WhatsApp:', err));
            }, delay);
          }
        } else if (connection === 'open' || (this.sock?.user?.id && (receivedPendingNotifications || isNewLogin))) {
          console.log(`✅ ¡WhatsApp de YogurArte conectado exitosamente! Usuario: ${this.sock?.user?.id}`);
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.isInitializing = false;
          this.broadcastStatus();

          // Estabilización: solo tras 15 segundos de conexión estable ininterrumpida se resetea el contador
          if (this.connectionStableTimeout) {
            clearTimeout(this.connectionStableTimeout);
          }
          this.connectionStableTimeout = setTimeout(() => {
            console.log('📶 Conexión de WhatsApp estabilizada (15s activos). Contador de reintentos reseteado a 0.');
            this.reconnectAttempts = 0;
          }, 15000);

          // Limpiar/unificar chats duplicados por LID
          this.mergeDuplicateConversations().catch((e) => console.warn('Aviso merge chats:', e));
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        try {
          // Auto-reconciliación proactiva: Si Baileys está recibiendo o sincronizando mensajes,
          // significa que la conexión de socket está activa y autenticada.
          if (this.sock?.user?.id && this.status !== 'CONNECTED') {
            console.log(`🔄 Reconciliando estado de WhatsApp a CONNECTED por flujo de mensajes upsert (Usuario: ${this.sock.user.id})`);
            this.status = 'CONNECTED';
            this.qrCodeDataUrl = null;
            this.isInitializing = false;
            this.broadcastStatus();
          }
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
      this.io.emit('whatsapp:status', {
        status: this.status,
        qr: this.qrCodeDataUrl,
        user: this.sock?.user || null,
        phoneNumber: this.sock?.user?.id ? normalizeColombianJid(this.sock.user.id.split(':')[0]) : null,
      });
    }
  }

  private async clearAuthData() {
    await clearPrismaAuthSession('main');
  }

  public async logout() {
    this.clearTimers();
    this.reconnectAttempts = 0;

    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (e) {
      console.warn('Aviso al cerrar socket de WhatsApp:', e);
    }
    this.cleanupSocket();
    await this.clearAuthData();
    this.status = 'DISCONNECTED';
    this.qrCodeDataUrl = null;
    this.isInitializing = false;
    this.broadcastStatus();

    return { success: true, message: 'Sesión de WhatsApp cerrada' };
  }

  public async refreshQR() {
    this.clearTimers();
    this.cleanupSocket();

    // Forzar siempre la purga de credenciales obsoletas/huérfanas para generar nuevo QR
    await this.clearAuthData();

    this.reconnectAttempts = 0;
    this.status = 'CONNECTING';
    this.qrCodeDataUrl = null;
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
    const rawRemoteJid = msg.key.remoteJid;
    if (!rawRemoteJid || rawRemoteJid.includes('@broadcast') || rawRemoteJid.includes('status@broadcast')) {
      return;
    }
    const remoteJid = normalizeColombianJid(rawRemoteJid);

    const fromMe = Boolean(msg.key.fromMe);
    const messageId = msg.key.id || `MSG-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const pushName = msg.pushName || null;

    // Desenvolver posibles wrappers de WhatsApp (viewOnce, ephemeral, etc.)
    let content: any = msg.message;
    while (
      content?.ephemeralMessage?.message ||
      content?.viewOnceMessage?.message ||
      content?.viewOnceMessageV2?.message ||
      content?.viewOnceMessageV2Extension?.message ||
      content?.documentWithCaptionMessage?.message
    ) {
      content =
        content?.ephemeralMessage?.message ||
        content?.viewOnceMessage?.message ||
        content?.viewOnceMessageV2?.message ||
        content?.viewOnceMessageV2Extension?.message ||
        content?.documentWithCaptionMessage?.message;
    }

    if (!content) return;

    const unwrappedMsg: WAMessage = {
      ...msg,
      message: content,
    };

    let text = '';
    let messageType = 'TEXT';
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;

    if (content.conversation) {
      text = content.conversation;
    } else if (content.extendedTextMessage?.text) {
      text = content.extendedTextMessage.text;
    } else if (content.imageMessage) {
      messageType = 'IMAGE';
      text = content.imageMessage.caption || '📷 Imagen';
      mediaMimeType = content.imageMessage.mimetype || 'image/jpeg';
      try {
        if (this.sock) {
          const buffer = (await downloadMediaMessage(
            unwrappedMsg,
            'buffer',
            {},
            {
              logger: pino({ level: 'silent' }),
              reuploadRequest: this.sock.updateMediaMessage,
            }
          )) as Buffer;
          if (buffer && buffer.length > 0) {
            // Si la imagen es <= 500 KB, persistir en Base64 para garantizar disponibilidad en Neon PostgreSQL (inmune al disco efímero de Render)
            if (buffer.length <= 500 * 1024) {
              mediaUrl = `data:${mediaMimeType};base64,${buffer.toString('base64')}`;
              this.saveMediaBuffer(messageId, 'jpg', buffer).catch(() => {});
            } else {
              mediaUrl = await this.saveMediaBuffer(messageId, 'jpg', buffer);
            }
          }
        }
      } catch (err) {
        console.warn('Aviso: no se pudo descargar imagen por buffer:', err);
      }

      // Si falló la descarga completa del buffer, usar el jpegThumbnail embebido en el mensaje de WhatsApp
      if (!mediaUrl && content.imageMessage.jpegThumbnail) {
        try {
          const thumbBuffer = Buffer.from(content.imageMessage.jpegThumbnail);
          if (thumbBuffer && thumbBuffer.length > 0) {
            mediaUrl = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;
          }
        } catch (e) {
          console.warn('Aviso: error al procesar jpegThumbnail:', e);
        }
      }
    } else if (content.stickerMessage) {
      messageType = 'STICKER';
      text = '✨ Sticker';
      mediaMimeType = 'image/webp';
      try {
        if (this.sock) {
          const buffer = (await downloadMediaMessage(
            unwrappedMsg,
            'buffer',
            {},
            {
              logger: pino({ level: 'silent' }),
              reuploadRequest: this.sock.updateMediaMessage,
            }
          )) as Buffer;
          if (buffer) {
            // Persistencia directa en Base64 para stickers (15-50 KB)
            if (buffer.length <= 150 * 1024) {
              mediaUrl = `data:image/webp;base64,${buffer.toString('base64')}`;
            } else {
              mediaUrl = await this.saveMediaBuffer(messageId, 'webp', buffer);
            }
          }
        }
      } catch (err) {
        console.warn('Aviso: no se pudo descargar sticker:', err);
      }
    } else if (content.audioMessage) {
      messageType = 'AUDIO';
      text = '🎵 Nota de voz / Audio';
      const audioMime = content.audioMessage.mimetype || 'audio/ogg; codecs=opus';
      mediaMimeType = audioMime;
      const ext = audioMime.includes('mp4') ? 'm4a' : 'ogg';
      try {
        if (this.sock) {
          const buffer = (await downloadMediaMessage(
            unwrappedMsg,
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
    } else if (content.videoMessage) {
      messageType = 'VIDEO';
      text = content.videoMessage.caption || '🎥 Video';
    } else if (content.documentMessage) {
      messageType = 'DOCUMENT';
      text = content.documentMessage.fileName || '📄 Documento';
    } else if (content.locationMessage) {
      messageType = 'LOCATION';
      text = '📍 Ubicación';
    } else if (content.contactMessage) {
      messageType = 'CONTACT';
      text = '👤 Contacto';
    }

    if (!text && messageType === 'TEXT' && !mediaUrl) {
      return;
    }

    const messageDate = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000)
      : new Date();

    const rawNumber = remoteJid.split('@')[0].split(':')[0];
    const cleanNumber = normalizeColombianJid(rawNumber.replace(/\D/g, ''));
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
            mappedPhoneNumber = normalizeColombianJid(parsed.replace(/\D/g, ''));
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

    const effectivePhone = normalizeColombianJid(
      matchingCustomer?.phone?.replace(/\D/g, '') ||
      phoneToSearch ||
      conversation?.phoneNumber ||
      cleanNumber
    );

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
          conversationId: conversation.id,
          customerId: conversation.customerId || null,
          canonicalJid: conversation.remoteJid,
          phoneNumber: conversation.phoneNumber,
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
   * Resuelve o reutiliza la conversación activa de un cliente para un mensaje saliente,
   * previniendo de forma absoluta la bifurcación o creación de chats duplicados.
   */
  public async resolveOrCreateConversationForOutgoing(
    cleanJid: string,
    cleanNumber: string,
    text: string,
    optionalName?: string,
    optionalCustomerId?: number,
    now: Date = new Date()
  ) {
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

      // 1. Si el cliente ya tiene CUALQUIER conversación previa, reutilizarla
      let existingConv = null;
      if (matchingCustomer) {
        existingConv = await prisma.chatConversation.findFirst({
          where: { customerId: matchingCustomer.id },
          orderBy: { lastMessageTimestamp: 'desc' },
          include: { customer: true },
        });
      }

      // 2. Si no hay por customerId pero hay un chat huérfano con el mismo número o últimos 10 dígitos
      if (!existingConv && last10 && last10.length >= 7) {
        existingConv = await prisma.chatConversation.findFirst({
          where: {
            OR: [
              { phoneNumber: cleanNumber },
              { phoneNumber: { contains: last10 } },
              { remoteJid: { contains: last10 } },
            ],
          },
          orderBy: { lastMessageTimestamp: 'desc' },
          include: { customer: true },
        });
      }

      if (existingConv) {
        conversation = await prisma.chatConversation.update({
          where: { id: existingConv.id },
          data: {
            customerId: existingConv.customerId || matchingCustomer?.id || optionalCustomerId || null,
            contactName: optionalName || existingConv.contactName || matchingCustomer?.fullName,
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

    return conversation;
  }

  /**
   * Envía un mensaje saliente a través de WhatsApp
   */
  public async sendMessage(remoteJid: string, text: string, optionalName?: string, optionalCustomerId?: number) {
    // Auto-reconciliación antes de enviar: Si el socket y el usuario existen, asegurar que el estado sea CONNECTED
    if (this.sock?.user?.id && this.status !== 'CONNECTED') {
      console.log(`🔄 Reconciliando estado antes de enviar mensaje a CONNECTED (Usuario: ${this.sock.user.id})`);
      this.status = 'CONNECTED';
      this.qrCodeDataUrl = null;
      this.isInitializing = false;
      this.broadcastStatus();
    }

    if (!this.sock || (!this.sock.user && this.status !== 'CONNECTED')) {
      throw new Error('WhatsApp no está conectado actualmente. Por favor escanea el código QR.');
    }

    let cleanJid = normalizeColombianJid(remoteJid.trim());
    if (!cleanJid.includes('@')) {
      let rawDigits = cleanJid.replace(/\D/g, '');
      if (rawDigits.length === 10 && rawDigits.startsWith('3')) {
        rawDigits = `57${rawDigits}`;
      }
      rawDigits = normalizeColombianJid(rawDigits);
      cleanJid = `${rawDigits}@s.whatsapp.net`;
    } else if (!cleanJid.endsWith('@s.whatsapp.net') && !cleanJid.endsWith('@lid') && !cleanJid.endsWith('@g.us')) {
      let rawDigits = cleanJid.replace(/\D/g, '');
      if (rawDigits.length >= 7) {
        if (rawDigits.length === 10 && rawDigits.startsWith('3')) {
          rawDigits = `57${rawDigits}`;
        }
        rawDigits = normalizeColombianJid(rawDigits);
        cleanJid = `${rawDigits}@s.whatsapp.net`;
      } else {
        throw new Error(`El destinatario "${remoteJid}" no corresponde a un JID o número de WhatsApp válido`);
      }
    }
    cleanJid = normalizeColombianJid(cleanJid);
    const cleanNumber = normalizeColombianJid(cleanJid.split('@')[0].split(':')[0].replace(/\D/g, ''));

    const sentMsg = await this.sock.sendMessage(cleanJid, { text: text.trim() });
    const messageId = sentMsg?.key?.id || `OUT-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    const conversation = await this.resolveOrCreateConversationForOutgoing(
      cleanJid,
      cleanNumber,
      text,
      optionalName,
      optionalCustomerId,
      now
    );

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
        conversationId: conversation.id,
        customerId: conversation.customerId || null,
        canonicalJid: conversation.remoteJid,
        phoneNumber: conversation.phoneNumber,
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

      // Rutina para unificar chats con prefijos duplicados de Colombia (5793... vs 573...)
      const duplicate579Convs = await prisma.chatConversation.findMany({
        where: {
          OR: [
            { remoteJid: { startsWith: '5793' } },
            { phoneNumber: { startsWith: '5793' } },
          ],
        },
        include: { messages: true },
      });

      for (const conv579 of duplicate579Convs) {
        const canonicalJid = normalizeColombianJid(conv579.remoteJid);
        const canonicalPhone = normalizeColombianJid(conv579.phoneNumber);
        if (canonicalJid !== conv579.remoteJid || canonicalPhone !== conv579.phoneNumber) {
          const primaryConv = await prisma.chatConversation.findFirst({
            where: {
              id: { not: conv579.id },
              OR: [
                { remoteJid: canonicalJid },
                { phoneNumber: canonicalPhone },
              ],
            },
          });

          if (primaryConv) {
            console.log(`🔗 Fusionando chat duplicado 579 #${conv579.id} en principal #${primaryConv.id}`);
            await prisma.chatMessage.updateMany({
              where: { conversationId: conv579.id },
              data: { conversationId: primaryConv.id },
            });
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
            await prisma.chatConversation.delete({
              where: { id: conv579.id },
            });
          } else {
            await prisma.chatConversation.update({
              where: { id: conv579.id },
              data: {
                remoteJid: canonicalJid,
                phoneNumber: canonicalPhone,
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn('Error en mergeDuplicateConversations:', err);
    }
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
