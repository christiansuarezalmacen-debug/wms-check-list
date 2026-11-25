export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST' });
  }

  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ error: 'Falta to o message' });
  }

  const SID = process.env.TWILIO_ACCOUNT_SID;
  const TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const FROM = process.env.TWILIO_PHONE_NUMBER;

  if (!SID || !TOKEN || !FROM) {
    return res.status(500).json({ error: 'Faltan variables en Vercel: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER' });
  }

  const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', FROM);
  params.append('Body', message);

  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return res.status(400).json({ error: 'No se pudo enviar SMS', details: data.message || JSON.stringify(data), code: data.code });
    }

    return res.status(200).json({ ok: true, sid: data.sid });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno', details: e.message });
  }
}
