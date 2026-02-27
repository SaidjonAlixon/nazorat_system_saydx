import "../styles/invoice-pdf.css";

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
  new Intl.NumberFormat("uz-UZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

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
  const tax = 0;
  const discount = 0;
  const total = Number(invoice.amount) || subtotal;

  const lines = paymentDetailLines.length > 0
    ? paymentDetailLines
    : [
        { title: "Bank nomi", value: settings.bankName },
        { title: "Hisob raqami", value: settings.accountNumber },
      ];

  const statusLabel = invoice.status === "paid" ? "To'langan" : "Kutilmoqda";

  return (
    <div className="invoice-pdf-a4 invoice-pdf-content">
      <div className="invoice-pdf-a4__inner">
        {/* Header */}
        <header className="invoice-pdf-a4__header">
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src="/LOGO2.png" alt="SAYD.X" className="invoice-pdf-a4__logo" />
          </div>
          <h1 className="invoice-pdf-a4__title">Hisob-faktura</h1>
        </header>

        {/* Invoice Details + Status */}
        <div className="invoice-pdf-a4__grid2">
          <div className="invoice-pdf-a4__block">
            <div className="invoice-pdf-a4__block-title">Hisob-faktura ma'lumotlari</div>
            <div className="invoice-pdf-a4__row">Raqam: {invoice.invoiceNumber}</div>
            <div className="invoice-pdf-a4__row">ID: {validationId}</div>
            <div className="invoice-pdf-a4__row">Sana: {dateStr(issueDate)}</div>
            <div className="invoice-pdf-a4__row">To'lov muddati: {dateStr(dueDate)}</div>
            {projectName && <div className="invoice-pdf-a4__row">Loyiha: {projectName}</div>}
          </div>
          <div className="invoice-pdf-a4__block">
            <div className="invoice-pdf-a4__block-title">Holat va valyuta</div>
            <div className="invoice-pdf-a4__row">Holat: {statusLabel}</div>
            <div className="invoice-pdf-a4__row">To'lov shartlari: {invoice.paymentTerms || "7 kun ichida"}</div>
            <div className="invoice-pdf-a4__row">Valyuta: {invoice.currency}</div>
          </div>
        </div>

        {/* From / Bill To */}
        <div className="invoice-pdf-a4__grid2">
          <div className="invoice-pdf-a4__block">
            <div className="invoice-pdf-a4__block-title">FROM (Tomonidan)</div>
            <div className="invoice-pdf-a4__row">{settings.companyName}</div>
            <div className="invoice-pdf-a4__row">{settings.address}</div>
            <div className="invoice-pdf-a4__row">{settings.phone}</div>
            <div className="invoice-pdf-a4__row">{settings.email} • {settings.website}</div>
          </div>
          <div className="invoice-pdf-a4__block">
            <div className="invoice-pdf-a4__block-title">BILL TO (Kimga)</div>
            <div className="invoice-pdf-a4__row">{invoice.clientName || "—"}</div>
            <div className="invoice-pdf-a4__row">{invoice.company || "—"}</div>
            <div className="invoice-pdf-a4__row">{invoice.billToContact || "—"}</div>
          </div>
        </div>

        {/* Services Table */}
        <div className="invoice-pdf-a4__table-wrap">
          <table className="invoice-pdf-a4__table">
            <thead>
              <tr>
                <th className="col-num">T/r</th>
                <th className="col-name">Xizmat nomi</th>
                <th className="col-qty text-right">Soni</th>
                <th className="col-price text-right">Narx</th>
                <th className="col-total text-right">Summa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const sum = Number(item.quantity) * Number(item.unitPrice);
                return (
                  <tr key={i}>
                    <td className="col-num">{i + 1}</td>
                    <td className="col-name">{item.title}</td>
                    <td className="col-qty text-right">{item.quantity}</td>
                    <td className="col-price text-right">{formatNum(Number(item.unitPrice))}</td>
                    <td className="col-total text-right" style={{ fontWeight: 600 }}>{formatNum(sum)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="invoice-pdf-a4__totals" style={{ width: "100%", maxWidth: "100%" }}>
          <div className="invoice-pdf-a4__total-row">
            <span>Subtotal:</span>
            <span>{formatNum(subtotal)} {invoice.currency}</span>
          </div>
          <div className="invoice-pdf-a4__total-row">
            <span>Tax:</span>
            <span>{formatNum(tax)} {invoice.currency}</span>
          </div>
          <div className="invoice-pdf-a4__total-row">
            <span>Discount:</span>
            <span>{formatNum(discount)} {invoice.currency}</span>
          </div>
          <div className="invoice-pdf-a4__grand-total">
            <span>JAMI:</span>
            <span>{formatNum(total)} {invoice.currency}</span>
          </div>
        </div>

        {/* Payment Information */}
        <div className="invoice-pdf-a4__payment">
          <div className="invoice-pdf-a4__block-title" style={{ marginBottom: "6pt" }}>To'lov ma'lumotlari</div>
          {lines.map((line, i) => (
            <div key={i} className="invoice-pdf-a4__row">
              {line.title ? `${line.title}: ${line.value}` : line.value}
            </div>
          ))}
          <div className="invoice-pdf-a4__row" style={{ marginTop: "6pt", color: "#64748b" }}>{settings.paymentNote}</div>
        </div>

        {/* Footer / Signature */}
        <div className="invoice-pdf-a4__footer">
          <div className="invoice-pdf-a4__signature-block">
            <div className="invoice-pdf-a4__stamp-outer">
              <div className="invoice-pdf-a4__stamp">
                <span>SAYD.X</span>
                <span>VERIFIED</span>
              </div>
            </div>
            <div className="invoice-pdf-a4__signature">
              <img src="/imzo.PNG" alt="Imzo" />
              <div>{settings.authorizedName}</div>
              <div>{settings.authorizedPosition}</div>
              <div>{dateStr(issueDate)}</div>
            </div>
          </div>
        </div>

        <div className="invoice-pdf-a4__meta">
          {settings.website} • {settings.email} • Generated by SAYD.X • Invoice ID: {validationId}
        </div>
      </div>
    </div>
  );
}
