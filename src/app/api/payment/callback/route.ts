import { NextRequest, NextResponse } from 'next/server'
import { getPaymentStatus, isPaymentSuccessful, isPaymentFailed } from '@/lib/tatrapay'

/**
 * GET /api/payment/callback
 *
 * Callback URL that TatraPay redirects to after payment.
 * Verifies payment status and redirects to appropriate page.
 *
 * Query params:
 * - orderId: Your order ID (passed when creating payment)
 * - paymentId: TatraPay payment ID (added by TatraPay)
 *
 * Flow:
 * 1. Customer completes payment on TatraPay
 * 2. TatraPay redirects here
 * 3. We verify payment status via API
 * 4. Update order in database
 * 5. Send confirmation email (if successful)
 * 6. Redirect to success/failed page
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    console.log('💳 Payment callback received:', { orderId })

    if (!orderId) {
      return redirectToResult('error', 'Missing order ID')
    }

    // TODO: Get the stored payment ID from your database
    // const order = await db.orders.findUnique({ where: { id: orderId } })
    // const paymentId = order.tatrapay_payment_id

    // For demo, we'll use a placeholder - replace with your DB lookup
    const paymentId = 'YOUR_STORED_PAYMENT_ID'

    if (!paymentId || paymentId === 'YOUR_STORED_PAYMENT_ID') {
      console.error('❌ No payment ID found for order:', orderId)
      // In real implementation, fetch from database
      return redirectToResult('error', 'Payment not found')
    }

    // Get payment status from TatraPay
    const paymentStatus = await getPaymentStatus(paymentId)

    console.log('📊 TatraPay payment status:', {
      paymentId: paymentStatus.paymentId,
      status: paymentStatus.status,
      transactionId: paymentStatus.transactionId
    })

    // TODO: Update order in database with payment status
    // await db.orders.update({
    //   where: { id: orderId },
    //   data: {
    //     tatrapay_status: paymentStatus.status,
    //     tatrapay_transaction_id: paymentStatus.transactionId,
    //     payment_status: mapToInternalStatus(paymentStatus.status)
    //   }
    // })

    // Handle payment result
    if (isPaymentSuccessful(paymentStatus.status)) {
      console.log('✅ Payment successful')

      // TODO: Mark order as paid
      // await db.orders.update({
      //   where: { id: orderId },
      //   data: { status: 'paid' }
      // })

      // TODO: Send confirmation email
      // await sendConfirmationEmail(order)

      return redirectToResult('success', 'Payment successful')

    } else if (isPaymentFailed(paymentStatus.status)) {
      console.log('❌ Payment failed:', paymentStatus.status)

      // Include orderId for retry option
      return redirectToResult('failed', 'Payment was declined', orderId)

    } else {
      // Payment still pending (e.g., bank transfer)
      console.log('⏳ Payment pending:', paymentStatus.status)

      return redirectToResult('pending', 'Awaiting payment confirmation')
    }

  } catch (error) {
    console.error('❌ Payment callback error:', error)
    return redirectToResult('error', 'Error verifying payment')
  }
}

/**
 * Redirect to appropriate result page
 */
function redirectToResult(
  status: 'success' | 'failed' | 'pending' | 'error',
  message: string,
  orderId?: string
): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const params = new URLSearchParams({ message })

  if (orderId) {
    params.set('orderId', orderId)
  }

  const redirectUrl = `${baseUrl}/payment/${status}?${params.toString()}`

  return NextResponse.redirect(redirectUrl)
}
