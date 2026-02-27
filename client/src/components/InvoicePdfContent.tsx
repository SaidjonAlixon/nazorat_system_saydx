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

const styles = {
  page: {
    width: "794px",
    minHeight: "1055px",
    boxSizing: "border-box" as const,
    padding: "32px 40px 36px",
    backgroundColor: "#ffffff",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: "11px",
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "28px",
    paddingBottom: "20px",
    borderBottom: "2px solid #0ea5e9",
  },
  logo: { height: "48px", width: "auto" },
  brand: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#0ea5e9",
    letterSpacing: "0.5px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#0f172a",
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "20px", minWidth: 0 } as React.CSSProperties,
  block: {
    padding: "14px 16px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    minWidth: 0,
    overflowWrap: "break-word",
    wordBreak: "break-word",
  } as React.CSSProperties,
  blockTitle: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.8px",
    marginBottom: "8px",
    paddingBottom: "6px",
    borderBottom: "1px solid #e2e8f0",
  },
  row: {
    marginBottom: "4px",
    color: "#334155",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    minWidth: 0,
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginBottom: "16px",
    borderRadius: "8px",
    overflow: "hidden" as const,
    border: "1px solid #e2e8f0",
    tableLayout: "fixed" as const,
  },
  th: {
    padding: "12px 14px",
    textAlign: "left" as const,
    backgroundColor: "#0ea5e9",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "10px",
    textTransform: "uppercase" as const,
  },
  td: {
    padding: "10px 14px",
    borderBottom: "1px solid #f1f5f9",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  } as React.CSSProperties,
  tdRight: { textAlign: "right" as const },
  totals: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "stretch",
    gap: "6px",
    padding: "14px 20px",
    backgroundColor: "#f0f9ff",
    borderRadius: "8px",
    border: "1px solid #bae6fd",
    marginBottom: "20px",
    width: "100%",
    maxWidth: "380px",
    marginLeft: "auto",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    gap: "24px",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  } as React.CSSProperties,
  totalLabel: { color: "#475569", fontWeight: 500 },
  totalValue: { fontWeight: 600, color: "#0f172a" },
  grandTotal: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0ea5e9",
    marginTop: "4px",
    paddingTop: "8px",
    borderTop: "2px solid #bae6fd",
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  } as React.CSSProperties,
  paymentBlock: {
    padding: "14px 16px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    marginBottom: "24px",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  } as React.CSSProperties,
  footer: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #e2e8f0",
  },
  stamp: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "2px solid #0ea5e9",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    fontSize: "8px",
    fontWeight: 700,
    color: "#0ea5e9",
  },
  signature: { textAlign: "right" as const, fontSize: "10px", color: "#475569" },
  meta: {
    textAlign: "center" as const,
    fontSize: "9px",
    color: "#94a3b8",
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9",
  },
};

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
    <div className="invoice-pdf-content" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/LOGO2.png" alt="SAYD.X" style={styles.logo} />
          <span style={styles.brand}>SAYD.X</span>
        </div>
        <h1 style={styles.title}>Hisob-faktura</h1>
      </div>

      {/* Invoice & Status */}
      <div style={styles.grid2}>
        <div style={styles.block}>
          <div style={styles.blockTitle}>Hisob-faktura ma'lumotlari</div>
          <div style={styles.row}>Raqam: {invoice.invoiceNumber}</div>
          <div style={styles.row}>ID: {validationId}</div>
          <div style={styles.row}>Sana: {dateStr(issueDate)}</div>
          <div style={styles.row}>To'lov muddati: {dateStr(dueDate)}</div>
          {projectName && <div style={styles.row}>Loyiha: {projectName}</div>}
        </div>
        <div style={styles.block}>
          <div style={styles.blockTitle}>Holat va valyuta</div>
          <div style={styles.row}>Holat: {statusLabel}</div>
          <div style={styles.row}>To'lov shartlari: {invoice.paymentTerms || "7 kun ichida"}</div>
          <div style={styles.row}>Valyuta: {invoice.currency}</div>
        </div>
      </div>

      {/* From / Bill To */}
      <div style={styles.grid2}>
        <div style={styles.block}>
          <div style={styles.blockTitle}>FROM (Tomonidan)</div>
          <div style={styles.row}>{settings.companyName}</div>
          <div style={styles.row}>{settings.address}</div>
          <div style={styles.row}>{settings.phone}</div>
          <div style={styles.row}>{settings.email} • {settings.website}</div>
        </div>
        <div style={styles.block}>
          <div style={styles.blockTitle}>BILL TO (Kimga)</div>
          <div style={styles.row}>{invoice.clientName || "—"}</div>
          <div style={styles.row}>{invoice.company || "—"}</div>
          <div style={styles.row}>{invoice.billToContact || "—"}</div>
        </div>
      </div>

      {/* Items Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: "48px" }}>T/r</th>
            <th style={{ ...styles.th, width: "auto" }}>Xizmat nomi</th>
            <th style={{ ...styles.th, ...styles.tdRight, width: "64px" }}>Soni</th>
            <th style={{ ...styles.th, ...styles.tdRight, width: "100px" }}>Narx</th>
            <th style={{ ...styles.th, ...styles.tdRight, width: "130px" }}>Summa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const sum = Number(item.quantity) * Number(item.unitPrice);
            return (
              <tr key={i}>
                <td style={{ ...styles.td, color: "#64748b" }}>{i + 1}</td>
                <td style={styles.td}>{item.title}</td>
                <td style={{ ...styles.td, ...styles.tdRight }}>{item.quantity}</td>
                <td style={{ ...styles.td, ...styles.tdRight }}>{formatNum(Number(item.unitPrice))}</td>
                <td style={{ ...styles.td, ...styles.tdRight, fontWeight: 600 }}>{formatNum(sum)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={styles.totals}>
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Subtotal:</span>
          <span style={{ ...styles.totalValue, flexShrink: 0 }}>{formatNum(subtotal)} {invoice.currency}</span>
        </div>
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Tax:</span>
          <span style={{ ...styles.totalValue, flexShrink: 0 }}>{formatNum(tax)} {invoice.currency}</span>
        </div>
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Discount:</span>
          <span style={{ ...styles.totalValue, flexShrink: 0 }}>{formatNum(discount)} {invoice.currency}</span>
        </div>
        <div style={styles.grandTotal}>
          <span>JAMI:</span>
          <span style={{ flexShrink: 0 }}>{formatNum(total)} {invoice.currency}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div style={styles.paymentBlock}>
        <div style={{ ...styles.blockTitle, marginBottom: "10px" }}>To'lov ma'lumotlari</div>
        {lines.map((line, i) => (
          <div key={i} style={styles.row}>
            {line.title ? `${line.title}: ${line.value}` : line.value}
          </div>
        ))}
        <div style={{ ...styles.row, marginTop: "8px", color: "#64748b" }}>{settings.paymentNote}</div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div />
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px" }}>
          <div style={styles.stamp}>
            <span>SAYD.X</span>
            <span>VERIFIED</span>
          </div>
          <div style={styles.signature}>
            <img src="/imzo.PNG" alt="Imzo" style={{ height: "40px", marginBottom: "4px" }} />
            <div>{settings.authorizedName}</div>
            <div>{settings.authorizedPosition}</div>
            <div>{dateStr(issueDate)}</div>
          </div>
        </div>
      </div>

      <div style={styles.meta}>
        {settings.website} • {settings.email} • Generated by SAYD.X • Invoice ID: {validationId}
      </div>
    </div>
  );
}
