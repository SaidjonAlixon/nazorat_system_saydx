import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  clients, projects, tasks, timeEntries, transactions, invoices,
  type Client, type InsertClient,
  type Project, type InsertProject, type UpdateProjectRequest,
  type Task, type InsertTask, type UpdateTaskRequest,
  type TimeEntry, type InsertTimeEntry,
  type Transaction, type InsertTransaction,
  type Invoice, type InsertInvoice,
} from "@shared/schema";

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project>;
  
  // Tasks
  getTasksByProject(projectId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: UpdateTaskRequest): Promise<Task>;
  
  // Time Entries
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  
  // Transactions
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Invoices
  getInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
}

export class DatabaseStorage implements IStorage {
  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, updates: UpdateProjectRequest): Promise<Project> {
    const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return updated;
  }

  // Tasks
  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, updates: UpdateTaskRequest): Promise<Task> {
    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return updated;
  }

  // Time Entries
  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [newEntry] = await db.insert(timeEntries).values(entry).returning();
    // Also update logged minutes in task
    const task = await db.select().from(tasks).where(eq(tasks.id, entry.taskId)).then(res => res[0]);
    if (task) {
      await db.update(tasks).set({ loggedMinutes: task.loggedMinutes + entry.durationMinutes }).where(eq(tasks.id, entry.taskId));
    }
    return newEntry;
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(transaction).returning();
    return newTx;
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }
}

export const storage = new DatabaseStorage();
