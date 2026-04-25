import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Criar o Barbeiro
  const barbeiro = await prisma.barbeiro.upsert({
    where: { phone: '554791066661' },
    update: {},
    create: {
      name: 'Barbearia do Mestre',
      phone: '554791066661',
      evolutionInstance: 'MainBarber',
      token: 'token_de_teste',
    },
  });

  // 2. Criar os Serviços
  const services = [
    { name: 'Corte Social', price: 35.00, duration: 30 },
    { name: 'Barba Completa', price: 25.00, duration: 20 },
    { name: 'Corte + Barba', price: 50.00, duration: 50 },
  ];

  for (const s of services) {
    await prisma.servico.create({
      data: {
        ...s,
        barbeiroId: barbeiro.id,
      },
    });
  }

  console.log('✅ Seed finalizado com sucesso! Barbeiro e serviços criados em Português.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
