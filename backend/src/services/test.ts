import { db } from '@config/db.js';
import { test } from '@config/schemas.js';

export async function getAllTest() {
  const allTest = await db.select().from(test);
  console.log(allTest);
}
