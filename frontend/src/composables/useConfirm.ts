import { ref } from 'vue';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

const isOpen = ref(false);
const options = ref<ConfirmOptions>({
  title: '¿Confirmar acción?',
  message: 'Esta acción no se puede deshacer.',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  variant: 'danger',
});

let resolvePromise: ((value: boolean) => void) | null = null;

export function useConfirm() {
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = {
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || (opts.variant === 'danger' ? 'Confirmar' : 'Aceptar'),
      cancelText: opts.cancelText || 'Cancelar',
      variant: opts.variant || 'danger',
    };
    isOpen.value = true;

    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
  }

  function handleConfirm() {
    isOpen.value = false;
    if (resolvePromise) {
      resolvePromise(true);
      resolvePromise = null;
    }
  }

  function handleCancel() {
    isOpen.value = false;
    if (resolvePromise) {
      resolvePromise(false);
      resolvePromise = null;
    }
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
