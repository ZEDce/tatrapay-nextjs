/**
 * TatraPay+ API Client for Next.js
 *
 * Complete integration with Tatra banka's TatraPay+ payment gateway.
 * Supports CARD_PAY and BANK_TRANSFER payment methods.
 *
 * @version 1.0.0
 * @author LIBE s.r.o.
 * @license MIT
 *
 * API Version: 1.5.1
 * @see https://developer.tatrabanka.sk
 */

// =============================================================================
// Configuration
// =============================================================================

const TATRAPAY_CONFIG = {
  sandbox: {
    baseUrl: 'https://api.tatrabanka.sk/tatrapayplus/sandbox',
    tokenUrl: 'https://api.tatrabanka.sk/tatrapayplus/sandbox/auth/oauth/v2/token'
  },
  production: {
    baseUrl: 'https://api.tatrabanka.sk/tatrapayplus/production',
    tokenUrl: 'https://api.tatrabanka.sk/tatrapayplus/production/auth/oauth/v2/token'
  }
}

// =============================================================================
// Types
// =============================================================================

/**
 * Available payment methods
 */
export type TatraPayMethod = 'CARD_PAY' | 'BANK_TRANSFER' | 'QR_PAY' | 'PAY_LATER'

/**
 * ISO 20022 Payment Status Codes
 *
 * IMPORTANT: TatraPay uses ISO 20022 codes, NOT human-readable names!
 * For example, successful card payment returns 'ACSC', not 'SETTLED'.
 */
export type TatraPayStatus =
  // Success statuses - payment completed
  | 'ACCC'    // Accepted Credit Completion - payment fully completed
  | 'ACSC'    // Accepted Settlement Completed - settlement completed (MOST COMMON FOR CARDS)
  | 'ACSP'    // Accepted Settlement In Progress - settlement in progress
  | 'ACCP'    // Accepted Customer Profile - accepted by customer bank
  | 'ACTC'    // Accepted Technical Check - passed technical validation
  | 'ACWC'    // Accepted With Change - accepted with modifications
  | 'ACWP'    // Accepted Without Posting - accepted, not yet posted
  | 'ACFC'    // Accepted Funds Checked - funds verified
  // Pending statuses - awaiting completion
  | 'RCVD'    // Received - payment received, processing
  | 'PDNG'    // Pending - awaiting processing
  | 'PATC'    // Partially Accepted - partially processed
  | 'PART'    // Partial - partial payment received
  // Failed statuses - payment unsuccessful
  | 'RJCT'    // Rejected - payment rejected
  | 'CANC'    // Cancelled - payment cancelled

/**
 * Credentials for TatraPay API
 */
export interface TatraPayCredentials {
  clientId: string
  clientSecret: string
  isSandbox: boolean
}

/**
 * OAuth token response
 */
export interface TatraPayToken {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  expiresAt: number // Unix timestamp when token expires
}

/**
 * Customer address
 */
export interface TatraPayAddress {
  streetName?: string
  buildingNumber?: string
  city?: string
  postalCode?: string
  country: string // ISO 3166-1 alpha-2 (e.g., 'SK', 'CZ')
}

/**
 * Customer information
 */
export interface TatraPayCustomer {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: TatraPayAddress
}

/**
 * Request to create a new payment
 */
export interface TatraPayCreatePaymentRequest {
  paymentMethod: TatraPayMethod
  amount: {
    amount: number      // In cents (e.g., 10000 = 100.00 EUR)
    currency: 'EUR' | 'CZK'
  }
  merchantReference: string  // Your internal order ID (no spaces!)
  description?: string
  customer?: TatraPayCustomer
  returnUrl: string          // Where to redirect after payment
  notificationUrl?: string   // Webhook for status updates
  language?: 'sk' | 'cs' | 'en'
  validityMinutes?: number   // How long payment link is valid (default 60)
  customerIpAddress: string  // Customer's IP address (REQUIRED by TatraPay)
}

/**
 * Response from creating a payment
 */
export interface TatraPayPaymentResponse {
  paymentId: string
  status: TatraPayStatus
  redirectUrl?: string      // URL to redirect customer to (for CARD_PAY)
  qrCodeData?: string       // QR code data for QR_PAY
  bankTransferInfo?: {
    iban: string
    bic: string
    variableSymbol: string
    amount: number
    currency: string
  }
  createdAt: string
  expiresAt?: string
}

/**
 * Response from getting payment status
 */
export interface TatraPayStatusResponse {
  paymentId: string
  status: TatraPayStatus
  merchantReference: string
  amount: {
    amount: number
    currency: string
  }
  paidAmount?: {
    amount: number
    currency: string
  }
  paymentMethod: TatraPayMethod
  createdAt: string
  updatedAt: string
  transactionId?: string
}

// =============================================================================
// Token Cache
// =============================================================================

let cachedToken: TatraPayToken | null = null

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get TatraPay credentials from environment variables
 */
function getCredentials(): TatraPayCredentials {
  const clientId = process.env.TATRAPAY_CLIENT_ID
  const clientSecret = process.env.TATRAPAY_CLIENT_SECRET
  const isSandbox = process.env.TATRAPAY_SANDBOX !== 'false'

  if (!clientId || !clientSecret) {
    throw new Error('TatraPay credentials not configured. Set TATRAPAY_CLIENT_ID and TATRAPAY_CLIENT_SECRET.')
  }

  return { clientId, clientSecret, isSandbox }
}

/**
 * Get API configuration based on environment
 */
function getConfig() {
  const credentials = getCredentials()
  return TATRAPAY_CONFIG[credentials.isSandbox ? 'sandbox' : 'production']
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return crypto.randomUUID()
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * Get OAuth 2.0 access token
 *
 * Uses client credentials flow. Tokens are cached until expiry.
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.access_token
  }

  const credentials = getCredentials()
  const config = getConfig()

  console.log('🔑 Requesting TatraPay access token...')

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      scope: 'TATRAPAYPLUS'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Token request failed:', response.status, errorText)
    throw new Error(`TatraPay authentication failed: ${response.status}`)
  }

  const tokenData = await response.json()

  // Cache the token
  cachedToken = {
    ...tokenData,
    expiresAt: Date.now() + (tokenData.expires_in * 1000)
  }

  console.log('✅ TatraPay token obtained, expires in', tokenData.expires_in, 'seconds')

  return tokenData.access_token
}

/**
 * Make an authenticated API request to TatraPay
 */
async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: unknown,
  customerIpAddress?: string,
  redirectUri?: string,
  preferredMethod?: TatraPayMethod
): Promise<T> {
  const token = await getAccessToken()
  const config = getConfig()
  const url = `${config.baseUrl}${endpoint}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Request-ID': generateRequestId()
  }

  // Add optional headers if provided
  if (customerIpAddress) {
    headers['IP-Address'] = customerIpAddress
  }
  if (redirectUri) {
    headers['Redirect-URI'] = redirectUri
  }
  if (preferredMethod) {
    headers['Preferred-Method'] = preferredMethod
  }

  const options: RequestInit = {
    method,
    headers
  }

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body)
  }

  console.log(`📤 TatraPay ${method} ${endpoint}`)

  const response = await fetch(url, options)
  const responseText = await response.text()

  let data: T
  try {
    data = JSON.parse(responseText)
  } catch {
    console.error('❌ Invalid JSON response:', responseText)
    throw new Error(`TatraPay returned invalid response: ${responseText.substring(0, 200)}`)
  }

  if (!response.ok) {
    console.error('❌ TatraPay API error:', response.status, data)
    throw new Error(`TatraPay API error: ${response.status} - ${JSON.stringify(data)}`)
  }

  return data
}

// =============================================================================
// Payment Operations
// =============================================================================

/**
 * Create a new payment
 *
 * @example
 * ```typescript
 * const payment = await createPayment({
 *   paymentMethod: 'CARD_PAY',
 *   amount: { amount: 7900, currency: 'EUR' },
 *   merchantReference: 'ORDER-123',
 *   customer: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
 *   returnUrl: 'https://example.com/api/payment/callback?orderId=123',
 *   customerIpAddress: '1.2.3.4'
 * })
 *
 * // Redirect customer to payment page
 * window.location.href = payment.redirectUrl
 * ```
 */
export async function createPayment(
  request: TatraPayCreatePaymentRequest
): Promise<TatraPayPaymentResponse> {
  console.log('💳 Creating TatraPay payment:', {
    method: request.paymentMethod,
    amount: request.amount,
    reference: request.merchantReference
  })

  // Build base redirect URL (without query params for header)
  const baseRedirectUrl = request.returnUrl.split('?')[0]

  // Build request body according to TatraPay API spec
  const apiBody: Record<string, unknown> = {
    baseAmount: {
      amountValue: request.amount.amount,
      currency: request.amount.currency
    },
    merchantReference: request.merchantReference.replace(/\s/g, ''), // Remove spaces!
    language: request.language || 'sk'
  }

  // Add payment description if provided
  if (request.description) {
    apiBody.paymentDescription = request.description
  }

  // Add customer data if provided
  if (request.customer) {
    apiBody.userData = {
      firstName: request.customer.firstName,
      lastName: request.customer.lastName,
      email: request.customer.email
    }

    if (request.customer.phone) {
      (apiBody.userData as Record<string, unknown>).phone = request.customer.phone
    }
  }

  // CRITICAL: Add payment method specific structures
  // Without these, you'll get NO_AVAIL_PAY_METH error!
  const customerFullName = request.customer
    ? `${request.customer.firstName} ${request.customer.lastName}`.trim().substring(0, 45)
    : 'Customer'

  // Sanitize cardHolder: only alphanumeric, space, dot, at, underscore, hyphen
  const sanitizedCardHolder = customerFullName
    .replace(/[^a-zA-Z0-9 .@_-]/g, '')
    .substring(0, 45) || 'Customer'

  if (request.paymentMethod === 'CARD_PAY') {
    // REQUIRED for card payments!
    apiBody.cardDetail = {
      cardHolder: sanitizedCardHolder
    }
  } else if (request.paymentMethod === 'BANK_TRANSFER') {
    // REQUIRED for bank transfers (empty object)
    apiBody.bankTransfer = {}
  }

  // Make API request
  const response = await apiRequest<{
    paymentId: string
    tatraPayPlusUrl?: string  // Redirect URL for CARD_PAY
    bankTransferData?: {
      iban: string
      bic: string
      variableSymbol: string
    }
    availablePaymentMethods?: Array<{
      isAvailable: boolean
      paymentMethod: string
      reasonCodeMethodAvailability?: string
      reasonCodeMethodAvailabilityDescription?: string
    }>
  }>('POST', '/v1/payments', apiBody, request.customerIpAddress, baseRedirectUrl, request.paymentMethod)

  // Validate response for card payments
  if (request.paymentMethod === 'CARD_PAY' && !response.tatraPayPlusUrl) {
    // Check if there's an error message in availablePaymentMethods
    const cardMethod = response.availablePaymentMethods?.find(m => m.paymentMethod === 'CARD_PAY')
    if (cardMethod && !cardMethod.isAvailable) {
      throw new Error(`TatraPay: ${cardMethod.reasonCodeMethodAvailabilityDescription || 'Card payment not available'}`)
    }
    throw new Error('TatraPay: No redirect URL returned for card payment')
  }

  console.log('✅ Payment created:', {
    paymentId: response.paymentId,
    hasRedirectUrl: !!response.tatraPayPlusUrl,
    hasBankTransfer: !!response.bankTransferData
  })

  return {
    paymentId: response.paymentId,
    status: 'RCVD' as TatraPayStatus, // Initial status
    redirectUrl: response.tatraPayPlusUrl,
    bankTransferInfo: response.bankTransferData ? {
      iban: response.bankTransferData.iban,
      bic: response.bankTransferData.bic,
      variableSymbol: response.bankTransferData.variableSymbol,
      amount: request.amount.amount / 100, // Convert back to decimal
      currency: request.amount.currency
    } : undefined,
    createdAt: new Date().toISOString()
  }
}

/**
 * Get the current status of a payment
 *
 * @example
 * ```typescript
 * const status = await getPaymentStatus('payment-uuid-here')
 * if (isPaymentSuccessful(status.status)) {
 *   console.log('Payment completed!')
 * }
 * ```
 */
export async function getPaymentStatus(paymentId: string): Promise<TatraPayStatusResponse> {
  console.log('🔍 Fetching TatraPay payment status:', paymentId)

  const response = await apiRequest<{
    paymentId: string
    status: string
    merchantReference: string
    instructedAmount: { amount: number; currency: string }
    paidAmount?: { amount: number; currency: string }
    paymentMethod: string
    createdAt: string
    updatedAt: string
    transactionId?: string
  }>('GET', `/v1/payments/${paymentId}/status`)

  console.log('📊 Payment status:', {
    paymentId: response.paymentId,
    status: response.status,
    transactionId: response.transactionId
  })

  return {
    paymentId: response.paymentId,
    status: response.status as TatraPayStatus,
    merchantReference: response.merchantReference,
    amount: {
      amount: response.instructedAmount.amount,
      currency: response.instructedAmount.currency
    },
    paidAmount: response.paidAmount ? {
      amount: response.paidAmount.amount,
      currency: response.paidAmount.currency
    } : undefined,
    paymentMethod: response.paymentMethod as TatraPayMethod,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    transactionId: response.transactionId
  }
}

/**
 * Get list of available payment methods
 */
export async function getAvailablePaymentMethods(): Promise<Array<{
  method: TatraPayMethod
  available: boolean
  minAmount?: number
  maxAmount?: number
}>> {
  const response = await apiRequest<{
    paymentMethods: Array<{
      paymentMethod: string
      isAvailable: boolean
      minAmount?: number
      maxAmount?: number
    }>
  }>('GET', '/v1/payments/methods')

  return response.paymentMethods.map(m => ({
    method: m.paymentMethod as TatraPayMethod,
    available: m.isAvailable,
    minAmount: m.minAmount ? Math.round(m.minAmount * 100) : undefined,
    maxAmount: m.maxAmount ? Math.round(m.maxAmount * 100) : undefined
  }))
}

// =============================================================================
// Status Helpers
// =============================================================================

/**
 * Check if a payment status indicates success
 *
 * ISO 20022 success codes: ACCC, ACSC, ACSP, ACCP, ACTC, ACWC, ACWP, ACFC
 *
 * @example
 * ```typescript
 * const status = await getPaymentStatus(paymentId)
 * if (isPaymentSuccessful(status.status)) {
 *   // Mark order as paid, send confirmation email, etc.
 * }
 * ```
 */
export function isPaymentSuccessful(status: TatraPayStatus): boolean {
  const successCodes: TatraPayStatus[] = [
    'ACCC', 'ACSC', 'ACSP', 'ACCP', 'ACTC', 'ACWC', 'ACWP', 'ACFC'
  ]
  return successCodes.includes(status)
}

/**
 * Check if a payment status indicates failure
 *
 * ISO 20022 failure codes: RJCT, CANC
 *
 * @example
 * ```typescript
 * if (isPaymentFailed(status.status)) {
 *   // Show error to customer, offer retry
 * }
 * ```
 */
export function isPaymentFailed(status: TatraPayStatus): boolean {
  const failedCodes: TatraPayStatus[] = ['RJCT', 'CANC']
  return failedCodes.includes(status)
}

/**
 * Check if a payment is still pending/in progress
 *
 * ISO 20022 pending codes: RCVD, PDNG, PATC, PART
 *
 * @example
 * ```typescript
 * if (isPaymentPending(status.status)) {
 *   // Show "waiting for payment" message
 * }
 * ```
 */
export function isPaymentPending(status: TatraPayStatus): boolean {
  const pendingCodes: TatraPayStatus[] = ['RCVD', 'PDNG', 'PATC', 'PART']
  return pendingCodes.includes(status)
}

/**
 * Map TatraPay status to a simple internal status
 *
 * @example
 * ```typescript
 * const internalStatus = mapToInternalStatus(status.status)
 * await db.orders.update({ payment_status: internalStatus })
 * ```
 */
export function mapToInternalStatus(status: TatraPayStatus): 'pending' | 'completed' | 'failed' {
  if (isPaymentSuccessful(status)) return 'completed'
  if (isPaymentFailed(status)) return 'failed'
  return 'pending'
}

/**
 * Get human-readable label for status (Slovak)
 */
export function getStatusLabel(status: TatraPayStatus): string {
  const labels: Record<TatraPayStatus, string> = {
    'ACCC': 'Dokončená',
    'ACSC': 'Vyrovnaná',
    'ACSP': 'Spracováva sa',
    'ACCP': 'Akceptovaná',
    'ACTC': 'Overená',
    'ACWC': 'Prijatá so zmenou',
    'ACWP': 'Prijatá',
    'ACFC': 'Fondy overené',
    'RCVD': 'Prijatá',
    'PDNG': 'Čaká',
    'PATC': 'Čiastočne prijatá',
    'PART': 'Čiastočná',
    'RJCT': 'Zamietnutá',
    'CANC': 'Zrušená'
  }
  return labels[status] || status
}
