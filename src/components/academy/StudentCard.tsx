import React, { useRef, useState, useEffect } from "react";
import { User, Mail, Phone, BookOpen, QrCode } from "lucide-react";
import { toPng } from "html-to-image";
import { useAuth } from "../../context/AuthContext";

interface StudentCardPageProps {
  onBack: () => void;
  onCardRef?: (ref: HTMLDivElement | null) => void;
}

const formatStudentNumber = (num?: string) => {
  if (!num) return "Not assigned";
  return num;
};

const StudentCardPage: React.FC<StudentCardPageProps> = ({
  onBack,
  onCardRef,
}) => {
  const { user } = useAuth(); // ✅ Get user from auth context, not the store
  const cardRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  // Expose the card ref to parent
  useEffect(() => {
    if (onCardRef) {
      onCardRef(cardRef.current);
    }
  }, [onCardRef]);

  if (!user) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>User not found</p>
        <button onClick={onBack} style={styles.backButton}>
          Go Back
        </button>
      </div>
    );
  }

  // Use correct field names from AuthUser
  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Not set";
  const program = user.programme || "No program assigned";
  const studentNumber = user.learner_code;
  const email = user.email;
  const phone = user.phone;
  const avatar = user.avatar;

  return (
    <div style={styles.container}>
      {/* The card itself (no header) */}
      <div style={styles.content}>
        <div style={styles.cardWrapper}>
          <div ref={cardRef} style={styles.card}>
            <div style={styles.cardBackground} />
            <div style={styles.cardInner}>
              <div style={styles.cardTop}>
                <div style={styles.logoPlaceholder}>🎓</div>
                <span style={styles.cardLabel}>STUDENT ID</span>
              </div>

              <div style={styles.photoSection}>
                <div style={styles.avatarCircle}>
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Profile"
                      style={styles.avatarImage}
                    />
                  ) : (
                    <User size={40} color="#fff" />
                  )}
                </div>
              </div>

              <div style={styles.detailsSection}>
                <h3 style={styles.studentName}>{fullName}</h3>
                <div style={styles.infoRow}>
                  <Mail size={14} color="#fff" />
                  <span style={styles.infoText}>{email}</span>
                </div>
                {phone && (
                  <div style={styles.infoRow}>
                    <Phone size={14} color="#fff" />
                    <span style={styles.infoText}>{phone}</span>
                  </div>
                )}
                <div style={styles.infoRow}>
                  <BookOpen size={14} color="#fff" />
                  <span style={styles.infoText}>{program}</span>
                </div>
              </div>

              <div style={styles.cardFooter}>
                <div style={styles.studentNumber}>
                  <span style={styles.studentNumberLabel}>Student #</span>
                  <span style={styles.studentNumberValue}>
                    {formatStudentNumber(studentNumber)}
                  </span>
                </div>
                <div style={styles.qrPlaceholder}>
                  <QrCode size={48} color="#081e36" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoTitle}>Your Digital Student ID</p>
          <p style={styles.infoText}>
            Present this card when required for identification at training
            venues or official events. Scan the QR code to view your profile on
            the CRM.
          </p>
        </div>

        <div style={styles.detailsCard}>
          <h4 style={styles.detailsTitle}>Card Details</h4>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Full Name</span>
            <span style={styles.detailValue}>{fullName}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Student Number</span>
            <span style={{ ...styles.detailValue, color: "#fb8500" }}>
              {studentNumber || "Not assigned"}
            </span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Email</span>
            <span style={styles.detailValue}>{email}</span>
          </div>
          {program && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Program</span>
              <span style={styles.detailValue}>{program}</span>
            </div>
          )}
          {phone && (
            <div style={{ ...styles.detailRow, borderBottomWidth: 0 }}>
              <span style={styles.detailLabel}>Phone</span>
              <span style={styles.detailValue}>{phone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Styles (unchanged) ────────────────────────────────────────────────────

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#F3F4F6",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    background: "#FB8500",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  iconButton: {
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
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: 0.2,
    margin: 0,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 16px",
  },
  cardWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 24,
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "hidden",
    boxShadow:
      "0 10px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.02)",
  },
  cardBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, #081e36 0%, #1a4a6f 100%)",
    zIndex: 0,
  },
  cardInner: {
    position: "relative",
    zIndex: 1,
    padding: 20,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logoPlaceholder: {
    fontSize: 32,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
  },
  photoSection: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #fff",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
  },
  detailsSection: {
    marginBottom: 20,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    justifyContent: "center",
  },
  infoText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid rgba(255,255,255,0.2)",
    paddingTop: 16,
  },
  studentNumber: {
    display: "flex",
    flexDirection: "column",
  },
  studentNumberLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
  },
  studentNumberValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
  },
  qrPlaceholder: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 12,
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#081e36",
    marginBottom: 8,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#081e36",
    marginBottom: 16,
    marginTop: 0,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #f0f2f5",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 400,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    textAlign: "right",
    maxWidth: "60%",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
  },
  backButton: {
    padding: "8px 16px",
    backgroundColor: "#fb8500",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default StudentCardPage;
