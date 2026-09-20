// Shared helpers for CivicFix serverless API routes.
import supabase from './db-client.js';

export { supabase };

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export async function getUser(req) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getProfile(userId) {
  if (!userId) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data || null;
}

export async function requireAuth(req, res) {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return null;
  }
  return user;
}

export async function requireRole(req, res, roles) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  const profile = await getProfile(user.id);
  const role = profile?.role || 'citizen';
  if (!roles.includes(role)) {
    res.status(403).json({ error: 'Access denied. Officer privileges required.' });
    return null;
  }
  return { user, profile };
}

export async function logAudit(entry) {
  try {
    const { actor_id = null, action, entity_type, entity_id = null, details = {} } = entry;
    await supabase.from('audit_logs').insert({ actor_id, action, entity_type, entity_id: entity_id ? String(entity_id) : null, details });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}

export const CATEGORIES = ['Roads', 'Garbage', 'Water', 'Drainage', 'Streetlight', 'Public Safety', 'Infrastructure', 'Sanitation', 'Other'];

export const DEPARTMENTS = {
  Roads: 'Roads & Transport Department',
  Garbage: 'Solid Waste Management',
  Water: 'Water Supply Board',
  Drainage: 'Stormwater & Drainage Dept',
  Streetlight: 'Electrical & Streetlight Dept',
  'Public Safety': 'Public Safety Cell',
  Infrastructure: 'Public Works Department',
  Sanitation: 'Health & Sanitation Dept',
  Other: 'Grievance Redressal Cell',
};

const KEYWORDS = {
  Roads: ['pothole', 'potholes', 'crater', 'road damage', 'damaged road', 'broken road', 'asphalt', 'tar road', 'speed breaker', 'divider', 'footpath', 'sidewalk', 'pavement', 'crack', 'sinkhole', 'caved', 'patch', 'resurface', 'curb', 'zebra crossing', 'road marking', 'uneven road', 'dug up road'],
  Garbage: ['garbage', 'trash', 'waste dump', 'litter', 'dumping', 'dustbin', 'dust bin', 'bin overflow', 'overflowing bin', 'heap of garbage', 'pile of garbage', 'debris', 'refuse', 'uncollected', 'not collected', 'segregation', 'landfill', 'rotting waste'],
  Water: ['water leak', 'leakage', 'leaking pipe', 'burst pipe', 'broken pipe', 'pipeline', 'no water', 'water supply', 'drinking water', 'tap water', 'muddy water', 'contaminat', 'low pressure', 'water tanker', 'valve', 'water cut', 'dry tap', 'dirty water'],
  Drainage: ['drain', 'drainage', 'gutter', 'clogged', 'choked drain', 'stagnant water', 'overflowing drain', 'manhole', 'open drain', 'sewer', 'sewage', 'culvert', 'flooding', 'flooded', 'waterlog', 'water logging', 'rainwater', 'rain water', 'stagnat'],
  Streetlight: ['streetlight', 'street light', 'street lamp', 'lamp post', 'light pole', 'dark street', 'no lighting', 'flickering', 'tube light', 'pole light', 'light not working', 'lights off', 'pitch dark'],
  'Public Safety': ['accident', 'live wire', 'exposed wire', 'hanging wire', 'electric shock', 'fallen tree', 'tree fallen', 'uprooted tree', 'branch fallen', 'open pit', 'collapse', 'collapsed', 'building crack', 'fire hazard', 'transformer', 'spark', 'hanging cable', 'dangerous', 'stray dog', 'dog bite'],
  Infrastructure: ['bridge', 'flyover', 'bus stop', 'bus shelter', 'park bench', 'playground', 'railing broken', 'boundary wall', 'community hall', 'public building', 'overbridge', 'subway', 'skywalk', 'public park', 'fountain', 'clock tower'],
  Sanitation: ['public toilet', 'toilet', 'urinal', 'foul smell', 'bad smell', 'stench', 'mosquito', 'dead animal', 'carcass', 'spitting', 'open defecation', 'sweeping', 'unclean', 'unhygienic', 'hygiene', 'dead rat', 'garbage burning', 'burning waste'],
};

const SEVERITY_SIGNALS = ['accident', 'injur', 'death', 'hospital', 'school', 'child', 'electric', 'shock', 'live wire', 'fire', 'collapse', 'burst', 'flood', 'sewage overflow', 'highway', 'main road', 'elderly', 'disabled', 'drinking water', 'contaminat', 'night', 'bike skid', 'fell down', 'bleeding'];

const BASE_SEVERITY = { 'Public Safety': 4, Water: 3, Roads: 3, Drainage: 3, Sanitation: 2, Garbage: 2, Streetlight: 2, Infrastructure: 2, Other: 1 };

const AFFECTED_HINTS = [
  ['railway station', 900], ['metro station', 800], ['main road', 700], ['highway', 750], ['market', 600],
  ['college', 500], ['hospital', 450], ['school', 350], ['temple', 300], ['mosque', 300], ['church', 300],
  ['bus stop', 250], ['apartment', 250], ['colony', 300], ['park', 200], ['office', 150], ['lane', 120],
  ['street', 150], ['village', 400], ['slum', 500],
];

const HIGH_SENSITIVITY = ['school', 'college', 'hospital', 'clinic', 'station', 'market', 'temple', 'mosque', 'church', 'court', 'main road', 'highway', 'signal', 'bus stop', 'railway', 'metro', 'airport'];
const MED_SENSITIVITY = ['colony', 'residential', 'apartment', 'lane', 'park', 'office', 'shop', 'bazaar'];

export function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

export function textSimilarity(a, b) {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.length || !tb.length) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let inter = 0;
  sa.forEach((w) => { if (sb.has(w)) inter++; });
  const union = new Set([...ta, ...tb]).size;
  const jaccard = union ? inter / union : 0;
  const containment = inter / Math.min(sa.size, sb.size);
  return 0.5 * jaccard + 0.5 * containment;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const nums = [lat1, lon1, lat2, lon2].map(Number);
  if (nums.some((v) => !isFinite(v))) return 999;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(nums[2] - nums[0]);
  const dLon = toRad(nums[3] - nums[1]);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const a = s1 * s1 + Math.cos(toRad(nums[0])) * Math.cos(toRad(nums[2])) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function deterministicTriage(input) {
  const { description = '', title = '', address = '' } = input || {};
  const text = `${title} ${description} ${address}`.toLowerCase();
  let bestCat = 'Other';
  let bestHits = 0;
  let matched = [];
  for (const cat of CATEGORIES) {
    const kws = KEYWORDS[cat] || [];
    const hits = kws.filter((k) => text.includes(k));
    if (hits.length > bestHits) {
      bestHits = hits.length;
      bestCat = cat;
      matched = hits;
    }
  }
  let severity = BASE_SEVERITY[bestCat] || 2;
  const signals = SEVERITY_SIGNALS.filter((s) => text.includes(s));
  if (signals.length >= 3) severity = Math.min(5, severity + 2);
  else if (signals.length >= 1) severity = Math.min(5, severity + 1);
  if (bestCat === 'Public Safety' && signals.length >= 2) severity = 5;

  let affected = 50;
  for (const [hint, count] of AFFECTED_HINTS) {
    if (text.includes(hint)) affected = Math.max(affected, count);
  }
  if (text.includes('many people') || text.includes('entire') || text.includes('whole area')) affected = Math.max(affected, 300);

  let locationSensitivity = 'low';
  if (HIGH_SENSITIVITY.some((h) => text.includes(h))) locationSensitivity = 'high';
  else if (MED_SENSITIVITY.some((h) => text.includes(h))) locationSensitivity = 'medium';

  const safetyRisk = bestCat === 'Public Safety' || signals.some((s) => ['accident', 'injur', 'electric', 'shock', 'live wire', 'fire', 'collapse', 'death'].some((d) => s.includes(d)));

  const firstSentence = (description || title || 'Civic complaint reported').split(/[.!?\n]/).map((s) => s.trim()).filter(Boolean)[0] || 'Civic complaint reported';
  const summary = firstSentence.length > 150 ? firstSentence.slice(0, 147) + '...' : firstSentence;
  const confidence = Math.min(0.85, 0.55 + bestHits * 0.08 + (signals.length ? 0.05 : 0));

  return {
    category: bestCat,
    severity,
    department: DEPARTMENTS[bestCat],
    summary,
    confidence: Number(confidence.toFixed(2)),
    safety_risk: safetyRisk,
    affected_estimate: affected,
    location_sensitivity: locationSensitivity,
    keywords: matched.slice(0, 6),
  };
}

export function computePriority(input) {
  const { severity = 2, duplicate_count = 0, affected = 50, safety_risk = false, location_sensitivity = 'low', age_hours = 0 } = input || {};
  const sev = Math.max(1, Math.min(5, severity));
  const sevPts = (sev / 5) * 30;
  const dupPts = (Math.min(Math.max(0, duplicate_count), 8) / 8) * 20;
  const affPts = Math.min(Math.log10(Math.max(1, affected) + 1) / 3, 1) * 15;
  const safetyPts = safety_risk ? 20 : 0;
  const locPts = location_sensitivity === 'high' ? 10 : location_sensitivity === 'medium' ? 5 : 0;
  const agePts = Math.min(Math.max(0, age_hours) / 72, 1) * 5;
  const score = Math.round(sevPts + dupPts + affPts + safetyPts + locPts + agePts);
  const band = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW';
  return {
    score,
    band,
    factors: [
      { key: 'severity', label: 'Severity ' + sev + '/5', points: Math.round(sevPts * 10) / 10, max: 30 },
      { key: 'duplicates', label: duplicate_count + ' linked report' + (duplicate_count === 1 ? '' : 's'), points: Math.round(dupPts * 10) / 10, max: 20 },
      { key: 'affected', label: '~' + affected + ' people affected', points: Math.round(affPts * 10) / 10, max: 15 },
      { key: 'safety', label: safety_risk ? 'Safety risk detected' : 'No direct safety risk', points: safetyPts, max: 20 },
      { key: 'location', label: location_sensitivity + ' sensitivity location', points: locPts, max: 10 },
      { key: 'age', label: Math.round(age_hours) + 'h waiting', points: Math.round(agePts * 10) / 10, max: 5 },
    ],
  };
}

export function duplicateScore(input) {
  const { textA, textB, catA, catB, latA, lngA, latB, lngB } = input || {};
  const t = textSimilarity(textA, textB);
  const dist = haversineKm(latA, lngA, latB, lngB);
  const geo = dist >= 999 ? 0.15 : Math.max(0, 1 - dist / 1.2);
  const cat = catA && catB && catA === catB ? 1 : 0;
  const score = 0.55 * t + 0.25 * geo + 0.2 * cat;
  return { score: Math.round(score * 100) / 100, text: Math.round(t * 100) / 100, geo: Math.round(geo * 100) / 100, cat, distKm: dist >= 999 ? null : Math.round(dist * 1000) / 1000 };
}

export async function findDuplicateCandidates(input) {
  const { description, title = '', category, lat, lng, excludeId = null, limit = 60 } = input || {};
  const { data: complaints } = await supabase
    .from('complaints')
    .select('id, title, description, category, lat, lng, address, status, created_at, image_url')
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: false })
    .limit(limit);
  const textA = `${title} ${description}`;
  const out = [];
  for (const c of complaints || []) {
    if (excludeId && String(c.id) === String(excludeId)) continue;
    const s = duplicateScore({ textA, textB: `${c.title || ''} ${c.description || ''}`, catA: category, catB: c.category, latA: lat, lngA: lng, latB: c.lat, lngB: c.lng });
    if (s.score >= 0.32) {
      const { data: links } = await supabase.from('complaint_issue_links').select('issue_id, civic_issues(id, status)').eq('complaint_id', c.id).limit(1);
      out.push({ complaint: c, score: s.score, text: s.text, geo: s.geo, cat: s.cat, distKm: s.distKm, issue_id: links?.[0]?.issue_id || null, issue_status: links?.[0]?.civic_issues?.status || null });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 8);
}
