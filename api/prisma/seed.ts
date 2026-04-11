import bcrypt from 'bcrypt';
import {
  DonationStatus,
  ItemCategory,
  OperationalPartnershipStatus,
  PrismaClient,
  PublicProfileState,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const shouldReset = process.argv.includes('--reset');

const collectionPoints = [
  {
    name: 'Espaco Amparo Social',
    email: 'amparo@vestgo.com',
    organizationName: 'Espaco Amparo Social',
    phone: '(11) 3254-8801',
    address: 'Rua Augusta, 1200',
    neighborhood: 'Consolacao',
    zipCode: '01304-001',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5614,
    longitude: -46.6556,
    description:
      'Ponto de coleta com equipe local preparada para receber roupas, calcados e kits de inverno.',
    openingHours:
      'Segunda a sexta, das 9h as 18h. Sabado, das 10h as 14h.',
    publicNotes:
      'Recebemos entregas em sacolas ou caixas pequenas. Ha apoio para descarga rapida na entrada.',
    accessibilityDetails: 'Entrada em nivel da rua e corredor amplo para cadeiras de rodas.',
    estimatedCapacity: 'Ate 120 sacolas por semana',
    nonAcceptedItems: ['Pecas com mofo', 'Uniformes corporativos danificados'],
    rules: ['Doe apenas itens limpos', 'Separe calcados em pares'],
    publicProfileState: PublicProfileState.VERIFIED,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.SHOES, ItemCategory.ACCESSORIES],
  },
  {
    name: 'Eco Store Pinheiros',
    email: 'ecostorepinheiros@vestgo.com',
    organizationName: 'Eco Store Pinheiros',
    phone: '(11) 98234-1100',
    address: 'Rua dos Pinheiros, 500',
    neighborhood: 'Pinheiros',
    zipCode: '05422-001',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5659,
    longitude: -46.6821,
    description:
      'Loja parceira com coleta diaria para roupas e calcados em bom estado, com triagem inicial no balcao.',
    openingHours:
      'Segunda a sexta, das 10h as 19h. Sabado, das 10h as 16h.',
    publicNotes:
      'Ideal para entregas rapidas durante o horario comercial. Informe na recepcao que a doacao e do VestGO.',
    accessibilityDetails: 'Acesso por rampa curta e atendimento no piso terreo.',
    estimatedCapacity: 'Ate 90 sacolas por semana',
    nonAcceptedItems: ['Pecas intimas usadas', 'Pecas molhadas'],
    rules: ['Leve pecas separadas por tipo', 'Nao enviamos itens sem triagem minima'],
    publicProfileState: PublicProfileState.ACTIVE,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.SHOES],
  },
  {
    name: 'ONG Caminho da Luz',
    email: 'caminhodaluz@vestgo.com',
    organizationName: 'ONG Caminho da Luz',
    phone: '(11) 97311-2200',
    address: 'Av. Paulista, 900',
    neighborhood: 'Bela Vista',
    zipCode: '01310-100',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5646,
    longitude: -46.6527,
    description:
      'Base de coleta de alta rotacao com apoio a campanhas sazonais e recepcao de lotes familiares.',
    openingHours:
      'Segunda a sexta, das 8h as 17h. Sabado, das 9h as 13h.',
    publicNotes:
      'Recebemos doacoes com foco em campanhas de inverno e acolhimento emergencial.',
    accessibilityDetails: 'Elevador social e banheiro acessivel no piso principal.',
    estimatedCapacity: 'Ate 150 sacolas por semana',
    nonAcceptedItems: ['Itens rasgados', 'Cobertores umidos'],
    rules: ['Identifique kits infantis', 'Embale cobertores separadamente'],
    publicProfileState: PublicProfileState.VERIFIED,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.BAGS, ItemCategory.OTHER],
  },
  {
    name: 'Centro de Coleta Vila Madalena',
    email: 'vilamadalena@vestgo.com',
    organizationName: 'Instituto VestGO',
    phone: '(11) 94555-8730',
    address: 'Rua Aspicuelta, 72',
    neighborhood: 'Vila Madalena',
    zipCode: '05433-010',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5568,
    longitude: -46.6924,
    description:
      'Hub local com triagem leve e fluxo forte para campanhas por bairro e eventos comunitarios.',
    openingHours:
      'Segunda a sexta, das 9h as 18h. Domingo, das 10h as 13h em datas de campanha.',
    publicNotes:
      'Bom ponto para entregas de fim de semana em acao conjunta com a comunidade local.',
    accessibilityDetails: 'Calcada larga, rampa lateral e vaga rapida para desembarque.',
    estimatedCapacity: 'Ate 140 sacolas por semana',
    nonAcceptedItems: ['Pecas molhadas', 'Malas quebradas'],
    rules: ['Separe por adulto e infantil', 'Informe se houver itens volumosos'],
    publicProfileState: PublicProfileState.ACTIVE,
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
    phone: '(11) 98888-5300',
    address: 'Rua da Mooca, 1800',
    neighborhood: 'Mooca',
    zipCode: '03104-002',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5441,
    longitude: -46.6021,
    description:
      'Ponto comunitario focado em arrecadacao de bairro, com encaminhamento rapido para a rede social parceira.',
    openingHours:
      'Segunda a sexta, das 9h as 17h30. Sabado, das 9h as 12h.',
    publicNotes:
      'Ha equipe local para apoiar idosos e doadores com pouco tempo de permanencia.',
    accessibilityDetails: 'Entrada ampla e apoio para retirada de doacoes no carro em horario agendado.',
    estimatedCapacity: 'Ate 80 sacolas por semana',
    nonAcceptedItems: ['Pecas sujas', 'Itens sem par'],
    rules: ['Leve as pecas fechadas em sacolas', 'Calcados devem ir amarrados em pares'],
    publicProfileState: PublicProfileState.ACTIVE,
    acceptedCategories: [ItemCategory.CLOTHING, ItemCategory.OTHER],
  },
];

const ngoPartners = [
  {
    name: 'Rede Apoio VestGO',
    email: 'ong@vestgo.com',
    password: 'ong1234',
    organizationName: 'Rede Apoio VestGO',
    phone: '(11) 95555-1001',
    address: 'Rua Vergueiro, 1450',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5864,
    longitude: -46.6321,
    description:
      'Rede social que recebe lotes dos pontos parceiros, faz triagem e direciona pecas para familias e acolhimentos.',
    purpose:
      'Ampliar o acesso a roupas em bom estado com distribuicao organizada e rastreavel.',
    publicNotes:
      'Atuacao principal nas regioes centro-sul e oeste, com campanhas sazonais de frio e reinsercao social.',
    operationalNotes:
      'Recebe consolidacao de lotes de parceiros urbanos e organiza saida por campanha e necessidade local.',
    serviceRegions: ['Centro', 'Zona Oeste', 'Zona Sul'],
    nonAcceptedItems: ['Pecas sem higiene minima', 'Itens com risco biologico'],
    rules: ['Priorizamos lotes etiquetados', 'Aceitamos kits por faixa etaria'],
    publicProfileState: PublicProfileState.VERIFIED,
  },
  {
    name: 'Instituto Aurora Social',
    email: 'aurora@vestgo.com',
    password: 'aurora1234',
    organizationName: 'Instituto Aurora Social',
    phone: '(11) 97777-2210',
    address: 'Av. Paes de Barros, 820',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5582,
    longitude: -46.5991,
    description:
      'ONG focada em triagem e distribuicao para familias da zona leste e redes de acolhimento comunitario.',
    purpose:
      'Conectar excedentes de roupas e acessorios a familias atendidas por redes locais com dignidade e constancia.',
    publicNotes:
      'Atende frentes locais e campanhas de bairro com foco em roupas casuais, infantis e kits emergenciais.',
    operationalNotes:
      'Recebe lotes dos pontos parceiros da zona leste e oeste, com distribuicao em ciclos semanais.',
    serviceRegions: ['Zona Leste', 'Mooca', 'Tatuape', 'Vila Prudente'],
    nonAcceptedItems: ['Pecas com avaria grave', 'Volumes sem identificacao minima'],
    rules: ['Separe infantil de adulto', 'Identifique kits para campanha de inverno'],
    publicProfileState: PublicProfileState.ACTIVE,
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
  await prisma.operationalPartnership.deleteMany();
  await prisma.user.deleteMany();

  console.log('Banco limpo para seed deterministico.');
}

async function upsertUser(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  organizationName?: string;
  description?: string;
  purpose?: string;
  address?: string;
  neighborhood?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  publicNotes?: string;
  operationalNotes?: string;
  accessibilityDetails?: string;
  estimatedCapacity?: string;
  nonAcceptedItems?: string[];
  rules?: string[];
  serviceRegions?: string[];
  publicProfileState?: PublicProfileState;
  acceptedCategories?: ItemCategory[];
}) {
  const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      passwordHash,
      role: params.role,
      phone: params.phone,
      organizationName: params.organizationName,
      description: params.description,
      purpose: params.purpose,
      address: params.address,
      neighborhood: params.neighborhood,
      zipCode: params.zipCode,
      city: params.city,
      state: params.state,
      latitude: params.latitude,
      longitude: params.longitude,
      openingHours: params.openingHours,
      publicNotes: params.publicNotes,
      operationalNotes: params.operationalNotes,
      accessibilityDetails: params.accessibilityDetails,
      estimatedCapacity: params.estimatedCapacity,
      nonAcceptedItems: params.nonAcceptedItems ?? [],
      rules: params.rules ?? [],
      serviceRegions: params.serviceRegions ?? [],
      publicProfileState: params.publicProfileState ?? PublicProfileState.DRAFT,
      acceptedCategories: params.acceptedCategories ?? [],
    },
    create: {
      name: params.name,
      email: params.email,
      passwordHash,
      role: params.role,
      phone: params.phone,
      organizationName: params.organizationName,
      description: params.description,
      purpose: params.purpose,
      address: params.address,
      neighborhood: params.neighborhood,
      zipCode: params.zipCode,
      city: params.city,
      state: params.state,
      latitude: params.latitude,
      longitude: params.longitude,
      openingHours: params.openingHours,
      publicNotes: params.publicNotes,
      operationalNotes: params.operationalNotes,
      accessibilityDetails: params.accessibilityDetails,
      estimatedCapacity: params.estimatedCapacity,
      nonAcceptedItems: params.nonAcceptedItems ?? [],
      rules: params.rules ?? [],
      serviceRegions: params.serviceRegions ?? [],
      publicProfileState: params.publicProfileState ?? PublicProfileState.DRAFT,
      acceptedCategories: params.acceptedCategories ?? [],
    },
  });
}

async function upsertOperationalPartnership(params: {
  collectionPointId: string;
  ngoId: string;
  priority?: number;
  notes?: string;
}) {
  return prisma.operationalPartnership.upsert({
    where: {
      collectionPointId_ngoId: {
        collectionPointId: params.collectionPointId,
        ngoId: params.ngoId,
      },
    },
    update: {
      status: OperationalPartnershipStatus.ACTIVE,
      isActive: true,
      priority: params.priority ?? 0,
      notes: params.notes,
    },
    create: {
      collectionPointId: params.collectionPointId,
      ngoId: params.ngoId,
      status: OperationalPartnershipStatus.ACTIVE,
      isActive: true,
      priority: params.priority ?? 0,
      notes: params.notes,
    },
  });
}

async function upsertDonation(params: {
  code: string;
  donorId: string;
  collectionPointId: string;
  ngoId: string;
  operationalPartnershipId: string;
  status: DonationStatus;
  notes?: string;
  createdAt: Date;
  items: {
    name: string;
    category: ItemCategory;
    quantity: number;
    description?: string;
  }[];
  timeline: {
    status: DonationStatus;
    description: string;
    location?: string;
    createdAt: Date;
    createdBy?: string;
  }[];
}) {
  return prisma.donation.upsert({
    where: { code: params.code },
    update: {
      donorId: params.donorId,
      collectionPointId: params.collectionPointId,
      ngoId: params.ngoId,
      operationalPartnershipId: params.operationalPartnershipId,
      status: params.status,
      notes: params.notes,
      items: {
        deleteMany: {},
        create: params.items,
      },
      timeline: {
        deleteMany: {},
        create: params.timeline,
      },
    },
    create: {
      code: params.code,
      donorId: params.donorId,
      collectionPointId: params.collectionPointId,
      ngoId: params.ngoId,
      operationalPartnershipId: params.operationalPartnershipId,
      status: params.status,
      notes: params.notes,
      createdAt: params.createdAt,
      items: {
        create: params.items,
      },
      timeline: {
        create: params.timeline,
      },
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

  const ngoByEmail = new Map<string, Awaited<ReturnType<typeof upsertUser>>>();

  for (const ngo of ngoPartners) {
    const createdNgo = await upsertUser({
      ...ngo,
      role: UserRole.NGO,
      acceptedCategories: [
        ItemCategory.CLOTHING,
        ItemCategory.SHOES,
        ItemCategory.ACCESSORIES,
        ItemCategory.BAGS,
        ItemCategory.OTHER,
      ],
    });
    ngoByEmail.set(ngo.email, createdNgo);
    console.log(`ONG pronta: ${createdNgo.email}`);
  }

  const pointsByEmail = new Map<string, Awaited<ReturnType<typeof upsertUser>>>();

  for (const point of collectionPoints) {
    const createdPoint = await upsertUser({
      ...point,
      password: 'ponto1234',
      role: UserRole.COLLECTION_POINT,
    });
    pointsByEmail.set(point.email, createdPoint);
    console.log(`Ponto pronto: ${createdPoint.organizationName ?? createdPoint.name}`);
  }

  const ecoStore = pointsByEmail.get('ecostorepinheiros@vestgo.com');
  const caminhoDaLuz = pointsByEmail.get('caminhodaluz@vestgo.com');
  const vilaMadalena = pointsByEmail.get('vilamadalena@vestgo.com');
  const amparo = pointsByEmail.get('amparo@vestgo.com');
  const mooca = pointsByEmail.get('mooca@vestgo.com');
  const redeApoio = ngoByEmail.get('ong@vestgo.com');
  const aurora = ngoByEmail.get('aurora@vestgo.com');

  if (!ecoStore || !caminhoDaLuz || !vilaMadalena || !amparo || !mooca || !redeApoio || !aurora) {
    throw new Error('Usuarios esperados nao foram criados pelo seed.');
  }

  const ecoStorePartnership = await upsertOperationalPartnership({
    collectionPointId: ecoStore.id,
    ngoId: redeApoio.id,
    priority: 1,
    notes: 'Parceria principal para roupas e calcados da regiao oeste.',
  });
  const caminhoDaLuzPartnership = await upsertOperationalPartnership({
    collectionPointId: caminhoDaLuz.id,
    ngoId: redeApoio.id,
    priority: 1,
    notes: 'Triagem social central da operacao VestGO.',
  });
  const amparoPartnership = await upsertOperationalPartnership({
    collectionPointId: amparo.id,
    ngoId: redeApoio.id,
    priority: 1,
    notes: 'Recebe lotes gerais para o eixo centro-sul.',
  });
  const vilaMadalenaPartnership = await upsertOperationalPartnership({
    collectionPointId: vilaMadalena.id,
    ngoId: aurora.id,
    priority: 1,
    notes: 'Atendimento voltado para a rede oeste e campanhas locais.',
  });
  const moocaPartnership = await upsertOperationalPartnership({
    collectionPointId: mooca.id,
    ngoId: aurora.id,
    priority: 1,
    notes: 'Fluxo de distribuicao local para a zona leste.',
  });

  await upsertDonation({
    code: 'VGO-001',
    donorId: donor.id,
    collectionPointId: caminhoDaLuz.id,
    ngoId: redeApoio.id,
    operationalPartnershipId: caminhoDaLuzPartnership.id,
    status: DonationStatus.DELIVERED,
    notes: 'Casacos e roupas de frio separados por tamanho.',
    createdAt: new Date('2026-04-06T10:32:00.000Z'),
    items: [
      {
        name: 'Kit inverno',
        category: ItemCategory.CLOTHING,
        quantity: 6,
        description: 'Casacos, calcas e blusas em otimo estado.',
      },
    ],
    timeline: [
      {
        status: DonationStatus.PENDING,
        description: 'Doacao registrada pelo doador.',
        location: 'Aplicativo VestGO',
        createdAt: new Date('2026-04-06T10:32:00.000Z'),
        createdBy: donor.id,
      },
      {
        status: DonationStatus.AT_POINT,
        description: 'Recebida no ponto parceiro.',
        location: caminhoDaLuz.organizationName ?? caminhoDaLuz.name,
        createdAt: new Date('2026-04-06T14:10:00.000Z'),
        createdBy: caminhoDaLuz.id,
      },
      {
        status: DonationStatus.IN_TRANSIT,
        description: 'Saiu para entrega ao parceiro social.',
        location: caminhoDaLuz.organizationName ?? caminhoDaLuz.name,
        createdAt: new Date('2026-04-07T09:00:00.000Z'),
        createdBy: caminhoDaLuz.id,
      },
      {
        status: DonationStatus.DELIVERED,
        description: 'Entrega confirmada com triagem realizada.',
        location: redeApoio.organizationName ?? redeApoio.name,
        createdAt: new Date('2026-04-07T16:45:00.000Z'),
        createdBy: redeApoio.id,
      },
    ],
  });

  await upsertDonation({
    code: 'VGO-002',
    donorId: donor.id,
    collectionPointId: ecoStore.id,
    ngoId: redeApoio.id,
    operationalPartnershipId: ecoStorePartnership.id,
    status: DonationStatus.PENDING,
    notes: 'Lote pequeno de calcados e camisetas.',
    createdAt: new Date('2026-04-08T18:05:00.000Z'),
    items: [
      {
        name: 'Calcados esportivos',
        category: ItemCategory.SHOES,
        quantity: 2,
        description: 'Tenis e chinelos conservados.',
      },
      {
        name: 'Roupas casuais',
        category: ItemCategory.CLOTHING,
        quantity: 4,
        description: 'Pecas leves para uso diario.',
      },
    ],
    timeline: [
      {
        status: DonationStatus.PENDING,
        description: 'Doacao registrada. Aguardando entrega no ponto.',
        location: 'Aplicativo VestGO',
        createdAt: new Date('2026-04-08T18:05:00.000Z'),
        createdBy: donor.id,
      },
    ],
  });

  await upsertDonation({
    code: 'VGO-003',
    donorId: donor.id,
    collectionPointId: vilaMadalena.id,
    ngoId: aurora.id,
    operationalPartnershipId: vilaMadalenaPartnership.id,
    status: DonationStatus.DISTRIBUTED,
    notes: 'Roupas infantis organizadas por faixa etaria.',
    createdAt: new Date('2026-03-12T15:20:00.000Z'),
    items: [
      {
        name: 'Roupas infantis',
        category: ItemCategory.CLOTHING,
        quantity: 8,
        description: 'Pecas dobradas e separadas por tamanho.',
      },
    ],
    timeline: [
      {
        status: DonationStatus.PENDING,
        description: 'Doacao registrada pelo doador.',
        location: 'Aplicativo VestGO',
        createdAt: new Date('2026-03-12T15:20:00.000Z'),
        createdBy: donor.id,
      },
      {
        status: DonationStatus.AT_POINT,
        description: 'Recebida no ponto de coleta.',
        location: vilaMadalena.organizationName ?? vilaMadalena.name,
        createdAt: new Date('2026-03-12T18:00:00.000Z'),
        createdBy: vilaMadalena.id,
      },
      {
        status: DonationStatus.IN_TRANSIT,
        description: 'Envio para o parceiro social confirmado.',
        location: vilaMadalena.organizationName ?? vilaMadalena.name,
        createdAt: new Date('2026-03-13T09:30:00.000Z'),
        createdBy: vilaMadalena.id,
      },
      {
        status: DonationStatus.DELIVERED,
        description: 'Recebimento confirmado na rede parceira.',
        location: aurora.organizationName ?? aurora.name,
        createdAt: new Date('2026-03-13T16:20:00.000Z'),
        createdBy: aurora.id,
      },
      {
        status: DonationStatus.DISTRIBUTED,
        description: 'Distribuicao social concluida.',
        location: aurora.organizationName ?? aurora.name,
        createdAt: new Date('2026-03-14T11:15:00.000Z'),
        createdBy: aurora.id,
      },
    ],
  });

  await upsertDonation({
    code: 'VGO-004',
    donorId: donor.id,
    collectionPointId: mooca.id,
    ngoId: aurora.id,
    operationalPartnershipId: moocaPartnership.id,
    status: DonationStatus.IN_TRANSIT,
    notes: 'Lote em deslocamento para recebimento na ONG parceira.',
    createdAt: new Date('2026-04-09T11:10:00.000Z'),
    items: [
      {
        name: 'Pecas casuais',
        category: ItemCategory.CLOTHING,
        quantity: 5,
        description: 'Camisetas e calcas em bom estado.',
      },
      {
        name: 'Acessorios leves',
        category: ItemCategory.ACCESSORIES,
        quantity: 3,
        description: 'Cintos e cachecois organizados em kit.',
      },
    ],
    timeline: [
      {
        status: DonationStatus.PENDING,
        description: 'Doacao registrada pelo doador.',
        location: 'Aplicativo VestGO',
        createdAt: new Date('2026-04-09T11:10:00.000Z'),
        createdBy: donor.id,
      },
      {
        status: DonationStatus.AT_POINT,
        description: 'Recebida no ponto parceiro.',
        location: mooca.organizationName ?? mooca.name,
        createdAt: new Date('2026-04-09T14:05:00.000Z'),
        createdBy: mooca.id,
      },
      {
        status: DonationStatus.IN_TRANSIT,
        description: 'Envio para a ONG parceira confirmado.',
        location: mooca.organizationName ?? mooca.name,
        createdAt: new Date('2026-04-10T08:40:00.000Z'),
        createdBy: mooca.id,
      },
    ],
  });

  await upsertDonation({
    code: 'VGO-005',
    donorId: donor.id,
    collectionPointId: amparo.id,
    ngoId: redeApoio.id,
    operationalPartnershipId: amparoPartnership.id,
    status: DonationStatus.AT_POINT,
    notes: 'Entrega separada para campanha de inverno.',
    createdAt: new Date('2026-04-10T09:20:00.000Z'),
    items: [
      {
        name: 'Cobertores leves',
        category: ItemCategory.OTHER,
        quantity: 2,
        description: 'Cobertores limpos e embalados.',
      },
      {
        name: 'Blusas de frio',
        category: ItemCategory.CLOTHING,
        quantity: 4,
        description: 'Pecas prontas para triagem.',
      },
    ],
    timeline: [
      {
        status: DonationStatus.PENDING,
        description: 'Doacao registrada pelo doador.',
        location: 'Aplicativo VestGO',
        createdAt: new Date('2026-04-10T09:20:00.000Z'),
        createdBy: donor.id,
      },
      {
        status: DonationStatus.AT_POINT,
        description: 'Recebida no Espaco Amparo Social.',
        location: amparo.organizationName ?? amparo.name,
        createdAt: new Date('2026-04-10T12:10:00.000Z'),
        createdBy: amparo.id,
      },
    ],
  });

  console.log('\nSeed concluido com sucesso.');
  console.log('Contas de teste:');
  console.log('  Doador: maria@vestgo.com / senha1234');
  console.log('  Admin temporario: configurado via BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD no ambiente da API');
  console.log('  ONGs: ong@vestgo.com / ong1234 | aurora@vestgo.com / aurora1234');
  console.log('  Pontos: *@vestgo.com / ponto1234');
  console.log('  Doacoes iniciais: VGO-001, VGO-002, VGO-003, VGO-004, VGO-005');
}

main()
  .catch((error) => {
    console.error('Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
