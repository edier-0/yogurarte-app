<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  QrCode,
  RefreshCw,
  X,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

defineProps<{
  open: boolean;
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';
  qr: string | null;
  phoneNumber?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'refresh'): void;
}>();

async function handleRefreshQR() {
  try {
    await http.post('/crm/refresh-qr');
    toast.info('Solicitando nuevo código QR...');
    emit('refresh');
  } catch (err: any) {
    toast.error('No se pudo regenerar el QR', { description: err?.message });
  }
}

async function handleLogout() {
  if (!window.confirm('¿Seguro que deseas desconectar la sesión actual de WhatsApp?')) return;
  try {
    await http.post('/crm/logout');
    toast.success('Sesión de WhatsApp desconectada');
    emit('refresh');
  } catch (err: any) {
    toast.error('Error al cerrar sesión', { description: err?.message });
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              <QrCode class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Sesión de WhatsApp Baileys
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Vinculación de dispositivo y estado en tiempo real
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-5 space-y-4 text-center">
          <!-- Estado Conectado -->
          <div v-if="status === 'CONNECTED'" class="space-y-3 py-4">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 class="h-8 w-8 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
                WhatsApp Conectado
              </h3>
              <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                La sesión está activa y sincronizada con el número:
              </p>
              <span class="mt-2 inline-block rounded-xl bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
                +{{ phoneNumber || 'Conectado' }}
              </span>
            </div>

            <div class="pt-4">
              <button
                type="button"
                @click="handleLogout"
                class="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
              >
                <LogOut class="h-4 w-4 stroke-[2]" />
                <span>Desconectar Sesión</span>
              </button>
            </div>
          </div>

          <!-- Código QR Listo para Escanear -->
          <div v-else-if="qr" class="space-y-4 py-2">
            <div class="mx-auto max-w-[280px] rounded-2xl border-4 border-purple-800 bg-white p-2 shadow-lg">
              <img :src="qr" alt="Código QR de WhatsApp" class="h-auto w-full rounded-xl" />
            </div>

            <div class="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 text-left text-xs text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/20 dark:text-purple-300">
              <span class="font-extrabold block mb-1">Instrucciones para vincular:</span>
              <ol class="list-decimal pl-4 space-y-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <li>Abre WhatsApp en tu teléfono.</li>
                <li>Toca Menú o Ajustes y selecciona "Dispositivos vinculados".</li>
                <li>Toca "Vincular un dispositivo" y apunta tu cámara a este código QR.</li>
              </ol>
            </div>

            <button
              type="button"
              @click="handleRefreshQR"
              class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw class="h-3.5 w-3.5 stroke-[2]" />
              <span>Regenerar Código QR</span>
            </button>
          </div>

          <!-- Estado Desconectado o Conectando sin QR todavía -->
          <div v-else class="space-y-4 py-8">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <AlertCircle class="h-7 w-7 stroke-[2]" />
            </div>

            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
                {{ status === 'CONNECTING' ? 'Generando sesión WhatsApp...' : 'Sesión Desconectada' }}
              </h3>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {{ status === 'CONNECTING' ? 'Esperando código QR del servidor...' : 'Inicia la conexión para sincronizar los mensajes.' }}
              </p>
            </div>

            <button
              type="button"
              @click="handleRefreshQR"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
            >
              <Smartphone class="h-4 w-4 stroke-[2]" />
              <span>Iniciar y Solicitar QR</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
