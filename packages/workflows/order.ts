import {
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  proxyActivities,
  CancellationScope,
  CancelledFailure,
  sleep,
} from '@temporalio/workflow'
import { errorMessage, getProductById, Product } from '@fooddelivery/common'
import type * as activities from '@fooddelivery/activities'

export type OrderState = 'Charging card' | 'Paid' | 'Picked up' | 'Delivered' | 'Refunding' | 'Failed'

export interface OrderStatus {
  productId: number
  state: OrderState
  deliveredAt?: Date
}

export interface OrderStatusWithOrderId extends OrderStatus {
  orderId: string
}

export interface OrderStatusWithOrderIdDao {
  orderId: string
  productId: number
  state: OrderState
  deliveredAt?: string
}

export const pickedUpSignal = defineSignal('pickedUp')
export const deliveredSignal = defineSignal('delivered')
export const getStatusQuery = defineQuery<OrderStatus>('getStatus')

const { chargeCustomer, refundOrder, sendPushNotification } = proxyActivities<typeof activities>({
  startToCloseTimeout: '2m',
  retry: {
    initialInterval: '5s',
    maximumInterval: '5s', // Just for demo purposes. Usually this should be larger.
  },
})

class FoodOrderWorkflow {
  private productId: number
  private state: OrderState
  private product: Product
  private scope: CancellationScope
  private deliveredAt?: Date

  constructor(productId: number) {
    this.productId = productId
    this.state = 'Charging card'
    this.product = getProductById(productId)!
    this.scope = new CancellationScope({cancellable: true, timeout: '5 min'})
  }

  public async executeWorkflow() {
    try {
      return await this.scope.run(async () => await this.workflowImplementation())
    } catch (err) {
      await CancellationScope.nonCancellable(async () => {
        if (this.state === 'Paid' || this.state === 'Refunding') {
          await refundOrder(this.product)
          await sendPushNotification(`❌ ${errorMessage(err)} Your payment has been refunded 💸`)
        } else
          await sendPushNotification(`❌ ${errorMessage(err)}`)
        this.state = 'Failed'
        await sleep('10 sec')
        await sendPushNotification('✍️ Please provide your feedback to improve our service!')
      })
      return `Order failed: ${errorMessage(err)}`
    }
  }

  private async workflowImplementation(): Promise<string> {
    this.setSignalAndQueryHandlers()

    try {
      await chargeCustomer(this.product);
    } catch (err) {
      // await workflow until its cancelled or reset from the ui.
      await Promise.race([
        this.scope.cancelRequested,
        sleep('5 min')
      ]).catch(() => { /* ignore */ })
      throw new CancelledFailure(`Failed to charge customer for ${this.product.name}. ${errorMessage(err)}`)
    }

    this.state = 'Paid'

    // Giving 1 minute for the driver to pick up the food.
    // If not picked up in time, we cancel the order and refund the customer.
    const notPickedUpInTime = !(await condition(() => this.state === 'Picked up', '1 min'))
    if (notPickedUpInTime) {
      this.state = 'Refunding'
      throw new CancelledFailure('Not picked up in time.')
    }

    await sendPushNotification('🚗 Order picked up')

    // Giving 3 minutes for the driver to deliver the food. 
    // If not delivered in time, we cancel the order and refund the customer.
    const notDeliveredInTime = !(await condition(() => this.state === 'Delivered', '3 min'))
    if (notDeliveredInTime) {
      this.state = 'Refunding'
      throw new CancelledFailure('Not delivered in time.')
    }

    await sendPushNotification('✅ Order delivered!')

    // Waiting for 10 seconds before asking for rating.
    // In real world, this could be several hours or days. 
    // Note: Temporal supports workflows that run for years.
    await sleep('10 sec')
    await sendPushNotification('✍️ Please rate your delivery experience!')

    return 'Order completed successfully'
  }

  private setSignalAndQueryHandlers() {
    setHandler(pickedUpSignal, () => {
      if (this.state === 'Paid') {
        this.state = 'Picked up'
      }
    })

    setHandler(deliveredSignal, () => {
      if (this.state === 'Picked up') {
        this.state = 'Delivered'
        this.deliveredAt = new Date()
      }
    })

    setHandler(getStatusQuery, () => {
      return { state: this.state, deliveredAt: this.deliveredAt, productId: this.productId }
    })
  }
}

export async function order(productId: number): Promise<string> {
  const workflow = new FoodOrderWorkflow(productId)
  return await workflow.executeWorkflow()
}
