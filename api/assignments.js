// CivicFix assignments API: officer assignment workflow for civic issues.
import supabase from './db-client.js';
import { setCors, handleOptions, requireRole, logAudit } from './_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      let query = supabase.from('assignments').select('*').order('created_at', { ascending: false }).limit(200);
      if (q.issue_id) query = query.eq('issue_id', q.issue_id);
      if (q.officer_id) query = query.eq('officer_id', q.officer_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const auth = await requireRole(req, res, ['officer', 'admin']);
      if (!auth) return;
      const body = req.body || {};
      const { issue_id, officer_id, officer_name, department = null, note = '', due_date = null } = body;
      if (!issue_id || !officer_id) return res.status(400).json({ error: 'Issue and officer are required.' });
      const { data: issue } = await supabase.from('civic_issues').select('*').eq('id', issue_id).single();
      if (!issue) return res.status(404).json({ error: 'Issue not found.' });
      const { data, error } = await supabase.from('assignments').insert({
        issue_id, officer_id, officer_name: officer_name || 'Field Officer', department: department || issue.department,
        note: String(note).slice(0, 500), due_date: due_date || null, status: 'active', assigned_by: auth.user.id,
      }).select().single();
      if (error) throw error;
      await supabase.from('assignments').update({ status: 'superseded' }).eq('issue_id', issue_id).neq('id', data.id).eq('status', 'active');
      const patch = { assigned_officer: officer_id, assigned_officer_name: data.officer_name, assigned_at: new Date().toISOString() };
      if (['open', 'triaged', 'reopened'].includes(issue.status)) patch.status = 'assigned';
      await supabase.from('civic_issues').update(patch).eq('id', issue_id);
      await logAudit({ actor_id: auth.user.id, action: 'issue.assigned', entity_type: 'issue', entity_id: issue_id, details: { officer: data.officer_name, note } });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const auth = await requireRole(req, res, ['officer', 'admin']);
      if (!auth) return;
      const body = req.body || {};
      const { id, status, note } = body;
      if (!id) return res.status(400).json({ error: 'Assignment id is required.' });
      const patch = {};
      if (status) patch.status = status;
      if (note !== undefined) patch.note = String(note).slice(0, 500);
      const { data, error } = await supabase.from('assignments').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await logAudit({ actor_id: auth.user.id, action: 'assignment.updated', entity_type: 'assignment', entity_id: id, details: patch });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const auth = await requireRole(req, res, ['officer', 'admin']);
      if (!auth) return;
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Assignment id is required.' });
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      if (error) throw error;
      await logAudit({ actor_id: auth.user.id, action: 'assignment.deleted', entity_type: 'assignment', entity_id: id, details: {} });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('assignments error:', err);
    return res.status(500).json({ error: err.message });
  }
}
