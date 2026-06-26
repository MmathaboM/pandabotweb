import { useState, useEffect, useCallback } from "react";
import {
  opportunitiesService,
  OpportunityFilters,
} from "../services/opportunitiesService";
import { mockOpportunities } from "../data/mock";
import type { Opportunity } from "../types";

interface UseOpportunitiesResult {
  opportunities: Opportunity[];
  loading: boolean;
  error: string | null;
  refetch: (filters?: OpportunityFilters) => void;
  applyFor: (id: string) => Promise<void>;
  bookmark: (id: string) => Promise<void>;
}

export const useOpportunities = (
  initialFilters?: OpportunityFilters,
): UseOpportunitiesResult => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (filters?: OpportunityFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await opportunitiesService.getOpportunities(filters);
      setOpportunities(data);
    } catch (err: any) {
      // Fall back to mock data in development / when API is unreachable
      console.warn(
        "[useOpportunities] API unavailable, using mock data",
        err?.message,
      );
      setOpportunities(mockOpportunities);
      setError(null); // Don't show error if mock fallback succeeds
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(initialFilters);
  }, []);
  const applyFor = async (id: string) => {
    await opportunitiesService.applyForOpportunity(id);
  };

  const bookmark = async (id: string) => {
    await opportunitiesService.bookmarkOpportunity(id);
  };

  return { opportunities, loading, error, refetch: fetch, applyFor, bookmark };
};
