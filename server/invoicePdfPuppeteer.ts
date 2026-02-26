import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { InvoiceForPdf } from "./invoicePdf";
import type { InvoiceItemForPdf } from "./invoicePdf";
import type { ProjectForPdf } from "./invoicePdf";
import type { InvoiceSettingsForPdf } from "./invoicePdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "invoices");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNum(s: string): string {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Number(s));
}

/** USD: $ 500, UZS: 500 000 UZS (kasrsiz) */
function formatAmount(amount: string, currency: string): string {
  const n = formatNum(amount);
  if (currency === "USD") return `$ ${n}`;
  return `${n} ${currency}`;
}

function dateStr(d: Date): string {
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
}

/** Bir oy qo'shish, keyin oyning oxirgi kuni */
function addMonth(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}
function lastDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function firstDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Server/API xizmat uchun har oyning davri va summasini hisobla */
function monthlyBreakdown(
  startDate: Date,
  months: number,
  unitPrice: string,
  currency: string
): { period: string; amount: string }[] {
  const out: { period: string; amount: string }[] = [];
  for (let i = 0; i < months; i++) {
    const start = i === 0 ? startDate : firstDayOfMonth(addMonth(startDate, i));
    const end = lastDayOfMonth(start);
    const period = `${dateStr(start)} – ${dateStr(end)}`;
    const amount = formatAmount(unitPrice, currency);
    out.push({ period, amount });
  }
  return out;
}

type Settings = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  paymentNote: string;
  authorizedName: string;
  authorizedPosition: string;
  paymentDetailLines: { title: string; value: string }[];
};

function getSettings(s: InvoiceSettingsForPdf): Settings {
  const def: Settings = {
    companyName: "SAYD.X LLC",
    address: "Toshkent, O'zbekiston",
    phone: "+998 90 000 00 00",
    email: "info@saydx.uz",
    website: "saydx.uz",
    paymentNote: "To'lov shartnoma asosida amalga oshiriladi.",
    authorizedName: "Authorized Name",
    authorizedPosition: "Position",
    paymentDetailLines: [
      { title: "Bank nomi", value: "Your Bank Name" },
      { title: "Hisob raqami", value: "1234 5678 9012 3456" },
    ],
  };
  if (!s) return def;
  let paymentDetailLines = def.paymentDetailLines;
  if (s.paymentDetailLines && String(s.paymentDetailLines).trim()) {
    try {
      const arr = JSON.parse(String(s.paymentDetailLines)) as unknown;
      if (Array.isArray(arr) && arr.length > 0) {
        paymentDetailLines = arr
          .filter(
            (x: unknown): x is { title: string; value: string } =>
              x != null && typeof x === "object" && "title" in x && "value" in x
          )
          .map((x) => ({ title: String(x.title), value: String(x.value) }));
      }
    } catch {
      /* ignore */
    }
  }
  return {
    companyName: s.companyName ?? def.companyName,
    address: s.address ?? def.address,
    phone: s.phone ?? def.phone,
    email: s.email ?? def.email,
    website: s.website ?? def.website,
    paymentNote: s.paymentNote ?? def.paymentNote,
    authorizedName: s.authorizedName ?? def.authorizedName,
    authorizedPosition: s.authorizedPosition ?? def.authorizedPosition,
    paymentDetailLines,
  };
}

/** Build HTML for invoice — matches preview layout exactly. */
export function buildInvoiceHtml(
  invoice: InvoiceForPdf,
  items: InvoiceItemForPdf[],
  project: ProjectForPdf,
  settings: InvoiceSettingsForPdf,
  baseUrl: string
): string {
  const s = getSettings(settings);
  const issueDate = new Date(invoice.createdAt);
  const dueDate = new Date(invoice.dueDate);
  const validationId = `INV-${invoice.id.toString().padStart(6, "0")}`;
  const logoUrl = `${baseUrl.replace(/\/$/, "")}/LOGO2.png`;
  const imzoUrl = `${baseUrl.replace(/\/$/, "")}/imzo.PNG`;

  const currency = invoice.currency || "UZS";
  const rows = items
    .map(
      (item, i) =>
        `<tr><td>${i + 1}</td><td>${esc(item.title)}</td><td class="text-right">${item.quantity}</td><td class="text-right">${formatAmount(item.unitPrice, currency)}</td><td class="text-right">${formatAmount(String(Number(item.quantity) * Number(item.unitPrice)), currency)}</td></tr>`
    )
    .join("");

  const scheduleBlocks = items
    .filter((item) => item.startDate && (item.serviceType === "server" || item.serviceType === "api"))
    .map((item) => {
      const start = new Date(item.startDate!);
      const months = Number(item.quantity) || 1;
      const breakdown = monthlyBreakdown(start, months, item.unitPrice, currency);
      const rows2 = breakdown
        .map(
          (row, idx) =>
            `<tr><td>${idx + 1}</td><td>${esc(row.period)}</td><td class="text-right">${row.amount}</td></tr>`
        )
        .join("");
      return `
    <div class="mb-4" style="font-size: 12px;">
      <div class="section-title">To'lov jadvali: ${esc(item.title)} (qaysi kunga to'lov — qanchaligi)</div>
      <table>
        <thead><tr><th>T/r</th><th>Davr (kun.oy.yil – kun.oy.yil)</th><th class="text-right">Summa</th></tr></thead>
        <tbody>${rows2}</tbody>
      </table>
    </div>`;
    })
    .join("");

  const paymentLinesHtml = s.paymentDetailLines
    .map((l) => `<p>${l.title ? esc(l.title) + ": " + esc(l.value) : esc(l.value)}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: #1f2937; background: #fff; }
    .invoice-preview { box-sizing: border-box; width: 100%; padding: 24px; }
    .text-right { text-align: right; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .mb-4 { margin-bottom: 16px; }
    .pt-2 { padding-top: 8px; }
    .section-title { font-weight: 700; font-size: 11px; color: #1e40af; letter-spacing: 0.02em; margin-bottom: 6px; text-transform: uppercase; }
    .border-b { border-bottom: 2px solid #1e40af; }
    .border-t { border-top: 1px solid #e5e7eb; }
    .border-t-2 { border-top: 2px solid #1e40af; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th, td { padding: 10px 8px; border: 1px solid #e5e7eb; }
    th { background: #1e40af; color: #fff; font-weight: 700; font-size: 11px; }
    .totals { text-align: right; margin-top: 8px; page-break-inside: avoid; }
    .totals-row { margin-bottom: 4px; }
    .jami { font-weight: 800; font-size: 18px; margin-top: 6px; color: #1e40af; }
    .stamp-row { display: flex; justify-content: center; align-items: center; gap: 32px; margin-top: 24px; margin-bottom: 16px; page-break-inside: avoid; flex-wrap: wrap; }
    .stamp-wrap { display: flex; flex-direction: column; align-items: center; }
    .stamp { width: 130px; height: 130px; border: 3px solid #1e40af; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-weight: 800; color: #1e40af; font-size: 10px; line-height: 1.2; box-shadow: 0 1px 3px rgba(30,64,175,0.2); }
    .stamp .brand { font-size: 15px; letter-spacing: 0.05em; }
    .stamp .verified { font-size: 10px; letter-spacing: 0.08em; margin-top: 4px; }
    .signature-block { text-align: center; font-size: 12px; }
    .footer-text { text-align: center; font-size: 9px; color: #2563eb; margin-top: 16px; padding-top: 16px; border-top: 1px solid #bfdbfe; }
    @media print { .invoice-preview { padding: 0; } }
  </style>
</head>
<body>
  <div class="invoice-preview">
    <div class="mb-4" style="text-align: center;">
      <img src="${esc(logoUrl)}" alt="Logo" style="height: 88px; width: auto; object-fit: contain;">
    </div>
    <div class="border-b pb-3 mb-4" style="text-align: center;">
      <h2 style="font-size: 22px; font-weight: 800; letter-spacing: 0.08em; margin: 0; color: #1e40af;">HISOB-FAKTURA</h2>
    </div>
    <div class="grid-2 text-xs mb-4" style="font-size: 12px;">
      <div>
        <div class="section-title">Hisob-faktura ma'lumotlari</div>
        <p style="margin: 2px 0;">Raqam: ${esc(invoice.invoiceNumber)}</p>
        <p style="margin: 2px 0;">ID: ${validationId}</p>
        <p style="margin: 2px 0;">Sana: ${dateStr(issueDate)}</p>
        <p style="margin: 2px 0;">To'lov muddati: ${dateStr(dueDate)}</p>
        <p style="margin: 2px 0;">Loyiha: ${project?.name ? esc(project.name) : ""}</p>
      </div>
      <div>
        <div class="section-title">Holat va valyuta</div>
        <p style="margin: 2px 0;">Holat: ${invoice.status === "paid" ? "To'langan" : "Kutilmoqda"}</p>
        <p style="margin: 2px 0;">To'lov shartlari: ${esc(invoice.paymentTerms || "7 kun ichida")}</p>
        <p style="margin: 2px 0;">Valyuta: ${esc(invoice.currency)}</p>
      </div>
    </div>
    <div class="grid-2 text-xs pt-2 border-t mb-4" style="font-size: 12px;">
      <div>
        <div class="section-title">FROM (Tomonidan)</div>
        <p style="margin: 2px 0;">${esc(s.companyName)}</p>
        <p style="margin: 2px 0;">${esc(s.address)}</p>
        <p style="margin: 2px 0;">${esc(s.phone)}</p>
        <p style="margin: 2px 0;">${esc(s.email)} • ${esc(s.website)}</p>
      </div>
      <div>
        <div class="section-title">BILL TO (Kimga)</div>
        <p style="margin: 2px 0;">${esc(invoice.clientName || "Mijoz ismi")}</p>
        <p style="margin: 2px 0;">${esc(invoice.company || "Kompaniya")}</p>
        <p style="margin: 2px 0;">${esc(invoice.billToContact || "Manzil, tel, email")}</p>
      </div>
    </div>
    <div class="mb-4" style="font-size: 12px;">
      <table>
        <thead><tr><th>T/r</th><th>Xizmat nomi</th><th class="text-right">Nech oyligi</th><th class="text-right">1 oy uchun narxi</th><th class="text-right">Summa</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${scheduleBlocks}
    <div class="totals text-xs pt-2 border-t-2 mb-4" style="font-size: 12px;">
      <div class="totals-row">Subtotal: ${formatAmount(invoice.amount, currency)}</div>
      <div class="totals-row">Tax: ${formatAmount("0", currency)}</div>
      <div class="totals-row">Discount: ${formatAmount("0", currency)}</div>
      <div class="jami">JAMI: ${formatAmount(invoice.amount, currency)}</div>
    </div>
    <div class="text-xs pt-2 border-t mb-4" style="font-size: 12px;">
      <div class="section-title">Payment Details</div>
      ${paymentLinesHtml}
      <p style="color: #dc2626; font-weight: 600;">${esc(s.paymentNote)}</p>
    </div>
    <div class="stamp-row">
      <div class="stamp-wrap">
        <div class="stamp">
          <span class="brand">SAYD.X</span>
          <span class="verified">VERIFIED</span>
        </div>
      </div>
      <div class="signature-block">
        <img src="${esc(imzoUrl)}" alt="Imzo" style="height: 78px; width: auto; object-fit: contain; margin-bottom: 8px;">
        <div style="font-weight: 700; color: #1e40af;">${esc(s.authorizedName)}</div>
        <div style="color: #4b5563;">${esc(s.authorizedPosition)}</div>
        <div style="font-size: 11px; color: #6b7280;">${dateStr(issueDate)}</div>
      </div>
    </div>
    <div class="footer-text">${esc(s.website)} • ${esc(s.email)} • Generated by SAYD.X System • Invoice ID: ${validationId}</div>
  </div>
</body>
</html>`;
}

/** Generate PDF via Puppeteer — A4, ko'p sahifa (uzun jadval keyingi sahifada davom etadi). */
export async function generateInvoicePdfPuppeteer(
  invoice: InvoiceForPdf,
  items: InvoiceItemForPdf[],
  project: ProjectForPdf,
  settings: InvoiceSettingsForPdf,
  widthPx: number,
  _heightPx: number,
  baseUrl: string
): Promise<string> {
  ensureDir(UPLOAD_DIR);
  const filename = `chek-${invoice.invoiceNumber.replace(/\s/g, "-")}-${invoice.id}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);

  const html = buildInvoiceHtml(invoice, items, project, settings, baseUrl);

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });
    await page.setViewport({ width: Math.round(widthPx), height: 1200 });

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
    });
  } finally {
    await browser.close();
  }

  return `/api/invoices/${invoice.id}/pdf`;
}
