import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { cafes, users } from '@config/schemas'; // Import your predefined schema
import { eq } from 'drizzle-orm';
import { all } from 'axios';

// Define the Cafe type based on the schema
type Cafe = typeof cafes.$inferSelect;

// Keywords for each ID type
const idKeywords = {
  id2: [
    'quiet', 'loud', 'cozy', 'modern', 'traditional', 'romantic', 'family-friendly', 'hipster',
    'minimalist', 'luxurious', 'rustic', 'artistic', 'casual', 'vibrant', 'relaxed', 'bright',
    'dimly lit', 'chic', 'energetic', 'calm', 'elegant', 'nostalgic', 'study-friendly',
    'intimate', 'artsy', 'luxury', 'casual', 'party', 'tranquil', 'bohemian', 'industrial',
    'community-oriented', 'romantic', 'adventurous', 'playful', 'festive', 'welcoming',
  ],
  id3: [
    'study-friendly', 'social', 'intimate', 'artsy', 'luxury', 'casual', 'party',
    'tranquil', 'bohemian', 'industrial', 'community-oriented', 'romantic', 'adventurous',
    'playful', 'festive', 'welcoming'
  ],
  id4: [
    'vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'halal', 'kosher',
    'nut-free', 'low-carb', 'organic', 'farm-to-table', 'sustainable',
  ],
};

/**
 * Determine the most frequent category based on ambiance and dietary options
 * @param req - Fastify request object
 * @param reply - Fastify reply object
 */
export async function determineMostFrequentCategory(
  req: FastifyRequest<{ Params: { userId: string } }>, // Use Params instead of Querystring
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract userId from route parameters
    const { userId } = req.params;

    // Fetch the user's favoriteCafes field
    const user = await db
      .select({ favoriteCafes: users.favoriteCafes })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      reply.status(404).send({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const favoriteCafes = user[0].favoriteCafes;

    // If favoriteCafes is null, return id0
    if (favoriteCafes === null) {
      reply.status(200).send({
        status: 'success',
        message: 'Category determined successfully',
        idType: 'id0',
      });
      return;
    }

    // If the user has more than 10 favorite cafes, return ID 1
    if (favoriteCafes.length >= 10) {
      reply.status(200).send({
        status: 'success',
        message: 'Category determined successfully',
        idType: 'id1',
      });
      return;
    }

    // Fetch all cafes in the user's favorite cafes list
    const fetchedCafes = await Promise.all(
      favoriteCafes.map((cafeId) =>
        db
          .select()
          .from(cafes)
          .where(eq(cafes.id, cafeId))
          .limit(1)
      )
    );

    // Flatten the fetched data and filter out null values
    const validCafes = fetchedCafes
      .map((cafeArray) => cafeArray[0]) // Extract the first element of each array
      .filter((cafe) => cafe !== null) as Cafe[]; // Filter out null values

      const transformRecordToArray = (data: string[] | Record<string, boolean> | null): string[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data; // If it's already an array, return it
        return Object.keys(data).filter((key) => data[key]); // If it's a record, transform it
      };

    // Combine all ambiance and dietary options into a single list
    const allKeywords = validCafes.flatMap((cafe) => [
      ...transformRecordToArray(cafe.ambiance),
      ...transformRecordToArray(cafe.dietaryOptions),
    ]);

    // Initialize keyword counts for each ID type
    const keywordCounts = {
      id2: 0,
      id3: 0,
      id4: 0,
    };

    // Count keywords for each ID type
    allKeywords.forEach((keyword) => {
      if (idKeywords.id2.includes(keyword)) {
        keywordCounts.id2++;
      }
      if (idKeywords.id3.includes(keyword)) {
        keywordCounts.id3++;
      }
      if (idKeywords.id4.includes(keyword)) {
        keywordCounts.id4++;
      }
    });

    // Log the counts for each ID type
    console.log('Keyword Counts:', {
      id2: keywordCounts.id2,
      id3: keywordCounts.id3,
      id4: keywordCounts.id4,
    });


    // Determine the ID type with the highest keyword count
    let selectedId = 'id2'; // Default to ID 2
    let maxCount = keywordCounts.id2;

    if (keywordCounts.id3 > maxCount) {
      selectedId = 'id3';
      maxCount = keywordCounts.id3;
    }
    if (keywordCounts.id4 > maxCount) {
      selectedId = 'id4';
      maxCount = keywordCounts.id4;
    }


    // Send the response
    reply.status(200).send({
      status: 'success',
      message: 'Category determined successfully',
      allKeywords,
      idType: selectedId,
      id2: keywordCounts.id2,
      id3: keywordCounts.id3,
      id4: keywordCounts.id4,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error determining category:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message,
    });
  }
}