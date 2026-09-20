// CivicFix upload API: validated evidence photo uploads to Supabase Storage.
import supabase from './db-client.js';
import { setCors, handleOptions, requireAuth, logAudit } from './_lib.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_BYTES = 5 * 1024 * 1024;

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const body = req.body || {};
    const { fileName, fileBase64, contentType, folder = 'complaints' } = body;
    if (!fileName || !fileBase64 || !contentType) return res.status(400).json({ error: 'File name, data and content type are required.' });
    if (!ALLOWED.includes(contentType)) return res.status(400).json({ error: 'Only JPG, PNG and WebP images are allowed.' });
    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length > MAX_BYTES) return res.status(400).json({ error: 'Image must be smaller than 5 MB.' });
    if (buffer.length < 100) return res.status(400).json({ error: 'Invalid image data.' });
    const safeFolder = ['complaints', 'resolutions'].includes(folder) ? folder : 'complaints';
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const clean = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const path = safeFolder + '/' + user.id.slice(0, 8) + '-' + Date.now() + '-' + clean + '.' + ext;
    const { error } = await supabase.storage.from('evidence').upload(path, buffer, { contentType, upsert: false });
    if (error) throw new Error('Storage upload failed: ' + error.message);
    const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(path);
    await logAudit({ actor_id: user.id, action: 'evidence.uploaded', entity_type: 'file', entity_id: path, details: { folder: safeFolder, bytes: buffer.length } });
    return res.status(200).json({ url: urlData.publicUrl, path });
  } catch (err) {
    console.error('upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}
