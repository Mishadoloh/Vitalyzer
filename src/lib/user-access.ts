export const SUSPENSION_PROVIDER = 'admin-suspension';

export function hasSuspensionMarker(user: { accounts: Array<{ provider: string }> }): boolean {
  return user.accounts.some((account) => account.provider === SUSPENSION_PROVIDER);
}
