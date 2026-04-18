import { Prisma } from '.prisma/client'
import { prisma } from '../../config/db'
import { Role } from '../auth/roles'

interface CreatePostInput {
  type: 'JOB' | 'TASK' | 'COLLAB' | 'SKILL_EXCHANGE'
  title: string
  description: string
  budget?: number
  deadline?: string
  skills: string[]
  clientId: string
}

interface GetFeedOptions {
  role: Role
  userId: string
  page?: number
  limit?: number
  type?: string
  search?: string
}

type LikeState = {
  likesCount: number
  viewerHasLiked: boolean
}

let likesTableReady: Promise<void> | null = null

async function ensurePostLikesTable() {
  if (!likesTableReady) {
    likesTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "post_likes" (
          "post_id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "user_id"),
          CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
          CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        )
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "post_likes_post_id_idx" ON "post_likes" ("post_id")
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "post_likes_user_id_idx" ON "post_likes" ("user_id")
      `)
    })()
  }

  await likesTableReady
}

export class PostService {
  private async getLikesMap(postIds: string[], viewerId?: string) {
    await ensurePostLikesTable()

    if (!postIds.length) {
      return new Map<string, LikeState>()
    }

    if (viewerId) {
      const rows = await prisma.$queryRaw<Array<{ postId: string; likesCount: number; viewerHasLiked: boolean }>>(
        Prisma.sql`
          SELECT
            "post_id" AS "postId",
            COUNT(*)::int AS "likesCount",
            BOOL_OR("user_id" = ${viewerId}) AS "viewerHasLiked"
          FROM "post_likes"
          WHERE "post_id" IN (${Prisma.join(postIds)})
          GROUP BY "post_id"
        `
      )

      return new Map(
        rows.map((row) => [
          row.postId,
          {
            likesCount: Number(row.likesCount ?? 0),
            viewerHasLiked: Boolean(row.viewerHasLiked),
          },
        ])
      )
    }

    const rows = await prisma.$queryRaw<Array<{ postId: string; likesCount: number }>>(
      Prisma.sql`
        SELECT
          "post_id" AS "postId",
          COUNT(*)::int AS "likesCount"
        FROM "post_likes"
        WHERE "post_id" IN (${Prisma.join(postIds)})
        GROUP BY "post_id"
      `
    )

    return new Map(
      rows.map((row) => [
        row.postId,
        {
          likesCount: Number(row.likesCount ?? 0),
          viewerHasLiked: false,
        },
      ])
    )
  }

  private async attachLikeState<T extends { id: string }>(posts: T[], viewerId?: string) {
    const likesMap = await this.getLikesMap(
      posts.map((post) => post.id),
      viewerId
    )

    return posts.map((post) => {
      const state = likesMap.get(post.id)
      return {
        ...post,
        likesCount: state?.likesCount ?? 0,
        viewerHasLiked: state?.viewerHasLiked ?? false,
      }
    })
  }

  private async getLikeState(postId: string, viewerId: string): Promise<LikeState> {
    const [post] = await this.attachLikeState([{ id: postId }], viewerId)
    return {
      likesCount: post?.likesCount ?? 0,
      viewerHasLiked: post?.viewerHasLiked ?? false,
    }
  }

  async createPost(input: CreatePostInput) {
    const post = await prisma.post.create({
      data: {
        type: input.type as any,
        title: input.title,
        description: input.description,
        budget: input.budget,
        deadline: input.deadline ? new Date(input.deadline) : null,
        skills: input.skills,
        clientId: input.clientId,
      },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            role: true,
            companyProfile: {
              select: {
                companyName: true,
                profileImage: true,
                industry: true,
                country: true,
              },
            },
            clientProfile: {
              select: {
                fullName: true,
                profileImage: true,
                country: true,
              },
            },
          },
        },
        _count: { select: { proposals: true } },
      },
    })

    return {
      ...post,
      likesCount: 0,
      viewerHasLiked: false,
    }
  }

  async getFeed(options: GetFeedOptions) {
    const { page = 1, limit = 10, type, search, userId } = options
    const skip = (page - 1) * limit

    const where: any = {
      status: { in: ['OPEN', 'IN_PROGRESS', 'COMPLETED'] },
    }

    if (type && type !== 'ALL') {
      where.type = type
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { skills: { has: search } },
      ]
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              role: true,
              companyProfile: {
                select: {
                  companyName: true,
                  profileImage: true,
                  industry: true,
                  country: true,
                  avgRating: true,
                },
              },
              clientProfile: {
                select: {
                  fullName: true,
                  profileImage: true,
                  country: true,
                },
              },
              freelancerProfile: {
                select: {
                  fullName: true,
                  profileImage: true,
                  country: true,
                  avgRating: true,
                },
              },
            },
          },
          _count: { select: { proposals: true } },
        },
      }),
      prisma.post.count({ where }),
    ])

    const postIds = posts.map((post) => post.id)
    const authorIds = posts.map((post) => post.client.id)

    const [viewerProposals, viewerConnections] = await Promise.all([
      postIds.length
        ? prisma.proposal.findMany({
            where: {
              freelancerId: userId,
              postId: { in: postIds },
            },
            select: {
              postId: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      authorIds.length
        ? prisma.connection.findMany({
            where: {
              OR: authorIds.map((authorId) => ({
                OR: [
                  { fromUserId: userId, toUserId: authorId },
                  { fromUserId: authorId, toUserId: userId },
                ],
              })),
            },
            select: {
              fromUserId: true,
              toUserId: true,
              status: true,
            },
          })
        : Promise.resolve([]),
    ])

    const proposalMap = new Map(
      viewerProposals.map((proposal) => [proposal.postId, proposal.status])
    )
    const connectionMap = new Map(
      viewerConnections.map((connection) => {
        const otherUserId =
          connection.fromUserId === userId ? connection.toUserId : connection.fromUserId
        return [
          otherUserId,
          {
            status: connection.status,
            initiatedByViewer: connection.fromUserId === userId,
          },
        ]
      })
    )

    const postsWithViewerState = posts.map((post) => ({
      ...post,
      viewerHasApplied: proposalMap.has(post.id),
      viewerProposalStatus: proposalMap.get(post.id) ?? null,
      viewerConnectionStatus: connectionMap.get(post.client.id)?.status ?? null,
      viewerInitiatedConnection: connectionMap.get(post.client.id)?.initiatedByViewer ?? false,
    }))

    const postsWithLikes = await this.attachLikeState(postsWithViewerState, userId)

    return {
      posts: postsWithLikes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }
  }

  async getPostById(id: string, viewerId?: string) {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            role: true,
            companyProfile: true,
            clientProfile: true,
            freelancerProfile: true,
          },
        },
        proposals: {
          include: {
            freelancer: {
              select: {
                id: true,
                freelancerProfile: {
                  select: {
                    fullName: true,
                    profileImage: true,
                    title: true,
                    avgRating: true,
                    skills: true,
                    hourlyRate: true,
                    currency: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { proposals: true } },
      },
    })

    if (!post) throw new Error('Post not found')

    if (!viewerId) {
      const [postWithLikes] = await this.attachLikeState([
        {
          ...post,
          viewerHasApplied: false,
          viewerProposalStatus: null,
          viewerConnectionStatus: null,
          viewerInitiatedConnection: false,
        },
      ])

      return postWithLikes
    }

    const [viewerProposal, viewerConnection] = await Promise.all([
      prisma.proposal.findFirst({
        where: {
          postId: id,
          freelancerId: viewerId,
        },
        select: {
          status: true,
        },
      }),
      prisma.connection.findFirst({
        where: {
          OR: [
            { fromUserId: viewerId, toUserId: post.client.id },
            { fromUserId: post.client.id, toUserId: viewerId },
          ],
        },
        select: {
          fromUserId: true,
          status: true,
        },
      }),
    ])

    const [postWithLikes] = await this.attachLikeState(
      [
        {
          ...post,
          viewerHasApplied: Boolean(viewerProposal),
          viewerProposalStatus: viewerProposal?.status ?? null,
          viewerConnectionStatus: viewerConnection?.status ?? null,
          viewerInitiatedConnection: viewerConnection?.fromUserId === viewerId,
        },
      ],
      viewerId
    )

    return postWithLikes
  }

  async getMyPosts(userId: string) {
    const posts = await prisma.post.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { proposals: true } },
      },
    })

    return this.attachLikeState(posts, userId)
  }

  async getUserPosts(targetUserId: string) {
    const posts = await prisma.post.findMany({
      where: { clientId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { proposals: true } },
      },
    })
    return posts
  }

  async updatePost(id: string, userId: string, data: Partial<CreatePostInput>) {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) throw new Error('Post not found')
    if (post.clientId !== userId) throw new Error('Not authorized')

    return prisma.post.update({
      where: { id },
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    })
  }

  async deletePost(id: string, userId: string) {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) throw new Error('Post not found')
    if (post.clientId !== userId) throw new Error('Not authorized')
    return prisma.post.delete({ where: { id } })
  }

  async closePost(id: string, userId: string) {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) throw new Error('Post not found')
    if (post.clientId !== userId) throw new Error('Not authorized')
    return prisma.post.update({
      where: { id },
      data: { status: 'CLOSED' },
    })
  }

  async likePost(id: string, userId: string) {
    await ensurePostLikesTable()

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!post) throw new Error('Post not found')

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "post_likes" ("post_id", "user_id")
        VALUES (${id}, ${userId})
        ON CONFLICT ("post_id", "user_id") DO NOTHING
      `
    )

    return this.getLikeState(id, userId)
  }

  async unlikePost(id: string, userId: string) {
    await ensurePostLikesTable()

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!post) throw new Error('Post not found')

    await prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM "post_likes"
        WHERE "post_id" = ${id} AND "user_id" = ${userId}
      `
    )

    return this.getLikeState(id, userId)
  }

  async getPostLikers(postId: string) {
    await ensurePostLikesTable()

    const rows = await prisma.$queryRaw<Array<{ user_id: string }>>(
      Prisma.sql`
        SELECT "user_id" FROM "post_likes"
        WHERE "post_id" = ${postId}
        ORDER BY "created_at" DESC
      `
    )

    const userIds = rows.map((r) => r.user_id)
    if (!userIds.length) return []

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        role: true,
        freelancerProfile: { select: { fullName: true, profileImage: true, title: true } },
        companyProfile: { select: { companyName: true, profileImage: true, industry: true } },
        clientProfile: { select: { fullName: true, profileImage: true, workPreference: true } },
      },
    })

    return users
  }

  async getMyPostLikers(userId: string) {
    await ensurePostLikesTable()

    const myPosts = await prisma.post.findMany({
      where: { clientId: userId },
      select: { id: true },
    })

    if (!myPosts.length) return []

    const postIds = myPosts.map((p) => p.id)

    const rows = await prisma.$queryRaw<Array<{ user_id: string }>>(
      Prisma.sql`
        SELECT DISTINCT "user_id" FROM "post_likes"
        WHERE "post_id" IN (${Prisma.join(postIds)})
        AND "user_id" != ${userId}
        ORDER BY "user_id"
      `
    )

    const userIds = rows.map((r) => r.user_id)
    if (!userIds.length) return []

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        role: true,
        freelancerProfile: { select: { fullName: true, profileImage: true, title: true } },
        companyProfile: { select: { companyName: true, profileImage: true, industry: true } },
        clientProfile: { select: { fullName: true, profileImage: true, workPreference: true } },
      },
    })

    return users
  }
}

export const postService = new PostService()
