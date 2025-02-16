import { FastifyInstance } from 'fastify';
import { validateUUID } from '@utils/validation.js';
import { SearchRequestSchema } from '@schemas/recommendation.js';
import KeywordRecommendationService from '@services/keywordRecommendation.js';

export const recommendationRoutes = async (app: FastifyInstance) => {
  const recommendationService = new KeywordRecommendationService(app.gemini);

  const rateLimit = {
    max: 10,
    timeWindow: '1 minute'
  };

  // Route for search-based recommendations
  app.get<{
    Querystring: {
      q?: string;
      latitude?: string;
      longitude?: string;
      dietary?: string;
      activities?: string;
      ambiance?: string;
      radius?: string;
    };
  }>(
    '/search',
    {
      config: {
        rateLimit
      }
    },
    async (req, reply) => {
      try {
        const searchRequest = {
          query: req.query.q,
          location:
            req.query.latitude && req.query.longitude
              ? {
                  latitude: parseFloat(req.query.latitude),
                  longitude: parseFloat(req.query.longitude)
                }
              : undefined,
          filters: {
            dietary: req.query.dietary?.split(','),
            activities: req.query.activities?.split(','),
            ambiance: req.query.ambiance?.split(','),
            radius: req.query.radius ? parseFloat(req.query.radius) : undefined
          }
        };

        const validatedRequest = SearchRequestSchema.parse(searchRequest);
        const result = await recommendationService.getRecommendations(validatedRequest);
        return reply.send(result);
      } catch (error) {
        req.log.error('Search recommendations error:', error);
        return reply.status(400).send({
          status: 'error',
          message: error instanceof Error ? error.message : 'Invalid search request',
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  );

  // Route for user-based recommendations
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
      config: {
        rateLimit
      }
    },
    async (req, reply) => {
      try {
        if (!validateUUID(req.params.userId)) {
          return reply.status(400).send({
            status: 'error',
            message: 'Invalid user ID format'
          });
        }

        const searchRequest = {
          userId: req.params.userId,
          location:
            req.query.latitude && req.query.longitude
              ? {
                  latitude: parseFloat(req.query.latitude),
                  longitude: parseFloat(req.query.longitude)
                }
              : undefined,
          filters: {} // Add empty filters to match SearchRequestSchema
        };

        const validatedRequest = SearchRequestSchema.parse(searchRequest);
        const result = await recommendationService.getRecommendations(validatedRequest);
        return reply.send(result);
      } catch (error) {
        req.log.error('User recommendations error:', error);
        return reply.status(500).send({
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate recommendations',
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  );
};
