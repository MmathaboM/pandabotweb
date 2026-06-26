import React, { useEffect } from "react";

export type FeedbackType = "success" | "error" | "info" | "warning";

interface FeedbackModalProps {
  visible: boolean;
  type: FeedbackType;
  title: string;
  message?: string;
  buttonText?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
  onClose: () => void;
}

const iconMap: Record<FeedbackType, string> = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️",
};

const bgColorMap: Record<FeedbackType, string> = {
  success: "bg-green-50 border-green-300",
  error: "bg-red-50 border-red-300",
  info: "bg-blue-50 border-blue-300",
  warning: "bg-yellow-50 border-yellow-300",
};

const textColorMap: Record<FeedbackType, string> = {
  success: "text-green-800",
  error: "text-red-800",
  info: "text-blue-800",
  warning: "text-yellow-800",
};

const buttonColorMap: Record<FeedbackType, string> = {
  success: "bg-green-600 hover:bg-green-700",
  error: "bg-red-600 hover:bg-red-700",
  info: "bg-blue-600 hover:bg-blue-700",
  warning: "bg-yellow-600 hover:bg-yellow-700",
};

export default function FeedbackModal({
  visible,
  type,
  title,
  message,
  buttonText = "OK",
  autoClose = false,
  autoCloseDelay = 3000,
  onClose,
}: FeedbackModalProps) {
  useEffect(() => {
    if (visible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [visible, autoClose, autoCloseDelay, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all">
      <div
        className={`w-full max-w-md rounded-lg border p-6 shadow-xl ${bgColorMap[type]} transition-all duration-200`}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{iconMap[type]}</span>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${textColorMap[type]}`}>
              {title}
            </h3>
            {message && (
              <p className={`mt-1 text-sm ${textColorMap[type]} opacity-90`}>
                {message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColorMap[type]}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
