import React from 'react';
import { format } from 'date-fns';

export function EstimateTemplateAlphesh({ invoice, business, party, items, totals }) {
  // Use either invoice or estimate props (they are compatible)
  const doc = invoice || {};
  const businessInfo = business || {};
  const client = party || {};
  
  return (
    <div id="print-area" className="w-full bg-white text-gray-900 font-sans p-0 leading-relaxed text-[12px]">
      {/* Header Section */}
      <div className="border border-gray-300 p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-bold uppercase tracking-tight leading-tight">{businessInfo.name || businessInfo.legalName}</h1>
            <div className="mt-1 space-y-0.5">
              <p className="max-w-md">{businessInfo.address?.line1}, {businessInfo.address?.line2}</p>
              <p>{businessInfo.address?.city}, {businessInfo.address?.state} {businessInfo.address?.pincode}</p>
              {businessInfo.gstin && <p className="font-bold">GSTNo: {businessInfo.gstin}</p>}
              <p className="mt-2 text-indigo-600 font-medium lowercase">{businessInfo.email}</p>
            </div>
          </div>
          <div className="text-right">
             <h2 className="text-5xl font-black text-gray-300 uppercase tracking-widest opacity-50">ESTIMATE</h2>
          </div>
        </div>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 border-x border-b border-gray-300">
        <div className="p-2 pl-4 border-r border-gray-300 space-y-1">
          <div className="flex gap-4">
            <span className="w-24 font-bold text-gray-600">Estimate No</span>
            <span>: {doc.estimateNumber || doc.invoiceNumber}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-24 font-bold text-gray-600">Estimate Date</span>
            <span>: {doc.date ? format(new Date(doc.date), 'dd/MM/yyyy') : '-'}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-24 font-bold text-gray-600">Reference No</span>
            <span>: {doc.reference || '-'}</span>
          </div>
        </div>
        <div className="p-2 pl-4 flex gap-4">
           <span className="w-32 font-bold text-gray-600">Place of Supply</span>
           <span>: {doc.stateOfSupply || businessInfo.address?.state}</span>
        </div>
      </div>

      {/* Shipping/Billing */}
      <div className="grid grid-cols-2 border-x border-b border-gray-300 bg-gray-50/30">
        <div className="bg-gray-200 p-1 pl-4 font-bold text-gray-700 border-r border-gray-300">Bill To</div>
        <div className="bg-gray-200 p-1 pl-4 font-bold text-gray-700">Ship To</div>
      </div>
      <div className="grid grid-cols-2 border-x border-b border-gray-300 min-h-[140px]">
        <div className="p-3 pl-4 border-r border-gray-300">
          <p className="font-black text-sm uppercase">{client.name}</p>
          <p className="mt-1">{client.billingAddress?.line1}</p>
          <p>{client.billingAddress?.line2}</p>
          <p>{client.billingAddress?.city} - {client.billingAddress?.pincode} {client.billingAddress?.state}</p>
          <p className="mt-2 font-medium text-gray-600">Mobile: {client.phone}</p>
          <p className="font-medium text-gray-600">E-Mail ID: {client.email}</p>
        </div>
        <div className="p-3 pl-4">
          <p className="mt-1">{client.shippingAddress?.line1 || client.billingAddress?.line1}</p>
          <p>{client.shippingAddress?.city} {client.shippingAddress?.state}</p>
          <p className="mt-6 font-medium text-gray-600">Mobile: {client.phone}</p>
          <p className="font-medium text-gray-600">E-Mail ID: {client.email}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-t-0 border-gray-300">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-700 border-b border-gray-300">
              <th className="p-2 border-r border-gray-300 w-12 text-center">SNo</th>
              <th className="p-2 border-r border-gray-300 text-left">Item & Description</th>
              <th className="p-2 border-r border-gray-300 text-center w-24">HSN/SAC</th>
              <th className="p-2 border-r border-gray-300 text-center w-16">Qty</th>
              <th className="p-2 border-r border-gray-300 text-right w-24">Rate</th>
              <th className="p-2 text-right w-28">Amount(₹)</th>
            </tr>
          </thead>
          <tbody className="min-h-[400px]">
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 last:border-b-0">
                <td className="p-2 border-r border-gray-300 text-center align-top">{index + 1}</td>
                <td className="p-2 border-r border-gray-300 align-top">
                   <p className="font-bold uppercase leading-tight">{item.description}</p>
                   {item.notes && <p className="text-[10px] text-gray-500 mt-1 italic">{item.notes}</p>}
                </td>
                <td className="p-2 border-r border-gray-300 text-center align-top">{item.hsnCode || '-'}</td>
                <td className="p-2 border-r border-gray-300 text-center align-top">{item.quantity}</td>
                <td className="p-2 border-r border-gray-300 text-right align-top">{item.rate?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-2 text-right align-top font-bold">{item.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {/* Empty space padding */}
            {[...Array(Math.max(0, 5 - items.length))].map((_, i) => (
              <tr key={`empty-${i}`} className="h-10 border-b border-transparent">
                 <td className="p-2 border-r border-gray-300 text-center"></td>
                 <td className="p-2 border-r border-gray-300"></td>
                 <td className="p-2 border-r border-gray-300"></td>
                 <td className="p-2 border-r border-gray-300"></td>
                 <td className="p-2 border-r border-gray-300"></td>
                 <td className="p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Totals Section */}
      <div className="grid grid-cols-12 border-x border-b border-gray-300">
        <div className="col-span-7 p-4 border-r border-gray-300 space-y-4">
           <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Amount in Words:</p>
              <p className="font-black italic mt-1">{doc.amountInWords || 'Amount will be calculated upon completion.'}</p>
           </div>
           
           {doc.terms && (
             <div>
                <p className="font-bold text-sm border-b border-gray-100 pb-1 mb-2">Terms & Conditions:</p>
                <div className="text-[10px] whitespace-pre-line text-gray-700 leading-tight">
                   {doc.terms}
                </div>
             </div>
           )}

           <div className="pt-4 text-[10px] space-y-1">
              <p className="uppercase font-bold text-gray-600 italic">Thanks for your business</p>
              {businessInfo.gstin && <p>Company GSTIN No: <span className="font-bold">{businessInfo.gstin}</span></p>}
              {businessInfo.pan && <p>Company PAN: <span className="font-bold">{businessInfo.pan}</span></p>}
              
              {businessInfo.bankDetails && (
                <div className="mt-4 border-t border-gray-100 pt-2">
                   <p className="font-bold mb-1">Bank Transfer:</p>
                   <p>Name: {businessInfo.legalName || businessInfo.name}</p>
                   <p>Bank Name: {businessInfo.bankDetails.bankName}</p>
                   <p>Account No: {businessInfo.bankDetails.accountNumber}</p>
                   {businessInfo.bankDetails.ifscCode && <p>IFSC Code: {businessInfo.bankDetails.ifscCode}</p>}
                </div>
              )}
           </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between">
           <div className="space-y-0.5">
             <div className="flex justify-between p-2 border-b border-gray-100">
                <span className="font-bold text-gray-600">Item Total</span>
                <span className="font-bold">{totals.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
             </div>
             {(totals.cgst > 0 || totals.sgst > 0) && (
               <>
                 <div className="flex justify-between p-2 border-b border-gray-100">
                    <span className="font-bold text-gray-600">CGST</span>
                    <span>{totals.cgst?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                 </div>
                 <div className="flex justify-between p-2 border-b border-gray-100">
                    <span className="font-bold text-gray-600">SGST</span>
                    <span>{totals.sgst?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                 </div>
               </>
             )}
             {totals.igst > 0 && (
               <div className="flex justify-between p-2 border-b border-gray-100">
                  <span className="font-bold text-gray-600">IGST</span>
                  <span>{totals.igst?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
             )}
             <div className="flex justify-between p-3 bg-gray-50 border-b border-gray-300">
                <span className="font-black text-sm uppercase">Net Total</span>
                <span className="font-black text-sm">₹{totals.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
             </div>
           </div>

           <div className="p-8 text-center mt-auto">
              <div className="h-12 w-48 border-b-2 border-gray-200 mx-auto mb-4" />
              <p className="font-bold uppercase text-gray-500 tracking-widest text-[10px]">Authorized Signature</p>
           </div>
        </div>
      </div>
    </div>
  );
}
