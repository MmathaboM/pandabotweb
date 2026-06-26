import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AcademyDashboard from "./academy/AcademyDashboard";
import HelpCenter from "./help/HelpCenter";
import HomeHeader from "./home/HomeHeader";
import { FeaturedTabs, FeatureId } from "./home/FeaturedTabs";
import SocialFeed from "./home/SocialFeed";

const HEADER_HEIGHT = 280;

interface Props {
  onOpenSupportChat: () => void;
  onNavigateToOpportunities: () => void;
}

const HomeTab: React.FC<Props> = ({
  onOpenSupportChat,
  onNavigateToOpportunities,
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeScreen, setActiveScreen] = useState<FeatureId | null>(null);

  const firstName = user?.first_name ?? "there";

  // ─── Access control for Academy 

  const canAccessAcademy = user
    ? user.role?.toLowerCase() === "student" ||
      user.role?.toLowerCase() === "learner" ||
      user.email?.toLowerCase().endsWith("@skillspanda.co.za")
    : false;

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        // TODO: replace with real unread count API
        setUnreadCount(3);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleFeaturedPress = (id: FeatureId) => {
    if (id === "academy" && !canAccessAcademy) {
      alert("Academy access is only for registered students. Contact support.");
      return;
    }
    if (id === "opportunities") {
      onNavigateToOpportunities();
      return;
    }
    if (id === "help") {
      setActiveScreen("help");
      return;
    }
    if (id === "academy") {
      setActiveScreen("academy");
    }
  };

  if (activeScreen === "academy") {
    return <AcademyDashboard onClose={() => setActiveScreen(null)} />;
  }
  if (activeScreen === "help") {
    return <HelpCenter onClose={() => setActiveScreen(null)} />;
  }

  return (
    <>
      <div style={styles.fixedHeader}>
        <HomeHeader
          firstName={firstName}
          unreadCount={unreadCount}
          onNotificationsClick={() => console.log("Notifications")}
        />
        <FeaturedTabs
          onPress={handleFeaturedPress}
          canAccessAcademy={canAccessAcademy}
        />
        <div style={styles.fadeOverlay} />
      </div>

      <div style={{ ...styles.scrollableContent, paddingTop: HEADER_HEIGHT }}>
        <SocialFeed />
      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  fixedHeader: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#F7F7F7",
    boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },
  fadeOverlay: {
    position: "absolute",
    bottom: -10,
    left: 0,
    right: 0,
    height: 35,
    zIndex: 5,
    pointerEvents: "none",
    background:
      "linear-gradient(to bottom, rgba(247,247,247,0) 0%, #F7F7F7 100%)",
    opacity: 0.6,
  },
  scrollableContent: {
    paddingBottom: 80,
  },
};

export default HomeTab;
