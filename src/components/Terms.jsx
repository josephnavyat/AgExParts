import React from 'react';
import Layout from './Layout.jsx';
import { getR2Url } from '../utils/imageUrl.js';

export default function Terms() {
  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '1rem' }}>
      <h1>Terms and Conditions</h1>
      <p>These are the Terms and Conditions for AgEx Parts. By using this site you agree to the terms and conditions set forth herein.</p>

      <h2>Orders</h2>
      <p>All orders are subject to acceptance and availability. Prices may change without notice.</p>
      
      <h2>Payment</h2>
      <p>We gladly accept Visa, MasterCard, Discover, American Express, personal checks, and money orders. When ordering by mail include your payment. Fax orders must pay by credit card only.</p>
      <p>Sales Tax - AgEx Parts is required to collect sales tax according with State and Federal Rules. Sales tax will be charged for deliveries within each states laws. In order to be tax exempt, we must have a valid tax exemption form on file before the order is placed. You can provide your tax exempt certificate via email at support@agexparts.com
        or upload it directly to our Site by creating a user account.
      </p>
      <p>
        Link to Iowa Tax Exempt Form:
        {' '}
        <a
  href={getR2Url('TaxExemptIowa.pdf')}
  target="_blank"
  rel="noopener noreferrer"
  style={{ fontWeight: 'bold', color: 'blue' }}
>
  31-014 Iowa Sales Use Excise Tax Exemption Certificate (PDF)
</a>


      </p>

      <h2>Shipping</h2>
      <p>
        <ul>
          <li>All orders are shipped FOB from our nearest warehouse or directly from the manufacturer or supplier.</li>
          <li>Some items are subject to additional freight or handling fees.</li>
          <li>We cannot be responsible for delays caused by UPS, Parcel Post or other freight companies, however, if you feel there has been an unreasonable delay, please contact us.</li>

        </ul>

        Shipping policies and return windows are described on the Shipping & Returns page.<br />
        All orders are shipped FOB from our nearest warehouse or directly from the manufacturer or supplier.
      </p>

      <h2>Warranty</h2>
      <p>AgEx Parts offers a 1-year warranty on all parts. This warranty does not cover costs for third-party parts or labor required for repairs. It applies only to agricultural and farming equipment applications. Products used in other applications, including industrial, commercial, or non-farming purposes, are not covered by this warranty, nor by any implied warranties of merchantability or fitness for a specific purpose.
         This warranty is valid only for the applications listed. Use outside of these applications will void the warranty. The above express limited warranties replace all other warranties, whether expressed or implied, and constitute the only warranties provided.</p>

      <h2>Returns</h2>
      <ul>
        <li>All returns must be authorized in advance by AgEx Parts to receive credit.</li>
        <li>All returns must be accompanied by the corresponding RMA paperwork, detailing the specified, authorized products. Returns failing to have this paperwork will be sent back to you at your expense. RMA’s may be obtained by calling customer service.</li>
        <li>Returns in new, resalable condition received within 30 days of shipment will receive full credit, with the following exception: Items returned due to customer error will be charged a 15% restocking fee and pre-paid freight will be charged back.</li>
        <li>Freight charges will be credited on all returns due to a Herschel Parts error. The customer will be responsible for freight charges on returns due to customer errors.</li>
      </ul>
      
      <h2>Liability</h2>
      <p>AgEx Parts is not liable for incidental or consequential damages arising from use of this site.</p>

      <h2>Contact</h2>
      <p>Questions about these terms should be sent to support@agexparts.com.</p>
    </div>
  );
}
