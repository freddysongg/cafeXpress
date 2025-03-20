import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { users } from '@config/schemas.js';
import { eq } from 'drizzle-orm';
import { RegisterBody, LoginBody } from '@schemas/authentication.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Register a new user
 */
export async function registerUser(
  req: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { username, email, firstName, lastName, password } = req.body;

    // Check if user already exists
    const userExists = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (userExists.length) {
      return reply.status(400).send({
        status: 'error',
        message: 'User already exists.'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        firstName,
        lastName,
        email,
        password: hashedPassword
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt
      });

    return reply.status(201).send({
      status: 'success',
      message: 'User registered successfully',
      data: newUser
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error registering user:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Login user and issue JWT
 */
export async function loginUser(
  req: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user[0].password);

    if (!isPasswordValid) {
      return reply.status(401).send({
        status: 'error',
        message: 'Invalid credentials.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user[0].id,
        firstName: user[0].firstName,
        lastName: user[0].lastName,
        email: user[0].email,
        role: user[0].role
      },
      process.env.JWT_SECRET!, // Use a strong secret key
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    return reply.status(200).send({
      status: 'success',
      message: 'Login successful',
      data: {
        token
        //userId: user[0].id
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error logging in user:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Update User Password
 */
export async function updateUserPassword(
  req: FastifyRequest<{
    Params: { userId: string };
    Body: { currentPassword: string; newPassword: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;
    const { currentPassword, newPassword } = req.body;

    // Fetch the user from the database
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user.length) {
      reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
      return;
    }

    // Validate the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user[0].password);
    if (!isPasswordValid) {
      reply.status(401).send({
        status: 'error',
        message: 'Current password is incorrect.'
      });
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    const updatedUser = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        description: users.description,
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
      message: 'Password updated successfully',
      data: updatedUser[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating password:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}
