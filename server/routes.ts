import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { getInvoicePdfPath } from "./invoicePdf";
import { generateInvoicePdfPuppeteer } from "./invoicePdfPuppeteer";
import { getUsdToUzsRate } from "./currencyRate";

// Import integration routes
import { registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register integration routes
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerAudioRoutes(app);
  registerObjectStorageRoutes(app);

  const toUzs = (t: { amount: string; currency: string | null }, usdToUzs: number) =>
    t.currency === "USD" ? Number(t.amount) * usdToUzs : Number(t.amount);

  // --- Dashboard ---
  app.get(api.dashboard.stats.path, async (req, res) => {
    try {
      const [projects, txs, totalMinutes, currencyResult] = await Promise.all([
        storage.getProjects(),
        storage.getTransactions(),
        storage.getTotalLoggedMinutes(),
        getUsdToUzsRate(() => storage.getManualUsdToUzs()),
      ]);
      const usdToUzs = currencyResult.rate;

      const activeProjects = projects.filter(p => p.status === 'active').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const delayedProjects = projects.filter(p => p.status === 'delayed').length;

      const totalRevenue = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + toUzs(t, usdToUzs), 0);
      const totalExpenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + toUzs(t, usdToUzs), 0);
      const netProfit = totalRevenue - totalExpenses;
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
      const averageHourlyRevenue = totalHours > 0 ? Math.round(netProfit / totalHours) : 0;

      const now = new Date();
      const last12Months: { monthKey: string; revenue: number; expense: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const rev = txs
          .filter(t => t.type === "income" && new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd)
          .reduce((s, t) => s + toUzs(t, usdToUzs), 0);
        const exp = txs
          .filter(t => t.type === "expense" && new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd)
          .reduce((s, t) => s + toUzs(t, usdToUzs), 0);
        last12Months.push({ monthKey, revenue: rev, expense: exp });
      }

      const deadlineRiskCount = projects.filter(
        p => p.status === "active" && new Date(p.deadlineDate) < now && p.progress < 100
      ).length;

      res.json({
        activeProjects,
        completedProjects,
        delayedProjects,
        totalRevenue,
        totalExpenses,
        netProfit,
        totalHours,
        averageHourlyRevenue,
        monthlyStats: last12Months,
        deadlineRiskCount,
        currencyRateSource: currencyResult.source,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/currency-rate", async (req, res) => {
    try {
      const { rate: usdToUzs, source } = await getUsdToUzsRate(() => storage.getManualUsdToUzs());
      res.json({ usdToUzs, currencyRateSource: source });
    } catch (err) {
      console.error(err);
      res.status(500).json({ usdToUzs: 12500, currencyRateSource: "fallback" });
    }
  });

  app.get("/api/settings/finance", async (req, res) => {
    try {
      const manualUsdToUzs = await storage.getManualUsdToUzs();
      res.json({ manualUsdToUzs: manualUsdToUzs ?? null });
    } catch (err) {
      console.error(err);
      res.status(500).json({ manualUsdToUzs: null });
    }
  });

  app.put("/api/settings/finance", async (req, res) => {
    try {
      const { manualUsdToUzs } = req.body as { manualUsdToUzs?: number };
      const rate = Number(manualUsdToUzs);
      if (!Number.isFinite(rate) || rate <= 0) {
        return res.status(400).json({ message: "Kurs musbat son bo'lishi kerak." });
      }
      await storage.setManualUsdToUzs(rate);
      res.json({ manualUsdToUzs: Math.round(rate) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Saqlashda xato." });
    }
  });

  // --- Clients ---
  app.get(api.clients.list.path, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.post(api.clients.create.path, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.get(api.companies.list.path, async (req, res) => {
    const list = await storage.getCompanies();
    res.json(list);
  });

  app.post(api.companies.create.path, async (req, res) => {
    try {
      const input = api.companies.create.input.parse(req.body);
      const company = await storage.createCompany(input);
      res.status(201).json(company);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // --- Projects ---
  app.get(api.projects.list.path, async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get(api.projects.get.path, async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.post(api.projects.create.path, async (req, res) => {
    try {
      const bodySchema = api.projects.create.input.extend({
        clientId: z.coerce.number().optional(),
        companyId: z.coerce.number().optional(),
        budget: z.union([z.string(), z.number()]).transform(v => String(v)),
        startDate: z.union([z.string(), z.date()]).transform(v => new Date(v)).refine(d => !Number.isNaN(d.getTime()), { message: "Boshlanish sanasi toʻgʻri boʻlishi kerak." }),
        deadlineDate: z.union([z.string(), z.date()]).transform(v => new Date(v)).refine(d => !Number.isNaN(d.getTime()), { message: "Tugash sanasi (muddat) toʻgʻri boʻlishi kerak." }),
        description: z.string().optional(),
        additionalRequirements: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
      });
      const input = bodySchema.parse(req.body);
      const hasClient = input.clientId != null && input.clientId > 0;
      const hasCompany = input.companyId != null && input.companyId > 0;
      if (!hasClient && !hasCompany) {
        return res.status(400).json({ message: "Mijoz yoki kompaniyani tanlang.", field: "clientId" });
      }
      const start = input.startDate as Date;
      const end = input.deadlineDate as Date;
      if (end < start) {
        return res.status(400).json({ message: "Tugash sanasi boshlanish sanasidan keyin boʻlishi kerak.", field: "deadlineDate" });
      }
      const project = await storage.createProject({
        ...input,
        clientId: hasClient ? input.clientId : null,
        companyId: hasCompany ? input.companyId : null,
        startDate: start,
        deadlineDate: end,
      });
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Loyiha yaratishda xato. Qaytadan urinib koʻring." });
    }
  });

  app.put(api.projects.update.path, async (req, res) => {
    try {
      const input = api.projects.update.input.parse(req.body);
      const updated = await storage.updateProject(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Project not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // --- Tasks ---
  app.get(api.tasks.list.path, async (req, res) => {
    const tasks = await storage.getTasksByProject(Number(req.params.projectId));
    res.json(tasks);
  });

  app.post(api.tasks.create.path, async (req, res) => {
    try {
      const body = api.tasks.create.input.extend({
        parentTaskId: z.coerce.number().optional(),
      }).parse(req.body);
      const { parentTaskId, ...rest } = body;
      const task = await storage.createTask({
        ...rest,
        projectId: Number(req.params.projectId),
        ...(parentTaskId != null && { parentTaskId }),
      });
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put(api.tasks.update.path, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const input = api.tasks.update.input.parse(req.body);
      const current = await storage.getTask(taskId);
      if (!current) return res.status(404).json({ message: "Task not found" });
      const { id: _id, ...rest } = input as { id?: number; status?: string; reopenComment?: string; dueDate?: string | Date; [k: string]: unknown };
      const updates = { ...rest };
      const newStatus = (input.status ?? current.status) as string;
      const cur = current as { status: string; inProgressStartedAt?: Date; completedAt?: Date };
      if (newStatus === "in progress" && cur.status !== "in progress" && !cur.inProgressStartedAt) {
        (updates as { inProgressStartedAt?: Date }).inProgressStartedAt = new Date();
      }
      if (newStatus === "done") {
        (updates as { completedAt?: Date }).completedAt = new Date();
      }
      if (newStatus === "todo" && cur.status === "done") {
        (updates as { completedAt?: null; inProgressStartedAt?: null }).completedAt = null;
        (updates as { inProgressStartedAt?: null }).inProgressStartedAt = null;
      }
      if ((rest as { dueDate?: string }).dueDate !== undefined) {
        (updates as { dueDate?: Date }).dueDate = rest.dueDate ? new Date(rest.dueDate as string) : null;
      }
      const updated = await storage.updateTask(taskId, updates);
      if (!updated) return res.status(404).json({ message: "Task not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // --- Time stats (kunlik/haftalik) ---
  app.get("/api/time/stats", async (req, res) => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = req.query.to ? new Date(req.query.to as string) : new Date();
      const entries = await storage.getTimeEntriesBetween(from, to);
      const byDay: Record<string, number> = {};
      entries.forEach(e => {
        const key = new Date(e.date).toISOString().slice(0, 10);
        byDay[key] = (byDay[key] || 0) + e.durationMinutes;
      });
      const totalMinutes = entries.reduce((s, e) => s + e.durationMinutes, 0);
      res.json({ byDay: Object.entries(byDay).map(([date, minutes]) => ({ date, minutes })), totalMinutes });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // --- Time Entries ---
  app.post(api.timeEntries.create.path, async (req, res) => {
    try {
      const input = api.timeEntries.create.input.parse(req.body);
      let userId = (req.user as any)?.claims?.sub || "system";
      if (userId === "local-user" || userId === "system") {
        const firstId = await storage.getFirstUserId();
        if (firstId) userId = firstId;
      }
      const entry = await storage.createTimeEntry({
        ...input,
        taskId: Number(req.params.taskId),
        userId,
      });
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  // --- Transactions ---
  app.get(api.transactions.list.path, async (req, res) => {
    const txs = await storage.getTransactions();
    res.json(txs);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.extend({
        projectId: z.coerce.number().optional(),
        amount: z.union([z.string(), z.number()]).transform(v => String(v)),
      }).parse(req.body);
      const tx = await storage.createTransaction(input);
      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // --- Invoices ---
  app.get(api.invoices.list.path, async (req, res) => {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  });

  app.get("/api/invoices/next-number", async (req, res) => {
    try {
      const invoiceNumber = await storage.getNextInvoiceNumber();
      res.json({ invoiceNumber });
    } catch (err) {
      console.error("Next invoice number error:", err);
      res.status(500).json({ message: "Raqam generatsiya qilishda xato." });
    }
  });

  app.post(api.invoices.create.path, async (req, res) => {
    try {
      const input = api.invoices.create.input.extend({
        projectId: z.coerce.number(),
        invoiceNumber: z.string().optional(),
        amount: z.union([z.string(), z.number()]).transform(v => String(v)),
        dueDate: z.union([z.string(), z.date(), z.number()]).transform(v => new Date(v)),
      }).parse(req.body);
      const projectId = Number(input.projectId);
      if (!projectId || projectId < 1) {
        return res.status(400).json({ message: "Loyihani tanlang." });
      }
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(400).json({ message: "Tanlangan loyiha topilmadi." });
      }
      const invoiceNumber = await storage.getNextInvoiceNumber();
      const invoice = await storage.createInvoice({
        ...input,
        invoiceNumber,
        dueDate: input.dueDate,
      });
      res.status(201).json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const msg = err.errors[0]?.message || "Ma'lumotlar noto'g'ri.";
        return res.status(400).json({ message: msg, field: err.errors[0]?.path?.join?.(".") });
      }
      console.error("Create invoice error:", err);
      res.status(500).json({ message: "Faktura yaratishda xato. Qayta urinib ko'ring." });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const { status, amount } = req.body as { status?: string; amount?: string };
      const updated = await storage.updateInvoice(Number(req.params.id), { status, amount });
      if (!updated) return res.status(404).json({ message: "Invoice not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.get("/api/invoices/:id/items", async (req, res) => {
    try {
      const items = await storage.getInvoiceItems(Number(req.params.id));
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/invoices/:id/items", async (req, res) => {
    try {
      const body = z.object({
        title: z.string(),
        quantity: z.coerce.number().default(1),
        unitPrice: z.union([z.string(), z.number()]).transform(v => String(v)),
        serviceType: z.enum(["server", "api"]).optional(),
        startDate: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : undefined),
      }).parse(req.body);
      const invId = Number(req.params.id);
      const item = await storage.createInvoiceItem({
        invoiceId: invId,
        title: body.title,
        quantity: body.quantity,
        unitPrice: body.unitPrice,
        serviceType: body.serviceType ?? null,
        startDate: body.startDate ?? null,
      });
      const items = await storage.getInvoiceItems(invId);
      const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
      await storage.updateInvoice(invId, { amount: String(total) });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to add item" });
    }
  });

  app.delete("/api/invoices/:invoiceId/items/:itemId", async (req, res) => {
    try {
      const itemId = Number(req.params.itemId);
      const invoiceId = Number(req.params.invoiceId);
      await storage.deleteInvoiceItem(itemId);
      const remaining = await storage.getInvoiceItems(invoiceId);
      const total = remaining.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
      await storage.updateInvoice(invoiceId, { amount: String(total) });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // --- PDF: Puppeteer — exact preview dimensions, no A4, no margins, scale 1 ---
  const DEFAULT_PDF_WIDTH = 794;
  const DEFAULT_PDF_HEIGHT = 1123;
  app.post("/api/invoices/:id/generate-pdf", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = (req.body || {}) as { width?: number; height?: number };
      const widthPx = typeof body.width === "number" && body.width > 0 ? body.width : DEFAULT_PDF_WIDTH;
      const heightPx = typeof body.height === "number" && body.height > 0 ? body.height : DEFAULT_PDF_HEIGHT;

      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      const items = await storage.getInvoiceItems(id);
      const project = invoice.projectId ? await storage.getProject(invoice.projectId) : undefined;
      const invoiceSettingsRow = await storage.getInvoiceSettings();

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host") || "localhost:5000"}`;
      const url = await generateInvoicePdfPuppeteer(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status ?? undefined,
          paymentTerms: invoice.paymentTerms ?? undefined,
          clientName: invoice.clientName ?? undefined,
          company: invoice.company ?? undefined,
          billToContact: invoice.billToContact ?? undefined,
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt,
          projectId: invoice.projectId,
        },
        items.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          serviceType: i.serviceType ?? undefined,
          startDate: i.startDate ?? undefined,
        })),
        project ? { name: project.name } : undefined,
        invoiceSettingsRow,
        widthPx,
        heightPx,
        baseUrl
      );
      await storage.updateInvoice(id, { pdfUrl: url });
      res.json({ url });
    } catch (err) {
      console.error("PDF generation failed:", err);
      res.status(500).json({ message: "PDF yaratishda xato" });
    }
  });

  const defaultPaymentDetailLines = [
    { title: "Bank nomi", value: "Your Bank Name" },
    { title: "Hisob raqami", value: "1234 5678 9012 3456" },
  ];
  function parsePaymentDetailLines(raw: string | null): { title: string; value: string }[] {
    if (!raw || !raw.trim()) return defaultPaymentDetailLines;
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return defaultPaymentDetailLines;
      return arr.map((x: unknown) =>
        x && typeof x === "object" && "title" in x && "value" in x
          ? { title: String((x as { title: unknown }).title), value: String((x as { value: unknown }).value) }
          : { title: "", value: "" }
      ).filter((x: { title: string; value: string }) => x.title || x.value);
    } catch {
      return defaultPaymentDetailLines;
    }
  }

  app.get("/api/settings/invoice", async (_req, res) => {
    try {
      const row = await storage.getInvoiceSettings();
      const defaults = {
        companyName: "SAYD.X LLC",
        address: "Toshkent, O'zbekiston",
        phone: "+998 90 000 00 00",
        email: "info@saydx.uz",
        website: "saydx.uz",
        bankName: "Your Bank Name",
        accountNumber: "1234 5678 9012 3456",
        paymentDetailLines: defaultPaymentDetailLines,
        paymentNote: "To'lov shartnoma asosida amalga oshiriladi.",
        authorizedName: "Authorized Name",
        authorizedPosition: "Position",
      };
      if (!row) return res.json(defaults);
      const paymentDetailLines = parsePaymentDetailLines(row.paymentDetailLines);
      res.json({ ...row, paymentDetailLines });
    } catch (err) {
      console.error("get invoice settings:", err);
      res.status(500).json({ message: "Sozlamalarni o'qishda xato" });
    }
  });

  app.put("/api/settings/invoice", async (req, res) => {
    try {
      const body = req.body as unknown;
      const input = z.object({
        companyName: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        paymentDetailLines: z.array(z.object({
          title: z.union([z.string(), z.undefined()]).transform((v) => String(v ?? "")),
          value: z.union([z.string(), z.undefined()]).transform((v) => String(v ?? "")),
        })).optional(),
        paymentNote: z.string().optional(),
        authorizedName: z.string().optional(),
        authorizedPosition: z.string().optional(),
      }).parse(body);
      const updated = await storage.upsertInvoiceSettings(input);
      const paymentDetailLines = parsePaymentDetailLines(updated.paymentDetailLines);
      res.json({ ...updated, paymentDetailLines });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const msg = err.errors[0]?.message ?? "Noto'g'ri ma'lumot";
        return res.status(400).json({ message: msg });
      }
      console.error("update invoice settings:", err);
      res.status(500).json({ message: "Sozlamalarni saqlashda xato. Qayta urinib ko'ring." });
    }
  });

  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const filePath = getInvoicePdfPath(id);
      if (!filePath) return res.status(404).json({ message: "PDF topilmadi. Avval 'PDF yuklash' bosing." });
      res.setHeader("Content-Type", "application/pdf");
      res.sendFile(path.resolve(filePath));
    } catch (err) {
      console.error("PDF serve failed:", err);
      res.status(500).json({ message: "PDF yuklanmadi" });
    }
  });

  // --- Analytics Report ---
  app.get("/api/analytics/report", async (_req, res) => {
    try {
      const [projects, txs, clients] = await Promise.all([
        storage.getProjects(),
        storage.getTransactions(),
        storage.getClients(),
      ]);
      const now = new Date();
      const byMonth: Record<string, { revenue: number; expense: number }> = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = { revenue: 0, expense: 0 };
      }
      txs.forEach(t => {
        const key = new Date(t.date).toISOString().slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { revenue: 0, expense: 0 };
        if (t.type === "income") byMonth[key].revenue += Number(t.amount);
        else byMonth[key].expense += Number(t.amount);
      });
      const byClient: { clientId: number; clientName: string; revenue: number }[] = [];
      clients.forEach(c => {
        const rev = txs.filter(t => { const p = projects.find(x => x.id === t.projectId); return t.type === "income" && p && p.clientId === c.id; }).reduce((s, t) => s + Number(t.amount), 0);
        if (rev > 0) byClient.push({ clientId: c.id, clientName: c.name, revenue: rev });
      });
      const byProject: { projectId: number; projectName: string; income: number; expense: number; profit: number }[] = [];
      projects.forEach(p => {
        const income = txs.filter(t => t.projectId === p.id && t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const expense = txs.filter(t => t.projectId === p.id && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        byProject.push({ projectId: p.id, projectName: p.name, income, expense, profit: income - expense });
      });
      res.json({ byMonth: Object.entries(byMonth), byClient, byProject });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // --- In-app notifications (deadline, payment alerts) ---
  app.get("/api/notifications", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      const now = new Date();
      const day = 24 * 60 * 60 * 1000;
      const alerts: { type: string; projectId: number; title: string; message: string; date: string }[] = [];
      projects.forEach(p => {
        if (p.status !== "active") return;
        const deadline = new Date(p.deadlineDate);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / day);
        if (daysLeft < 0) {
          alerts.push({ type: "deadline_overdue", projectId: p.id, title: p.name, message: "Muddat o'tgan", date: p.deadlineDate });
        } else if (daysLeft <= 1) {
          alerts.push({ type: "deadline_1", projectId: p.id, title: p.name, message: "1 kun qoldi", date: p.deadlineDate });
        } else if (daysLeft <= 3) {
          alerts.push({ type: "deadline_3", projectId: p.id, title: p.name, message: `${daysLeft} kun qoldi`, date: p.deadlineDate });
        } else if (daysLeft <= 7) {
          alerts.push({ type: "deadline_7", projectId: p.id, title: p.name, message: `${daysLeft} kun qoldi`, date: p.deadlineDate });
        }
        if ((p.paymentProgress ?? 0) < 100 && daysLeft < 3) {
          alerts.push({ type: "payment_alert", projectId: p.id, title: p.name, message: `To'lov ${p.paymentProgress ?? 0}%`, date: p.deadlineDate });
        }
      });
      res.json(alerts.slice(0, 20));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // --- Calendar events: boshlanish (yashil) va tugash/muddat (qizil) ---
  app.get("/api/calendar/events", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      const events: { id: string; projectId: number; title: string; date: string; type: "start" | "deadline"; status: string }[] = [];
      for (const p of projects) {
        events.push({
          id: `${p.id}-start`,
          projectId: p.id,
          title: p.name,
          date: p.startDate,
          type: "start",
          status: p.status,
        });
        events.push({
          id: `${p.id}-deadline`,
          projectId: p.id,
          title: p.name,
          date: p.deadlineDate,
          type: "deadline",
          status: p.status,
        });
      }
      res.json(events);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // --- AI Risk Analyzer ---
  app.post(api.ai.analyzeRisk.path, async (req, res) => {
    try {
      const project = await storage.getProject(Number(req.params.id));
      if (!project) return res.status(404).json({ message: "Project not found" });

      // Here you'd call OpenAI. Using a mock for now.
      // import { openai } from "./replit_integrations/chat/client";
      
      const riskLevel = "MEDIUM";
      const recommendation = "To'lovlar kechikmoqda. Mijoz bilan bog'lanish tavsiya etiladi.";
      
      await storage.updateProject(project.id, { riskLevel });
      res.json({ riskLevel, recommendation });
    } catch (err) {
      res.status(500).json({ message: "AI Risk analysis failed" });
    }
  });

  return httpServer;
}
