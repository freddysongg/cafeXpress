import type { KeywordMatch } from '@schemas/recommendation.js';

/**
 * Creates a prompt for semantic analysis of cafe keywords
 * Compares user keywords against cafe attributes for relevance scoring
 */
export const createSemanticAnalysisPrompt = (keywords: KeywordMatch[]): string => `
  Analyze the semantic similarity between these keywords and cafe attributes.
  Rate each match from 0.0 to 1.0 based on semantic relevance.
  
  Keywords to analyze: ${JSON.stringify(keywords.map((k) => k.keyword))}
  Categories: ${JSON.stringify([...new Set(keywords.map((k) => k.category))])}
  
  Return a JSON array in this format:
  [{"keyword": "example", "confidence": 0.9, "category": "ambiance"}]
  
  Consider semantic relationships within cafe context.
`;

/**
 * Creates a prompt for analyzing search query keywords
 * Extracts and categorizes relevant keywords from user input
 */
export const createKeywordAnalysisPrompt = (query: string): string => `
  Analyze this café search query and extract relevant keywords.
  Query: "${query}"
  Return a JSON array of keywords with categories in this format:
  [{"keyword": "example", "confidence": 0.9, "category": "ambiance"}]
  
  Categories:
  - ambiance (cozy, rustic, modern, vibrant)
  - dietary (vegan, gluten-free, organic)
  - general (cafe, coffee, tea)
`;
