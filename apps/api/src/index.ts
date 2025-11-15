import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const port = process.env.PORT || 4000;

const healthSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number()
});

app.get('/healthz', (_req, res) => {
  const payload = { status: 'ok', uptime: process.uptime() };
  const parsed = healthSchema.parse(payload);
  res.json(parsed);
});

app.get('/api/v1/summary', (_req, res) => {
  res.json({
    cashOnHand: 120000,
    monthlyBurn: 25000,
    runwayMonths: 4.8,
    updatedAt: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
