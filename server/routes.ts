import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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

  // --- Dashboard ---
  app.get(api.dashboard.stats.path, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const txs = await storage.getTransactions();
      const tasksList = await storage.getTasksByProject(0); // We'd need a better way to get all tasks for global hours

      const activeProjects = projects.filter(p => p.status === 'active').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const delayedProjects = projects.filter(p => p.status === 'delayed').length;

      const totalRevenue = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const netProfit = totalRevenue - totalExpenses;

      // Mocking total hours for now
      const totalHours = 120; 

      res.json({
        activeProjects,
        completedProjects,
        delayedProjects,
        totalRevenue,
        totalExpenses,
        netProfit,
        totalHours
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Error" });
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
      // Extend schema with coercion for numeric fields if they come as strings
      const bodySchema = api.projects.create.input.extend({
        clientId: z.coerce.number().optional(),
        budget: z.union([z.string(), z.number()]).transform(v => String(v)),
      });
      const input = bodySchema.parse(req.body);
      const project = await storage.createProject({
        ...input,
        startDate: new Date(input.startDate),
        deadlineDate: new Date(input.deadlineDate)
      });
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create project" });
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
      const input = api.tasks.create.input.parse(req.body);
      const task = await storage.createTask({ ...input, projectId: Number(req.params.projectId) });
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
      const input = api.tasks.update.input.parse(req.body);
      const updated = await storage.updateTask(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Task not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // --- Time Entries ---
  app.post(api.timeEntries.create.path, async (req, res) => {
    try {
      const input = api.timeEntries.create.input.parse(req.body);
      
      const userId = (req.user as any)?.claims?.sub || "system"; // fallback if no auth
      
      const entry = await storage.createTimeEntry({ 
        ...input, 
        taskId: Number(req.params.taskId),
        userId
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

  app.post(api.invoices.create.path, async (req, res) => {
    try {
      const input = api.invoices.create.input.extend({
        projectId: z.coerce.number(),
        amount: z.union([z.string(), z.number()]).transform(v => String(v)),
      }).parse(req.body);
      const invoice = await storage.createInvoice({
        ...input,
        dueDate: new Date(input.dueDate)
      });
      res.status(201).json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create invoice" });
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
