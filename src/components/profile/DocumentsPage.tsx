// src/pages/DocumentsPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  documentsService,
  type DocumentType,
  type UserDocument,
} from "../../services/document";
import PageHeader from "../../components/PageHeader";

// Image document types (same as native)
const IMAGE_DOC_TYPES = ["photo", "profile_picture"];

// Category metadata
const CATEGORY_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  personal: {
    label: "Personal Documents",
    color: "#0ea5e9",
    bg: "#E3F2FD",
  },
  academic: {
    label: "Academic & Qualifications",
    color: "#22c55e",
    bg: "#E8F5E9",
  },
  professional: {
    label: "Professional Certifications",
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
  employment: {
    label: "Employment Documents",
    color: "#f97316",
    bg: "#FFF3E0",
  },
  medical: {
    label: "Medical & Health",
    color: "#E11D48",
    bg: "#FFE4E6",
  },
  program: {
    label: "Program Documents",
    color: "#0891B2",
    bg: "#CFFAFE",
  },
  financial: {
    label: "Financial Documents",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  legal: {
    label: "Legal & Compliance",
    color: "#6366F1",
    bg: "#E0E7FF",
  },
  disability: {
    label: "Disability Documents",
    color: "#9333EA",
    bg: "#F3E8FF",
  },
  other: {
    label: "Other",
    color: "#9ca3af",
    bg: "#f3f4f6",
  },
};

// Helper: open document in new tab
function openDocument(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

interface DocumentsPageProps {
  onBack?: () => void;
  onClose?: () => void;
}

export default function DocumentsPage({ onBack, onClose }: DocumentsPageProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [docs, types] = await Promise.all([
        documentsService.getMyDocuments(),
        documentsService.getRequiredDocumentTypes(),
      ]);
      setDocuments(docs ?? []);
      setDocTypes(types ?? []);
    } catch (err) {
      console.error("[Documents] load error:", err);
      alert("Failed to load documents. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group document types by category
  const grouped = useMemo(() => {
    const map: Record<string, DocumentType[]> = {};
    docTypes.forEach((dt) => {
      const category = dt.category || "other";
      if (!map[category]) map[category] = [];
      map[category].push(dt);
    });
    const order = [
      "personal",
      "academic",
      "professional",
      "employment",
      "medical",
      "program",
      "financial",
      "legal",
      "disability",
      "other",
    ];
    return order
      .filter((cat) => map[cat]?.length)
      .map((category) => ({ category, types: map[category] }));
  }, [docTypes]);

  const getDocForType = (typeKey: string): UserDocument | undefined =>
    documents.find((d) => d.type === typeKey);

  const uploadedTypesSet = useMemo(
    () => new Set(documents.map((d) => d.type)),
    [documents],
  );

  const requiredDocsCount = useMemo(
    () => docTypes.filter((t) => t.is_required === true).length,
    [docTypes],
  );

  const uploadedRequiredCount = useMemo(
    () =>
      docTypes.filter(
        (t) => t.is_required === true && uploadedTypesSet.has(t.value),
      ).length,
    [docTypes, uploadedTypesSet],
  );

  // Upload handler using file input
  const handleUpload = async (typeKey: string, isImage: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = isImage
      ? "image/*"
      : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(typeKey);
      try {
        const newDoc = await documentsService.uploadDocument(typeKey, file);
        setDocuments((prev) => [
          ...prev.filter((d) => d.type !== typeKey),
          newDoc,
        ]);
        alert("Document uploaded successfully.");
      } catch (err: any) {
        console.error("[Documents] upload error:", err);
        alert(err?.response?.data?.message || err?.message || "Upload failed.");
      } finally {
        setUploading(null);
        input.remove();
      }
    };
    input.click();
  };

  const handleDelete = async (doc: UserDocument) => {
    if (!window.confirm(`Delete "${doc.original_filename}"?`)) return;
    try {
      await documentsService.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      alert("Document deleted.");
    } catch (err) {
      console.error("[Documents] delete error:", err);
      alert("Failed to delete document.");
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
    else history.back();
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="doc-root">
        {/* ─── Fixed Header ─── */}
        <PageHeader title="Documents" onBack={handleBack} />

        {/* ─── Scrollable Content ─── */}
        <div className="doc-content-wrapper">
          {/* Refresh button */}
          <div className="doc-refresh-container">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="doc-refresh-btn"
            >
              {refreshing ? (
                <div className="doc-spinner-small" />
              ) : (
                <>
                  <RefreshCw size={14} /> Refresh
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="doc-loading">
              <div className="doc-spinner" />
            </div>
          ) : (
            <>
              {/* Summary bar */}
              {requiredDocsCount > 0 && (
                <div className="doc-summary">
                  <div className="doc-summary-left">
                    <span className="doc-summary-count">
                      {uploadedRequiredCount}/{requiredDocsCount}
                    </span>
                    <span className="doc-summary-label">required uploaded</span>
                  </div>
                  {uploadedRequiredCount >= requiredDocsCount ? (
                    <div className="doc-complete-badge">
                      <CheckCircle size={14} />
                      <span>Complete</span>
                    </div>
                  ) : (
                    <span className="doc-summary-remaining">
                      {requiredDocsCount - uploadedRequiredCount} remaining
                    </span>
                  )}
                </div>
              )}

              {docTypes.length === 0 && (
                <div className="doc-empty">
                  <FileText size={48} />
                  <p className="doc-empty-title">No Documents Available</p>
                  <p className="doc-empty-subtitle">
                    There are no document requirements for your account at this
                    time.
                  </p>
                </div>
              )}

              {/* Grouped sections */}
              {grouped.map(({ category, types }) => {
                const meta = CATEGORY_META[category] || CATEGORY_META.other;
                const uploadedInCategory = types.filter((t) =>
                  uploadedTypesSet.has(t.value),
                ).length;
                const requiredInCategory = types.filter(
                  (t) => t.is_required === true,
                ).length;

                return (
                  <div key={category} className="doc-category">
                    <div className="doc-category-header">
                      <div
                        className="doc-category-dot"
                        style={{ backgroundColor: meta.color }}
                      />
                      <h3 className="doc-category-title">{meta.label}</h3>
                      <span className="doc-category-count">
                        {uploadedInCategory}/{types.length}
                        {requiredInCategory > 0 &&
                          ` (${requiredInCategory} req.)`}
                      </span>
                    </div>

                    {types.map((dt) => {
                      const existing = getDocForType(dt.value);
                      const isUploading = uploading === dt.value;
                      const isRequired = dt.is_required === true;
                      const isImage = IMAGE_DOC_TYPES.includes(dt.value);

                      return (
                        <div
                          key={dt.value}
                          className={`doc-row ${isRequired && !existing ? "doc-row-required" : ""}`}
                        >
                          <div
                            className="doc-row-icon"
                            style={{ backgroundColor: meta.bg }}
                          >
                            {existing ? (
                              <CheckCircle
                                size={18}
                                className="doc-icon-success"
                              />
                            ) : (
                              <FileText
                                size={18}
                                style={{ color: meta.color }}
                              />
                            )}
                          </div>

                          <div className="doc-row-info">
                            <div className="doc-row-label">
                              <span className="doc-row-name">{dt.label}</span>
                              {isRequired && !existing && (
                                <span className="doc-required-badge">
                                  Required
                                </span>
                              )}
                            </div>
                            {existing ? (
                              <p className="doc-row-filename">
                                {existing.original_filename}
                                {existing.size_formatted &&
                                  ` · ${existing.size_formatted}`}
                                {existing.is_verified === true && (
                                  <span className="doc-verified">
                                    {" "}
                                    ✓ Verified
                                  </span>
                                )}
                                {existing.is_verified === false && (
                                  <span className="doc-pending">
                                    {" "}
                                    (Pending Verification)
                                  </span>
                                )}
                              </p>
                            ) : (
                              <p
                                className={`doc-row-empty ${isRequired ? "doc-row-empty-required" : ""}`}
                              >
                                {isRequired
                                  ? "Required - Not uploaded"
                                  : "Not uploaded"}
                              </p>
                            )}
                          </div>

                          {existing ? (
                            <div className="doc-row-actions">
                              <button
                                onClick={() => {
                                  const url = existing.file_url || existing.url;
                                  if (url) {
                                    openDocument(url);
                                  } else {
                                    alert("No file URL available to view.");
                                  }
                                }}
                                className="doc-action-btn doc-action-view"
                                title="View"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleUpload(dt.value, isImage)}
                                disabled={isUploading}
                                className="doc-action-btn doc-action-replace"
                                title="Replace"
                              >
                                {isUploading ? (
                                  <div className="doc-spinner-small" />
                                ) : (
                                  <Upload size={16} />
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(existing)}
                                className="doc-action-btn doc-action-delete"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleUpload(dt.value, isImage)}
                              disabled={isUploading}
                              className={`doc-upload-btn ${isRequired ? "doc-upload-btn-required" : ""}`}
                              style={
                                !isRequired
                                  ? { backgroundColor: meta.color }
                                  : {}
                              }
                            >
                              {isUploading ? (
                                <div className="doc-spinner-small-white" />
                              ) : (
                                <Plus size={16} />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}

const CSS = `
  :root {
    --doc-primary: #fb8500;
    --doc-primary-dark: #e85d04;
    --doc-bg: #f4f5f7;
    --doc-card-bg: #ffffff;
    --doc-text: #1a1a2e;
    --doc-text-secondary: #6b7280;
    --doc-text-muted: #9ca3af;
    --doc-border: #e5e7eb;
    --doc-radius: 16px;
  }

  /* Root - fixed overlay */
  .doc-root {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: var(--doc-bg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* Scrollable content */
  .doc-content-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px 80px;
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
  }

  /* Refresh button */
  .doc-refresh-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }
  .doc-refresh-btn {
    background: none;
    border: none;
    font-size: 13px;
    color: var(--doc-primary);
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }

  /* Loading */
  .doc-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 64px;
    margin-top: 40px;
  }
  .doc-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top-color: var(--doc-primary);
    border-radius: 50%;
    animation: doc-spin 0.7s linear infinite;
  }
  .doc-spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: doc-spin 0.6s linear infinite;
    display: inline-block;
  }
  .doc-spinner-small-white {
    width: 14px;
    height: 14px;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: doc-spin 0.6s linear infinite;
  }
  @keyframes doc-spin {
    to { transform: rotate(360deg); }
  }

  /* Summary bar */
  .doc-summary {
    background: var(--doc-card-bg);
    border-radius: var(--doc-radius);
    padding: 16px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    border: 1px solid var(--doc-border);
  }
  .doc-summary-left {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .doc-summary-count {
    font-weight: 700;
    font-size: 24px;
    color: var(--doc-primary);
  }
  .doc-summary-label {
    font-size: 13px;
    color: var(--doc-text-muted);
  }
  .doc-summary-remaining {
    font-size: 13px;
    color: var(--doc-text-secondary);
  }
  .doc-complete-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #f0fdf4;
    color: #16a34a;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  /* Empty state */
  .doc-empty {
    text-align: center;
    padding: 48px 20px;
    color: var(--doc-text-muted);
  }
  .doc-empty svg {
    margin-bottom: 12px;
    opacity: 0.5;
  }
  .doc-empty-title {
    font-weight: 500;
    margin-top: 8px;
    color: var(--doc-text-secondary);
  }
  .doc-empty-subtitle {
    font-size: 13px;
    margin-top: 4px;
  }

  /* Category */
  .doc-category {
    margin-bottom: 24px;
  }
  .doc-category-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .doc-category-dot {
    width: 8px;
    height: 8px;
    border-radius: 4px;
  }
  .doc-category-title {
    flex: 1;
    font-weight: 600;
    font-size: 13px;
    color: var(--doc-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .doc-category-count {
    font-size: 11px;
    color: var(--doc-text-muted);
  }

  /* Document row */
  .doc-row {
    background: var(--doc-card-bg);
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--doc-border);
    transition: box-shadow 0.2s;
  }
  .doc-row-required {
    border-left: 4px solid var(--doc-primary);
  }
  .doc-row-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .doc-icon-success {
    color: #16a34a;
  }
  .doc-row-info {
    flex: 1;
    min-width: 0;
  }
  .doc-row-label {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .doc-row-name {
    font-weight: 500;
    font-size: 14px;
    color: var(--doc-text);
  }
  .doc-required-badge {
    background: rgba(251,133,0,0.1);
    color: var(--doc-primary);
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .doc-row-filename {
    font-size: 11px;
    color: var(--doc-text-muted);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .doc-verified {
    color: #16a34a;
  }
  .doc-pending {
    color: #eab308;
  }
  .doc-row-empty {
    font-size: 11px;
    font-style: italic;
    color: var(--doc-text-muted);
    margin-top: 2px;
  }
  .doc-row-empty-required {
    color: #dc2626;
  }
  .doc-row-actions {
    display: flex;
    gap: 6px;
  }
  .doc-action-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }
  .doc-action-view {
    background: #e0f2fe;
    color: #0891b2;
  }
  .doc-action-view:hover {
    background: #bae6fd;
  }
  .doc-action-replace {
    background: #fff3e0;
    color: var(--doc-primary);
  }
  .doc-action-replace:hover {
    background: #ffe0b2;
  }
  .doc-action-delete {
    background: #fee2e2;
    color: #dc2626;
  }
  .doc-action-delete:hover {
    background: #fecaca;
  }
  .doc-upload-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    background-color: var(--doc-primary);
    color: white;
    transition: opacity 0.2s;
  }
  .doc-upload-btn-required {
    background-color: var(--doc-primary);
  }
  .doc-upload-btn:hover:not(:disabled) {
    opacity: 0.85;
  }
  .doc-upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
