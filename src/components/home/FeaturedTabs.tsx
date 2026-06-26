import React from "react";
import { Briefcase, LifeBuoy, BookOpen } from "lucide-react";

export type FeatureId = "opportunities" | "help" | "academy";

interface FeaturedItem {
  id: FeatureId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
}

const FEATURED_ITEMS: FeaturedItem[] = [
  {
    id: "opportunities",
    title: "Opportunities",
    subtitle: "Find your next role",
    icon: Briefcase,
    gradient: "linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)",
  },
  {
    id: "help",
    title: "Help",
    subtitle: "Get assistance",
    icon: LifeBuoy,
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  },
  {
    id: "academy",
    title: "Academy",
    subtitle: "Track your progress",
    icon: BookOpen,
    gradient: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
  },
];

interface Props {
  onPress: (id: FeatureId) => void;
  canAccessAcademy: boolean;
}

export const FeaturedTabs: React.FC<Props> = ({
  onPress,
  canAccessAcademy,
}) => {
  return (
    <div style={styles.featuredList}>
      {FEATURED_ITEMS.map((item) => {
        const isDisabled = item.id === "academy" && !canAccessAcademy;
        return (
          <button
            key={item.id}
            style={{
              ...styles.featuredCard,
              background: item.gradient,
              opacity: isDisabled ? 0.6 : 1,
              cursor: isDisabled ? "not-allowed" : "pointer",
            }}
            onClick={() => !isDisabled && onPress(item.id)}
            disabled={isDisabled}
          >
            <div style={styles.cardIcon}>
              <item.icon size={28} color="#fff" strokeWidth={1.5} />
            </div>
            <div style={styles.cardTitle}>{item.title}</div>
            <div style={styles.cardSubtitle}>{item.subtitle}</div>
          </button>
        );
      })}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  featuredList: {
    display: "flex",
    overflowX: "auto",
    gap: 16,
    padding: "8px 16px 12px",
    scrollbarWidth: "thin" as const,
    WebkitOverflowScrolling: "touch" as any,
  },
  featuredCard: {
    flex: "0 0 auto",
    width: 140,
    borderRadius: 24,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
};
