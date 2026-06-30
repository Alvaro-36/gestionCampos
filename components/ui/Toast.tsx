import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-green-600 text-white border-green-700',
    error: 'bg-red-600 text-white border-red-700',
    info: 'bg-blue-600 text-white border-blue-700',
  };

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  };

  return (
    <>
      <style>{`
        @keyframes toastSlideDown {
          from {
            transform: translate(-50%, -20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .toast-slide-down {
          animation: toastSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      <div 
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-xl border shadow-lg toast-slide-down pointer-events-auto max-w-md w-full sm:w-auto ${bgColors[type]}`}
      >
        <span className="material-symbols-outlined text-[24px] shrink-0 text-white">{icons[type]}</span>
        <span className="font-body-md text-body-md flex-1 text-white">{message}</span>
        <button 
          onClick={onClose} 
          className="hover:opacity-80 transition-opacity p-1 cursor-pointer flex items-center justify-center border-none bg-transparent text-white/95"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </>
  );
}
