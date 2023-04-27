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

  static async getShow(req, res){
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
    const paramId = req.params.id || '';
    const file = await dbClient.db.collection('files').find({ _id: ObjectId(paramId), userId: user[0]._id }).toArray();
    if (file.length === 0){
        return res.status(404).send({ error: 'Not found' });
    }
    return res.status(201).send({
        id: file[0]._id,
        userId: file[0]._userId,
        name: file[0].name,
        type: file[0].type,
        isPublic: file[0].isPublic,
        parentId: file[0].parentId,
      });
  }

  static async getIndex(req, res){
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
    const parentId = req.query.parentId || '0';
    const page = req.query.page || '0';
    if (parentId === 0){
    const files = await dbClient.db.collection('files').find({parentId: parentId}).toArray()
    return res.status(200).send(files);
    }
    const files = await dbClient.db.collection('files').find({parentId: ObjectId(parentId)}).toArray()
    return res.status(200).send(files);
  }
}

module.exports = FilesController;
