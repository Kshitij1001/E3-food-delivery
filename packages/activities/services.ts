// import { activityInfo, log } from '@temporalio/activity'

// export const notificationService = {
//   sendNotification({ type, message }: { type: string; message: string }) {
//     log.info('Sent notification', { type, message })
//   },
// }

// export const paymentService = {
//   async charge(rupees: number) {

//     await fetch('http://localhost:1001/transaction/debit', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ amount: rupees })
//     })
//     log.info('Charged', { rupees })
//   },

//   async refund(rupees: number) {
//     await fetch('http://localhost:1001/transaction/credit', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ amount: rupees }),
//     })
//     log.info('Refunded', { rupees })
//   },
// }
