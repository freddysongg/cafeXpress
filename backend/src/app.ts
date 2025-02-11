import Fastify from 'fastify';
import dotenv from 'dotenv';
import routes from '@routes/index.js';
import { setupGeminiClient } from '@config/gemini.js';
import cors from '@fastify/cors';

dotenv.config();

const app = Fastify();

app.register(cors, {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflight: true
});

app.register(routes);
setupGeminiClient(app);

export default app;
