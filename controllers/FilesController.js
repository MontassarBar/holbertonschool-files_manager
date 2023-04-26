/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fs = require('fs');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const user = await dbClient.db.collection('users').find({ _id: ObjectId(userId) }).toArray();
    if (user.length === 0) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    if (!req.body.name) {
      return res.status(400).send({ error: 'Missing name' });
    }
    const types = ['folder', 'file', 'image'];
    if (!req.body.type || !types.includes(req.body.type)) {
      return res.status(400).send({ error: 'Missing type' });
    }
    if (!req.body.data && req.body.type !== 'folder') {
      return res.status(400).send({ error: 'Missing data' });
    }
    if (req.body.parentId) {
      const parentFile = await dbClient.db.collection('files').find({ _id: ObjectId(req.body.parentId) }).toArray();
      if (parentFile.length === 0) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (parentFile[0].type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }
    if (req.body.type === 'folder') {
      const file = await dbClient.db.collection('files').insertOne({
        userId: user[0]._id,
        name: req.body.name,
        type: req.body.type,
        isPublic: req.body.isPublic || false,
        parentId: req.body.parentId || 0,
      });
      return res.status(201).send({
        id: file.insertedId,
        userId: user[0]._id,
        name: req.body.name,
        type: req.body.type,
        isPublic: req.body.isPublic || false,
        parentId: req.body.parentId || 0,
      });
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    fs.mkdir(folderPath, { recursive: true }, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });
    const fileName = uuidv4();
    const data = new Buffer.from(req.body.data, 'base64').toString();
    fs.writeFile(`${folderPath}/${fileName}`, data, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });
    const file = await dbClient.db.collection('files').insertOne({
      userId: user[0]._id, name: req.body.name, type: req.body.type, isPublic: req.body.isPublic || false, parentId: req.body.parentId || 0, localPath: `${folderPath}/${fileName}`,
    });
    return res.status(201).send({
      id: file.insertedId,
      userId: user[0]._id,
      name: req.body.name,
      type: req.body.type,
      isPublic: req.body.isPublic || false,
      parentId: req.body.parentId || 0,
    });
  }
}

module.exports = FilesController;
