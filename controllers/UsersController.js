import dbClient from '../utils/db';

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
}

module.exports = UsersController;
