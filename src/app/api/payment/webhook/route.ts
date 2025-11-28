import { NextRequest, NextResponse } from 'next/server'
import { getPaymentStatus, isPaymentSuccessful, isPaymentFailed, mapToInternalStatus } from '@/lib/tatrapay'

/**
 * POST /api/payment/webhook
 *
 * Webhook endpoint for TatraPay status updates.
 * TatraPay will call this URL when payment status changes.
 *
 * This is useful for:
 * - Bank transfers (status updates when payment arrives)
 * - Delayed card authorizations
 * - Refunds and chargebacks
 *
 * Request body from TatraPay:
 * {
 *   paymentId: string,
 *   status: string,
 *   merchantReference: string,
 *   ...
 * }
 */

interface WebhookPayload {
  paymentId: string
  status: string
  merchantReference: string
  transactionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json()

    console.log('🔔 TatraPay webhook received:', {
      paymentId: payload.paymentId,
      status: payload.status,
      merchantReference: payload.merchantReference
    })

    // Verify the payment status by calling TatraPay API
    // This ensures the webhook payload is legitimate
    const verifiedStatus = await getPaymentStatus(payload.paymentId)

    console.log('✅ Verified payment status:', {
      status: verifiedStatus.status,
      transactionId: verifiedStatus.transactionId
    })

    // TODO: Find order by merchantReference (your order ID)
    // const order = await db.orders.findFirst({
    //   where: { id: payload.merchantReference }
    // })

    // TODO: Update order status in database
    // const internalStatus = mapToInternalStatus(verifiedStatus.status)
    // await db.orders.update({
    //   where: { id: order.id },
    //   data: {
    //     tatrapay_status: verifiedStatus.status,
    //     tatrapay_transaction_id: verifiedStatus.transactionId,
    //     payment_status: internalStatus
    //   }
    // })

    // Handle status changes
    if (isPaymentSuccessful(verifiedStatus.status)) {
      console.log('✅ Payment completed via webhook')

      // TODO: Process successful payment
      // - Mark order as paid
      // - Send confirmation email
      // - Generate invoice
      // - etc.

    } else if (isPaymentFailed(verifiedStatus.status)) {
      console.log('❌ Payment failed via webhook')

      // TODO: Handle failed payment
      // - Mark order as failed
      // - Send failure notification
      // - etc.
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)

    // Return 500 so TatraPay will retry
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * TatraPay may also send GET requests to verify webhook URL
 */
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' })
}
