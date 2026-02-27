import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Premium corporate colors — Stripe/Notion/Linear style
const PRIMARY: [number, number, number] = [31, 111, 235]; // #1f6feb
const TEXT: [number, number, number] = [17, 24, 39];
const TEXT_MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];
const BG_SUBTLE: [number, number, number] = [249, 250, 251];

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

async function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const pxPerMm = 96 / 25.4;
      resolve({
        w: img.naturalWidth / pxPerMm,
        h: img.naturalHeight / pxPerMm,
      });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Premium minimal corporate invoice PDF.
 * A4 (210×297mm), Stripe/Notion/Linear style.
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
  const SP = 6;
  const LP = 9;
  const RAD = 1.5;

  let y = MARGIN;

  // Header — compact, thin divider
  try {
    const logoBase64 = await loadImageAsBase64("/LOGO2.png");
    const dims = await getImageDimensions(logoBase64);
    const logoH = 9;
    const logoW = Math.min((dims.w / dims.h) * logoH, 36);
    doc.addImage(logoBase64, "PNG", MARGIN, y, logoW, logoH);
  } catch {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text("SAYD.X", MARGIN, y + 5);
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text("HISOB-FAKTURA", PAGE_W - MARGIN, y + 6, { align: "right" });
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 12, PAGE_W - MARGIN, y + 12);
  y += 16;

  // Info cards — flat, subtle border
  const blockGap = 4;
  const blockW = (CONTENT_W - blockGap) / 2;
  const pad = 4;
  doc.setFillColor(BG_SUBTLE[0], BG_SUBTLE[1], BG_SUBTLE[2]);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.15);
  const blockH1 = 22;
  doc.roundedRect(MARGIN, y, blockW, blockH1, RAD, RAD, "FD");
  doc.roundedRect(MARGIN + blockW + blockGap, y, blockW, blockH1, RAD, RAD, "FD");
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("HISOB-FAKTURA MA'LUMOTLARI", MARGIN + pad, y + 5);
  doc.text("HOLAT VA VALYUTA", MARGIN + blockW + blockGap + pad, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
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
  doc.text(leftBlock, MARGIN + pad, y + 12);
  doc.text(rightBlock, MARGIN + blockW + blockGap + pad, y + 12);
  y += blockH1 + SP;

  // From / Bill To
  const blockH2 = 24;
  doc.roundedRect(MARGIN, y, blockW, blockH2, RAD, RAD, "FD");
  doc.roundedRect(MARGIN + blockW + blockGap, y, blockW, blockH2, RAD, RAD, "FD");
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("FROM (Tomonidan)", MARGIN + pad, y + 5);
  doc.text("BILL TO (Kimga)", MARGIN + blockW + blockGap + pad, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(
    [settings.companyName, settings.address, settings.phone, `${settings.email} • ${settings.website}`].join("\n"),
    MARGIN + pad,
    y + 12
  );
  doc.text(
    [invoice.clientName || "—", invoice.company || "—", invoice.billToContact || "—"].join("\n"),
    MARGIN + blockW + blockGap + pad,
    y + 12
  );
  y += blockH2 + LP;

  // Table — softer blue, more whitespace
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
      fillColor: PRIMARY as unknown as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
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

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + LP;

  const pageH = doc.internal.pageSize.getHeight();
  if (y + 90 > pageH - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }

  // Summary — right-aligned, thin divider above total
  const sumW = 55;
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
  doc.line(sumX, y + 18, PAGE_W - MARGIN, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text("JAMI", sumX, y + 24);
  doc.text(`${formatNum(total)} ${invoice.currency}`, PAGE_W - MARGIN, y + 24, { align: "right" });
  y += 30;

  // Payment — flat card
  const paymentText = lines.map((l) => (l.title ? `${l.title}: ${l.value}` : l.value)).join("\n") + "\n" + settings.paymentNote;
  const paymentLines = doc.splitTextToSize(paymentText, CONTENT_W - 12);
  const paymentH = 8 + paymentLines.length * 4;
  doc.setFillColor(BG_SUBTLE[0], BG_SUBTLE[1], BG_SUBTLE[2]);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, paymentH, RAD, RAD, "FD");
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("To'lov ma'lumotlari", MARGIN + pad, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(paymentLines, MARGIN + pad, y + 10);
  y += paymentH + SP;

  // Signature block — compact stamp
  const sigX = MARGIN + 55;
  const sigStartY = y;
  let sigCurrentY = y;
  try {
    const imzoBase64 = await loadImageAsBase64("/imzo.PNG");
    doc.addImage(imzoBase64, "PNG", sigX, sigCurrentY, 16, 9);
    sigCurrentY += 12;
  } catch {}
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(settings.authorizedName, sigX, sigCurrentY);
  doc.text(settings.authorizedPosition, sigX, sigCurrentY + 4);
  doc.text(dateStr(issueDate), sigX, sigCurrentY + 8);
  const stampR = 8;
  const stampCy = sigStartY + stampR + 2;
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.25);
  doc.circle(MARGIN + stampR + 4, stampCy, stampR);
  doc.circle(MARGIN + stampR + 4, stampCy, stampR - 1.5);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text("SAYD.X", MARGIN + stampR + 4, stampCy - 2, { align: "center" });
  doc.text("VERIFIED", MARGIN + stampR + 4, stampCy + 2, { align: "center" });
  y += Math.max(22, sigCurrentY + 12 - sigStartY);

  // Footer — subtle, centered
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(
    `${settings.website} • ${settings.email} • Generated by SAYD.X • Invoice ID: ${validationId}`,
    PAGE_W / 2,
    y,
    { align: "center" }
  );

  doc.save(fname);
}
