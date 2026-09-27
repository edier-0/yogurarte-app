import { computed, watch, onMounted } from 'vue';
import { useLocalStorage, usePreferredDark } from '@vueuse/core';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme() {
  const currentTheme = useLocalStorage<ThemeMode>('yogurarte_theme', 'system');
  const preferredDark = usePreferredDark();

  const isDark = computed(() => {
    if (currentTheme.value === 'system') {
      return preferredDark.value;
    }
    return currentTheme.value === 'dark';
  });

  const applyTheme = (dark: boolean) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (dark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    }
  };

  watch(
    isDark,
    (val) => {
      applyTheme(val);
    },
    { immediate: true }
  );

  const setTheme = (mode: ThemeMode) => {
    currentTheme.value = mode;
  };

  const toggleTheme = () => {
    if (isDark.value) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  onMounted(() => {
    applyTheme(isDark.value);
  });

  return {
    currentTheme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
