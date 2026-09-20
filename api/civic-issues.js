// CivicFix civic issues API: officer command-center queue, status workflow, merge + notes.
import supabase from './db-client.js';
import { setCors, handleOptions, requireAuth, requireRole, getProfile, logAudit, computePriority } from './_lib.js';

const STATUS_FLOW = ['open', 'triaged', 'assigned', 'in_progress', 'resolved', 'verified'];

async function issueDetail(id) {
  const { data: issue, error } = await supabase.from('civic_issues').select('*').eq('id', id).single();
  if (error || !issue) return { issue: null };
  const { data: links } = await supabase.from('complaint_issue_links').select('*, complaints(*)').eq('issue_id', id).order('created_at', { ascending: true });
  const { data: assignments } = await supabase.from('assignments').select('*').eq('issue_id', id).order('created_at', { ascending: false });
  const { data: resolutions } = await supabase.from('resolutions').select('*').eq('issue_id', id).order('created_at', { ascending: false });
  const { data: notes } = await supabase.from('audit_logs').select('*').eq('entity_type', 'issue_note').eq('entity_id', String(id)).order('created_at', { ascending: false });
  const { data: history } = await supabase.from('audit_logs').select('*').eq('entity_type', 'issue').eq('entity_id', String(id)).order('created_at', { ascending: false }).limit(30);
  return { issue, links: links || [], assignments: assignments || [], resolutions: resolutions || [], notes: notes || [], history: history || [] };
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      if (q.id) {
        const detail = await issueDetail(q.id);
        if (!detail.issue) return res.status(404).json({ error: 'Issue not found.' });
        return res.status(200).json(detail);
      }
      let query = supabase.from('civic_issues').select('*', { count: 'exact' });
      if (q.open_only === '1' || q.map === '1') query = query.not('status', 'in', '(resolved,verified,duplicate,withdrawn)');
      if (q.status) query = query.eq('status', q.status);
      if (q.category) query = query.eq('category', q.category);
      if (q.priority) query = query.eq('priority_band', q.priority);
      if (q.department) query = query.eq('department', q.department);
      if (q.q) query = query.or(`title.ilike.%${q.q}%,description.ilike.%${q.q}%,address.ilike.%${q.q}%`);
      if (q.sort === 'oldest') query = query.order('created_at', { ascending: true });
      else if (q.sort === 'newest') query = query.order('created_at', { ascending: false });
      else query = query.order('priority_score', { ascending: false });
      const lim = Number(q.limit || 100);
      const off = Number(q.offset || 0);
      query = query.range(off, off + lim - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return res.status(200).json({ issues: data, count });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'merge') {
        const auth = await requireRole(req, res, ['officer', 'admin']);
        if (!auth) return;
        const target_issue_id = body.target_issue_id;
        const source_issue_ids = body.source_issue_ids || [];
        if (!target_issue_id || !source_issue_ids.length) return res.status(400).json({ error: 'Target and source issues are required.' });
        const { data: target } = await supabase.from('civic_issues').select('*').eq('id', target_issue_id).single();
        if (!target) return res.status(404).json({ error: 'Target issue not found.' });
        let moved = 0;
        for (const sid of source_issue_ids) {
          if (String(sid) === String(target_issue_id)) continue;
          const { data: slinks } = await supabase.from('complaint_issue_links').select('*').eq('issue_id', sid);
          for (const l of slinks || []) {
            await supabase.from('complaint_issue_links').update({ issue_id: target_issue_id, link_type: 'duplicate', linked_by: 'merged-by-' + ((auth.profile && auth.profile.full_name) || 'officer') }).eq('id', l.id);
            moved++;
          }
          await supabase.from('civic_issues').update({ status: 'duplicate' }).eq('id', sid);
          await logAudit({ actor_id: auth.user.id, action: 'issue.merged', entity_type: 'issue', entity_id: sid, details: { into: target_issue_id } });
        }
        const { data: allLinks } = await supabase.from('complaint_issue_links').select('complaint_id, complaints(severity, affected_estimate, safety_risk, location_sensitivity)').eq('issue_id', target_issue_id);
        const linked = (allLinks || []).map((l) => l.complaints).filter(Boolean);
        const severity = Math.max(target.severity || 2, ...linked.map((c) => c.severity || 2));
        const affected = Math.max(target.affected_estimate || 50, ...linked.map((c) => c.affected_estimate || 50));
        const safety = Boolean(target.safety_risk) || linked.some((c) => c.safety_risk);
        const rank = { low: 0, medium: 1, high: 2 };
        const loc = [target.location_sensitivity, ...linked.map((c) => c.location_sensitivity)].sort((a, b) => (rank[b] || 0) - (rank[a] || 0))[0] || 'low';
        const ageH = (Date.now() - new Date(target.created_at).getTime()) / 3600000;
        const count = allLinks?.length || target.complaint_count || 1;
        const p = computePriority({ severity, duplicate_count: count, affected, safety_risk: safety, location_sensitivity: loc, age_hours: ageH });
        await supabase.from('civic_issues').update({ severity, affected_estimate: affected, safety_risk: safety, location_sensitivity: loc, priority_score: p.score, priority_band: p.band, priority_factors: p.factors, complaint_count: count }).eq('id', target_issue_id);
        await logAudit({ actor_id: auth.user.id, action: 'issue.merge_target', entity_type: 'issue', entity_id: target_issue_id, details: { moved, sources: source_issue_ids } });
        const detail = await issueDetail(target_issue_id);
        return res.status(200).json({ ...detail, moved });
      }
      if (body.action === 'note') {
        const auth = await requireRole(req, res, ['officer', 'admin']);
        if (!auth) return;
        const { issue_id, note } = body;
        if (!issue_id || !note) return res.status(400).json({ error: 'Issue and note are required.' });
        const { data, error } = await supabase.from('audit_logs').insert({ actor_id: auth.user.id, action: 'note.added', entity_type: 'issue_note', entity_id: String(issue_id), details: { note: String(note).slice(0, 1000), author: (auth.profile && auth.profile.full_name) || 'Officer' } }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
      const auth = await requireRole(req, res, ['officer', 'admin']);
      if (!auth) return;
      const { title, description = '', category = 'Other', department = 'Grievance Redressal Cell', address = '', lat = null, lng = null, severity = 2 } = body;
      if (!title) return res.status(400).json({ error: 'Title is required.' });
      const p = computePriority({ severity, duplicate_count: 0, affected: 50, safety_risk: false, location_sensitivity: 'low', age_hours: 0 });
      const { data, error } = await supabase.from('civic_issues').insert({
        title: String(title).slice(0, 200), description: String(description).slice(0, 2000), category, department, address: String(address).slice(0, 300),
        lat: lat !== null ? Number(lat) : null, lng: lng !== null ? Number(lng) : null,
        status: 'open', severity, priority_score: p.score, priority_band: p.band, priority_factors: p.factors, complaint_count: 0, created_by: auth.user.id,
      }).select().single();
      if (error) throw error;
      await logAudit({ actor_id: auth.user.id, action: 'issue.created', entity_type: 'issue', entity_id: data.id, details: { manual: true } });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const { id, status, title, description, department, severity } = body;
      if (!id) return res.status(400).json({ error: 'Issue id is required.' });
      const { data: existing } = await supabase.from('civic_issues').select('*').eq('id', id).single();
      if (!existing) return res.status(404).json({ error: 'Issue not found.' });
      if (status === 'verified') {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (existing.status !== 'resolved') return res.status(400).json({ error: 'Only resolved issues can be verified.' });
        const { data: links } = await supabase.from('complaint_issue_links').select('complaint_id, complaints(user_id)').eq('issue_id', id);
        const mine = (links || []).some((l) => l.complaints?.user_id === user.id);
        const profile = await getProfile(user.id);
        if (!mine && !['officer', 'admin'].includes(profile?.role)) return res.status(403).json({ error: 'Only reporting citizens can verify this resolution.' });
        const { data, error } = await supabase.from('civic_issues').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        await logAudit({ actor_id: user.id, action: 'issue.verified', entity_type: 'issue', entity_id: id, details: {} });
        return res.status(200).json(data);
      }
      if (status === 'reopened') {
        const user = await requireAuth(req, res);
        if (!user) return;
        const profile = await getProfile(user.id);
        const { data: links } = await supabase.from('complaint_issue_links').select('complaint_id, complaints(user_id)').eq('issue_id', id);
        const mine = (links || []).some((l) => l.complaints?.user_id === user.id);
        if (!mine && !['officer', 'admin'].includes(profile?.role)) return res.status(403).json({ error: 'Not allowed.' });
        const { data, error } = await supabase.from('civic_issues').update({ status: 'reopened' }).eq('id', id).select().single();
        if (error) throw error;
        await logAudit({ actor_id: user.id, action: 'issue.reopened', entity_type: 'issue', entity_id: id, details: {} });
        return res.status(200).json(data);
      }
      const auth = await requireRole(req, res, ['officer', 'admin']);
      if (!auth) return;
      const patch = {};
      if (status) {
        const allowed = [...STATUS_FLOW, 'reopened', 'duplicate', 'withdrawn'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
        patch.status = status;
        if (status === 'resolved') patch.resolved_at = new Date().toISOString();
      }
      if (title) patch.title = String(title).slice(0, 200);
      if (description) patch.description = String(description).slice(0, 2000);
      if (department) patch.department = String(department).slice(0, 120);
      if (severity) patch.severity = Math.max(1, Math.min(5, Number(severity)));
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update.' });
      const { data, error } = await supabase.from('civic_issues').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await logAudit({ actor_id: auth.user.id, action: 'issue.status_' + (patch.status || 'updated'), entity_type: 'issue', entity_id: id, details: patch });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('civic-issues error:', err);
    return res.status(500).json({ error: err.message });
  }
}
