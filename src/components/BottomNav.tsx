import React from "react";
import { Home, Briefcase, MessageCircle, User } from "lucide-react";
import { MainTab } from "../types";

interface Props {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  badgeCounts?: Partial<Record<MainTab, number>>;
}

const NAV_ITEMS: { key: MainTab; label: string; icon: React.ReactNode }[] = [
  { key: "home", label: "Home", icon: <Home size={24} /> },
  {
    key: "opportunities",
    label: "Opportunities",
    icon: <Briefcase size={24} />,
  },
  { key: "chats", label: "Chat", icon: <MessageCircle size={24} /> },
  { key: "profile", label: "Profile", icon: <User size={24} /> },
];

const BottomNav: React.FC<Props> = ({
  activeTab,
  onTabChange,
  badgeCounts = {},
}) => {
  const getActiveWidth = (label: string) => {
    if (label === "Opportunities") return 150;
    if (label === "Profile") return 90;
    return 85;
  };

  return (
    <nav className="bottom-nav-web">
      <div className="bottom-nav-container">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          const badge = badgeCounts[item.key] || 0;

          return (
            <button
              key={item.key}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
              onClick={() => onTabChange(item.key)}
              style={
                {
                  "--active-width": `${getActiveWidth(item.label)}px`,
                } as React.CSSProperties
              }
            >
              <div className="nav-icon-wrapper">
                <div className="nav-icon-scale">
                  {item.icon}
                  {badge > 0 && !isActive && (
                    <span className="nav-badge">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
              </div>
              {isActive && <span className="nav-label">{item.label}</span>}
            </button>
          );
        })}
      </div>

      <style>{`
        .bottom-nav-web {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding: 0 20px 12px 20px;    /* 👈 moved down */
          pointer-events: none;
          z-index: 1000;
        }
        .bottom-nav-container {
          pointer-events: auto;
          background: rgb(231, 229, 229);
          border-radius: 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 20px;            /* 👈 more compact */
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
          min-width: 320px;
          max-width: 500px;
          width: auto;
        }
        .bottom-nav-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          height: 52px;
          border-radius: 30px;
          transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
          width: 52px;
          overflow: hidden;
          color: #A0A0A0;
        }
        .bottom-nav-item.active {
          background-color: #fb8500;
          width: var(--active-width, 100px);
          padding: 0 18px;
          color: white;
        }
        .bottom-nav-item:not(.active) {
          width: 52px;
        }
        .nav-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }
        .bottom-nav-item.active .nav-icon-wrapper {
          transform: scale(1.0);
        }
        .bottom-nav-item:not(.active) .nav-icon-wrapper {
          transform: scale(0.9);
        }
        .nav-icon-scale {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nav-label {
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: white;
          white-space: nowrap;
          animation: fadeInScale 0.2s ease-out forwards;
        }
        .nav-badge {
          position: absolute;
          top: -6px;
          right: -10px;
          background-color: #FF3B30;
          border-radius: 10px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid #121212;
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          font-weight: bold;
          font-size: 10px;
          color: white;
          line-height: 1;
        }
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: translateX(-5px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .bottom-nav-item:not(.active):hover {
          background-color: rgba(255,255,255,0.1);
          border-radius: 30px;
        }

        /* Responsive tweaks */
        @media (min-width: 600px) {
          .bottom-nav-container {
            gap: 20px;
            padding: 10px 28px;
            min-width: 400px;
          }
          .bottom-nav-item {
            width: 56px;
            height: 56px;
          }
          .bottom-nav-item.active {
            padding: 0 24px;
          }
          .nav-label {
            font-size: 15px;
          }
        }
        @media (max-width: 480px) {
          .bottom-nav-container {
            gap: 8px;
            padding: 4px 16px;          /* even more compact on small screens */
            min-width: 280px;
          }
          .bottom-nav-item {
            width: 46px;
            height: 46px;
          }
          .bottom-nav-item.active {
            padding: 0 14px;
          }
          .nav-label {
            font-size: 12px;
          }
        }

        /* Safe area for notched phones */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .bottom-nav-web {
            padding-bottom: calc(12px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </nav>
  );
};

export default BottomNav;
