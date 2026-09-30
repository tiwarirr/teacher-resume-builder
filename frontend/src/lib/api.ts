import type { ResumeContent, ResumeDetail, ResumeSummary } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.detail ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface CurrentUser {
  id: string;
  email: string;
  created_at: string;
}

export const authApi = {
  signup: (email: string, password: string) =>
    apiFetch<CurrentUser>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    apiFetch<CurrentUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  me: () => apiFetch<CurrentUser>("/auth/me"),
};

export interface BulletRewriteResult {
  rewritten: string;
  missing_info: string[];
  has_unverified_numbers: boolean;
}

export const aiApi = {
  rewriteBullet: (input: { raw_duty_text: string; subject?: string; board?: string; classes_taught?: string[] }) =>
    apiFetch<BulletRewriteResult>("/ai/rewrite-bullet", { method: "POST", body: JSON.stringify(input) }),
};

export interface TailorResult {
  match_score: number;
  gaps: string[];
  reorder_suggestions: string[];
}

export interface TailoringSessionSummary extends TailorResult {
  id: string;
  job_description_text: string;
  created_at: string;
}

export interface CoverLetterDetail {
  id: string;
  resume_version_id: string;
  kind: "cover_letter" | "teaching_philosophy";
  content: string;
  created_at: string;
  updated_at: string;
}

export const coverLetterApi = {
  generate: (
    resumeId: string,
    input: { kind: "cover_letter" | "teaching_philosophy"; job_description_text: string; tone: string },
  ) =>
    apiFetch<CoverLetterDetail>(`/resumes/${resumeId}/cover-letters`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  list: (resumeId: string) => apiFetch<CoverLetterDetail[]>(`/resumes/${resumeId}/cover-letters`),
  update: (id: string, content: string) =>
    apiFetch<CoverLetterDetail>(`/cover-letters/${id}`, { method: "PUT", body: JSON.stringify({ content }) }),
  remove: (id: string) => apiFetch<void>(`/cover-letters/${id}`, { method: "DELETE" }),
};

export const tailorApi = {
  analyze: (resumeId: string, jobDescriptionText: string) =>
    apiFetch<TailorResult>(`/resumes/${resumeId}/tailor`, {
      method: "POST",
      body: JSON.stringify({ job_description_text: jobDescriptionText }),
    }),
  history: (resumeId: string) => apiFetch<TailoringSessionSummary[]>(`/resumes/${resumeId}/tailoring-sessions`),
};

export const resumeApi = {
  list: () => apiFetch<ResumeSummary[]>("/resumes"),
  get: (id: string) => apiFetch<ResumeDetail>(`/resumes/${id}`),
  create: (input: { name: string; template?: string; language?: string; mode?: string; content?: ResumeContent }) =>
    apiFetch<ResumeDetail>("/resumes", { method: "POST", body: JSON.stringify(input) }),
  update: (
    id: string,
    input: Partial<{ name: string; template: string; language: string; mode: string; content: ResumeContent }>,
  ) => apiFetch<ResumeDetail>(`/resumes/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: string) => apiFetch<void>(`/resumes/${id}`, { method: "DELETE" }),
  duplicate: (id: string) => apiFetch<ResumeDetail>(`/resumes/${id}/duplicate`, { method: "POST" }),
  pdfUrl: (id: string) => `${API_URL}/resumes/${id}/pdf`,
};
