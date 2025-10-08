const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid request body' };
  }

  const { to, subject, text, html } = data;
  if (!to || !subject || !text) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL, // Set this in your Netlify env vars
    subject,
    text,
    html: html || undefined,
  };

  try {
    await sgMail.send(msg);
    return { statusCode: 200, body: 'Email sent successfully' };
  } catch (err) {
    return { statusCode: 500, body: `Error sending email: ${err.message}` };
  }
};
