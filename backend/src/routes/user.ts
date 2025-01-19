import { FastifyInstance } from 'fastify';
import { 
    createUser, 
    getUserById,
    getAllUsers,
    updateUser,
    deleteUser,
 } from '@services/user';
import { Param } from 'drizzle-orm';

export const usersRoutes = async (app: FastifyInstance) => {
    //Create user
    app.post('/:userId', async (req, reply) => {
        try {
            const response = await createUser(req);
            reply.send(response);
        } catch (error) {
            app.log.error('Error creating user:', error);
            reply.status(500).send({status: 'error', message: 'Internal server error'});
        } 
    });

    // Get user details by ID
    app.get<{
        Params: {
        userId: string;
        };
    }>('/:userId', async (req, reply) => {
        try {
        const response = await getUserById(req);
        reply.send(response);
        } catch (error) {
        app.log.error('Error fetching user details:', error);
        reply.status(500).send({ status: 'error', message: 'Internal server error' });
        }
    });

    //Get all users
    app.get('/:userId', async (req, reply) => {
        try {
            const response = await getAllUsers(req);
            reply.send(response);
        } catch (error) {
            app.log.error('Error fetching users:', error);
            reply.status(500).send({ status: 'error', message: 'Internal server error' });
        }
    });

    //Update user
    app.patch<{
        Params: {
            userId: string;
        };

        Body: Partial<{
            username: string;
            email: string;
            description: string;
        }>;
    }> ('/:userId', async (req, reply) => {
        try {
            const response = await updateUser(req);
            reply.send(response);
        } catch (error) {
            app.log.error('Error updating user', error);
            reply.status(500).send({ status: 'error', message: 'Internal server error' });
        }
    });
    
    // Delete user by ID
    app.delete<{
        Params: {
        userId: string;
        };
    }>('/:userId', async (req, reply) => {
        try {
        const response = await deleteUser(req);
        reply.send(response);
        } catch (error) {
        app.log.error('Error deleting user:', error);
        reply.status(500).send({ status: 'error', message: 'Internal server error' });
        }
    });

};

