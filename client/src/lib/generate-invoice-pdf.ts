import html2pdf from "html2pdf.js";

const PDF_OPTIONS = {
  margin: 10,
  filename: "invoice.pdf",
  image: { type: "jpeg" as const, quality: 1 },
  html2canvas: {
    scale: 1,
    useCORS: true,
    letterRendering: true,
    scrollX: 0,
    scrollY: 0,
    logging: false,
  },
  jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  pagebreak: { mode: ["legacy"] },
};

/**
 * Generates and downloads an invoice PDF from an HTML element.
 * A4 (210×297mm), no scaling. Layout dimensions must be correct in CSS.
 */
export async function generateInvoicePdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const safeFilename = filename.replace(/[^a-zA-Z0-9\-_.]/g, "_");
  const opts = {
    ...PDF_OPTIONS,
    filename: safeFilename.endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`,
  };
  return html2pdf().set(opts).from(element).save();
}
