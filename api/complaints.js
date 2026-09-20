// CivicFix complaints API: citizen grievance intake with AI triage + auto-deduplication.
import supabase from './db-client.js';
import { setCors, handleOptions, requireAuth, getProfile, logAudit, deterministicTriage, computePriority, findDuplicateCandidates } from './_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      const id = q.id;
      if (id) {
        const { data, error } = await supabase.from('complaints').select('*').eq('id', id).single();
        if (error) return res.status(404).json({ error: 'Complaint not found.' });
        const { data: links } = await supabase.from('complaint_issue_links').select('*, civic_issues(*)').eq('complaint_id', id);
        return res.status(200).json({ ...data, links: links || [] });
      }
      let query = supabase.from('complaints').select('*', { count: 'exact' });
      if (q.mine === '1') {
        const user = await requireAuth(req, res);
        if (!user) return;
        query = query.eq('user_id', user.id);
      }
      if (q.status) query = query.eq('status', q.status);
      if (q.category) query = query.eq('category', q.category);
      if (q.q) query = query.or(`title.ilike.%${q.q}%,description.ilike.%${q.q}%,address.ilike.%${q.q}%`);
      const lim = Number(q.limit || 100);
      const off = Number(q.offset || 0);
      query = query.order('created_at', { ascending: q.order === 'oldest' }).range(off, off + lim - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return res.status(200).json({ complaints: data, count });
    }

    if (req.method === 'POST') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const body = req.body || {};
      const title = body.title || '';
      const description = body.description || '';
      const address = body.address || '';
      const lat = body.lat ?? null;
      const lng = body.lng ?? null;
      const image_url = body.image_url || null;
      const ai_result = body.ai_result || null;
      if (!description || String(description).trim().length < 10) {
        return res.status(400).json({ error: 'Please describe the issue in at least 10 characters.' });
      }
      if (String(description).length > 4000) return res.status(400).json({ error: 'Description is too long (max 4000 characters).' });

      const fb = deterministicTriage({ title, description, address });
      const triage = ai_result && ai_result.category
        ? {
            category: ai_result.category, severity: ai_result.severity || 2, department: ai_result.department || 'Grievance Redressal Cell',
            summary: ai_result.summary || String(description).slice(0, 180), confidence: ai_result.confidence ?? 0.7,
            safety_risk: Boolean(ai_result.safety_risk), affected_estimate: body.affected_estimate || ai_result.affected_estimate || 50,
            location_sensitivity: ai_result.location_sensitivity || 'low', keywords: ai_result.keywords || [],
          }
        : { ...fb, affected_estimate: body.affected_estimate || fb.affected_estimate };
      const aiProvider = (ai_result && ai_result.ai_provider) || 'fallback';

      const priority = computePriority({
        severity: triage.severity, duplicate_count: 0, affected: triage.affected_estimate,
        safety_risk: triage.safety_risk, location_sensitivity: triage.location_sensitivity, age_hours: 0,
      });

      const { data: complaint, error: cerr } = await supabase.from('complaints').insert({
        user_id: user.id, title: String(title || '').slice(0, 200) || triage.summary.slice(0, 80),
        description: String(description).slice(0, 4000), category: triage.category, address: String(address || '').slice(0, 300),
        lat: lat !== null ? Number(lat) : null, lng: lng !== null ? Number(lng) : null,
        image_url: image_url || null, status: 'submitted',
        ai_category: triage.category, ai_severity: triage.severity, ai_department: triage.department,
        ai_summary: triage.summary, ai_confidence: triage.confidence, ai_provider: aiProvider,
        severity: triage.severity, safety_risk: triage.safety_risk, affected_estimate: triage.affected_estimate,
        location_sensitivity: triage.location_sensitivity, priority_score: priority.score, priority_band: priority.band,
      }).select().single();
      if (cerr) throw cerr;

      const candidates = await findDuplicateCandidates({ description, title, category: triage.category, lat, lng, excludeId: complaint.id });
      const OPEN = ['open', 'triaged', 'assigned', 'in_progress', 'reopened'];
      const strong = candidates.find((c) => c.score >= 0.62 && c.issue_id && OPEN.includes(c.issue_status));
      let issue = null;
      let linkedAsDuplicate = false;

      if (strong) {
        const { data: existing } = await supabase.from('civic_issues').select('*').eq('id', strong.issue_id).single();
        if (existing) {
          issue = existing;
          linkedAsDuplicate = true;
        }
      }

      if (!issue) {
        const { data: created, error: ierr } = await supabase.from('civic_issues').insert({
          title: complaint.title, description: triage.summary, category: triage.category, department: triage.department,
          address: complaint.address, lat: complaint.lat, lng: complaint.lng,
          status: 'open', severity: triage.severity, safety_risk: triage.safety_risk,
          affected_estimate: triage.affected_estimate, location_sensitivity: triage.location_sensitivity,
          priority_score: priority.score, priority_band: priority.band, priority_factors: priority.factors,
          complaint_count: 1, created_by: user.id,
        }).select().single();
        if (ierr) throw ierr;
        issue = created;
      }

      await supabase.from('complaint_issue_links').insert({
        complaint_id: complaint.id, issue_id: issue.id, link_type: linkedAsDuplicate ? 'duplicate' : 'primary',
        similarity_score: strong ? strong.score : 1, linked_by: 'ai-auto',
      });

      if (linkedAsDuplicate) {
        const { data: links } = await supabase.from('complaint_issue_links').select('complaint_id, complaints(severity, affected_estimate, safety_risk, location_sensitivity)').eq('issue_id', issue.id);
        const linked = (links || []).map((l) => l.complaints).filter(Boolean);
        const severity = Math.max(issue.severity || 2, ...linked.map((c) => c.severity || 2));
        const affected = Math.max(issue.affected_estimate || 50, ...linked.map((c) => c.affected_estimate || 50));
        const safety = Boolean(issue.safety_risk) || linked.some((c) => c.safety_risk);
        const rank = { low: 0, medium: 1, high: 2 };
        const loc = [issue.location_sensitivity, ...linked.map((c) => c.location_sensitivity)].sort((a, b) => (rank[b] || 0) - (rank[a] || 0))[0] || 'low';
        const ageH = (Date.now() - new Date(issue.created_at).getTime()) / 3600000;
        const count = links?.length || 1;
        const p2 = computePriority({ severity, duplicate_count: count, affected, safety_risk: safety, location_sensitivity: loc, age_hours: ageH });
        await supabase.from('civic_issues').update({
          severity, affected_estimate: affected, safety_risk: safety, location_sensitivity: loc,
          priority_score: p2.score, priority_band: p2.band, priority_factors: p2.factors, complaint_count: count,
        }).eq('id', issue.id);
        issue = { ...issue, priority_score: p2.score, priority_band: p2.band, complaint_count: count };
      }

      await supabase.from('complaints').update({ status: linkedAsDuplicate ? 'linked' : 'triaged' }).eq('id', complaint.id);
      await logAudit({ actor_id: user.id, action: linkedAsDuplicate ? 'complaint.auto_linked' : 'complaint.triaged', entity_type: 'complaint', entity_id: complaint.id, details: { issue_id: issue.id, category: triage.category, score: strong?.score || 1, provider: aiProvider } });

      const { data: fresh } = await supabase.from('complaints').select('*').eq('id', complaint.id).single();
      return res.status(201).json({ complaint: fresh || complaint, issue, linked_as_duplicate: linkedAsDuplicate, duplicate_candidates: candidates.slice(0, 4), triage, ai_provider: aiProvider });
    }

    if (req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const body = req.body || {};
      const { id, status, title, description } = body;
      if (!id) return res.status(400).json({ error: 'Complaint id is required.' });
      const { data: existing, error: ferr } = await supabase.from('complaints').select('*').eq('id', id).single();
      if (ferr || !existing) return res.status(404).json({ error: 'Complaint not found.' });
      const profile = await getProfile(user.id);
      const isOwner = existing.user_id === user.id;
      const isOfficer = ['officer', 'admin'].includes(profile?.role);
      if (!isOwner && !isOfficer) return res.status(403).json({ error: 'You can only modify your own complaints.' });
      const patch = {};
      if (status) {
        const allowed = isOfficer ? ['submitted', 'triaged', 'linked', 'in_review', 'withdrawn'] : ['withdrawn'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status transition.' });
        patch.status = status;
      }
      if (title && isOwner) patch.title = String(title).slice(0, 200);
      if (description && isOwner) patch.description = String(description).slice(0, 4000);
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update.' });
      const { data, error } = await supabase.from('complaints').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await logAudit({ actor_id: user.id, action: 'complaint.updated', entity_type: 'complaint', entity_id: id, details: patch });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Complaint id is required.' });
      const { data: existing } = await supabase.from('complaints').select('*').eq('id', id).single();
      if (!existing) return res.status(404).json({ error: 'Complaint not found.' });
      const profile = await getProfile(user.id);
      const isOfficer = ['officer', 'admin'].includes(profile?.role);
      const isOwner = existing.user_id === user.id;
      if (!isOfficer && !(isOwner && ['submitted', 'triaged'].includes(existing.status))) {
        return res.status(403).json({ error: 'This complaint can no longer be deleted. You can withdraw it instead.' });
      }
      const { data: links } = await supabase.from('complaint_issue_links').select('id').eq('complaint_id', id);
      if (links?.length && !isOfficer) return res.status(400).json({ error: 'Linked complaints cannot be deleted.' });
      await supabase.from('complaint_issue_links').delete().eq('complaint_id', id);
      const { error } = await supabase.from('complaints').delete().eq('id', id);
      if (error) throw error;
      await logAudit({ actor_id: user.id, action: 'complaint.deleted', entity_type: 'complaint', entity_id: id, details: {} });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('complaints error:', err);
    return res.status(500).json({ error: err.message });
  }
}
