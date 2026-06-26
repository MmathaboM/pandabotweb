// OnboardingTour.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  MessageCircle,
  Briefcase,
  X,
  ChevronRight,
} from "lucide-react";

// Adjust this import to your actual logo path
import logo from "../assets/images/logo.png";
// ============================================================
// Types
// ============================================================
interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to PandaBot!",
    description: "Let's take a quick tour of the app to help you get started.",
    icon: GraduationCap,
    iconColor: "#00A86B",
  },
  {
    id: "academy",
    title: "Academy",
    description:
      "Check in to your training sessions, view your schedules, track earnings, and access your digital student card.",
    icon: GraduationCap,
    iconColor: "#00A86B",
  },
  {
    id: "chat",
    title: "Chat",
    description:
      "Connect with your facilitators, peers, and support team. Get real-time help when you need it.",
    icon: MessageCircle,
    iconColor: "#2563EB",
  },
  {
    id: "opportunities",
    title: "Opportunities",
    description:
      "Discover job opportunities, internships, and career resources tailored to your skills.",
    icon: Briefcase,
    iconColor: "#7C3AED",
  },
];

interface OnboardingTourProps {
  onComplete?: () => void;
  forceShow?: boolean; // useful for testing
}

// ============================================================
// Component
// ============================================================
export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  onComplete,
  forceShow = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = TOUR_STEPS.length;
  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Check localStorage on mount
  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    const completed =
      localStorage.getItem("pandabot_onboarding_completed") === "true";
    if (!completed) {
      // slight delay to let the app render first
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  const completeTour = useCallback(() => {
    setVisible(false);
    localStorage.setItem("pandabot_onboarding_completed", "true");
    onComplete?.();
  }, [onComplete]);

  const handleNext = () => {
    if (isLast) {
      completeTour();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  if (!visible) return null;

  const IconComponent = step.icon;

  return (
    <>
      {/* Backdrop */}
      <div className="onboarding-backdrop" onClick={handleSkip} />
      {/* Modal Card */}
      <div className="onboarding-card">
        {/* Header with logo + skip */}
        <div className="onboarding-header">
          <img src={logo} alt="Logo" className="onboarding-logo" />
          <button
            className="onboarding-skip"
            onClick={handleSkip}
            aria-label="Skip tour"
          >
            <X size={20} />
          </button>
        </div>

        {/* Icon */}
        <div
          className="onboarding-icon"
          style={{ backgroundColor: step.iconColor + "15" }}
        >
          <IconComponent size={40} color={step.iconColor} />
        </div>

        {/* Title & Description */}
        <h2 className="onboarding-title">{step.title}</h2>
        <p className="onboarding-description">{step.description}</p>

        {/* Progress bar */}
        <div className="onboarding-progress-container">
          <div className="onboarding-progress-track">
            <div
              className="onboarding-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="onboarding-progress-text">
            {currentStep + 1} of {totalSteps}
          </span>
        </div>

        {/* Actions */}
        <div className="onboarding-actions">
          {currentStep > 0 && (
            <button className="onboarding-back" onClick={handleBack}>
              Back
            </button>
          )}
          <button
            className={`onboarding-next ${isLast ? "onboarding-complete" : ""}`}
            onClick={handleNext}
          >
            {isLast ? "Get Started" : "Next"}
            {!isLast && <ChevronRight size={18} style={{ marginLeft: 4 }} />}
          </button>
        </div>
      </div>

      {/* Inject global styles once (or use CSS modules / styled-components) */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .onboarding-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          animation: fadeIn 0.3s ease-out;
          z-index: 9998;
        }
        .onboarding-card {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(100% - 48px);
          max-width: 400px;
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          animation: slideUp 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .onboarding-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .onboarding-logo {
          height: 32px;
          width: auto;
          object-fit: contain;
        }
        .onboarding-skip {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          transition: background 0.2s;
        }
        .onboarding-skip:hover {
          background: #F3F4F6;
        }
        .onboarding-icon {
          width: 80px;
          height: 80px;
          border-radius: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .onboarding-title {
          font-size: 22px;
          font-weight: 700;
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          color: #111827;
          text-align: center;
          margin: 0 0 12px 0;
        }
        .onboarding-description {
          font-size: 15px;
          font-weight: 400;
          color: #4B5563;
          text-align: center;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }
        .onboarding-progress-container {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .onboarding-progress-track {
          flex: 1;
          height: 4px;
          background: #E5E7EB;
          border-radius: 2px;
          overflow: hidden;
        }
        .onboarding-progress-fill {
          height: 100%;
          background: #00A86B;
          border-radius: 2px;
          transition: width 0.3s ease-out;
        }
        .onboarding-progress-text {
          font-size: 12px;
          font-weight: 500;
          color: #6B7280;
          min-width: 50px;
          text-align: right;
        }
        .onboarding-actions {
          width: 100%;
          display: flex;
          gap: 12px;
        }
        .onboarding-back {
          flex: 1;
          padding: 12px 0;
          border-radius: 12px;
          background: #F3F4F6;
          border: none;
          font-size: 15px;
          font-weight: 600;
          color: #4B5563;
          cursor: pointer;
          transition: background 0.2s;
        }
        .onboarding-back:hover {
          background: #E5E7EB;
        }
        .onboarding-next {
          flex: 2;
          padding: 12px 0;
          border-radius: 12px;
          background: #00A86B;
          border: none;
          font-size: 15px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: opacity 0.2s;
        }
        .onboarding-next:hover {
          opacity: 0.9;
        }
        .onboarding-complete {
          background: #7C3AED;
        }
      `}</style>
    </>
  );
};

export default OnboardingTour;
