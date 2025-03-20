import { FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '@config/db.js';
import { users, reviews } from '@config/schemas.js';
import { eq } from 'drizzle-orm';
import { UserBody } from '@schemas/user.js';

/**
 * Create User
 */
export async function createUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { username, email, firstName, lastName, phone, password, description, location } =
      req.body as UserBody;

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        firstName,
        lastName,
        phone,
        password,
        description,
        location: location ? sql`${JSON.stringify(location)}` : null
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt
      });

    reply.send({
      status: 'success',
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating user:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get User Details by ID
 */
export async function getUserById(
  req: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;

    // Fetch user details
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user.length) {
      reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
      return;
    }

    reply.send({
      status: 'success',
      message: 'User data retrieved',
      data: user
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching user details:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get All Users
 */
export async function getAllUsers(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Fetch all users
    const usersList = await db.select().from(users);

    reply.send({
      status: 'success',
      message: 'Users data retrieved',
      data: usersList
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching users:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Update User Details
 */
export async function updateUser(
  req: FastifyRequest<{
    Params: { userId: string };
    Body: Partial<UserBody>;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;
    const { firstName, lastName, email, location, password } = req.body;

    // Update user
    const updatedUser = await db
      .update(users)
      .set({
        firstName,
        lastName,
        email,
        password,
        location: location ? sql`${JSON.stringify(location)}` : null
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        location: users.location
      });

    if (!updatedUser.length) {
      reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
      return;
    }

    reply.send({
      status: 'success',
      message: 'User updated successfully',
      data: updatedUser[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating user:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Delete a User by ID
 */
export async function deleteUser(
  req: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;

    await db.delete(reviews).where(eq(reviews.userId, userId));
    // Delete user
    const deletedUser = await db.delete(users).where(eq(users.id, userId)).returning({
      id: users.id,
      username: users.username,
      email: users.email
    });

    if (!deletedUser.length) {
      reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
      return;
    }

    reply.send({
      status: 'success',
      message: 'User deleted successfully',
      data: deletedUser[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting user:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}
