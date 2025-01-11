import { db } from '@config/db';
import { test } from '@config/schemas';

export async function getAllTest() {
  const allTest = await db.select().from(test);
  console.log(allTest);
}
