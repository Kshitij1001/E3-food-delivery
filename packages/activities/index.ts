import { Product } from '@fooddelivery/common'
import { ApplicationFailure, log } from '@temporalio/activity'

export async function sendPushNotification(message: string): Promise<void> {
  log.info('Sent notification', { type: 'push', message })
}

export async function chargeCustomer(product: Product): Promise<string> {
  let result: Response
  try {
    result = await fetch('http://localhost:1001/transaction/debit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: product.rupees })
    })
    if (result.status === 200) return `Customer charged ₹${product.rupees} successfully`
  } catch (err) {
    throw ApplicationFailure.create({ message: `Payment service unreachable.` })
  }
  throw ApplicationFailure.create({ nonRetryable: true, message: `Payment failed with status ${result.status}. Response message: ${(await result.json())?.['message']}` })
}

export async function refundOrder(product: Product): Promise<string> {
  await fetch('http://localhost:1001/transaction/credit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: product.rupees }),
  })
  return `Refunded ₹${product.rupees} successfully`
}