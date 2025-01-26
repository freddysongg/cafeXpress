import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

export async function getEmbedding(text: string, retryCount = 0): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return getEmbedding(text, retryCount + 1);
    }
    if (error instanceof Error) {
      throw new Error(
        `Failed to generate embedding after ${MAX_RETRIES} attempts: ${error.message}`
      );
    }
    throw new Error(`Failed to generate embedding after ${MAX_RETRIES} attempts`);
  }
}
