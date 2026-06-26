import React from "react";
import { Bell } from "lucide-react";

interface HomeHeaderProps {
  firstName: string;
  unreadCount: number;
  onNotificationsClick?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  firstName,
  unreadCount,
  onNotificationsClick,
}) => {
  return (
    <div style={styles.headerContainer}>
      <div style={styles.gradientHeader}>
        <div style={styles.headerContent}>
          <div style={{ flex: 1 }}>
            <div style={styles.greeting}>Hello, {firstName}! 👋</div>
            <div style={styles.subtitle}>Welcome to the community</div>
          </div>

          <button style={styles.bellContainer} onClick={onNotificationsClick}>
            <Bell size={22} color="#fff" />

            {unreadCount > 0 && (
              <div style={styles.bellBadge}>
                <span style={styles.bellBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  headerContainer: {
    zIndex: 10,
    backgroundColor: "#F7F7F7",
    boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },
  gradientHeader: {
    background: "linear-gradient(135deg, #fb8500 0%, #e67600 100%)",
    paddingBottom: 20,
    paddingTop: "env(safe-area-inset-top, 20px)",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
  },
  greeting: {
    fontSize: 24,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  bellContainer: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    border: "none",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
    border: "2px solid #fb8500",
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
};

export default HomeHeader;
