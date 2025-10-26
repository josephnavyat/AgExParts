const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Expect a JSON POST body with: { subject, email, message, attachment: { name, type, base64 } }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { subject, email, message, attachment } = data;
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  const mailFrom = process.env.MAILGUN_FROM || `support@${mailgunDomain || 'agexparts.com'}`;
  const mailTo = process.env.CONTACT_TO || 'support@agexparts.com';

  try {
    if (mailgunApiKey && mailgunDomain) {
      // Use Mailgun API and send attachment as multipart/form-data
      const mgUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;
      const formData = new URLSearchParams();
      formData.append('from', mailFrom);
      formData.append('to', mailTo);
      formData.append('subject', subject || 'Parts specialist request');
      const html = `<p>From: ${email}</p><p>Message:</p><p>${(message || '').replace(/\n/g, '<br/>')}</p>`;
      formData.append('html', html);

      // Mailgun attachments require multipart/form-data; URLSearchParams can't do files.
      // Build multipart body manually if attachment provided.
      if (attachment && attachment.base64) {
        // Build multipart/form-data body
        const boundary = '----agexparts' + Date.now();
        const lines = [];
        function addField(name, value) {
          lines.push(`--${boundary}`);
          lines.push(`Content-Disposition: form-data; name="${name}"`);
          lines.push('');
          lines.push(value);
        }
        addField('from', mailFrom);
        addField('to', mailTo);
        addField('subject', subject || 'Parts specialist request');
        addField('html', html);
        // Attachment
        const fileBuf = Buffer.from(attachment.base64, 'base64');
        lines.push(`--${boundary}`);
        lines.push(`Content-Disposition: form-data; name="attachment"; filename="${attachment.name || 'attachment.bin'}"`);
        lines.push(`Content-Type: ${attachment.type || 'application/octet-stream'}`);
        lines.push('');
        const pre = lines.join('\r\n') + '\r\n';
        const post = `\r\n--${boundary}--\r\n`;
        const multipartBody = Buffer.concat([Buffer.from(pre, 'utf8'), fileBuf, Buffer.from(post, 'utf8')]);

        const resp = await fetch(mgUrl, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from('api:' + mailgunApiKey).toString('base64'),
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: multipartBody
        });
        const text = await resp.text();
        if (!resp.ok) {
          console.error('Mailgun send error:', resp.status, text);
          return { statusCode: 502, body: 'Mailgun send failed' };
        }
        return { statusCode: 200, body: JSON.stringify({ success: true, result: text }) };
      } else {
        // No attachment - can use URLSearchParams
        const resp = await fetch(mgUrl, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from('api:' + mailgunApiKey).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ from: mailFrom, to: mailTo, subject: subject || 'Parts specialist request', html })
        });
        const text = await resp.text();
        if (!resp.ok) {
          console.error('Mailgun send error:', resp.status, text);
          return { statusCode: 502, body: 'Mailgun send failed' };
        }
        return { statusCode: 200, body: JSON.stringify({ success: true, result: text }) };
      }
    } else {
      console.error('Mailgun not configured');
      return { statusCode: 500, body: 'Mail server not configured' };
    }
  } catch (err) {
    console.error('Contact Parts Specialist error:', err);
    return { statusCode: 500, body: 'Server error' };
  }
};
