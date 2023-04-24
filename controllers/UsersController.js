import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

class UsersController {
  static async postNew(req, res) {
    if (!req.body.email) {
      return res.status(400).send({ error: 'Missing email' });
    }
    if (!req.body.password) {
      return res.status(400).send({ error: 'Missing password' });
    }
    const filtredEmail = await dbClient.db.collection('users').find({ email: req.body.email }).toArray();
    if (filtredEmail.length !== 0) {
      return res.status(400).send({ error: 'Already exist' });
    }
    const hashedPassword = sha1(req.body.password);
    const result = await dbClient.db.collection('users').insertOne({ email: req.body.email, password: hashedPassword });
    return res.status(201).send({ id: result.insertedId, email: req.body.email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const user = await dbClient.db.collection('users').find({ _id: ObjectId(userId) }).toArray();
    if (user.length === 0) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    return res.status(200).send({ id: user[0]._id, email: user[0].email });
  }
}

module.exports = UsersController;
