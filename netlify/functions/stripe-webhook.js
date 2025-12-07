const { Client } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  console.log('stripe-webhook function invoked');
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook constructEvent error:', err);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    // Example: extract info from session
    // Always use shipping_details from collected_information if present
    const shipping = session.collected_information?.shipping_details;

    // Parse items metadata early so we can compute a true subtotal (exclude shipping/tax)
    let items = [];
    try {
      items = JSON.parse(session.metadata?.items || '[]');
    } catch (e) {
      console.error('Error parsing items metadata (early):', session.metadata?.items, e);
      items = [];
    }
    const itemsRows = Array.isArray(items) ? items : [];

    // compute items subtotal (sum of line_total or qty*unit_price). This represents the products subtotal.
    const itemsSubtotal = itemsRows.reduce((acc, it) => {
      const lineVal = Number(it.line_total || (Number(it.qty || 1) * Number(it.unit_price || 0)));
      return acc + (isNaN(lineVal) ? 0 : lineVal);
    }, 0);

  // shipping: prefer metadata (created at checkout), otherwise fall back to Stripe totals
  const shippingTotal = session.metadata?.shipping_cost ? Number(session.metadata.shipping_cost) : (session.total_details?.amount_shipping ? session.total_details.amount_shipping / 100 : 0);
  // Stripe will compute tax; we will not persist tax in our DB but will display it in emails
  const stripeTaxTotal = session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0;

  // subtotal should exclude shipping and tax; if we have item rows use that, otherwise fall back to session.amount_subtotal minus shipping
  const computedSubtotal = itemsRows.length > 0 ? itemsSubtotal : ((session.amount_subtotal ? session.amount_subtotal / 100 : 0) - (Number(shippingTotal) || 0));
  // grand total comes from Stripe (includes tax & shipping)
  const stripeGrandTotal = session.amount_total ? session.amount_total / 100 : (computedSubtotal + (Number(shippingTotal) || 0) + stripeTaxTotal);

    const order = {
      order_no: session.id,
      status: 'paid',
      customer_name: shipping?.name || session.customer_details?.name,
      customer_email: session.customer_details?.email,
      ship_address1: shipping?.address?.line1 || session.customer_details?.address?.line1,
      ship_address2: shipping?.address?.line2 || session.customer_details?.address?.line2,
      ship_city: shipping?.address?.city || session.customer_details?.address?.city,
      ship_state: shipping?.address?.state || session.customer_details?.address?.state,
      ship_postal_code: shipping?.address?.postal_code || session.customer_details?.address?.postal_code,
      ship_country: shipping?.address?.country || session.customer_details?.address?.country,
  subtotal: computedSubtotal,
      discount_total: 0,
      shipping_total: shippingTotal,
  // persist Stripe-calculated tax into tax_total
  tax_total: stripeTaxTotal,
  // store grand_total from Stripe
  grand_total: stripeGrandTotal,
      currency: session.currency,
      payment_ref: session.payment_intent,
    };

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    // Persist raw Stripe session JSON for auditing / reconciliation
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS stripe_sessions (
          id SERIAL PRIMARY KEY,
          session_id TEXT UNIQUE,
          payload JSONB,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now())
        );
      `);
      await client.query('INSERT INTO stripe_sessions (session_id, payload) VALUES ($1, $2) ON CONFLICT (session_id) DO NOTHING', [session.id, session]);
    } catch (sessErr) {
      console.error('Failed to persist stripe session:', sessErr);
    }
    const query = `
      INSERT INTO orders (
        order_no, status, customer_name, customer_email,
        ship_address1, ship_address2, ship_city, ship_state, ship_postal_code, ship_country,
        subtotal, discount_total, shipping_total, tax_total, grand_total, currency,
        payment_ref
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17
      ) RETURNING *;
    `;
    const values = [
      order.order_no,
      order.status,
      order.customer_name,
      order.customer_email,
      order.ship_address1,
      order.ship_address2,
      order.ship_city,
      order.ship_state,
      order.ship_postal_code,
      order.ship_country,
      order.subtotal,
      order.discount_total,
      order.shipping_total,
      order.tax_total,
      order.grand_total,
      order.currency,
      order.payment_ref,
    ];
    // Insert order and get the inserted row (with id)
    const orderResult = await client.query(query, values);
    const orderRow = orderResult.rows[0];

  // Items were parsed earlier into `itemsRows`; log for debug and reuse that for inserts
  console.log('Using parsed items for insertion:', itemsRows);

    // Insert each item into order_items table with logging and error handling
    // Only insert columns that are expected to exist in the order_items table
    const itemQuery = `
      INSERT INTO order_items (
        order_id, part_id, qty, unit_price, manu_price, vendor_name, line_total, name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
    `;
    console.log('Order items to insert:', itemsRows);
    if (!Array.isArray(itemsRows) || itemsRows.length === 0) {
      console.error('No order items found in metadata:', session.metadata?.items);
    }
    try {
      for (const item of itemsRows) {
        console.log('Inserting order item:', item);
        try {
          // fetch manu_price and sku from products if part_id provided
          let manuPrice = null;
          let vendorName = null; 
          if (item.part_id) {
            try {
              const prodRes = await client.query('SELECT manu_price, vendor, sku FROM products WHERE id = $1 LIMIT 1', [item.part_id]);
              if (prodRes && prodRes.rows && prodRes.rows[0]) {
                manuPrice = prodRes.rows[0].manu_price;
                vendorName = prodRes.rows[0].vendor;
                // attach sku, manu_price and vendor back onto the item so email builder can use them
                item.sku = prodRes.rows[0].sku;
                item.manu_price = prodRes.rows[0].manu_price;
                item.vendor = prodRes.rows[0].vendor;
              }
            } catch (prodErr) {
              console.error('Failed to fetch manu_price/sku for part_id', item.part_id, prodErr);
            }
          }

          const result = await client.query(itemQuery, [
            orderRow.id,
            item.part_id || null,
            item.qty || 1,
            item.unit_price || 0,
            manuPrice,
            vendorName,
            item.line_total || 0,
            item.name || ''
          ]);
          console.log('Order item insert result:', result);
          // Decrement inventory for the purchased item if part_id is present
          if (item.part_id) {
            const invResult = await client.query(
              'UPDATE products SET inventory = GREATEST(inventory - $1, 0) WHERE id = $2',
              [item.qty || 1, item.part_id]
            );
            console.log('Inventory update result:', invResult);
          } else {
            console.log('No part_id provided, skipping inventory update for item:', item.name);
          }
        } catch (itemErr) {
          console.error('Error inserting single order item or updating inventory:', item, itemErr);
        }
      }
    } catch (err) {
      console.error('Error inserting order items:', err);
    }
    // Send notification emails to vendors for items they sell (group by vendor name)
    try {
      const mailgunApiKey = process.env.MAILGUN_API_KEY;
      const mailgunDomain = process.env.MAILGUN_DOMAIN;
      const mailFrom = process.env.MAILGUN_FROM || `support@${mailgunDomain || 'agexparts.com'}`;
      const mgUrl = mailgunApiKey && mailgunDomain ? `https://api.mailgun.net/v3/${mailgunDomain}/messages` : null;

      if (mgUrl) {
        // build map vendor_name -> items
        const vendorMap = new Map();
        for (const it of itemsRows) {
          const vn = (it.vendor || it.vendor_name || '').toString().trim();
          if (!vn) continue;
          if (!vendorMap.has(vn)) vendorMap.set(vn, []);
          vendorMap.get(vn).push(it);
        }

        const displayOrderRef = orderRow.order_ref || order.order_no;

        for (const [vendorNameKey, itemsForVendor] of vendorMap.entries()) {
          try {
            const vRes = await client.query('SELECT email, name FROM vendors WHERE name = $1 LIMIT 1', [vendorNameKey]);
            if (!vRes || !vRes.rows || !vRes.rows[0] || !vRes.rows[0].email) {
              console.log('No vendor email found for', vendorNameKey, 'skipping vendor notification');
              continue;
            }
            const vendorEmail = vRes.rows[0].email;
            const vendorDisplay = vRes.rows[0].name || vendorNameKey;

            const vendorItemsHtml = itemsForVendor.map(it => {
              const name = it.name || '';
              const sku = it.sku || '';
              const qty = Number(it.qty || 1);
              const manu = Number(it.manu_price || 0).toFixed(2);
              const line = (Number(it.manu_price || 0) * qty).toFixed(2);
              return `<tr><td style="padding:6px 8px;border:1px solid #eee">${name}</td><td style="padding:6px 8px;border:1px solid #eee">${sku}</td><td style="padding:6px 8px;border:1px solid #eee;text-align:center">${qty}</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right">$${manu}</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right">$${line}</td></tr>`;
            }).join('');

            const vendorSubtotal = itemsForVendor.reduce((sum, it) => sum + (Number(it.manu_price || it.unit_price || 0) * Number(it.qty || 1)), 0).toFixed(2);

            const vendorHtml = `
              <div style="font-family:Arial,Helvetica,sans-serif;color:#222">
                <h2>Order Notification — ${displayOrderRef}</h2>
                <p>Hi ${vendorDisplay},</p>
                <p>We received a successful payment containing items for your products. Summary below:</p>
                <table style="border-collapse:collapse;width:100%;max-width:700px">
                  <thead>
                    <tr>
                      <th style="text-align:left;padding:6px 8px;border:1px solid #eee">Item</th>
                      <th style="text-align:left;padding:6px 8px;border:1px solid #eee">SKU</th>
                      <th style="text-align:center;padding:6px 8px;border:1px solid #eee">Qty</th>
                      <th style="text-align:right;padding:6px 8px;border:1px solid #eee">Manu Price</th>
                      <th style="text-align:right;padding:6px 8px;border:1px solid #eee">Line</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vendorItemsHtml}
                  </tbody>
                </table>
                <p>Vendor subtotal (based on manufacturer price): <strong>$${vendorSubtotal}</strong></p>
                <p>Order reference: <strong>${displayOrderRef}</strong></p>
                <hr/>
                <p style="font-size:13px;color:#666">If you have questions, reply to this email or contact support@agexparts.com.</p>
              </div>
            `;

            const vParams = new URLSearchParams();
            vParams.append('from', mailFrom);
            vParams.append('to', vendorEmail);
            vParams.append('subject', `Order Notification — ${displayOrderRef}`);
            vParams.append('html', vendorHtml);

            const vResp = await fetch(mgUrl, {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + Buffer.from('api:' + mailgunApiKey).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: vParams.toString()
            });
            const vText = await vResp.text();
            if (!vResp.ok) console.error('Mailgun vendor email error for', vendorEmail, vResp.status, vText);
            else console.log('Mailgun vendor email sent to', vendorEmail);

          } catch (vendErr) {
            console.error('Error building/sending vendor email for', vendorNameKey, vendErr);
          }
        }
      }
    } catch (ve) {
      console.error('Error sending vendor notifications', ve);
    }

    await client.end();

    // Send order confirmation email via Mailgun if configured
    try {
      const mailgunApiKey = process.env.MAILGUN_API_KEY;
      const mailgunDomain = process.env.MAILGUN_DOMAIN;
      const mailFrom = process.env.MAILGUN_FROM || `support@${mailgunDomain || 'agexparts.com'}`;

      if (mailgunApiKey && mailgunDomain) {
  // Build order URL: keep the order path for compatibility but include the Stripe session id as a query param
  // so the front-end can look up order by session if needed. Use `session.id` (the Checkout Session id).
  const baseUrl = process.env.BASE_URL || 'https://agexparts.netlify.app';
  const orderUrl = `${baseUrl}/success?session_id=${encodeURIComponent(session.id)}`;

  const itemsHtml = itemsRows.map(it => {
          const name = it.name || '';
          const sku = it.sku || '';
          const qty = Number(it.qty || 1);
          const unit = Number(it.unit_price || 0).toFixed(2);
          const line = Number(it.line_total || (qty * Number(it.unit_price || 0))).toFixed(2);
          return `<tr><td style="padding:6px 8px;border:1px solid #eee">${name}</td><td style="padding:6px 8px;border:1px solid #eee">${sku}</td><td style="padding:6px 8px;border:1px solid #eee;text-align:center">${qty}</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right">$${unit}</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right">$${line}</td></tr>`;
        }).join('');

  // displaySubtotal: reuse earlier computed itemsSubtotal (products subtotal)
  const displaySubtotal = itemsRows.length > 0 ? itemsSubtotal : Number(order.subtotal || 0);
        const displayShipping = Number(order.shipping_total || 0);
        const displayTax = Number(order.tax_total || 0);
        const displayGrand = displaySubtotal + displayShipping + displayTax;

        const displayOrderRef = orderRow.order_ref || order.order_no;
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#222">
            <h2>Order Confirmation — ${displayOrderRef}</h2>
            <p>Thank you for your order, <strong>${order.customer_name || ''}</strong> — we received payment and are processing your order.</p>
            <h3>Order summary</h3>
            <table style="border-collapse:collapse;width:100%;max-width:700px">
              <thead>
                <tr>
                  <th style="text-align:left;padding:6px 8px;border:1px solid #eee">Item</th>
                  <th style="text-align:center;padding:6px 8px;border:1px solid #eee">SKU</th>
                  <th style="text-align:center;padding:6px 8px;border:1px solid #eee">Qty</th>
                  <th style="text-align:right;padding:6px 8px;border:1px solid #eee">Unit</th>
                  <th style="text-align:right;padding:6px 8px;border:1px solid #eee">Line</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <p style="max-width:700px">Subtotal: <strong>$${displaySubtotal.toFixed(2)}</strong><br/>Shipping: <strong>$${displayShipping.toFixed(2)}</strong><br/>Tax: <strong>$${displayTax.toFixed(2)}</strong><br/>Total: <strong>$${displayGrand.toFixed(2)}</strong></p>
            <p><a href="${orderUrl}">View your order</a></p>
            <hr/>
            <p style="font-size:13px;color:#666">If you have any questions, reply to this email or contact support@agexparts.com.</p>
          </div>
        `;

        const mgUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;
        const params = new URLSearchParams();
        params.append('from', mailFrom);
        params.append('to', order.customer_email);
  params.append('subject', `Order Confirmation — ${displayOrderRef}`);
        params.append('html', html);

        const resp = await fetch(mgUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from('api:' + mailgunApiKey).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });
        const text = await resp.text();
        if (!resp.ok) {
          console.error('Mailgun order email error:', resp.status, text);
        } else {
          console.log('Mailgun order email sent:', text);
        }
      }
    } catch (mailErr) {
      console.error('Error sending order confirmation email:', mailErr && mailErr.message ? mailErr.message : mailErr);
    }
  }

  return { statusCode: 200, body: 'Webhook received' };
};
