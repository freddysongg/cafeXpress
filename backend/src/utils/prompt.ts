import type { KeywordMatch } from '@schemas/recommendation.js';

/**
 * Creates a prompt for semantic analysis of cafe keywords
 * Compares user keywords against cafe attributes for relevance scoring
 */
export const createSemanticAnalysisPrompt = (keywords: KeywordMatch[]): string => `
  Analyze the semantic similarity between these keywords and cafe attributes.
  Rate each match from -1.0 to 1.0 based on semantic relevance, considering negations and uncertainty.
  
  Keywords to analyze: ${JSON.stringify(
    keywords.map((k) => ({
      keyword: k.keyword,
      isNegated: k.isNegated,
      importance: k.importance,
      category: k.category,
      context: k.context
    }))
  )}
  
  Instructions:
  1. For negated terms:
     - Use negative confidence scores
     - Consider compound negations (e.g., "not too noisy" vs "not noisy")
  2. For uncertain terms:
     - Scale confidence based on uncertainty strength
     - Maintain relative importance within category
  3. Apply importance multipliers to confidence scores
  4. Consider semantic relationships within cafe context
  5. Maintain category-specific scoring

  Return a JSON array with this format:
  {
    "keyword": string,
    "confidence": number (-1.0 to 1.0),
    "category": string,
    "isNegated": boolean,
    "importance": number,
    "context": {
      "isExplicit": boolean,
      "isPriority": boolean,
      "uncertainty": {
        "isUncertain": boolean,
        "modifier": string?,
        "strength": number
      }
    }
  }
`;

/**
 * Creates a prompt for analyzing search query keywords
 * Extracts and categorizes relevant keywords from user input
 */
export const createKeywordAnalysisPrompt = (query: string): string => `
  Analyze this café search query and extract relevant keywords, including negations, importance, and uncertainty.
  Query: "${query}"

  Instructions:
  1. Identify keywords and their categories
  2. Detect negations using:
     - Direct negation: "not", "no", "without", "lack of"
     - Indirect negation: "away from", "avoiding", "except"
     - Compound negation: "not too", "not very"
  3. Detect uncertainty modifiers:
     - Weak uncertainty: "maybe", "kind of", "somewhat", "a little"
     - Medium uncertainty: "preferably", "if possible", "would like"
     - Strong certainty: "must have", "definitely", "very", "really"
  4. Determine keyword importance based on:
     - Explicit emphasis (e.g., "best", "must have", "really")
     - Priority terms (e.g., "coffee", "wifi", "vegan")
     - Context and position in query
     - Certainty level of expression

  Return a JSON array of keywords with this format:
  {
    "keyword": string,
    "confidence": number (-1.0 to 1.0, use negative for negated terms),
    "category": "ambiance" | "dietary" | "activity" | "general",
    "isNegated": boolean,
    "importance": number (0.5 to 2.0),
    "context": {
      "isExplicit": boolean,
      "isPriority": boolean,
      "uncertainty": {
        "isUncertain": boolean,
        "modifier": string (optional),
        "strength": number (0.0 to 1.0)
      }
    }
  }

  Categories:
  - ambiance (cozy, rustic, modern, quiet, loud, vibrant)
  - dietary (vegan, gluten-free, organic)
  - activity (work, study, meeting, social)
  - general (cafe, coffee, tea, wifi)

  Examples:
  1. "not a noisy cafe with really good wifi":
  [
    {
      "keyword": "noisy",
      "confidence": -0.9,
      "category": "ambiance",
      "isNegated": true,
      "importance": 1.0,
      "context": {
        "isExplicit": true,
        "isPriority": false,
        "uncertainty": { "isUncertain": false, "strength": 1.0 }
      }
    },
    {
      "keyword": "wifi",
      "confidence": 0.95,
      "category": "general",
      "isNegated": false,
      "importance": 1.5,
      "context": {
        "isExplicit": true,
        "isPriority": true,
        "uncertainty": { "isUncertain": false, "strength": 1.0 }
      }
    }
  ]

  2. "maybe a quiet cafe for studying":
  [
    {
      "keyword": "quiet",
      "confidence": 0.6,
      "category": "ambiance",
      "isNegated": false,
      "importance": 1.0,
      "context": {
        "isExplicit": true,
        "isPriority": true,
        "uncertainty": {
          "isUncertain": true,
          "modifier": "maybe",
          "strength": 0.6
        }
      }
    },
    {
      "keyword": "study",
      "confidence": 0.8,
      "category": "activity",
      "isNegated": false,
      "importance": 1.2,
      "context": {
        "isExplicit": true,
        "isPriority": true,
        "uncertainty": { "isUncertain": false, "strength": 1.0 }
      }
    }
  ]
`;
