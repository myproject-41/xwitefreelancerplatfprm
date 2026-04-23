import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

interface FreelancerProfile {
  fullName?: string
  title?: string
  bio?: string
  coverImage?: string
  profileImage?: string
  skills?: string[]
  languages?: { language: string; proficiency: string }[]
  experience?: any[]
  experienceLevel?: string
  portfolioUrls?: { label: string; url: string }[]
  hourlyRate?: number
  currency?: string
  country?: string
  city?: string
  timezone?: string
  availability?: boolean
  avgRating?: number
  totalReviews?: number
}

interface CompanyProfile {
  companyName?: string
  industry?: string
  description?: string
  coverImage?: string
  profileImage?: string
  website?: string
  employeeCount?: string
  location?: string
  country?: string
  city?: string
  timezone?: string
  workType?: string[]
  hiringSkills?: string[]
  avgRating?: number
  totalReviews?: number
}

interface ClientProfile {
  fullName?: string
  coverImage?: string
  profileImage?: string
  description?: string
  companyName?: string
  country?: string
  city?: string
  timezone?: string
  taskCategories?: string[]
  workPreference?: string
}

interface User {
  id: string
  email: string
  role: 'FREELANCER' | 'COMPANY' | 'CLIENT' | 'ADMIN'
  isOnboarded: boolean
  freelancerProfile?: FreelancerProfile
  companyProfile?: CompanyProfile
  clientProfile?: ClientProfile
}

interface AuthState {
  user: User | null
  token: string | null
  setUser: (user: User) => void
  setToken: (token: string) => void
  logout: () => void
  getDisplayName: () => string
  getProfileImage: () => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setUser: (user) => set({ user }),

      setToken: (token) => set({ token }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('xwite_token')
        }
        Cookies.remove('xwite_token')
        set({ user: null, token: null })
      },

      getDisplayName: () => {
        const user = get().user
        if (!user) return ''
        return (
          user.freelancerProfile?.fullName ||
          user.companyProfile?.companyName ||
          user.clientProfile?.fullName ||
          user.email ||
          ''
        )
      },

      getProfileImage: () => {
        const user = get().user
        if (!user) return null
        return (
          user.freelancerProfile?.profileImage ||
          user.companyProfile?.profileImage ||
          user.clientProfile?.profileImage ||
          null
        )
      },
    }),
    {
      name: 'xwite-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
)
