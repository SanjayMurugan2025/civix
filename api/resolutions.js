// CivicFix resolutions API: before/after evidence + resolution records + citizen verification.
import supabase from './db-client.js';
import { setCors, handleOptions, requireAuth, requireRole, logAudit } from './_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      let query = supabase.from('resolutions').select('*').order('created_at', { ascending: false }).limit(200);
      if (q.issue_id) query = query.eq('issue_id', q.issue_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'verify') {
        const user = await requireAuth(req, res);
        if (!user) return;
        const { issue_id, rating = 5, feedback = '' } = body;
        if (!issue_id) return res.status(400).json({ error: 'Issue id is required.' });
        const { data: links } = await supabase.from('complaint_issue_links').select('complaint_id, complaints(user_id)').eq('issue_id', issue_id);
        const mine = (links || []).some((l) => l.complaints?.user_id === user.id);
        if (!mine) return res.status(403).json({ error: 'Only citizens who reported this issue can verify it.' });
        const { data: res2 } = await supabase.from('resolutions').select('*').eq('issue_id', issue_id).order('created_at', { ascending: false }).limit(1);
        if (res2?.[0]) {
          await supabase.from('resolutions').update({ citizen_rating: Math.max(1, Math.min(5, Number(rating))), citizen_feedback: String(feedback).slice(0, 500), verified_by: user.id, verified_at: new Date().toISOString() }).eq('id', res2[0].id);
        }
        await supabase.from('civic_issues').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', issue_id);
        await logAudit({ actor_id: user.id, action: 'issue.verified', entity_type: 'issue', entity_id: issue_id, details: { rating } });
        return res.status(200).json({ ok: true });
      }
      const auth = await requireRole(req, res, ['officer', 'admin']);
      if (!auth) return;
      const { issue_id, summary, action_taken = '', before_image_url = null, after_image_url = null, cost_inr = null, contractor = null } = body;
      if (!issue_id || !summary) return res.status(400).json({ error: 'Issue and resolution summary are required.' });
      const { data: issue } = await supabase.from('civic_issues').select('*').eq('id', issue_id).single();
      if (!issue) return res.status(404).json({ error: 'Issue not found.' });
      const { data, error } = await supabase.from('resolutions').insert({
        issue_id, summary: String(summary).slice(0, 1000), action_taken: String(action_taken).slice(0, 1000),
        before_image_url, after_image_url, cost_inr: cost_inr ? Number(cost_inr) : null,
        contractor: contractor ? String(contractor).slice(0, 120) : null, resolved_by: auth.user.id,
        resolver_name: (auth.profile && auth.profile.full_name) || 'Officer',
      }).select().single();
      if (error) throw error;
      await supabase.from('civic_issues').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', issue_id);
      await logAudit({ actor_id: auth.user.id, action: 'issue.resolved', entity_type: 'issue', entity_id: issue_id, details: { resolution_id: data.id } });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const auth = await requireRole(req, res, ['officer', 'admin']);
      if (!auth) return;
      const body = req.body || {};
      const { id, summary, action_taken, before_image_url, after_image_url } = body;
      if (!id) return res.status(400).json({ error: 'Resolution id is required.' });
      const patch = {};
      if (summary) patch.summary = String(summary).slice(0, 1000);
      if (action_taken) patch.action_taken = String(action_taken).slice(0, 1000);
      if (before_image_url !== undefined) patch.before_image_url = before_image_url;
      if (after_image_url !== undefined) patch.after_image_url = after_image_url;
      const { data, error } = await supabase.from('resolutions').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('resolutions error:', err);
    return res.status(500).json({ error: err.message });
  }
}
