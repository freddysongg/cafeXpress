import { FastifyInstance } from 'fastify';
import { getRecommendations } from '@services/recommendation.js';
import { validateUUID } from '@utils/validation.js';
import { PersonalizedRecommendationRequest } from '@schemas/recommendation.js';
import { SemanticSearchService } from '@services/semanticSearch.js';
import { SentimentAnalysisService } from '@services/sentimentAnalysis.js';
import { initializeRecommendationService } from '@services/recommendation.js';

export const recommendationRoutes = async (app: FastifyInstance) => {
  try {
    const semanticSearchService = new SemanticSearchService(app.gemini);
    const sentimentAnalysisService = new SentimentAnalysisService(app.gemini);

    await Promise.all([
      semanticSearchService.initialize().catch((err) => {
        app.log.error('Failed to initialize semantic search service:', err);
        throw err;
      }),
      sentimentAnalysisService.initialize().catch((err) => {
        app.log.error('Failed to initialize sentiment analysis service:', err);
        throw err;
      })
    ]);

    initializeRecommendationService(app.gemini);

    const rateLimit = {
      max: 10,
      timeWindow: '1 minute'
    };

    app.get<{
      Params: {
        userId: string;
      };
      Querystring: {
        latitude?: string;
        longitude?: string;
        dietary?: string;
        activities?: string;
        ambiance?: string;
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

          const request: PersonalizedRecommendationRequest = {
            userId: req.params.userId,
            preferences: {
              dietary: req.query.dietary?.split(','),
              activities: req.query.activities?.split(','),
              ambiance: req.query.ambiance?.split(',')
            }
          };

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

          const result = await getRecommendations(app.gemini, request);
          return reply.send(result);
        } catch (error) {
          req.log.error('Recommendation route error:', error);

          let statusCode = 500;
          let message = 'Failed to generate recommendations';

          if (error instanceof Error) {
            if (error.message.includes('not found')) {
              statusCode = 404;
              message = 'User preferences not found';
            } else if (error.message.includes('invalid input')) {
              statusCode = 400;
              message = 'Invalid input data';
            }
          }

          return reply.status(statusCode).send({
            status: 'error',
            message,
            metadata: {
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    );
  } catch (error) {
    app.log.error('Recommendation routes error:', error);
    throw error;
  }
};
