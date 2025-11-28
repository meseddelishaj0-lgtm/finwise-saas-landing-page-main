import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Default forum categories
  const forums = [
    {
      title: '📈 Stock Market Discussions',
      slug: 'stocks',
      description: 'Talk about market trends, stock picks, and investment ideas.',
    },
    {
      title: '💰 Investing Strategies',
      slug: 'strategies',
      description: 'Share strategies, risk management, and long-term portfolio planning.',
    },
    {
      title: '🤖 AI Forecasts & Analysis',
      slug: 'ai-forecasts',
      description: 'Explore AI-powered predictions and market analytics.',
    },
    {
      title: '🏠 Real Estate Investing',
      slug: 'real-estate',
      description: 'Discuss real estate markets, rentals, and property investments.',
    },
    {
      title: '💬 Off-Topic Lounge',
      slug: 'lounge',
      description: 'A relaxed space for anything outside finance.',
    },
  ];

  console.log('🌱 Seeding forums...');

  const clientKey = Object.keys(prisma).find((k) => k.toLowerCase().includes('forum'));
  if (!clientKey) {
    throw new Error('No forum model found in Prisma client');
  }

  for (const forum of forums) {
    await (prisma as any)[clientKey].upsert({
      where: { slug: forum.slug },
      update: {},
      create: forum,
    });
  }

  console.log('✅ Forums seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
