export type PaymentDetailLine = { title: string; value: string };
export type InvoiceSettingsType = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountNumber: string;
  paymentDetailLines?: PaymentDetailLine[];
  paymentNote: string;
  authorizedName: string;
  authorizedPosition: string;
};

type InvoicePdfContentProps = {
  invoice: {
    id: number;
    invoiceNumber: string;
    amount: string;
    currency: string;
    status?: string | null;
    dueDate: string | Date;
    createdAt: string | Date;
    clientName?: string | null;
    company?: string | null;
    billToContact?: string | null;
    paymentTerms?: string | null;
  };
  items: { title: string; quantity: number; unitPrice: string }[];
  projectName?: string;
  settings: InvoiceSettingsType;
  paymentDetailLines?: PaymentDetailLine[];
};

const formatNum = (n: number) =>
  new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(n);

const dateStr = (d: Date | string) =>
  new Date(d).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, ".");

export function InvoicePdfContent({
  invoice,
  items,
  projectName,
  settings,
  paymentDetailLines = [],
}: InvoicePdfContentProps) {
  const issueDate = new Date(invoice.createdAt);
  const dueDate = new Date(invoice.dueDate);
  const validationId = `INV-${invoice.id.toString().padStart(6, "0")}`;

  let subtotal = 0;
  items.forEach((item) => {
    subtotal += Number(item.quantity) * Number(item.unitPrice);
  });

  const lines = paymentDetailLines.length > 0
    ? paymentDetailLines
    : [
        { title: "Bank nomi", value: settings.bankName },
        { title: "Hisob raqami", value: settings.accountNumber },
      ];

  const statusLabel = invoice.status === "paid" ? "To'langan" : "Kutilmoqda";

  return (
    <div
      className="invoice-pdf-content bg-white text-black p-6"
      style={{
        fontFamily: "Helvetica, Arial, sans-serif",
        width: "794px",
        minHeight: "1123px",
        boxSizing: "border-box",
      }}
    >
      <div className="flex justify-center pt-2 pb-2">
        <img src="/LOGO2.png" alt="Logo" className="h-16 w-auto object-contain" />
      </div>
      <div className="text-center border-b border-gray-200 pb-3 mb-4">
        <h2 className="text-xl font-bold tracking-wide">HISOB-FAKTURA</h2>
      </div>

      <div className="grid grid-cols-2 gap-6 text-xs mb-4">
        <div className="space-y-1">
          <div className="font-semibold text-gray-700">Hisob-faktura ma&apos;lumotlari</div>
          <p>Raqam: {invoice.invoiceNumber}</p>
          <p>ID: {validationId}</p>
          <p>Sana: {dateStr(issueDate)}</p>
          <p>To&apos;lov muddati: {dateStr(dueDate)}</p>
          {projectName && <p>Loyiha: {projectName}</p>}
        </div>
        <div className="space-y-1">
          <div className="font-semibold text-gray-700">Holat va valyuta</div>
          <p>Holat: {statusLabel}</p>
          <p>To&apos;lov shartlari: {invoice.paymentTerms || "7 kun ichida"}</p>
          <p>Valyuta: {invoice.currency}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 text-xs pt-2 border-t border-gray-200 mb-4">
        <div className="space-y-1">
          <div className="font-semibold text-gray-700">FROM (Tomonidan)</div>
          <p>{settings.companyName}</p>
          <p>{settings.address}</p>
          <p>{settings.phone}</p>
          <p>{settings.email} • {settings.website}</p>
        </div>
        <div className="space-y-1">
          <div className="font-semibold text-gray-700">BILL TO (Kimga)</div>
          <p>{invoice.clientName || "Mijoz ismi"}</p>
          <p>{invoice.company || "Kompaniya"}</p>
          <p>{invoice.billToContact || "Manzil, tel, email"}</p>
        </div>
      </div>

      <div className="text-xs border border-gray-200 rounded overflow-hidden mb-4">
        <div className="grid grid-cols-12 bg-[#F2F2F2] font-semibold py-2 px-2 border-b border-gray-300">
          <div className="col-span-1">T/r</div>
          <div className="col-span-5">Xizmat nomi</div>
          <div className="col-span-2 text-right">Soni</div>
          <div className="col-span-2 text-right">Narx</div>
          <div className="col-span-2 text-right">Summa</div>
        </div>
        {items.map((item, i) => {
          const sum = Number(item.quantity) * Number(item.unitPrice);
          return (
            <div
              key={i}
              className="grid grid-cols-12 py-2 px-2 border-b border-gray-100"
            >
              <div className="col-span-1">{i + 1}</div>
              <div className="col-span-5 truncate">{item.title}</div>
              <div className="col-span-2 text-right">{item.quantity}</div>
              <div className="col-span-2 text-right">{formatNum(Number(item.unitPrice))}</div>
              <div className="col-span-2 text-right">{formatNum(sum)}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-end text-xs space-y-1 pt-2 border-t-2 border-gray-300 mb-4">
        <div className="flex gap-8"><span>Subtotal:</span><span>{formatNum(subtotal)} {invoice.currency}</span></div>
        <div className="flex gap-8"><span>Tax:</span><span>0.00 {invoice.currency}</span></div>
        <div className="flex gap-8"><span>Discount:</span><span>0.00 {invoice.currency}</span></div>
        <div className="font-bold text-base mt-1">JAMI: {formatNum(Number(invoice.amount))} {invoice.currency}</div>
      </div>

      <div className="text-xs pt-2 border-t border-gray-200 mb-4">
        <div className="font-semibold mb-1">Payment Details</div>
        {lines.map((line, i) => (
          <p key={i}>
            {line.title ? `${line.title}: ${line.value}` : line.value}
          </p>
        ))}
        <p className="text-gray-600">{settings.paymentNote}</p>
      </div>

      <div className="flex justify-end items-end gap-4 pt-4">
        <div className="w-16 h-16 rounded-full border-2 border-blue-500 flex flex-col items-center justify-center text-blue-600 text-[8px] font-bold shrink-0">
          <span>SAYD.X</span>
          <span>VERIFIED</span>
        </div>
        <div className="text-right text-xs">
          <img src="/imzo.PNG" alt="Imzo" className="h-12 w-auto object-contain mb-1 mt-2 ml-6" />
          <div>{settings.authorizedName}</div>
          <div>{settings.authorizedPosition}</div>
          <div>{dateStr(issueDate)}</div>
        </div>
      </div>

      <div className="text-center text-[9px] text-gray-500 pt-4 border-t border-gray-100 mt-4">
        {settings.website} • {settings.email} • Generated by SAYD.X • Invoice ID: {validationId}
      </div>
    </div>
  );
}
