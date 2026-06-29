import React, { useState, useEffect } from "react";
import { MainTab } from "./types";
import { useAuth } from "./context/AuthContext";
import HomeTab from "./components/HomeTab";
import OpportunitiesTab from "./components/OpportunitiesTab";
import ChatsTab from "./components/ChatsTab";
import ProfileTab from "./components/ProfileTab";
import BottomNav from "./components/BottomNav";
import OnboardingTour from "./components/OnboardingScreen";
import LoginScreen from "./components/LoginScreen";
import SignUpScreen from "./components/SignUpScreen";
import { OpportunityDetailPage } from "./components/opportunities/OpportunityDetailPage";
import { Conversation } from "./types/chat";
import ChatWindow from "./components/chat/ChatWindow";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import { useChatStore } from "./stores/chatStore";
import "./App.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthScreen = "onboarding" | "login" | "signup" | "forgot";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORT_CONVERSATION: Conversation = {
  id: 0,
  type: "direct",
  name: "SkillsPanda Support",
  created_by: 547,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  latest_message: null,
  unread_count: 0,
  members: [
    {
      id: 547,
      name: "SkillsPanda Support",
      email: "heita@skillspanda.co.za",
    } as any,
  ],
};

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // ── Chat store (badge + polling) ────────────────────────────────────────────
  const conversations = useChatStore((s) => s.conversations);
  const startPolling = useChatStore((s) => s.startPolling);
  const stopPolling = useChatStore((s) => s.stopPolling);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unread_count ?? 0),
    0,
  );

  useEffect(() => {
    if (isAuthenticated) {
      startPolling();
    }
    return () => stopPolling();
  }, [isAuthenticated]);

  const [authScreen, setAuthScreen] = useState<AuthScreen>(() => {
    const onboarded = localStorage.getItem("pandabot_onboarded") === "true";
    return onboarded ? "login" : "onboarding";
  });

  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    string | null
  >(null);
  const [activeChatConversation, setActiveChatConversation] =
    useState<Conversation | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveTab("home");
      setSelectedOpportunityId(null);
      setActiveChatConversation(null);
      const onboarded = localStorage.getItem("pandabot_onboarded") === "true";
      setAuthScreen(onboarded ? "login" : "onboarding");
    }
  }, [isAuthenticated]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCompleteOnboarding = () => {
    localStorage.setItem("pandabot_onboarded", "true");
    setAuthScreen("login");
  };

  const handleViewOpportunity = (id: string) => {
    setSelectedOpportunityId(id);
  };

  const handleBackFromDetail = () => {
    setSelectedOpportunityId(null);
    setActiveTab("opportunities");
  };

  const handleOpenSupportChat = () => {
    setActiveChatConversation(SUPPORT_CONVERSATION);
    setActiveTab("chats");
  };

  const handleLogout = async () => {
    await logout();
  };

  // ── Loading / Auth screens ──────────────────────────────────────────────────

  if (isLoading) return null;

  if (!isAuthenticated) {
    if (authScreen === "onboarding")
      return <OnboardingTour onComplete={handleCompleteOnboarding} />;
    if (authScreen === "signup")
      return <SignUpScreen onGoToLogin={() => setAuthScreen("login")} />;
    if (authScreen === "forgot")
      return <ForgotPasswordScreen onBack={() => setAuthScreen("login")} />;

    return (
      <LoginScreen
        onLogin={() => {}}
        onGoToSignUp={() => setAuthScreen("signup")}
        onForgotPassword={() => setAuthScreen("forgot")}
      />
    );
  }

  // ── Main app shell ──────────────────────────────────────────────────────────

  const renderContent = () => {
    if (selectedOpportunityId) {
      return (
        <OpportunityDetailPage
          id={selectedOpportunityId}
          onBack={handleBackFromDetail}
        />
      );
    }

    switch (activeTab) {
      case "home":
        return (
          <HomeTab
            onOpenSupportChat={handleOpenSupportChat}
            onNavigateToOpportunities={() => setActiveTab("opportunities")}
          />
        );

      case "opportunities":
        return (
          <OpportunitiesTab
            fullscreen={true}
            onBack={() => setActiveTab("home")}
            onViewOpportunity={handleViewOpportunity}
          />
        );

      case "chats":
        if (activeChatConversation) {
          return (
            <ChatWindow
              conversation={activeChatConversation}
              currentUserId={user?.id ?? 0}
              onBack={() => setActiveChatConversation(null)}
            />
          );
        }
        return (
          <ChatsTab
            currentUserId={user?.id ?? 0}
            onOpenChat={(conversation) =>
              setActiveChatConversation(conversation)
            }
            onBack={() => setActiveTab("home")}
          />
        );

      case "profile":
        return <ProfileTab onLogout={handleLogout} />;

      default:
        return (
          <HomeTab
            onOpenSupportChat={handleOpenSupportChat}
            onNavigateToOpportunities={() => setActiveTab("opportunities")}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <main className="app-content" style={{ paddingTop: 0 }}>
        {renderContent()}
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== "chats") setActiveChatConversation(null);
          setActiveTab(tab);
        }}
        badgeCounts={{ chats: totalUnread }}
      />
    </div>
  );
};

export default App;
