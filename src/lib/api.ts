import supabase from './supabase';
import type { CivicIssue } from '../types';

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Local dev fallback helpers for when /api serverless functions aren't running natively under Vite dev server
function handleLocalDevApiFallback<T>(path: string, options: RequestInit): T {
  const urlObj = new URL(path, 'http://localhost');
  const pathname = urlObj.pathname;
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};

  if (pathname === '/api/upload' && method === 'POST') {
    const { fileName = 'evidence.jpg', fileBase64, contentType = 'image/jpeg' } = body;
    const dataUrl = fileBase64 ? `data:${contentType};base64,${fileBase64}` : 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80';
    return { url: dataUrl, path: `local/${Date.now()}-${fileName}` } as T;
  }

  if (pathname === '/api/triage-ai' && method === 'POST') {
    const { title = '', description = '', address = '' } = body;
    const text = `${title} ${description} ${address}`.toLowerCase();
    
    let category = 'Roads';
    let department = 'Roads & Transport Department';
    if (text.includes('garbage') || text.includes('trash') || text.includes('waste') || text.includes('dustbin')) {
      category = 'Garbage';
      department = 'Solid Waste Management';
    } else if (text.includes('water') || text.includes('leak') || text.includes('pipe') || text.includes('tap')) {
      category = 'Water';
      department = 'Water Supply Board';
    } else if (text.includes('drain') || text.includes('gutter') || text.includes('sewage') || text.includes('flooding')) {
      category = 'Drainage';
      department = 'Stormwater & Drainage Dept';
    } else if (text.includes('light') || text.includes('lamp') || text.includes('pole') || text.includes('dark')) {
      category = 'Streetlight';
      department = 'Electrical & Streetlight Dept';
    } else if (text.includes('accident') || text.includes('wire') || text.includes('hazard') || text.includes('danger')) {
      category = 'Public Safety';
      department = 'Public Safety Cell';
    }

    const firstLine = description.split(/[.!?\n]/)[0] || title || 'Reported issue';
    const summary = firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine;
    const safetyRisk = text.includes('danger') || text.includes('wire') || text.includes('accident') || text.includes('risk');

    const sev = safetyRisk ? 4 : 3;
    const priorityScore = Math.min(100, 35 + sev * 8 + (safetyRisk ? 20 : 0));
    const priorityBand = priorityScore >= 80 ? 'CRITICAL' : priorityScore >= 60 ? 'HIGH' : priorityScore >= 35 ? 'MEDIUM' : 'LOW';

    return {
      category,
      severity: sev,
      department,
      summary,
      confidence: 0.88,
      safety_risk: safetyRisk,
      affected_estimate: body.affected_estimate || 50,
      location_sensitivity: 'medium',
      keywords: [category.toLowerCase(), 'issue'],
      priority: {
        score: priorityScore,
        band: priorityBand,
        factors: [
          { key: 'severity', label: `Severity ${sev}/5`, points: sev * 6, max: 30 },
          { key: 'affected', label: `~${body.affected_estimate || 50} people affected`, points: 12, max: 15 },
          { key: 'safety', label: safetyRisk ? 'Safety risk detected' : 'No direct safety risk', points: safetyRisk ? 20 : 0, max: 20 },
        ],
      },
      duplicate_candidates: [],
      ai_provider: 'fallback',
    } as T;
  }

  if (pathname === '/api/complaints' && method === 'POST') {
    const { title = '', description = '', address = '', lat, lng, image_url, ai_result } = body;
    const now = new Date().toISOString();
    const complaintId = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const issueId = `issue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const firstSentence = description.split(/[.!?\n]/)[0] || title || 'Reported issue';
    const summary = firstSentence.length > 120 ? firstSentence.slice(0, 117) + '...' : firstSentence;

    const triage = ai_result || {
      category: 'Roads',
      severity: 3,
      department: 'Roads & Transport Department',
      summary,
      confidence: 0.85,
      safety_risk: false,
      affected_estimate: 50,
      location_sensitivity: 'medium',
    };

    const complaint = {
      id: complaintId,
      user_id: 'demo-citizen-id',
      title: title || summary.slice(0, 80),
      description,
      category: triage.category,
      address,
      lat: lat ?? 26.9124,
      lng: lng ?? 75.7873,
      image_url: image_url || null,
      status: 'submitted',
      ai_category: triage.category,
      ai_severity: triage.severity,
      ai_department: triage.department,
      ai_summary: triage.summary,
      ai_confidence: triage.confidence,
      ai_provider: 'local-fallback',
      severity: triage.severity,
      safety_risk: triage.safety_risk,
      affected_estimate: triage.affected_estimate,
      location_sensitivity: triage.location_sensitivity,
      priority_score: 65,
      priority_band: 'HIGH',
      created_at: now,
      updated_at: now,
    };

    const defaultFactors = [
      { key: 'severity', label: 'AI Severity', points: 30, max: 40 },
      { key: 'safety', label: 'Safety Hazard', points: 25, max: 25 },
      { key: 'population', label: 'Affected Count', points: 15, max: 20 },
      { key: 'location', label: 'Location Sensitivity', points: 18, max: 15 },
    ];

    const issue: CivicIssue = {
      id: issueId,
      title: complaint.title,
      description: triage.summary,
      category: triage.category,
      department: triage.department,
      address: complaint.address,
      lat: complaint.lat,
      lng: complaint.lng,
      status: 'open',
      severity: triage.severity,
      safety_risk: triage.safety_risk,
      affected_estimate: triage.affected_estimate,
      location_sensitivity: triage.location_sensitivity,
      priority_score: 65,
      priority_band: 'HIGH',
      priority_factors: defaultFactors,
      complaint_count: 1,
      assigned_officer: null,
      assigned_officer_name: null,
      assigned_at: null,
      resolved_at: null,
      verified_at: null,
      created_by: 'demo-citizen-id',
      created_at: now,
    };

    // Seed demo issues if localStorage is empty
    let storedIssues: CivicIssue[] = [];
    try {
      storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
    } catch {
      storedIssues = [];
    }
    if (storedIssues.length === 0) {
      storedIssues = [
        {
          id: 'issue_demo_1',
          title: 'Dangerous Deep Pothole near M.G. Road Crossing',
          description: 'A 2-foot deep pothole causing vehicle damage and traffic slowdowns on the busy main road.',
          category: 'Roads & Footpaths',
          department: 'Roads & Traffic Department',
          address: 'M.G. Road Crossing, Ward 4, Jaipur',
          lat: 26.9124,
          lng: 75.7873,
          status: 'open',
          severity: 4,
          safety_risk: true,
          affected_estimate: 2500,
          location_sensitivity: 'high',
          priority_score: 88,
          priority_band: 'CRITICAL',
          priority_factors: defaultFactors,
          complaint_count: 3,
          assigned_officer: null,
          assigned_officer_name: null,
          assigned_at: null,
          resolved_at: null,
          verified_at: null,
          created_by: 'demo-citizen-id',
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          id: 'issue_demo_2',
          title: 'Overflowing Commercial Dumpster & Health Hazard',
          description: 'Garbage spilling onto the pavement, blocking pedestrian walkway and attracting stray animals.',
          category: 'Garbage & Sanitation',
          department: 'Sanitation & Waste Management',
          address: 'Central Market Main Road, Jaipur',
          lat: 26.9180,
          lng: 75.7920,
          status: 'triaged',
          severity: 3,
          safety_risk: true,
          affected_estimate: 1200,
          location_sensitivity: 'high',
          priority_score: 76,
          priority_band: 'HIGH',
          priority_factors: defaultFactors,
          complaint_count: 2,
          assigned_officer: null,
          assigned_officer_name: null,
          assigned_at: null,
          resolved_at: null,
          verified_at: null,
          created_by: 'demo-citizen-id',
          created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        },
        {
          id: 'issue_demo_3',
          title: 'Broken Main Water Pipeline Leaking Drinking Water',
          description: 'High-pressure water leakage flooding Sector 7 street for over 8 hours.',
          category: 'Water Supply & Drainage',
          department: 'Water Works Department',
          address: 'Sector 7 Housing Colony, Jaipur',
          lat: 26.9050,
          lng: 75.7800,
          status: 'assigned',
          severity: 3,
          safety_risk: false,
          affected_estimate: 800,
          location_sensitivity: 'medium',
          priority_score: 68,
          priority_band: 'HIGH',
          priority_factors: defaultFactors,
          complaint_count: 1,
          assigned_officer: 'demo-officer-id',
          assigned_officer_name: 'Officer Rajesh Kumar',
          assigned_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          resolved_at: null,
          verified_at: null,
          created_by: 'demo-citizen-id',
          created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        },
        {
          id: 'issue_demo_4',
          title: 'Dark Streetlights along Ring Road Underpass',
          description: 'Multiple streetlights non-functional, creating safety hazard for night commuters.',
          category: 'Street Lighting',
          department: 'Electrical Department',
          address: 'Ring Road Underpass, Jaipur',
          lat: 26.9210,
          lng: 75.7750,
          status: 'open',
          severity: 2,
          safety_risk: true,
          affected_estimate: 500,
          location_sensitivity: 'medium',
          priority_score: 54,
          priority_band: 'MEDIUM',
          priority_factors: defaultFactors,
          complaint_count: 1,
          assigned_officer: null,
          assigned_officer_name: null,
          assigned_at: null,
          resolved_at: null,
          verified_at: null,
          created_by: 'demo-citizen-id',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
      ];
      try {
        localStorage.setItem('civicfix_local_issues', JSON.stringify(storedIssues));
      } catch { /* noop */ }
    }

    // Store in localStorage
    try {
      const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
      storedComplaints.unshift(complaint);
      localStorage.setItem('civicfix_local_complaints', JSON.stringify(storedComplaints));

      storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
      storedIssues.unshift(issue);
      localStorage.setItem('civicfix_local_issues', JSON.stringify(storedIssues));
    } catch {
      /* noop */
    }

    return {
      complaint,
      issue,
      linked_as_duplicate: false,
      duplicate_candidates: [],
      triage,
      ai_provider: 'local-fallback',
    } as T;
  }

  if (pathname === '/api/complaints' && method === 'GET') {
    try {
      const id = urlObj.searchParams.get('id');
      const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
      const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');

      const attachIssue = (c: Record<string, unknown>) => {
        const issue = storedIssues.find((i: { id: string; title: string }) => i.id === c.id || i.title === c.title);
        if (issue) {
          const links = [{
            id: `link_0`,
            issue_id: issue.id,
            complaint_id: c.id,
            link_type: 'primary',
            similarity_score: 1.0,
            linked_by: 'system',
            created_at: issue.created_at,
            civic_issues: issue,
          }];
          return { ...c, status: issue.status || c.status, links };
        }
        return { ...c, links: c.links || [] };
      };

      if (id) {
        const found = storedComplaints.find((c: { id: string }) => c.id === id);
        if (found) return attachIssue(found) as T;
        return null as T;
      }
      const syncedComplaints = storedComplaints.map(attachIssue);
      return { complaints: syncedComplaints, count: syncedComplaints.length } as T;
    } catch {
      return { complaints: [], count: 0 } as T;
    }
  }

  if (pathname === '/api/civic-issues' && method === 'GET') {
    try {
      const id = urlObj.searchParams.get('id');
      const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
      if (id) {
        let found = storedIssues.find((i: { id: string }) => i.id === id);
        if (!found) {
          const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
          const foundComp = storedComplaints.find((c: { id: string; title: string; description: string; category: string; address: string; lat: number; lng: number; status: string; severity?: number; created_at: string; user_id?: string; ai_department?: string; safety_risk?: boolean; affected_estimate?: number; location_sensitivity?: string; priority_score?: number; priority_band?: string }) => c.id === id);
          if (foundComp) {
            found = {
              id: foundComp.id,
              title: foundComp.title,
              description: foundComp.description,
              category: foundComp.category,
              department: foundComp.ai_department || 'General Municipal Dept',
              address: foundComp.address,
              lat: foundComp.lat,
              lng: foundComp.lng,
              status: foundComp.status || 'open',
              severity: foundComp.severity || 3,
              safety_risk: foundComp.safety_risk || false,
              affected_estimate: foundComp.affected_estimate || 500,
              location_sensitivity: foundComp.location_sensitivity || 'medium',
              priority_score: foundComp.priority_score || 65,
              priority_band: foundComp.priority_band || 'HIGH',
              priority_factors: [
                { key: 'severity', label: 'AI Severity', points: 30, max: 40 },
                { key: 'safety', label: 'Safety Hazard', points: 25, max: 25 },
              ],
              complaint_count: 1,
              assigned_officer: null,
              assigned_officer_name: null,
              assigned_at: null,
              resolved_at: null,
              verified_at: null,
              created_by: foundComp.user_id || 'demo-citizen-id',
              created_at: foundComp.created_at || new Date().toISOString(),
            };
          }
        }

        if (found) {
          const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
          const matchingComplaints = storedComplaints.filter((c: { id: string; title: string }) => c.title === found.title || c.id === found.id);
          const links = matchingComplaints.map((c: unknown, idx: number) => ({
            id: `link_${idx}`,
            issue_id: found.id,
            complaint_id: (c as { id: string }).id,
            link_type: idx === 0 ? 'primary' : 'duplicate',
            similarity_score: 0.95,
            linked_by: 'system',
            created_at: found.created_at,
            complaints: c,
          }));
          return {
            issue: found,
            links: links.length > 0 ? links : [{ id: 'link_0', issue_id: found.id, complaint_id: 'comp_demo', link_type: 'primary', similarity_score: 1.0, linked_by: 'system', created_at: found.created_at, complaints: { id: 'comp_demo', title: found.title, description: found.description, category: found.category, address: found.address, status: found.status, created_at: found.created_at } }],
            assignments: [],
            notes: [],
            history: [{ id: 'hist_1', actor_id: 'system', entity_type: 'issue', entity_id: found.id, action: 'issue.created', created_at: found.created_at, details: { officer: 'System AI' } }],
            resolutions: [],
          } as T;
        }
        return null as T;
      }
      return { issues: storedIssues, count: storedIssues.length } as T;
    } catch {
      return { issues: [], count: 0 } as T;
    }
  }

  if (pathname === '/api/auth-profile' || pathname === '/api/officers') {
    return [
      { id: 'off_1', full_name: 'Officer Rajesh Kumar', department: 'Roads & Traffic Department', email: 'rajesh.k@jaipur.gov.in' },
      { id: 'off_2', full_name: 'Officer Sunita Sharma', department: 'Sanitation & Waste Management', email: 'sunita.s@jaipur.gov.in' },
      { id: 'off_3', full_name: 'Officer Amit Patel', department: 'Water Works Department', email: 'amit.p@jaipur.gov.in' },
      { id: 'off_4', full_name: 'Officer Vikram Singh', department: 'Electrical Department', email: 'vikram.s@jaipur.gov.in' },
      { id: 'off_5', full_name: 'Officer Priya Mehta', department: 'Parks & Horticulture Department', email: 'priya.m@jaipur.gov.in' },
      { id: 'off_6', full_name: 'Officer Suresh Verma', department: 'Drainage & Sewerage Board', email: 'suresh.v@jaipur.gov.in' },
      { id: 'off_7', full_name: 'Officer Ananya Sen', department: 'Health & Public Environment', email: 'ananya.s@jaipur.gov.in' },
      { id: 'off_8', full_name: 'Officer Deepak Chauhan', department: 'Building & Infrastructure Wing', email: 'deepak.c@jaipur.gov.in' },
      { id: 'off_9', full_name: 'Officer Kavita Rao', department: 'Street Lighting & Power Grid', email: 'kavita.r@jaipur.gov.in' },
      { id: 'off_10', full_name: 'Officer Manoj Joshi', department: 'Public Safety & Disaster Response', email: 'manoj.j@jaipur.gov.in' },
    ] as T;
  }

  if (pathname === '/api/assignments' && method === 'POST') {
    try {
      const { issue_id, officer_id, officer_name } = body;
      const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
      const idx = storedIssues.findIndex((i: { id: string }) => i.id === issue_id);
      if (idx !== -1) {
        storedIssues[idx].assigned_officer = officer_id;
        storedIssues[idx].assigned_officer_name = officer_name;
        storedIssues[idx].assigned_at = new Date().toISOString();
        storedIssues[idx].status = 'assigned';
        localStorage.setItem('civicfix_local_issues', JSON.stringify(storedIssues));

        // Sync local complaints status
        const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
        const cIdx = storedComplaints.findIndex((c: { id: string; title: string }) => c.id === issue_id || c.title === storedIssues[idx].title);
        if (cIdx !== -1) {
          storedComplaints[cIdx].status = 'assigned';
          localStorage.setItem('civicfix_local_complaints', JSON.stringify(storedComplaints));
        }
      }
    } catch { /* noop */ }
    return { ok: true } as T;
  }

  if (pathname === '/api/resolutions' && method === 'POST') {
    try {
      const body = JSON.parse(options.body as string || '{}');
      const { issue_id, action, summary } = body;
      const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
      const idx = storedIssues.findIndex((i: { id: string }) => i.id === issue_id);

      const targetStatus = action === 'verify' ? 'verified' : 'resolved';
      const now = new Date().toISOString();

      if (idx !== -1) {
        storedIssues[idx].status = targetStatus;
        if (action === 'verify') {
          storedIssues[idx].verified_at = now;
          if (body.rating) storedIssues[idx].rating = body.rating;
          if (body.feedback) storedIssues[idx].feedback = body.feedback;
        } else {
          storedIssues[idx].resolved_at = now;
          if (summary) storedIssues[idx].resolution_summary = summary;
        }
        storedIssues[idx].updated_at = now;
        localStorage.setItem('civicfix_local_issues', JSON.stringify(storedIssues));

        // Sync local complaints status
        const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
        const cIdx = storedComplaints.findIndex((c: { id: string; title: string }) => c.id === issue_id || c.title === storedIssues[idx].title);
        if (cIdx !== -1) {
          storedComplaints[cIdx].status = targetStatus;
          localStorage.setItem('civicfix_local_complaints', JSON.stringify(storedComplaints));
        }
      }
    } catch { /* noop */ }
    return { ok: true } as T;
  }

  if (pathname === '/api/civic-issues' && (method === 'PUT' || method === 'POST')) {
    try {
      const body = JSON.parse(options.body as string || '{}');
      const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
      const idx = storedIssues.findIndex((i: { id: string }) => i.id === body.id || i.id === body.issue_id);
      if (idx !== -1) {
        if (body.status) storedIssues[idx].status = body.status;
        storedIssues[idx].updated_at = new Date().toISOString();
        localStorage.setItem('civicfix_local_issues', JSON.stringify(storedIssues));

        // Sync local complaints status
        if (body.status) {
          const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
          const cIdx = storedComplaints.findIndex((c: { id: string; title: string }) => c.id === storedIssues[idx].id || c.title === storedIssues[idx].title);
          if (cIdx !== -1) {
            storedComplaints[cIdx].status = body.status;
            localStorage.setItem('civicfix_local_complaints', JSON.stringify(storedComplaints));
          }
        }

        return { issue: storedIssues[idx], ok: true } as T;
      }
    } catch { /* noop */ }
  }

  return { ok: true, updated: 4 } as T;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await authHeaders();
  try {
    const res = await fetch(path, {
      ...options,
      headers: { ...headers, ...((options.headers as Record<string, string>) || {}) },
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      if (res.status === 404 || res.status === 502) {
        return handleLocalDevApiFallback<T>(path, options);
      }
      const msg =
        (data as { error?: string } | null)?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data as T;
  } catch (err: unknown) {
    if ((err as Error).message?.includes('404') || (err as Error).message?.includes('Failed to fetch')) {
      return handleLocalDevApiFallback<T>(path, options);
    }
    throw err;
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || '');
      resolve(s.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadEvidence(
  file: File,
  folder: 'complaints' | 'resolutions' = 'complaints'
): Promise<{ url: string; path: string }> {
  const base64 = await fileToBase64(file);
  return apiFetch('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileBase64: base64,
      contentType: file.type,
      folder,
    }),
  });
}

export function validateImageFile(file: File): string | null {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!ok.includes(file.type)) return 'Only JPG, PNG or WebP images are allowed.';
  if (file.size > 5 * 1024 * 1024) return 'Image must be smaller than 5 MB.';
  return null;
}
