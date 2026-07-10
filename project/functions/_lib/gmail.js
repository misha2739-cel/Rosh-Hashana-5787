const SENDER = 'Rosh Hashanah 5787 <roshhashanah5787@gmail.com>';

function uint8ToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function wrapBase64(b64) {
  return b64.match(/.{1,76}/g).join('\r\n');
}

async function getAccessToken(env) {
  const params = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID,
    client_secret: env.GMAIL_CLIENT_SECRET,
    refresh_token: env.GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error('Failed to refresh Gmail access token: ' + (await res.text()));
  }
  const data = await res.json();
  return data.access_token;
}

export async function sendGmailWithAttachment({ env, to, subject, textBody, attachment }) {
  const accessToken = await getAccessToken(env);
  const boundary = 'certboundary_' + Math.random().toString(36).slice(2);
  const attachmentB64 = wrapBase64(uint8ToBase64(attachment.bytes));

  const message =
    `From: ${SENDER}\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n` +
    `Content-Transfer-Encoding: 7bit\r\n\r\n` +
    `${textBody}\r\n\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/pdf; name="${attachment.filename}"\r\n` +
    `Content-Disposition: attachment; filename="${attachment.filename}"\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${attachmentB64}\r\n\r\n` +
    `--${boundary}--`;

  const rawBytes = new TextEncoder().encode(message);
  const raw = uint8ToBase64(rawBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    throw new Error('Failed to send email: ' + (await res.text()));
  }
  return res.json();
}
