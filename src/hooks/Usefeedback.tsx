import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

export type FeedbackType = "success" | "error" | "info" | "warning";

interface FeedbackModalProps {
  visible: boolean;
  type: FeedbackType;
  title: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const FEEDBACK_CONFIG = {
  success: {
    icon: CheckCircle,
    gradient: "linear-gradient(135deg, #10B981, #059669)",
    iconBg: "rgba(16, 185, 129, 0.15)",
    color: "#10B981",
  },
  error: {
    icon: AlertCircle,
    gradient: "linear-gradient(135deg, #EF4444, #DC2626)",
    iconBg: "rgba(239, 68, 68, 0.15)",
    color: "#EF4444",
  },
  info: {
    icon: Info,
    gradient: "linear-gradient(135deg, #FB8500, #E67600)",
    iconBg: "rgba(251, 133, 0, 0.15)",
    color: "#FB8500",
  },
  warning: {
    icon: AlertCircle,
    gradient: "linear-gradient(135deg, #F59E0B, #D97706)",
    iconBg: "rgba(245, 158, 11, 0.15)",
    color: "#F59E0B",
  },
};

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  type,
  title,
  message,
  buttonText = "OK",
  onClose,
  autoClose = false,
  autoCloseDelay = 2000,
}) => {
  const config = FEEDBACK_CONFIG[type];
  const Icon = config.icon;

  useEffect(() => {
    if (!visible || !autoClose) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [visible, autoClose, autoCloseDelay, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            style={styles.backdrop}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 20,
            }}
            style={styles.wrapper}
          >
            <div style={styles.container}>
              <button onClick={onClose} style={styles.closeButton}>
                <X size={20} />
              </button>

              <div
                style={{
                  ...styles.iconContainer,
                  backgroundColor: config.iconBg,
                }}
              >
                <Icon size={40} color={config.color} />
              </div>

              <h2 style={styles.title}>{title}</h2>

              {message && <p style={styles.message}>{message}</p>}

              <button
                onClick={onClose}
                style={{
                  ...styles.actionButton,
                  background: config.gradient,
                }}
              >
                {buttonText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FeedbackModal;

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "#000",
    zIndex: 999,
  },

  wrapper: {
    position: "fixed",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    zIndex: 1000,
  },

  container: {
    width: "100%",
    maxWidth: "360px",
    background: "#fff",
    borderRadius: "24px",
    padding: "24px",
    textAlign: "center",
    position: "relative",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
  },

  iconContainer: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 20px",
  },

  title: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "8px",
  },

  message: {
    fontSize: "15px",
    color: "#6B7280",
    lineHeight: 1.6,
    marginBottom: "24px",
  },

  actionButton: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    padding: "14px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
  },

  closeButton: {
    position: "absolute",
    top: "12px",
    right: "12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#6B7280",
  },
};
