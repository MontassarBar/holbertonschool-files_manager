import { MongoClient } from 'mongodb';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${DB_HOST}:${DB_PORT}`;

class DBClient {
  constructor() {
    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (!err) this.db = client.db(DB_DATABASE);
    });
  }

  isAlive() {
    if (this.db) {
      return true;
    }

    return false;
  }

  async nbUsers() {
    const users = this.db.collection('users');
    const usersNumber = await users.estimatedDocumentCount();
    return usersNumber;
  }

  async nbFiles() {
    const files = this.db.collection('files');
    const filesNumber = await files.estimatedDocumentCount();
    return filesNumber;
  }
}

const dbClient = new DBClient();
export default dbClient;
