import { sql, relations } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Export models from integrations ---
export * from "./models/auth";
export * from "./models/chat";

// We need to import users to use them in relations
import { users } from "./models/auth";

// --- Application Tables ---

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  score: integer("score").default(100),
  isBlacklisted: boolean("is_blacklisted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  type: text("type").notNull(), // web, bot, dizayn, server, marketing
  budget: numeric("budget").notNull(),
  currency: text("currency").notNull().default("UZS"), // UZS, USD
  startDate: timestamp("start_date").notNull(),
  deadlineDate: timestamp("deadline_date").notNull(),
  status: text("status").notNull().default("active"), // active, completed, delayed
  progress: integer("progress").default(0).notNull(), // 0-100%
  paymentProgress: integer("payment_progress").default(0).notNull(), // 0-100%
  riskLevel: text("risk_level").default("LOW"), // LOW, MEDIUM, HIGH
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("medium").notNull(), // low, medium, high
  status: text("status").default("todo").notNull(), // todo, in progress, done
  loggedMinutes: integer("logged_minutes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  durationMinutes: integer("duration_minutes").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  description: text("description"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  type: text("type").notNull(), // income, expense
  amount: numeric("amount").notNull(),
  currency: text("currency").default("UZS").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  invoiceNumber: text("invoice_number").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("UZS").notNull(),
  status: text("status").default("unpaid").notNull(), // paid, unpaid, partial
  dueDate: timestamp("due_date").notNull(),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations ---

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  transactions: many(transactions),
  invoices: many(invoices),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  timeEntries: many(timeEntries),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

// --- Zod Schemas ---

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, riskLevel: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, loggedMinutes: true });
export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true, date: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, date: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });

// --- Types ---

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProjectRequest = Partial<InsertProject>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTaskRequest = Partial<InsertTask>;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
