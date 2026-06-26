import React, { useState } from "react";
import PageHeader from "../../components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HelpItemProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  onClick: () => void;
}

interface HelpCenterProps {
  onClose?: () => void; // for closing a modal/drawer
  onBack?: () => void; // custom back handler (overrides onClose & history)
}

interface FaqItem {
  question: string;
  answer: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MANUAL_URL =
  "https://crm.skillspanda.co.za/videos/guides/pandaBot_User_Manual.pdf";

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Why can't I access the Academy?",
    answer:
      "Academy access is for registered students and learners enrolled in our programs. If you're enrolled but can't access it, please contact support with your enrollment details.",
  },
  {
    question: "How do I update my profile?",
    answer:
      "Go to your Profile tab at the bottom of the screen, tap 'Edit Profile', make your changes, and tap Save. You can update your photo, name, contact details, and more.",
  },
  {
    question: "How do I apply for opportunities?",
    answer:
      "Tap the Opportunities card on the home screen or use the Opportunities tab. Browse available positions, tap on one you're interested in, and follow the application instructions.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can chat with our support team by going to the Chat tab and selecting Support, or email us at support@skillspanda.co.za. We typically respond within 24 hours.",
  },
];

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
const IconMail = ({ color }: { color: string }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const IconChat = ({ color }: { color: string }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconHelp = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconChevronRight = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconChevronDown = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconChevronUp = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const IconX = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconExternalLink = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const IconDownload = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────
const HelpItem: React.FC<HelpItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  onClick,
}) => (
  <button className="help-item" onClick={onClick}>
    <span className="help-icon" style={{ backgroundColor: iconColor + "18" }}>
      {icon}
    </span>
    <span className="help-content">
      <span className="help-title">{title}</span>
      <span className="help-desc">{description}</span>
    </span>
    <IconChevronRight color="#9AA5B1" />
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const HelpCenter: React.FC<HelpCenterProps> = ({ onClose, onBack }) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [manualVisible, setManualVisible] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);

  const toggleFaq = (i: number) => setExpandedFaq(expandedFaq === i ? null : i);

  const handleEmailSupport = () => {
    window.location.href =
      "mailto:support@skillspanda.co.za?subject=Help%20Request";
  };

  const handleOpenManualExternal = () => window.open(MANUAL_URL, "_blank");

  const handleDownloadManual = () => {
    const a = document.createElement("a");
    a.href = MANUAL_URL;
    a.download = "pandaBot_User_Manual.pdf";
    a.target = "_blank";
    a.click();
  };

  // ─── Back handler ──────────────────────────────────────────────────────────
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onClose) {
      onClose();
    } else {
      history.back();
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; }

        /* ── Fixed overlay container ── */
        .hc-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background: #F8F9FA;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
        }

        /* ── Scrollable content ── */
        .hc-scroll {
          flex: 1;
          overflow-y: auto;
          max-width: 720px;
          width: 100%;
          margin: 0 auto;
          padding: 28px 20px 80px;
        }

        .hc-intro {
          font-size: 14px;
          color: #616E7C;
          line-height: 1.6;
          margin-bottom: 28px;
        }

        .hc-section { margin-bottom: 28px; }
        .hc-section-title {
          font-size: 11px;
          font-weight: 600;
          color: #9AA5B1;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 10px;
        }

        .hc-card {
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid #E4E7EB;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        .help-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .help-item:hover { background: #F8F9FA; }
        .help-icon {
          width: 44px; height: 44px; flex-shrink: 0;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .help-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .help-title {
          font-size: 15px;
          font-weight: 600;
          color: #1F2933;
        }
        .help-desc {
          font-size: 13px;
          color: #616E7C;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hc-divider {
          height: 1px;
          background: #E4E7EB;
          margin: 0 16px;
        }

        .faq-item { border: none; background: transparent; width: 100%; text-align: left; }
        .faq-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .faq-trigger:hover { background: #F8F9FA; }
        .faq-question {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: #1F2933;
          line-height: 1.4;
        }
        .faq-answer {
          font-size: 13.5px;
          color: #616E7C;
          line-height: 1.65;
          padding: 0 16px 16px 44px;
          animation: fadeIn 0.18s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* ── PDF Modal ── */
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
          animation: backdropIn 0.2s ease;
        }
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-sheet {
          background: #FFFFFF;
          border-top-left-radius: 22px;
          border-top-right-radius: 22px;
          width: 100%;
          max-width: 720px;
          padding: 16px 16px 28px;
          animation: sheetUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes sheetUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 14px;
        }
        .modal-title {
          flex: 1;
          font-size: 16px;
          font-weight: 700;
          color: #1F2933;
        }
        .modal-close-btn {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: #F5F7FA;
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.12s;
        }
        .modal-close-btn:hover { background: #E4E7EB; }

        .pdf-wrap {
          height: 420px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #E4E7EB;
          background: #F8F9FA;
          position: relative;
        }
        .pdf-wrap iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
        .pdf-loading {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px;
          background: rgba(255,255,255,0.85);
        }
        .spinner {
          width: 28px; height: 28px;
          border: 3px solid #E4E7EB;
          border-top-color: #fb8500;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pdf-loading-text { font-size: 13px; color: #616E7C; font-weight: 500; }

        .modal-actions { display: flex; gap: 12px; margin-top: 14px; }
        .action-btn {
          flex: 1; height: 46px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s, transform 0.1s;
        }
        .action-btn:hover { opacity: 0.88; }
        .action-btn:active { transform: scale(0.97); }
        .btn-primary { background: #fb8500; color: #FFFFFF; }
        .btn-secondary { background: #F5F7FA; color: #1F2933; border: 1px solid #E4E7EB; }

        .modal-hint {
          margin-top: 10px;
          font-size: 12px;
          color: #9AA5B1;
          text-align: center;
        }

        @media (max-width: 480px) {
          .hc-scroll { padding: 20px 16px 80px; }
          .pdf-wrap { height: 300px; }
        }
      `}</style>

      <div className="hc-root">
        {/* ─── Fixed Header ─── */}
        <PageHeader title="Help Center" onBack={handleBack} />

        {/* ─── Scrollable Content ─── */}
        <div className="hc-scroll">
          <p className="hc-intro">
            Find answers to common questions or get in touch with our support
            team.
          </p>

          <section className="hc-section">
            <p className="hc-section-title">Quick Actions</p>
            <div className="hc-card">
              <HelpItem
                icon={<IconMail color="#00CD50" />}
                iconColor="#00CD50"
                title="User Guide"
                description="Open the PandaBot user manual (PDF)"
                onClick={() => {
                  setManualVisible(true);
                  setPdfLoading(true);
                }}
              />
              <div className="hc-divider" />
              <HelpItem
                icon={<IconChat color="#5784E8" />}
                iconColor="#5784E8"
                title="Chat with Support"
                description="Get help from our team"
                onClick={() => {}}
              />
              <div className="hc-divider" />
              <HelpItem
                icon={<IconMail color="#00CD50" />}
                iconColor="#00CD50"
                title="Email Us"
                description="support@skillspanda.co.za"
                onClick={handleEmailSupport}
              />
            </div>
          </section>

          <section className="hc-section">
            <p className="hc-section-title">Frequently Asked Questions</p>
            <div className="hc-card">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="faq-item">
                  {i > 0 && <div className="hc-divider" />}
                  <button
                    className="faq-trigger"
                    onClick={() => toggleFaq(i)}
                    aria-expanded={expandedFaq === i}
                  >
                    <IconHelp color="#fb8500" />
                    <span className="faq-question">{item.question}</span>
                    {expandedFaq === i ? (
                      <IconChevronUp color="#9AA5B1" />
                    ) : (
                      <IconChevronDown color="#9AA5B1" />
                    )}
                  </button>
                  {expandedFaq === i && (
                    <p className="faq-answer">{item.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* PDF Modal */}
        {manualVisible && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setManualVisible(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="PandaBot User Manual"
          >
            <div className="modal-sheet">
              <div className="modal-header">
                <span className="modal-title">PandaBot User Manual</span>
                <button
                  className="modal-close-btn"
                  onClick={() => setManualVisible(false)}
                  aria-label="Close"
                >
                  <IconX color="#1F2933" />
                </button>
              </div>

              <div className="pdf-wrap">
                <iframe
                  src={`https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(MANUAL_URL)}`}
                  title="PandaBot User Manual"
                  onLoad={() => setPdfLoading(false)}
                />
                {pdfLoading && (
                  <div className="pdf-loading">
                    <div className="spinner" />
                    <span className="pdf-loading-text">Loading manual…</span>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  className="action-btn btn-secondary"
                  onClick={handleOpenManualExternal}
                >
                  <IconExternalLink color="#1F2933" />
                  Open Link
                </button>
                <button
                  className="action-btn btn-primary"
                  onClick={handleDownloadManual}
                >
                  <IconDownload color="#FFFFFF" />
                  Download
                </button>
              </div>
              <p className="modal-hint">
                If the manual doesn't display, tap "Open Link".
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HelpCenter;
