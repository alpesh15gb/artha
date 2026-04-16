import { format } from 'date-fns';

export function InvoiceTemplate3({ invoice, business, party, items, totals }) {
  const outstandingBalance = party?.balance || { previous: 0, current: totals.total, total: totals.total };

  return (
    <div className="w-full bg-white p-2 min-h-[1160px] font-sans text-xs border-2 border-black m-2">
      <div className="flex justify-between items-center px-4 py-2 border-b-2 border-black">
        <div className="flex items-center gap-4">
          {business?.logo ? (
            <img 
              src={`${import.meta.env.VITE_API_URL || ''}${business.logo}`} 
              className="h-16 w-16 object-contain" 
              alt="Logo" 
            />
          ) : (
             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs uppercase">Logo</div>
          )}
          <div>
            <h1 className="text-3xl font-black uppercase text-gray-900 leading-none mb-1">{business?.name}</h1>
            <div className="text-[10px] uppercase font-bold text-gray-700">
               {typeof business?.address === 'object' && business?.address 
                 ? `${business.address.street || ''} ${business.address.city || ''} ${business.address.state || ''} ${business.address.zip || ''}`.trim()
                 : business?.address || '-'}
            </div>
            <p className="text-[10px] font-bold">State Name : {business?.state} Code : {business?.stateCode || '-'}</p>
            <p className="text-[10px] font-bold">Contact : {business?.phone} E-Mail : {business?.email}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-gray-100 px-3 py-1 font-bold text-[10px] uppercase inline-block mb-1 border border-black">TAX INVOICE</div>
          <div className="text-[9px] uppercase font-black text-gray-400">ORIGINAL FOR RECIPIENT</div>
          <div className="mt-2 text-[11px] font-black uppercase">GSTIN/UIN: {business?.gstin}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b-2 border-black">
        <div className="p-2 border-r-2 border-black min-h-[120px]">
          <h2 className="bg-gray-100 font-black px-2 py-1 mb-2 border-b border-black text-[11px] uppercase">Details for Buyer (Billed & Shipped To)</h2>
          <div className="px-2 font-bold space-y-0.5">
            <p className="text-sm uppercase font-black">{party?.name}</p>
            <div className="uppercase opacity-80">
               {typeof party?.address === 'object' && party?.address 
                 ? `${party.address.street || ''} ${party.address.city || ''} ${party.address.state || ''} ${party.address.zip || ''}`.trim()
                 : party?.address || '-'}
            </div>
            <p className="uppercase">GSTIN No : <span className="font-black underline">{party?.gstin}</span></p>
            <p className="uppercase">PAN No : <span className="font-black underline">{party?.pan}</span></p>
            <p className="uppercase">Contact Details : {party?.phone}</p>
          </div>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-2 gap-y-2 font-bold px-2">
            <div>Invoice No.</div><div>: <span className="uppercase font-black">{invoice?.invoiceNumber}</span></div>
            <div>Dated</div><div>: <span className="uppercase font-black">{invoice?.date ? format(new Date(invoice.date), 'd-MMM-yyyy') : ''}</span></div>
            <div>Terms of Delivery</div><div>: <span className="uppercase font-black">{invoice?.deliveryTerms || 'TERMS & CONDITION'}</span></div>
            <div>Mode of Payment</div><div>: <span className="uppercase font-black">{invoice?.paymentMode || 'Credit'}</span></div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-b-2 border-black text-center table-fixed">
        <thead className="bg-gray-100 border-b-2 border-black text-[11px] font-black">
          <tr>
            <th className="border-r-2 border-black w-8 py-2">Sr No</th>
            <th className="border-r-2 border-black w-2/3 py-2">Item Description</th>
            <th className="border-r-2 border-black w-20 py-2">HSN Code</th>
            <th className="border-r-2 border-black w-14 py-2">Billed Qty</th>
            <th className="border-r-2 border-black w-10 py-2">Per</th>
            <th className="border-r-2 border-black w-20 py-2 text-right px-1">Rate</th>
            <th className="w-24 py-2 text-right px-1">Gross Amount</th>
          </tr>
        </thead>
        <tbody className="selection:bg-indigo-50">
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-black last:border-b-0 min-h-[25px]">
              <td className="border-r-2 border-black pt-1">{idx + 1}</td>
              <td className="border-r-2 border-black text-left px-4 pt-1">
                 <p className="font-black text-[11px]">{item.description || item.item?.name}</p>
                 {item.hsnCode && <p className="text-[10px] opacity-70 italic">{item.hsnCode}</p>}
              </td>
              <td className="border-r-2 border-black pt-1">{item.hsnCode || '-'}</td>
              <td className="border-r-2 border-black pt-1 font-black underline">{item.quantity} pcs</td>
              <td className="border-r-2 border-black pt-1">{item.unit || 'pcs'}</td>
              <td className="border-r-2 border-black pt-1 text-right px-1">{(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="pt-1 text-right px-1 font-black">{((item.quantity || 0) * (item.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Empty Space */}
          {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, i) => (
            <tr key={'empty-' + i} className="h-10 border-b border-black last:border-b-0">
               <td className="border-r-2 border-black"></td>
               <td className="border-r-2 border-black"></td>
               <td className="border-r-2 border-black"></td>
               <td className="border-r-2 border-black"></td>
               <td className="border-r-2 border-black"></td>
               <td className="border-r-2 border-black"></td>
               <td></td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-black border-t-2 border-black">
             <td className="border-r-2 border-black py-2" colSpan={3}>TOTAL</td>
             <td className="border-r-2 border-black py-2 underline">{items.reduce((s, i) => s + i.quantity, 0)} pcs</td>
             <td className="border-r-2 border-black"></td>
             <td className="border-r-2 border-black"></td>
             <td className="text-right px-1 py-2 font-black italic">{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax Summary Table */}
      <div className="grid grid-cols-5 divide-x-2 divide-black border-b-2 border-black bg-white">
        <div className="col-span-3">
           <table className="w-full text-center text-[10px] font-bold">
              <thead>
                 <tr className="bg-gray-100 border-b border-black uppercase text-[8px]">
                    <th className="border-r border-black py-1">HSN/SAC</th>
                    <th className="border-r border-black py-1">Taxable Value</th>
                    <th className="border-r border-black py-1" colSpan={2}>Central Tax</th>
                    <th colSpan={2} className="py-1">State Tax</th>
                 </tr>
                 <tr className="bg-gray-100 border-b border-black text-[7px] opacity-60">
                    <th className="border-r border-black"></th>
                    <th className="border-r border-black"></th>
                    <th className="border-r border-black">Rate</th><th>Amount</th>
                    <th className="border-l border-r border-black">Rate</th><th>Amount</th>
                 </tr>
              </thead>
              <tbody>
                 <tr className="border-b border-black">
                    <td className="border-r border-black py-1 underline font-black">{items[0]?.hsnCode || '32521452'}</td>
                    <td className="border-r border-black underline font-black">{(totals?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-black">2.50%</td><td className="border-r border-black">{(totals?.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-black">2.50%</td><td>{(totals?.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                 </tr>
                 <tr className="font-black bg-gray-50 uppercase">
                    <td className="border-r border-black text-right pr-2 py-1" colSpan={2}>Total</td>
                    <td className="border-r border-black"></td><td className="border-r border-black">{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-black"></td><td>{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                 </tr>
              </tbody>
           </table>
        </div>
        <div className="col-span-2 flex flex-col justify-between font-black uppercase p-2">
           <div className="flex justify-between items-center text-sm">
              <span className="opacity-60">Total Amount Before Tax</span>
              <span className="underline">{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
           </div>
           <div className="flex justify-between items-center text-[11px]">
              <span className="opacity-60 pl-8">CGST</span>
              <span>{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
           </div>
           <div className="flex justify-between items-center text-[11px]">
              <span className="opacity-60 pl-8">SGST</span>
              <span>{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
           </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="grid grid-cols-12 divide-x-2 divide-black border-b-2 border-black">
        <div className="col-span-8 p-2 font-black uppercase text-[10px]">
           <span className="opacity-40 block mb-1 underline">Amount In Words :</span>
           INR {invoice?.amountInWords || 'ZERO'} ONLY
        </div>
        <div className="col-span-4 p-2 bg-black text-white flex justify-between items-center px-4">
           <span className="uppercase text-[9px] font-black opacity-60">Invoice Total</span>
           <span className="text-xl font-black">₹ {totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Outstanding Section */}
      <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black">
        <div className="p-2 space-y-1 font-black uppercase text-[10px]">
           <h4 className="underline mb-2 opacity-40">Party's Outstanding Balance :</h4>
           <div className="flex justify-between"><span>Previous Balance</span><span>: ₹ {outstandingBalance.previous.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr</span></div>
           <div className="flex justify-between"><span>Bill Amount</span><span>: ₹ {totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr</span></div>
           <div className="flex justify-between bg-black text-white px-2 py-0.5 mt-1 border border-black italic"><span>Total Balance Amount</span><span>: ₹ {outstandingBalance.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr</span></div>
        </div>
        <div className="p-2 space-y-1 font-black uppercase text-[10px]">
           <h4 className="underline mb-2 opacity-40">Bank Details for Neft/RTGS :</h4>
           <div className="flex justify-between"><span className="opacity-60">Bank Name</span><span>: {business?.bankName}</span></div>
           <div className="flex justify-between"><span className="opacity-60">A/c No.</span><span>: {business?.accountNumber}</span></div>
           <div className="flex justify-between"><span className="opacity-60">Branch & IFS code</span><span>: {business?.ifscCode}</span></div>
        </div>
      </div>

      {/* Remarks & Signatory */}
      <div className="grid grid-cols-12 divide-x-2 divide-black">
        <div className="col-span-8 p-2 space-y-2">
           <div className="font-bold uppercase text-[10px]">
              <span className="opacity-40 underline block mb-1">Remarks :</span>
              {invoice?.notes || '-'}
           </div>
           <div className="font-bold text-[9px]">
              <span className="opacity-40 underline block mb-1">Declaration :</span>
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
           </div>
        </div>
         <div className="col-span-4 p-2 flex flex-col justify-between items-center min-h-[100px]">
            <p className="font-black uppercase text-[10px]">For <span className="underline">{business?.name}</span></p>
            {business?.signatureImage && (
              <img 
                src={`${import.meta.env.VITE_API_URL || ''}${business.signatureImage}`} 
                className="h-12 w-auto mix-blend-multiply mb-2" 
                alt="signature" 
              />
            )}
            <div className="mt-auto pt-2 border-t border-black w-full text-center">
               <p className="font-black uppercase text-[11px] tracking-tighter">Authorised Signatory</p>
            </div>
         </div>
      </div>
    </div>
  );
}
