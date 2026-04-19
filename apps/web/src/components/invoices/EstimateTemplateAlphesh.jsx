import React from 'react';
import { format } from 'date-fns';

export function EstimateTemplateAlphesh({ invoice, business, party, items: rawItems = [], totals = {} }) {
  const { subtotal = 0, cgst = 0, sgst = 0, igst = 0, total = 0 } = totals;
  const doc = invoice || {};
  const businessInfo = business || {};
  const client = party || {};
  const items = Array.isArray(rawItems) ? rawItems : [];

  return (
    <div 
      className="w-full bg-white text-slate-800 font-sans p-6 selection:bg-gray-100"
      style={{ width: '210mm', margin: '0 auto', fontSize: '11px', lineHeight: '1.4' }}
    >
      <div style={{ border: '1px solid #d1d5db' }}>
        
        {/* Header Section */}
        <table style={{ width: '100%', borderBottom: '1px solid #d1d5db', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '24px', verticalAlign: 'top' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', margin: '0 0 4px 0' }}>
                  {businessInfo.name || businessInfo.legalName}
                </h1>
                <div style={{ fontSize: '10px', color: '#475569', fontWeight: '500' }}>
                  <p style={{ margin: '0' }}>{businessInfo.address?.street}</p>
                  <p style={{ margin: '0' }}>{businessInfo.address?.city}, {businessInfo.address?.state} {businessInfo.address?.pincode || businessInfo.address?.zip}</p>
                  {businessInfo.gstin && <p style={{ margin: '2px 0 0 0', fontWeight: '700' }}>GSTNo: <span style={{ textTransform: 'uppercase' }}>{businessInfo.gstin}</span></p>}
                  <p style={{ margin: '2px 0 0 0', color: '#4f46e5', fontWeight: '700' }}>{businessInfo.email}</p>
                </div>
              </td>
              <td style={{ padding: '24px', textAlign: 'right', verticalAlign: 'middle' }}>
                 <h2 style={{ fontSize: '48px', fontWeight: '900', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0' }}>
                   ESTIMATE
                 </h2>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Metadata Table */}
        <table style={{ width: '100%', borderBottom: '1px solid #d1d5db', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '12px 16px', borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '100px', fontWeight: '700', color: '#475569', fontSize: '9px', textTransform: 'uppercase' }}>Estimate No</td>
                      <td style={{ fontWeight: '700', color: '#1e293b' }}>: {doc.estimateNumber || doc.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ width: '100px', fontWeight: '700', color: '#475569', fontSize: '9px', textTransform: 'uppercase' }}>Estimate Date</td>
                      <td style={{ fontWeight: '700', color: '#1e293b' }}>: {doc.date ? format(new Date(doc.date), 'dd/MM/yyyy') : '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ width: '100px', fontWeight: '700', color: '#475569', fontSize: '9px', textTransform: 'uppercase' }}>Reference No</td>
                      <td style={{ fontWeight: '700', color: '#1e293b' }}>: {doc.poNumber || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style={{ width: '50%', padding: '12px 16px', verticalAlign: 'top' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '120px', fontWeight: '700', color: '#475569', fontSize: '9px', textTransform: 'uppercase' }}>Place of Supply</td>
                      <td style={{ fontWeight: '700', color: '#1e293b', textTransform: 'uppercase' }}>: {doc.stateOfSupply || businessInfo.address?.state || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Address Table */}
        <table style={{ width: '100%', borderBottom: '1px solid #d1d5db', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ width: '50%', padding: '6px 16px', textAlign: 'left', fontWeight: '700', color: '#374151', fontSize: '10px', textTransform: 'uppercase', borderRight: '1px solid #d1d5db' }}>Bill To</th>
              <th style={{ width: '50%', padding: '6px 16px', textAlign: 'left', fontWeight: '700', color: '#374151', fontSize: '10px', textTransform: 'uppercase' }}>Ship To</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '16px', verticalAlign: 'top', borderRight: '1px solid #d1d5db', height: '140px' }}>
                <div style={{ textTransform: 'uppercase' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{client.name}</p>
                  <p style={{ margin: '0', color: '#4b5563', fontWeight: '700' }}>{client.address || client.billingAddress?.street || '-'}</p>
                  <p style={{ margin: '0', color: '#4b5563', fontWeight: '700' }}>{[client.city, client.state, client.pincode].filter(Boolean).join(', ')}</p>
                  <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#6b7280', fontWeight: '500', textTransform: 'none' }}>
                    <p style={{ margin: '0' }}>Mobile: {client.phone || '-'}</p>
                    <p style={{ margin: '0', textTransform: 'lowercase' }}>e-mail id: {client.email || '-'}</p>
                  </div>
                </div>
              </td>
              <td style={{ width: '50%', padding: '16px', verticalAlign: 'top' }}>
                 <div style={{ textTransform: 'uppercase' }}>
                    <p style={{ margin: '0', color: '#4b5563', fontWeight: '700' }}>{client.shippingAddress?.street || client.address || '-'}</p>
                    <p style={{ margin: '0', color: '#4b5563', fontWeight: '700' }}>{[client.shippingAddress?.city || client.city, client.shippingAddress?.state || client.state].filter(Boolean).join(', ')}</p>
                    <div style={{ marginTop: '24px', fontStyle: 'italic', color: '#6b7280', fontWeight: '500', textTransform: 'none' }}>
                      <p style={{ margin: '0' }}>Mobile: {client.phone || '-'}</p>
                      <p style={{ margin: '0', textTransform: 'lowercase' }}>e-mail id: {client.email || '-'}</p>
                    </div>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Item Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
              <th style={{ padding: '8px', width: '40px', textAlign: 'center', fontWeight: '700', color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', borderRight: '1px solid #d1d5db' }}>SNo</th>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: '700', color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', borderRight: '1px solid #d1d5db' }}>Item & Description</th>
              <th style={{ padding: '8px', width: '100px', textAlign: 'center', fontWeight: '700', color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', borderRight: '1px solid #d1d5db' }}>HSN/SAC</th>
              <th style={{ padding: '8px', width: '60px', textAlign: 'center', fontWeight: '700', color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', borderRight: '1px solid #d1d5db' }}>Qty</th>
              <th style={{ padding: '8px', width: '100px', textAlign: 'right', fontWeight: '700', color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', borderRight: '1px solid #d1d5db' }}>Rate</th>
              <th style={{ padding: '8px', width: '120px', textAlign: 'right', fontWeight: '700', color: '#4b5563', fontSize: '9px', textTransform: 'uppercase' }}>Amount(₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', fontWeight: '700', borderRight: '1px solid #d1d5db' }}>{index + 1}</td>
                <td style={{ padding: '8px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', borderRight: '1px solid #d1d5db' }}>{item.item?.name || item.description}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#475569', fontWeight: '700', borderRight: '1px solid #d1d5db' }}>{item.hsnCode || '-'}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#0f172a', fontWeight: '700', borderRight: '1px solid #d1d5db' }}>{item?.quantity || 0}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#334155', fontWeight: '700', borderRight: '1px solid #d1d5db' }}>{(item?.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#0f172a', fontWeight: '900' }}>{((item?.quantity || 0) * (item?.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {[...Array(Math.max(0, 8 - items.length))].map((_, i) => (
              <tr key={`pad-${i}`} style={{ height: '32px' }}>
                <td style={{ borderRight: '1px solid #d1d5db' }}></td>
                <td style={{ borderRight: '1px solid #d1d5db' }}></td>
                <td style={{ borderRight: '1px solid #d1d5db' }}></td>
                <td style={{ borderRight: '1px solid #d1d5db' }}></td>
                <td style={{ borderRight: '1px solid #d1d5db' }}></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Table */}
        <table style={{ width: '100%', borderTop: '1px solid #d1d5db', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '60%', padding: '16px', verticalAlign: 'top', borderRight: '1px solid #d1d5db' }}>
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Amount in Words:</p>
                  <p style={{ fontWeight: '900', fontStyle: 'italic', textTransform: 'lowercase', color: '#0f172a', margin: '0' }}>{doc.amountInWords || '-'}</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontWeight: '900', color: '#0f172a', fontSize: '12px', margin: '0 0 8px 0' }}>Terms & Conditions:</p>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', whiteSpace: 'pre-line', lineHeight: '1.2' }}>
                    {doc.terms}
                  </div>
                </div>

                <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', fontStyle: 'italic' }}>
                  <p style={{ textTransform: 'uppercase', margin: '0 0 8px 0' }}>Thanks for your business</p>
                  <p style={{ margin: '0', textTransform: 'uppercase' }}>Company GSTIN No: <span style={{ color: '#0f172a', fontWeight: '900' }}>{businessInfo.gstin}</span></p>
                  <p style={{ margin: '0', textTransform: 'uppercase' }}>Company PAN: <span style={{ color: '#0f172a', fontWeight: '900' }}>{businessInfo.pan}</span></p>
                </div>
              </td>
              <td style={{ width: '40%', verticalAlign: 'top' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Item Total</span>
                          <span style={{ fontWeight: '900', color: '#0f172a' }}>{(subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '16px', height: '180px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '60px' }}>
                          <span style={{ fontWeight: '900', color: '#0f172a', fontSize: '14px', textTransform: 'uppercase' }}>NET TOTAL</span>
                          <span style={{ fontWeight: '900', color: '#0f172a', fontSize: '20px' }}>₹{(total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '190px', height: '1px', backgroundColor: '#d1d5db', margin: '0 auto 8px auto' }} />
                          <p style={{ fontWeight: '900', color: '#94a3b8', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Authorized Signature</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  );
}
