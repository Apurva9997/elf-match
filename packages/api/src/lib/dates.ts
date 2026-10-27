import { z } from "zod";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day as YYYY-MM-DD. Rejects HTML and impossible dates. */
export function parseIsoDate(value: string): string | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

export const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => parseIsoDate(value) !== null, "Use a real calendar date")
  .transform((value) => parseIsoDate(value) as string);

/** Empty string clears the date. Anything else must be YYYY-MM-DD. */
export const optionalIsoDateSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value == null || value === "") return null;
    const parsed = parseIsoDate(value);
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use a real calendar date",
      });
      return z.NEVER;
    }
    return parsed;
  });
