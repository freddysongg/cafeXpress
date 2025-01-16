import Fastify from 'fastify';
import dotenv from 'dotenv';
import routes from '@routes/index.js';
import { logInfo } from '@utils/logger.js';
import { setupGeminiClient } from '@config/gemini.js';

dotenv.config();

const app = Fastify();

app.register(routes);
setupGeminiClient(app);

export default app;
