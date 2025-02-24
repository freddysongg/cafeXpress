import Fastify from 'fastify';
import dotenv from 'dotenv';
import routes from '@routes/index.js';
import { setupGeminiClient } from '@config/gemini.js';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

dotenv.config();

const buildApp = async () => {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    }
  });

  try {
    app.addHook('onRequest', async (request) => {
      request.log.info(
        {
          method: request.method,
          url: request.url,
          params: request.params,
          query: request.query
        },
        '📥 Request'
      );
    });

    app.addHook('onResponse', async (request, reply) => {
      request.log.info(
        {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime: `${reply.elapsedTime}ms`
        },
        '📤 Response'
      );
    });

    await app.register(cors, {
      origin: ['http://localhost:5173', 'cafexpress-api-production.up.railway.app'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      preflight: true
    });

    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });

    setupGeminiClient(app);

    await app.register(routes, {
      timeout: 30000 // 30 seconds timeout for plugin initialization
    });

    app.setErrorHandler((error, request, reply) => {
      request.log.error(
        {
          message: error.message,
          code: error.code,
          method: request.method,
          url: request.url
        },
        '❌ Error'
      );

      reply.status(error.statusCode || 500).send({
        status: 'error',
        message: error.message,
        code: error.code
      });
    });

    return app;
  } catch (error) {
    app.log.error(error);
    throw error;
  }
};

export default buildApp;
