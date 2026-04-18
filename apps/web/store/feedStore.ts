import { create } from 'zustand'

interface Post {
  id: string
  type: string
  title: string
  description: string
  budget?: number
  deadline?: string
  skills: string[]
  status: string
  createdAt: string
  client: any
  _count: { proposals: number }
}

interface FeedState {
  posts: Post[]
  loading: boolean
  page: number
  hasMore: boolean
  total: number
  filter: string
  search: string
  setPosts: (posts: Post[]) => void
  appendPosts: (posts: Post[]) => void
  setLoading: (v: boolean) => void
  setPage: (p: number) => void
  setHasMore: (v: boolean) => void
  setTotal: (t: number) => void
  setFilter: (f: string) => void
  setSearch: (s: string) => void
  reset: () => void
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  loading: false,
  page: 1,
  hasMore: true,
  total: 0,
  filter: 'ALL',
  search: '',
  setPosts: (posts) => set({ posts }),
  appendPosts: (posts) => set((s) => ({ posts: [...s.posts, ...posts] })),
  setLoading: (loading) => set({ loading }),
  setPage: (page) => set({ page }),
  setHasMore: (hasMore) => set({ hasMore }),
  setTotal: (total) => set({ total }),
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  reset: () => set({ posts: [], page: 1, hasMore: true }),
}))