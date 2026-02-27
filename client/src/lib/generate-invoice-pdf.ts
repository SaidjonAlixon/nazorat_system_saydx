import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Modern SaaS colors
const TEXT: [number, number, number] = [17, 17, 17]; // #111
const TEXT_MUTED: [number, number, number] = [85, 85, 85]; // #555
const TEXT_LIGHT: [number, number, number] = [136, 136, 136]; // #888
const ACCENT: [number, number, number] = [37, 99, 235]; // #2563eb
const BORDER: [number, number, number] = [229, 231, 235];
const BG_SUBTLE: [number, number, number] = [249, 250, 251];

const S8 = 3;
const S16 = 6;
const S24 = 9;

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

async function loadImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Modern SaaS-style invoice PDF — A4, 15mm margins, multi-page.
 */
export async function generateInvoicePdf(data: InvoicePdfData, filename: string): Promise<void> {
  const { invoice, items, projectName, settings, paymentDetailLines = [] } = data;
  const fname = filename.replace(/[^a-zA-Z0-9\-_.]/g, "_");
  const safeName = fname.endsWith(".pdf") ? fname : `${fname}.pdf`;

  const issueDate = new Date(invoice.createdAt);
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

  // Header: logo left, title right, thin divider
  try {
    const logoB64 = await loadImageAsBase64("/LOGO2.png");
    doc.addImage(logoB64, "PNG", MARGIN, y, 36, 9);
  } catch {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text("SAYD.X", MARGIN, y + 6);
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text("HISOB-FAKTURA", PAGE_W - MARGIN, y + 6, { align: "right" });
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 14, PAGE_W - MARGIN, y + 14);
  y += 18;

  // Info grid (2 columns)
  const colW = (CONTENT_W - S16) / 2;
  const pad = 4;

  doc.setFillColor(BG_SUBTLE[0], BG_SUBTLE[1], BG_SUBTLE[2]);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.1);
  doc.roundedRect(MARGIN, y, colW, 28, 2, 2, "FD");
  doc.roundedRect(MARGIN + colW + S16, y, colW, 28, 2, 2, "FD");

  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.text("HISOB-FAKTURA MA'LUMOTLARI", MARGIN + pad, y + 6);
  doc.text("HOLAT VA VALYUTA", MARGIN + colW + S16 + pad, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const leftInfo = [
    `Raqam: ${invoice.invoiceNumber}`,
    `ID: ${validationId}`,
    `Sana: ${dateStr(issueDate)}`,
    `To'lov muddati: ${dateStr(invoice.dueDate)}`,
    projectName ? `Loyiha: ${projectName}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const rightInfo = [
    `Holat: ${statusLabel}`,
    `To'lov shartlari: ${invoice.paymentTerms || "7 kun ichida"}`,
    `Valyuta: ${invoice.currency}`,
  ].join("\n");
  doc.text(leftInfo, MARGIN + pad, y + 14);
  doc.text(rightInfo, MARGIN + colW + S16 + pad, y + 14);
  y += 32;

  // Client grid
  doc.roundedRect(MARGIN, y, colW, 30, 2, 2, "FD");
  doc.roundedRect(MARGIN + colW + S16, y, colW, 30, 2, 2, "FD");
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.text("FROM (Tomonidan)", MARGIN + pad, y + 6);
  doc.text("BILL TO (Kimga)", MARGIN + colW + S16 + pad, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(
    [settings.companyName, settings.address, settings.phone, `${settings.email} • ${settings.website}`].join("\n"),
    MARGIN + pad,
    y + 14
  );
  doc.text(
    [invoice.clientName || "—", invoice.company || "—", invoice.billToContact || "—"].join("\n"),
    MARGIN + colW + S16 + pad,
    y + 14
  );
  y += 34;

  // Table: Service | Qty | Price | Total
  const cw = [10, 72, 28, 28, 42];
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
    tableLineColor: BORDER as unknown as [number, number, number],
    tableLineWidth: 0.15,
    columnStyles: {
      0: { cellWidth: cw[0], halign: "left", cellPadding: 4 },
      1: { cellWidth: cw[1], halign: "left", cellPadding: 4 },
      2: { cellWidth: cw[2], halign: "right", cellPadding: 4 },
      3: { cellWidth: cw[3], halign: "right", cellPadding: 4 },
      4: { cellWidth: cw[4], halign: "right", fontStyle: "bold", cellPadding: 4 },
    },
    headStyles: {
      fillColor: ACCENT as unknown as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 4,
      textColor: TEXT as unknown as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: BG_SUBTLE as unknown as [number, number, number],
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + S24;

  const pageH = doc.internal.pageSize.getHeight();
  if (y + 95 > pageH - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }

  // Summary — right-aligned
  const sumW = 60;
  const sumX = PAGE_W - MARGIN - sumW;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Subtotal", sumX, y + 5);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(`${formatNum(subtotal)} ${invoice.currency}`, PAGE_W - MARGIN, y + 5, { align: "right" });
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Tax", sumX, y + 10);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(`${formatNum(tax)} ${invoice.currency}`, PAGE_W - MARGIN, y + 10, { align: "right" });
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Discount", sumX, y + 15);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(`${formatNum(discount)} ${invoice.currency}`, PAGE_W - MARGIN, y + 15, { align: "right" });
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(sumX, y + 19, PAGE_W - MARGIN, y + 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text("JAMI", sumX, y + 26);
  doc.text(`${formatNum(total)} ${invoice.currency}`, PAGE_W - MARGIN, y + 26, { align: "right" });
  y += 32;

  // Payment info
  const paymentText =
    lines.map((l) => (l.title ? `${l.title}: ${l.value}` : l.value)).join("\n") + "\n" + settings.paymentNote;
  const paymentLines = doc.splitTextToSize(paymentText, CONTENT_W - 12);
  const paymentH = 8 + paymentLines.length * 4;
  doc.setFillColor(BG_SUBTLE[0], BG_SUBTLE[1], BG_SUBTLE[2]);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, paymentH, 2, 2, "FD");
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.text("To'lov ma'lumotlari", MARGIN + pad, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(paymentLines, MARGIN + pad, y + 10);
  y += paymentH + S16;

  // Signature area
  const sigX = MARGIN + 55;
  let sigY = y;
  try {
    const imzoB64 = await loadImageAsBase64("/imzo.PNG");
    doc.addImage(imzoB64, "PNG", sigX, sigY, 14, 8);
    sigY += 11;
  } catch {}
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(settings.authorizedName, sigX, sigY);
  doc.text(settings.authorizedPosition, sigX, sigY + 4);
  doc.text(dateStr(issueDate), sigX, sigY + 8);
  const stampR = 7;
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(0.2);
  doc.circle(MARGIN + stampR + 5, y + stampR + 4, stampR);
  doc.circle(MARGIN + stampR + 5, y + stampR + 4, stampR - 1.5);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text("SAYD.X", MARGIN + stampR + 5, y + stampR + 2, { align: "center" });
  doc.text("VERIFIED", MARGIN + stampR + 5, y + stampR + 6, { align: "center" });
  y += 24;

  // Footer — centered, subtle
  y += 10;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.text(
    `${settings.website} • ${settings.email} • Generated by SAYD.X • Invoice ID: ${validationId}`,
    PAGE_W / 2,
    y,
    { align: "center" }
  );

  doc.save(safeName);
}
