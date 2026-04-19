import { format } from 'date-fns';

export function InvoiceTemplate2({ invoice, business, party, items, totals = {} }) {
  const { subtotal = 0, cgst = 0, sgst = 0, igst = 0, total = 0 } = totals;
  return (
    <div className="w-full bg-white p-6 min-h-[1160px] font-sans text-xs border border-gray-400 text-slate-900">
      <div className="flex justify-between items-start mb-4">
        {business?.logo ? (
          <img 
            src={`${import.meta.env.VITE_API_URL || ''}${business.logo}`} 
            className="h-20 object-contain" 
            alt="Logo" 
          />
        ) : (
          <div className="w-20 h-20 bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 border border-dashed border-gray-300">LOGO</div>
        )}
        <div className="text-center flex-1 pr-20">
          <div className="text-[9px] uppercase tracking-widest font-bold mb-1">TAX INVOICE</div>
          <h1 className="text-3xl font-black uppercase mb-1">{business?.name}</h1>
          <div className="max-w-md mx-auto leading-normal">
            {typeof business?.address === 'object' && business?.address 
              ? `${business.address.street || ''} ${business.address.city || ''} ${business.address.state || ''} ${business.address.zip || ''}`.trim()
              : business?.address || '-'}
          </div>
          <p className="mt-1">E-Mail: {business?.email || 'N/A'}</p>
          <p className="font-bold">GSTIN/UIN: {business?.gstin}</p>
        </div>
        <div className="text-[8px] font-bold text-gray-500 uppercase mt-2">ORIGINAL FOR RECIPIENT</div>
      </div>

      {/* Header Grid */}
      <div className="grid grid-cols-6 border border-black mb-4">
        <div className="col-span-1 border-r border-b border-black p-1">
          <p className="text-[9px] text-gray-400">Invoice No.</p>
          <p className="font-bold">{invoice?.invoiceNumber}</p>
        </div>
        <div className="col-span-1 border-r border-b border-black p-1">
          <p className="text-[9px] text-gray-400">Dated</p>
          <p className="font-bold">{invoice?.date ? format(new Date(invoice.date), 'd-MMM-yyyy') : ''}</p>
        </div>
        <div className="col-span-1 border-r border-b border-black p-1">
          <p className="text-[9px] text-gray-400">E-Way Bill No.</p>
          <p className="font-bold">{invoice?.eWayBillNo || '-'}</p>
        </div>
        <div className="col-span-1 border-r border-b border-black p-1">
          <p className="text-[9px] text-gray-400">Billty No.</p>
          <p className="font-bold">{invoice?.billtyNo || '-'}</p>
        </div>
        <div className="col-span-1 border-r border-b border-black p-1">
          <p className="text-[9px] text-gray-400">Dated</p>
          <p className="font-bold">{invoice?.lrDate ? format(new Date(invoice.lrDate), 'd-MMM-yyyy') : '-'}</p>
        </div>
        <div className="col-span-1 border-b border-black p-1">
          <p className="text-[9px] text-gray-400">TransporterName</p>
          <p className="font-bold">{invoice?.transporter || 'N/A'}</p>
        </div>

        <div className="col-span-1 border-r border-black p-1">
          <p className="text-[9px] text-gray-400">Delivery Note</p>
          <p className="font-bold">{invoice?.deliveryNote || '-'}</p>
        </div>
        <div className="col-span-1 border-r border-black p-1">
          <p className="text-[9px] text-gray-400">Dated</p>
          <p className="font-bold">{invoice?.deliveryDate ? format(new Date(invoice.deliveryDate), 'd-MMM-yyyy') : '-'}</p>
        </div>
        <div className="col-span-1 border-r border-black p-1">
          <p className="text-[9px] text-gray-400">Reference No.</p>
          <p className="font-bold">{invoice?.referenceNo || 'CASH'}</p>
        </div>
        <div className="col-span-1 border-r border-black p-1">
          <p className="text-[9px] text-gray-400">Vehical No.</p>
          <p className="font-bold">{invoice?.vehicleNo || '-'}</p>
        </div>
        <div className="col-span-1 border-r border-black p-1">
          <p className="text-[9px] text-gray-400">Destination</p>
          <p className="font-bold">{invoice?.destination || '-'}</p>
        </div>
        <div className="col-span-1 p-1">
          <p className="text-[9px] text-gray-400">Terms & Conditions</p>
          <p className="font-bold uppercase">{invoice?.paymentTerms || 'PAYMENT ONLY BY'}</p>
        </div>
      </div>

      {/* Bill/Ship Area */}
      <div className="grid grid-cols-2 border-x border-t border-black min-h-[120px]">
        <div className="p-2 border-r border-black">
          <p className="text-[10px] text-gray-400 mb-1">Bill to,</p>
          <p className="font-bold text-sm uppercase">{party?.name}</p>
          <div className="uppercase leading-tight text-[10px]">
             {typeof party?.address === 'object' && party?.address 
               ? `${party.address.street || ''} ${party.address.city || ''} ${party.address.state || ''} ${party.address.zip || ''}`.trim()
               : [party?.address, party?.city, party?.state, party?.pincode].filter(Boolean).join(', ') || '-'}
          </div>
          <p className="mt-2 font-bold uppercase">GSTIN/UIN : {party?.gstin}</p>
          <p className="font-bold uppercase">State Name : {party?.state}, Code : {party?.stateCode || '-'}</p>
        </div>
        <div className="p-2">
          <p className="text-[10px] text-gray-400 mb-1">Ship to,</p>
          <p className="font-bold text-sm uppercase">{party?.name}</p>
          <p className="uppercase leading-tight text-[10px]">{party?.shippingAddress || party?.address}</p>
          <p className="mt-2 font-bold uppercase">GSTIN/UIN : {party?.gstin}</p>
          <p className="font-bold uppercase">State Name : {party?.state}, Code : {party?.stateCode || '-'}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border border-black text-center table-fixed">
        <thead className="bg-gray-50 text-[10px] border-b border-black font-bold">
          <tr>
            <th className="border-r border-black w-10 py-1">SI No.</th>
            <th className="border-r border-black w-2/5 py-1">Description of Goods</th>
            <th className="border-r border-black w-16 py-1">HSN/SAC</th>
            <th className="border-r border-black w-16 py-1">Quantity</th>
            <th className="border-r border-black w-16 py-1">Rate</th>
            <th className="border-r border-black w-10 py-1">per</th>
            <th className="border-r border-black w-12 py-1">Disc. %</th>
            <th className="w-24 py-1">Amount</th>
          </tr>
        </thead>
        <tbody className="min-h-[400px]">
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-black">
              <td className="border-r border-black py-2 align-top">{idx + 1}</td>
              <td className="border-r border-black text-left px-2 py-2">
                <p className="font-bold uppercase">{item.item?.name || item.description}</p>
                {item.item?.name && item.description && item.description !== item.item.name && (
                  <p className="text-[10px] normal-case text-gray-400 italic mt-1 leading-tight">{item.description}</p>
                )}
                {item.batch && <p className="text-[9px] text-gray-500 mt-1">Batch: {item.batch}</p>}
                {item.expDate && <p className="text-[9px] text-gray-500">Expiry: {item.expDate}</p>}
              </td>
              <td className="border-r border-black py-2 align-top">{item.hsnCode || '-'}</td>
              <td className="border-r border-black py-2 align-top font-bold text-center">
                {item.quantity} {item.unit || 'pcs'}
                <div className="text-[8px] font-normal text-gray-400 mt-1">{item.quantity} {item.unit || 'pcs'}</div>
              </td>
              <td className="border-r border-black py-2 align-top">{(item.rate || 0).toFixed(2)}</td>
              <td className="border-r border-black py-2 align-top">{item.unit || 'pcs'}</td>
              <td className="border-r border-black py-2 align-top">{item.discount > 0 ? `${item.discount}%` : ''}</td>
              <td className="py-2 align-top font-bold text-right px-2">
                 {((item.quantity || 0) * (item.rate || 0)).toFixed(2)}
              </td>
            </tr>
          ))}
          {/* Tax rows in items list style (Tally style) */}
          <tr className="border-b border-black">
             <td className="border-r border-black"></td>
             <td className="border-r border-black text-right px-2 py-1 font-bold">SGST</td>
             <td className="border-r border-black"></td>
             <td className="border-r border-black"></td>
             <td className="border-r border-black"></td>
             <td className="border-r border-black"></td>
             <td className="border-r border-black"></td>
             <td className="px-2 py-1 text-right font-bold">{(totals?.sgst || 0).toFixed(2)}</td>
          </tr>
          <tr className="border-b border-black">
             <td className="border-r border-black"></td>
             <td className="border-r border-black text-right px-2 py-1 font-bold">CGST</td>
             <td className="border-r border-black"></td>
             <td className="border-r border-black"></td>
             <td className="border-r border-black"></td>
             <td className="border-r border-black"></td>
             <td className="border-r border-black"></td>
             <td className="px-2 py-1 text-right font-bold">{(totals?.cgst || 0).toFixed(2)}</td>
          </tr>
          {/* Fill empty */}
          {Array.from({ length: 8 - (items?.length || 0) }).map((_, i) => (
             <tr key={'empty-' + i} className="h-10 border-b border-black">
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
             </tr>
          ))}
          {/* Final Total Row */}
          <tr className="bg-gray-50 font-bold border-t border-black">
            <td className="border-r border-black">Total</td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black">{items.reduce((s, i) => s + i.quantity, 0)} {items[0]?.unit || 'pcs'}</td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="text-right px-2 text-sm italic py-1">₹ {(totals?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      {/* Amount in Words */}
      <div className="border border-black border-t-0 p-2 text-[10px]">
        <p className="text-gray-400 lowercase mb-1 underline">Amount Chargeable (in words)</p>
        <p className="font-bold uppercase text-[11px]">INR {invoice?.amountInWords || 'Zero'} Only</p>
      </div>

      {/* GST Summary Table */}
      <table className="w-full border border-black border-t-0 text-center text-[10px]">
        <thead className="font-bold">
          <tr className="border-b border-black">
            <th className="border-r border-black row-span-2 py-1">Taxable Value</th>
            <th className="border-r border-black" colSpan={2}>Central Tax</th>
            <th className="border-r border-black" colSpan={2}>State Tax</th>
            <th>Total Tax Amount</th>
          </tr>
          <tr className="border-b border-black">
             <th className="border-r border-black py-0.5">{(totals?.subtotal || 0).toFixed(2)}</th>
             <th className="border-r border-black">Rate</th>
             <th className="border-r border-black">Amount</th>
             <th className="border-r border-black">Rate</th>
             <th className="border-r border-black">Amount</th>
             <th className="font-bold">{((totals?.cgst || 0) + (totals?.sgst || 0)).toFixed(2)}</th>
          </tr>
        </thead>
        <tbody className="font-bold">
          <tr>
            <td className="border-r border-black py-1">Total: {(totals?.subtotal || 0).toFixed(2)}</td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black">{(totals?.cgst || 0).toFixed(2)}</td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black">{(totals?.sgst || 0).toFixed(2)}</td>
            <td className="">{((totals?.cgst || 0) + (totals?.sgst || 0)).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="p-2 border border-black border-t-0 font-bold mb-4">
        Tax Amount (in words) : INR {invoice?.taxAmountInWords || ''} Only
      </div>

      {/* Bank & Signatory */}
      <div className="grid grid-cols-2 mt-auto pt-10">
        <div>
          <div className="text-[10px]">
            <p className="font-bold uppercase">Company's PAN : <span className="underline ml-4">{business?.pan}</span></p>
            <div className="mt-4 p-2 border border-black max-w-sm">
              <p className="font-bold underline mb-1">Terms & Conditions:</p>
              <p className="text-[9px] leading-tight">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-end">
          <div className="p-4 border border-black bg-gray-50/10">
             <div className="text-right mb-12">
                <p className="text-[9px] text-gray-500 uppercase italic">Company's Bank Details</p>
                <div className="grid grid-cols-2 gap-x-4 text-[10px] mt-2 text-left">
                  <div className="text-right text-gray-400">Bank Name :</div><div className="font-bold uppercase">{business?.bankName}</div>
                  <div className="text-right text-gray-400">A/c No. :</div><div className="font-bold uppercase">{business?.accountNumber}</div>
                  <div className="text-right text-gray-400">Branch & IFS Code:</div><div className="font-bold uppercase">{business?.branchName} & {business?.ifscCode}</div>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-bold uppercase">for {business?.name}</p>
                <div className="h-16 flex items-end justify-end">
                   {business?.signatureImage && (
                      <img 
                        src={`${import.meta.env.VITE_API_URL || ''}${business.signatureImage}`} 
                        className="h-10 mix-blend-multiply" 
                        alt="sign" 
                      />
                    )}
                   <p className="underline text-[10px] uppercase font-bold ml-2">Authorised Signatory</p>
                </div>
             </div>
          </div>
        </div>
      </div>
      <div className="text-center mt-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 border-t border-gray-100 pt-2">
        SUBJECT TO {(business?.address?.state || business?.state || 'LOCAL')?.toUpperCase()} JURISDICTION <br/>
        <span className="text-[7px]">This is a Computer Generated Invoice</span>
      </div>
    </div>
  );
}
