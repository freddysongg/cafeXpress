import { cosineSimilarity } from './math';

export class SimilarityCalculator {
  static async calculateKeywordMatch(
    inputEmbedding: number[],
    keywordEmbeddings: Map<string, number[]>,
    threshold: number
  ) {
    const matches: { keyword: string; similarity: number }[] = [];

    for (const [keyword, embedding] of keywordEmbeddings.entries()) {
      const similarity = cosineSimilarity(inputEmbedding, embedding);
      if (similarity >= threshold) {
        matches.push({ keyword, similarity });
      }
    }

    return matches;
  }
}
