import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({autoIncrement: true}),
  owner_id: text("owner_id").notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  url: text("url").notNull().default(""),
  status: text("status").notNull().default("saved"),
  applied_date: text("applied_date").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  next_step: text("next_step").notNull().default(""),
  notes: text("notes").notNull().default(""),
  next_step_due_date: text("next_step_due_date").notNull().default(""),
  next_step_done: integer("next_step_done", {mode: "boolean"}).notNull().default(false),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
}, table => [index("applications_owner_idx").on(table.owner_id)]);
