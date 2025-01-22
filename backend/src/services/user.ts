import { FastifyRequest } from 'fastify';
import { db } from '@config/db.js';
import { users } from '@config/schemas';
import { eq } from 'drizzle-orm';

type UserResponse = {
  status: 'success' | 'error';
  message: string;
  data?: any;
};

/**
 * Create User
 */

export async function createUser(req: FastifyRequest): Promise<UserResponse> {
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
    return {
      status: 'success',
      message: 'User created successfully',
      data: newUser
    };
  } catch (error) {
    const err = error as Error;
    console.error('Error creating user:', err.message);
    return {
      status: 'error',
      message: err.message
    };
  }
}

/**
 * Get User Details by ID
 */
export async function getUserById(
  req: FastifyRequest<{ Params: { userId: string } }>
): Promise<UserResponse> {
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
      return {
        status: 'error',
        message: 'User not found.'
      };
    }

    return {
      status: 'success',
      message: 'User data retrieved',
      data: {
        username: user[0].username,
        email: user[0].email,
        description: user[0].description,
        createdAt: user[0].createdAt
      }
    };
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching user details:', err.message);
    return {
      status: 'error',
      message: err.message
    };
  }
}

/**
 * Get All Users
 */
export async function getAllUsers(req: FastifyRequest): Promise<UserResponse> {
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

    return {
      status: 'success',
      message: 'Users data retrieved',
      data: usersList
    };
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching users:', err.message);
    return {
      status: 'error',
      message: err.message
    };
  }
}

/**
 * Update User Details
 */
export async function updateUser(
  req: FastifyRequest<{
    Params: { userId: string };
    Body: Partial<{ username: string; email: string; description: string }>;
  }>
): Promise<UserResponse> {
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
      return {
        status: 'error',
        message: 'User not found.'
      };
    }

    return {
      status: 'success',
      message: 'User updated successfully',
      data: updatedUser[0]
    };
  } catch (error) {
    const err = error as Error;
    console.error('Error updating user:', err.message);
    return {
      status: 'error',
      message: err.message
    };
  }
}

/**
 * Delete a User by ID
 */
export async function deleteUser(
  req: FastifyRequest<{ Params: { userId: string } }>
): Promise<UserResponse> {
  try {
    const userId = req.params.userId;

    // Delete user
    const deletedUser = await db.delete(users).where(eq(users.id, userId)).returning({
      id: users.id,
      username: users.username,
      email: users.email
    });

    if (!deletedUser.length) {
      return {
        status: 'error',
        message: 'User not found.'
      };
    }

    return {
      status: 'success',
      message: 'User deleted successfully',
      data: deletedUser[0]
    };
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting user:', err.message);
    return {
      status: 'error',
      message: err.message
    };
  }
}
