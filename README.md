# TatraPay+ Next.js Integration

Complete, production-ready TatraPay+ (Tatra banka) payment gateway integration for Next.js applications.

[![Next.js](https://img.shields.io/badge/Next.js-15+-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## Features

- **Card Payments (CARD_PAY)** - Visa, Mastercard support via TatraPay+
- **Bank Transfers (BANK_TRANSFER)** - With auto-generated payment details
- **OAuth 2.0 Authentication** - Automatic token management and caching
- **ISO 20022 Status Codes** - Proper handling of ACSC, RJCT, PDNG, etc.
- **Webhook Support** - Real-time payment status updates
- **Full TypeScript** - Complete type definitions
- **Copy & Paste Ready** - Just copy files to your project

## Quick Start

### 1. Copy to Your Project

```bash
# Clone this repository
git clone https://github.com/ZEDce/tatrapay-nextjs.git

# Copy the lib file
cp tatrapay-nextjs/src/lib/tatrapay.ts your-project/src/lib/

# Copy API routes
cp -r tatrapay-nextjs/src/app/api/payment your-project/src/app/api/

# Copy result pages (optional)
cp -r tatrapay-nextjs/src/app/payment your-project/src/app/
```

### 2. Environment Variables

Create `.env.local` in your project:

```env
TATRAPAY_CLIENT_ID=your_client_id
TATRAPAY_CLIENT_SECRET=your_client_secret
TATRAPAY_SANDBOX=true
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

Get credentials from [Tatra banka Developer Portal](https://developer.tatrabanka.sk).

### 3. Database Setup

Add these columns to track payment status:

```sql
ALTER TABLE orders ADD COLUMN tatrapay_payment_id TEXT;
ALTER TABLE orders ADD COLUMN tatrapay_status TEXT;
ALTER TABLE orders ADD COLUMN tatrapay_transaction_id TEXT;
```

### 4. Basic Usage

```typescript
import { createPayment, getPaymentStatus, isPaymentSuccessful } from '@/lib/tatrapay'

// Create payment
const payment = await createPayment({
  paymentMethod: 'CARD_PAY',
  amount: { amount: 7900, currency: 'EUR' },  // 79.00 EUR
  merchantReference: 'ORDER-123',
  customer: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  },
  returnUrl: 'https://your-site.com/api/payment/callback?orderId=123',
  customerIpAddress: '1.2.3.4'
})

// Redirect to TatraPay
window.location.href = payment.redirectUrl

// Later, in callback - check status
const status = await getPaymentStatus(payment.paymentId)
if (isPaymentSuccessful(status.status)) {
  // Payment completed!
}
```

## API Reference

### `createPayment(request)`

Creates a new payment intent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paymentMethod` | `'CARD_PAY' \| 'BANK_TRANSFER'` | Yes | Payment method |
| `amount.amount` | `number` | Yes | Amount in cents (7900 = 79.00) |
| `amount.currency` | `'EUR' \| 'CZK'` | Yes | Currency |
| `merchantReference` | `string` | Yes | Your order ID (no spaces!) |
| `customer` | `object` | No | Customer details |
| `returnUrl` | `string` | Yes | Callback URL after payment |
| `customerIpAddress` | `string` | Yes | Customer's IP address |

**Returns:**
```typescript
{
  paymentId: string,
  status: TatraPayStatus,
  redirectUrl?: string,       // For CARD_PAY
  bankTransferInfo?: {        // For BANK_TRANSFER
    iban: string,
    bic: string,
    variableSymbol: string
  }
}
```

### `getPaymentStatus(paymentId)`

Gets current payment status.

**Returns:**
```typescript
{
  paymentId: string,
  status: TatraPayStatus,
  merchantReference: string,
  amount: { amount: number, currency: string },
  transactionId?: string
}
```

### Status Helpers

```typescript
isPaymentSuccessful(status)  // true for ACCC, ACSC, ACSP, etc.
isPaymentFailed(status)      // true for RJCT, CANC
isPaymentPending(status)     // true for RCVD, PDNG, etc.
mapToInternalStatus(status)  // 'completed' | 'failed' | 'pending'
```

## ISO 20022 Status Codes

**CRITICAL:** TatraPay uses ISO 20022 codes, NOT human-readable names!

### Success Codes
| Code | Meaning | Description |
|------|---------|-------------|
| `ACSC` | Settlement Completed | ✅ Most common for card payments |
| `ACCC` | Credit Completed | ✅ Payment fully completed |
| `ACSP` | Settlement In Progress | ✅ Being processed |

### Failed Codes
| Code | Meaning | Description |
|------|---------|-------------|
| `RJCT` | Rejected | ❌ Payment declined |
| `CANC` | Cancelled | ❌ Payment cancelled |

### Pending Codes
| Code | Meaning | Description |
|------|---------|-------------|
| `PDNG` | Pending | ⏳ Awaiting processing |
| `RCVD` | Received | ⏳ Payment received |

## File Structure

```
src/
├── lib/
│   └── tatrapay.ts              # Core TatraPay client (copy this!)
├── app/
│   ├── api/payment/
│   │   ├── create/route.ts      # POST - Create payment
│   │   ├── callback/route.ts    # GET - Handle redirect
│   │   └── webhook/route.ts     # POST - Status webhooks
│   └── payment/
│       ├── success/page.tsx     # Success page
│       ├── failed/page.tsx      # Failed page
│       └── pending/page.tsx     # Pending page
```

## Common Errors & Solutions

### `NO_AVAIL_PAY_METH` Error

**Problem:** Card payment returns "cardDetail was not provided"

**Solution:** Always include `cardDetail` for CARD_PAY:
```typescript
apiBody.cardDetail = {
  cardHolder: 'Customer Name'  // Max 45 chars, alphanumeric only
}
```

### Payment Successful but Status Not Updating

**Problem:** Checking wrong status code

**Solution:** Use ISO 20022 codes:
```typescript
// ❌ Wrong
if (status === 'SETTLED') { ... }

// ✅ Correct
if (isPaymentSuccessful(status)) { ... }
// Or directly: if (status === 'ACSC') { ... }
```

### No Redirect URL Returned

**Problem:** `tatraPayPlusUrl` is undefined

**Solution:**
1. Ensure `cardDetail` is included for CARD_PAY
2. Check `Redirect-URI` header is set
3. Verify `Preferred-Method` header matches request

## Testing

### Sandbox Mode

1. Set `TATRAPAY_SANDBOX=true` in `.env.local`
2. Get sandbox credentials from developer portal
3. Make a test purchase
4. On TatraPay page, choose:
   - **"Zrealizovaná platba"** → Successful payment
   - **"Platba zlyhala"** → Failed payment
5. Click "Pokračovať" to return to your callback

### Test Cards

Any valid card format works in sandbox:
- `4111 1111 1111 1111` (Visa)
- `5500 0000 0000 0004` (Mastercard)

## Production Checklist

- [ ] Get production credentials from Tatra banka
- [ ] Set `TATRAPAY_SANDBOX=false`
- [ ] Update `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Test with small real payment (e.g., 1€)
- [ ] Verify callback updates database correctly
- [ ] Verify confirmation emails are sent
- [ ] Set up error monitoring

## Related Resources

- [TatraPay+ API Documentation](https://developer.tatrabanka.sk)
- [ISO 20022 Payment Status Codes](https://www.iso20022.org)
- [Next.js Documentation](https://nextjs.org/docs)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
