import { z } from 'zod';

export function getZodErrorMessage(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) return 'Data yang diisi tidak valid.';
  return `${firstIssue.path.join('.') ? firstIssue.path.join('.') + ': ' : ''}${firstIssue.message}`;
}
