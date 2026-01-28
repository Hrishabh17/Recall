import { useEffect, useState } from "react";
import { Check, Copy, Trash2, Save } from "./Icons";

/**
 * Toast notification types
 * - copy: Item copied to clipboard
 * - delete: Item deleted
 * - save: Item saved (script/reminder)
 * - error: Error occurred (for future use)
 */
export type ToastType = "copy" | "delete" | "save" | "error";

interface ToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
  onHide: () => void;
}

/**
 * Toast configuration with icons and colors
 * Uses glassmorphism design with subtle backgrounds
 */
const toastConfig = {
  copy: { 
    icon: Copy, 
    bg: "bg-emerald-500/20", 
    border: "border-emerald-500/30",
    iconColor: "text-emerald-300"
  },
  delete: { 
    icon: Trash2, 
    bg: "bg-red-500/20", 
    border: "border-red-500/30",
    iconColor: "text-red-300"
  },
  save: { 
    icon: Check, 
    bg: "bg-blue-500/20", 
    border: "border-blue-500/30",
    iconColor: "text-blue-300"
  },
  error: { 
    icon: Trash2, 
    bg: "bg-red-500/20", 
    border: "border-red-500/30",
    iconColor: "text-red-300"
  },
};

/**
 * Toast Component
 * 
 * Displays temporary notifications at the bottom of the screen
 * - Auto-dismisses after 2 seconds
 * - Smooth slide-up animation
 * - Glassmorphism design with backdrop blur
 * - Positioned at bottom center, above other content
 */
export function Toast({ type, message, visible, onHide }: ToastProps) {
  useEffect(() => {
    if (visible) {
      // Auto-hide after 2 seconds
      const timer = setTimeout(onHide, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div 
        className={`
          flex items-center gap-2.5 px-4 py-2.5 
          ${config.bg} ${config.border} border
          backdrop-blur-xl
          text-white text-xs font-medium 
          rounded-xl shadow-2xl
          animate-slide-up
        `}
        style={{
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset"
        }}
      >
        <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
        <span className="text-white/90">{message}</span>
      </div>
    </div>
  );
}

/**
 * useToast Hook
 * 
 * Manages toast notification state
 * 
 * @returns {object} { toast, showToast, hideToast }
 * - toast: Current toast state (type, message) or null
 * - showToast: Function to display a toast
 * - hideToast: Function to hide current toast
 */
export function useToast() {
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  const hideToast = () => setToast(null);

  return { toast, showToast, hideToast };
}
