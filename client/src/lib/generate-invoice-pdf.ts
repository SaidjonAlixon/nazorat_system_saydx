import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

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

export type InvoicePdfData = {
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
  new Date(d)
    .toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, ".");

/**
 * Generates and downloads an invoice PDF using jsPDF + AutoTable.
 * A4 (210×297mm), margin 15mm, true pagination, no clipping.
 */
export async function generateInvoicePdf(data: InvoicePdfData, filename: string): Promise<void> {
  const { invoice, items, projectName, settings, paymentDetailLines = [] } = data;
  const safeFilename = filename.replace(/[^a-zA-Z0-9\-_.]/g, "_");
  const fname = safeFilename.endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`;

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

  const lines =
    paymentDetailLines.length > 0
      ? paymentDetailLines
      : [
          { title: "Bank nomi", value: settings.bankName },
          { title: "Hisob raqami", value: settings.accountNumber },
        ];

  const statusLabel = invoice.status === "paid" ? "To'langan" : "Kutilmoqda";

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = MARGIN;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SAYD.X", MARGIN, y + 6);
  doc.text("Hisob-faktura", PAGE_W - MARGIN, y + 6, { align: "right" });
  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 10, PAGE_W - MARGIN, y + 10);
  y += 16;

  // Info blocks
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("HISOB-FAKTURA MA'LUMOTLARI", MARGIN, y);
  doc.text("HOLAT VA VALYUTA", PAGE_W / 2 + 4, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  y += 5;
  const leftBlock = [
    `Raqam: ${invoice.invoiceNumber}`,
    `ID: ${validationId}`,
    `Sana: ${dateStr(issueDate)}`,
    `To'lov muddati: ${dateStr(dueDate)}`,
    projectName ? `Loyiha: ${projectName}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const rightBlock = [
    `Holat: ${statusLabel}`,
    `To'lov shartlari: ${invoice.paymentTerms || "7 kun ichida"}`,
    `Valyuta: ${invoice.currency}`,
  ].join("\n");
  doc.text(leftBlock, MARGIN, y);
  doc.text(rightBlock, PAGE_W / 2 + 4, y);
  y += 22;

  // From / Bill To
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("FROM (Tomonidan)", MARGIN, y);
  doc.text("BILL TO (Kimga)", PAGE_W / 2 + 4, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  y += 5;
  doc.text(
    [settings.companyName, settings.address, settings.phone, `${settings.email} • ${settings.website}`].join("\n"),
    MARGIN,
    y
  );
  doc.text(
    [invoice.clientName || "—", invoice.company || "—", invoice.billToContact || "—"].join("\n"),
    PAGE_W / 2 + 4,
    y
  );
  y += 24;

  // Table — column widths 5% | 45% | 15% | 15% | 20% of 180mm
  const cw = [9, 81, 27, 27, 36];
  const head = [["T/r", "Xizmat nomi", "Soni", "Narx", "Summa"]];
  const body = items.map((item, i) => {
    const sum = Number(item.quantity) * Number(item.unitPrice);
    return [
      String(i + 1),
      item.title,
      String(item.quantity),
      formatNum(Number(item.unitPrice)),
      formatNum(sum),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
    columnStyles: {
      0: { cellWidth: cw[0], halign: "left" },
      1: { cellWidth: cw[1], halign: "left" },
      2: { cellWidth: cw[2], halign: "right" },
      3: { cellWidth: cw[3], halign: "right" },
      4: { cellWidth: cw[4], halign: "right", fontStyle: "bold" },
    },
    headStyles: {
      fillColor: [14, 165, 233],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    bodyStyles: {
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Ensure summary/payment/signature/footer fit — add new page if needed (~90mm)
  const pageH = doc.internal.pageSize.getHeight();
  if (y + 90 > pageH - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }

  // Summary box
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Subtotal:", MARGIN + 4, y + 7);
  doc.text(`${formatNum(subtotal)} ${invoice.currency}`, PAGE_W - MARGIN - 4, y + 7, { align: "right" });
  doc.text("Tax:", MARGIN + 4, y + 13);
  doc.text(`${formatNum(tax)} ${invoice.currency}`, PAGE_W - MARGIN - 4, y + 13, { align: "right" });
  doc.text("Discount:", MARGIN + 4, y + 19);
  doc.text(`${formatNum(discount)} ${invoice.currency}`, PAGE_W - MARGIN - 4, y + 19, { align: "right" });
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(0.5);
  doc.line(MARGIN + 4, y + 22, PAGE_W - MARGIN - 4, y + 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(14, 165, 233);
  doc.text("JAMI:", MARGIN + 4, y + 26);
  doc.text(`${formatNum(total)} ${invoice.currency}`, PAGE_W - MARGIN - 4, y + 26, { align: "right" });
  y += 34;

  // Payment section
  const paymentText = lines.map((l) => (l.title ? `${l.title}: ${l.value}` : l.value)).join("\n") + "\n" + settings.paymentNote;
  const paymentLines = doc.splitTextToSize(paymentText, CONTENT_W - 8);
  const paymentH = 10 + paymentLines.length * 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(MARGIN, y, CONTENT_W, paymentH, 2, 2, "FD");
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("To'lov ma'lumotlari", MARGIN + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(paymentLines, MARGIN + 4, y + 12);
  y += paymentH + 4;

  // Signature block
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.setDrawColor(14, 165, 233);
  doc.circle(MARGIN + 20, y + 12, 8);
  doc.circle(MARGIN + 20, y + 12, 6);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 165, 233);
  doc.text("SAYD.X", MARGIN + 20, y + 10, { align: "center" });
  doc.text("VERIFIED", MARGIN + 20, y + 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(settings.authorizedName, MARGIN + 50, y + 6);
  doc.text(settings.authorizedPosition, MARGIN + 50, y + 10);
  doc.text(dateStr(issueDate), MARGIN + 50, y + 14);
  y += 24;

  // Footer — only on last page
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${settings.website} • ${settings.email} • Generated by SAYD.X • Invoice ID: ${validationId}`,
    PAGE_W / 2,
    y,
    { align: "center" }
  );

  doc.save(fname);
}
