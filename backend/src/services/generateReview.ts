import { db } from '@config/db.js';
import { cafes, reviews, users } from '@config/schemas.js';
import { GeminiReviewResponse } from '@schemas/gemini';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GOOGLE_CLOUD_API as string;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';

/**
 * Generate a fake review for a coffee shop using Gemini API
 */
async function generateFakeReview(coffeeShopName: string, location: string) {
  const prompt = `Write a realistic and positive review for a coffee shop named ${coffeeShopName} located in ${location}. The review should be formatted as follows:
    Rating: (1-5 stars)
    Title: (Short, catchy title)
    Description: (2-3 sentences mentioning the ambiance, coffee quality, and service)`;

  try {
    const response = await axios.post<GeminiReviewResponse>(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const reviewText = response.data.candidates[0].content.parts[0].text;

    // Extract structured data
    const ratingMatch = reviewText.match(/Rating:\s*(\d(?:\.\d)?)/);
    const titleMatch = reviewText.match(/Title:\s*(.+)/);
    const descriptionMatch = reviewText.match(/Description:\s*([\s\S]+)/);

    return {
      rating: ratingMatch ? ratingMatch[1] : '5',
      title: titleMatch ? titleMatch[1] : 'Great Coffee Spot',
      description: descriptionMatch
        ? descriptionMatch[1].trim()
        : 'This coffee shop has a great ambiance, excellent coffee, and friendly service!'
    };
  } catch (error) {
    console.error('Error generating fake review:', error);
    return null;
  }
}

export async function generateReviewsForCafe(cafe: typeof cafes.$inferSelect) {
  // Fetch all users from the database
  const allUsers = await db.select().from(users);

  if (allUsers.length === 0) {
    console.error('No users found in the database.');
    return;
  }

  const numReviews = Math.floor(Math.random() * 5) + 6; // Generate 6-10 reviews

  for (let i = 0; i < numReviews; i++) {
    const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)]; // Select a random user

    const fakeReview = await generateFakeReview(cafe.name, cafe.city);

    if (fakeReview) {
      await db.insert(reviews).values({
        cafeId: cafe.id,
        userId: randomUser.id,
        rating: parseFloat(fakeReview.rating), // Convert rating to number
        title: fakeReview.title,
        description: fakeReview.description
      });
    }
  }

  console.log(`Fake reviews successfully generated for cafe: ${cafe.name}`);
}
