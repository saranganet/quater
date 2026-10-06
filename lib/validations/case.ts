import { z } from "zod";

/**
 * Validates and normalizes Indian mobile numbers (+91 XXXXXXXXXX, 0XXXXXXXXXX, or 10 digits)
 */
export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[\s\-()]/g, ""))
  .refine(
    (val) => {
      // Must be 10 digits starting with 6-9, or +91 / 91 / 0 followed by 10 digits starting with 6-9
      const cleaned = val.replace(/^(\+91|91|0)/, "");
      return /^[6-9]\d{9}$/.test(cleaned);
    },
    {
      message: "Please enter a valid 10-digit Indian phone number (e.g. +91 98765 43210 or 9876543210)",
    }
  )
  .transform((val) => {
    const cleaned = val.replace(/^(\+91|91|0)/, "");
    return `+91${cleaned}`;
  });

/**
 * Validates CNR format (16-character alphanumeric code)
 * Standard pattern: [A-Z]{4}\d{12} or 16 alphanumeric characters
 */
export const cnrSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (val) => /^[A-Z0-9]{16}$/.test(val),
    {
      message: "CNR Number must be exactly 16 alphanumeric characters (e.g. DLND020047882015)",
    }
  );

export const caseContactInputSchema = z.object({
  name: z.string().trim().min(2, "Contact name must be at least 2 characters"),
  phone: indianPhoneSchema,
  type: z.enum(["LAWYER", "CLIENT"]),
  role: z.string().trim().optional(),
});

export const createCaseSchema = z
  .object({
    cnr: z.string().trim().optional(),
    caseNumber: z.string().trim().optional(),
    caseType: z.string().trim().optional(),
    filingYear: z.string().trim().optional(),
    courtName: z.string().trim().optional(),
    state: z.string().trim().optional(),
    firmId: z.string().optional(),
    lawyerName: z.string().trim().min(2, "Lawyer name must be at least 2 characters"),
    lawyerPhone: indianPhoneSchema,
    clientName: z.string().trim().min(2, "Client name must be at least 2 characters"),
    clientWhatsAppNumber: indianPhoneSchema,
    additionalLawyers: z
      .array(
        z.object({
          name: z.string().trim().min(2, "Lawyer name must be at least 2 characters"),
          phone: indianPhoneSchema,
          role: z.string().trim().optional(),
        })
      )
      .optional(),
    additionalClients: z
      .array(
        z.object({
          name: z.string().trim().min(2, "Client name must be at least 2 characters"),
          phone: indianPhoneSchema,
          role: z.string().trim().optional(),
        })
      )
      .optional(),
  })
  .refine(
    (data) => Boolean(data.cnr?.trim() || data.caseNumber?.trim()),
    {
      message: "Please enter either a CNR Number or a Case Number.",
      path: ["cnr"],
    }
  );

export const simulateUpdateSchema = z.object({
  nextHearingDate: z.string().optional(),
  stage: z.string().optional(),
  addOrder: z.boolean().optional(),
  orderDescription: z.string().optional(),
  caseStatus: z.string().optional(),
});
