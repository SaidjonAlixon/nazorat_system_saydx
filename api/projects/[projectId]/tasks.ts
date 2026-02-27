import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../../_lib";
import { api } from "../../../shared/routes";

/**
 * GET/POST /api/projects/:projectId/tasks
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const projectId = Number((req.query as { projectId?: string }).projectId);
  if (!projectId || Number.isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid projectId" });
  }
  if (req.method === "GET") {
    try {
      const tasks = await storage.getTasksByProject(projectId);
      return res.json(tasks);
    } catch (err) {
      console.error("[api/projects/:projectId/tasks GET]", err);
      return res.status(500).json({ message: "Internal Error" });
    }
  }
  if (req.method === "POST") {
    try {
      const body = api.tasks.create.input
        .extend({ parentTaskId: z.coerce.number().optional() })
        .parse(req.body);
      const { parentTaskId, ...rest } = body;
      const task = await storage.createTask({
        ...rest,
        projectId,
        ...(parentTaskId != null && { parentTaskId }),
      });
      return res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      return res.status(500).json({ message: "Failed to create task" });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}
