import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { applications } from "../db/schema";
import { currentUser } from "./auth-provider";

const fields = ["company", "role", "url", "status", "applied_date", "deadline", "next_step", "notes", "next_step_due_date", "next_step_done"] as const;
const limits: Record<string, number> = {company:160, role:200, url:2000, status:30, applied_date:10, deadline:10, next_step:300, notes:10000, next_step_due_date:10};
const statuses = new Set(["saved", "applied", "assessment", "interview", "offer", "rejected", "withdrawn"]);
type Input = {company:string; role:string; url:string; status:string; applied_date:string; deadline:string; next_step:string; notes:string; next_step_due_date:string; next_step_done:boolean};

export function validate(payload: unknown): Input {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some(key => !(fields as readonly string[]).includes(key))) {
    throw new Error("Please submit valid application fields.");
  }
  const source = payload as Record<string, unknown>;
  const values: Record<string, string | boolean> = {};
  for (const key of fields) {
    if (key === "next_step_done") {
      const value = source[key] ?? false;
      if (typeof value !== "boolean") throw new Error("Task completion must be true or false.");
      values[key] = value;
      continue;
    }
    const value = source[key] ?? (key === "status" ? "saved" : "");
    if (typeof value !== "string" || value.length > limits[key]) throw new Error(`The ${key} field must be text within the allowed length.`);
    values[key] = value.trim();
  }
  const data = values as Input;
  if (!data.company || !data.role) throw new Error("Company and role are required.");
  if (!statuses.has(data.status)) throw new Error("Please select a valid application status.");
  for (const key of ["applied_date", "deadline", "next_step_due_date"] as const) {
    const value = data[key];
    if (!value) continue;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000") || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) {
      throw new Error("Dates must be valid and use YYYY-MM-DD format.");
    }
  }
  if (!data.next_step && (data.next_step_due_date || data.next_step_done)) throw new Error("Add a next step before setting its due date or marking it complete.");
  if (data.url) {
    try {
      const url = new URL(data.url);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error();
    } catch { throw new Error("The job URL must start with http:// or https:// and include a hostname."); }
  }
  return data;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {status, headers: {"Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"}});
}

function publicRecord(row: typeof applications.$inferSelect) {
  const {owner_id: _owner, ...record} = row;
  return record;
}

export async function handleApplications(request: Request, id?: string): Promise<Response> {
  const user = await currentUser();
  if (!user) return json({error:"Please sign in to continue."}, 401);
  const method = request.method;
  if (method !== "GET") {
    const origin = request.headers.get("Origin");
    const host = new URL(request.url).host;
    let originHost = "";
    try { if (origin) originHost = new URL(origin).host; } catch { /* Reject malformed origins below. */ }
    if (origin && originHost !== host) return json({error:"Request origin is not allowed."},403);
  }
  const number = id === undefined ? undefined : Number(id);
  if (id !== undefined && (!/^\d+$/.test(id) || !Number.isSafeInteger(number) || number! < 1)) return json({error:"Application not found."},404);
  try {
    const db = getDb();
    if (method === "GET" && id === undefined) {
      const rows = await db.select().from(applications).where(eq(applications.owner_id,user.ownerId)).orderBy(desc(applications.created_at),desc(applications.id));
      return json(rows.map(publicRecord));
    }
    if (method === "DELETE" && number !== undefined) {
      const deleted = await db.delete(applications).where(and(eq(applications.id,number), eq(applications.owner_id,user.ownerId))).returning({id:applications.id});
      return deleted.length ? json({deleted:number}) : json({error:"Application not found."},404);
    }
    if (!["POST","PUT"].includes(method)) return json({error:"Endpoint not found."},404);
    if ((request.headers.get("Content-Type") || "").split(";")[0].trim() !== "application/json") return json({error:"Content-Type must be application/json."},415);
    const advertised = Number(request.headers.get("Content-Length"));
    if (advertised > 65536) return json({error:"The request body is empty or too large."},400);
    const raw = await request.text();
    if (!raw || new TextEncoder().encode(raw).byteLength > 65536) return json({error:"The request body is empty or too large."},400);
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { return json({error:"Invalid JSON."},400); }
    let values: Input;
    try { values = validate(payload); } catch (error) { return json({error:(error as Error).message},400); }
    const now = new Date().toISOString();
    if (method === "POST" && id === undefined) {
      const [row] = await db.insert(applications).values({...values,owner_id:user.ownerId,created_at:now,updated_at:now}).returning();
      return json(publicRecord(row),201);
    }
    if (method === "PUT" && number !== undefined) {
      const [row] = await db.update(applications).set({...values,updated_at:now}).where(and(eq(applications.id,number),eq(applications.owner_id,user.ownerId))).returning();
      return row ? json(publicRecord(row)) : json({error:"Application not found."},404);
    }
    return json({error:"Endpoint not found."},404);
  } catch {
    console.error("Application database operation failed", {method});
    return json({error:"Could not save changes. Please try again."},500);
  }
}
