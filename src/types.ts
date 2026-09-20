export interface Complaint {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  address: string;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  status: string;
  ai_category: string | null;
  ai_severity: number | null;
  ai_department: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  ai_provider: string | null;
  severity: number;
  safety_risk: boolean;
  affected_estimate: number;
  location_sensitivity: string;
  priority_score: number;
  priority_band: string;
  duplicate_of: string | null;
  created_at: string;
  links?: ComplaintIssueLink[];
}

export interface CivicIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  department: string;
  address: string;
  lat: number | null;
  lng: number | null;
  status: string;
  severity: number;
  safety_risk: boolean;
  affected_estimate: number;
  location_sensitivity: string;
  priority_score: number;
  priority_band: string;
  priority_factors: PriorityFactor[];
  complaint_count: number;
  assigned_officer: string | null;
  assigned_officer_name: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  rating?: number | null;
  feedback?: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PriorityFactor {
  key: string;
  label: string;
  points: number;
  max: number;
}

export interface ComplaintIssueLink {
  id: string;
  complaint_id: string;
  issue_id: string;
  link_type: string;
  similarity_score: number | null;
  linked_by: string | null;
  created_at: string;
  complaints?: Complaint;
  civic_issues?: CivicIssue;
}

export interface Assignment {
  id: string;
  issue_id: string;
  officer_id: string;
  officer_name: string;
  department: string | null;
  note: string | null;
  due_date: string | null;
  status: string;
  assigned_by: string | null;
  created_at: string;
}

export interface Resolution {
  id: string;
  issue_id: string;
  summary: string;
  action_taken: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  cost_inr: number | null;
  contractor: string | null;
  resolved_by: string | null;
  resolver_name: string | null;
  citizen_rating: number | null;
  citizen_feedback: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface AuditNote {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: { note?: string; author?: string; [k: string]: unknown };
  created_at: string;
}

export interface IssueDetail {
  issue: CivicIssue;
  links: ComplaintIssueLink[];
  assignments: Assignment[];
  resolutions: Resolution[];
  notes: AuditNote[];
  history: AuditNote[];
}

export interface TriageResult {
  category: string;
  severity: number;
  department: string;
  summary: string;
  confidence: number;
  safety_risk: boolean;
  affected_estimate: number;
  location_sensitivity: string;
  keywords: string[];
  priority: { score: number; band: string; factors: PriorityFactor[] };
  duplicate_candidates: DuplicateCandidate[];
  ai_provider: 'gemini' | 'fallback';
  gemini_error?: string | null;
}

export interface DuplicateCandidate {
  complaint: {
    id: string;
    title: string;
    description: string;
    category: string;
    lat: number | null;
    lng: number | null;
    address: string;
    status: string;
    created_at: string;
    image_url: string | null;
  };
  score: number;
  text: number;
  geo: number;
  cat: number;
  distKm: number | null;
  issue_id: string | null;
  issue_status: string | null;
}

export interface OfficerOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  ward: string | null;
}

export interface AnalyticsData {
  totals: {
    issues: number;
    complaints: number;
    open: number;
    resolved: number;
    duplicateLinks: number;
    avgResolutionHrs: number;
    sla72: number;
    aiShare: number;
    avgRating: string | null;
  };
  byStatus: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  byPriority: { name: string; value: number }[];
  departments: {
    name: string;
    full: string;
    total: number;
    resolved: number;
    sla: number;
    avgHours: number | null;
  }[];
  trend: { day: string; key: string; reported: number; resolved: number }[];
  hotspots: {
    id: string;
    title: string;
    category: string;
    priority_band: string;
    status: string;
    lat: number;
    lng: number;
    complaint_count: number;
  }[];
  topAreas: { area: string; total: number; open: number }[];
}
