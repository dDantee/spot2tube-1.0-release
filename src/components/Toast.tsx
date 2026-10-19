import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 border border-emerald-500/40 text-white shadow-2xl shadow-black/80">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-xs sm:text-sm font-semibold">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-zinc-400 hover:text-white text-xs cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
