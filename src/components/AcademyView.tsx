import React, { useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { AcademyTab } from "../types";
import {
  useSchedules,
  usePayslips,
  useLearningModules,
} from "../hooks/useAcademy";
import {
  academyService,
  triggerBlobDownload,
} from "../services/academyService";
import LeaveView from "./academy/LeaveView";
interface Props {
  onBack: () => void;
}

const ACADEMY_ITEMS: {
  key: AcademyTab;
  label: string;
  emoji: string;
  bg: string;
}[] = [
  { key: "schedules", label: "Schedules", emoji: "📅", bg: "#EFF6FF" },
  { key: "payslips", label: "Payslips", emoji: "💰", bg: "#F0FDF4" },
  { key: "calendar", label: "Calendar", emoji: "🗓️", bg: "#FFF7ED" },
  { key: "student-card", label: "Student Card", emoji: "🪪", bg: "#F5F3FF" },
  { key: "leave", label: "Leave", emoji: "🏖️", bg: "#FEF2F2" },
  { key: "learning", label: "Learning Portal", emoji: "📚", bg: "#ECFDF5" },
];

const AcademyView: React.FC<Props> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<AcademyTab | null>(null);

  if (activeSection) {
    return (
      <AcademySection
        section={activeSection}
        onBack={() => setActiveSection(null)}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--surface-2)",
        zIndex: 200,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "var(--text-primary)",
            display: "flex",
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Academy</h2>
      </div>
      <div style={{ padding: "20px 16px 12px" }}>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Access your programme resources, records, and learning materials.
        </p>
      </div>
      <div className="academy-grid">
        {ACADEMY_ITEMS.map((item) => (
          <button
            key={item.key}
            className="academy-item"
            onClick={() => setActiveSection(item.key)}
          >
            <div className="academy-icon" style={{ background: item.bg }}>
              {item.emoji}
            </div>
            <span className="academy-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const AcademySection: React.FC<{ section: AcademyTab; onBack: () => void }> = ({
  section,
  onBack,
}) => {
  const titles: Record<AcademyTab, string> = {
    schedules: "Schedules",
    payslips: "Payslips",
    calendar: "Calendar",
    "student-card": "Student Card",
    leave: "Leave Management",
    learning: "Learning Portal",
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--surface-2)",
        zIndex: 300,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "var(--text-primary)",
            display: "flex",
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>{titles[section]}</h2>
      </div>
      {section === "schedules" && <SchedulesView />}
      {section === "payslips" && <PayslipsView />}
      {section === "calendar" && <CalendarView />}
      {section === "student-card" && <StudentCardView />}
      {section === "leave" && <LeaveView />}{" "}
      {/* 👈 now uses imported standalone LeaveView */}
      {section === "learning" && <LearningView />}
    </div>
  );
};

// ── Section views (all unchanged except LeaveView is now imported) ──────────

const SchedulesView: React.FC = () => {
  const { schedules, loading } = useSchedules();
  if (loading) return <Loader />;
  return (
    <div style={{ padding: 16 }}>
      {schedules.map((s) => (
        <div key={s.id} className={`schedule-item ${s.status}`}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 6,
            }}
          >
            <span className="schedule-subject">{s.subject}</span>
            <span className={`status-badge status-${s.status}`}>
              {s.status === "today"
                ? "Today"
                : s.status === "upcoming"
                  ? "Upcoming"
                  : "Done"}
            </span>
          </div>
          <div className="schedule-meta">
            <span>👨‍🏫 {s.facilitator}</span>
            <span>
              📅 {s.date} · {s.time}
            </span>
            <span>📍 {s.venue}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const PayslipsView: React.FC = () => {
  const { payslips, loading, download } = usePayslips();
  if (loading) return <Loader />;
  return (
    <div>
      <div className="info-box" style={{ margin: "16px 16px 0" }}>
        <p>
          💳 Stipend: <strong>R 8 500 / month</strong> · Paid on the 25th
        </p>
      </div>
      <div
        style={{
          margin: "16px",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        {payslips.map((p) => (
          <div key={p.id} className="payslip-row">
            <div>
              <div className="payslip-month">{p.month}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Gross R{p.gross.toLocaleString()} · Deductions R
                {p.deductions.toLocaleString()}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="payslip-net">R {p.net.toLocaleString()}</span>
              <button
                className="btn btn-outline btn-sm"
                style={{ display: "flex", alignItems: "center", gap: 4 }}
                onClick={() => download(p.id, p.month)}
              >
                <Download size={12} /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CalendarView: React.FC = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);
  const today = 9;
  const events = [3, 9, 11, 13, 18, 25];
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>June 2026</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline btn-sm">‹</button>
            <button className="btn btn-outline btn-sm">›</button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 8,
          }}
        >
          {days.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                padding: "4px 0",
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
          }}
        >
          {dates.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                padding: "7px 2px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: d === today ? 700 : 400,
                background:
                  d === today
                    ? "var(--primary)"
                    : events.includes(d)
                      ? "var(--primary-light)"
                      : "transparent",
                color:
                  d === today
                    ? "white"
                    : events.includes(d)
                      ? "var(--primary-dark)"
                      : "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              {d}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="section-header">
          <span className="section-title">Upcoming events</span>
        </div>
        {[
          {
            date: "Wed 11 Jun",
            title: "React & TypeScript Workshop",
            type: "Training",
          },
          {
            date: "Fri 13 Jun",
            title: "Professional Communication",
            type: "Training",
          },
          { date: "Fri 25 Jun", title: "Stipend payment", type: "Payroll" },
        ].map((ev, i) => (
          <div
            key={i}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.title}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                {ev.date}
              </div>
            </div>
            <span className="tag primary">{ev.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StudentCardView: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await academyService.downloadStudentCard();
      triggerBlobDownload(blob, "StudentCard.pdf");
    } catch {
      alert("Could not download student card. Please try again.");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div>
      {/* <div className="student-card">
        <div className="student-card-logo">🐼 SkillsPanda</div>
        <div className="student-card-avatar">MM</div>
        <div className="student-card-name">Mmathabo Motsepe</div>
        <div className="student-card-sub">Software Development · Cohort 12</div>
        <div className="student-card-grid">
          {[
            { label: "Learner ID", value: "SP-2024-7743" },
            { label: "ID Number", value: "9****** **** *" },
            { label: "Start Date", value: "Jan 2026" },
            { label: "End Date", value: "Sep 2026" },
            { label: "SETA", value: "MICT SETA" },
            { label: "NQF Level", value: "Level 5" },
          ].map((f) => (
            <div key={f.label} className="student-card-field">
              <label>{f.label}</label>
              <span>{f.value}</span>
            </div>
          ))}
        </div>
      </div> */}
      <div style={{ padding: "0 16px" }}>
        <button
          className="btn btn-primary"
          disabled={downloading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onClick={handleDownload}
        >
          <Download size={16} />{" "}
          {downloading ? "Downloading…" : "Download Card"}
        </button>
      </div>
    </div>
  );
};

// ── The imported LeaveView replaces the old inline one ──────────────────────

const LearningView: React.FC = () => {
  const { modules, loading } = useLearningModules();
  if (loading) return <Loader />;
  const overall = modules.length
    ? Math.round(modules.reduce((a, m) => a + m.progress, 0) / modules.length)
    : 0;
  return (
    <div style={{ padding: 16 }}>
      <div className="info-box" style={{ margin: "0 0 16px" }}>
        <p>
          📈 Overall progress: <strong>{overall}%</strong> · Keep going!
        </p>
      </div>
      {modules.map((m) => (
        <div key={m.id} className="learning-module">
          <div
            className="module-icon"
            style={{ background: m.bg ?? "#F5F5F5" }}
          >
            {m.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="module-title">{m.title}</div>
            <div className="module-sub">{m.sub}</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${m.progress}%` }}
              />
            </div>
            <div className="progress-label">{m.progress}% complete</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Loader: React.FC = () => (
  <div className="empty-state" style={{ padding: 40 }}>
    <span style={{ fontSize: 28 }}>⏳</span>
    <p className="empty-title" style={{ marginTop: 8 }}>
      Loading…
    </p>
  </div>
);

export default AcademyView;
