import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import LeaveService from "../../services/LearnerLeaveService";
import type {
  LeaveApplication,
  LeaveBalance,
  LeaveType,
} from "../../types/leave";

const ORANGE = "#fb8500";
const ORANGE_D = "#e85d04";
const ORANGE_L = "#fff3e0";

const STATUS_CFG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    Icon: React.FC<{ size?: number }>;
  }
> = {
  pending: { label: "Pending", color: "#92400e", bg: "#fef3c7", Icon: Clock },
  approved: {
    label: "Approved",
    color: "#065f46",
    bg: "#d1fae5",
    Icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "#991b1b",
    bg: "#fee2e2",
    Icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "#374151",
    bg: "#f3f4f6",
    Icon: XCircle,
  },
};

// ─── Small UI helpers ─────────────────────────────────────────────────────────
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 4,
};
const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  color: "var(--text-primary)",
};

const Loader: React.FC<{ text?: string }> = ({ text = "Loading…" }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: 40,
      gap: 12,
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: `3px solid ${ORANGE_L}`,
        borderTopColor: ORANGE,
        animation: "spin 0.8s linear infinite",
      }}
    />
    <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{text}</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Toast: React.FC<{
  message: string;
  type: "success" | "error";
  onDone: () => void;
}> = ({ message, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        background: type === "success" ? "#065f46" : "#991b1b",
        color: "#fff",
        borderRadius: 10,
        padding: "11px 18px",
        fontSize: 13,
        fontWeight: 500,
        zIndex: 9999,
        boxShadow: "0 4px 16px rgba(0,0,0,.25)",
        maxWidth: "calc(100vw - 32px)",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {type === "success" ? (
        <CheckCircle size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {message}
    </div>
  );
};

// ─── Balance cards ────────────────────────────────────────────────────────────
const BalanceCard: React.FC<{
  balance: LeaveBalance;
  typeName: string;
  color: string;
}> = ({ balance, typeName, color }) => {
  const pct =
    balance.entitlement > 0
      ? Math.min(100, (balance.used / balance.entitlement) * 100)
      : 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "14px 16px",
        flex: 1,
        minWidth: 130,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          {typeName}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color,
            background: `${color}18`,
            borderRadius: 20,
            padding: "2px 8px",
          }}
        >
          {balance.available} left
        </span>
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "var(--text-primary)",
          lineHeight: 1,
        }}
      >
        {balance.available}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          marginTop: 2,
          marginBottom: 8,
        }}
      >
        of {balance.entitlement} days
      </div>
      <div
        style={{ height: 5, borderRadius: 3, background: "var(--surface-2)" }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 3,
            background: pct > 80 ? "#ef4444" : color,
            transition: "width .4s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          Used {balance.used}
        </span>
        {balance.pending > 0 && (
          <span style={{ fontSize: 10, color: "#d97706" }}>
            Pending {balance.pending}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Application card ─────────────────────────────────────────────────────────
const AppCard: React.FC<{
  app: LeaveApplication;
  onCancel: (id: number) => void;
  cancelling: boolean;
}> = ({ app, onCancel, cancelling }) => {
  const cfg = STATUS_CFG[app.status] ?? STATUS_CFG.pending;
  const { Icon } = cfg;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
        }}
      >
        <div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            {app.leave_type_label || app.leave_type}
          </span>
          {app.is_half_day && (
            <span
              style={{
                fontSize: 10,
                marginLeft: 6,
                color: ORANGE_D,
                background: ORANGE_L,
                borderRadius: 20,
                padding: "1px 7px",
                fontWeight: 600,
              }}
            >
              Half day
            </span>
          )}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: cfg.color,
            background: cfg.bg,
            borderRadius: 20,
            padding: "3px 10px",
          }}
        >
          <Icon size={11} /> {cfg.label}
        </span>
      </div>

      <div
        style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}
      >
        {formatDate(app.start_date)} – {formatDate(app.end_date)}
        {" · "}
        <strong style={{ color: "var(--text-secondary)" }}>
          {app.days_requested} day{app.days_requested !== 1 ? "s" : ""}
        </strong>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          marginBottom: app.rejection_reason ? 8 : 0,
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
        }}
      >
        {app.reason}
      </div>

      {app.rejection_reason && (
        <div
          style={{
            background: "#fee2e2",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "#991b1b",
            marginTop: 6,
          }}
        >
          <strong>Reason for rejection:</strong> {app.rejection_reason}
        </div>
      )}

      {app.documents && app.documents.length > 0 && (
        <div
          style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {app.documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.file_path}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: ORANGE_D,
                background: ORANGE_L,
                borderRadius: 6,
                padding: "3px 8px",
                textDecoration: "none",
              }}
            >
              <FileText size={10} /> {doc.file_name}
            </a>
          ))}
        </div>
      )}

      {app.status === "pending" && (
        <button
          onClick={() => onCancel(app.id)}
          disabled={cancelling}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px 0",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "#991b1b",
            fontSize: 12,
            fontWeight: 600,
            cursor: cancelling ? "not-allowed" : "pointer",
            opacity: cancelling ? 0.6 : 1,
          }}
        >
          {cancelling ? "Cancelling…" : "Cancel application"}
        </button>
      )}
    </div>
  );
};

// ─── Apply form ───────────────────────────────────────────────────────────────
interface ApplyFormProps {
  leaveTypes: LeaveType[];
  onSubmit: (data: {
    leave_type: string; // ✅ changed from leave_type_id
    start_date: string;
    end_date: string;
    reason: string;
    is_half_day: boolean;
    documents: File[];
  }) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

const ApplyForm: React.FC<ApplyFormProps> = ({
  leaveTypes,
  onSubmit,
  onCancel,
  submitting,
}) => {
  // Use string ID because LeaveType.id is now a string
  const [leaveType, setLeaveType] = useState<string>(leaveTypes[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedType = leaveTypes.find((t) => t.id === leaveType);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
  };

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const validate = (): string => {
    if (!leaveType) return "Please select a leave type.";
    if (!startDate) return "Start date is required.";
    if (!endDate) return "End date is required.";
    if (endDate < startDate) return "End date must be on or after start date.";
    if (!reason.trim() || reason.trim().length < 5)
      return "Please give a reason (at least 5 characters).";
    if (selectedType?.requires_documentation && files.length === 0)
      return `${selectedType.name} requires supporting documentation.`;
    return "";
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    await onSubmit({
      leave_type: leaveType, // ✅ send the string
      start_date: startDate,
      end_date: endDate,
      reason,
      is_half_day: isHalfDay,
      documents: files,
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1.5px solid ${ORANGE}30`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          New leave application
        </span>
        <button
          onClick={onCancel}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
          }}
        >
          <X size={18} />
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 12,
            color: "#991b1b",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* Leave type */}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Leave type</label>
        <select
          style={inp}
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
        >
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {selectedType?.description && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {selectedType.description}
          </p>
        )}
      </div>

      {/* Dates */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <label style={lbl}>From</label>
          <input
            style={inp}
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label style={lbl}>To</label>
          <input
            style={inp}
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Half day toggle */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          onClick={() => setIsHalfDay((v) => !v)}
          style={{
            width: 38,
            height: 22,
            borderRadius: 11,
            background: isHalfDay ? ORANGE : "var(--border)",
            position: "relative",
            cursor: "pointer",
            transition: "background .2s",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 3,
              left: isHalfDay ? 19 : 3,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#fff",
              transition: "left .2s",
              boxShadow: "0 1px 3px rgba(0,0,0,.2)",
            }}
          />
        </div>
        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
          Half day
        </span>
      </div>

      {/* Reason */}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Reason</label>
        <textarea
          style={{ ...inp, resize: "none", height: 72, lineHeight: 1.5 }}
          placeholder="Briefly explain the reason for your leave…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {/* Document upload */}
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>
          Supporting documents
          {selectedType?.requires_documentation && (
            <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
          )}
        </label>
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%",
            padding: "10px 0",
            border: `1.5px dashed ${ORANGE}50`,
            borderRadius: 8,
            background: ORANGE_L,
            color: ORANGE_D,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Upload size={14} /> Attach files (PDF, JPG, PNG — max 5 MB each)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          hidden
          onChange={handleFiles}
        />
        {files.length > 0 && (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--surface-2)",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "80%",
                  }}
                >
                  <FileText size={11} style={{ marginRight: 4 }} />
                  {f.name}
                </span>
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#ef4444",
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: "100%",
          padding: "12px 0",
          background: submitting
            ? "#ccc"
            : `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          cursor: submitting ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? "Submitting…" : "Submit application"}
      </button>
    </div>
  );
};

// ─── Main LeaveView ───────────────────────────────────────────────────────────
const VIEWS = ["balance", "history", "apply"] as const;
type View = (typeof VIEWS)[number];

const LeaveView: React.FC = () => {
  const [view, setView] = useState<View>("balance");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, apps, types] = await Promise.all([
        LeaveService.getLeaveBalances(),
        LeaveService.getLeaveApplications(),
        LeaveService.getLeaveTypes(),
      ]);
      setBalances(bal);
      setApplications(apps);
      setLeaveTypes(types);
    } catch {
      showToast("Could not load leave data. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (data: {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    is_half_day: boolean;
    documents: File[];
  }) => {
    setSubmitting(true);
    try {
      await LeaveService.submitLeaveApplication(data);
      showToast("Leave application submitted successfully.", "success");
      setView("history");
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to submit application.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Cancel this leave application?")) return;
    setCancellingId(id);
    try {
      await LeaveService.cancelLeaveApplication(id);
      showToast("Application cancelled.", "success");
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)),
      );
    } catch {
      showToast("Could not cancel the application.", "error");
    } finally {
      setCancellingId(null);
    }
  };

  // Helper: humanise balance leave_type key
  const typeName = (b: LeaveBalance): string => {
    if (b.leave_type === "learner_annual") return "Annual Leave";
    if (b.leave_type === "sick") return "Sick Leave";
    return b.leave_type ?? "Leave";
  };

  const typeColor = (b: LeaveBalance): string => {
    if (b.leave_type === "learner_annual") return ORANGE;
    if (b.leave_type === "sick") return "#3b82f6";
    return "#6b7280";
  };

  const filteredApps =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);

  if (loading) return <Loader text="Fetching your leave data…" />;

  return (
    <div style={{ paddingBottom: 32 }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        {(["balance", "history", "apply"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              flex: 1,
              padding: "12px 0",
              border: "none",
              background: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: view === v ? ORANGE_D : "var(--text-muted)",
              borderBottom:
                view === v
                  ? `2.5px solid ${ORANGE}`
                  : "2.5px solid transparent",
              transition: "color .15s, border-color .15s",
            }}
          >
            {v === "balance"
              ? "Balances"
              : v === "history"
                ? "My Applications"
                : "Apply"}
          </button>
        ))}
      </div>

      {/* ── Balance tab ── */}
      {view === "balance" && (
        <div style={{ padding: 16 }}>
          {balances.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              No leave balances found for this cycle year.
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 14,
                  lineHeight: 1.5,
                }}
              >
                Balances reflect your current cycle year. Pending applications
                are counted separately.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {balances.map((b) => (
                  <BalanceCard
                    key={b.id}
                    balance={b}
                    typeName={typeName(b)}
                    color={typeColor(b)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Quick apply CTA */}
          <button
            onClick={() => setView("apply")}
            style={{
              marginTop: 20,
              width: "100%",
              padding: "13px 0",
              background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            Apply for leave <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── History tab ── */}
      {view === "history" && (
        <div style={{ padding: 16 }}>
          {/* Status filter chips */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: `1.5px solid ${filter === f ? ORANGE : "var(--border)"}`,
                  background: filter === f ? ORANGE_L : "var(--surface)",
                  color: filter === f ? ORANGE_D : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredApps.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 24px",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              {filter === "all"
                ? "No leave applications yet."
                : `No ${filter} applications.`}
              <br />
              <button
                onClick={() => setView("apply")}
                style={{
                  marginTop: 14,
                  padding: "9px 20px",
                  background: ORANGE_L,
                  color: ORANGE_D,
                  border: `1px solid ${ORANGE}50`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply for leave
              </button>
            </div>
          ) : (
            filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onCancel={handleCancel}
                cancelling={cancellingId === app.id}
              />
            ))
          )}
        </div>
      )}

      {/* ── Apply tab ── */}
      {view === "apply" && (
        <div style={{ padding: 16 }}>
          {leaveTypes.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              No leave types are configured. Please contact your administrator.
            </div>
          ) : (
            <ApplyForm
              leaveTypes={leaveTypes}
              onSubmit={handleSubmit}
              onCancel={() => setView("balance")}
              submitting={submitting}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveView;
