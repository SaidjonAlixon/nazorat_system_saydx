import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useInvoiceItems,
  useAddInvoiceItem,
  useDeleteInvoiceItem,
} from "@/hooks/use-finance";
import { InvoicePdfContent } from "@/components/InvoicePdfContent";
import { generateInvoicePdf } from "@/lib/generate-invoice-pdf";
import { useProjects } from "@/hooks/use-projects";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { FileText, Download, Trash2, Plus, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PaymentDetailLine = { title: string; value: string };
type InvoiceSettingsType = {
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

const defaultPaymentLines: PaymentDetailLine[] = [
  { title: "Bank nomi", value: "Your Bank Name" },
  { title: "Hisob raqami", value: "1234 5678 9012 3456" },
];

function InvoiceSettingsForm({
  initial,
  onSuccess,
}: {
  initial: InvoiceSettingsType;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<InvoiceSettingsType>(initial);
  const [paymentLines, setPaymentLines] = useState<PaymentDetailLine[]>(
    initial.paymentDetailLines?.length ? initial.paymentDetailLines : defaultPaymentLines
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
    setPaymentLines(
      initial.paymentDetailLines?.length ? initial.paymentDetailLines : defaultPaymentLines
    );
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        companyName: form.companyName,
        address: form.address,
        phone: form.phone,
        email: form.email,
        website: form.website,
        paymentNote: form.paymentNote,
        authorizedName: form.authorizedName,
        authorizedPosition: form.authorizedPosition,
        paymentDetailLines: paymentLines.map((l) => ({
          title: String(l.title ?? ""),
          value: String(l.value ?? ""),
        })),
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/settings/invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Saqlashda xato");
      }
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") setError("Server javob bermadi. Qayta urinib ko'ring.");
        else setError(err.message);
      } else setError("Xato");
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Omit<InvoiceSettingsType, "paymentDetailLines">, label: string, placeholder?: string) => (
    <div key={key}>
      <label className="text-sm text-white/80 block mb-1">{label}</label>
      <Input
        className="glass-input text-white w-full"
        value={form[key] as string}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder ?? label}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field("companyName", "Kompaniya / FROM nomi")}
        {field("address", "Manzil")}
        {field("phone", "Telefon")}
        {field("email", "Email")}
        {field("website", "Veb-sayt")}
        {field("paymentNote", "To'lov haqida eslatma")}
        {field("authorizedName", "Imzo egasi (ism)")}
        {field("authorizedPosition", "Lavozim")}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm text-white/80">To'lov ma'lumotlari (sarlavha + qiymat)</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/20 text-white"
            onClick={() => setPaymentLines((prev) => [...prev, { title: "", value: "" }])}
          >
            <Plus className="w-4 h-4 mr-1" /> Qator qo'shish
          </Button>
        </div>
        <p className="text-xs text-white/60">
          Masalan: Bank nomi, Hisob raqami — yoki Karta egasi, Karta raqami. Har bir qatorni o'chirish mumkin.
        </p>
        {paymentLines.map((line, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-4 glass-input text-white"
              placeholder="Sarlavha (masalan: Karta egasi)"
              value={line.title}
              onChange={(e) =>
                setPaymentLines((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                )
              }
            />
            <Input
              className="col-span-6 glass-input text-white"
              placeholder="Qiymat"
              value={line.value}
              onChange={(e) =>
                setPaymentLines((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="col-span-2 text-destructive"
              onClick={() => setPaymentLines((prev) => prev.filter((_, j) => j !== i))}
              title="O'chirish"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" className="bg-secondary text-white" disabled={saving}>
        {saving ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </form>
  );
}

function InvoiceItemsDialog({ invId, onClose }: { invId: number | null; onClose: () => void }) {
  const { data: items = [] } = useInvoiceItems(invId);
  const addItem = useAddInvoiceItem(invId ?? 0);
  const deleteItem = useDeleteInvoiceItem(invId ?? 0);
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const serviceType = title.toLowerCase() === "server" ? "server" : title.toLowerCase() === "api" ? "api" : undefined;

  if (invId == null) return null;
  return (
    <Dialog open={invId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Faktura xizmatlari</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap items-end">
            <Input
              className="flex-1 min-w-[120px] glass-input text-white"
              placeholder="Xizmat nomi (Server, API, ...)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              type="number"
              min={1}
              className="w-20 glass-input text-white"
              placeholder="Oylar"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
            <Input
              type="number"
              className="w-28 glass-input text-white"
              placeholder="1 oy narxi"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
            {(title.toLowerCase() === "server" || title.toLowerCase() === "api") && (
              <Input
                type="date"
                className="w-40 glass-input text-white date-picker-white-icon"
                placeholder="Boshlanish"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            )}
            <Button
              size="sm"
              className="bg-secondary text-white"
              disabled={!title.trim() || !unitPrice || addItem.isPending}
              onClick={() => {
                addItem.mutate(
                  {
                    title: title.trim(),
                    quantity,
                    unitPrice,
                    ...(serviceType && { serviceType }),
                    ...(startDate && { startDate }),
                  },
                  {
                    onSuccess: () => {
                      setTitle("");
                      setQuantity(1);
                      setUnitPrice("");
                      setStartDate("");
                    },
                  }
                );
              }}
            >
              Qo'shish
            </Button>
          </div>
          <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto">
            {items.map((item: { id: number; title: string; quantity: number; unitPrice: string }) => (
              <li key={item.id} className="flex justify-between items-center py-2 text-sm text-white">
                <span>
                  {item.title} × {item.quantity} = {Number(item.quantity) * Number(item.unitPrice)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-8 w-8"
                  onClick={() => deleteItem.mutate(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Invoices() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: projects } = useProjects();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const queryClient = useQueryClient();

  const [isInvDialogOpen, setIsInvDialogOpen] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
  const [formCurrency, setFormCurrency] = useState<"UZS" | "USD">("UZS");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  type InvoiceRow = { title: string; quantity: number; unitPrice: string; serviceType?: "server" | "api"; startDate?: string };
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([{ title: "", quantity: 1, unitPrice: "" }]);
  const [itemsDialogInvId, setItemsDialogInvId] = useState<number | null>(null);
  const [pdfGeneratingId, setPdfGeneratingId] = useState<number | null>(null);

  useEffect(() => {
    if (isInvDialogOpen) {
      fetch("/api/invoices/next-number", { credentials: "include" })
        .then((r) => r.json())
        .then((d: { invoiceNumber?: string }) => setNextInvoiceNumber(d.invoiceNumber ?? ""))
        .catch(() => setNextInvoiceNumber(""));
    }
  }, [isInvDialogOpen]);

  type InvoiceSettings = {
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
  const defaultSettings: InvoiceSettings = {
    companyName: "SAYD.X LLC",
    address: "Toshkent, O'zbekiston",
    phone: "+998 90 000 00 00",
    email: "info@saydx.uz",
    website: "saydx.uz",
    bankName: "Your Bank Name",
    accountNumber: "1234 5678 9012 3456",
    paymentDetailLines: defaultPaymentLines,
    paymentNote: "To'lov shartnoma asosida amalga oshiriladi.",
    authorizedName: "Authorized Name",
    authorizedPosition: "Position",
  };
  const { data: invoiceSettings = defaultSettings } = useQuery({
    queryKey: ["/api/settings/invoice"],
    queryFn: async () => {
      const res = await fetch("/api/settings/invoice", { credentials: "include" });
      if (!res.ok) throw new Error("Sozlamalarni o'qishda xato");
      return res.json() as Promise<InvoiceSettings>;
    },
  });
  const s = invoiceSettings;

  const handleDownloadPdf = useCallback(
    async (inv: {
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
      projectId?: number | null;
    }) => {
      setPdfGeneratingId(inv.id);
      try {
        const [itemsRes, settingsRes] = await Promise.all([
          fetch(`/api/invoices/${inv.id}/items`, { credentials: "include" }),
          fetch("/api/settings/invoice", { credentials: "include" }),
        ]);
        const items: { title: string; quantity: number; unitPrice: string }[] = itemsRes.ok ? await itemsRes.json() : [];
        const settings = settingsRes.ok ? await settingsRes.json() : invoiceSettings;

        const projectName = projects?.find((p) => p.id === inv.projectId)?.name;
        const filename = inv.invoiceNumber.replace(/[^a-zA-Z0-9\-_.]/g, "_") || `INV-${String(inv.id).padStart(6, "0")}`;
        const pdfFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

        const container = document.createElement("div");
        container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;z-index:-1;";
        document.body.appendChild(container);
        const root = createRoot(container);
        root.render(
          <InvoicePdfContent
            invoice={inv}
            items={items}
            projectName={projectName}
            settings={settings}
            paymentDetailLines={settings?.paymentDetailLines}
          />
        );

        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 350)));
        const el = container.querySelector(".invoice-pdf-content") as HTMLElement;
        if (el) {
          await generateInvoicePdf(el, pdfFilename);
        } else {
          throw new Error("PDF element not found");
        }
        root.unmount();
        document.body.removeChild(container);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : "PDF yuklanmadi");
      } finally {
        setPdfGeneratingId(null);
      }
    },
    [projects, invoiceSettings]
  );

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner message="Hisob-fakturalar yuklanmoqda..." />
      </AppLayout>
    );
  }

  const totalFromRows = invoiceRows.reduce(
    (s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
    0
  );

  const handleCreateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const projectId = Number(formData.get("projectId"));
    if (!projectId || projectId < 1) {
      alert("Iltimos, loyihani tanlang.");
      return;
    }
    const serverOrApiWithoutDate = invoiceRows.some(
      (r) => (r.serviceType === "server" || r.serviceType === "api") && r.title.trim() && !r.startDate
    );
    if (serverOrApiWithoutDate) {
      alert("Server yoki API xizmati uchun boshlanish sanasini (kun, oy, yil) kiriting.");
      return;
    }
    const inv = await createInvoice.mutateAsync({
      projectId,
      invoiceNumber: nextInvoiceNumber || "INV-AUTO",
      amount: String(totalFromRows || 0),
      dueDate: new Date(formData.get("dueDate") as string),
      currency: (formData.get("currency") as string) || "UZS",
      status: (formData.get("status") as string) || "unpaid",
      paymentTerms: (formData.get("paymentTerms") as string) || undefined,
      clientName: (formData.get("clientName") as string) || undefined,
      company: (formData.get("company") as string) || undefined,
      billToContact: (formData.get("billToContact") as string) || undefined,
    });
    for (const row of invoiceRows.filter((r) => r.title.trim())) {
      await fetch(`/api/invoices/${inv.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: row.title,
          quantity: row.quantity || 1,
          unitPrice: String(row.unitPrice),
          ...(row.serviceType && { serviceType: row.serviceType }),
          ...(row.startDate && { startDate: row.startDate }),
        }),
        credentials: "include",
      });
    }
    setInvoiceRows([{ title: "", quantity: 1, unitPrice: "" }] as InvoiceRow[]);
    setIsInvDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Hisob-fakturalar</h1>
          <p className="text-muted-foreground">
            Mijozlarga yuboriladigan hisob-fakturalarni yaratish, ko'rish va PDF shaklida yuklab olish.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Settings className="w-4 h-4 mr-2" />
                PDF faktura ma'lumotlar
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">PDF faktura ma'lumotlari</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-white/70">Bu ma'lumotlar barcha hisob-faktura PDF larida va ko'rinishda ishlatiladi. FROM, to'lov va imzo bloklarini shu yerdan tahrirlang.</p>
              <InvoiceSettingsForm
                initial={invoiceSettings}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/settings/invoice"] });
                  setIsSettingsDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                PDF faktura ko'rinishi
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">PDF faktura ko'rinishi</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <p className="text-xs text-white/60">Yuklab olinadigan PDF shu ko'rinishda bo'ladi. Haqiqiy faylni har bir faktura kartasidagi &quot;PDF yuklash&quot; tugmasi orqali olasiz.</p>
                <div className="invoice-preview bg-white text-black rounded-lg shadow-xl mx-auto">
                  <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
                    <div className="flex justify-center pt-2">
                      <img src="/LOGO2.png" alt="Logo" className="h-16 w-auto object-contain" />
                    </div>
                    <div className="text-center border-b border-gray-200 pb-3">
                      <h2 className="text-xl font-bold tracking-wide">HISOB-FAKTURA</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-xs">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700">Hisob-faktura ma'lumotlari</div>
                        <p>Raqam: INV-20260225-0001</p>
                        <p>ID: INV-000001</p>
                        <p>Sana: 25.02.2026</p>
                        <p>To'lov muddati: 07.03.2026</p>
                        <p>Loyiha: Telegram Bot &amp; CRM</p>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700">Holat va valyuta</div>
                        <p>Holat: Kutilmoqda</p>
                        <p>To'lov shartlari: 7 kun ichida</p>
                        <p>Valyuta: USD</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-xs pt-2 border-t border-gray-200">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700">FROM (Tomonidan)</div>
                        <p>{s.companyName}</p>
                        <p>{s.address}</p>
                        <p>{s.phone}</p>
                        <p>{s.email} • {s.website}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700">BILL TO (Kimga)</div>
                        <p>Mijoz ismi</p>
                        <p>Kompaniya</p>
                        <p>Manzil, tel, email</p>
                      </div>
                    </div>
                    <div className="text-xs border border-gray-200 rounded overflow-hidden">
                      <div className="grid grid-cols-12 bg-[#F2F2F2] font-semibold py-2 px-2 border-b border-gray-300">
                        <div className="col-span-1">T/r</div>
                        <div className="col-span-5">Xizmat nomi</div>
                        <div className="col-span-2 text-right">Nech oyligi</div>
                        <div className="col-span-2 text-right">1 oy uchun narxi</div>
                        <div className="col-span-2 text-right">Summa</div>
                      </div>
                      <div className="grid grid-cols-12 py-2 px-2 border-b border-gray-100">
                        <div className="col-span-1">1</div>
                        <div className="col-span-5">Xizmat nomi</div>
                        <div className="col-span-2 text-right">1</div>
                        <div className="col-span-2 text-right">2 323.00</div>
                        <div className="col-span-2 text-right">2 323.00</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-xs space-y-1 pt-2 border-t-2 border-gray-300">
                      <div className="flex gap-8"><span>Subtotal:</span><span>2 323.00 USD</span></div>
                      <div className="flex gap-8"><span>Tax:</span><span>0.00 USD</span></div>
                      <div className="flex gap-8"><span>Discount:</span><span>0.00 USD</span></div>
                      <div className="font-bold text-base mt-1">JAMI: 2 323.00 USD</div>
                    </div>
                    <div className="text-xs pt-2 border-t border-gray-200">
                      <div className="font-semibold mb-1">Payment Details</div>
                      {(s.paymentDetailLines && s.paymentDetailLines.length > 0
                        ? s.paymentDetailLines
                        : defaultPaymentLines
                      ).map((line, i) => (
                        <p key={i}>
                          {line.title ? `${line.title}: ${line.value}` : line.value}
                        </p>
                      ))}
                      <p className="text-gray-600">{s.paymentNote}</p>
                    </div>
                    <div className="flex justify-end items-end gap-4 pt-4">
                      <div className="w-16 h-16 rounded-full border-2 border-blue-500 flex flex-col items-center justify-center text-blue-600 text-[8px] font-bold">
                        <span>SAYD.X</span>
                        <span>VERIFIED</span>
                      </div>
                      <div className="text-right text-xs">
                        <img src="/imzo.PNG" alt="Imzo" className="h-12 w-auto object-contain mb-1 mt-2 ml-6" />
                        <div>{s.authorizedName}</div>
                        <div>{s.authorizedPosition}</div>
                        <div>25.02.2026</div>
                      </div>
                    </div>
                    <div className="text-center text-[9px] text-gray-500 pt-4 border-t border-gray-100">
                      {s.website} • {s.email} • Generated by S-UBOS System • Invoice ID: INV-000001
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isInvDialogOpen} onOpenChange={setIsInvDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary text-white hover:bg-secondary/80">
                <FileText className="w-4 h-4 mr-2" />
                Yangi faktura
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Yangi hisob-faktura</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-white/70 block mb-1">Raqami</label>
                <Input
                  readOnly
                  value={nextInvoiceNumber}
                  className="glass-input text-white bg-white/5"
                  placeholder="Yuklanmoqda..."
                />
                <p className="text-xs text-white/50 mt-1">Avtomatik beriladi, takrorlanmaydi</p>
              </div>
              <div>
                <label className="text-sm text-white/70 block mb-1">Loyiha</label>
                <select name="projectId" required className="w-full glass-input p-2 rounded-md text-white">
                  <option value="" className="text-black">
                    Tanlang...
                  </option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id} className="text-black">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 block mb-1">Holat (Status)</label>
                <select name="status" className="w-full glass-input p-2 rounded-md text-white">
                  <option value="unpaid" className="text-black">Kutilmoqda</option>
                  <option value="paid" className="text-black">To'langan</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 block mb-1">Valyuta</label>
                <select
                  name="currency"
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value as "UZS" | "USD")}
                  className="w-full glass-input p-2 rounded-md text-white"
                >
                  <option value="UZS" className="text-black">
                    UZS
                  </option>
                  <option value="USD" className="text-black">
                    USD
                  </option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 block mb-1">To'lov shartlari</label>
                <Input
                  name="paymentTerms"
                  className="glass-input text-white"
                  placeholder="7 kun ichida"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 block mb-1">To'lov muddati</label>
                <Input name="dueDate" type="date" required className="glass-input text-white date-picker-white-icon" />
              </div>
              <div className="border-t border-white/10 pt-4 mt-2">
                <div className="text-sm text-white/80 font-medium mb-2">BILL TO (Kimga)</div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Mijoz ismi</label>
                    <Input name="clientName" className="glass-input text-white" placeholder="Mijoz ismi" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Kompaniya</label>
                    <Input name="company" className="glass-input text-white" placeholder="Kompaniya" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Manzil, tel, email</label>
                    <Input name="billToContact" className="glass-input text-white" placeholder="Manzil, tel, email" />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-white/70">Xizmatlar</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white"
                    onClick={() =>
                      setInvoiceRows((r) => [...r, { title: "", quantity: 1, unitPrice: "" }])
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" /> Qator
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white"
                    onClick={() =>
                      setInvoiceRows((r) => [...r, { title: "Server", quantity: 1, unitPrice: "", serviceType: "server", startDate: "" }])
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" /> Server
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white"
                    onClick={() =>
                      setInvoiceRows((r) => [...r, { title: "API", quantity: 1, unitPrice: "", serviceType: "api", startDate: "" }])
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" /> API
                  </Button>
                </div>
                {invoiceRows.map((row, i) => (
                  <div key={i} className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-5 glass-input text-white"
                      placeholder="Xizmat nomi"
                      value={row.title}
                      onChange={(e) => {
                        const v = e.target.value;
                        const st: "server" | "api" | undefined =
                          v.toLowerCase() === "server" ? "server" : v.toLowerCase() === "api" ? "api" : undefined;
                        setInvoiceRows((r) =>
                          r.map((x, j) => (j === i ? { ...x, title: v, serviceType: st ?? x.serviceType } : x))
                        );
                      }}
                    />
                    <Input
                      type="number"
                      min={1}
                      className="col-span-2 glass-input text-white"
                      placeholder="Nech oyligi"
                      value={row.quantity}
                      onChange={(e) =>
                        setInvoiceRows((r) =>
                          r.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x))
                        )
                      }
                    />
                    <div className="col-span-3 flex items-center gap-1">
                      {formCurrency === "USD" && (
                        <span className="text-white/90 font-medium">$</span>
                      )}
                      <Input
                        type="number"
                        className="flex-1 glass-input text-white"
                        placeholder="1 oy uchun narxi"
                        value={row.unitPrice}
                        onChange={(e) =>
                          setInvoiceRows((r) =>
                            r.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 text-destructive"
                      onClick={() =>
                        setInvoiceRows((r) => r.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {(row.serviceType === "server" || row.serviceType === "api") && (
                    <div className="grid grid-cols-12 gap-2 items-center pl-2 border-l-2 border-primary/30">
                      <label className="col-span-12 sm:col-span-2 text-xs text-white/70">Boshlanish sanasi (kun.oy.yil)</label>
                      <Input
                        type="date"
                        className="col-span-12 sm:col-span-4 glass-input text-white date-picker-white-icon"
                        value={row.startDate || ""}
                        onChange={(e) =>
                          setInvoiceRows((r) =>
                            r.map((x, j) => (j === i ? { ...x, startDate: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                  )}
                  </div>
                ))}
                <p className="text-sm text-primary font-bold mt-2">
                  Jami:{" "}
                  {formCurrency === "USD" ? "$ " : ""}
                  {new Intl.NumberFormat("uz-UZ", {
                    maximumFractionDigits: 0,
                  }).format(totalFromRows)}
                  {formCurrency === "UZS" ? " UZS" : ""}
                </p>
                <input type="hidden" name="amount" value={totalFromRows} />
              </div>
              <Button
                type="submit"
                disabled={createInvoice.isPending}
                className="w-full bg-secondary text-white"
              >
                Yaratish
              </Button>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <InvoiceItemsDialog invId={itemsDialogInvId} onClose={() => setItemsDialogInvId(null)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invoices?.map((inv) => (
          <div
            key={inv.id}
            className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-secondary/30 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-secondary/10 text-secondary">
                <FileText className="w-6 h-6" />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  inv.status === "paid"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-orange-500/20 text-orange-400"
                }`}
              >
                {inv.status === "paid" ? "To'langan" : "Kutilmoqda"}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{inv.invoiceNumber}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {projects?.find((p) => p.id === inv.projectId)?.name}
            </p>
            <div className="text-2xl font-bold text-white mb-2">
              {new Intl.NumberFormat("uz-UZ").format(Number(inv.amount))} {inv.currency}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-secondary mb-4"
              onClick={() => setItemsDialogInvId(inv.id)}
            >
              Xizmatlar / Qo'shish
            </Button>
            <div className="flex items-center justify-between border-t border-white/5 pt-4 gap-2">
              <div className="text-xs text-muted-foreground">
                Muddat: {format(new Date(inv.dueDate), "dd.MM.yyyy")}
              </div>
              <div className="flex gap-2">
                {inv.status !== "paid" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                    onClick={() => updateInvoice.mutate({ id: inv.id, status: "paid" })}
                  >
                    To'langan
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-secondary hover:text-white hover:bg-secondary/20"
                  disabled={pdfGeneratingId === inv.id}
                  onClick={() => handleDownloadPdf(inv)}
                >
                  <Download className="w-4 h-4 mr-1" />{" "}
                  {pdfGeneratingId === inv.id ? "Yuklanmoqda..." : "PDF yuklash"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

