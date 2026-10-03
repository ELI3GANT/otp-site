const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._~-]{5,512}$/;
const TYPES = new Set(['invoice', 'proposal', 'agreement', 'receipt', 'service-summary', 'nda', 'paid-receipt', 'project-scope', 'delivery-summary', 'change-order', 'payment-reminder']);
const MESSAGE = 'The client portal is unavailable. Contact OTP for a fresh invite.';

async function boundedBody(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) throw new Error('oversize');
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > limit) throw new Error('oversize');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function forwardClientPortalRead(req, res, { base, fetchImpl = fetch }) {
  res.set({ 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' });
  const token = String(req.params.token || '');
  const { type, format } = req.params;
  if (!TOKEN.test(token) || (type && (!TYPES.has(type) || !['view', 'pdf'].includes(format)))) {
    return res.status(404).json({ ok: false, errorCode: 'not_found', message: MESSAGE });
  }
  const path = `/api/v1/client/portal/${encodeURIComponent(token)}${type ? `/documents/${type}/${format}` : ''}`;
  try {
    const response = await fetchImpl(`${base}${path}`, {
      headers: { Accept: type ? '*/*' : 'application/json' },
      signal: AbortSignal.timeout(9000), redirect: 'error'
    });
    if (!response.ok) {
      const status = [403,404,410].includes(response.status) ? response.status : 503;
      return res.status(status).json({ ok: false, errorCode: status === 410 ? 'expired' : status === 403 ? 'document_not_ready' : status === 404 ? 'not_found' : 'upstream_unavailable', message: MESSAGE });
    }
    const bytes = await boundedBody(response, type ? 10 * 1024 * 1024 : 512 * 1024);
    if (!type) {
      const payload = JSON.parse(bytes.toString('utf8'));
      if (payload.ok !== true || !payload.client || !payload.project || !Array.isArray(payload.documents)) throw new Error('invalid_payload');
      return res.json(payload);
    }
    if (format === 'pdf') {
      if (bytes.subarray(0,5).toString() !== '%PDF-') throw new Error('invalid_pdf');
      res.type('pdf').set('Content-Disposition', `inline; filename="OTP-${type}.pdf"`);
    } else {
      if (!/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('invalid_html');
      res.type('html');
    }
    return res.send(bytes);
  } catch {
    return res.status(503).json({ ok: false, errorCode: 'upstream_unavailable', message: MESSAGE });
  }
}

module.exports = { forwardClientPortalRead };
