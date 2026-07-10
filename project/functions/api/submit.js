import { buildCertificatePdf } from '../_lib/certificate.js';
import { sendGmailWithAttachment } from '../_lib/gmail.js';

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400 });
  }

  const email = (data.email || '').trim();
  const name = (data.name || '').trim();
  const commitment = (data.commitmentText || '').trim();
  const dateVal = (data.dateVal || '').trim();
  const commitments = Array.isArray(data.commitments)
    ? data.commitments.filter((c) => typeof c === 'string' && c.trim())
    : [];

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ ok: false, error: 'Valid email is required' }), { status: 400 });
  }

  await env.DB.prepare(
    'INSERT INTO signups (name, email, commitment, date_val, commitments, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(name, email, commitment, dateVal, JSON.stringify(commitments), new Date().toISOString()).run();

  try {
    const pdfBytes = await buildCertificatePdf({ name: name || 'Friend', commitments, dateVal });
    const firstName = name.split(' ')[0].trim() || 'Friend';
    const textBody =
      `Dear ${firstName},\r\n\r\n` +
      `Thanks for signing up to make Shabbos extra special for this year. Please find your Shabbos 5787 Commitment Certificate below!`;

    await sendGmailWithAttachment({
      env,
      to: email,
      subject: 'Your 5787 Shabbos Commitment',
      textBody,
      attachment: { bytes: pdfBytes, filename: 'Shabbos-5787-Commitment-Certificate.pdf' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: true, emailSent: false, error: String(err) }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, emailSent: true }), {
    headers: { 'content-type': 'application/json' },
  });
}
