'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function PendingContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'Awaiting payment confirmation'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
        {/* Pending Icon */}
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-yellow-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Payment Pending
        </h1>

        <p className="text-gray-300 mb-6">
          {message}
        </p>

        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-white mb-2">Bank Transfer Instructions</h3>
          <p className="text-sm text-gray-400 mb-4">
            We've sent the payment details to your email.
            Your order will be processed after we receive the payment (usually 1-2 business days).
          </p>

          {/* Example bank details - replace with actual data */}
          <div className="text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">IBAN:</span>
              <span className="text-white font-mono">SK00 0000 0000 0000 0000 0000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">BIC/SWIFT:</span>
              <span className="text-white font-mono">TATRSKBX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Variable Symbol:</span>
              <span className="text-white font-mono">123456</span>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Back to Home
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>

        <p className="text-xs text-gray-500 mt-4">
          Questions? Contact us at{' '}
          <a href="mailto:support@example.com" className="text-blue-400 hover:underline">
            support@example.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    }>
      <PendingContent />
    </Suspense>
  )
}
