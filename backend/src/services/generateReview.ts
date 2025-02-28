import { db } from '@config/db.js';
import { cafes, reviews, users } from '@config/schemas.js';
import { GeminiReviewResponse } from '@schemas/gemini';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GOOGLE_CLOUD_API as string;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Generate a unique fake review for a coffee shop using Gemini API
 */
async function generateFakeReview(coffeeShopName: string, location: string) {
  // Randomly decide if the review should be positive or negative
  const isPositive = Math.random() > 0.3; // 70% positive, 30% negative

  // Randomize the tone or perspective of the review
  const perspectives = [
    'a coffee enthusiast',
    'a remote worker',
    'a student',
    'a tourist',
    'a local resident'
  ];
  const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

  // Randomize adjectives for ambiance, coffee quality, and service
  const positiveAmbianceAdjectives = [
    "cozy", "inviting", "warm", "relaxing", "charming", 
    "quaint", "lively", "vibrant", "modern", "trendy", 
    "rustic", "minimalist", "elegant", "sophisticated", "artistic", 
    "eclectic", "spacious", "airy", "bright", "serene", 
    "intimate", "welcoming", "homely", "picturesque", "tranquil"
  ];
  
  const negativeAmbianceAdjectives = [
    "cramped", "noisy", "dull", "uncomfortable", "chaotic", 
    "crowded", "stuffy", "dingy", "depressing", "overwhelming", 
    "cluttered", "stale", "uninviting", "cold", "impersonal", 
    "bland", "overdecorated", "tacky", "stiff", "unkempt", 
    "stifling", "overbearing", "unpleasant", "harsh", "overcrowded"
  ];

  const positiveCoffeeAdjectives = [
    "rich", "smooth", "bold", "aromatic", "balanced", 
    "flavorful", "robust", "velvety", "exquisite", "delicious", 
    "refreshing", "perfectly brewed", "full-bodied", "complex", "satisfying", 
    "high-quality", "artisanal", "fresh", "unique", "well-crafted", 
    "smooth", "creamy", "zesty", "invigorating", "heavenly"
  ];
  const negativeCoffeeAdjectives = [
    "bitter", "watery", "bland", "overpriced", "burnt", 
    "stale", "weak", "sour", "over-extracted", "under-extracted", 
    "artificial", "flat", "unremarkable", "mediocre", "overwhelming", 
    "unbalanced", "harsh", "unpleasant", "overly acidic", "tasteless", 
    "over-roasted", "underwhelming", "cheap", "uninspired", "disappointing"
  ];

  const positiveServiceAdjectives = [
    "friendly", "attentive", "efficient", "welcoming", "professional", 
    "helpful", "courteous", "knowledgeable", "prompt", "polite", 
    "warm", "accommodating", "personable", "genuine", "thoughtful", 
    "responsive", "gracious", "engaging", "hospitable", "cheerful", 
    "respectful", "proactive", "caring", "enthusiastic", "outstanding"
  ];
  
  const negativeServiceAdjectives = [
    "slow", "rude", "inattentive", "unprofessional", "disorganized", 
    "impersonal", "neglectful", "unfriendly", "careless", "abrupt", 
    "dismissive", "unhelpful", "inefficient", "cold", "indifferent", 
    "overbearing", "pushy", "unresponsive", "unaccommodating", "distracted", 
    "uninterested", "harsh", "unprepared", "unreliable", "frustrating"
  ];

  const exampleTitles = [
    "A Cozy Haven for Coffee Lovers",
    "Overpriced but Worth It",
    "Perfect for Remote Work",
    "Great Coffee, Poor Service",
    "Hidden Gem in the City",
    "A Must-Visit for Coffee Enthusiasts",
    "Charming Ambiance, Average Coffee",
    "The Best Latte in Town",
    "Disappointing Experience",
    "A Quiet Escape from the City",
    "Friendly Staff, Mediocre Coffee",
    "A Coffee Lover's Paradise",
    "Overrated and Overpriced",
    "A Great Spot for Breakfast",
    "The Coffee Was Good, but the Service...",
    "A Little Pricey, but Delicious",
    "Perfect for a Quick Coffee Break",
    "Not What I Expected",
    "A Hidden Gem with Amazing Coffee",
    "Great Atmosphere, but Coffee Could Be Better"
  ];

  const randomAmbiance = isPositive
    ? positiveAmbianceAdjectives[Math.floor(Math.random() * positiveAmbianceAdjectives.length)]
    : negativeAmbianceAdjectives[Math.floor(Math.random() * negativeAmbianceAdjectives.length)];

  const randomCoffee = isPositive
    ? positiveCoffeeAdjectives[Math.floor(Math.random() * positiveCoffeeAdjectives.length)]
    : negativeCoffeeAdjectives[Math.floor(Math.random() * negativeCoffeeAdjectives.length)];

  const randomService = isPositive
    ? positiveServiceAdjectives[Math.floor(Math.random() * positiveServiceAdjectives.length)]
    : negativeServiceAdjectives[Math.floor(Math.random() * negativeServiceAdjectives.length)];

    const prompt = `Write a realistic and ${Math.random() > 0.3 ? 'positive' : 'negative'} review for a coffee shop named ${coffeeShopName} located in ${location}. 
    The review should be from the perspective of ${randomPerspective} and formatted as follows:
    Rating: [a number between 1 and 5, e.g., 2 or 4]
    Title: [a short, catchy, and unique title. Do not use bolding in the title. Examples: ${exampleTitles.join(', ')}]
    Description: [2-3 sentences describing the ${randomAmbiance} ambiance, ${randomCoffee} coffee quality, and ${randomService} service, e.g., "The cozy ambiance makes this place perfect for relaxing. The rich coffee is a delight, and the friendly service adds to the wonderful experience."]

    Do not repeat the same title, be creative and unique. Do not deviate from this format.`;

  try {
    console.log('Sending prompt to Gemini API:', prompt);

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

    console.log('API Response:', response.data);

    const reviewText = response.data.candidates[0].content.parts[0].text;
    console.log('Review Text:', reviewText);

    // Flexible regex patterns
    const ratingRegex = /Rating:\s*(\d(?:\.\d)?)/i; // Case-insensitive, allows for optional spaces
    const titleRegex = /Title:\s*(.+?)\s*(?=\n|Description:|$)/i; // Case-insensitive, stops at newline or "Description:"
    const descriptionRegex = /Description:\s*([\s\S]+?)\s*(?=\n|$)/i; // Case-insensitive, captures multi-line descriptions

    // Extract structured data
    const ratingMatch = reviewText.match(ratingRegex);
    const titleMatch = reviewText.match(titleRegex);
    const descriptionMatch = reviewText.match(descriptionRegex);

    if (!ratingMatch || !titleMatch || !descriptionMatch) {
      throw new Error('Failed to extract review data from API response.');
    }

    return {
      rating: ratingMatch[1],
      title: titleMatch[1],
      description: descriptionMatch[1].trim()
    };
  } catch (error) {
      const err = error as Error;
      console.error('API Error:', err.message);
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
      console.log('Generated Fake Review:', fakeReview);

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