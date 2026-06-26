import React, { useEffect, useState } from "react";
import { Shield, ShieldCheck, RefreshCw } from "lucide-react";
import api from "../../../services/api";

interface IDVerificationCardProps {
  onVerifyPress: () => void; // called when user clicks "Verify"
}

export const IDVerificationCard: React.FC<IDVerificationCardProps> = ({
  onVerifyPress,
}) => {
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await api.get("/v1/auth/id/verify/status");
      setIsVerified(res.data.is_verified);
    } catch (err) {
      console.error("Failed to fetch ID verification status", err);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="pc-id-card" style={{ justifyContent: "center" }}>
        <RefreshCw size={20} className="pc-spin" style={{ color: "#9ca3af" }} />
        <span style={{ marginLeft: 10, color: "#9ca3af", fontSize: 14 }}>
          Checking verification…
        </span>
      </div>
    );
  }

  return (
    <div className={`pc-id-card ${isVerified ? "pc-id-card--verified" : ""}`}>
      <div className="pc-id-card__left">
        <div className="pc-id-card__icon">
          {isVerified ? (
            <ShieldCheck size={22} color="#16a34a" />
          ) : (
            <Shield size={22} color="#f59e0b" />
          )}
        </div>
        <div className="pc-id-card__text">
          <span className="pc-id-card__title">
            {isVerified ? "Identity Verified ✓" : "Verify Your Identity"}
          </span>
          <span className="pc-id-card__sub">
            {isVerified
              ? "Your identity has been verified"
              : "Upload or verify your ID to increase trust"}
          </span>
        </div>
      </div>
      {isVerified ? (
        <ShieldCheck size={20} color="#16a34a" />
      ) : (
        <button className="pc-id-card__verify-btn" onClick={onVerifyPress}>
          Verify
        </button>
      )}
    </div>
  );
};
