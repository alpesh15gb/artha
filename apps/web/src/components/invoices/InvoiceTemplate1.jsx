import { format } from 'date-fns';

export function InvoiceTemplate1({ invoice, business, party, items: rawItems = [], totals = {} }) {
  const { subtotal = 0, cgst = 0, sgst = 0, igst = 0, total = 0 } = totals;
  const items = Array.isArray(rawItems) ? rawItems : [];
  
  const taxSummary = items.reduce((acc, item) => {
    const rate = item.taxRate || 0;
    if (!acc[rate]) acc[rate] = { taxable: 0, tax: 0 };
    acc[rate].taxable += ((item.quantity || 0) * (item.rate || 0));
    acc[rate].tax += (((item.quantity || 0) * (item.rate || 0)) * rate / 100);
    return acc;
  }, {});

  if (!invoice) return <div className="p-10 text-red-500 font-bold">No Invoice Data Provided</div>;

  return (
    <div className="w-full bg-white p-4 h-auto font-serif text-[11px] leading-tight border border-black text-slate-900 selection:bg-gray-100">
      <div className="text-[8px] text-gray-300 absolute top-0 left-0">SYSTEM RENDER OK</div>
      {/* Header */}
      <div className="border border-black mb-0">
        <div className="flex justify-between border-b border-black px-2 py-1">
          <span className="font-bold">DEBIT MEMO</span>
          <div className="text-center">
             <div className="font-bold underline text-sm uppercase">TAX INVOICE</div>
             <div className="text-[9px]">(Tax Invoice under section 31 of Central Goods & Service Tax, 2017 read with Rule 46 of Central Goods & Service Tax rules)</div>
          </div>
          <span className="font-bold">ORIGINAL FOR RECIPIENT</span>
        </div>
        
        <div className="text-center py-2 border-b border-black">
          {business?.logo && (
            <div className="mb-2 flex justify-center">
              <img 
                src={`${typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL : ''}${business.logo}`} 
                alt="Logo" 
                className="h-16 w-auto object-contain" 
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}
          <h1 className="text-2xl font-black uppercase tracking-tight">{business?.name || 'BUSINESS NAME'}</h1>
          <p className="px-10">
            {typeof business?.address === 'object' && business?.address 
              ? `${business.address.street || ''} ${business.address.city || ''} ${business.address.state || ''} ${business.address.zip || ''}`.trim()
              : business?.address || '-'}
          </p>
          <p className="font-bold">GSTIN/UIN: {business?.gstin || '-'}</p>
        </div>

        <div className="grid grid-cols-2">
          <div className="border-r border-black">
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-1 px-2 border-r border-black">Reverse Charge: N/A</div>
              <div className="p-1 px-2">Transport: {invoice?.transportMode || 'Local Transport'}</div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-1 px-2 border-r border-black font-bold flex justify-between">Invoice No<span>:</span></div>
              <div className="p-1 px-2 font-bold">{invoice?.invoiceNumber}</div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-1 px-2 border-r border-black font-bold flex justify-between">Invoice Date<span>:</span></div>
              <div className="p-1 px-2 font-bold">{invoice?.date ? format(new Date(invoice.date), 'dd-MMM-yy') : ''}</div>
            </div>
            <div className="grid grid-cols-2">
              <div className="p-1 px-2 border-r border-black font-bold flex justify-between">State<span>:</span></div>
              <div className="p-1 px-2 font-bold">{business?.address?.state || business?.state || 'N/A'}, State Code: {business?.settings?.stateCode || business?.stateCode || '-'}</div>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-1 px-2 border-r border-black flex justify-between">Lr No<span>:</span></div>
              <div className="p-1 px-2 text-center">{invoice?.lrNo || '-'}</div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-1 px-2 border-r border-black flex justify-between">Lr Date<span>:</span></div>
              <div className="p-1 px-2 text-center">{invoice?.lrDate ? format(new Date(invoice.lrDate), 'dd-MMM-yy') : '-'}</div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="p-1 px-2 border-r border-black flex justify-between">Box<span>:</span></div>
              <div className="p-1 px-2 text-center">{invoice?.totalBoxes || '-'}</div>
            </div>
            <div className="grid grid-cols-2">
              <div className="p-1 px-2 border-r border-black flex justify-between">Vehicle No<span>:</span></div>
              <div className="p-1 px-2 text-center font-bold">{invoice?.vehicleNo || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Details of Receiver */}
      <div className="grid grid-cols-2 border-x border-b border-black">
        <div className="border-r border-black">
           <div className="bg-gray-50 border-b border-black text-center font-bold py-0.5">Details of Receiver (Billed To)</div>
           <div className="p-2 min-h-[80px]">
              <div className="font-bold uppercase">Name: {party?.name}</div>
              <div className="uppercase">
                {typeof party?.address === 'object' && party?.address 
                  ? `${party.address.street || ''} ${party.address.city || ''} ${party.address.state || ''} ${party.address.zip || ''}`.trim()
                  : [party?.address, party?.city, party?.state, party?.pincode].filter(Boolean).join(', ') || '-'}
              </div>
              <div className="mt-1">
                <div>Place of Supply: <span className="font-bold">{party?.state}</span></div>
                <div>GST No.: <span className="font-bold uppercase">{party?.gstin}</span></div>
                <div>PAN No.: <span className="font-bold uppercase">{party?.pan}</span></div>
              </div>
           </div>
        </div>
        <div>
           <div className="bg-gray-50 border-b border-black text-center font-bold py-0.5">Details of Consignee (Shipped To)</div>
           <div className="p-2 min-h-[80px]">
              <div className="font-bold uppercase">Name: {party?.name}</div>
              <div className="uppercase">{party?.shippingAddress || party?.address}</div>
              <div className="mt-1">
                <div>Place of Supply: <span className="font-bold">{party?.state}</span></div>
                <div>GST No.: <span className="font-bold uppercase">{party?.gstin}</span></div>
                <div>PAN No.: <span className="font-bold uppercase">{party?.pan}</span></div>
              </div>
           </div>
        </div>
      </div>

      {/* Item Table */}
      <table className="w-full border-x border-b border-black table-fixed">
        <thead>
          <tr className="bg-gray-50 text-[9px] font-bold">
            <th className="border-r border-black w-8 py-1">Sr.No.</th>
            <th className="border-r border-black w-1/3 py-1">Description of Goods</th>
            <th className="border-r border-black w-16 py-1">HSN/SAC</th>
            <th className="border-r border-black w-16 py-1">Qty</th>
            <th className="border-r border-black w-16 py-1">Rate</th>
            <th className="border-r border-black w-12 py-1">Per</th>
            <th className="w-20 py-1 text-right px-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-t border-black min-h-[20px]">
              <td className="border-r border-black text-center pt-1">{idx + 1}</td>
              <td className="border-r border-black px-1 pt-1 uppercase">
                <div className="font-bold">{item.item?.name || item.description || 'N/A'}</div>
                {item.item?.name && item.description && item.description !== item.item.name && (
                   <div className="text-[10px] font-normal lowercase text-gray-500 italic leading-none mt-0.5">{item.description}</div>
                )}
              </td>
              <td className="border-r border-black text-center pt-1">{item.hsnCode || '-'}</td>
              <td className="border-r border-black text-center pt-1 font-bold">{item?.quantity || 0} {item?.unit || 'PCS'}</td>
              <td className="border-r border-black text-right px-1 pt-1">{(item.rate || 0).toFixed(2)}</td>
              <td className="border-r border-black text-center pt-1">{item.unit || 'PCS'}</td>
              <td className="text-right px-1 pt-1 font-bold">{((item?.quantity || 0) * (item?.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Fill empty spaces */}
          {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, i) => (
            <tr key={'empty-' + i} className="border-t border-black h-8">
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className=""></td>
            </tr>
          ))}
          {/* Total Row */}
          <tr className="border-y border-black bg-gray-50 font-bold">
            <td className="border-r border-black"></td>
            <td className="border-r border-black text-center">Total</td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black text-center">{items.reduce((s, i) => s + i.quantity, 0)} {items[0]?.unit || 'PCS'}</td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="text-right px-1">{(subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="grid grid-cols-2 border-x border-b border-black">
        <div className="p-1 border-r border-black border-t">
          <div className="mb-2"><span className="font-bold">Remarks: </span>{invoice?.notes || '-'}</div>
          <div><span className="font-bold">Amount in Words: </span><span className="capitalize">{invoice?.amountInWords || ''} Only</span></div>
          <div className="mt-2 border-t border-black pt-1">
            <div>Company GSTIN No : <span className="font-bold uppercase">{business?.gstin}</span></div>
            <div>Company PAN No : <span className="font-bold uppercase">{business?.pan}</span></div>
          </div>
          <div className="mt-2 border-t border-black pt-1">
            <div className="font-bold underline">Bank Details :</div>
            <div className="grid grid-cols-2 text-[10px]">
              <div>Bank: <span className="font-bold uppercase">{invoice?.bankAccount?.bankName || business?.bankName || '-'}</span></div>
              <div>Branch: <span className="font-bold uppercase">{invoice?.bankAccount?.branchName || business?.branchName || 'MAIN BRANCH'}</span></div>
              <div>Acc No : <span className="font-bold uppercase">{invoice?.bankAccount?.accountNumber || business?.accountNumber || '-'}</span></div>
              <div>IFSC Code : <span className="font-bold uppercase">{invoice?.bankAccount?.ifscCode || business?.ifscCode || '-'}</span></div>
            </div>
          </div>
        </div>
        <div className="border-t border-black flex flex-col justify-between">
          <div className="divide-y divide-black border-b border-black">
            <div className="flex justify-between px-1 py-0.5"><span>GST Total</span><span>{((cgst || 0) + (sgst || 0) + (igst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between px-1 py-0.5 font-bold bg-gray-100 italic"><span>Net Payable</span><span className="text-lg text-[#001a33]">₹ {(total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          </div>
          <div className="p-2 flex gap-4 items-center">
            <div className="text-[10px] w-full">
              <div className="font-mono text-[7px] break-all">IRN: {invoice?.irn || '-'}</div>
              <div className="flex justify-between mt-1">
                <div>Ack No.: {invoice?.ackNo || '-'}</div>
                <div>Ack Date: {invoice?.ackDate ? format(new Date(invoice.ackDate), 'dd-MMM-yy') : '-'}</div>
              </div>
            </div>
            {invoice?.qrCode ? (
               <div className="h-20 w-20 flex items-center justify-center p-1 border border-black">
                 <img src={invoice.qrCode} alt="QR" className="h-full w-full object-contain" />
               </div>
            ) : business?.upiId ? (
               <div className="h-16 w-16 bg-gray-100 flex items-center justify-center text-slate-400 text-[8px] text-center font-bold p-1 leading-[1] border border-dashed border-gray-300 uppercase">
                 QR Code<br/>Placeholder
               </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* GST Summary Table */}
      <table className="w-full border-x border-b border-black text-center mt-4">
        <thead>
          <tr className="bg-gray-50 border-b border-black font-bold">
             <th className="border-r border-black py-0.5">Taxable Value</th>
             <th className="border-r border-black" colSpan={2}>Central Tax</th>
             <th className="border-r border-black" colSpan={2}>State Tax</th>
             <th>Total Tax Amount</th>
          </tr>
          <tr className="bg-gray-50 border-b border-black text-[9px]">
             <th className="border-r border-black font-normal py-0.5">₹ {(totals?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</th>
             <th className="border-r border-black font-normal">Rate</th>
             <th className="border-r border-black font-normal">Amount</th>
             <th className="border-r border-black font-normal">Rate</th>
             <th className="border-r border-black font-normal">Amount</th>
             <th className="font-normal font-bold">₹ {((cgst || 0) + (sgst || 0) + (igst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="font-bold">
            <td className="border-r border-black py-0.5 px-2 text-right">Total: {(totals?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black px-2 text-right">{(totals?.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black px-2 text-right">{(totals?.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td className="px-2 text-right">{((cgst || 0) + (sgst || 0) + (igst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
      
      <div className="mt-1 border-x border-b border-black p-1 font-bold">
        Tax Amount (in words): {invoice?.taxAmountInWords || ''} Only
      </div>

      {/* Footer Signature */}
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div className="border border-black p-1 min-h-[60px]">
          <div className="font-bold underline mb-1">Terms & Condition :</div>
          <p className="text-[9px] leading-tight">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
        </div>
        <div className="border border-black text-center flex flex-col justify-between min-h-[60px]">
          <div className="font-bold pt-1">For, {business?.name}</div>
          {business?.signatureImage && (
             <img 
               src={`${import.meta.env.VITE_API_URL || ''}${business.signatureImage}`} 
               className="h-10 mx-auto mix-blend-multiply" 
               alt="sign" 
             />
          )}
          <div className="bg-gray-50 border-t border-black py-1 font-bold">Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}
