'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import { authService } from '../../../services/auth.service'
import apiClient from '../../../services/apiClient'

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'account' | 'password' | 'danger'>('account')

  // Password change
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  // Delete account
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    authService.removeToken()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match')
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')

    setPwLoading(true)
    try {
      await apiClient.put('/api/auth/change-password', {
        oldPassword,
        newPassword,
      })
      toast.success('Password changed successfully!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) return toast.error('Enter your password to confirm')
    setDeleteLoading(true)
    try {
      await apiClient.delete('/api/auth/delete-account', {
        data: { password: deletePassword },
      })
      logout()
      authService.removeToken()
      toast.success('Account deleted')
      router.push('/')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  const tabs = [
    { id: 'account', label: '👤 Account', icon: '👤' },
    { id: 'password', label: '🔒 Password', icon: '🔒' },
    { id: 'danger', label: '⚠️ Danger Zone', icon: '⚠️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 font-medium">
          ← Back
        </button>
        <h1 className="font-extrabold text-lg text-gray-800">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* User info card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-extrabold text-blue-600">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-extrabold text-gray-800">{user?.email}</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl border border-gray-200 p-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-extrabold text-gray-800">Account Information</h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-700">Email</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
                <span className="text-xs text-gray-400">Cannot change</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-700">Role</p>
                  <p className="text-sm text-gray-500">{user?.role}</p>
                </div>
                <span className="text-xs text-gray-400">Cannot change</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-700">Profile Status</p>
                  <p className="text-sm text-gray-500">
                    {user?.isOnboarded ? '✅ Complete' : '⚠️ Incomplete'}
                  </p>
                </div>
                {!user?.isOnboarded && (
                  <button
                    onClick={() => router.push(`/onboarding/${user?.role?.toLowerCase()}`)}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700"
                  >
                    Complete
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center py-3">
                <div>
                  <p className="text-sm font-bold text-gray-700">Edit Profile</p>
                  <p className="text-sm text-gray-500">Update your profile information</p>
                </div>
                <button
                  onClick={() => router.push('/profile')}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200"
                >
                  Edit →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-extrabold text-gray-800 mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your current password"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repeat new password"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60"
              >
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="space-y-4">
            {/* Logout */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-extrabold text-gray-800 mb-1">Logout</h2>
              <p className="text-sm text-gray-500 mb-4">
                You will be signed out of your account on this device.
              </p>
              <button
                onClick={handleLogout}
                className="w-full border-2 border-orange-400 text-orange-500 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors"
              >
                Logout from Xwite
              </button>
            </div>

            {/* Delete Account */}
            <div className="bg-white rounded-2xl border-2 border-red-200 p-5">
              <h2 className="font-extrabold text-red-600 mb-1">⚠️ Delete Account</h2>
              <p className="text-sm text-gray-500 mb-4">
                This will permanently delete your account, profile, posts, and all data.
                <strong className="text-red-500"> This cannot be undone.</strong>
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full border-2 border-red-400 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors"
                >
                  Delete My Account
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-sm text-red-700 font-bold">
                      Are you absolutely sure? This cannot be reversed.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-700">
                      Enter your password to confirm
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      className="mt-1 w-full border-2 border-red-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      placeholder="Your password"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeletePassword('')
                      }}
                      className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
