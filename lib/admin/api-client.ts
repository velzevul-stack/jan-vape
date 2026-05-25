export async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (res.status === 401) {
      return { ok: false, error: 'Нужна авторизация. Обновите страницу и войдите снова.' }
    }

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        typeof body.error === 'string'
          ? body.error
          : `Ошибка ${res.status}`
      return { ok: false, error: message }
    }

    return { ok: true, data: body as T }
  } catch {
    return { ok: false, error: 'Сеть недоступна' }
  }
}
