import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  Wallet,
  DollarSign,
  BarChart3,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import learnerService from "../../services/LearnerServices";
import { useAuth } from "../../context/AuthContext";
import type { Payslip } from "../../types/learner";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface EarningsPageProps {
  onBack?: () => void;
  standalone?: boolean;
}

interface EarningsTrend {
  month: string;
  year: number;
  gross: number;
  net: number;
  paye: number;
  uif: number;
  sdl: number;
  count: number;
  percentageChange: number;
}

interface EarningsSummary {
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalUIF: number;
  totalSDL: number;
  averageMonthly: number;
  highestMonth: EarningsTrend | null;
  lowestMonth: EarningsTrend | null;
  trendDirection: "up" | "down" | "stable";
}

const EarningsPage: React.FC<EarningsPageProps> = ({
  onBack,
  standalone = false,
}) => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsTrend[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [chartType, setChartType] = useState<"net" | "gross" | "comparison">(
    "net",
  );
  const chartRef = useRef<any>(null);

  const getSaIdNumber = useCallback(() => {
    if (!user) return null;

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

    if ((user as any).sa_id_number) {
      return String((user as any).sa_id_number);
    }

    return null;
  }, [user]);

  const processEarningsData = useCallback((payslipsData: Payslip[]) => {
    // Group payslips by month
    const monthGroups: { [key: string]: Payslip[] } = {};

    payslipsData.forEach((payslip) => {
      if (payslip.payment_date) {
        const date = new Date(payslip.payment_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthGroups[key]) {
          monthGroups[key] = [];
        }
        monthGroups[key].push(payslip);
      }
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthGroups).sort();

    // Calculate trends
    const trends: EarningsTrend[] = sortedMonths.map((monthKey, index) => {
      const payslipsInMonth = monthGroups[monthKey];
      const [year, month] = monthKey.split("-").map(Number);

      const totals = payslipsInMonth.reduce(
        (acc, p) => {
          const gross = p.amounts?.gross || 0;
          const net = p.amounts?.net || 0;
          const paye = p.amounts?.paye || 0;
          const uif = p.amounts?.uif_employee || 0;
          const sdl = p.amounts?.sdl || 0;

          return {
            gross: acc.gross + gross,
            net: acc.net + net,
            paye: acc.paye + paye,
            uif: acc.uif + uif,
            sdl: acc.sdl + sdl,
            count: acc.count + 1,
          };
        },
        { gross: 0, net: 0, paye: 0, uif: 0, sdl: 0, count: 0 },
      );

      // Calculate percentage change from previous month
      let percentageChange = 0;
      if (index > 0) {
        const previousMonth = trends[index - 1];
        if (previousMonth && previousMonth.net > 0) {
          percentageChange =
            ((totals.net - previousMonth.net) / previousMonth.net) * 100;
        }
      }

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      return {
        month: monthNames[month - 1],
        year,
        gross: totals.gross,
        net: totals.net,
        paye: totals.paye,
        uif: totals.uif,
        sdl: totals.sdl,
        count: totals.count,
        percentageChange,
      };
    });

    // Calculate summary statistics
    if (trends.length > 0) {
      const totalGross = trends.reduce((sum, t) => sum + t.gross, 0);
      const totalNet = trends.reduce((sum, t) => sum + t.net, 0);
      const totalTax = trends.reduce((sum, t) => sum + t.paye, 0);
      const totalUIF = trends.reduce((sum, t) => sum + t.uif, 0);
      const totalSDL = trends.reduce((sum, t) => sum + t.sdl, 0);
      const averageMonthly = totalNet / trends.length;

      const highestMonth = trends.reduce(
        (max, t) => (t.net > max.net ? t : max),
        trends[0],
      );
      const lowestMonth = trends.reduce(
        (min, t) => (t.net < min.net ? t : min),
        trends[0],
      );

      // Determine overall trend direction
      let trendDirection: "up" | "down" | "stable" = "stable";
      if (trends.length >= 2) {
        const firstHalf = trends.slice(0, Math.floor(trends.length / 2));
        const secondHalf = trends.slice(Math.floor(trends.length / 2));
        const avgFirst =
          firstHalf.reduce((sum, t) => sum + t.net, 0) / firstHalf.length;
        const avgSecond =
          secondHalf.reduce((sum, t) => sum + t.net, 0) / secondHalf.length;
        const diffPercent = ((avgSecond - avgFirst) / avgFirst) * 100;

        if (diffPercent > 5) trendDirection = "up";
        else if (diffPercent < -5) trendDirection = "down";
        else trendDirection = "stable";
      }

      setSummary({
        totalGross,
        totalNet,
        totalTax,
        totalUIF,
        totalSDL,
        averageMonthly,
        highestMonth,
        lowestMonth,
        trendDirection,
      });
    }

    setEarningsData(trends);
  }, []);

  const loadEarnings = useCallback(async () => {
    const idNum = getSaIdNumber();

    if (!idNum) {
      setError("No SA ID number found in your profile.");
      setLoading(false);
      return;
    }

    const cleanId = idNum.replace(/\s/g, "");
    setLoading(true);
    setError(null);

    try {
      console.log("📊 [EarningsPage] Loading earnings for SA ID:", cleanId);
      const data = await learnerService.getLearnerPayslips(cleanId);
      console.log("✅ [EarningsPage] Loaded payslips:", data.length);
      setPayslips(data);
      processEarningsData(data);
    } catch (err: any) {
      console.error("❌ [EarningsPage] Failed to load earnings:", err);
      setError(
        err.message || "Unable to load earnings data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [getSaIdNumber, processEarningsData]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getTrendColor = (percentage: number) => {
    if (percentage > 0) return "#22C55E";
    if (percentage < 0) return "#EF4444";
    return "#9CA3AF";
  };

  const getTrendIcon = (percentage: number) => {
    if (percentage > 0) return <ArrowUp size={14} color="#22C55E" />;
    if (percentage < 0) return <ArrowDown size={14} color="#EF4444" />;
    return <Minus size={14} color="#9CA3AF" />;
  };

  // Chart data preparation
  const getChartData = (): ChartData<"bar"> => {
    const labels = earningsData.map((d) => `${d.month} ${d.year}`);

    if (chartType === "net") {
      return {
        labels,
        datasets: [
          {
            label: "Net Earnings",
            data: earningsData.map((d) => d.net),
            backgroundColor: "rgba(251, 133, 0, 0.8)",
            borderColor: "rgb(251, 133, 0)",
            borderWidth: 2,
            borderRadius: 4,
          },
        ],
      };
    } else if (chartType === "gross") {
      return {
        labels,
        datasets: [
          {
            label: "Gross Earnings",
            data: earningsData.map((d) => d.gross),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 2,
            borderRadius: 4,
          },
        ],
      };
    } else {
      // Comparison view
      return {
        labels,
        datasets: [
          {
            label: "Gross",
            data: earningsData.map((d) => d.gross),
            backgroundColor: "rgba(59, 130, 246, 0.6)",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 2,
            borderRadius: 4,
          },
          {
            label: "Net",
            data: earningsData.map((d) => d.net),
            backgroundColor: "rgba(251, 133, 0, 0.8)",
            borderColor: "rgb(251, 133, 0)",
            borderWidth: 2,
            borderRadius: 4,
          },
          {
            label: "PAYE",
            data: earningsData.map((d) => d.paye),
            backgroundColor: "rgba(239, 68, 68, 0.6)",
            borderColor: "rgb(239, 68, 68)",
            borderWidth: 2,
            borderRadius: 4,
          },
        ],
      };
    }
  };

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: {
            size: 12,
            weight: "500",
          },
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          },
        },
        backgroundColor: "rgba(0,0,0,0.8)",
        titleFont: { size: 13, weight: "600" },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return formatCurrency(value as number);
          },
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(0,0,0,0.06)",
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
            weight: "500",
          },
        },
      },
    },
  };

  const renderSummaryCards = () => {
    if (!summary) return null;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#6B7280",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Total Earned
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#FB8500",
              marginTop: 4,
            }}
          >
            {formatCurrency(summary.totalNet)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#6B7280",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Monthly Average
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#3B82F6",
              marginTop: 4,
            }}
          >
            {formatCurrency(summary.averageMonthly)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#6B7280",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Total Tax (PAYE)
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#EF4444",
              marginTop: 4,
            }}
          >
            {formatCurrency(summary.totalTax)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#6B7280",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Trend
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            {summary.trendDirection === "up" && (
              <TrendingUp size={20} color="#22C55E" />
            )}
            {summary.trendDirection === "down" && (
              <TrendingDown size={20} color="#EF4444" />
            )}
            {summary.trendDirection === "stable" && (
              <Minus size={20} color="#9CA3AF" />
            )}
            <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
              {summary.trendDirection === "up" && "Rising"}
              {summary.trendDirection === "down" && "Declining"}
              {summary.trendDirection === "stable" && "Stable"}
            </span>
          </div>
          {summary.highestMonth && (
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
              Best: {summary.highestMonth.month} {summary.highestMonth.year}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    if (earningsData.length === 0) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            backgroundColor: "#fff",
            borderRadius: 12,
          }}
        >
          <BarChart3 size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <h3 style={{ color: "#6B7280", margin: 0, fontSize: 16 }}>
            No earnings data available
          </h3>
          <p style={{ color: "#9CA3AF", fontSize: 13, marginTop: 8 }}>
            Your earnings will appear here once payslips are generated.
          </p>
        </div>
      );
    }

    return (
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: "16px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
              Monthly Earnings Trend
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
              {earningsData.length} months of earnings data
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setChartType("net")}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                border:
                  chartType === "net"
                    ? "2px solid #FB8500"
                    : "1px solid #E5E7EB",
                backgroundColor: chartType === "net" ? "#FB8500" : "#fff",
                color: chartType === "net" ? "#fff" : "#6B7280",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Net
            </button>
            <button
              onClick={() => setChartType("gross")}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                border:
                  chartType === "gross"
                    ? "2px solid #3B82F6"
                    : "1px solid #E5E7EB",
                backgroundColor: chartType === "gross" ? "#3B82F6" : "#fff",
                color: chartType === "gross" ? "#fff" : "#6B7280",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Gross
            </button>
            <button
              onClick={() => setChartType("comparison")}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                border:
                  chartType === "comparison"
                    ? "2px solid #8B5CF6"
                    : "1px solid #E5E7EB",
                backgroundColor:
                  chartType === "comparison" ? "#8B5CF6" : "#fff",
                color: chartType === "comparison" ? "#fff" : "#6B7280",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Comparison
            </button>
          </div>
        </div>

        <div style={{ height: 350, position: "relative" }}>
          <Bar ref={chartRef} data={getChartData()} options={chartOptions} />
        </div>

        {/* Monthly stats below chart */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #F3F4F6",
          }}
        >
          {earningsData.map((item, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
                padding: "8px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>
                {item.month} {item.year}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                {formatCurrency(item.net)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: getTrendColor(item.percentageChange),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                {getTrendIcon(item.percentageChange)}
                {item.percentageChange > 0 ? "+" : ""}
                {item.percentageChange.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetailedEarnings = () => {
    if (payslips.length === 0) return null;

    return (
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: "16px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
            Payslip Breakdown
          </div>
          <span style={{ fontSize: 11, color: "#6B7280" }}>
            {payslips.length} payslips
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {payslips.map((payslip) => (
            <div
              key={payslip.id}
              style={{
                border: "1px solid #F3F4F6",
                borderRadius: 8,
                padding: "12px",
                transition: "all 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F9FAFB";
                e.currentTarget.style.borderColor = "#FB8500";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#F3F4F6";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}
                  >
                    {payslip.title ||
                      payslip.period ||
                      `Payslip #${payslip.id}`}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    <Calendar
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    {payslip.period} • {formatDate(payslip.payment_date)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{ fontSize: 16, fontWeight: 700, color: "#FB8500" }}
                  >
                    {formatCurrency(payslip.amounts?.net || 0)}
                  </div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>
                    Gross: {formatCurrency(payslip.amounts?.gross || 0)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                  gap: 8,
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "1px solid #F3F4F6",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#6B7280",
                      textTransform: "uppercase",
                    }}
                  >
                    PAYE
                  </div>
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}
                  >
                    {formatCurrency(payslip.amounts?.paye || 0)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#6B7280",
                      textTransform: "uppercase",
                    }}
                  >
                    UIF
                  </div>
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6" }}
                  >
                    {formatCurrency(payslip.amounts?.uif_employee || 0)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#6B7280",
                      textTransform: "uppercase",
                    }}
                  >
                    SDL
                  </div>
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: "#8B5CF6" }}
                  >
                    {formatCurrency(payslip.amounts?.sdl || 0)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#6B7280",
                      textTransform: "uppercase",
                    }}
                  >
                    Status
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        payslip.payment_status === "paid"
                          ? "#22C55E"
                          : "#FB8500",
                      textTransform: "capitalize",
                    }}
                  >
                    {payslip.payment_status || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: standalone ? "0 16px 20px" : "0 16px 20px",
        backgroundColor: "#F3F4F6",
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
            padding: "12px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
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
            </button>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Wallet size={20} color="#FB8500" />
              My Earnings
            </h2>
          </div>
          <button
            onClick={loadEarnings}
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
          </button>
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
            onClick={loadEarnings}
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

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: "16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
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
          ))}
        </div>
      ) : (
        <>
          {renderSummaryCards()}
          {renderBarChart()}
          {renderDetailedEarnings()}
        </>
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
      `}</style>
    </div>
  );
};

export default EarningsPage;
