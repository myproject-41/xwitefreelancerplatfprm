'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { walletService } from '../../../services/wallet.service'
import MainHeader from '../../../components/ui/MainHeader'

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
  ESCROW_RELEASE: 'text-[#1976D2]',
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

const inputCls = 'mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm text-[#1b1c1a] outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#1565C0]/25'

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
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#1976D2' },
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
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
        <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <MainHeader />

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-24 md:px-6">
        {/* Page title */}
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d6dce3] bg-white text-[#1565C0] transition hover:bg-[#E3F2FD]"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-xl font-extrabold text-[#1b1c1a]">My Wallet</h1>
        </div>

        <div className="lg:grid lg:grid-cols-[340px_1fr] lg:items-start lg:gap-6">

          {/* ── LEFT: Balance card (always visible) ── */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-[linear-gradient(135deg,#1565C0_0%,#1976D2_100%)] rounded-2xl p-6 text-white shadow-[0_4px_16px_rgba(21,101,192,0.3)]">
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
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                    activeTab === 'add'
                      ? 'bg-white text-[#1565C0] ring-2 ring-white/50'
                      : 'bg-white text-[#1565C0] hover:bg-[#E3F2FD]'
                  }`}
                >
                  + Add Funds
                </button>
                <button
                  onClick={() => { setActiveTab('withdraw'); setAmount('') }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition border border-white/30 ${
                    activeTab === 'withdraw'
                      ? 'bg-white/30 text-white'
                      : 'bg-[rgba(255,255,255,0.18)] text-white hover:bg-[rgba(255,255,255,0.28)]'
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            {/* Quick stats on desktop */}
            <div className="mt-4 hidden grid-cols-2 gap-3 lg:grid">
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Transactions</p>
                <p className="mt-1 text-2xl font-extrabold text-[#1b1c1a]">{transactions.length}</p>
              </div>
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Held</p>
                <p className="mt-1 text-2xl font-extrabold text-orange-500">
                  ₹{wallet?.heldBalance?.toLocaleString() || '0'}
                </p>
              </div>
            </div>

            {/* Overview tab button (desktop only) */}
            {activeTab !== 'overview' && (
              <button
                onClick={() => { setActiveTab('overview'); setAmount('') }}
                className="mt-3 hidden w-full rounded-xl border border-[#d6dce3] bg-white px-4 py-2.5 text-sm font-bold text-[#6b7280] transition hover:border-[#1565C0] hover:text-[#1565C0] lg:block"
              >
                ← Back to Transactions
              </button>
            )}
          </div>

          {/* ── RIGHT: Form or Transaction History ── */}
          <div className="mt-4 lg:mt-0 space-y-4">

            {/* Add Funds Panel */}
            {activeTab === 'add' && (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-[#1b1c1a]">Add Funds</h2>
                  <button onClick={() => { setActiveTab('overview'); setAmount('') }}
                    className="text-[#9ca3af] hover:text-[#6b7280] text-sm">✕ Cancel</button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['UPI', 'Google Pay', 'PhonePe', 'Paytm', 'Cards', 'Net Banking'].map(m => (
                    <span key={m} className="px-3 py-1 bg-[#f1f5f9] text-[#6b7280] rounded-full text-xs font-semibold">
                      {m}
                    </span>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-bold text-[#6b7280] mb-2">Quick Select</p>
                  <div className="flex flex-wrap gap-2">
                    {quickAmounts.map(qa => (
                      <button
                        key={qa}
                        onClick={() => setAmount(qa.toString())}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                          amount === qa.toString()
                            ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                            : 'border-[#e2e8f0] text-[#6b7280] hover:border-[#1565C0]/40'
                        }`}
                      >
                        ₹{qa.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#1b1c1a]">Or enter amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={inputCls}
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
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#1565C0_0%,#1976D2_100%)] py-3 text-sm font-bold text-white shadow-[0_4px_12px_rgba(21,101,192,0.25)] transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
                >
                  {actionLoading ? 'Processing...' : `Pay ₹${amount || '0'} via Razorpay`}
                </button>

                <p className="text-xs text-center text-[#9ca3af]">
                  Secured by Razorpay · UPI / QR / Cards / Net Banking
                </p>
              </div>
            )}

            {/* Withdraw Panel */}
            {activeTab === 'withdraw' && (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-[#1b1c1a]">Withdraw Funds</h2>
                  <button onClick={() => { setActiveTab('overview'); setAmount('') }}
                    className="text-[#9ca3af] hover:text-[#6b7280] text-sm">✕ Cancel</button>
                </div>

                <div className="bg-[#f1f5f9] rounded-xl p-3">
                  <p className="text-xs text-[#6b7280]">Available to withdraw</p>
                  <p className="text-2xl font-extrabold text-[#1b1c1a]">
                    ₹{wallet?.balance?.toLocaleString() || '0'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#1b1c1a]">Amount to withdraw (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={inputCls}
                    placeholder="Minimum ₹100"
                    min={100}
                    max={wallet?.balance}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-extrabold text-[#1b1c1a] border-t border-[#e2e8f0] pt-3">
                    Bank Account Details
                  </p>
                  <div>
                    <label className="text-xs font-bold text-[#6b7280]">Account Holder Name</label>
                    <input type="text" value={bankDetails.accountHolderName}
                      onChange={e => setBankDetails(d => ({ ...d, accountHolderName: e.target.value }))}
                      className={inputCls} placeholder="As per bank records" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6b7280]">Bank Name</label>
                    <input type="text" value={bankDetails.bankName}
                      onChange={e => setBankDetails(d => ({ ...d, bankName: e.target.value }))}
                      className={inputCls} placeholder="e.g. State Bank of India" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6b7280]">Account Number</label>
                    <input type="text" value={bankDetails.accountNumber}
                      onChange={e => setBankDetails(d => ({ ...d, accountNumber: e.target.value.replace(/\D/g, '') }))}
                      className={inputCls} placeholder="Enter account number" inputMode="numeric" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6b7280]">IFSC Code</label>
                    <input type="text" value={bankDetails.ifscCode}
                      onChange={e => setBankDetails(d => ({ ...d, ifscCode: e.target.value.toUpperCase() }))}
                      className={inputCls} placeholder="e.g. SBIN0001234" maxLength={11} />
                  </div>
                </div>

                <div className="bg-orange-50 rounded-xl p-3 text-xs text-orange-700">
                  ⚠️ Withdrawals are processed within 1–3 business days. Ensure bank details are correct before submitting.
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={actionLoading || !amount || Number(amount) < 100 || Number(amount) > (wallet?.balance ?? 0)}
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#1565C0_0%,#1976D2_100%)] py-3 text-sm font-bold text-white shadow-[0_4px_12px_rgba(21,101,192,0.25)] transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
                >
                  {actionLoading ? 'Processing...' : `Request Withdrawal of ₹${amount || '0'}`}
                </button>
              </div>
            )}

            {/* Transaction History */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#e2e8f0]">
                  <h2 className="font-extrabold text-[#1b1c1a]">Transaction History</h2>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">💳</p>
                    <p className="font-bold text-[#6b7280]">No transactions yet</p>
                    <p className="text-sm text-[#9ca3af] mt-1">Add funds to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e2e8f0]">
                    {transactions.map((tx: any) => (
                      <div key={tx.id} className="px-5 py-4 flex items-center gap-4 hover:bg-[#f8fafc]">
                        <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-xl flex-shrink-0">
                          {TX_ICONS[tx.type] || '💰'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1b1c1a] truncate">
                            {tx.description || tx.type}
                          </p>
                          {tx.type === 'WITHDRAWAL' && tx.bankName && (
                            <p className="text-xs text-[#6b7280] truncate">
                              {tx.bankName} · ****{tx.accountNumber?.slice(-4)}
                            </p>
                          )}
                          <p className="text-xs text-[#9ca3af] mt-0.5">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-extrabold ${TX_COLORS[tx.type] || 'text-[#1b1c1a]'}`}>
                            {['CREDIT', 'ESCROW_RELEASE', 'REFUND'].includes(tx.type) ? '+' : '-'}
                            ₹{tx.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-[#9ca3af] mt-0.5">
                            Bal: ₹{tx.balanceAfter.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
