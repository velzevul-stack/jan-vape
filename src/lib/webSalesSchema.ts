import { getRepo } from './db'

let customerTelegramColumnReady: boolean | null = null

export async function webSalesSupportsCustomerTelegram(): Promise<boolean> {
  if (customerTelegramColumnReady !== null) {
    return customerTelegramColumnReady
  }
  const saleRepo = await getRepo('WebSale')
  try {
    await saleRepo.query('SELECT "customerTelegram" FROM "web_sales" LIMIT 0')
    customerTelegramColumnReady = true
  } catch {
    customerTelegramColumnReady = false
  }
  return customerTelegramColumnReady
}
