const { Client } = require('pg');
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

  const { orderId, shipping_total, status, email, emailSubject, emailText } = data;
  if (!orderId) {
    return { statusCode: 400, body: 'Missing orderId' };
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      'UPDATE orders SET shipping_total = $1, status = $2 WHERE id = $3',
      [shipping_total, status, orderId]
    );
  } catch (err) {
    await client.end();
    return { statusCode: 500, body: 'Database update failed: ' + err.message };
  }
  await client.end();

  // Send email if requested
  if (email && emailSubject && emailText) {
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: emailSubject,
        text: emailText,
      });
    } catch (err) {
      return { statusCode: 500, body: 'Email send failed: ' + err.message };
    }
  }

  return { statusCode: 200, body: 'Order updated and email sent (if requested)' };
};
