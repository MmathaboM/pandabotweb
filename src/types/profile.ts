// Reference Data Types
export interface Race {
  id: number;
  name: string;
}

export interface Province {
  id: number;
  name: string;
  code?: string;
  country_id?: number;
}

export interface Country {
  id: number;
  name: string;
}

export interface GenderOption {
  value: number;
  label: string;
}

export interface DisabilityType {
  id: number;
  name: string;
}

export interface ReferenceData {
  races?: Race[];
  provinces: Province[];
  countries: Country[];
  genders: GenderOption[];
  equity_groups: Array<{ value: string; label: string }>;
  disability_declarations: Array<{ value: string; label: string }>;
  disability_types?: DisabilityType[];
  nationalities?: string[];
}

// Demographics 
export interface Demographics {
  date_of_birth?: string;
  age?: number;
  gender_id?: number;
  gender?: string;
  sa_id_number?: string;
  equity_group?:
    | "african"
    | "coloured"
    | "indian"
    | "white"
    | "asian"
    | "other"
    | "prefer_not_to_say";
  disability_declaration?: "yes" | "no" | "prefer_not_to_say";
  disability_type_id?: number;
  disability_type?: string;
  nationality_country_id?: number;
  citizenship_status?: string;
}

// Personal Info - Matches backend address fields
export interface PersonalInfo {
  preferred_name?: string;
  middle_names?: string;
  address_line_1?: string;
  address_line_2?: string;
  suburb?: string;
  city?: string;
  postal_code?: string;
  province_id?: number;
  province?: string;
  country_id?: number;
  country?: string;
}

// Program Info
export interface UserProgram {
  id: number;
  title: string;
  code?: string;
}

// Extended User Response 
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
  roles: string[];
  is_admin: boolean;
  is_learner: boolean;
  is_employee: boolean;
  is_active: boolean;
  program?: UserProgram;
  has_bank_account: boolean;
  profile_completion: number;
  demographics: Demographics;
  personal_info: PersonalInfo;
}

// Profile Update Request - Matches backend expectations exactly
export interface ProfileUpdateRequest {
  // Basic info
  first_name?: string;
  last_name?: string;
  preferred_name?: string;
  middle_names?: string;
  mobile_number?: string;
  personal_email?: string;

  // Demographics
  sa_id_number?: string;
  date_of_birth?: string;
  gender_id?: number;
  equity_group?:
    | "african"
    | "coloured"
    | "indian"
    | "white"
    | "asian"
    | "other"
    | "prefer_not_to_say";
  disability_declaration?: "yes" | "no" | "prefer_not_to_say";
  disability_type_id?: number;
  nationality_country_id?: number;

  // Address
  address_line_1?: string;
  address_line_2?: string;
  suburb?: string;
  city?: string;
  postal_code?: string;
  province_id?: number;
  country_id?: number;
}

// Profile Update Response
export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
  user?: ExtendedUser;
}

// Disability Types 
export const DISABILITY_TYPES_FALLBACK = [
  "Physical disability",
  "Visual impairment",
  "Hearing impairment",
  "Intellectual disability",
  "Learning disability",
  "Mental health condition",
  "Chronic illness",
  "Multiple disabilities",
  "Other",
] as const;
