// CivicFix analytics API: aggregated civic performance metrics.
import supabase from './db-client.js';
import { setCors, handleOptions } from './_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [issuesR, complaintsR, resolutionsR] = await Promise.all([
      supabase.from('civic_issues').select('*').limit(1000),
      supabase.from('complaints').select('id, category, status, created_at, ai_provider').limit(2000),
      supabase.from('resolutions').select('id, issue_id, citizen_rating, created_at').limit(1000),
    ]);
    const list = issuesR.data || [];
    const comps = complaintsR.data || [];
    const resols = resolutionsR.data || [];

    const RESOLVED = ['resolved', 'verified'];
    const resolved = list.filter((i) => RESOLVED.includes(i.status));
    const open = list.filter((i) => !['resolved', 'verified', 'duplicate'].includes(i.status));

    const byStatus = {};
    list.forEach((i) => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
    const byCategory = {};
    list.forEach((i) => { byCategory[i.category] = (byCategory[i.category] || 0) + 1; });
    const byPriority = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    list.forEach((i) => { if (byPriority[i.priority_band] !== undefined) byPriority[i.priority_band]++; });
    const byDepartment = {};
    list.forEach((i) => {
      const d = i.department || 'Unassigned';
      if (!byDepartment[d]) byDepartment[d] = { total: 0, resolved: 0, resHours: [] };
      byDepartment[d].total++;
      if (RESOLVED.includes(i.status) && i.resolved_at) {
        byDepartment[d].resolved++;
        byDepartment[d].resHours.push((new Date(i.resolved_at) - new Date(i.created_at)) / 3600000);
      }
    });
    const deptRows = Object.entries(byDepartment).map(([name, v]) => ({
      name: name.length > 26 ? name.slice(0, 24) + '..' : name,
      full: name,
      total: v.total,
      resolved: v.resolved,
      sla: v.total ? Math.round((v.resolved / v.total) * 100) : 0,
      avgHours: v.resHours.length ? Math.round(v.resHours.reduce((a, b) => a + b, 0) / v.resHours.length) : null,
    })).sort((a, b) => b.total - a.total);

    const resHours = [];
    resolved.forEach((i) => { if (i.resolved_at) resHours.push((new Date(i.resolved_at) - new Date(i.created_at)) / 3600000); });
    const avgResolutionHrs = resHours.length ? Math.round(resHours.reduce((a, b) => a + b, 0) / resHours.length) : 0;
    const sla72 = resolved.length ? Math.round((resHours.filter((h) => h <= 72).length / resolved.length) * 100) : 0;

    const days = [];
    for (let d = 13; d >= 0; d--) {
      const day = new Date();
      day.setDate(day.getDate() - d);
      const key = day.toISOString().slice(0, 10);
      days.push({ day: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), key, reported: 0, resolved: 0 });
    }
    comps.forEach((c) => { const k = (c.created_at || '').slice(0, 10); const row = days.find((r) => r.key === k); if (row) row.reported++; });
    resolved.forEach((i) => { const k = (i.resolved_at || '').slice(0, 10); const row = days.find((r) => r.key === k); if (row) row.resolved++; });

    const duplicateLinks = list.reduce((a, i) => a + Math.max(0, (i.complaint_count || 1) - 1), 0);
    const aiShare = comps.length ? Math.round((comps.filter((c) => c.ai_provider === 'gemini').length / comps.length) * 100) : 0;
    const ratings = resols.map((r) => r.citizen_rating).filter(Boolean);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

    const hotspots = list
      .filter((i) => i.lat && i.lng && !['resolved', 'verified', 'duplicate'].includes(i.status))
      .slice(0, 200)
      .map((i) => ({ id: i.id, title: i.title, category: i.category, priority_band: i.priority_band, status: i.status, lat: i.lat, lng: i.lng, complaint_count: i.complaint_count }));

    const areaCounts = {};
    list.forEach((i) => {
      const area = (i.address || '').split(',')[0]?.trim().slice(0, 40) || 'Unknown area';
      if (!areaCounts[area]) areaCounts[area] = { area, total: 0, open: 0 };
      areaCounts[area].total++;
      if (!RESOLVED.includes(i.status) && i.status !== 'duplicate') areaCounts[area].open++;
    });
    const topAreas = Object.values(areaCounts).sort((a, b) => b.total - a.total).slice(0, 8);

    return res.status(200).json({
      totals: { issues: list.length, complaints: comps.length, open: open.length, resolved: resolved.length, duplicateLinks, avgResolutionHrs, sla72, aiShare, avgRating },
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
      departments: deptRows,
      trend: days,
      hotspots,
      topAreas,
    });
  } catch (err) {
    console.error('analytics error:', err);
    return res.status(500).json({ error: err.message });
  }
}
