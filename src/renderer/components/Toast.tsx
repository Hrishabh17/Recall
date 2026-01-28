import { useEffect, useState } from "react";
import { Check, Copy, Trash2, Save } from "./Icons";

export type ToastType = "copy" | "delete" | "pin" | "save";

interface ToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
  onHide: () => void;
}

const toastConfig = {
  copy: { icon: Copy, bg: "bg-vault-accent" },
  delete: { icon: Trash2, bg: "bg-red-500" },
  pin: { icon: Save, bg: "bg-green-500" },
  save: { icon: Check, bg: "bg-green-500" },
};

export function Toast({ type, message, visible, onHide }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className={`flex items-center gap-2 px-4 py-2 ${config.bg} text-white text-xs font-medium rounded-full shadow-lg animate-slide-up`}>
        <Icon className="w-3.5 h-3.5" />
        {message}
      </div>
    </div>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  const hideToast = () => setToast(null);

  return { toast, showToast, hideToast };
}
