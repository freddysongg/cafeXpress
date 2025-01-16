import { FastifyInstance } from 'fastify';

export function setupGeminiClient(fastify: FastifyInstance) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL_VERSION = process.env.GEMINI_MODEL_VERSION;

  if (!GEMINI_API_KEY || !GEMINI_MODEL_VERSION) {
    throw new Error('Gemini API key or model version is missing in environment variables.');
  }

  fastify.decorate('geminiClient', {
    async generateRecommendations(input: object) {
      try {
        const response = await fastify.inject({
          method: 'POST',
          url: `https://api.gemini-platform.com/v1/models/${GEMINI_MODEL_VERSION}:predict`,
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        });

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return JSON.parse(response.body);
        } else {
          throw new Error(`Gemini API Error: ${response.body}`);
        }
      } catch (error) {
        fastify.log.error('Error generating recommendations:', error);
        throw new Error('Failed to generate recommendations.');
      }
    }
  });
}
