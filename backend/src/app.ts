import Fastify from 'fastify';
import dotenv from 'dotenv';
import routes from '@routes/index';
import { logInfo } from '@utils/logger';

dotenv.config();

const app = Fastify();

app.register(routes);

export default app;
