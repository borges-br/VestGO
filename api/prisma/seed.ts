// api/prisma/seed.ts
// Popula o banco com dados de desenvolvimento.
// Rodar: npm run seed

import { PrismaClient, UserRole, ItemCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

// Pontos de coleta fictícios em São Paulo / região
const collectionPoints = [
  {
    name: 'Espaço Amparo Social',
    email: 'amparo@vestgo.com',
    organizationName: 'Espaço Amparo Social',
    address: 'Rua Augusta, 1200',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.5614,
    longitude: -46.6556,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.SHOES, ItemCategory.ACCESSORIES],
  },
  {
    name: 'Eco Store Pinheiros',
    email: 'ecostorepinheiros@vestgo.com',
    organizationName: 'Eco Store',
    address: 'Rua dos Pinheiros, 500',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.5659,
    longitude: -46.6821,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.SHOES],
  },
  {
    name: 'ONG Caminho da Luz',
    email: 'caminhodaluz@vestgo.com',
    organizationName: 'ONG Caminho da Luz',
    address: 'Av. Paulista, 900',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.5646,
    longitude: -46.6527,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.BAGS, ItemCategory.OTHER],
  },
  {
    name: 'Centro de Coleta Vila Madalena',
    email: 'vilamadalena@vestgo.com',
    organizationName: 'Instituto VestGO',
    address: 'Rua Aspicuelta, 72',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.5568,
    longitude: -46.6924,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.SHOES, ItemCategory.ACCESSORIES, ItemCategory.BAGS],
  },
  {
    name: 'Ponto Solidário Mooca',
    email: 'mooca@vestgo.com',
    organizationName: 'Associação Mooca Solidária',
    address: 'Rua da Mooca, 1800',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.5441,
    longitude: -46.6021,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.OTHER],
  },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpa dados existentes (somente em dev!)
  await prisma.donationEvent.deleteMany();
  await prisma.donationItem.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Banco limpo');

  // Cria doador de teste
  const donorHash = await bcrypt.hash('senha1234', SALT_ROUNDS);
  const donor = await prisma.user.create({
    data: {
      name: 'Maria Silva',
      email: 'maria@vestgo.com',
      passwordHash: donorHash,
      role: UserRole.DONOR,
      city: 'São Paulo',
      state: 'SP',
    },
  });
  console.log(`✅ Doador criado: ${donor.email}`);

  // Cria admin
  const adminHash = await bcrypt.hash('admin1234', SALT_ROUNDS);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin VestGO',
      email: 'admin@vestgo.com',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  });
  console.log(`✅ Admin criado: ${admin.email}`);

  // Cria pontos de coleta
  const pointHash = await bcrypt.hash('ponto1234', SALT_ROUNDS);
  for (const point of collectionPoints) {
    await prisma.user.create({
      data: {
        ...point,
        passwordHash: pointHash,
        role: UserRole.COLLECTION_POINT,
      },
    });
    console.log(`📍 Ponto criado: ${point.organizationName}`);
  }

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\nContas de teste:');
  console.log('  Doador:  maria@vestgo.com / senha1234');
  console.log('  Admin:   admin@vestgo.com / admin1234');
  console.log('  Pontos:  *@vestgo.com / ponto1234');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
