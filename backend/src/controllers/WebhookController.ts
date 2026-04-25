import { Request, Response } from 'express';
import { QueueService } from '../services/QueueService';
import { EvolutionService } from '../services/EvolutionService';
import { PrismaClient, StatusFila } from '@prisma/client';

const prisma = new PrismaClient();

export class WebhookController {
  static async handle(req: Request, res: Response) {
    try {
      const data = req.body;
      const event = data.event;

      if (!data || !event || !data.data) return res.status(200).send('OK');
      if (event !== 'messages.upsert') return res.status(200).send('OK');

      const message = data.data;
      const remoteJid = message.key?.remoteJid;
      const fromMe = message.key?.fromMe;
      const instance = data.instance;

      if (!remoteJid || fromMe) return res.status(200).send('OK');

      const pushName = message.pushName || 'Cliente';
      const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
      const cleanPhone = remoteJid.split('@')[0];

      // 1. Identificar o barbeiro dono desta instância
      let barbeiro = await prisma.barbeiro.findFirst({
        where: { evolutionInstance: instance }
      });

      if (!barbeiro) {
        if (text.toLowerCase().startsWith('/setup ')) {
          const barberName = text.replace('/setup ', '').trim();
          barbeiro = await prisma.barbeiro.create({
            data: { name: barberName, phone: cleanPhone, evolutionInstance: instance }
          });
          await EvolutionService.sendMessage(instance, remoteJid, `✅ Barbearia *${barberName}* registrada!`);
          return res.status(200).send('OK');
        }
        return res.status(200).send('OK');
      }

      // 2. Identificar ou Pedir Cadastro do Cliente
      let cliente = await prisma.cliente.findUnique({
        where: { phone: cleanPhone }
      });

      // --- LÓGICA DE COMANDOS DO BARBEIRO ---
      if (cleanPhone === barbeiro.phone) {
        if (text.toLowerCase() === '/proximo') {
          const next = await QueueService.nextCustomer(barbeiro.id);
          if (next) {
            await EvolutionService.sendMessage(instance, remoteJid, `✅ Próximo! Atendendo: *${next.cliente.name}*`);
          } else {
            await EvolutionService.sendMessage(instance, remoteJid, '📭 Fila vazia.');
          }
          return res.status(200).send('OK');
        }

        if (text.toLowerCase().startsWith('/addservico ')) {
          const parts = text.split(' ');
          if (parts.length < 4) {
            await EvolutionService.sendMessage(instance, remoteJid, '❌ Formato: `/addservico [nome] [preço] [duração]`');
            return res.status(200).send('OK');
          }
          const duration = parseInt(parts.pop() || '30');
          const price = parseFloat(parts.pop() || '0');
          const name = parts.slice(1).join(' ');
          await prisma.servico.create({ data: { name, price, duration, barbeiroId: barbeiro.id } });
          await EvolutionService.sendMessage(instance, remoteJid, `✅ Serviço *${name}* adicionado!`);
          return res.status(200).send('OK');
        }
      }

      // --- LÓGICA DE CADASTRO DE CLIENTE ---
      if (!cliente) {
        // Se a mensagem não for um comando, tratamos como o Nome para cadastro
        if (text.length > 3 && !text.startsWith('/')) {
          cliente = await prisma.cliente.create({
            data: { name: text, phone: cleanPhone }
          });
          await EvolutionService.sendMessage(instance, remoteJid, `✅ Cadastro realizado, *${text}*!`);
          // Continua para mostrar o menu após o cadastro
        } else {
          await EvolutionService.sendMessage(instance, remoteJid, `Olá! Bem-vindo à *${barbeiro.name}*! 💈\n\nNotei que é sua primeira vez aqui. Por favor, digite seu *Nome e Sobrenome* para realizarmos seu cadastro.`);
          return res.status(200).send('OK');
        }
      }

      // --- LÓGICA DE COMANDOS DO CLIENTE ---
      if (text.toLowerCase() === '/fila' || text.toLowerCase() === '/status') {
        const queue = await QueueService.getQueue(barbeiro.id);
        let list = `💈 *${barbeiro.name}* - Fila Atual\n\n`;
        if (queue.length === 0) {
          list += 'A fila está vazia. Aproveite! ✂️';
        } else {
          queue.forEach((entry, index) => {
            const statusIcon = entry.status === StatusFila.EM_ATENDIMENTO ? '💇‍♂️ (Na cadeira)' : `${index + 1}º`;
            list += `${statusIcon} - ${entry.cliente.name}\n`;
          });
        }
        await EvolutionService.sendMessage(instance, remoteJid, list);
        return res.status(200).send('OK');
      }

      // --- LÓGICA DE AGENDAMENTO ---
      const activeEntry = await prisma.fila.findFirst({
        where: { 
          barbeiroId: barbeiro.id, 
          clienteId: cliente.id,
          status: { in: [StatusFila.AGUARDANDO, StatusFila.EM_ATENDIMENTO] }
        },
        include: { cliente: true }
      });

      if (!activeEntry) {
        const servicos = await prisma.servico.findMany({ where: { barbeiroId: barbeiro.id } });
        const selectedService = servicos.find(s => s.name.toLowerCase() === text.toLowerCase());

        if (selectedService) {
          const entry = await QueueService.addToQueue(barbeiro.id, cliente.id, selectedService.id);
          let response = `✅ *Confirmado!* Você entrou na fila para: *${selectedService.name}*.\n`;
          response += `Sua posição: *${entry.position}*º lugar.\n\n`;
          if (entry.position === 1) response += '💇‍♂️ Vá para a cadeira!';
          else if (entry.position === 2) response += '📍 Já pode vir para a barbearia.';
          else response += '📱 Avisaremos quando chegar sua vez.';
          await EvolutionService.sendMessage(instance, remoteJid, response);
        } else {
          let welcome = `Olá *${cliente.name}*! 💈\n\n`;
          if (servicos.length > 0) {
            welcome += `*Nossos Serviços:* \n`;
            servicos.forEach(s => { welcome += `- ${s.name} (R$ ${s.price})\n`; });
            welcome += `\nPara entrar na fila, digite o *nome do serviço* acima.\n`;
          }
          welcome += `Digite */fila* para ver o status.`;
          await EvolutionService.sendMessage(instance, remoteJid, welcome);
        }
      } else {
        const positionSuffix = activeEntry.position === 1 ? 'Na cadeira' : `${activeEntry.position}º lugar`;
        await EvolutionService.sendMessage(instance, remoteJid, `Você já está na fila, *${cliente.name}*! Sua posição: *${positionSuffix}*.\nDigite */fila* para ver a lista.`);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('🔥 Erro no Webhook:', error);
      res.status(200).send('OK');
    }
  }
}
