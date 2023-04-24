/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

class AuthController {
  static async getConnect(req, res) {
    const authheader = req.headers.authorization;
    if (!authheader) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const auth = new Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
    const email = auth[0];
    const password = auth[1];
    if (!email || !password){
        return res.status(401).send({ error: 'Unauthorized' });
    }
    const user = await dbClient.db.collection('users').find({ email, password: sha1(password) }).toArray();
    if (user.length == 0) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user[0]._id.toString(), 86400);
    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const user = await redisClient.get(key);
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    await redisClient.del(key);
    return res.status(204).send();
  }
}
module.exports = AuthController;
