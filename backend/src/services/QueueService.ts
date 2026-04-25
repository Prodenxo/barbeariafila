import { PrismaClient, StatusFila } from '@prisma/client';
import { EvolutionService } from './EvolutionService';

const prisma = new PrismaClient();

export class QueueService {
  static async addToQueue(barbeiroId: string, clienteId: string, servicoId: string) {
    // Pegar a última posição
    const lastEntry = await prisma.fila.findFirst({
      where: { barbeiroId, status: StatusFila.AGUARDANDO },
      orderBy: { position: 'desc' },
    });

    const nextPosition = lastEntry ? lastEntry.position + 1 : 1;

    return prisma.fila.create({
      data: {
        position: nextPosition,
        barbeiroId,
        servicoId,
        clienteId,
        status: StatusFila.AGUARDANDO,
      },
      include: { cliente: true }
    });
  }

  static async getQueue(barbeiroId: string) {
    return prisma.fila.findMany({
      where: { 
        barbeiroId, 
        status: { in: [StatusFila.AGUARDANDO, StatusFila.EM_ATENDIMENTO] } 
      },
      include: { cliente: true },
      orderBy: { position: 'asc' },
    });
  }

  static async nextCustomer(barbeiroId: string) {
    await prisma.fila.updateMany({
      where: { barbeiroId, status: StatusFila.EM_ATENDIMENTO },
      data: { status: StatusFila.FINALIZADO, position: 0 },
    });

    const next = await prisma.fila.findFirst({
      where: { barbeiroId, status: StatusFila.AGUARDANDO },
      include: { cliente: true },
      orderBy: { position: 'asc' },
    });

    if (!next) return null;

    const updated = await prisma.fila.update({
      where: { id: next.id },
      data: { status: StatusFila.EM_ATENDIMENTO },
      include: { cliente: true }
    });

    const remainingQueue = await prisma.fila.findMany({
      where: { barbeiroId, status: StatusFila.AGUARDANDO },
      include: { cliente: true },
      orderBy: { position: 'asc' },
    });

    const barbeiro = await prisma.barbeiro.findUnique({ where: { id: barbeiroId } });

    for (let i = 0; i < remainingQueue.length; i++) {
      const entry = remainingQueue[i];
      const newPosition = i + 1;
      
      const updatedEntry = await prisma.fila.update({
        where: { id: entry.id },
        data: { position: newPosition },
        include: { cliente: true }
      });

      if (updatedEntry.position === 3 && barbeiro) {
        const message = `🔔 *Olá ${updatedEntry.cliente.name}!* Você é o próximo da fila. Por favor, já se dirija à barbearia *${barbeiro.name}*.`;
        await EvolutionService.sendMessage(barbeiro.evolutionInstance, `${updatedEntry.cliente.phone}@s.whatsapp.net`, message);
      }
    }

    return updated;
  }
}
