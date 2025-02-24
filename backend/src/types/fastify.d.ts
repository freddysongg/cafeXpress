import {
  FastifyRequest,
  FastifyReply,
  HookHandlerDoneFunction,
  RouteGenericInterface,
  RawServerDefault,
  IncomingMessage,
  FastifySchema,
  FastifyTypeProviderDefault,
  FastifyBaseLogger,
  ResolveFastifyRequestType
} from 'fastify';

interface User {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerDefault = RawServerDefault,
  RawRequest extends IncomingMessage = IncomingMessage,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProviderDefault = FastifyTypeProviderDefault,
  ContextConfig = unknown,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  RequestType extends ResolveFastifyRequestType<
    TypeProvider,
    SchemaCompiler,
    RouteGeneric
  > = ResolveFastifyRequestType<TypeProvider, SchemaCompiler, RouteGeneric>
> extends FastifyRequest<
    RouteGeneric,
    RawServer,
    RawRequest,
    SchemaCompiler,
    TypeProvider,
    ContextConfig,
    Logger,
    RequestType
  > {
  user: User;
}
import { z } from 'zod';
import type { GeminiClient } from '@config/gemini.js';

declare module 'fastify' {
  export interface FastifyRequest {
    user?: User;
  }
  export interface FastifyInstance {
    authenticate: <RouteGeneric extends RouteGenericInterface = RouteGenericInterface>(
      request: FastifyRequest<RouteGeneric> & { user: User },
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => void;
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
    gemini: GeminiClient;
  }
}
