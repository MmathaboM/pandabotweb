// src/pages/CVBuilderPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  GraduationCap,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  educationService,
  experienceService,
  skillsService,
  type Education,
  type Experience,
  type Skill,
} from "../../services/cv";
import PageHeader from "../../components/PageHeader";

type Tab = "education" | "experience" | "skills";

function formatDisplayDate(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ── Education Form Modal ─────────────────────────────────
interface EducationFormModalProps {
  visible: boolean;
  initial?: Education;
  saving: boolean;
  onSave: (data: Omit<Education, "id" | "created_at" | "updated_at">) => void;
  onClose: () => void;
}

function EducationFormModal({
  visible,
  initial,
  saving,
  onSave,
  onClose,
}: EducationFormModalProps) {
  const [institution, setInstitution] = useState("");
  const [qualification, setQualification] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (visible) {
      setInstitution(initial?.institution ?? "");
      setQualification(initial?.qualification ?? "");
      setFieldOfStudy(initial?.field_of_study ?? "");
      setStartDate(initial?.start_date?.split("T")[0] ?? "");
      setEndDate(initial?.end_date?.split("T")[0] ?? "");
      setCompleted(initial?.completed ?? false);
    }
  }, [visible, initial]);

  if (!visible) return null;

  return (
    <div className="cvm-overlay">
      <div className="cvm-modal">
        <div className="cvm-header">
          <button onClick={onClose} className="cvm-close">
            <X size={24} />
          </button>
          <h3 className="cvm-title">
            {initial ? "Edit Education" : "Add Education"}
          </h3>
          <div className="cvm-spacer" />
        </div>
        <div className="cvm-body">
          <div className="cvm-field">
            <label className="cvm-label">Institution *</label>
            <input
              type="text"
              className="cvm-input"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. University of Cape Town"
            />
          </div>
          <div className="cvm-field">
            <label className="cvm-label">Qualification *</label>
            <input
              type="text"
              className="cvm-input"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="e.g. Bachelor of Science"
            />
          </div>
          <div className="cvm-field">
            <label className="cvm-label">Field of Study</label>
            <input
              type="text"
              className="cvm-input"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </div>
          <div className="cvm-field">
            <label className="cvm-label">Start Date</label>
            <input
              type="date"
              className="cvm-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="cvm-field">
            <label className="cvm-label">End Date</label>
            <input
              type="date"
              className="cvm-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="cvm-switch-row">
            <span className="cvm-label">Completed</span>
            <label className="cvm-switch">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
              <span className="cvm-switch-slider" />
            </label>
          </div>
          <button
            onClick={() => {
              if (!institution.trim() || !qualification.trim()) {
                alert("Institution and qualification are required.");
                return;
              }
              onSave({
                institution: institution.trim(),
                qualification: qualification.trim(),
                field_of_study: fieldOfStudy.trim() || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                completed,
              });
            }}
            disabled={saving}
            className="cvm-save-btn"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Experience Form Modal ───────────────────────────────
interface ExperienceFormModalProps {
  visible: boolean;
  initial?: Experience;
  saving: boolean;
  onSave: (data: Omit<Experience, "id" | "created_at" | "updated_at">) => void;
  onClose: () => void;
}

function ExperienceFormModal({
  visible,
  initial,
  saving,
  onSave,
  onClose,
}: ExperienceFormModalProps) {
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    if (visible) {
      setCompany(initial?.company ?? "");
      setJobTitle(initial?.job_title ?? "");
      setDescription(initial?.description ?? "");
      setStartDate(initial?.start_date?.split("T")[0] ?? "");
      setEndDate(initial?.end_date?.split("T")[0] ?? "");
      setIsCurrent(initial?.is_current ?? false);
    }
  }, [visible, initial]);

  if (!visible) return null;

  return (
    <div className="cvm-overlay">
      <div className="cvm-modal">
        <div className="cvm-header">
          <button onClick={onClose} className="cvm-close">
            <X size={24} />
          </button>
          <h3 className="cvm-title">
            {initial ? "Edit Experience" : "Add Experience"}
          </h3>
          <div className="cvm-spacer" />
        </div>
        <div className="cvm-body">
          <div className="cvm-field">
            <label className="cvm-label">Company *</label>
            <input
              type="text"
              className="cvm-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="cvm-field">
            <label className="cvm-label">Job Title *</label>
            <input
              type="text"
              className="cvm-input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Developer"
            />
          </div>
          <div className="cvm-field">
            <label className="cvm-label">Description</label>
            <textarea
              rows={3}
              className="cvm-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your responsibilities..."
            />
          </div>
          <div className="cvm-field">
            <label className="cvm-label">Start Date</label>
            <input
              type="date"
              className="cvm-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="cvm-switch-row">
            <span className="cvm-label">Currently Working Here</span>
            <label className="cvm-switch">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
              />
              <span className="cvm-switch-slider" />
            </label>
          </div>
          {!isCurrent && (
            <div className="cvm-field">
              <label className="cvm-label">End Date</label>
              <input
                type="date"
                className="cvm-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
          <button
            onClick={() => {
              if (!company.trim() || !jobTitle.trim()) {
                alert("Company and job title are required.");
                return;
              }
              onSave({
                company: company.trim(),
                job_title: jobTitle.trim(),
                description: description.trim() || undefined,
                start_date: startDate || undefined,
                end_date: isCurrent ? undefined : endDate || undefined,
                is_current: isCurrent,
              });
            }}
            disabled={saving}
            className="cvm-save-btn"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main CV Builder Page ─────────────────────────────────
interface CVBuilderPageProps {
  onBack?: () => void;
  onClose?: () => void;
}

export default function CVBuilderPage({ onBack, onClose }: CVBuilderPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("education");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [educations, setEducations] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | undefined>();
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | undefined>();

  const loadData = useCallback(async (showRetry = false) => {
    if (showRetry) setLoading(true);
    setError(null);
    try {
      const [edu, exp, sk] = await Promise.all([
        educationService.list(),
        experienceService.list(),
        skillsService.list(),
      ]);
      setEducations(edu);
      setExperiences(exp);
      setSkills(sk);
    } catch (err: any) {
      console.error("[CVBuilder] load error:", err);
      setError("Failed to load CV data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Education handlers
  const handleSaveEdu = async (
    data: Omit<Education, "id" | "created_at" | "updated_at">,
  ) => {
    setSaving(true);
    try {
      if (editingEdu) {
        const updated = await educationService.update(editingEdu.id, data);
        setEducations((prev) =>
          prev.map((e) => (e.id === editingEdu.id ? updated : e)),
        );
      } else {
        const created = await educationService.create(data);
        setEducations((prev) => [...prev, created]);
      }
      setShowEduModal(false);
      setEditingEdu(undefined);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEdu = (edu: Education) => {
    if (!window.confirm(`Delete ${edu.qualification} at ${edu.institution}?`))
      return;
    (async () => {
      try {
        await educationService.destroy(edu.id);
        setEducations((prev) => prev.filter((e) => e.id !== edu.id));
      } catch {
        alert("Failed to delete");
      }
    })();
  };

  // Experience handlers
  const handleSaveExp = async (
    data: Omit<Experience, "id" | "created_at" | "updated_at">,
  ) => {
    setSaving(true);
    try {
      if (editingExp) {
        const updated = await experienceService.update(editingExp.id, data);
        setExperiences((prev) =>
          prev.map((e) => (e.id === editingExp.id ? updated : e)),
        );
      } else {
        const created = await experienceService.create(data);
        setExperiences((prev) => [...prev, created]);
      }
      setShowExpModal(false);
      setEditingExp(undefined);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExp = (exp: Experience) => {
    if (!window.confirm(`Delete ${exp.job_title} at ${exp.company}?`)) return;
    (async () => {
      try {
        await experienceService.destroy(exp.id);
        setExperiences((prev) => prev.filter((e) => e.id !== exp.id));
      } catch {
        alert("Failed to delete");
      }
    })();
  };

  // Skills handlers
  const handleAddSkill = async () => {
    const name = newSkill.trim();
    if (!name) return;
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      alert("Skill already exists");
      return;
    }
    setSaving(true);
    try {
      const created = await skillsService.create(name);
      setSkills((prev) => [...prev, created]);
      setNewSkill("");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to add skill");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (skill: Skill) => {
    try {
      await skillsService.destroy(skill.id);
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
    } catch {
      alert("Failed to delete skill");
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
      <div className="cv-root">
        {/* ─── Fixed Header ─── */}
        <PageHeader title="CV Builder" onBack={handleBack} />

        {/* ─── Scrollable Content ─── */}
        <div className="cv-content-wrapper">
          {loading ? (
            <div className="cv-loading">
              <div className="cv-spinner" />
            </div>
          ) : error ? (
            <div className="cv-error">
              <p>{error}</p>
              <button onClick={() => loadData(true)} className="cv-retry-btn">
                <RefreshCw size={16} /> Retry
              </button>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="cv-tab-bar">
                <button
                  className={`cv-tab ${activeTab === "education" ? "cv-tab--active" : ""}`}
                  onClick={() => setActiveTab("education")}
                >
                  <GraduationCap size={16} />
                  <span>Education</span>
                </button>
                <button
                  className={`cv-tab ${activeTab === "experience" ? "cv-tab--active" : ""}`}
                  onClick={() => setActiveTab("experience")}
                >
                  <Briefcase size={16} />
                  <span>Experience</span>
                </button>
                <button
                  className={`cv-tab ${activeTab === "skills" ? "cv-tab--active" : ""}`}
                  onClick={() => setActiveTab("skills")}
                >
                  <Tag size={16} />
                  <span>Skills</span>
                </button>
              </div>

              {/* Education Tab */}
              {activeTab === "education" && (
                <div className="cv-content">
                  {educations.length === 0 && (
                    <div className="cv-empty">
                      <GraduationCap size={48} />
                      <p>No education entries yet</p>
                    </div>
                  )}
                  {educations.map((edu) => (
                    <div key={edu.id} className="cv-card">
                      <div className="cv-card__content">
                        <h4 className="cv-card__title">{edu.qualification}</h4>
                        <p className="cv-card__subtitle">{edu.institution}</p>
                        {edu.field_of_study && (
                          <p className="cv-card__detail">
                            {edu.field_of_study}
                          </p>
                        )}
                        <p className="cv-card__date">
                          {formatDisplayDate(edu.start_date)} —{" "}
                          {formatDisplayDate(edu.end_date) ||
                            (edu.completed ? "Completed" : "Present")}
                        </p>
                      </div>
                      <div className="cv-card__actions">
                        <button
                          onClick={() => {
                            setEditingEdu(edu);
                            setShowEduModal(true);
                          }}
                          className="cv-edit-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEdu(edu)}
                          className="cv-delete-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingEdu(undefined);
                      setShowEduModal(true);
                    }}
                    className="cv-add-btn"
                  >
                    <Plus size={18} /> Add Education
                  </button>
                </div>
              )}

              {/* Experience Tab */}
              {activeTab === "experience" && (
                <div className="cv-content">
                  {experiences.length === 0 && (
                    <div className="cv-empty">
                      <Briefcase size={48} />
                      <p>No work experience yet</p>
                    </div>
                  )}
                  {experiences.map((exp) => (
                    <div key={exp.id} className="cv-card">
                      <div className="cv-card__content">
                        <h4 className="cv-card__title">{exp.job_title}</h4>
                        <p className="cv-card__subtitle">{exp.company}</p>
                        {exp.description && (
                          <p className="cv-card__detail">{exp.description}</p>
                        )}
                        <p className="cv-card__date">
                          {formatDisplayDate(exp.start_date)} —{" "}
                          {exp.is_current
                            ? "Present"
                            : formatDisplayDate(exp.end_date)}
                        </p>
                      </div>
                      <div className="cv-card__actions">
                        <button
                          onClick={() => {
                            setEditingExp(exp);
                            setShowExpModal(true);
                          }}
                          className="cv-edit-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExp(exp)}
                          className="cv-delete-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingExp(undefined);
                      setShowExpModal(true);
                    }}
                    className="cv-add-btn"
                  >
                    <Plus size={18} /> Add Experience
                  </button>
                </div>
              )}

              {/* Skills Tab */}
              {activeTab === "skills" && (
                <div className="cv-content">
                  <div className="cv-skill-input-row">
                    <input
                      type="text"
                      className="cv-skill-input"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
                    />
                    <button
                      onClick={handleAddSkill}
                      disabled={!newSkill.trim() || saving}
                      className="cv-skill-add-btn"
                    >
                      {saving ? (
                        <div className="cv-spinner-small" />
                      ) : (
                        <Plus size={20} />
                      )}
                    </button>
                  </div>
                  {skills.length === 0 ? (
                    <div className="cv-empty">
                      <Tag size={48} />
                      <p>No skills added yet</p>
                    </div>
                  ) : (
                    <div className="cv-chips">
                      {skills.map((skill) => (
                        <div key={skill.id} className="cv-chip">
                          <span>{skill.name}</span>
                          <button onClick={() => handleDeleteSkill(skill)}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <EducationFormModal
          visible={showEduModal}
          initial={editingEdu}
          saving={saving}
          onSave={handleSaveEdu}
          onClose={() => {
            setShowEduModal(false);
            setEditingEdu(undefined);
          }}
        />
        <ExperienceFormModal
          visible={showExpModal}
          initial={editingExp}
          saving={saving}
          onSave={handleSaveExp}
          onClose={() => {
            setShowExpModal(false);
            setEditingExp(undefined);
          }}
        />
      </div>
    </>
  );
}

const CSS = `
  :root {
    --cv-primary: #fb8500;
    --cv-primary-dark: #e85d04;
    --cv-bg: #f4f5f7;
    --cv-card-bg: #ffffff;
    --cv-text: #1a1a2e;
    --cv-text-secondary: #6b7280;
    --cv-text-muted: #9ca3af;
    --cv-border: #e5e7eb;
    --cv-radius: 16px;
  }

  /* Root - fixed overlay */
  .cv-root {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: var(--cv-bg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* Scrollable content */
  .cv-content-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 0 0 80px;
  }

  /* Loading & Error */
  .cv-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 64px;
    margin-top: 40px;
  }
  .cv-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top-color: var(--cv-primary);
    border-radius: 50%;
    animation: cv-spin 0.7s linear infinite;
  }
  .cv-spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: cv-spin 0.6s linear infinite;
  }
  @keyframes cv-spin {
    to { transform: rotate(360deg); }
  }
  .cv-error {
    text-align: center;
    padding: 48px 20px;
    color: #dc2626;
  }
  .cv-retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 16px;
    background: var(--cv-primary);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 24px;
    cursor: pointer;
    font-weight: 500;
  }

  /* Tab bar */
  .cv-tab-bar {
    display: flex;
    background: white;
    border-bottom: 1px solid var(--cv-border);
    padding: 0 16px;
    gap: 8px;
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .cv-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 16px;
    background: none;
    border: none;
    font-size: 14px;
    font-weight: 500;
    color: var(--cv-text-muted);
    cursor: pointer;
    border-radius: 8px 8px 0 0;
    transition: all 0.2s;
  }
  .cv-tab--active {
    background: var(--cv-primary);
    color: white;
  }
  .cv-tab:not(.cv-tab--active):hover {
    color: var(--cv-primary);
    background: #fff3e0;
  }

  /* Content area */
  .cv-content {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  /* Empty state */
  .cv-empty {
    text-align: center;
    padding: 48px 20px;
    color: var(--cv-text-muted);
  }
  .cv-empty svg {
    margin-bottom: 12px;
    opacity: 0.5;
  }

  /* Cards */
  .cv-card {
    background: var(--cv-card-bg);
    border-radius: var(--cv-radius);
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    border: 1px solid var(--cv-border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    transition: box-shadow 0.2s;
  }
  .cv-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  .cv-card__content {
    flex: 1;
  }
  .cv-card__title {
    font-weight: 700;
    font-size: 16px;
    color: var(--cv-text);
    margin: 0 0 4px 0;
  }
  .cv-card__subtitle {
    font-size: 14px;
    color: var(--cv-text-secondary);
    margin: 0 0 2px 0;
  }
  .cv-card__detail {
    font-size: 13px;
    color: var(--cv-text-muted);
    margin: 4px 0 0 0;
  }
  .cv-card__date {
    font-size: 12px;
    color: var(--cv-text-muted);
    margin: 6px 0 0 0;
  }
  .cv-card__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 12px;
  }
  .cv-edit-btn {
    background: rgba(251,133,0,0.1);
    color: var(--cv-primary);
    border: none;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  .cv-edit-btn:hover {
    background: rgba(251,133,0,0.2);
  }
  .cv-delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    color: #9ca3af;
    transition: color 0.2s;
  }
  .cv-delete-btn:hover {
    color: #dc2626;
  }

  /* Add button */
  .cv-add-btn {
    width: 100%;
    background: var(--cv-primary);
    color: white;
    border: none;
    padding: 14px;
    border-radius: 14px;
    font-weight: 600;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    margin-top: 8px;
    transition: background 0.2s;
  }
  .cv-add-btn:hover {
    background: var(--cv-primary-dark);
  }

  /* Skills */
  .cv-skill-input-row {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .cv-skill-input {
    flex: 1;
    border: 1px solid var(--cv-border);
    border-radius: 12px;
    padding: 12px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  .cv-skill-input:focus {
    border-color: var(--cv-primary);
  }
  .cv-skill-add-btn {
    background: var(--cv-primary);
    color: white;
    border: none;
    width: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
  }
  .cv-skill-add-btn:hover:not(:disabled) {
    background: var(--cv-primary-dark);
  }
  .cv-skill-add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .cv-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cv-chip {
    background: white;
    border: 1px solid var(--cv-border);
    border-radius: 24px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--cv-text);
  }
  .cv-chip button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    color: var(--cv-text-muted);
    transition: color 0.2s;
  }
  .cv-chip button:hover {
    color: #dc2626;
  }

  /* Modal styles */
  .cvm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .cvm-modal {
    background: white;
    border-radius: 24px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .cvm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--cv-border);
  }
  .cvm-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }
  .cvm-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--cv-text);
  }
  .cvm-spacer {
    width: 32px;
  }
  .cvm-body {
    padding: 20px;
  }
  .cvm-field {
    margin-bottom: 16px;
  }
  .cvm-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--cv-text-secondary);
    margin-bottom: 4px;
  }
  .cvm-input, .cvm-textarea {
    width: 100%;
    border: 1px solid var(--cv-border);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }
  .cvm-input:focus, .cvm-textarea:focus {
    border-color: var(--cv-primary);
  }
  .cvm-textarea {
    resize: vertical;
    min-height: 80px;
  }
  .cvm-switch-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 16px 0;
  }
  .cvm-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }
  .cvm-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .cvm-switch-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.2s;
    border-radius: 24px;
  }
  .cvm-switch-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
  }
  .cvm-switch input:checked + .cvm-switch-slider {
    background-color: var(--cv-primary);
  }
  .cvm-switch input:checked + .cvm-switch-slider:before {
    transform: translateX(20px);
  }
  .cvm-save-btn {
    width: 100%;
    background: var(--cv-primary);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    margin-top: 16px;
    transition: background 0.2s;
  }
  .cvm-save-btn:hover:not(:disabled) {
    background: var(--cv-primary-dark);
  }
  .cvm-save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
