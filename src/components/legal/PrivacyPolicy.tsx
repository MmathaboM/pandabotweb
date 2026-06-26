import React from "react";
import { Shield } from "lucide-react";
import PageHeader from "../../components/PageHeader";

const colors = {
  primary: { start: "#fb8500", end: "#e85d04", DEFAULT: "#fb8500" },
  background: { light: "#F8F9FA" },
  text: { primary: "#1F2933", secondary: "#616E7C", muted: "#9AA5B1" },
};

const LAST_UPDATED = "14 February 2026";
const COMPANY_NAME = "Skills Panda (Pty) Ltd";
const APP_NAME = "PandaBot";

interface PrivacyPolicyScreenProps {
  onBack?: () => void;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({
  onBack,
}) => {
  const handleBack = () => (onBack ? onBack() : window.history.back());

  return (
    <>
      <style>{`
        .pp-root {
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
        .pp-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 16px 16px 80px;
        }
        .pp-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 8px;
        }
        .pp-last-updated {
          font-weight: 500;
          font-size: 12px;
          color: ${colors.text.muted};
          text-align: center;
          margin-bottom: 16px;
        }
        .pp-section {
          margin-bottom: 16px;
        }
        .pp-section-title {
          font-weight: 600;
          font-size: 15px;
          color: ${colors.text.primary};
          margin-bottom: 6px;
          margin-top: 0;
        }
        .pp-sub-title {
          font-weight: 600;
          font-size: 13px;
          color: ${colors.text.secondary};
          margin-top: 8px;
          margin-bottom: 4px;
        }
        .pp-paragraph {
          font-weight: 400;
          font-size: 13px;
          color: ${colors.text.secondary};
          line-height: 1.5;
          margin-bottom: 8px;
        }
        .pp-bullet {
          font-weight: 400;
          font-size: 13px;
          color: ${colors.text.secondary};
          line-height: 1.5;
          padding-left: 8px;
          margin-bottom: 2px;
        }
        .pp-contact {
          font-weight: 400;
          font-size: 13px;
          color: ${colors.text.secondary};
          line-height: 1.5;
        }
        .pp-acknowledgment {
          background-color: ${colors.primary.DEFAULT}10;
          border-radius: 10px;
          padding: 12px;
          margin-top: 8px;
        }
        .pp-acknowledgment-text {
          font-weight: 500;
          font-size: 13px;
          color: ${colors.primary.DEFAULT};
          line-height: 1.5;
          text-align: center;
        }
      `}</style>

      <div className="pp-root">
        {/* ─── Fixed Header ─── */}
        <PageHeader title="Privacy Policy" onBack={handleBack} />

        {/* ─── Scrollable Content ─── */}
        <div className="pp-scroll">
          <div className="pp-icon">
            <Shield size={48} color={colors.primary.DEFAULT} />
          </div>
          {/* <div className="pp-last-updated">Last Updated: {LAST_UPDATED}</div> */}

          {/* 1. Introduction */}
          <div className="pp-section">
            <h2 className="pp-section-title">1. Introduction</h2>
            <p className="pp-paragraph">
              {COMPANY_NAME} ("we", "us", or "our") is committed to protecting
              your personal information. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you
              use the {APP_NAME} mobile application ("App").
            </p>
            <p className="pp-paragraph">
              This policy is compliant with the Protection of Personal
              Information Act 4 of 2013 ("POPIA") of South Africa.
            </p>
          </div>

          {/* 2. Information We Collect */}
          <div className="pp-section">
            <h2 className="pp-section-title">2. Information We Collect</h2>
            <h3 className="pp-sub-title">
              2.1 Personal Information You Provide
            </h3>
            <div className="pp-bullet">
              • <strong>Identity Information:</strong> First name, last name,
              date of birth, ID number
            </div>
            <div className="pp-bullet">
              • <strong>Contact Information:</strong> Email address, phone
              number, physical address
            </div>
            <div className="pp-bullet">
              • <strong>Demographic Information:</strong> Gender, race (for BEE
              reporting), province, nationality
            </div>
            <div className="pp-bullet">
              • <strong>Education & Employment:</strong> Qualifications, work
              experience, skills
            </div>
            <div className="pp-bullet">
              • <strong>Documents:</strong> ID documents, certificates, CVs, and
              other uploaded files
            </div>
            <div className="pp-bullet">
              • <strong>Disability Information:</strong> Disability status and
              type (if applicable)
            </div>

            <h3 className="pp-sub-title">
              2.2 Information Collected Automatically
            </h3>
            <div className="pp-bullet">
              • <strong>Device Information:</strong> Device type, operating
              system, app version
            </div>
            <div className="pp-bullet">
              • <strong>Usage Data:</strong> Features used, time spent,
              interactions
            </div>
            <div className="pp-bullet">
              • <strong>Location Data:</strong> Precise location (GPS
              coordinates), including in the background when the app is closed,
              for attendance verification and automatic check‑ins at training
              venues.
            </div>
          </div>

          {/* 3. How We Use Your Information */}
          <div className="pp-section">
            <h2 className="pp-section-title">3. How We Use Your Information</h2>
            <div className="pp-bullet">• Provide and maintain the App</div>
            <div className="pp-bullet">
              • Match you with training and employment opportunities
            </div>
            <div className="pp-bullet">• Communicate important updates</div>
            <div className="pp-bullet">
              • Comply with legal and BEE reporting obligations
            </div>
          </div>

          {/* 4. Data Sharing */}
          <div className="pp-section">
            <h2 className="pp-section-title">4. Data Sharing</h2>
            <p className="pp-paragraph">
              We may share your information with employers, training providers,
              and government bodies (SETA, QCTO) as required. We never sell your
              personal data.
            </p>
          </div>

          {/* 5. Data Security */}
          <div className="pp-section">
            <h2 className="pp-section-title">5. Data Security</h2>
            <p className="pp-paragraph">
              We use encryption, secure servers, and access controls to protect
              your information.
            </p>
          </div>

          {/* 6. Your Rights */}
          <div className="pp-section">
            <h2 className="pp-section-title">6. Your Rights Under POPIA</h2>
            <div className="pp-bullet">
              • Access, correct, or delete your personal information
            </div>
            <div className="pp-bullet">• Withdraw consent at any time</div>
            <div className="pp-bullet">
              • Lodge a complaint with the Information Regulator
            </div>
          </div>

          {/* 7. Contact Us */}
          <div className="pp-section">
            <h2 className="pp-section-title">7. Contact Us</h2>
            <div className="pp-contact">{COMPANY_NAME}</div>
            <div className="pp-contact">Email: privacy@skillspanda.co.za</div>
            <div className="pp-contact">Website: www.skillspanda.co.za</div>
          </div>

          <div className="pp-acknowledgment">
            <div className="pp-acknowledgment-text">
              By using {APP_NAME}, you acknowledge that you have read and
              understood this Privacy Policy.
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyScreen;
