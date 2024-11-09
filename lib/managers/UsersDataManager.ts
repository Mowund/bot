import { CachedManager, Snowflake, User } from 'discord.js';
import { App } from '../App.js';
import { DataClassProperties } from '../../src/utils.js';
import { UserData, UserDataSetOptions } from '../structures/UserData.js';

export class UsersDataManager extends CachedManager<Snowflake, UserData, UsersDatabaseResolvable> {
  declare client: App;

  constructor(client: App) {
    super(client, UserData);
  }

  async set(user: UsersDatabaseResolvable, data: UserDataSetOptions, { merge = true } = {}) {
    const id = this.resolveId(user);
    if (!id) throw new Error('Invalid user type: UsersDatabaseResolvable');

    const db = this.client.mongo.db('Mowund').collection('users'),
      oldData =
        (this.cache.get(id) || ((await db.findOne({ _id: id as any })) as unknown as DataClassProperties<UserData>)) ??
        null;

    if (merge) await db.updateOne({ _id: id as any }, { $set: data }, { upsert: true });
    else await db.replaceOne({ _id: id as any }, { $set: data }, { upsert: true });

    await this.client.database.cacheDelete('users', id);
    return this.cache
      .set(id, new UserData(this.client, Object.assign(Object.create(oldData || {}), data, { _id: id })))
      .get(id);
  }

  async fetch(id: Snowflake, { cache = true, force = false } = {}) {
    const existing = this.cache.get(id);
    if (!force && existing) return existing;

    const rawData = (await this.client.mongo
      .db('Mowund')
      .collection('users')
      .findOne({ _id: id as any })) as unknown as DataClassProperties<UserData>;
    if (!rawData) return;

    const data = new UserData(this.client, Object.assign(Object.create(rawData)));
    if (cache) {
      await this.client.database.cacheDelete('users', id);
      this.cache.set(id, data);
    }

    return data;
  }

  /* async find(search: SearchOptions[][], { cache = true, returnCache = false } = {}) {
    const existing = this.cache.filter(r => testConditions(search, r));
    if (returnCache && existing.size) return existing;

    const data = new Collection<Snowflake, UserData>();
    let db: firestore.Query<firestore.DocumentData> = this.client.firestore.collection('users');

    for (const x of search) {
      x.forEach(y => (db = this.client.mongo.db('Mowund').where(y.field, y.operator, y.target)));
      for (const z of (await db.get()).docs) {
        const d = z.data();
        data.set(z.id, new UserData(this.client, Object.assign(Object.create(d), d)));
      }
    }

    if (cache) {
      data.forEach(async d => {
        await this.client.database.cacheDelete('users', d.id);
        this.cache.set(d.id, d);
      });
    }

    return data;
  }*/

  async delete(user: UsersDatabaseResolvable) {
    const id = this.resolveId(user);
    if (!id) throw new Error('Invalid user type: UsersDatabaseResolvable');

    await this.client.mongo
      .db('Mowund')
      .collection('users')
      .deleteOne({ _id: id as any });
    return this.client.database.cacheDelete('users', id);
  }
}

export type UsersDatabaseResolvable = Snowflake | UserData | User;
