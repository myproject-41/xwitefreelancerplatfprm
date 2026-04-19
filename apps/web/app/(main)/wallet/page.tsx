'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { walletService } from '../../../services/wallet.service'

const TX_ICONS: Record<string, string> = {
  CREDIT: '⬇️',
  DEBIT: '⬆️',
  ESCROW_HOLD: '🔒',
  ESCROW_RELEASE: '🔓',
  WITHDRAWAL: '💸',
  REFUND: '↩️',
}

const TX_COLORS: Record<string, string> = {
  CREDIT: 'text-green-600',
  DEBIT: 'text-red-500',
  ESCROW_HOLD: 'text-orange-500',
  ESCROW_RELEASE: 'text-blue-600',
  WITHDRAWAL: 'text-red-500',
  REFUND: 'text-green-600',
}

interface BankDetails {
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function WalletPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'add' | 'withdraw'>('overview')
  const [amount, setAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [payError, setPayError] = useState('')
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  })

  useEffect(() => {
    loadWallet()
  }, [])

  const loadWallet = async () => {
    setLoading(true)
    try {
      const res = await walletService.getTransactions()
      setWallet(res.data.wallet)
      setTransactions(res.data.transactions)
    } catch {
      toast.error('Failed to load wallet')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFunds = async () => {
    if (!amount || Number(amount) <= 0) return toast.error('Enter a valid amount')
    setPayError('')
    setActionLoading(true)
    try {
      const ready = await loadRazorpayScript()
      if (!ready) {
        setPayError('Could not load Razorpay. Check your internet connection.')
        setActionLoading(false)
        return
      }
      const res = await walletService.createOrder(Number(amount))
      const order = res?.data
      if (!order?.orderId) {
        setPayError('Server did not return an order. Check Railway logs.')
        setActionLoading(false)
        return
      }
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Xwite',
        description: 'Add funds to wallet',
        order_id: order.orderId,
        theme: { color: '#0077b5' },
        handler: async (response: any) => {
          try {
            await walletService.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            toast.success(`₹${amount} added to wallet!`)
            setAmount('')
            setActiveTab('overview')
            loadWallet()
          } catch (e: any) {
            setPayError('Payment verification failed: ' + (e?.response?.data?.message || e?.message || 'unknown'))
          } finally {
            setActionLoading(false)
          }
        },
        modal: { ondismiss: () => setActionLoading(false) },
      }
      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', (resp: any) => {
        setPayError('Payment failed: ' + (resp?.error?.description || 'unknown reason'))
        setActionLoading(false)
      })
      rzp.open()
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to initiate payment'
      setPayError(msg)
      setActionLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) return toast.error('Enter a valid amount')
    if (Number(amount) < 100) return toast.error('Minimum withdrawal is ₹100')
    if (wallet && Number(amount) > wallet.balance) return toast.error('Insufficient balance')
    if (!bankDetails.accountHolderName.trim()) return toast.error('Enter account holder name')
    if (!bankDetails.bankName.trim()) return toast.error('Enter bank name')
    if (!bankDetails.accountNumber.trim()) return toast.error('Enter account number')
    if (!bankDetails.ifscCode.trim()) return toast.error('Enter IFSC code')

    setActionLoading(true)
    try {
      await walletService.withdrawFunds({
        amount: Number(amount),
        ...bankDetails,
        ifscCode: bankDetails.ifscCode.toUpperCase(),
      })
      toast.success(`₹${amount} withdrawal requested! Funds will be transferred in 1–3 business days.`)
      setAmount('')
      setBankDetails({ accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '' })
      setActiveTab('overview')
      loadWallet()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to withdraw')
    } finally {
      setActionLoading(false)
    }
  }

  const quickAmounts = [500, 1000, 2500, 5000, 10000]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 font-medium">
          ← Back
        </button>
        <h1 className="font-extrabold text-lg text-gray-800">My Wallet</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-6 text-white">
          <p className="text-blue-100 text-sm font-medium">Available Balance</p>
          <p className="text-4xl font-extrabold mt-1">
            ₹{wallet?.balance?.toLocaleString() || '0'}
          </p>
          {wallet?.heldBalance > 0 && (
            <p className="text-blue-200 text-xs mt-2">
              🔒 ₹{wallet.heldBalance.toLocaleString()} held in escrow
            </p>
          )}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => { setActiveTab('add'); setAmount('') }}
              className="flex-1 bg-white text-blue-600 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50"
            >
              + Add Funds
            </button>
            <button
              onClick={() => { setActiveTab('withdraw'); setAmount('') }}
              className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-800"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Add Funds Panel */}
        {activeTab === 'add' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-gray-800">Add Funds</h2>
              <button onClick={() => { setActiveTab('overview'); setAmount('') }}
                className="text-gray-400 hover:text-gray-600 text-sm">✕ Cancel</button>
            </div>

            {/* Accepted payment methods badge */}
            <div className="flex flex-wrap gap-2">
              {['UPI', 'Google Pay', 'PhonePe', 'Paytm', 'Cards', 'Net Banking'].map(m => (
                <span key={m} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                  {m}
                </span>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Quick Select</p>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map(qa => (
                  <button
                    key={qa}
                    onClick={() => setAmount(qa.toString())}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                      amount === qa.toString()
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    ₹{qa.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Or enter amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                min={1}
              />
            </div>

            {payError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium break-all">
                ❌ {payError}
              </div>
            )}

            <button
              onClick={handleAddFunds}
              disabled={actionLoading || !amount}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60"
            >
              {actionLoading ? 'Processing...' : `Pay ₹${amount || '0'} via Razorpay`}
            </button>

            <p className="text-xs text-center text-gray-400">
              Secured by Razorpay · UPI / QR / Cards / Net Banking
            </p>
          </div>
        )}

        {/* Withdraw Panel */}
        {activeTab === 'withdraw' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-gray-800">Withdraw Funds</h2>
              <button onClick={() => { setActiveTab('overview'); setAmount('') }}
                className="text-gray-400 hover:text-gray-600 text-sm">✕ Cancel</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Available to withdraw</p>
              <p className="text-2xl font-extrabold text-gray-800">
                ₹{wallet?.balance?.toLocaleString() || '0'}
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-bold text-gray-700">Amount to withdraw (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum ₹100"
                min={100}
                max={wallet?.balance}
              />
            </div>

            {/* Bank Details */}
            <div className="space-y-3">
              <p className="text-sm font-extrabold text-gray-700 border-t border-gray-100 pt-3">
                Bank Account Details
              </p>

              <div>
                <label className="text-xs font-bold text-gray-600">Account Holder Name</label>
                <input
                  type="text"
                  value={bankDetails.accountHolderName}
                  onChange={e => setBankDetails(d => ({ ...d, accountHolderName: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="As per bank records"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">Bank Name</label>
                <input
                  type="text"
                  value={bankDetails.bankName}
                  onChange={e => setBankDetails(d => ({ ...d, bankName: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. State Bank of India"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">Account Number</label>
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={e => setBankDetails(d => ({ ...d, accountNumber: e.target.value.replace(/\D/g, '') }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter account number"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">IFSC Code</label>
                <input
                  type="text"
                  value={bankDetails.ifscCode}
                  onChange={e => setBankDetails(d => ({ ...d, ifscCode: e.target.value.toUpperCase() }))}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                />
              </div>
            </div>

            <div className="bg-orange-50 rounded-xl p-3 text-xs text-orange-700">
              ⚠️ Withdrawals are processed within 1–3 business days. Ensure bank details are correct before submitting.
            </div>

            <button
              onClick={handleWithdraw}
              disabled={
                actionLoading ||
                !amount ||
                Number(amount) < 100 ||
                Number(amount) > (wallet?.balance ?? 0)
              }
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60"
            >
              {actionLoading ? 'Processing...' : `Request Withdrawal of ₹${amount || '0'}`}
            </button>
          </div>
        )}

        {/* Transaction History */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-extrabold text-gray-800">Transaction History</h2>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">💳</p>
                <p className="font-bold text-gray-600">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-1">Add funds to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                      {TX_ICONS[tx.type] || '💰'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {tx.description || tx.type}
                      </p>
                      {tx.type === 'WITHDRAWAL' && tx.bankName && (
                        <p className="text-xs text-gray-500 truncate">
                          {tx.bankName} · ****{tx.accountNumber?.slice(-4)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-extrabold ${TX_COLORS[tx.type] || 'text-gray-700'}`}>
                        {['CREDIT', 'ESCROW_RELEASE', 'REFUND'].includes(tx.type) ? '+' : '-'}
                        ₹{tx.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Bal: ₹{tx.balanceAfter.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
