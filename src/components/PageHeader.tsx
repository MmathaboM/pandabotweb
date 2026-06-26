import React from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  rightIcon?: React.ElementType;
  onRightClick?: () => void;
  rightDisabled?: boolean;
  rightSpinning?: boolean;
  rightContent?: React.ReactNode; // custom content for the right side
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  onBack,
  rightIcon: RightIcon = RefreshCw,
  onRightClick,
  rightDisabled = false,
  rightSpinning = false,
  rightContent,
}) => {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "linear-gradient(135deg, #fb8500 0%, #e67600 100%)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(251,133,0,0.25)",
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
          flexShrink: 0,
        }}
        aria-label="Go back"
      >
        <ArrowLeft size={20} color="#fff" strokeWidth={2} />
      </button>

      <span
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: 0.2,
          flex: 1,
          textAlign: "center",
          margin: "0 8px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </span>

      {rightContent ? (
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {rightContent}
        </div>
      ) : onRightClick ? (
        <button
          onClick={onRightClick}
          disabled={rightDisabled}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: rightDisabled ? "not-allowed" : "pointer",
            opacity: rightDisabled ? 0.5 : 1,
            flexShrink: 0,
          }}
          aria-label="Refresh"
        >
          <RightIcon
            size={16}
            color="#fff"
            strokeWidth={2}
            style={{
              animation: rightSpinning ? "spin 1s linear infinite" : "none",
            }}
          />
        </button>
      ) : (
        <div style={{ width: 36, flexShrink: 0 }} />
      )}
    </header>
  );
};

export default PageHeader;
