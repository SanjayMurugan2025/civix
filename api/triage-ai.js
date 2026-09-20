// CivicFix AI triage engine: Gemini with deterministic fallback + duplicates + reprioritization.
import supabase from './db-client.js';
import { setCors, handleOptions, deterministicTriage, computePriority, findDuplicateCandidates, CATEGORIES, DEPARTMENTS, getUser } from './_lib.js';

const GEMINI_MODEL = 'gemini-2.0-flash';

async function geminiClassify(input) {
  const { title, description, address } = input;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const prompt = 'You are a municipal grievance triage AI for an Indian city. Classify the citizen complaint below.\n\nCategories (pick exactly one): Roads, Garbage, Water, Drainage, Streetlight, Public Safety, Infrastructure, Sanitation, Other.\nSeverity: integer 1 (cosmetic) to 5 (emergency: injury risk, live electricity, collapse, flooding, contamination).\n\nComplaint title: ' + (title || '(none)') + '\nComplaint: ' + description + '\nLocation: ' + (address || '(unknown)') + '\n\nRespond with ONLY valid JSON, no markdown, in this exact shape:\n{"category": "...", "severity": 3, "summary": "one short sentence", "confidence": 0.85, "safety_risk": false, "affected_estimate": 120, "location_sensitivity": "low|medium|high", "keywords": ["..."]}';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 512 },
      }),
    });
    if (!res.ok) throw new Error('Gemini HTTP ' + res.status);
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    const parsed = JSON.parse(text);
    if (!CATEGORIES.includes(parsed.category)) throw new Error('Invalid category from Gemini');
    return {
      category: parsed.category,
      severity: Math.max(1, Math.min(5, Number(parsed.severity) || 2)),
      department: DEPARTMENTS[parsed.category],
      summary: String(parsed.summary || description).slice(0, 200),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.8)),
      safety_risk: Boolean(parsed.safety_risk),
      affected_estimate: Math.max(1, Number(parsed.affected_estimate) || 50),
      location_sensitivity: ['low', 'medium', 'high'].includes(parsed.location_sensitivity) ? parsed.location_sensitivity : 'low',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 6).map(String) : [],
    };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const action = body.action || 'classify';
    const title = body.title || '';
    const description = body.description || '';
    const address = body.address || '';
    const lat = body.lat ?? null;
    const lng = body.lng ?? null;

    if (action === 'classify') {
      if (!description || String(description).trim().length < 10) {
        return res.status(400).json({ error: 'Description must be at least 10 characters.' });
      }
      let result = null;
      let provider = 'fallback';
      let geminiError = null;
      try {
        result = await geminiClassify({ title, description, address });
        provider = 'gemini';
      } catch (e) {
        geminiError = e.message;
        result = deterministicTriage({ title, description, address });
        provider = 'fallback';
      }
      const candidates = await findDuplicateCandidates({ description, title, category: result.category, lat, lng });
      const priority = computePriority({
        severity: result.severity,
        duplicate_count: candidates.filter((c) => c.score >= 0.5).length,
        affected: result.affected_estimate,
        safety_risk: result.safety_risk,
        location_sensitivity: result.location_sensitivity,
        age_hours: 0,
      });
      return res.status(200).json({ ...result, priority, duplicate_candidates: candidates.slice(0, 5), ai_provider: provider, gemini_error: geminiError });
    }

    if (action === 'check-duplicates') {
      if (!description) return res.status(400).json({ error: 'Description is required.' });
      const cat = body.category || deterministicTriage({ title, description, address }).category;
      const candidates = await findDuplicateCandidates({ description, title, category: cat, lat, lng, excludeId: body.exclude_complaint_id || null });
      return res.status(200).json({ category: cat, candidates });
    }

    if (action === 'reprioritize') {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Authentication required.' });
      let query = supabase.from('civic_issues').select('*, complaint_issue_links(complaint_id, complaints(severity, affected_estimate, safety_risk, location_sensitivity))').not('status', 'in', '(resolved,verified,duplicate,withdrawn)');
      if (body.issue_id) query = query.eq('id', body.issue_id);
      const { data: issues, error } = await query.limit(200);
      if (error) throw error;
      const updated = [];
      for (const issue of issues || []) {
        const linked = (issue.complaint_issue_links || []).map((l) => l.complaints).filter(Boolean);
        const severity = Math.max(issue.severity || 2, ...linked.map((c) => c.severity || 2));
        const affected = Math.max(issue.affected_estimate || 50, ...linked.map((c) => c.affected_estimate || 50));
        const safety = Boolean(issue.safety_risk) || linked.some((c) => c.safety_risk);
        const rank = { low: 0, medium: 1, high: 2 };
        const loc = [issue.location_sensitivity, ...linked.map((c) => c.location_sensitivity)].sort((a, b) => (rank[b] || 0) - (rank[a] || 0))[0] || 'low';
        const ageH = (Date.now() - new Date(issue.created_at).getTime()) / 3600000;
        const count = Math.max(issue.complaint_count || 0, linked.length, 1);
        const priority = computePriority({ severity, duplicate_count: count, affected, safety_risk: safety, location_sensitivity: loc, age_hours: ageH });
        const { data: upd, error: uerr } = await supabase.from('civic_issues').update({
          severity, affected_estimate: affected, safety_risk: safety, location_sensitivity: loc,
          priority_score: priority.score, priority_band: priority.band, priority_factors: priority.factors,
          complaint_count: count,
        }).eq('id', issue.id).select().single();
        if (!uerr && upd) updated.push(upd);
      }
      return res.status(200).json({ updated: updated.length, issues: updated });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('triage-ai error:', err);
    return res.status(500).json({ error: err.message });
  }
}
