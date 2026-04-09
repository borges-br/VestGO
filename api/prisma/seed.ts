import bcrypt from 'bcrypt';
import { ItemCategory, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const shouldReset = process.argv.includes('--reset');

const collectionPoints = [
  {
    name: 'Espaco Amparo Social',
    email: 'amparo@vestgo.com',
    organizationName: 'Espaco Amparo Social',
    address: 'Rua Augusta, 1200',
    city: 'Sao Paulo',
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
    city: 'Sao Paulo',
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
    city: 'Sao Paulo',
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
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5568,
    longitude: -46.6924,
    acceptedCategories: [
      ItemCategory.CLOTHING,
      ItemCategory.SHOES,
      ItemCategory.ACCESSORIES,
      ItemCategory.BAGS,
    ],
  },
  {
    name: 'Ponto Solidario Mooca',
    email: 'mooca@vestgo.com',
    organizationName: 'Associacao Mooca Solidaria',
    address: 'Rua da Mooca, 1800',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5441,
    longitude: -46.6021,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.OTHER],
  },
];

async function maybeResetDatabase() {
  if (!shouldReset) {
    console.log('Seed em modo seguro: sem limpeza destrutiva. Use --reset para recriar os dados.');
    return;
  }

  await prisma.donationEvent.deleteMany();
  await prisma.donationItem.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.user.deleteMany();

  console.log('Banco limpo para seed deterministico.');
}

async function upsertUser(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationName?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  acceptedCategories?: ItemCategory[];
}) {
  const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      passwordHash,
      role: params.role,
      organizationName: params.organizationName,
      address: params.address,
      city: params.city,
      state: params.state,
      latitude: params.latitude,
      longitude: params.longitude,
      acceptedCategories: params.acceptedCategories ?? [],
    },
    create: {
      name: params.name,
      email: params.email,
      passwordHash,
      role: params.role,
      organizationName: params.organizationName,
      address: params.address,
      city: params.city,
      state: params.state,
      latitude: params.latitude,
      longitude: params.longitude,
      acceptedCategories: params.acceptedCategories ?? [],
    },
  });
}

async function main() {
  console.log('Iniciando seed...');
  await maybeResetDatabase();

  const donor = await upsertUser({
    name: 'Maria Silva',
    email: 'maria@vestgo.com',
    password: 'senha1234',
    role: UserRole.DONOR,
    city: 'Sao Paulo',
    state: 'SP',
  });
  console.log(`Doador pronto: ${donor.email}`);

  const admin = await upsertUser({
    name: 'Admin VestGO',
    email: 'admin@vestgo.com',
    password: 'admin1234',
    role: UserRole.ADMIN,
  });
  console.log(`Admin pronto: ${admin.email}`);

  for (const point of collectionPoints) {
    const createdPoint = await upsertUser({
      ...point,
      password: 'ponto1234',
      role: UserRole.COLLECTION_POINT,
    });
    console.log(`Ponto pronto: ${createdPoint.organizationName ?? createdPoint.name}`);
  }

  console.log('\nSeed concluido com sucesso.');
  console.log('Contas de teste:');
  console.log('  Doador: maria@vestgo.com / senha1234');
  console.log('  Admin: admin@vestgo.com / admin1234');
  console.log('  Pontos: *@vestgo.com / ponto1234');
}

main()
  .catch((error) => {
    console.error('Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
