import api from "./api";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Education {
  id: number;
  institution: string;
  qualification: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Experience {
  id: number;
  company: string;
  job_title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Skill {
  id: number;
  name: string;
  created_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── Education CRUD ─────────────────────────────────────────────────────────────
export const educationService = {
  list: async (): Promise<Education[]> => {
    try {
      const res = await api.get<ApiResponse<Education[]>>(
        "v1/profile/educations",
      );
      return res.data.data ?? [];
    } catch (error) {
      console.error("[educationService.list] Failed:", error);
      return []; // fallback to empty array
    }
  },

  create: async (
    data: Omit<Education, "id" | "created_at" | "updated_at">,
  ): Promise<Education> => {
    const res = await api.post<ApiResponse<Education>>(
      "v1/profile/educations",
      data,
    );
    return res.data.data;
  },

  update: async (id: number, data: Partial<Education>): Promise<Education> => {
    const res = await api.put<ApiResponse<Education>>(
      `v1/profile/educations/${id}`,
      data,
    );
    return res.data.data;
  },

  destroy: async (id: number): Promise<void> => {
    await api.delete(`v1/profile/educations/${id}`);
  },
};

// ── Experience CRUD ────────────────────────────────────────────────────────────
export const experienceService = {
  list: async (): Promise<Experience[]> => {
    try {
      const res = await api.get<ApiResponse<Experience[]>>(
        "v1/profile/experiences",
      );
      return res.data.data ?? [];
    } catch (error) {
      console.error("[experienceService.list] Failed:", error);
      return [];
    }
  },

  create: async (
    data: Omit<Experience, "id" | "created_at" | "updated_at">,
  ): Promise<Experience> => {
    const res = await api.post<ApiResponse<Experience>>(
      "v1/profile/experiences",
      data,
    );
    return res.data.data;
  },

  update: async (
    id: number,
    data: Partial<Experience>,
  ): Promise<Experience> => {
    const res = await api.put<ApiResponse<Experience>>(
      `v1/profile/experiences/${id}`,
      data,
    );
    return res.data.data;
  },

  destroy: async (id: number): Promise<void> => {
    await api.delete(`v1/profile/experiences/${id}`);
  },
};

// ── Skills CRUD ────────────────────────────────────────────────────────────────
export const skillsService = {
  list: async (): Promise<Skill[]> => {
    try {
      const res = await api.get<ApiResponse<Skill[]>>("v1/profile/skills");
      return res.data.data ?? [];
    } catch (error) {
      console.error("[skillsService.list] Failed:", error);
      return []; // fallback to empty array – UI will show "No skills added yet"
    }
  },

  create: async (name: string): Promise<Skill> => {
    const res = await api.post<ApiResponse<Skill>>("v1/profile/skills", {
      name,
    });
    return res.data.data;
  },

  destroy: async (id: number): Promise<void> => {
    await api.delete(`v1/profile/skills/${id}`);
  },

  bulkUpdate: async (skills: string[]): Promise<Skill[]> => {
    const res = await api.post<ApiResponse<Skill[]>>(
      "v1/profile/skills/bulk-update",
      { skills },
    );
    return res.data.data ?? [];
  },
};
