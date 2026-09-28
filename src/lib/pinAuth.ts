import { requireOwner } from './customerAuth'
export async function checkHistoryAccess(ownerId: string, _pin?: string): Promise<{ ok: boolean; error?: string; status: number }> {
  return await requireOwner(ownerId)
    ? { ok: true, status: 200 }
    : { ok: false, error: 'Verify your email to access your saved CVs and credits.', status: 401 }
}
