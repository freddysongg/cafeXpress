import { db } from '@config/db';
import { users } from '@config/schemas';

export async function getAllUsers() {
    const allUsers = await db.select().from(users);
    console.log(allUsers);
}

