'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function FailedContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'Payment was declined'
  const orderId = searchParams.get('orderId')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Payment Failed
        </h1>

        <p className="text-gray-300 mb-6">
          {message}
        </p>

        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400">
            The payment could have been declined for various reasons.
            Please check your card details or try a different payment method.
          </p>
        </div>

        <div className="space-y-3">
          {orderId && (
            <Link
              href={`/payment/retry?orderId=${orderId}`}
              className="inline-flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Payment
            </Link>
          )}

          <Link
            href="/"
            className="inline-flex items-center justify-center w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Back to Home
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>

          <p className="text-xs text-gray-500 mt-4">
            Need help? Contact us at{' '}
            <a href="mailto:support@example.com" className="text-blue-400 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    }>
      <FailedContent />
    </Suspense>
  )
}
