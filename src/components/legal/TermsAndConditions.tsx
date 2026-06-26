import React from "react";
import { FileText } from "lucide-react";
import PageHeader from "../../components/PageHeader";

const colors = {
  primary: { start: "#fb8500", end: "#e85d04", DEFAULT: "#fb8500" },
  background: { light: "#F8F9FA" },
  text: { primary: "#1F2933", secondary: "#616E7C", muted: "#9AA5B1" },
};

const LAST_UPDATED = "14 February 2026";
const COMPANY_NAME = "Skills Panda (Pty) Ltd";
const APP_NAME = "PandaBot";

interface TermsScreenProps {
  onBack?: () => void;
}

const TermsScreen: React.FC<TermsScreenProps> = ({ onBack }) => {
  const handleBack = () => (onBack ? onBack() : window.history.back());

  return (
    <>
      <style>{`
        .terms-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background: ${colors.background.light};
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        }
        .terms-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 16px 16px 80px;
        }
        .terms-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 8px;
        }
        .terms-last-updated {
          font-weight: 500;
          font-size: 12px;
          color: ${colors.text.muted};
          text-align: center;
          margin-bottom: 16px;
        }
        .terms-section {
          margin-bottom: 16px;
        }
        .terms-section-title {
          font-weight: 600;
          font-size: 15px;
          color: ${colors.text.primary};
          margin-bottom: 6px;
          margin-top: 0;
        }
        .terms-paragraph {
          font-weight: 400;
          font-size: 13px;
          color: ${colors.text.secondary};
          line-height: 1.5;
          margin-bottom: 8px;
        }
        .terms-bullet {
          font-weight: 400;
          font-size: 13px;
          color: ${colors.text.secondary};
          line-height: 1.5;
          padding-left: 8px;
          margin-bottom: 2px;
        }
        .terms-contact {
          font-weight: 400;
          font-size: 13px;
          color: ${colors.text.secondary};
          line-height: 1.5;
        }
        .terms-acknowledgment {
          background-color: ${colors.primary.DEFAULT}10;
          border-radius: 10px;
          padding: 12px;
          margin-top: 8px;
        }
        .terms-acknowledgment-text {
          font-weight: 500;
          font-size: 13px;
          color: ${colors.primary.DEFAULT};
          line-height: 1.5;
          text-align: center;
        }
      `}</style>

      <div className="terms-root">
        {/* ─── Fixed Header ─── */}
        <PageHeader title="Terms and Conditions" onBack={handleBack} />

        {/* ─── Scrollable Content ─── */}
        <div className="terms-scroll">
          <div className="terms-icon">
            <FileText size={48} color={colors.primary.DEFAULT} />
          </div>
          {/* <div className="terms-last-updated">Last Updated: {LAST_UPDATED}</div> */}

          <div className="terms-section">
            <h2 className="terms-section-title">1. Introduction</h2>
            <p className="terms-paragraph">
              Welcome to {APP_NAME}. These Terms and Conditions ("Terms") govern
              your use of the {APP_NAME} mobile application ("App") operated by{" "}
              {COMPANY_NAME} ("Company", "we", "us", or "our"), a company
              registered in the Republic of South Africa.
            </p>
            <p className="terms-paragraph">
              By downloading, installing, or using the App, you agree to be
              bound by these Terms. If you do not agree to these Terms, please
              do not use the App.
            </p>
          </div>

          <div className="terms-section">
            <h2 className="terms-section-title">2. Eligibility</h2>
            <p className="terms-paragraph">
              You must be at least 16 years of age to use this App. By using the
              App, you represent and warrant that you meet this age requirement.
              If you are under 18 years of age, you confirm that you have
              obtained consent from your parent or legal guardian.
            </p>
          </div>

          <div className="terms-section">
            <h2 className="terms-section-title">3. Account Registration</h2>
            <p className="terms-paragraph">
              To access certain features of the App, you must register for an
              account. When registering, you agree to:
            </p>
            <div className="terms-bullet">
              • Provide accurate, current, and complete information.
            </div>
            <div className="terms-bullet">
              • Maintain and update your information to keep it accurate.
            </div>
            <div className="terms-bullet">
              • Maintain the security and confidentiality of your password.
            </div>
            <div className="terms-bullet">
              • Accept responsibility for all activities under your account.
            </div>
            <div className="terms-bullet">
              • Notify us immediately of any unauthorized use of your account.
            </div>
          </div>

          <div className="terms-section">
            <h2 className="terms-section-title">4. Services</h2>
            <p className="terms-paragraph">
              {APP_NAME} provides a platform for:
            </p>
            <div className="terms-bullet">
              • Skills development and training opportunities.
            </div>
            <div className="terms-bullet">
              • Employment and learnership opportunities.
            </div>
            <div className="terms-bullet">
              • Profile management and document storage.
            </div>
            <div className="terms-bullet">
              • Community engagement and networking.
            </div>
            <div className="terms-bullet">
              • Educational resources and assessments.
            </div>
          </div>

          <div className="terms-section">
            <h2 className="terms-section-title">5. User Conduct</h2>
            <p className="terms-paragraph">You agree not to:</p>
            <div className="terms-bullet">
              • Use the App for any unlawful purpose.
            </div>
            <div className="terms-bullet">
              • Harass, abuse, or harm other users.
            </div>
            <div className="terms-bullet">
              • Upload malicious code or interfere with the App’s operation.
            </div>
            <div className="terms-bullet">
              • Violate any applicable laws or regulations.
            </div>
          </div>

          <div className="terms-section">
            <h2 className="terms-section-title">6. Intellectual Property</h2>
            <p className="terms-paragraph">
              All content in the App is owned by {COMPANY_NAME} or its licensors
              and protected by South African intellectual property laws.
            </p>
          </div>

          <div className="terms-section">
            <h2 className="terms-section-title">7. Termination</h2>
            <p className="terms-paragraph">
              We may suspend or terminate your account if you violate these
              Terms, with or without notice.
            </p>
          </div>

          <div className="terms-section">
            <h2 className="terms-section-title">8. Governing Law</h2>
            <p className="terms-paragraph">
              These Terms are governed by the laws of the Republic of South
              Africa.
            </p>
          </div>

          <div className="terms-section">
            <h2 className="terms-section-title">9. Contact Us</h2>
            <div className="terms-contact">{COMPANY_NAME}</div>
            <div className="terms-contact">
              Email: support@skillspanda.co.za
            </div>
            <div className="terms-contact">Website: www.skillspanda.co.za</div>
          </div>

          <div className="terms-acknowledgment">
            <div className="terms-acknowledgment-text">
              By using {APP_NAME}, you acknowledge that you have read,
              understood, and agree to be bound by these Terms and Conditions.
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </div>
    </>
  );
};

export default TermsScreen;
