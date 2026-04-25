import express from 'express';
import cors from 'cors';
import webhookRoutes from './routes/webhook';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota de Health Check (para o Easypanel saber que o app está online)
app.get('/', (req, res) => {
  res.send('🚀 BarberQueue Backend is up and running!');
});

app.use('/webhook', webhookRoutes);

app.listen(PORT, () => {
  console.log(`🚀 BarberQueue Backend running on port ${PORT}`);
});
