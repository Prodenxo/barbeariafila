import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import webhookRoutes from './routes/webhook';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/webhook', webhookRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 BarberQueue Backend running on port ${PORT}`);
});
