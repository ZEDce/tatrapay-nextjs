import { NextRequest, NextResponse } from 'next/server'
import { createPayment, TatraPayMethod } from '@/lib/tatrapay'

/**
 * POST /api/payment/create
 *
 * Creates a TatraPay payment and returns redirect URL or bank transfer details.
 *
 * Request body:
 * {
 *   orderId: string,              // Your order ID
 *   paymentMethod: 'CARD_PAY' | 'BANK_TRANSFER',
 *   amount: number,               // Amount in cents (7900 = 79.00 EUR)
 *   currency: 'EUR' | 'CZK',
 *   customer: {
 *     email: string,
 *     firstName: string,
 *     lastName: string,
 *     phone?: string
 *   },
 *   description?: string,
 *   language?: 'sk' | 'cs' | 'en'
 * }
 *
 * Response:
 * {
 *   success: true,
 *   paymentId: string,
 *   redirectUrl?: string,         // For CARD_PAY - redirect customer here
 *   bankTransfer?: {              // For BANK_TRANSFER
 *     iban: string,
 *     bic: string,
 *     variableSymbol: string,
 *     amount: number,
 *     currency: string
 *   }
 * }
 */

interface CreatePaymentRequestBody {
  orderId: string
  paymentMethod: 'CARD_PAY' | 'BANK_TRANSFER'
  amount: number
  currency: 'EUR' | 'CZK'
  customer: {
    email: string
    firstName: string
    lastName: string
    phone?: string
  }
  description?: string
  language?: 'sk' | 'cs' | 'en'
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequestBody = await request.json()

    // Validate required fields
    if (!body.orderId || !body.paymentMethod || !body.amount || !body.customer?.email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate payment method
    if (!['CARD_PAY', 'BANK_TRANSFER'].includes(body.paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    // Get customer's IP address (required by TatraPay)
    const customerIpAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1'

    // Build callback URL
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    const returnUrl = `${baseUrl}/api/payment/callback?orderId=${body.orderId}`
    const notificationUrl = `${baseUrl}/api/payment/webhook`

    console.log('💳 Creating payment:', {
      orderId: body.orderId,
      method: body.paymentMethod,
      amount: body.amount,
      currency: body.currency,
      customerIp: customerIpAddress
    })

    // Create TatraPay payment
    const payment = await createPayment({
      paymentMethod: body.paymentMethod as TatraPayMethod,
      amount: {
        amount: body.amount,
        currency: body.currency
      },
      merchantReference: body.orderId,
      description: body.description || `Order ${body.orderId}`,
      customer: {
        firstName: body.customer.firstName,
        lastName: body.customer.lastName,
        email: body.customer.email,
        phone: body.customer.phone
      },
      returnUrl,
      notificationUrl,
      language: body.language || 'sk',
      customerIpAddress
    })

    // TODO: Store payment.paymentId in your database
    // await db.orders.update({
    //   where: { id: body.orderId },
    //   data: { tatrapay_payment_id: payment.paymentId }
    // })

    console.log('✅ Payment created:', {
      paymentId: payment.paymentId,
      hasRedirectUrl: !!payment.redirectUrl,
      hasBankTransfer: !!payment.bankTransferInfo
    })

    // Return response based on payment method
    if (body.paymentMethod === 'CARD_PAY' && payment.redirectUrl) {
      return NextResponse.json({
        success: true,
        paymentId: payment.paymentId,
        redirectUrl: payment.redirectUrl
      })
    } else if (body.paymentMethod === 'BANK_TRANSFER' && payment.bankTransferInfo) {
      return NextResponse.json({
        success: true,
        paymentId: payment.paymentId,
        bankTransfer: payment.bankTransferInfo
      })
    } else {
      return NextResponse.json({
        success: true,
        paymentId: payment.paymentId,
        redirectUrl: payment.redirectUrl,
        bankTransfer: payment.bankTransferInfo
      })
    }

  } catch (error) {
    console.error('❌ Payment creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed'
      },
      { status: 500 }
    )
  }
}
