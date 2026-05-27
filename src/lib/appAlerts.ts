import { getRepo } from './db'
import type { AppAlertType } from '../entities/AppAlert'

export async function enqueueAppAlert(
  type: AppAlertType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const repo = await getRepo('AppAlert')
    const entry = repo.create({ type, payload })
    await repo.save(entry)
  } catch (err) {
    console.error('[appAlerts] failed to save alert', { type, err })
  }
}
