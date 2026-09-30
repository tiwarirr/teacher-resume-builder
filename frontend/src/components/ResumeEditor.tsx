"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resumeApi, aiApi, ApiError, type BulletRewriteResult } from "@/lib/api";
import {
  emptyResumeContent,
  type AdministrativeRole,
  type EducationEntry,
  type EdTechSkill,
  type ImpactBullet,
  type ReferenceEntry,
  type ResumeContent,
  type TeacherProfile,
  type TeachingExperience,
  type TeachingQualification,
  type TrainingWorkshop,
} from "@/lib/types";

// --- small generic field helpers -------------------------------------------------

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-zinc-400">{hint}</span>}
    </label>
  );
}

const inputClass = "rounded-md border border-zinc-300 px-3 py-2 text-sm";

function Section({ title, description, children, onAdd, addLabel }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          {description && <p className="text-xs text-zinc-500">{description}</p>}
        </div>
        {onAdd && (
          <button onClick={onAdd} className="shrink-0 text-sm font-semibold text-zinc-900 underline">
            {addLabel ?? "+ Add"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function EntryCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
      <button onClick={onRemove} className="mt-2 text-xs text-red-600 underline">
        Remove
      </button>
    </div>
  );
}

function csv(values: string[]): string {
  return values.join(", ");
}
function fromCsv(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

// --- main editor -------------------------------------------------------------------

export function ResumeEditor({ resumeId }: { resumeId: string }) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("classic");
  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState("experienced");
  const [content, setContent] = useState<ResumeContent>(emptyResumeContent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [aiState, setAiState] = useState<
    Record<string, { loading: boolean; result?: BulletRewriteResult; error?: string }>
  >({});

  useEffect(() => {
    (async () => {
      try {
        const resume = await resumeApi.get(resumeId);
        setName(resume.name);
        setTemplate(resume.template);
        setLanguage(resume.language);
        setMode(resume.mode);
        setContent(resume.content);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load this resume.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      setPreviewUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
    };
  }, [resumeId]);

  function updateProfile(patch: Partial<TeacherProfile>) {
    setContent((c) => ({ ...c, profile: { ...c.profile, ...patch } }));
  }

  async function handleAiRewrite(expIndex: number, bulletIndex: number) {
    const key = `${expIndex}-${bulletIndex}`;
    const exp = content.experience[expIndex];
    const bullet = exp.bullets[bulletIndex];
    if (!bullet.raw_duty_text.trim()) return;

    setAiState((s) => ({ ...s, [key]: { loading: true } }));
    try {
      const result = await aiApi.rewriteBullet({
        raw_duty_text: bullet.raw_duty_text,
        subject: exp.subjects.join(", "),
        board: exp.board,
        classes_taught: exp.classes_taught,
      });
      setAiState((s) => ({ ...s, [key]: { loading: false, result } }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not reach the AI service.";
      setAiState((s) => ({ ...s, [key]: { loading: false, error: message } }));
    }
  }

  function acceptAiRewrite(expIndex: number, bulletIndex: number) {
    const key = `${expIndex}-${bulletIndex}`;
    const result = aiState[key]?.result;
    if (!result) return;
    setContent((c) => ({
      ...c,
      experience: c.experience.map((x, j) =>
        j === expIndex
          ? {
              ...x,
              bullets: x.bullets.map((b, k) =>
                k === bulletIndex ? { ...b, ai_rewritten_text: result.rewritten } : b,
              ),
            }
          : x,
      ),
    }));
    setAiState((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
  }

  function clearAiRewrite(expIndex: number, bulletIndex: number) {
    setContent((c) => ({
      ...c,
      experience: c.experience.map((x, j) =>
        j === expIndex
          ? { ...x, bullets: x.bullets.map((b, k) => (k === bulletIndex ? { ...b, ai_rewritten_text: null } : b)) }
          : x,
      ),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await resumeApi.update(resumeId, { name, template, language, mode, content });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      await resumeApi.update(resumeId, { name, template, language, mode, content });
      const res = await fetch(resumeApi.pdfUrl(resumeId), { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Could not render a preview.");
      }
      const blob = await res.blob();
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Could not render a preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Loading resume...</div>;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link href="/dashboard" className="shrink-0 text-sm text-zinc-500 underline">
            &larr; Dashboard
          </Link>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-xl font-bold text-zinc-900 hover:border-zinc-300 focus:border-zinc-300"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inputClass}>
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
            <option value="compact">Compact one-page</option>
            <option value="academic">Academic/CV</option>
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
            <option value="fresher">Fresher</option>
            <option value="experienced">Experienced</option>
            <option value="senior-leadership">Senior leadership</option>
          </select>
          <Link
            href={`/resumes/${resumeId}/tailor`}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Tailor to a job
          </Link>
          <Link
            href={`/resumes/${resumeId}/cover-letter`}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Cover letter
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* --- Left: the guided form --- */}
        <div className="flex flex-col gap-6">
          <Section title="Personal details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  className={inputClass}
                  value={content.profile.full_name}
                  onChange={(e) => updateProfile({ full_name: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <input
                  className={inputClass}
                  value={content.profile.email}
                  onChange={(e) => updateProfile({ email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  value={content.profile.phone}
                  onChange={(e) => updateProfile({ phone: e.target.value })}
                />
              </Field>
              <Field label="Address (optional)">
                <input
                  className={inputClass}
                  value={content.profile.address ?? ""}
                  onChange={(e) => updateProfile({ address: e.target.value || null })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Summary" description="A short 2-3 line professional summary.">
            <textarea
              className={inputClass}
              rows={3}
              value={content.summary}
              onChange={(e) => setContent((c) => ({ ...c, summary: e.target.value }))}
            />
          </Section>

          <Section
            title="Education"
            addLabel="+ Add education"
            onAdd={() =>
              setContent((c) => ({
                ...c,
                education: [
                  ...c.education,
                  { degree: "", institution: "", board_or_university: "", year: new Date().getFullYear(), score: null },
                ],
              }))
            }
          >
            {content.education.length === 0 && <p className="text-sm text-zinc-400">No education added yet.</p>}
            {content.education.map((edu, i) => (
              <EntryCard
                key={i}
                onRemove={() => setContent((c) => ({ ...c, education: c.education.filter((_, j) => j !== i) }))}
              >
                {(
                  [
                    ["Degree", "degree"],
                    ["Institution", "institution"],
                    ["Board / University", "board_or_university"],
                  ] as [string, keyof EducationEntry][]
                ).map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      value={edu[key] as string}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          education: c.education.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)),
                        }))
                      }
                    />
                  </Field>
                ))}
                <Field label="Year">
                  <input
                    type="number"
                    className={inputClass}
                    value={edu.year}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        education: c.education.map((x, j) => (j === i ? { ...x, year: Number(e.target.value) } : x)),
                      }))
                    }
                  />
                </Field>
                <Field label="Score (optional)">
                  <input
                    className={inputClass}
                    value={edu.score ?? ""}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        education: c.education.map((x, j) => (j === i ? { ...x, score: e.target.value || null } : x)),
                      }))
                    }
                  />
                </Field>
              </EntryCard>
            ))}
          </Section>

          <Section
            title="Teaching qualifications"
            description="B.Ed, M.Ed, CTET, TET, NET..."
            addLabel="+ Add qualification"
            onAdd={() =>
              setContent((c) => ({
                ...c,
                qualifications: [
                  ...c.qualifications,
                  { type: "B.Ed", issuing_body: "", year: new Date().getFullYear(), score_or_paper: null },
                ],
              }))
            }
          >
            {content.qualifications.length === 0 && (
              <p className="text-sm text-zinc-400">No qualifications added yet.</p>
            )}
            {content.qualifications.map((q, i) => (
              <EntryCard
                key={i}
                onRemove={() =>
                  setContent((c) => ({ ...c, qualifications: c.qualifications.filter((_, j) => j !== i) }))
                }
              >
                <Field label="Type">
                  <select
                    className={inputClass}
                    value={q.type}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        qualifications: c.qualifications.map((x, j) =>
                          j === i ? { ...x, type: e.target.value as TeachingQualification["type"] } : x,
                        ),
                      }))
                    }
                  >
                    {["B.Ed", "M.Ed", "CTET", "TET", "NET", "D.El.Ed", "Other"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Issuing body">
                  <input
                    className={inputClass}
                    value={q.issuing_body}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        qualifications: c.qualifications.map((x, j) =>
                          j === i ? { ...x, issuing_body: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Year">
                  <input
                    type="number"
                    className={inputClass}
                    value={q.year}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        qualifications: c.qualifications.map((x, j) =>
                          j === i ? { ...x, year: Number(e.target.value) } : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Score / paper (optional)">
                  <input
                    className={inputClass}
                    value={q.score_or_paper ?? ""}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        qualifications: c.qualifications.map((x, j) =>
                          j === i ? { ...x, score_or_paper: e.target.value || null } : x,
                        ),
                      }))
                    }
                  />
                </Field>
              </EntryCard>
            ))}
          </Section>

          <Section
            title="Teaching experience"
            addLabel="+ Add experience"
            onAdd={() =>
              setContent((c) => ({
                ...c,
                experience: [
                  ...c.experience,
                  {
                    school: "",
                    board: "CBSE",
                    post: "TGT",
                    subjects: [],
                    classes_taught: [],
                    dates: "",
                    bullets: [],
                  },
                ],
              }))
            }
          >
            {content.experience.length === 0 && <p className="text-sm text-zinc-400">No experience added yet.</p>}
            {content.experience.map((exp, i) => (
              <div key={i} className="rounded-md border border-zinc-100 bg-zinc-50 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="School">
                    <input
                      className={inputClass}
                      value={exp.school}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          experience: c.experience.map((x, j) => (j === i ? { ...x, school: e.target.value } : x)),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Board">
                    <select
                      className={inputClass}
                      value={exp.board}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          experience: c.experience.map((x, j) =>
                            j === i ? { ...x, board: e.target.value as TeachingExperience["board"] } : x,
                          ),
                        }))
                      }
                    >
                      {["CBSE", "ICSE", "IB", "Cambridge", "State", "Other"].map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Post">
                    <select
                      className={inputClass}
                      value={exp.post}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          experience: c.experience.map((x, j) =>
                            j === i ? { ...x, post: e.target.value as TeachingExperience["post"] } : x,
                          ),
                        }))
                      }
                    >
                      {["PGT", "TGT", "PRT", "Other"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Dates" hint="e.g. Apr 2018 - Present">
                    <input
                      className={inputClass}
                      value={exp.dates}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          experience: c.experience.map((x, j) => (j === i ? { ...x, dates: e.target.value } : x)),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Subjects" hint="Comma-separated">
                    <input
                      className={inputClass}
                      value={csv(exp.subjects)}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          experience: c.experience.map((x, j) =>
                            j === i ? { ...x, subjects: fromCsv(e.target.value) } : x,
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Classes taught" hint="Comma-separated, e.g. VI, VII, VIII">
                    <input
                      className={inputClass}
                      value={csv(exp.classes_taught)}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          experience: c.experience.map((x, j) =>
                            j === i ? { ...x, classes_taught: fromCsv(e.target.value) } : x,
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-700">Impact bullets</p>
                    <button
                      className="text-xs font-semibold text-zinc-900 underline"
                      onClick={() =>
                        setContent((c) => ({
                          ...c,
                          experience: c.experience.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  bullets: [
                                    ...x.bullets,
                                    { raw_duty_text: "", ai_rewritten_text: null, has_verified_metric: false },
                                  ],
                                }
                              : x,
                          ),
                        }))
                      }
                    >
                      + Add bullet
                    </button>
                  </div>
                  <p className="mb-2 text-xs text-zinc-400">
                    Write the plain duty (e.g. &quot;Taught Maths to Class 8&quot;), then click &quot;Rewrite with
                    AI&quot; for an impact-bullet version. It will never invent numbers you haven&apos;t confirmed —
                    if a metric is missing, it asks you for it instead of guessing.
                  </p>
                  {exp.bullets.map((bullet, bi) => {
                    const key = `${i}-${bi}`;
                    const state = aiState[key];
                    return (
                      <div key={bi} className="mb-3">
                        <div className="flex gap-2">
                          <input
                            className={`${inputClass} flex-1`}
                            value={bullet.raw_duty_text}
                            placeholder="e.g. Taught Maths to Class 8"
                            onChange={(e) =>
                              setContent((c) => ({
                                ...c,
                                experience: c.experience.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        bullets: x.bullets.map((b, k) =>
                                          k === bi ? { ...b, raw_duty_text: e.target.value, ai_rewritten_text: null } : b,
                                        ),
                                      }
                                    : x,
                                ),
                              }))
                            }
                          />
                          <button
                            disabled={state?.loading || !bullet.raw_duty_text.trim()}
                            onClick={() => handleAiRewrite(i, bi)}
                            className="shrink-0 whitespace-nowrap text-xs font-semibold text-zinc-900 underline disabled:opacity-40"
                          >
                            {state?.loading ? "Rewriting..." : "✨ Rewrite with AI"}
                          </button>
                          <button
                            className="shrink-0 text-xs text-red-600 underline"
                            onClick={() =>
                              setContent((c) => ({
                                ...c,
                                experience: c.experience.map((x, j) =>
                                  j === i ? { ...x, bullets: x.bullets.filter((_, k) => k !== bi) } : x,
                                ),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>

                        {bullet.ai_rewritten_text && (
                          <div className="mt-1 rounded-md border border-green-200 bg-green-50 p-2 text-xs text-zinc-700">
                            <span className="font-semibold text-green-800">Using AI rewrite: </span>
                            {bullet.ai_rewritten_text}{" "}
                            <button onClick={() => clearAiRewrite(i, bi)} className="ml-1 text-zinc-500 underline">
                              revert
                            </button>
                          </div>
                        )}

                        {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}

                        {state?.result && !bullet.ai_rewritten_text && (
                          <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs">
                            <p className={state.result.has_unverified_numbers ? "text-amber-700" : "text-zinc-700"}>
                              {state.result.rewritten}
                            </p>
                            {state.result.missing_info.length > 0 && (
                              <ul className="mt-1 list-disc pl-4 text-zinc-500">
                                {state.result.missing_info.map((q, qi) => (
                                  <li key={qi}>{q}</li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-2 flex gap-3">
                              <button
                                onClick={() => acceptAiRewrite(i, bi)}
                                className="font-semibold text-zinc-900 underline"
                              >
                                Use this
                              </button>
                              <button
                                onClick={() => setAiState((s) => ({ ...s, [key]: { loading: false } }))}
                                className="text-zinc-500 underline"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  className="mt-3 text-xs text-red-600 underline"
                  onClick={() => setContent((c) => ({ ...c, experience: c.experience.filter((_, j) => j !== i) }))}
                >
                  Remove this experience
                </button>
              </div>
            ))}
          </Section>

          <Section
            title="Administrative & co-curricular"
            description="Exam in-charge, house coordinator, class teacher, HOD..."
            addLabel="+ Add role"
            onAdd={() =>
              setContent((c) => ({ ...c, admin_roles: [...c.admin_roles, { title: "", duration: "", description: "" }] }))
            }
          >
            {content.admin_roles.length === 0 && <p className="text-sm text-zinc-400">No roles added yet.</p>}
            {content.admin_roles.map((role, i) => (
              <EntryCard
                key={i}
                onRemove={() => setContent((c) => ({ ...c, admin_roles: c.admin_roles.filter((_, j) => j !== i) }))}
              >
                {(
                  [
                    ["Title", "title"],
                    ["Duration", "duration"],
                  ] as [string, keyof AdministrativeRole][]
                ).map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      value={role[key]}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          admin_roles: c.admin_roles.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)),
                        }))
                      }
                    />
                  </Field>
                ))}
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={role.description}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          admin_roles: c.admin_roles.map((x, j) =>
                            j === i ? { ...x, description: e.target.value } : x,
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>
              </EntryCard>
            ))}
          </Section>

          <Section
            title="EdTech skills"
            addLabel="+ Add skill"
            onAdd={() =>
              setContent((c) => ({ ...c, edtech_skills: [...c.edtech_skills, { name: "", proficiency: "intermediate" }] }))
            }
          >
            {content.edtech_skills.length === 0 && <p className="text-sm text-zinc-400">No skills added yet.</p>}
            {content.edtech_skills.map((skill, i) => (
              <EntryCard
                key={i}
                onRemove={() =>
                  setContent((c) => ({ ...c, edtech_skills: c.edtech_skills.filter((_, j) => j !== i) }))
                }
              >
                <Field label="Tool">
                  <input
                    className={inputClass}
                    value={skill.name}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        edtech_skills: c.edtech_skills.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      }))
                    }
                  />
                </Field>
                <Field label="Proficiency">
                  <select
                    className={inputClass}
                    value={skill.proficiency}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        edtech_skills: c.edtech_skills.map((x, j) =>
                          j === i ? { ...x, proficiency: e.target.value as EdTechSkill["proficiency"] } : x,
                        ),
                      }))
                    }
                  >
                    {["basic", "intermediate", "advanced"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </EntryCard>
            ))}
          </Section>

          <Section
            title="Trainings & workshops"
            addLabel="+ Add training"
            onAdd={() =>
              setContent((c) => ({
                ...c,
                trainings: [...c.trainings, { title: "", organizer: "", date: "", hours: null }],
              }))
            }
          >
            {content.trainings.length === 0 && <p className="text-sm text-zinc-400">No trainings added yet.</p>}
            {content.trainings.map((t, i) => (
              <EntryCard
                key={i}
                onRemove={() => setContent((c) => ({ ...c, trainings: c.trainings.filter((_, j) => j !== i) }))}
              >
                {(
                  [
                    ["Title", "title"],
                    ["Organiser", "organizer"],
                    ["Date", "date"],
                  ] as [string, keyof TrainingWorkshop][]
                ).map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      value={t[key] as string}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          trainings: c.trainings.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)),
                        }))
                      }
                    />
                  </Field>
                ))}
              </EntryCard>
            ))}
          </Section>

          <Section
            title="References"
            description="Optional - only include with the referee's consent."
            addLabel="+ Add reference"
            onAdd={() =>
              setContent((c) => ({
                ...c,
                references: [...c.references, { name: "", designation: "", school: "", contact: null }],
              }))
            }
          >
            {content.references.length === 0 && <p className="text-sm text-zinc-400">No references added.</p>}
            {content.references.map((ref, i) => (
              <EntryCard
                key={i}
                onRemove={() => setContent((c) => ({ ...c, references: c.references.filter((_, j) => j !== i) }))}
              >
                {(
                  [
                    ["Name", "name"],
                    ["Designation", "designation"],
                    ["School", "school"],
                  ] as [string, keyof ReferenceEntry][]
                ).map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      value={ref[key] as string}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          references: c.references.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)),
                        }))
                      }
                    />
                  </Field>
                ))}
                <Field label="Contact (optional)">
                  <input
                    className={inputClass}
                    value={ref.contact ?? ""}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        references: c.references.map((x, j) =>
                          j === i ? { ...x, contact: e.target.value || null } : x,
                        ),
                      }))
                    }
                  />
                </Field>
              </EntryCard>
            ))}
          </Section>
        </div>

        {/* --- Right: preview --- */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {previewLoading ? "Rendering..." : "Save & preview PDF"}
            </button>
            {previewUrl && (
              <a
                href={previewUrl}
                download={`${name || "resume"}.pdf`}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                Download
              </a>
            )}
          </div>
          {previewError && <p className="text-sm text-red-600">{previewError}</p>}
          <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
            {previewUrl ? (
              <iframe title="Resume preview" src={previewUrl} className="h-full min-h-[600px] w-full" />
            ) : (
              <div className="flex h-full min-h-[600px] items-center justify-center text-sm text-zinc-400">
                Click &quot;Save &amp; preview PDF&quot; to see how your resume looks.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
