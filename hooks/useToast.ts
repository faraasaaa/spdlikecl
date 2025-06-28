import { useState, useCallback } from 'react';
import type { ToastConfig } from '../components/Toast';

export function useToast() {
  const [toast, setToast] = useState<(ToastConfig & { visible: boolean }) | null>(null);

  const showToast = useCallback((config: ToastConfig) => {
    setToast({ ...config, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => prev ? { ...prev, visible: false } : null);
    setTimeout(() => setToast(null), 300);
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
}