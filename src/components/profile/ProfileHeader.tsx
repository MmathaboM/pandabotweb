// src/components/profile/ProfileHeader.tsx
import React, { useRef, useState } from "react";
import { Camera } from "lucide-react";

interface Props {
  displayName: string;
  email?: string;
  avatarUrl: string;
  isUploadingAvatar: boolean;
  onAvatarClick: () => void;
  onAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileHeader: React.FC<Props> = ({
  displayName,
  email,
  avatarUrl,
  isUploadingAvatar,
  onAvatarClick,
  onAvatarFileChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <style>{CSS}</style>
      <div className="ph-header">
        <div className="ph-avatar-wrap">
          <div
            className="ph-avatar"
            onClick={onAvatarClick}
            style={{ cursor: "pointer" }}
          >
            {isUploadingAvatar ? (
              <div className="ph-avatar__spinner">
                <div className="ph-spinner" />
              </div>
            ) : (
              <img src={avatarUrl} alt={displayName} />
            )}
            <button
              type="button"
              className="ph-avatar__badge"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              aria-label="Change photo"
            >
              <Camera size={13} color="#fff" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onAvatarFileChange}
          />
        </div>
        <h2 className="ph-header__name">{displayName}</h2>
        {email && <p className="ph-header__email">{email}</p>}
      </div>
    </>
  );
};

export default ProfileHeader;

const CSS = `
  .ph-header {
    background: linear-gradient(135deg, #fb8500, #f5a623);
    padding: 48px 24px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-bottom-left-radius: 28px;
    border-bottom-right-radius: 28px;
  }
  .ph-avatar-wrap { position: relative; margin-bottom: 14px; }
  .ph-avatar { width: 96px; height: 96px; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.25); position: relative; }
  .ph-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ph-avatar__spinner { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; border-radius: 50%; }
  .ph-avatar__badge { position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; border-radius: 50%; background: #fb8500; border: 2.5px solid #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .ph-header__name { margin: 0; font-size: 20px; font-weight: 700; color: #fff; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .ph-header__email { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.88); text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .ph-spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: ph-spin 0.7s linear infinite; }
  @keyframes ph-spin { to { transform: rotate(360deg); } }
`;
