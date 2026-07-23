export function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && getAdminEmails().has(email.trim().toLowerCase()));
}
