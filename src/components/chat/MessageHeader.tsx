import React from "react";
import { Plus, ArrowLeft } from "lucide-react";

interface MessagesHeaderProps {
  title?: string;
  onPlusClick?: () => void;
  onBack?: () => void;
}

const PRIMARY = "#fb8500";

const MessagesHeader: React.FC<MessagesHeaderProps> = ({
  title = "Messages",
  onPlusClick,
  onBack,
}) => {
  return (
    <div style={styles.header}>
      {/* Left side: Back button (if any) */}
      <div style={styles.left}>
        {onBack && (
          <button onClick={onBack} style={styles.iconBtn} title="Back">
            <ArrowLeft size={22} color="#fff" />
          </button>
        )}
      </div>

      {/* Center: Title – absolutely positioned to be centered */}
      <div style={styles.center}>
        <span style={styles.headerTitle}>{title}</span>
      </div>

      {/* Right side: Plus button (if any) */}
      <div style={styles.right}>
        {onPlusClick && (
          <button
            onClick={onPlusClick}
            style={styles.iconBtn}
            title="New conversation"
          >
            <Plus size={22} color="#fff" />
          </button>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: `linear-gradient(135deg, ${PRIMARY} 0%, #e85d04 100%)`,
    padding: "20px 16px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    position: "relative", // needed for absolute centering
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1, 
    justifyContent: "flex-start",
  },
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1, 
    justifyContent: "flex-end",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    pointerEvents: "none",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    pointerEvents: "auto", 
  },
};

export default MessagesHeader;
