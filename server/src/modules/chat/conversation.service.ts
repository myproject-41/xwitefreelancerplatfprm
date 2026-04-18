import prisma from "../../config/db";

export const getOrCreateConversation = async (user1: string, user2: string) => {
  // find existing conversation
  const existing = await prisma.conversation.findFirst({
    where: {
      participants: {
        every: {
          userId: { in: [user1, user2] },
        },
      },
    },
    include: { participants: true },
  });

  if (existing && existing.participants.length === 2) {
    return existing;
  }

  // create new
  return prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: user1 },
          { userId: user2 },
        ],
      },
    },
    include: { participants: true },
  });
};