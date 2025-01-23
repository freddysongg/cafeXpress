import { FastifyInstance } from 'fastify';
import { getRecommendations } from '@services/recommendation.js';
import { validateUUID } from '@utils/validation.js';
import { PersonalizedRecommendationRequest } from '@schemas/recommendation.js';
import { rateLimit } from '@schemas/rateLimit.js';

export const recommendationRoutes = async (app: FastifyInstance) => {
  app.get<{
    Params: {
      userId: string;
    };
    Querystring: {
      latitude?: string;
      longitude?: string;
    };
  }>(
    '/:userId',
    {
      preHandler: rateLimit('recommendations', {
        max: 10,
        windowMs: 60000
      })
    },
    async (req, reply) => {
      // Validate UUID
      if (!validateUUID(req.params.userId)) {
        return reply.status(400).send({
          status: 'error',
          message: 'Invalid user ID format'
        });
      }

      // Validate Gemini client availability and type
      if (!app.gemini || typeof app.gemini.generateContent !== 'function') {
        app.log.error('Gemini client not properly initialized');
        return reply.status(503).send({
          status: 'error',
          message: 'Recommendation service unavailable',
          metadata: {
            serviceStatus: 'unavailable',
            timestamp: new Date().toISOString()
          }
        });
      }

      try {
        const geminiClient = app.gemini;

        // Build request object
        const request: PersonalizedRecommendationRequest = {
          userId: req.params.userId
        };

        // Add location if provided
        if (req.query.latitude && req.query.longitude) {
          const lat = parseFloat(req.query.latitude);
          const lon = parseFloat(req.query.longitude);

          if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return reply.status(400).send({
              status: 'error',
              message: 'Invalid latitude/longitude values'
            });
          }

          request.location = {
            latitude: lat,
            longitude: lon
          };
        }

        const result = await getRecommendations(geminiClient, request);

        return reply.send(result);
      } catch (error) {
        app.log.error('Recommendation route error:', {
          error: error instanceof Error ? error.message : error,
          userId: req.params.userId,
          timestamp: new Date().toISOString()
        });

        let statusCode = 500;
        let errorMessage = 'Failed to generate recommendations';

        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            statusCode = 404;
            errorMessage = 'User preferences not found';
          } else if (error.message.includes('invalid input')) {
            statusCode = 400;
            errorMessage = 'Invalid input data';
          } else if (error.message.includes('rate limit')) {
            statusCode = 429;
            errorMessage = 'Rate limit exceeded';
          }
        }

        return reply.status(statusCode).send({
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate recommendations',
          metadata: {
            generatedAt: new Date().toISOString(),
            modelVersion: app.gemini?.getModelVersion() || 'unknown'
          }
        });
      }
    }
  );
};
