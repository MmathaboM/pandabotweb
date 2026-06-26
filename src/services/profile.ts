import api from "./api";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ExtendedUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number?: string;
  personal_email?: string;
  preferred_name?: string;
  middle_names?: string;
  avatar?: string;
  role?: string;
  roles?: string[];
  is_admin?: boolean;
  is_learner?: boolean;
  is_employee?: boolean;
  is_active?: boolean;
  program?: string;
  has_bank_account?: boolean;
  profile_completion?: number;

  id_verification?: {
    is_verified: boolean;
    status: string;
    verified_at: string | null;
  };

  demographics?: {
    date_of_birth?: string;
    gender_id?: number | string;
    sa_id_number?: string;
    equity_group?: string;
    disability_declaration?: string;
    disability_type_id?: number | string;
    nationality_country_id?: number | string;
    citizenship_status?: string;
  };

  personal_info?: {
    preferred_name?: string;
    middle_names?: string;
    address_line_1?: string;
    address_line_2?: string;
    suburb?: string;
    city?: string;
    postal_code?: string;
    province_id?: number | string;
    province?: string;
    country_id?: number | string;
    country?: string;
  };
}

export interface ProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  mobile_number?: string;
  personal_email?: string;
  preferred_name?: string;
  middle_names?: string;
  // Demographics
  date_of_birth?: string;
  gender_id?: number | string;
  sa_id_number?: string;
  equity_group?: string;
  disability_declaration?: string;
  disability_type_id?: number | string;
  nationality_country_id?: number | string;
  citizenship_status?: string;
  // Address
  address_line_1?: string;
  address_line_2?: string;
  suburb?: string;
  city?: string;
  postal_code?: string;
  province_id?: number | string;
  country_id?: number | string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  message?: string;
  user?: ExtendedUser;
  data?: ExtendedUser;
}

export interface ReferenceData {
  genders: { value: number | string; label: string; code?: string }[];
  provinces: { id: number; name: string; code?: string; country_id?: number }[];
  countries: { id: number; name: string }[];
  equity_groups: { value: string; label: string }[];
  disability_declarations: { value: string; label: string }[];
  nationalities: string[];
  disability_types?: { id: number; name: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Compress and resize an image File using an off-screen canvas.
 * Returns a new File at max 800×800 JPEG, quality 0.7 — mirrors the
 * expo-image-manipulator step from the React Native version.
 */
async function compressImage(
  file: File,
  maxDim = 800,
  quality = 0.7,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Image compression failed"));
          resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}

// ── Service ────────────────────────────────────────────────────────────────────
export const profileService = {
  /**
   * Get current user's full profile with extended data.
   */
  getProfile: async (): Promise<ExtendedUser> => {
    const response = await api.get<{ success: boolean; user: ExtendedUser }>(
      "/v1/auth/me",
    );
    const u = response.data.user;

    return {
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      mobile_number: u.mobile_number,
      personal_email: u.personal_email,
      preferred_name: u.preferred_name,
      middle_names: u.middle_names,
      avatar: u.avatar,
      role: u.role,
      roles: u.roles,
      is_admin: u.is_admin,
      is_learner: u.is_learner,
      is_employee: u.is_employee,
      is_active: u.is_active,
      program: u.program,
      has_bank_account: u.has_bank_account,
      profile_completion: u.profile_completion,

      id_verification: {
        is_verified: u.id_verification?.is_verified ?? false,
        status: u.id_verification?.status ?? "unverified",
        verified_at: u.id_verification?.verified_at ?? null,
      },

      demographics: {
        date_of_birth: u.demographics?.date_of_birth,
        gender_id: u.demographics?.gender_id,
        sa_id_number: u.demographics?.sa_id_number,
        equity_group: u.demographics?.equity_group,
        disability_declaration: u.demographics?.disability_declaration,
        disability_type_id: u.demographics?.disability_type_id,
        nationality_country_id: u.demographics?.nationality_country_id,
        citizenship_status: u.demographics?.citizenship_status,
      },

      personal_info: {
        preferred_name: u.preferred_name,
        middle_names: u.middle_names,
        address_line_1: u.personal_info?.address_line_1,
        address_line_2: u.personal_info?.address_line_2,
        suburb: u.personal_info?.suburb,
        city: u.personal_info?.city,
        postal_code: u.personal_info?.postal_code,
        province_id: u.personal_info?.province_id,
        province: u.personal_info?.province,
        country_id: u.personal_info?.country_id,
        country: u.personal_info?.country,
      },
    };
  },

  /**
   * Fetch reference data (genders, provinces, countries, equity groups).
   */
  getReferenceData: async (): Promise<ReferenceData> => {
    const response = await api.get<any>("/v1/auth/reference-data");
    const data = response.data;

    return {
      genders:
        data.genders?.map((g: any) => ({
          value: g.id,
          label: g.label,
          code: g.code,
        })) ?? [],
      provinces:
        data.provinces?.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          country_id: p.country_id,
        })) ?? [],
      countries:
        data.countries?.map((c: any) => ({
          id: c.id,
          name: c.name,
        })) ?? [],
      equity_groups: [
        { value: "african", label: "African" },
        { value: "coloured", label: "Coloured" },
        { value: "indian", label: "Indian/Asian" },
        { value: "white", label: "White" },
        { value: "other", label: "Other" },
        { value: "prefer_not_to_say", label: "Prefer not to say" },
      ],
      disability_declarations: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "prefer_not_to_say", label: "Prefer not to say" },
      ],
      nationalities: data.countries?.map((c: any) => c.name) ?? [],
      disability_types: data.disability_types ?? [],
    };
  },

  updateProfile: async (
    data: ProfileUpdateRequest,
  ): Promise<ProfileUpdateResponse> => {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    const response = await api.put<ProfileUpdateResponse>(
      "/v1/auth/profile",
      payload,
    );
    return response.data;
  },


  uploadAvatar: async (file: File): Promise<{ avatar: string }> => {
    const compressed = await compressImage(file);

    const formData = new FormData();
    formData.append("avatar", compressed, compressed.name);

    const response = await api.post<ProfileUpdateResponse>(
      "/v1/auth/profile",
      formData,
      {
        headers: {
          // Let the browser set multipart boundary automatically
          "Content-Type": undefined as any,
        },
        timeout: 60000,
      },
    );

    const avatarUrl =
      response.data.user?.avatar ?? (response.data as any).data?.avatar ?? "";

    if (!avatarUrl) {
      console.warn("[Profile] No avatar URL in upload response");
    }

    return { avatar: avatarUrl };
  },
};
