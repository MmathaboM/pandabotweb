import React, { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";
import learnerService from "../../services/LearnerServices";
import { useAcademyStore, ScheduleFilter } from "../../stores/AcademyStore";
import type { Schedule } from "../../types/learner";

// Filter tabs configuration
const FILTERS: { key: ScheduleFilter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
];

// Helper to get month name
const getMonthName = (month: number) =>
  new Date(2025, month).toLocaleString("default", { month: "long" });

// Helper to check if two dates are the same day
const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

// Helper to format time (HH:mm) from "HH:MM:SS" or "HH:MM"
const formatTime = (time?: string) => {
  if (!time) return "";
  const parts = time.split(":");
  return `${parts[0]}:${parts[1]}`;
};

const ScheduleDayModal: React.FC<{
  date: Date;
  schedules: Schedule[];
  attendanceMap: Record<number, boolean>; 
  onClose: () => void;
}> = ({ date, schedules, attendanceMap, onClose }) => {
  const dateStr = date.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: "20px",
          maxWidth: "400px",
          width: "100%",
          maxHeight: "80%",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
            {dateStr}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} color="#6B7280" />
          </button>
        </div>
        {schedules.length === 0 ? (
          <p style={{ color: "#6B7280" }}>No schedules on this day.</p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {schedules.map((s) => {
              const attended = attendanceMap[s.id] ?? false;
              const statusText = attended ? "Present ✅" : "Absent ❌";
              const statusColor = attended ? "#22C55E" : "#EF4444";

              // Use daily start/end times if available
              const start = s.daily_start_time
                ? formatTime(s.daily_start_time)
                : "";
              const end = s.daily_end_time ? formatTime(s.daily_end_time) : "";
              const timeDisplay =
                start && end ? `${start} – ${end}` : "Time not set";

              return (
                <div
                  key={s.id}
                  style={{
                    padding: "12px",
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                    borderLeft: `4px solid ${statusColor}`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#111827",
                      fontSize: "15px",
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6B7280",
                      marginTop: "4px",
                    }}
                  >
                    {timeDisplay}
                    {s.venue?.name && ` · ${s.venue.name}`}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: statusColor,
                      marginTop: "6px",
                    }}
                  >
                    {statusText}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main SchedulesPage ──────────────────────────────────────────────────
interface SchedulesPageProps {
  onBack: () => void;
}

const SchedulesPage: React.FC<SchedulesPageProps> = ({ onBack }) => {
  const {
    schedules,
    setSchedules,
    scheduleFilter,
    setScheduleFilter,
    isLoadingSchedules,
    setLoadingSchedules,
    todayAttendance,
  } = useAcademyStore();

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Build attendance map: scheduleId -> boolean (present)
  const attendanceMap: Record<number, boolean> = {};
  todayAttendance.forEach((item) => {
    // checked_in is a top-level property of TodayScheduleAttendance
    if (item.checked_in) {
      attendanceMap[item.schedule_id] = true;
    }
  });

  // Load schedules
  const loadSchedules = useCallback(async () => {
    if (useAcademyStore.getState().schedules.length === 0) {
      setLoadingSchedules(true);
    }
    setError(null);

    try {
      const data = await learnerService.getSchedules(scheduleFilter);
      setSchedules(data);
    } catch (err) {
      console.error("Failed to load schedules:", err);
      setError("Unable to load schedules. Please try again.");
    } finally {
      setLoadingSchedules(false);
    }
  }, [scheduleFilter, setSchedules, setLoadingSchedules]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  }, [loadSchedules]);

  // ─── Calendar rendering ────────────────────────────────────────────────
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  // Build array of day numbers with placeholder cells for padding
  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  // Group schedules by date (ISO string yyyy-mm-dd)
  // Each schedule may span multiple days, so we expand each into its date range.
  const schedulesByDate: Record<string, Schedule[]> = {};
  schedules.forEach((s) => {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    let current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().split("T")[0];
      if (!schedulesByDate[key]) schedulesByDate[key] = [];
      schedulesByDate[key].push(s);
      current.setDate(current.getDate() + 1);
    }
  });

  // Determine attendance status for a given date
  // Returns "present" if all schedules on that day are attended,
  // "absent" if all have attendance and at least one is absent,
  // "mixed" if some have attendance, some don't,
  // "unknown" if no attendance data for any schedule.
  const getDateAttendanceStatus = (
    date: Date,
  ): "present" | "absent" | "mixed" | "unknown" => {
    const key = date.toISOString().split("T")[0];
    const daySchedules = schedulesByDate[key] || [];
    if (daySchedules.length === 0) return "unknown";

    let hasAttendance = false;
    let allPresent = true;
    let anyAbsent = false;

    daySchedules.forEach((s) => {
      const attended = attendanceMap[s.id] === true;
      if (attended !== undefined) {
        hasAttendance = true;
        if (!attended) {
          allPresent = false;
          anyAbsent = true;
        }
      } else {
        // No attendance record for this schedule
        allPresent = false; // cannot be all present
      }
    });

    if (!hasAttendance) return "unknown";
    if (allPresent) return "present";
    if (anyAbsent) return "absent";
    return "mixed";
  };

  const handleDateClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#F3F4F6",
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .filter-scroll {
          scrollbar-width: thin;
          scrollbar-color: #FB8500 #E5E7EB;
        }
        .filter-scroll::-webkit-scrollbar {
          height: 2px;
        }
        .filter-scroll::-webkit-scrollbar-track {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .filter-scroll::-webkit-scrollbar-thumb {
          background: #FB8500;
          border-radius: 10px;
        }
        .day-cell {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          transition: background 0.15s;
          cursor: pointer;
          position: relative;
        }
        .day-cell:hover {
          background: rgba(251, 133, 0, 0.1);
        }
        .day-cell.today {
          border: 2px solid #FB8500;
        }
        .day-cell.present {
          background: #D1FAE5;
        }
        .day-cell.absent {
          background: #FEE2E2;
        }
        .day-cell.mixed {
          background: #FEF3C7; /* yellow for mixed */
        }
        .day-cell.unknown {
          background: transparent;
        }
        .day-cell .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-top: 2px;
          background: #FB8500;
        }
        .day-number {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }
        .day-cell.other-month .day-number {
          color: #9CA3AF;
        }
      `}</style>

      {/* Header */}
      {/* <div
        style={{
          background: "linear-gradient(135deg, #fb8500 0%, #e67600 100%)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={20} color="#fff" strokeWidth={2} />
        </button>
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 0.2,
            flex: 1,
          }}
        >
          My Schedules
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing || isLoadingSchedules}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: refreshing || isLoadingSchedules ? 0.5 : 1,
          }}
        >
          <RefreshCw
            size={16}
            color="#fff"
            strokeWidth={2}
            style={{
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          />
        </button>
      </div> */}

      {/* Filter Tabs */}
      <div
        className="filter-scroll"
        style={{
          display: "flex",
          gap: "8px",
          padding: "12px 16px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #E5E7EB",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {FILTERS.map((filter) => {
          const isActive = scheduleFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setScheduleFilter(filter.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                backgroundColor: isActive ? "#FB8500" : "#F3F4F6",
                color: isActive ? "#fff" : "#6B7280",
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FEE2E2",
            borderRadius: "12px",
            padding: "12px 16px",
            margin: "12px 16px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "#EF4444", fontSize: "14px" }}>{error}</span>
          <button
            onClick={loadSchedules}
            style={{
              backgroundColor: "#EF4444",
              color: "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Calendar */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          backgroundColor: "#fff",
          margin: "12px 16px 16px",
          borderRadius: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {/* Month Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(newMonth.getMonth() - 1);
              setCurrentMonth(newMonth);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "8px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#F3F4F6")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <ChevronLeft size={20} color="#6B7280" />
          </button>
          <span style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
            {getMonthName(month)} {year}
          </span>
          <button
            onClick={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(newMonth.getMonth() + 1);
              setCurrentMonth(newMonth);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "8px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#F3F4F6")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <ChevronRight size={20} color="#6B7280" />
          </button>
        </div>

        {/* Day headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "4px",
            marginBottom: "8px",
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                fontSize: "12px",
                fontWeight: 600,
                color: "#9CA3AF",
                padding: "4px 0",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "4px",
          }}
        >
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} />;
            }

            const date = new Date(year, month, day);
            const isToday = isSameDay(date, new Date());
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
            const key = date.toISOString().split("T")[0];
            const hasSchedule =
              !!schedulesByDate[key] && schedulesByDate[key].length > 0;

            let status: "present" | "absent" | "mixed" | "unknown" = "unknown";
            if (isPast && hasSchedule) {
              status = getDateAttendanceStatus(date);
            } else if (!isPast && hasSchedule) {
              // Upcoming or today - we show only the dot, no background
              status = "unknown";
            }

            let statusClass = "";
            if (status === "present") statusClass = "present";
            else if (status === "absent") statusClass = "absent";
            else if (status === "mixed") statusClass = "mixed";
            else statusClass = "unknown";

            const todayClass = isToday ? "today" : "";

            return (
              <div
                key={day}
                className={`day-cell ${statusClass} ${todayClass}`}
                onClick={() => hasSchedule && handleDateClick(day)}
                style={{ cursor: hasSchedule ? "pointer" : "default" }}
              >
                <span className="day-number">{day}</span>
                {hasSchedule && <div className="dot" />}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#D1FAE5",
              }}
            />
            <span style={{ fontSize: "12px", color: "#6B7280" }}>Present</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#FEE2E2",
              }}
            />
            <span style={{ fontSize: "12px", color: "#6B7280" }}>Absent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#FEF3C7",
              }}
            />
            <span style={{ fontSize: "12px", color: "#6B7280" }}>Mixed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "transparent",
                border: "1px solid #FB8500",
              }}
            />
            <span style={{ fontSize: "12px", color: "#6B7280" }}>
              Upcoming / No data
            </span>
          </div>
        </div>
      </div>

      {/* Modal for selected date */}
      {selectedDate && (
        <ScheduleDayModal
          date={selectedDate}
          schedules={
            schedulesByDate[selectedDate.toISOString().split("T")[0]] || []
          }
          attendanceMap={attendanceMap}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
};

export default SchedulesPage;
