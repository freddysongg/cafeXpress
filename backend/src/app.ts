import Fastify from 'fastify';
import dotenv from 'dotenv';
import routes from '@routes/index';
import { logInfo } from '@utils/logger';
import { setupGeminiClient } from '@config/gemini';

dotenv.config();

const app = Fastify();

app.register(routes);
setupGeminiClient(app);

export default app;
