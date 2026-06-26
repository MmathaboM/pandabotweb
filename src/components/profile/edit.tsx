import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { profileService } from "../../services/profile";
import { useUserStore } from "../../stores/Userstore";

import type {
  ExtendedUser,
  ReferenceData,
  ProfileUpdateRequest,
} from "../../services/profile";

// ── PickerModal ──────────────────────────────────────────────────────────────
interface PickerOption {
  value: string | number;
  label: string;
}

interface PickerConfig {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected?: string | number;
  onSelect: (v: string | number) => void;
}

function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected?: string | number;
  onSelect: (value: string | number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="ep-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="ep-picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ep-picker-header">
          <span className="ep-picker-title">{title}</span>
          <button
            type="button"
            className="ep-picker-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} color="#6b7280" />
          </button>
        </div>

        <div className="ep-picker-list" role="listbox">
          {options.map((opt) => {
            const isActive = opt.value === selected;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`ep-picker-option${isActive ? " ep-picker-option--active" : ""}`}
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <span>{opt.label}</span>
                {isActive && <CheckCircle2 size={18} color="#fb8500" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── EditProfilePage ──────────────────────────────────────────────────────────
interface EditProfilePageProps {
  onBack?: () => void;
  onSave?: () => void;
}

const EditProfilePage: React.FC<EditProfilePageProps> = ({
  onBack,
  onSave,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ExtendedUser | null>(null);
  const [refData, setRefData] = useState<ReferenceData | null>(null);

  // Form state – Basic Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [middleNames, setMiddleNames] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");

  // Form state – Demographics
  const [saIdNumber, setSaIdNumber] = useState("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [genderId, setGenderId] = useState<number | undefined>();
  const [equityGroup, setEquityGroup] = useState<string>("");
  const [disabilityDeclaration, setDisabilityDeclaration] =
    useState<string>("");
  const [disabilityTypeId, setDisabilityTypeId] = useState<
    number | undefined
  >();
  const [nationalityCountryId, setNationalityCountryId] = useState<
    number | undefined
  >();

  // Form state – Address
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [provinceId, setProvinceId] = useState<number | undefined>();
  const [countryId, setCountryId] = useState<number | undefined>();

  const [disabilityTypes, setDisabilityTypes] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [pickerConfig, setPickerConfig] = useState<PickerConfig>({
    visible: false,
    title: "",
    options: [],
    onSelect: () => {},
  });

  const toNumber = useCallback(
    (val: string | number | undefined): number | undefined => {
      if (val === undefined) return undefined;
      if (typeof val === "number") return val;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? undefined : parsed;
    },
    [],
  );

  const loadData = useCallback(async () => {
    try {
      const [user, ref] = await Promise.all([
        profileService.getProfile(),
        profileService.getReferenceData(),
      ]);
      setProfile(user);
      setRefData(ref);

      if (ref.disability_types) {
        setDisabilityTypes(ref.disability_types);
      } else {
        // Fallback disability types in case the API doesn't return them
        setDisabilityTypes([
          { id: 1, name: "Physical" },
          { id: 2, name: "Visual" },
          { id: 3, name: "Hearing" },
          { id: 4, name: "Intellectual" },
          { id: 5, name: "Learning" },
          { id: 6, name: "Mental Health" },
          { id: 7, name: "Other" },
        ]);
      }

      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPreferredName(user.preferred_name || "");
      setMiddleNames(user.middle_names || "");
      setMobileNumber(user.mobile_number || "");
      setPersonalEmail(user.email || "");
      setSaIdNumber(user.demographics?.sa_id_number || "");

      if (user.demographics?.date_of_birth) {
        setBirthDate(user.demographics.date_of_birth.split("T")[0]);
      }

      setGenderId(toNumber(user.demographics?.gender_id));
      // Normalise to lowercase to match picker options
      setEquityGroup(user.demographics?.equity_group?.toLowerCase() || "");
      setDisabilityDeclaration(
        user.demographics?.disability_declaration?.toLowerCase() || "",
      );
      setDisabilityTypeId(toNumber(user.demographics?.disability_type_id));
      setNationalityCountryId(
        toNumber(user.demographics?.nationality_country_id),
      );

      setAddressLine1(user.personal_info?.address_line_1 || "");
      setAddressLine2(user.personal_info?.address_line_2 || "");
      setSuburb(user.personal_info?.suburb || "");
      setCity(user.personal_info?.city || "");
      setPostalCode(user.personal_info?.postal_code || "");
      setProvinceId(toNumber(user.personal_info?.province_id));
      setCountryId(toNumber(user.personal_info?.country_id));
    } catch (err) {
      console.error("[EditProfile] load error:", err);
      alert("Failed to load profile data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [toNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert("First name and last name are required.");
      return;
    }

    setSaving(true);
    try {
      const payload: ProfileUpdateRequest = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        preferred_name: preferredName.trim() || undefined,
        middle_names: middleNames.trim() || undefined,
        mobile_number: mobileNumber.trim() || undefined,
        personal_email: personalEmail.trim() || undefined,
        sa_id_number: saIdNumber.trim() || undefined,
        date_of_birth: birthDate || undefined,
        gender_id: genderId,
        equity_group: equityGroup || undefined,
        disability_declaration: disabilityDeclaration || undefined,
        disability_type_id: disabilityTypeId,
        nationality_country_id: nationalityCountryId,
        address_line_1: addressLine1.trim() || undefined,
        address_line_2: addressLine2.trim() || undefined,
        suburb: suburb.trim() || undefined,
        city: city.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        province_id: provinceId,
        country_id: countryId,
      };

      console.log("Saving payload:", payload);

      const result = await profileService.updateProfile(payload);
      console.log("Update response:", result);

      if (result.user) {
        const u = result.user;
        useUserStore.getState().setUser({
          uid: String(u.id),
          id: u.id,
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name,
          phone: u.mobile_number,
          avatar: u.avatar,
          role: u.role,
        });
      }

      // ✅ Refresh the entire form with the latest data from the server
      await loadData();

      onSave?.();

      alert("Profile updated successfully!");
      if (onBack) onBack();
      else window.history.back();
    } catch (err: any) {
      console.error("[EditProfile] save error:", err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save changes.";
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const openPicker = (
    title: string,
    options: PickerOption[],
    selected: string | number | undefined,
    onSelect: (v: string | number) => void,
  ) => {
    setPickerConfig({ visible: true, title, options, selected, onSelect });
  };

  // ── Build picker options ──
  const genderOptions: PickerOption[] =
    refData?.genders?.map((g) => ({ value: g.value, label: g.label })) ?? [];
  const equityGroupOptions: PickerOption[] = refData?.equity_groups ?? [
    { value: "african", label: "African" },
    { value: "coloured", label: "Coloured" },
    { value: "indian", label: "Indian/Asian" },
    { value: "white", label: "White" },
    { value: "other", label: "Other" },
    { value: "prefer_not_to_say", label: "Prefer not to say" },
  ];
  const disabilityOptions: PickerOption[] =
    refData?.disability_declarations ?? [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "prefer_not_to_say", label: "Prefer not to say" },
    ];
  const disabilityTypeOptions: PickerOption[] =
    disabilityTypes.length > 0
      ? disabilityTypes.map((dt) => ({ value: dt.id, label: dt.name }))
      : [
          { value: 1, label: "Physical" },
          { value: 2, label: "Visual" },
          { value: 3, label: "Hearing" },
          { value: 4, label: "Intellectual" },
          { value: 5, label: "Learning" },
          { value: 6, label: "Mental Health" },
          { value: 7, label: "Other" },
        ];
  const provinceOptions: PickerOption[] =
    refData?.provinces?.map((p) => ({ value: p.id, label: p.name })) ?? [];
  const countryOptions: PickerOption[] =
    refData?.countries?.map((c) => ({ value: c.id, label: c.name })) ?? [];

  const selectedGenderLabel =
    genderOptions.find((g) => g.value === genderId)?.label || "";
  const selectedEquityGroupLabel =
    equityGroupOptions.find((e) => e.value === equityGroup)?.label || "";
  const selectedDisabilityLabel =
    disabilityOptions.find((d) => d.value === disabilityDeclaration)?.label ||
    "";
  const selectedDisabilityTypeLabel =
    disabilityTypeOptions.find((dt) => dt.value === disabilityTypeId)?.label ||
    "";
  const selectedProvinceLabel =
    provinceOptions.find((p) => p.value === provinceId)?.label || "";
  const selectedCountryLabel =
    countryOptions.find((c) => c.value === countryId)?.label || "";

  return (
    <>
      <style>{CSS}</style>
      <div className="ep-root">
        {/* ─── Fixed Header ─── */}
        <div className="ep-header">
          <button
            type="button"
            className="ep-header__back"
            onClick={() => (onBack ? onBack() : window.history.back())}
            aria-label="Go back"
          >
            <ChevronLeft size={20} color="#fff" />
          </button>
          <h1 className="ep-header__title">Personal Info</h1>
          <div style={{ width: 36, flexShrink: 0 }} />
        </div>

        {/* ─── Scrollable Content ─── */}
        <div className="ep-body">
          {loading ? (
            <div className="ep-loading">
              <div className="ep-spinner" />
              <span>Loading profile data…</span>
            </div>
          ) : (
            <>
              {/* Basic Information */}
              <p className="ep-section-title">Basic Information</p>
              <div className="ep-card">
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-firstName">
                    First Name *
                  </label>
                  <input
                    id="ep-firstName"
                    className="ep-input"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="ep-divider" />
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-lastName">
                    Last Name *
                  </label>
                  <input
                    id="ep-lastName"
                    className="ep-input"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="ep-divider" />
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-mobile">
                    Mobile Number
                  </label>
                  <input
                    id="ep-mobile"
                    className="ep-input"
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g., 0821234567"
                  />
                </div>
                <div className="ep-divider" />
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-email">
                    Email
                  </label>
                  <input
                    id="ep-email"
                    className="ep-input"
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Demographics */}
              <p className="ep-section-title">Demographics</p>
              <div className="ep-card">
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-saId">
                    SA ID Number
                  </label>
                  <input
                    id="ep-saId"
                    className="ep-input"
                    type="text"
                    inputMode="numeric"
                    value={saIdNumber}
                    onChange={(e) =>
                      setSaIdNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 13),
                      )
                    }
                    placeholder="Enter SA ID number"
                    maxLength={13}
                  />
                </div>
                <div className="ep-divider" />
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-dob">
                    Date of Birth
                  </label>
                  <input
                    id="ep-dob"
                    className="ep-input ep-input--date"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    min="1940-01-01"
                  />
                </div>
                <div className="ep-divider" />
                <button
                  type="button"
                  className="ep-field ep-field--picker"
                  onClick={() =>
                    openPicker("Gender", genderOptions, genderId, (v) =>
                      setGenderId(toNumber(v)),
                    )
                  }
                >
                  <span className="ep-label">Gender</span>
                  <span
                    className={`ep-picker-val${!selectedGenderLabel ? " ep-placeholder" : ""}`}
                  >
                    {selectedGenderLabel || "Select gender"}
                  </span>
                  <ChevronRight size={16} color="#d1d5db" />
                </button>
                <div className="ep-divider" />
                <button
                  type="button"
                  className="ep-field ep-field--picker"
                  onClick={() =>
                    openPicker(
                      "Equity Group",
                      equityGroupOptions,
                      equityGroup,
                      (v) => setEquityGroup(String(v)),
                    )
                  }
                >
                  <span className="ep-label">Race / Equity Group</span>
                  <span
                    className={`ep-picker-val${!selectedEquityGroupLabel ? " ep-placeholder" : ""}`}
                  >
                    {selectedEquityGroupLabel || "Select equity group"}
                  </span>
                  <ChevronRight size={16} color="#d1d5db" />
                </button>
                <div className="ep-divider" />
                <button
                  type="button"
                  className="ep-field ep-field--picker"
                  onClick={() =>
                    openPicker(
                      "Disability Status",
                      disabilityOptions,
                      disabilityDeclaration,
                      (v) => {
                        setDisabilityDeclaration(String(v));
                        if (v !== "yes") setDisabilityTypeId(undefined);
                      },
                    )
                  }
                >
                  <span className="ep-label">Disability</span>
                  <span
                    className={`ep-picker-val${!selectedDisabilityLabel ? " ep-placeholder" : ""}`}
                  >
                    {selectedDisabilityLabel || "Select option"}
                  </span>
                  <ChevronRight size={16} color="#d1d5db" />
                </button>
                {disabilityDeclaration === "yes" && (
                  <>
                    <div className="ep-divider" />
                    <button
                      type="button"
                      className="ep-field ep-field--picker"
                      onClick={() =>
                        openPicker(
                          "Disability Type",
                          disabilityTypeOptions,
                          disabilityTypeId,
                          (v) => setDisabilityTypeId(toNumber(v)),
                        )
                      }
                    >
                      <span className="ep-label">Disability Type</span>
                      <span
                        className={`ep-picker-val${!selectedDisabilityTypeLabel ? " ep-placeholder" : ""}`}
                      >
                        {selectedDisabilityTypeLabel ||
                          "Select disability type"}
                      </span>
                      <ChevronRight size={16} color="#d1d5db" />
                    </button>
                  </>
                )}
              </div>

              {/* Address */}
              <p className="ep-section-title">Address</p>
              <div className="ep-card">
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-addr1">
                    Address Line 1
                  </label>
                  <input
                    id="ep-addr1"
                    className="ep-input"
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div className="ep-divider" />
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-addr2">
                    Address Line 2
                  </label>
                  <input
                    id="ep-addr2"
                    className="ep-input"
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="ep-divider" />
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-suburb">
                    Suburb
                  </label>
                  <input
                    id="ep-suburb"
                    className="ep-input"
                    type="text"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="Suburb / District"
                  />
                </div>
                <div className="ep-divider" />
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-city">
                    City / Town
                  </label>
                  <input
                    id="ep-city"
                    className="ep-input"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City or town"
                  />
                </div>
                <div className="ep-divider" />
                <div className="ep-field">
                  <label className="ep-label" htmlFor="ep-postal">
                    Postal Code
                  </label>
                  <input
                    id="ep-postal"
                    className="ep-input"
                    type="text"
                    inputMode="numeric"
                    value={postalCode}
                    onChange={(e) =>
                      setPostalCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Postal code"
                  />
                </div>
                <div className="ep-divider" />
                <button
                  type="button"
                  className="ep-field ep-field--picker"
                  onClick={() =>
                    openPicker("Province", provinceOptions, provinceId, (v) =>
                      setProvinceId(toNumber(v)),
                    )
                  }
                >
                  <span className="ep-label">Province</span>
                  <span
                    className={`ep-picker-val${!selectedProvinceLabel ? " ep-placeholder" : ""}`}
                  >
                    {selectedProvinceLabel || "Select province"}
                  </span>
                  <ChevronRight size={16} color="#d1d5db" />
                </button>
                <div className="ep-divider" />
                <button
                  type="button"
                  className="ep-field ep-field--picker"
                  onClick={() =>
                    openPicker("Country", countryOptions, countryId, (v) =>
                      setCountryId(toNumber(v)),
                    )
                  }
                >
                  <span className="ep-label">Country</span>
                  <span
                    className={`ep-picker-val${!selectedCountryLabel ? " ep-placeholder" : ""}`}
                  >
                    {selectedCountryLabel || "Select country"}
                  </span>
                  <ChevronRight size={16} color="#d1d5db" />
                </button>
              </div>

              <button
                type="button"
                className={`ep-save-btn${saving ? " ep-save-btn--disabled" : ""}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <div className="ep-spinner ep-spinner--sm" />
                ) : (
                  "Save Changes"
                )}
              </button>
              <div style={{ height: 40 }} />
            </>
          )}
        </div>

        <PickerModal
          visible={pickerConfig.visible}
          title={pickerConfig.title}
          options={pickerConfig.options}
          selected={pickerConfig.selected}
          onSelect={pickerConfig.onSelect}
          onClose={() => setPickerConfig((c) => ({ ...c, visible: false }))}
        />
      </div>
    </>
  );
};

export default EditProfilePage;

const CSS = `
  /* ── Root: fixed overlay with flex column ── */
  .ep-root {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: #f4f5f7;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* ── Fixed Header ── */
  .ep-header {
    background: linear-gradient(135deg, #fb8500, #f5a623);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 10;
  }
  .ep-header__back {
    background: rgba(255,255,255,0.2);
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .ep-header__back:hover  { background: rgba(255,255,255,0.32); }
  .ep-header__back:active { background: rgba(255,255,255,0.45); }
  .ep-header__title {
    flex: 1;
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #fff;
    text-align: center;
    letter-spacing: 0.01em;
  }

  /* ── Scrollable Body ── */
  .ep-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px 60px;
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* ── Loading ── */
  .ep-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 80px 0;
    color: #9ca3af;
    font-size: 14px;
  }
  @keyframes ep-spin { to { transform: rotate(360deg); } }
  .ep-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top-color: #fb8500;
    border-radius: 50%;
    animation: ep-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .ep-spinner--sm {
    width: 20px;
    height: 20px;
    border-width: 2px;
    border-color: rgba(255,255,255,0.35);
    border-top-color: #fff;
  }

  /* ── Section title ── */
  .ep-section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #9ca3af;
    margin: 24px 0 10px 4px;
  }

  /* ── Card ── */
  .ep-card {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.055);
  }

  /* ── Field row ── */
  .ep-field {
    display: flex;
    align-items: center;
    padding: 0 16px;
    min-height: 54px;
    width: 100%;
    background: transparent;
    border: none;
    text-align: left;
    cursor: default;
    box-sizing: border-box;
    gap: 10px;
    font-family: inherit;
  }
  .ep-field--picker {
    cursor: pointer;
    transition: background 0.12s;
  }
  .ep-field--picker:hover  { background: #fafafa; }
  .ep-field--picker:active { background: #f3f4f6; }

  .ep-label {
    font-size: 15px;
    font-weight: 500;
    color: #1a1a2e;
    width: 140px;
    flex-shrink: 0;
    text-align: left;
    cursor: inherit;
  }

  .ep-input {
    flex: 1;
    font-size: 15px;
    color: #1a1a2e;
    font-family: inherit;
    text-align: right;
    border: none;
    outline: none;
    background: transparent;
    padding: 0;
    min-width: 0;
  }
  .ep-input::placeholder { color: #9ca3af; }

  .ep-input--date {
    color-scheme: light;
    cursor: pointer;
  }
  .ep-input--date::-webkit-calendar-picker-indicator {
    opacity: 0.45;
    cursor: pointer;
    margin-left: 4px;
  }

  .ep-picker-val {
    flex: 1;
    font-size: 15px;
    color: #1a1a2e;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ep-placeholder { color: #9ca3af; }

  .ep-divider {
    height: 1px;
    background: #f3f4f6;
    margin: 0 16px;
  }

  /* ── Save button ── */
  .ep-save-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background: #fb8500;
    color: #fff;
    border: none;
    border-radius: 14px;
    padding: 0 16px;
    height: 52px;
    font-size: 16px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    margin-top: 28px;
    transition: opacity 0.15s, transform 0.1s;
    box-shadow: 0 4px 14px rgba(251,133,0,0.35);
    letter-spacing: 0.01em;
  }
  .ep-save-btn:hover  { opacity: 0.91; }
  .ep-save-btn:active { transform: scale(0.98); opacity: 1; }
  .ep-save-btn--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* ── Picker Modal ── */
  .ep-picker-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: ep-fade-in 0.15s ease;
  }
  @keyframes ep-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .ep-picker-sheet {
    background: #fff;
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    width: 100%;
    max-width: 600px;
    max-height: 62vh;
    display: flex;
    flex-direction: column;
    animation: ep-slide-up 0.26s cubic-bezier(0.22, 1, 0.36, 1);
    padding-top: 4px;
  }
  .ep-picker-sheet::before {
    content: "";
    display: block;
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: #e5e7eb;
    margin: 8px auto 0;
    flex-shrink: 0;
  }
  @keyframes ep-slide-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0);    }
  }

  .ep-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 12px;
    flex-shrink: 0;
  }
  .ep-picker-title {
    font-size: 17px;
    font-weight: 700;
    color: #1a1a2e;
  }
  .ep-picker-close {
    background: #f3f4f6;
    border: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.12s;
    flex-shrink: 0;
  }
  .ep-picker-close:hover { background: #e5e7eb; }

  .ep-picker-list {
    overflow-y: auto;
    flex: 1;
    padding: 4px 0 24px;
  }

  .ep-picker-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 15px 20px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #f9fafb;
    font-size: 16px;
    color: #1a1a2e;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }
  .ep-picker-option:last-child { border-bottom: none; }
  .ep-picker-option:hover { background: #fafafa; }
  .ep-picker-option:active { background: #f3f4f6; }
  .ep-picker-option--active {
    background: #fff7ed;
    color: #fb8500;
    font-weight: 600;
  }
  .ep-picker-option--active:hover { background: #fff3e0; }
`;
