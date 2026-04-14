import { z } from "zod";

const emailSchema = z
  .email("Please provide a valid email address.")
  .transform((value) => value.trim().toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password cannot exceed 128 characters.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Use a valid HEX color.")
    .optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    color: z
      .string()
      .trim()
      .regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Use a valid HEX color.")
      .optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No category changes were provided.",
  });

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.string().trim().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  categoryId: z.string().trim().optional(),
  reminderMinutes: z.coerce.number().int().min(5).max(43200).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    completed: z.boolean().optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.string().trim().nullable().optional(),
    categoryId: z.string().trim().nullable().optional(),
    reminderMinutes: z.coerce.number().int().min(5).max(43200).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No task changes were provided.",
  });

export const reorderTasksSchema = z.object({
  orderedIds: z.array(z.string().trim()).min(1),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: emailSchema.optional(),
    reminderLeadMinutes: z.coerce.number().int().min(5).max(43200).optional(),
    themePreference: z.enum(["system", "light", "dark"]).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No profile changes were provided.",
  });
