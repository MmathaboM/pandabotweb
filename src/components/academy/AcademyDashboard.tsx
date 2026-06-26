import React, { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CalendarOff,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  IdCard,
  MapPin,
  Wallet,
  ChevronRight,
  AlertCircle,
  Download,
  Share2,
} from "lucide-react";
import { toPng } from "html-to-image";
import learnerService from "../../services/LearnerServices";
import { useAcademyStore } from "../../stores/AcademyStore";
import SchedulesPage from "./SchedulesPage";
import StudentCardPage from "./StudentCard";
import PageHeader from "../../components/PageHeader";
import LeaveView from "./LeaveView";
import { useAuth } from "../../context/AuthContext";
interface AcademyDashboardProps {
  onClose: () => void;
}

type InternalView = "dashboard" | "schedules" | "studentCard" | "leave";

const AcademyDashboard: React.FC<AcademyDashboardProps> = ({ onClose }) => {
  // ✅ Get user from Auth Context instead of the store
  const { user, isAuthenticated } = useAuth();
  const store = useAcademyStore();
  const [currentView, setCurrentView] = useState<InternalView>("dashboard");
  const [cardRef, setCardRef] = useState<HTMLDivElement | null>(null);

  const {
    todayAttendance,
    schedules,
    earnings,
    payments,
    setSchedules,
    setEarnings,
    setPayments,
    setLoadingSchedules,
    setLoadingEarnings,
    setLoadingPayments,
    isLoadingSchedules,
    isLoadingEarnings,
    isLoadingPayments,
    updateLastSync,
    setTodayAttendance,
  } = store;

  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const isCheckedIn = todayAttendance.some((s) => s.checked_in);
  const checkinTime = todayAttendance.find((s) => s.checked_in)?.attendance
    ?.checkin_time;
  const activeSchedule =
    todayAttendance.find((s) => s.checked_in) || todayAttendance[0];
  const pendingPaymentsCount = payments.filter(
    (p) => p.status === "pending",
  ).length;

  const isLoading =
    isLoadingSchedules || isLoadingEarnings || isLoadingPayments;

  const pendingAmount =
    earnings?.summary && (earnings.summary as any).pending !== undefined
      ? (earnings.summary as any).pending
      : 0;

  // ── Clean up when unauthenticated ──
  useEffect(() => {
    if (!isAuthenticated) {
      // Optionally reset the academy store if you have a reset method
      // store.reset?.();
    }
  }, [isAuthenticated, store]);

  // ── Download/Share handlers ──
  const handleDownloadCard = async () => {
    if (!cardRef) return;
    try {
      const dataUrl = await toPng(cardRef, { quality: 1.0, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "student-card.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download card image.");
    }
  };

  const handleShareCard = async () => {
    if (!cardRef) return;
    try {
      const dataUrl = await toPng(cardRef, { quality: 1.0, pixelRatio: 2 });
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "student-card.png", {
          type: "image/png",
        });
        await navigator.share({ title: "My Student Card", files: [file] });
      } else {
        const link = document.createElement("a");
        link.download = "student-card.png";
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error("Share failed:", error);
      alert("Could not share the card.");
    }
  };

  const loadData = useCallback(async () => {
    setError(null);

    try {
      const attendanceData = await learnerService.getTodayAttendance();
      setTodayAttendance(attendanceData.schedules);
    } catch (err) {
      console.error("[Academy] Failed to load attendance:", err);
    }

    setLoadingSchedules(true);
    try {
      const schedulesData = await learnerService.getSchedules("active");
      setSchedules(schedulesData);
    } catch (err) {
      console.error("[Academy] Failed to load schedules:", err);
      setError("Unable to load schedules. Pull down to retry.");
    } finally {
      setLoadingSchedules(false);
    }

    setLoadingEarnings(true);
    try {
      const earningsData = await learnerService.getEarnings();
      setEarnings({
        summary: earningsData.summary,
        bySchedule: earningsData.by_schedule,
        bankAccount: earningsData.bank_account,
      });
    } catch (err) {
      console.error("[Academy] Failed to load earnings:", err);
    } finally {
      setLoadingEarnings(false);
    }

    setLoadingPayments(true);
    try {
      const paymentsData = await learnerService.getPaymentHistory(
        undefined,
        1,
        5,
      );
      setPayments(paymentsData.data);
    } catch (err) {
      console.error("[Academy] Failed to load payments:", err);
    } finally {
      setLoadingPayments(false);
    }

    updateLastSync();
  }, [
    setTodayAttendance,
    setSchedules,
    setEarnings,
    setPayments,
    setLoadingSchedules,
    setLoadingEarnings,
    setLoadingPayments,
    updateLastSync,
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCheckin = async () => {
    if (!activeSchedule || checkingIn) return;
    setCheckingIn(true);
    try {
      if (isCheckedIn) {
        const attendanceId = activeSchedule.attendance?.id;
        if (!attendanceId) {
          throw new Error("No attendance record found for checkout");
        }
        await learnerService.checkout({
          attendance_id: attendanceId,
          latitude: 0,
          longitude: 0,
        });
      } else {
        await learnerService.checkin({
          schedule_id: activeSchedule.schedule_id,
          latitude: 0,
          longitude: 0,
        });
      }
      const attendanceData = await learnerService.getTodayAttendance();
      setTodayAttendance(attendanceData.schedules);
    } catch (err) {
      console.error("[Academy] Check-in/out failed:", err);
    } finally {
      setCheckingIn(false);
    }
  };

  const getHeaderProps = () => {
    switch (currentView) {
      case "schedules":
        return {
          title: "My Schedules",
          onBack: () => setCurrentView("dashboard"),
          onRightClick: loadData,
          rightDisabled: isLoading,
          rightSpinning: isLoading,
        };
      case "studentCard":
        return {
          title: "Student Card",
          onBack: () => setCurrentView("dashboard"),
          onRightClick: undefined,
          rightContent: (
            <>
              <button
                onClick={handleDownloadCard}
                style={styles.headerIconButton}
                aria-label="Download"
              >
                <Download size={18} color="#fff" />
              </button>
              <button
                onClick={handleShareCard}
                style={styles.headerIconButton}
                aria-label="Share"
              >
                <Share2 size={18} color="#fff" />
              </button>
            </>
          ),
        };
      case "leave":
        return {
          title: "Leave Management",
          onBack: () => setCurrentView("dashboard"),
          onRightClick: undefined,
        };
      default:
        return {
          title: "Academy",
          onBack: onClose,
          onRightClick: loadData,
          rightDisabled: isLoading,
          rightSpinning: isLoading,
        };
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case "schedules":
        return <SchedulesPage onBack={() => setCurrentView("dashboard")} />;
      case "studentCard":
        return (
          <StudentCardPage
            onBack={() => setCurrentView("dashboard")}
            onCardRef={setCardRef}
          />
        );
      case "leave":
        return <LeaveView />;
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => (
    <>
      {/* Welcome card – now uses `user` from AuthContext */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: "18px 20px",
          marginBottom: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 6,
          }}
        >
          Welcome back, {user?.first_name ?? "User"} {/* ✅ fixed field name */}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            color: "#6B7280",
            fontWeight: 500,
          }}
        >
          <Calendar size={14} color="#6B7280" strokeWidth={1.8} />
          {isLoadingSchedules ? (
            <div
              style={{
                width: 120,
                height: 14,
                borderRadius: 4,
                background: "#E5E7EB",
              }}
            />
          ) : (
            `${schedules.length} active schedule${schedules.length !== 1 ? "s" : ""}`
          )}
        </div>
      </div>

      {/* Check-in card */}
      {(activeSchedule || isLoadingSchedules) && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {isLoadingSchedules ? (
            <div
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                background: "#E5E7EB",
              }}
            />
          ) : activeSchedule ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {isCheckedIn ? (
                  <CheckCircle size={18} color="#22C55E" strokeWidth={2} />
                ) : (
                  <Clock size={18} color="#9CA3AF" strokeWidth={2} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#111827",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activeSchedule.schedule_title}
                  </div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                    {isCheckedIn
                      ? `Checked in at ${checkinTime}`
                      : `${activeSchedule.start_time ?? "–"} – ${activeSchedule.end_time ?? "–"}`}
                  </div>
                </div>
              </div>
              <button
                className="checkin-btn"
                disabled={checkingIn}
                onClick={handleToggleCheckin}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  borderRadius: 20,
                  padding: "8px 14px",
                  border: "none",
                  cursor: checkingIn ? "not-allowed" : "pointer",
                  flexShrink: 0,
                  backgroundColor: isCheckedIn ? "#FEE2E2" : "#FB8500",
                  opacity: checkingIn ? 0.6 : 1,
                }}
              >
                <MapPin
                  size={13}
                  color={isCheckedIn ? "#EF4444" : "#fff"}
                  strokeWidth={2}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isCheckedIn ? "#EF4444" : "#fff",
                  }}
                >
                  {checkingIn ? "…" : isCheckedIn ? "Check out" : "Check in"}
                </span>
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#EF4444",
            fontSize: 13,
            marginBottom: 12,
            padding: "10px 14px",
            backgroundColor: "#FEF2F2",
            borderRadius: 10,
          }}
        >
          <AlertCircle size={15} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={loadData}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#EF4444",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Earnings banner */}
      {earnings && !isLoadingEarnings && (
        <div
          style={{
            background: "linear-gradient(135deg, #FB8500 0%, #e67600 100%)",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 14,
            boxShadow: "0 4px 12px rgba(251,133,0,0.25)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.8)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Total Earned
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
                marginTop: 2,
              }}
            >
              R{earnings.summary.total_earned.toLocaleString()}
            </div>
          </div>
          {pendingAmount > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
                Pending
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                R{pendingAmount.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingBottom: 40,
        }}
      >
        {isLoadingSchedules && schedules.length === 0 ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: 74,
                borderRadius: 16,
                background:
                  "linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)",
                backgroundSize: "800px 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          ))
        ) : (
          <>
            <ActionCard
              icon={Calendar}
              iconColor="#3B82F6"
              iconBgColor="#3B82F615"
              title="My Schedules"
              subtitle={`${schedules.length} active`}
              onClick={() => setCurrentView("schedules")}
            />
            <ActionCard
              icon={Wallet}
              iconColor="#22C55E"
              iconBgColor="#22C55E15"
              title="My Earnings"
              subtitle={
                earnings?.summary?.total_earned
                  ? `R${earnings.summary.total_earned.toLocaleString()}`
                  : "View earnings"
              }
              onClick={() => console.log("Navigate to earnings")}
            />
            <ActionCard
              icon={FileText}
              iconColor="#FB8500"
              iconBgColor="#FB850015"
              title="My Payslips"
              subtitle="Payment history"
              badge={pendingPaymentsCount}
              onClick={() => console.log("Navigate to payslips")}
            />
            <ActionCard
              icon={IdCard}
              iconColor="#6B7280"
              iconBgColor="#6B728015"
              title="Student Card"
              subtitle="Digital ID"
              onClick={() => setCurrentView("studentCard")}
            />
            <ActionCard
              icon={CalendarOff}
              iconColor="#9333EA"
              iconBgColor="#9333EA15"
              title="Leave Management"
              subtitle="Apply for leave"
              onClick={() => setCurrentView("leave")}
            />
            <ActionCard
              icon={GraduationCap}
              iconColor="#0891B2"
              iconBgColor="#0891B215"
              title="Learning Portal"
              subtitle="Access online courses"
              rightIcon={ExternalLink}
              onClick={() =>
                window.open("https://learn.skillspanda.co.za", "_blank")
              }
            />
          </>
        )}
      </div>
    </>
  );

  const headerProps = getHeaderProps();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
        backgroundColor: "#F3F4F6",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 1000,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .checkin-btn:active { opacity: 0.8; }
      `}</style>

      <PageHeader
        title={headerProps.title}
        onBack={headerProps.onBack}
        onRightClick={headerProps.onRightClick}
        rightDisabled={headerProps.rightDisabled}
        rightSpinning={headerProps.rightSpinning}
        rightContent={headerProps.rightContent}
      />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px 0",
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
};

// ─── ActionCard helper ──
const ActionCard: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  badge?: number;
  rightIcon?: React.ElementType;
  onClick?: () => void;
}> = ({
  icon: Icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  badge,
  rightIcon: RightIcon,
  onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      border: "none",
      cursor: "pointer",
      width: "100%",
      textAlign: "left",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      transition: "opacity 0.15s",
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 13,
        backgroundColor: iconBgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={22} color={iconColor} strokeWidth={1.8} />
    </div>
    <div
      style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
    >
      <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
        {title}
      </span>
      <span style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>
        {subtitle}
      </span>
    </div>
    <div
      style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
    >
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            backgroundColor: "#FB8500",
            color: "#fff",
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5px",
          }}
        >
          {badge}
        </span>
      )}
      {RightIcon ? (
        <RightIcon size={16} color="#9CA3AF" strokeWidth={1.8} />
      ) : (
        <ChevronRight size={16} color="#9CA3AF" strokeWidth={1.8} />
      )}
    </div>
  </button>
);

const styles = {
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fff",
    transition: "background 0.15s",
  },
};

export default AcademyDashboard;
