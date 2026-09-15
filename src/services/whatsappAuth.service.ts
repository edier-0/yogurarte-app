import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataTypeMap,
  SignalKeyStore,
} from '@whiskeysockets/baileys';
import prisma from '../prisma.js';

/**
 * Adaptador de estado de autenticación de Baileys basado en Prisma (Neon PostgreSQL).
 * Almacena de forma persistente y segura las llaves criptográficas de la sesión de WhatsApp,
 * manteniendo la tabla limpia mediante operaciones UPSERT y eliminando llaves temporales usadas.
 */
export async function usePrismaAuthState(sessionId: string = 'main'): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  // Cargar credenciales principales existentes o inicializar nuevas
  const credsRecord = await prisma.whatsAppAuthSession.findUnique({
    where: { id: `${sessionId}:creds` },
  });

  let creds: AuthenticationCreds;
  if (credsRecord) {
    try {
      creds = JSON.parse(credsRecord.value, BufferJSON.reviver);
    } catch (err) {
      console.warn('⚠️ Error al parsear creds guardadas en DB. Reinicializando credenciales:', err);
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  const keys: SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [key: string]: SignalDataTypeMap[T] }> => {
      const result: { [key: string]: SignalDataTypeMap[T] } = {};
      if (!ids || ids.length === 0) return result;

      const fullIds = ids.map((id) => `${sessionId}:${type}-${id}`);

      try {
        const records = await prisma.whatsAppAuthSession.findMany({
          where: {
            id: { in: fullIds },
          },
        });

        for (const record of records) {
          const prefix = `${type}-`;
          const rawId = record.keyId.startsWith(prefix) ? record.keyId.slice(prefix.length) : record.keyId;

          try {
            let val = JSON.parse(record.value, BufferJSON.reviver);
            if (type === 'app-state-sync-key' && val) {
              val = proto.Message.AppStateSyncKeyData.fromObject(val);
            }
            result[rawId] = val;
          } catch (parseErr) {
            console.warn(`Error parseando llave ${record.keyId}:`, parseErr);
          }
        }
      } catch (dbErr) {
        console.error(`Error consultando llaves de tipo ${type} en DB:`, dbErr);
      }

      return result;
    },

    set: async (data: any): Promise<void> => {
      const upsertPromises: Promise<any>[] = [];
      const deleteIds: string[] = [];

      for (const category in data) {
        for (const id in data[category]) {
          const value = data[category][id];
          const keyId = `${category}-${id}`;
          const fullId = `${sessionId}:${keyId}`;

          if (value !== null && value !== undefined) {
            const serialized = JSON.stringify(value, BufferJSON.replacer);
            upsertPromises.push(
              prisma.whatsAppAuthSession.upsert({
                where: { id: fullId },
                create: {
                  id: fullId,
                  sessionId,
                  keyId,
                  value: serialized,
                },
                update: {
                  value: serialized,
                },
              })
            );
          } else {
            deleteIds.push(fullId);
          }
        }
      }

      if (deleteIds.length > 0) {
        upsertPromises.push(
          prisma.whatsAppAuthSession.deleteMany({
            where: { id: { in: deleteIds } },
          })
        );
      }

      try {
        await Promise.all(upsertPromises);
      } catch (err) {
        console.error('Error guardando llaves de autenticación en DB:', err);
      }
    },
  };

  const saveCreds = async (): Promise<void> => {
    try {
      const serialized = JSON.stringify(creds, BufferJSON.replacer);
      await prisma.whatsAppAuthSession.upsert({
        where: { id: `${sessionId}:creds` },
        create: {
          id: `${sessionId}:creds`,
          sessionId,
          keyId: 'creds',
          value: serialized,
        },
        update: {
          value: serialized,
        },
      });
    } catch (err) {
      console.error('Error guardando creds de WhatsApp en DB:', err);
    }
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds,
  };
}

/**
 * Elimina por completo todas las llaves y credenciales de una sesión de WhatsApp de la base de datos.
 * Utilizado cuando el usuario cierra sesión o desvincula el número.
 */
export async function clearPrismaAuthSession(sessionId: string = 'main'): Promise<void> {
  try {
    const deleted = await prisma.whatsAppAuthSession.deleteMany({
      where: { sessionId },
    });
    console.log(`🧹 Limpieza total de sesión de WhatsApp '${sessionId}': ${deleted.count} llaves eliminadas de Neon DB.`);
  } catch (err) {
    console.error(`Error limpiando sesión de WhatsApp '${sessionId}' en DB:`, err);
  }
}
