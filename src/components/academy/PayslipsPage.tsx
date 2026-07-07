import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Calendar,
  ChevronLeft,
  AlertCircle,
  Search,
  Filter,
  FileDown,
  X,
  User,
  RefreshCw,
} from "lucide-react";
import learnerService from "../../services/LearnerServices";
import { useAuth } from "../../context/AuthContext";
import type { Payslip } from "../../types/learner";

interface PayslipsPageProps {
  onBack?: () => void;
  standalone?: boolean;
}

const PayslipsPage: React.FC<PayslipsPageProps> = ({
  onBack,
  standalone = false,
}) => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [saIdNumber, setSaIdNumber] = useState<string>("");
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: number]: number;
  }>({});

  // Get the user's SA ID number from auth context
  const getSaIdNumber = useCallback(() => {
    if (!user) return null;

    // Check nested objects for sa_id_number
    if (user.personal_info && typeof user.personal_info === "object") {
      const personalInfo = user.personal_info as any;
      if (personalInfo.sa_id_number) {
        return String(personalInfo.sa_id_number);
      }
    }

    if (user.demographics && typeof user.demographics === "object") {
      const demographics = user.demographics as any;
      if (demographics.sa_id_number) {
        return String(demographics.sa_id_number);
      }
    }

    // Check direct properties
    if ((user as any).sa_id_number) {
      return String((user as any).sa_id_number);
    }

    return null;
  }, [user]);

  const loadPayslips = useCallback(async () => {
    const idNum = getSaIdNumber();

    if (!idNum) {
      setError("No SA ID number found in your profile.");
      setLoading(false);
      return;
    }

    const cleanId = idNum.replace(/\s/g, "");
    setSaIdNumber(cleanId);
    setLoading(true);
    setError(null);

    try {
      console.log("📄 [PayslipsPage] Loading payslips for SA ID:", cleanId);
      const data = await learnerService.getLearnerPayslips(cleanId);
      console.log("✅ [PayslipsPage] Loaded payslips:", data.length);
      setPayslips(data);
    } catch (err: any) {
      console.error("❌ [PayslipsPage] Failed to load payslips:", err);
      setError(err.message || "Unable to load payslips. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getSaIdNumber]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  // Method 1: Download using the download_url from the API
  const downloadFromUrl = async (payslip: Payslip) => {
    try {
      // If the download_url is a full URL, use it directly
      if (payslip.download_url) {
        // Check if the URL is absolute or relative
        const url = payslip.download_url.startsWith("http")
          ? payslip.download_url
          : `https://academy.connecthr.co.za${payslip.download_url}`;

        console.log("📥 Downloading from URL:", url);

        // Fetch the PDF with authentication
        const token =
          "a84b61b50783e1228c40824558b256b4e4c06e42913d07b281d064e93fa33e7b";
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/pdf",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();

        // Check if we got a PDF
        if (
          !blob.type.includes("pdf") &&
          blob.type !== "application/octet-stream"
        ) {
          // Try to parse as JSON error
          const text = await blob.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || "Failed to download payslip");
          } catch {
            throw new Error("Unexpected response format. Expected PDF.");
          }
        }

        return blob;
      }
      throw new Error("No download URL available");
    } catch (error) {
      console.error("❌ Download from URL failed:", error);
      throw error;
    }
  };

  // Method 2: Download using the service method (fallback)
  const downloadFromService = async (payslipId: number) => {
    const idNum = getSaIdNumber();
    if (!idNum) {
      throw new Error("Unable to find your SA ID number.");
    }
    const cleanId = idNum.replace(/\s/g, "");
    return await learnerService.downloadLearnerPayslip(cleanId, payslipId);
  };

  const handleDownload = async (payslipId: number) => {
    const payslip = payslips.find((p) => p.id === payslipId);
    if (!payslip) {
      alert("Payslip not found.");
      return;
    }

    setDownloading(payslipId);
    setDownloadProgress((prev) => ({ ...prev, [payslipId]: 0 }));

    try {
      let blob: Blob;
      let downloadMethod = "url";

      // Try to download using the URL first
      if (payslip.download_url) {
        try {
          blob = await downloadFromUrl(payslip);
          downloadMethod = "URL";
        } catch (urlError) {
          console.warn(
            "⚠️ URL download failed, falling back to service method:",
            urlError,
          );
          // Fallback to service method
          blob = await downloadFromService(payslipId);
          downloadMethod = "Service";
        }
      } else {
        // No URL available, use service method
        blob = await downloadFromService(payslipId);
        downloadMethod = "Service";
      }

      console.log(`✅ Downloaded via ${downloadMethod} method`);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Use the file name from the payslip or generate one
      const fileName =
        payslip.file_name ||
        `payslip-${payslip.id}-${payslip.period || "unknown"}.pdf`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      setDownloadProgress((prev) => ({ ...prev, [payslipId]: 100 }));

      // Close modal if open
      if (selectedPayslip) {
        setTimeout(() => setSelectedPayslip(null), 500);
      }
    } catch (err: any) {
      console.error("❌ Failed to download payslip:", err);

      // Show more specific error message
      let errorMessage =
        err.message || "Failed to download payslip. Please try again.";

      if (err.message?.includes("401")) {
        errorMessage =
          "Authentication failed. Please log out and log in again.";
      } else if (err.message?.includes("404")) {
        errorMessage = "Payslip file not found. Please contact support.";
      }

      alert(errorMessage);
    } finally {
      setDownloading(null);
      setDownloadProgress((prev) => {
        const newState = { ...prev };
        delete newState[payslipId];
        return newState;
      });
    }
  };

  const filteredPayslips = payslips.filter((p) => {
    if (
      filterStatus !== "all" &&
      p.payment_status?.toLowerCase() !== filterStatus
    ) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.period?.toLowerCase().includes(term) ||
      p.payment_reference?.toLowerCase().includes(term) ||
      p.title?.toLowerCase().includes(term) ||
      p.stipend_amount?.toString().includes(term) ||
      p.program?.name?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "R0.00";
    const num = parseFloat(amount);
    if (isNaN(num)) return "R0.00";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "#22C55E";
      case "pending":
        return "#FB8500";
      case "processing":
        return "#3B82F6";
      case "failed":
        return "#EF4444";
      case "cancelled":
        return "#9CA3AF";
      default:
        return "#9CA3AF";
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return null;
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: getStatusColor(status) + "20",
          color: getStatusColor(status),
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: standalone ? "0 16px 20px" : "0 16px 20px",
      }}
    >
      {/* Header */}
      {!standalone && onBack && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* <button
              onClick={onBack}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                color: "#6B7280",
              }}
            >
              <ChevronLeft size={24} />
            </button> */}
            {/* <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                margin: 0,
              }}
            >
              My Payslips
            </h2> */}
          </div>
          {/* <button
            onClick={loadPayslips}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#FB8500",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            Refresh
          </button> */}
        </div>
      )}

      {/* SA ID Display */}
      {/* {saIdNumber && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 12px",
            backgroundColor: "#F0FDF4",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            color: "#16A34A",
            border: "1px solid #BBF7D0",
          }}
        >
          <User size={16} />
          <span style={{ marginLeft: 8 }}>
            SA ID: <strong>{saIdNumber}</strong>
          </span>
          <span style={{ marginLeft: 12, fontSize: 11, color: "#6B7280" }}>
            {payslips.length} payslip{payslips.length !== 1 ? "s" : ""} found
          </span>
        </div>
      )} */}

      {/* Search and Filter */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        <div style={{ flex: 1, position: "relative", minWidth: 200 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9CA3AF",
            }}
          />
          <input
            type="text"
            placeholder="Search payslips..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 10px 10px 38px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              fontSize: 14,
              outline: "none",
              backgroundColor: "#fff",
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #E5E7EB",
            backgroundColor: showFilters ? "#FB8500" : "#fff",
            cursor: "pointer",
            color: showFilters ? "#fff" : "#6B7280",
          }}
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
            padding: 12,
            backgroundColor: "#fff",
            borderRadius: 10,
            border: "1px solid #E5E7EB",
          }}
        >
          {["all", "paid", "pending", "processing", "failed", "cancelled"].map(
            (status) => (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setShowFilters(false);
                }}
                style={{
                  padding: "4px 14px",
                  borderRadius: 16,
                  border: "1px solid",
                  borderColor: filterStatus === status ? "#FB8500" : "#E5E7EB",
                  backgroundColor: filterStatus === status ? "#FB8500" : "#fff",
                  color: filterStatus === status ? "#fff" : "#6B7280",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {status}
              </button>
            ),
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "16px",
            backgroundColor: "#FEF2F2",
            borderRadius: 10,
            marginBottom: 16,
            color: "#EF4444",
          }}
        >
          <AlertCircle size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={loadPayslips}
            style={{
              background: "none",
              border: "none",
              color: "#EF4444",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Payslips list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: "16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 16,
                      width: "60%",
                      backgroundColor: "#E5E7EB",
                      borderRadius: 4,
                      marginBottom: 8,
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      height: 12,
                      width: "40%",
                      backgroundColor: "#E5E7EB",
                      borderRadius: 4,
                      animation: "pulse 1.5s ease-in-out infinite 0.5s",
                    }}
                  />
                </div>
                <div
                  style={{
                    height: 32,
                    width: 80,
                    backgroundColor: "#E5E7EB",
                    borderRadius: 6,
                    animation: "pulse 1.5s ease-in-out infinite 1s",
                  }}
                />
              </div>
            </div>
          ))
        ) : filteredPayslips.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              backgroundColor: "#fff",
              borderRadius: 12,
            }}
          >
            <FileText size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
            <h3 style={{ color: "#6B7280", margin: 0, fontSize: 16 }}>
              {searchTerm
                ? "No matching payslips found"
                : "No payslips available"}
            </h3>
            {!searchTerm && (
              <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 8 }}>
                Payslips will appear here once they are generated.
              </p>
            )}
          </div>
        ) : (
          filteredPayslips.map((payslip) => (
            <div
              key={payslip.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: "14px 16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
                border: "1px solid #F3F4F6",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
              }}
              onClick={() => setSelectedPayslip(payslip)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <FileText size={16} color="#FB8500" />
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {payslip.title ||
                        payslip.period ||
                        `Payslip #${payslip.id}`}
                    </span>
                    {payslip.payment_status &&
                      getStatusBadge(payslip.payment_status)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 13,
                      color: "#6B7280",
                      flexWrap: "wrap",
                    }}
                  >
                    {payslip.period && <span>{payslip.period}</span>}
                    {payslip.payment_date && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Calendar size={13} />
                        {formatDate(payslip.payment_date)}
                      </div>
                    )}
                    {payslip.program?.name && (
                      <span
                        style={{
                          backgroundColor: "#F3F4F6",
                          padding: "1px 8px",
                          borderRadius: 10,
                          fontSize: 11,
                        }}
                      >
                        {payslip.program.name}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  {/* <span
                    style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}
                  >
                    {formatCurrency(payslip.stipend_amount)}
                  </span> */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(payslip.id);
                    }}
                    disabled={downloading === payslip.id}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "none",
                      backgroundColor:
                        downloading === payslip.id ? "#E5E7EB" : "#FB8500",
                      color: downloading === payslip.id ? "#9CA3AF" : "#fff",
                      cursor:
                        downloading === payslip.id ? "not-allowed" : "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (downloading !== payslip.id) {
                        e.currentTarget.style.backgroundColor = "#E07A00";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (downloading !== payslip.id) {
                        e.currentTarget.style.backgroundColor = "#FB8500";
                      }
                    }}
                  >
                    <Download size={15} />
                    {downloading === payslip.id ? "..." : "PDF"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedPayslip && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => setSelectedPayslip(null)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              maxHeight: "80vh",
              overflowY: "auto",
              animation: "slideUp 0.3s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FileText size={24} color="#FB8500" />
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Payslip Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#9CA3AF",
                  padding: 4,
                  borderRadius: 8,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#F3F4F6")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <span style={{ color: "#6B7280", fontSize: 14 }}>Title</span>
                <span
                  style={{ fontWeight: 500, color: "#111827", fontSize: 14 }}
                >
                  {selectedPayslip.title || "N/A"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <span style={{ color: "#6B7280", fontSize: 14 }}>Period</span>
                <span
                  style={{ fontWeight: 500, color: "#111827", fontSize: 14 }}
                >
                  {selectedPayslip.period || "N/A"}
                </span>
              </div>
              {selectedPayslip.program?.name && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  <span style={{ color: "#6B7280", fontSize: 14 }}>
                    Program
                  </span>
                  <span
                    style={{ fontWeight: 500, color: "#111827", fontSize: 14 }}
                  >
                    {selectedPayslip.program.name}
                  </span>
                </div>
              )}
              {selectedPayslip.payment_date && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  <span style={{ color: "#6B7280", fontSize: 14 }}>
                    Payment Date
                  </span>
                  <span
                    style={{ fontWeight: 500, color: "#111827", fontSize: 14 }}
                  >
                    {formatDate(selectedPayslip.payment_date)}
                  </span>
                </div>
              )}
              {selectedPayslip.payment_reference && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  <span style={{ color: "#6B7280", fontSize: 14 }}>
                    Reference
                  </span>
                  <span
                    style={{ fontWeight: 500, color: "#111827", fontSize: 14 }}
                  >
                    {selectedPayslip.payment_reference}
                  </span>
                </div>
              )}
              {selectedPayslip.payment_method && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  <span style={{ color: "#6B7280", fontSize: 14 }}>
                    Payment Method
                  </span>
                  <span
                    style={{ fontWeight: 500, color: "#111827", fontSize: 14 }}
                  >
                    {selectedPayslip.payment_method}
                  </span>
                </div>
              )}
              {selectedPayslip.payment_status && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid #F3F4F6",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#6B7280", fontSize: 14 }}>Status</span>
                  {getStatusBadge(selectedPayslip.payment_status)}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  borderTop: "2px solid #FB8500",
                  marginTop: 4,
                }}
              >
                <span
                  style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}
                >
                  Stipend Amount
                </span>
                <span
                  style={{ fontSize: 22, fontWeight: 700, color: "#FB8500" }}
                >
                  {formatCurrency(selectedPayslip.stipend_amount)}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDownload(selectedPayslip.id)}
              disabled={downloading === selectedPayslip.id}
              style={{
                width: "100%",
                marginTop: 20,
                padding: "14px",
                borderRadius: 10,
                border: "none",
                backgroundColor:
                  downloading === selectedPayslip.id ? "#E5E7EB" : "#FB8500",
                color: downloading === selectedPayslip.id ? "#9CA3AF" : "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor:
                  downloading === selectedPayslip.id
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (downloading !== selectedPayslip.id) {
                  e.currentTarget.style.backgroundColor = "#E07A00";
                }
              }}
              onMouseLeave={(e) => {
                if (downloading !== selectedPayslip.id) {
                  e.currentTarget.style.backgroundColor = "#FB8500";
                }
              }}
            >
              <Download size={18} />
              {downloading === selectedPayslip.id
                ? "Downloading..."
                : "Download PDF"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default PayslipsPage;
