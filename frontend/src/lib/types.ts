// Mirrors backend/app/schemas/resume_content.py and resume_api.py by hand for
// the MVP. If this drifts, the backend is the source of truth - consider
// generating these from the FastAPI OpenAPI schema once the shape stabilises.

export type Board = "CBSE" | "ICSE" | "IB" | "Cambridge" | "State" | "Other";
export type Post = "PGT" | "TGT" | "PRT" | "Other";
export type QualificationType =
  | "B.Ed"
  | "M.Ed"
  | "CTET"
  | "TET"
  | "NET"
  | "D.El.Ed"
  | "Other";
export type Proficiency = "basic" | "intermediate" | "advanced";
export type Mode = "fresher" | "experienced" | "senior-leadership";
export type Language = "en" | "hi";
export type Template = "classic" | "modern" | "compact" | "academic";

export interface TeacherProfile {
  full_name: string;
  email: string;
  phone: string;
  photo_url: string | null;
  dob: string | null;
  address: string | null;
  languages: Language[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  board_or_university: string;
  year: number;
  score: string | null;
}

export interface TeachingQualification {
  type: QualificationType;
  issuing_body: string;
  year: number;
  score_or_paper: string | null;
}

export interface ImpactBullet {
  raw_duty_text: string;
  ai_rewritten_text: string | null;
  has_verified_metric: boolean;
}

export interface TeachingExperience {
  school: string;
  board: Board;
  post: Post;
  subjects: string[];
  classes_taught: string[];
  dates: string;
  bullets: ImpactBullet[];
}

export interface AdministrativeRole {
  title: string;
  duration: string;
  description: string;
}

export interface EdTechSkill {
  name: string;
  proficiency: Proficiency;
}

export interface TrainingWorkshop {
  title: string;
  organizer: string;
  date: string;
  hours: number | null;
}

export interface ReferenceEntry {
  name: string;
  designation: string;
  school: string;
  contact: string | null;
}

export interface ResumeContent {
  profile: TeacherProfile;
  summary: string;
  education: EducationEntry[];
  qualifications: TeachingQualification[];
  experience: TeachingExperience[];
  admin_roles: AdministrativeRole[];
  edtech_skills: EdTechSkill[];
  trainings: TrainingWorkshop[];
  references: ReferenceEntry[];
}

export interface ResumeSummary {
  id: string;
  name: string;
  template: Template;
  language: Language;
  mode: Mode;
  updated_at: string;
}

export interface ResumeDetail extends ResumeSummary {
  content: ResumeContent;
  created_at: string;
}

export function emptyResumeContent(): ResumeContent {
  return {
    profile: {
      full_name: "",
      email: "",
      phone: "",
      photo_url: null,
      dob: null,
      address: null,
      languages: ["en"],
    },
    summary: "",
    education: [],
    qualifications: [],
    experience: [],
    admin_roles: [],
    edtech_skills: [],
    trainings: [],
    references: [],
  };
}
