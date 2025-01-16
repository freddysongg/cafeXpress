import { HookHandlerDoneFunction } from 'fastify';
import { z } from 'zod';

declare module 'fastify' {
  export interface FastifyInstance {
    processSchema: ({
      paramsSchema,
      bodySchema,
      querySchema,
      headerSchema
    }: {
      paramsSchema?: z.ZodTypeAny;
      bodySchema?: z.ZodTypeAny;
      querySchema?: z.ZodTypeAny;
      headerSchema?: z.ZodTypeAny;
    }) => (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => void;
    geminiClient: {
      generateRecommendations(input: object): Promise<any>;
    };
  }
}
