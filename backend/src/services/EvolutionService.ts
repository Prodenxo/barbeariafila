import axios from 'axios';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const GLOBAL_TOKEN = process.env.EVOLUTION_API_TOKEN;

export class EvolutionService {
  /**
   * Envia uma mensagem de texto simples
   */
  static async sendMessage(instance: string, to: string, text: string) {
    try {
      await axios.post(`${EVOLUTION_URL}/message/sendText/${instance}`, {
        number: to,
        options: { delay: 1200, presence: "composing" },
        text: text
      }, {
        headers: { apikey: GLOBAL_TOKEN }
      });
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem via Evolution API:', error);
    }
  }

  /**
   * Envia uma lista de opções (Serviços)
   * Ideal para o passo de "Escolha o serviço"
   */
  static async sendList(instance: string, to: string, title: string, description: string, buttonText: string, sections: any[]) {
    try {
      await axios.post(`${EVOLUTION_URL}/message/sendList/${instance}`, {
        number: to,
        title: title,
        description: description,
        buttonText: buttonText,
        sections: sections
      }, {
        headers: { apikey: GLOBAL_TOKEN }
      });
    } catch (error) {
      console.error('❌ Erro ao enviar lista via Evolution API:', error);
    }
  }
}
