import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Criar ou Atualizar o Barbeiro pelo nome da instância
  const barbeiro = await prisma.barbeiro.upsert({
    where: { evolutionInstance: 'MainBarber' },
    update: {
      phone: '5521996185328', // Seu número atualizado
      name: 'Barbearia do Mestre',
    },
    create: {
      name: 'Barbearia do Mestre',
      phone: '5521996185328',
      evolutionInstance: 'MainBarber',
      token: 'token_de_teste',
    },
  });

  // 2. Limpar serviços antigos e criar novos (para evitar duplicatas no teste)
  await prisma.servico.deleteMany({ where: { barbeiroId: barbeiro.id } });

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

  console.log('✅ Seed finalizado com sucesso! Seu número (5521996185328) agora é o dono da barbearia.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
