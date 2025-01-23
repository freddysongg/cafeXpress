import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { users } from '@config/schemas';
import { eq } from 'drizzle-orm';


/**
 * Create User
 */
export async function createUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { username, email, firstName, lastName, phone, password, description } = req.body as {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      password: string;
      description?: string;
    };

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({ username, email, firstName, lastName, phone, password, description })
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
export async function getUserById(req: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply): Promise<void> {
  try {
    const userId = req.params.userId;

    // Fetch user details
    const user = await db
      .select({
        username: users.username,
        email: users.email,
        description: users.description,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

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
      data: {
        username: user[0].username,
        email: user[0].email,
        description: user[0].description,
        createdAt: user[0].createdAt
      }
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
    const usersList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt
      })
      .from(users);

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
  req: FastifyRequest<{ Params: { userId: string }; Body: Partial<{ username: string; email: string; description: string }> }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;
    const { username, email, description } = req.body;

    // Update user
    const updatedUser = await db
      .update(users)
      .set({ username, email, description })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        description: users.description
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
