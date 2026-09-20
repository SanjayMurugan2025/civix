// CivicFix profile API: role provisioning with officer access-code gate.
import supabase from './db-client.js';
import { setCors, handleOptions, requireAuth, getProfile, logAudit } from './_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const q = req.query || {};
      if (q.list === 'officers') {
        const profile = await getProfile(user.id);
        if (!['officer', 'admin'].includes(profile?.role)) return res.status(403).json({ error: 'Officers only.' });
        const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, department, ward').in('role', ['officer', 'admin']).order('full_name').limit(100);
        if (error) throw error;
        return res.status(200).json(data);
      }
      const data = await getProfile(user.id);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const body = req.body || {};
      const { full_name = '', role = 'citizen', phone = '', ward = '', department = '', officer_code = '' } = body;
      let finalRole = 'citizen';
      if (role === 'officer' || role === 'admin') {
        const expected = process.env.OFFICER_ACCESS_CODE || 'CIVIC-OFFICER-2026';
        if (officer_code !== expected) return res.status(403).json({ error: 'Invalid officer access code.' });
        finalRole = role === 'admin' ? 'admin' : 'officer';
      }
      const { data, error } = await supabase.from('profiles').upsert({
        id: user.id, email: user.email, full_name: String(full_name).slice(0, 120) || (user.email || '').split('@')[0],
        role: finalRole, phone: String(phone).slice(0, 20), ward: String(ward).slice(0, 80), department: String(department).slice(0, 120),
      }, { onConflict: 'id' }).select().single();
      if (error) throw error;
      await logAudit({ actor_id: user.id, action: 'profile.created', entity_type: 'profile', entity_id: user.id, details: { role: finalRole } });
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const body = req.body || {};
      const patch = {};
      if (body.full_name !== undefined) patch.full_name = String(body.full_name).slice(0, 120);
      if (body.phone !== undefined) patch.phone = String(body.phone).slice(0, 20);
      if (body.ward !== undefined) patch.ward = String(body.ward).slice(0, 80);
      if (body.department !== undefined) patch.department = String(body.department).slice(0, 120);
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update.' });
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', user.id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('auth-profile error:', err);
    return res.status(500).json({ error: err.message });
  }
}
