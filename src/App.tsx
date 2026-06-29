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
import ResetPasswordScreen from "./components/ResetPasswordScreen"; 
import { useChatStore } from "./stores/chatStore";
import "./App.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthScreen = "onboarding" | "login" | "signup" | "forgot" | "reset";

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

  // ── Determine initial auth screen ──────────────────────────────────────────

  const getInitialScreen = (): AuthScreen => {
    // Check if we have a reset token & email in the URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    if (token && email) {
      return "reset";
    }

    const onboarded = localStorage.getItem("pandabot_onboarded") === "true";
    return onboarded ? "login" : "onboarding";
  };

  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialScreen);

  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    string | null
  >(null);
  const [activeChatConversation, setActiveChatConversation] =
    useState<Conversation | null>(null);

  // ── Reset screen success handler ───────────────────────────────────────────
  const handleResetSuccess = () => {
    // Remove query params from URL
    window.history.replaceState({}, document.title, window.location.pathname);
    setAuthScreen("login");
  };

  // ── Reset screen error / back ─────────────────────────────────────────────
  const handleResetBack = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setAuthScreen("login");
  };

  // ── When authenticated, reset any auth-screen state ──────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      setActiveTab("home");
      setSelectedOpportunityId(null);
      setActiveChatConversation(null);
      // If we're on the reset screen while authenticated, we can stay there,
      // but we probably want to show the main app. However, reset screen
      // doesn't require auth, so if we are authenticated and we land on reset,
      // we can just show the app. But for a clean flow, we'll show reset if
      // the URL still has token/email, else show app.
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const email = params.get("email");
      if (token && email) {
        // Stay on reset screen
        setAuthScreen("reset");
      } else {
        setAuthScreen("login"); // not used for authenticated state, but just in case
      }
    } else {
      // Not authenticated: we already have authScreen determined
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
    setAuthScreen("login");
  };

  // ── Loading / Auth screens ──────────────────────────────────────────────────

  if (authScreen === "reset") {
    return (
      <ResetPasswordScreen
        // onSuccess={handleResetSuccess}
        // onBack={handleResetBack}
      />
    );
  }

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
