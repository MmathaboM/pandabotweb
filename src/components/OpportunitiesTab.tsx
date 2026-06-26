// src/components/OpportunitiesTab.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  X,
  MapPin,
  Clock,
  CalendarClock,
  Banknote,
  ChevronLeft,
} from "lucide-react";

import {
  opportunitiesService,
  OpportunityFilters,
} from "../services/opportunitiesService";
import { getApiError } from "../services/api";
import type { Opportunity } from "../types";
import { getFullImageUrl } from "../utils/images";

// ─── Color scheme ──────────────────────────────────────────────────────────
const colors = {
  primary: { start: "#fb8500", end: "#e85d04", DEFAULT: "#fb8500" },
  secondary: { DEFAULT: "#1F2933" },
  text: {
    primary: "#1F2933",
    secondary: "#616E7C",
    muted: "#9AA5B1",
    inverse: "#FFFFFF",
  },
  background: { light: "#FFFFFF", input: "#F5F7FA", card: "#FFFFFF" },
  border: { light: "#E4E7EB", DEFAULT: "#CBD2D9" },
  status: { success: "#00CD50", error: "#FF647C", warning: "#FFDE70" },
};

interface Province {
  id: number;
  name: string;
  code?: string;
}

interface Props {
  fullscreen?: boolean;
  onBack?: () => void;
  onViewOpportunity?: (id: string) => void;
}

const SALARY_OPTIONS = ["R5,000", "R10,000", "R15,000", "R20,000", "R25,000+"];

// ─── Helpers ──────────────────────────────────────────────────────────────
const getDisplayValue = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(getDisplayValue).join(", ");
  if (typeof value === "object") {
    if (value.name) return value.name;
    if (value.title) return value.title;
    return "";
  }
  return String(value);
};

const getLocationName = (loc: any): string => {
  if (!loc) return "South Africa";
  if (typeof loc === "string") return loc;
  if (typeof loc === "object" && loc.name) return loc.name;
  return "South Africa";
};

// ─── Main component ──────────────────────────────────────────────────────
export const OpportunitiesTab: React.FC<Props> = ({
  fullscreen,
  onBack,
  onViewOpportunity,
}) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);
  const isFetching = useRef(false);

  // Load provinces
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const data = await opportunitiesService.getProvinces();
        setProvinces(data);
      } catch (err) {
        console.error("Failed to load provinces", err);
      }
    };
    loadProvinces();
  }, []);

  const fetchOpportunities = useCallback(
    async (reset = true, pageNum = 1) => {
      if (isFetching.current) return;
      isFetching.current = true;

      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const requestFilters: OpportunityFilters = {
          page: pageNum,
          per_page: 10,
          ...filters,
        };
        if (searchQuery.trim()) requestFilters.q = searchQuery.trim();

        const response =
          await opportunitiesService.getOpportunitiesPaginated(requestFilters);
        const newOpportunities = response.data;
        const meta = response.meta;

        setHasMore(meta.current_page < meta.last_page);
        setPage(meta.current_page);

        if (reset) {
          setOpportunities(newOpportunities);
        } else {
          setOpportunities((prev) => [...prev, ...newOpportunities]);
        }
      } catch (err) {
        if (reset) setError(getApiError(err));
        console.error(err);
      } finally {
        if (reset) setLoading(false);
        else setLoadingMore(false);
        isFetching.current = false;
      }
    },
    [filters, searchQuery],
  );

  // Debounce search/filters
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchOpportunities(true, 1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fetchOpportunities]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (
      !scrollContainerRef.current ||
      loadingMore ||
      !hasMore ||
      isFetching.current
    )
      return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchOpportunities(false, page + 1);
    }
  }, [hasMore, loadingMore, page, fetchOpportunities]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const applyFilters = () => {
    setShowFilters(false);
    setPage(1);
    setHasMore(true);
    fetchOpportunities(true, 1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setShowFilters(false);
    setPage(1);
    setHasMore(true);
    fetchOpportunities(true, 1);
  };

  const hasActiveFilters =
    Object.keys(filters).length > 0 || searchQuery.trim().length > 0;

  // ─── Skeleton ────────────────────────────────────────────────────────────
  const JobCardSkeleton = () => (
    <div style={skeletonStyles.card}>
      <div style={skeletonStyles.header}>
        <div style={skeletonStyles.logo} />
        <div style={{ flex: 1, marginLeft: 12 }}>
          <div style={skeletonStyles.title} />
          <div style={skeletonStyles.company} />
        </div>
      </div>
      <div style={skeletonStyles.tags}>
        <div style={skeletonStyles.tag} />
        <div style={skeletonStyles.tag} />
      </div>
      <div style={skeletonStyles.description}>
        <div style={skeletonStyles.line} />
        <div style={{ ...skeletonStyles.line, width: "90%" }} />
      </div>
      <div style={skeletonStyles.footer}>
        <div style={skeletonStyles.meta} />
        <div style={skeletonStyles.button} />
      </div>
    </div>
  );

  const skeletonStyles = {
    card: {
      backgroundColor: "#fff",
      borderRadius: 20,
      marginBottom: 16,
      padding: 16,
      boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
    },
    header: { display: "flex", alignItems: "center", marginBottom: 16 },
    logo: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: "#E2E8F0",
    },
    title: {
      width: "60%",
      height: 20,
      backgroundColor: "#E2E8F0",
      borderRadius: 4,
      marginBottom: 8,
    },
    company: {
      width: "40%",
      height: 14,
      backgroundColor: "#E2E8F0",
      borderRadius: 4,
    },
    tags: { display: "flex", gap: 8, marginBottom: 16 },
    tag: {
      width: 80,
      height: 24,
      backgroundColor: "#E2E8F0",
      borderRadius: 12,
    },
    description: { marginBottom: 16 },
    line: {
      width: "100%",
      height: 14,
      backgroundColor: "#E2E8F0",
      borderRadius: 4,
      marginBottom: 6,
    },
    footer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 16,
      borderTop: "1px solid #F0F2F5",
    },
    meta: {
      width: 140,
      height: 12,
      backgroundColor: "#E2E8F0",
      borderRadius: 4,
    },
    button: {
      width: 70,
      height: 28,
      backgroundColor: "#E2E8F0",
      borderRadius: 14,
    },
  };

  // ─── Styles ──────────────────────────────────────────────────────────────
  const styles: { [key: string]: React.CSSProperties } = {
    headerContent: { gap: 8 },
    headerTitle: {
      fontFamily: "inherit",
      fontSize: 28,
      fontWeight: "bold",
      color: "#fff",
      margin: 0,
    },
    headerSubtitle: {
      fontFamily: "inherit",
      fontSize: 14,
      fontWeight: "500",
      color: "rgba(255,255,255,0.9)",
      marginBottom: 8,
    },
    searchRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 8 },
    searchBox: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: "0 14px",
      gap: 10,
      height: 50,
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    },
    searchInput: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: 15,
      fontFamily: "inherit",
      backgroundColor: "transparent",
    },
    filterBtn: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid rgba(255,255,255,0.3)",
      cursor: "pointer",
    },
    filterBtnActive: { backgroundColor: "#fff" },
    filterPanel: {
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 16,
      margin: "16px 16px 0 16px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    },
    filterSection: { marginBottom: 4 },
    filterLabelRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    filterIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text.primary,
    },
    filterDivider: { height: 1, backgroundColor: "#F0F2F5", margin: "12px 0" },
    filterChips: { display: "flex", flexWrap: "wrap", gap: 8 },
    chip: {
      padding: "8px 14px",
      borderRadius: 20,
      border: "none",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    chipActive: { backgroundColor: colors.primary.DEFAULT },
    chipText: { fontSize: 13, fontWeight: "500", color: colors.text.secondary },
    chipTextActive: { color: "#fff" },
    filterActions: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
      paddingTop: 16,
      borderTop: "1px solid #F0F2F5",
    },
    clearBtn: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "8px 12px",
    },
    clearBtnText: { fontSize: 14, color: colors.text.muted },
    applyFilterBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: `linear-gradient(90deg, ${colors.primary.start}, ${colors.primary.end})`,
      border: "none",
      borderRadius: 14,
      padding: "12px 20px",
      cursor: "pointer",
    },
    applyFilterBtnText: { fontSize: 14, fontWeight: "bold", color: "#fff" },
    listContainer: {
      flex: 1,
      overflowY: "auto",
      padding: "16px",
      maxHeight: "calc(100vh - 200px)",
    },
    skeletonList: { paddingBottom: 16 },
    emptyState: { textAlign: "center", padding: "48px 20px" },
    emptyIcon: { fontSize: 48, display: "block", marginBottom: 12 },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text.primary,
      marginBottom: 4,
    },
    emptySub: { fontSize: 14, color: colors.text.muted },
    filteredBanner: {
      backgroundColor: colors.primary.DEFAULT + "20",
      padding: "6px 12px",
      borderRadius: 8,
      marginBottom: 16,
      textAlign: "center",
    },
    filteredText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.primary.DEFAULT,
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      border: "1px solid #E4E7EB",
      boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    logo: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.background.input,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      overflow: "hidden",
    },
    logoText: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.primary.DEFAULT,
    },
    cardInfo: { flex: 1 },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text.primary,
      marginBottom: 4,
    },
    cardCompany: { fontSize: 13, color: colors.text.secondary },
    metaRow: { display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" },
    metaItem: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 12,
      color: colors.text.muted,
    },
    tagsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
    tag: {
      padding: "4px 10px",
      borderRadius: 6,
      backgroundColor: colors.background.input,
      fontSize: 11,
      fontWeight: "500",
      color: colors.text.secondary,
    },
    tagPrimary: {
      backgroundColor: colors.primary.DEFAULT + "15",
      color: colors.primary.DEFAULT,
    },
    cardFooter: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
      paddingTop: 8,
      borderTop: "1px solid #F0F2F5",
    },
    deadlineText: { fontSize: 11, color: colors.text.muted },
    viewButton: {
      padding: "8px 16px",
      borderRadius: 10,
      backgroundColor: colors.primary.DEFAULT,
      color: "#fff",
      border: "none",
      fontSize: 13,
      fontWeight: "600",
      cursor: "pointer",
    },
    loadingMore: { textAlign: "center", padding: "16px" },
    loadingMoreText: { fontSize: 13, color: colors.text.muted },
    endMessage: { textAlign: "center", padding: "24px" },
    endMessageText: { fontSize: 13, color: colors.text.muted },
  };

  const fullscreenStyles = {
    fullscreenWrapper: {
      position: "fixed" as const,
      inset: 0,
      backgroundColor: "#F8F9FA",
      zIndex: 200,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column" as const,
    },
    container: {
      display: "flex",
      flexDirection: "column" as const,
      height: "100%",
    },
    backButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      marginBottom: 12,
      padding: 0,
    },
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  const content = (
    <div style={fullscreen ? fullscreenStyles.container : {}}>
      {/* Gradient Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.primary.start}, ${colors.primary.end})`,
          padding: fullscreen ? "20px 16px 24px" : "16px 16px 24px",
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        {fullscreen && (
          <button onClick={onBack} style={fullscreenStyles.backButton}>
            <ChevronLeft size={24} color="#fff" />
          </button>
        )}
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>Opportunities</h1>
          <p style={styles.headerSubtitle}>Find your next career move</p>
          <div style={styles.searchRow}>
            <div style={styles.searchBox}>
              <Search size={20} color={colors.primary.DEFAULT} />
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <button
              style={{
                ...styles.filterBtn,
                ...(showFilters ? styles.filterBtnActive : {}),
              }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter
                size={20}
                color={showFilters ? colors.primary.DEFAULT : "#fff"}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div style={styles.filterPanel}>
          <div style={styles.filterSection}>
            <div style={styles.filterLabelRow}>
              <div
                style={{
                  ...styles.filterIconBadge,
                  backgroundColor: "#FFF0E6",
                }}
              >
                <MapPin size={14} color={colors.primary.DEFAULT} />
              </div>
              <span style={styles.filterLabel}>Province</span>
            </div>
            <div style={styles.filterChips}>
              {provinces.map((p) => (
                <button
                  key={p.id}
                  style={{
                    ...styles.chip,
                    backgroundColor: "#FFF7F0",
                    ...(filters.province_id === p.id ? styles.chipActive : {}),
                  }}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      province_id: f.province_id === p.id ? undefined : p.id,
                    }))
                  }
                >
                  <span
                    style={{
                      ...styles.chipText,
                      ...(filters.province_id === p.id
                        ? styles.chipTextActive
                        : {}),
                    }}
                  >
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div style={styles.filterDivider} />
          <div style={styles.filterSection}>
            <div style={styles.filterLabelRow}>
              <div
                style={{
                  ...styles.filterIconBadge,
                  backgroundColor: "#E8F5E9",
                }}
              >
                <Banknote size={14} color="#2e7d32" />
              </div>
              <span style={styles.filterLabel}>Salary</span>
            </div>
            <div style={styles.filterChips}>
              {SALARY_OPTIONS.map((s) => (
                <button
                  key={s}
                  style={{
                    ...styles.chip,
                    backgroundColor: "#F1F8F1",
                    ...(filters.salary === s
                      ? { backgroundColor: "#2e7d32" }
                      : {}),
                  }}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      salary: f.salary === s ? undefined : s,
                    }))
                  }
                >
                  <span
                    style={{
                      ...styles.chipText,
                      ...(filters.salary === s ? styles.chipTextActive : {}),
                    }}
                  >
                    {s}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div style={styles.filterDivider} />
          <div style={styles.filterSection}>
            <div style={styles.filterLabelRow}>
              <div
                style={{
                  ...styles.filterIconBadge,
                  backgroundColor: "#E3F2FD",
                }}
              >
                <CalendarClock size={14} color="#1565c0" />
              </div>
              <span style={styles.filterLabel}>Closing date</span>
            </div>
            <div style={styles.filterChips}>
              {[
                { label: "2 weeks", days: 14 },
                { label: "1 month", days: 30 },
                { label: "2 months", days: 60 },
              ].map((opt) => {
                const toStr = new Date(Date.now() + opt.days * 86400000)
                  .toISOString()
                  .slice(0, 10);
                return (
                  <button
                    key={opt.label}
                    style={{
                      ...styles.chip,
                      backgroundColor: "#EFF6FF",
                      ...(filters.closing_date_to === toStr
                        ? { backgroundColor: "#1565c0" }
                        : {}),
                    }}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        closing_date_from: new Date()
                          .toISOString()
                          .slice(0, 10),
                        closing_date_to: toStr,
                      }))
                    }
                  >
                    <span
                      style={{
                        ...styles.chipText,
                        ...(filters.closing_date_to === toStr
                          ? styles.chipTextActive
                          : {}),
                      }}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={styles.filterActions}>
            <button style={styles.clearBtn} onClick={clearFilters}>
              <X size={14} color={colors.text.muted} />
              <span style={styles.clearBtnText}>Clear all</span>
            </button>
            <button style={styles.applyFilterBtn} onClick={applyFilters}>
              <Search size={16} color="#fff" />
              <span style={styles.applyFilterBtnText}>Apply Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      <div ref={scrollContainerRef} style={styles.listContainer}>
        {loading ? (
          <div style={styles.skeletonList}>
            {[1, 2, 3, 4, 5].map((i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>⚠️</span>
            <p style={styles.emptyTitle}>Could not load</p>
            <p style={styles.emptySub}>{error}</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No opportunities found</p>
            <p style={styles.emptySub}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {hasActiveFilters && (
              <div style={styles.filteredBanner}>
                <span style={styles.filteredText}>Filters applied</span>
              </div>
            )}
            {opportunities.map((opp) => {
              const imageUrl = getFullImageUrl(opp.image);
              return (
                <div key={opp.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.logo}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={getDisplayValue(opp.title)}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            // Fallback to initials on error
                            (e.target as HTMLImageElement).style.display =
                              "none";
                            const parent = (e.target as HTMLElement)
                              .parentElement;
                            if (parent) {
                              const fallback = document.createElement("span");
                              fallback.style.cssText =
                                "font-size:20px;font-weight:600;color:#fb8500";
                              fallback.textContent =
                                getDisplayValue(opp.title).charAt(0) || "C";
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <span style={styles.logoText}>
                          {getDisplayValue(opp.title).charAt(0) || "C"}
                        </span>
                      )}
                    </div>
                    <div style={styles.cardInfo}>
                      <h3 style={styles.cardTitle}>
                        {getDisplayValue(opp.title)}
                      </h3>
                      <p style={styles.cardCompany}>
                        {getDisplayValue(
                          (opp as any).company_name || opp.company,
                        )}
                      </p>
                    </div>
                  </div>
                  <div style={styles.metaRow}>
                    <span style={styles.metaItem}>
                      <MapPin size={12} color={colors.text.muted} />
                      <span>{getLocationName((opp as any).location)}</span>
                    </span>
                    <span style={styles.metaItem}>
                      <Clock size={12} color={colors.text.muted} />
                      <span>
                        Closes{" "}
                        {opp.closing_date
                          ? new Date(opp.closing_date).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </span>
                  </div>
                  <div style={styles.tagsRow}>
                    <span style={{ ...styles.tag, ...styles.tagPrimary }}>
                      {getDisplayValue(opp.type)}
                    </span>
                    {Array.isArray(opp.tags) &&
                      opp.tags.map((t, idx) => (
                        <span key={idx} style={styles.tag}>
                          {getDisplayValue(t)}
                        </span>
                      ))}
                  </div>
                  <div style={styles.cardFooter}>
                    <span style={styles.deadlineText}>
                      Deadline:{" "}
                      {opp.closing_date
                        ? new Date(opp.closing_date).toLocaleDateString()
                        : "N/A"}
                    </span>
                    <button
                      onClick={() => onViewOpportunity?.(opp.id)}
                      style={styles.viewButton}
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
            {loadingMore && (
              <div style={styles.loadingMore}>
                <span style={styles.loadingMoreText}>Loading more...</span>
              </div>
            )}
            {!hasMore && opportunities.length > 0 && (
              <div style={styles.endMessage}>
                <span style={styles.endMessageText}>
                  You've seen all opportunities
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    return <div style={fullscreenStyles.fullscreenWrapper}>{content}</div>;
  }
  return content;
};

export default OpportunitiesTab;
