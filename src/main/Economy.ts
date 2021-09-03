import { Data } from 'dsc.db';
import { FabricsManager } from '../managers/FabricsManager';
import { Errors } from '../structures/Errors';
import { Store } from '../structures/Store';
import { Base } from './Base';
import { CollectResponse, EconomyOptions, LeaderboardOptions, LeaderboardUser, User, WorkOptions } from './interfaces';

export class Economy extends Base {
  constructor(options: EconomyOptions) {
    super(options);
  }

  public get store(): Store {
    return new Store(this);
  }

  public get fabrics(): FabricsManager {
    return new FabricsManager(this);
  }

  public fetch(userID: string, guildID?: string): Promise<User | null> {
    return new Promise(async (resolve) => {
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let query = guildID ? { 'data.userID': userID, 'data.guildID': guildID } : { 'data.userID': userID };
      let raw = await this.db.fetch(query);
      if (!raw || !raw.data) return resolve(null);
      return resolve(raw.data);
    });
  }

  public ensure(userID: string, guildID?: string): Promise<User> {
    return new Promise(async (resolve) => {
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let data = await this.fetch(userID, guildID);
      if (data) return resolve(data);
      let key = this.key(userID, guildID);
      let raw = await this.db.set(key, {
        userID: userID,
        guildID: guildID ?? null,
        wallet: 0,
        bank: 0,
        inventory: [],
        timeouts: { work: null, fabric: null },
        fabric: { xp: 0, level: 1, employees: 0 },
      } as User);
      return resolve(raw.data);
    });
  }

  public delete(userID: string, guildID?: string): Promise<User | null> {
    return new Promise(async (resolve) => {
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let query = guildID ? { 'data.userID': userID, 'data.guildID': guildID } : { 'data.userID': userID };
      let raw = await this.db.delete(query);
      if (!raw || !raw.data) return resolve(null);
      return resolve(raw.data);
    });
  }

  public leaderboard(options: LeaderboardOptions): Promise<LeaderboardUser[] | null> {
    return new Promise(async (resolve) => {
      let raw = typeof options.guildID !== 'string' ? await this.db.list() : ((await this.db.schema.find({ 'data.guildID': options.guildID })) as Data[]);
      let arr: LeaderboardUser[] = [];
      if (!raw) return resolve(null);
      raw
        .sort((a, b) => b.data.bank - a.data.bank)
        .map((r) => r.data)
        .forEach((r: User, i) => {
          arr.push({
            pos: i + 1,
            userID: r.userID,
            guildID: r.guildID,
            bank: r.bank,
            wallet: r.wallet,
          });
        });
      if (typeof options.limit === 'number' && options.limit > 0) return resolve(arr.slice(0, options.limit));
      return resolve(arr);
    });
  }

  public list(guildID?: string): Promise<User[] | null> {
    return new Promise(async (resolve) => {
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let raw =
        typeof guildID !== 'string' ? ((await this.db.schema.find({ 'data.guildID': null })) as Data[]) : ((await this.db.schema.find({ 'data.guildID': guildID })) as Data[]);
      if (!raw) return resolve(null);
      return resolve(raw.map((r) => r.data));
    });
  }

  public addMoney(amount: number, userID: string, guildID?: string): Promise<User | null> {
    return new Promise(async (resolve) => {
      if (typeof amount !== 'number') throw new Error(Errors.FLAGS.AMOUNT_NUMBER);
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let user = await this.fetch(userID, guildID);
      if (!user) return resolve(null);
      await this.db.add(`${this.key(userID, guildID)}.bank`, amount);
      return resolve(await this.fetch(userID, guildID));
    });
  }

  public removeMoney(amount: number, userID: string, guildID?: string): Promise<User | null> {
    return new Promise(async (resolve) => {
      if (typeof amount !== 'number') throw new Error(Errors.FLAGS.AMOUNT_NUMBER);
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let user = await this.fetch(userID, guildID);
      if (!user) return resolve(null);
      await this.db.subtract(`${this.key(userID, guildID)}.bank`, amount);
      return resolve(await this.fetch(userID, guildID));
    });
  }

  public transfer(amount: number, from: string, to: string, guildID: string): Promise<User | null> {
    return new Promise(async (resolve) => {
      if (typeof amount !== 'number') throw new Error(Errors.FLAGS.AMOUNT_NUMBER);
      if (typeof from !== 'string' || typeof to !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let user = await this.fetch(from);
      if (!user || user.wallet < amount) return resolve(null);
      let fkey = this.key(from, guildID);
      let tkey = this.key(to, guildID);
      await this.db.subtract(`${fkey}.wallet`, amount);
      await this.db.add(`${tkey}.bank`, amount);
      return resolve(await this.fetch(from, guildID));
    });
  }

  public deposit(amount: number, userID: string, guildID?: string): Promise<User | null> {
    return new Promise(async (resolve) => {
      if (typeof amount !== 'number') throw new Error(Errors.FLAGS.AMOUNT_NUMBER);
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let user = await this.fetch(userID, guildID);
      if (!user) return resolve(null);
      if (user.wallet < amount) return resolve(null);
      let key = this.key(userID, guildID);
      await this.db.subtract(`${key}.wallet`, amount);
      await this.db.add(`${key}.bank`, amount);
      return resolve(await this.fetch(userID, guildID));
    });
  }

  public withdraw(amount: number, userID: string, guildID?: string): Promise<User | null> {
    return new Promise(async (resolve) => {
      if (typeof amount !== 'number') throw new Error(Errors.FLAGS.AMOUNT_NUMBER);
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      let user = await this.fetch(userID, guildID);
      if (!user) return resolve(null);
      if (user.bank < amount) return resolve(null);
      let key = this.key(userID, guildID);
      await this.db.subtract(`${key}.bank`, amount);
      await this.db.add(`${key}.wallet`, amount);
      return resolve(await this.fetch(userID, guildID));
    });
  }

  public work(userID: string, guildID?: string, options?: WorkOptions): Promise<CollectResponse | null> {
    return new Promise(async (resolve) => {
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      if ((options && (typeof options.timeout !== 'number' || typeof options.money?.max !== 'number')) || typeof options?.money?.min !== 'number')
        throw new Error(Errors.FLAGS.MIN_MAX_AMOUNT);
      let user = await this.fetch(userID, guildID);
      if (!user) return resolve(null);
      let timeout = options?.timeout ?? 5 * 60 * 60 * 1000;
      let money = this.random(options?.money?.min ?? 50, options?.money?.max ?? 150);
      if (user.timeouts.work && new Date().getTime() - user.timeouts.work.getTime() < timeout) {
        return resolve({
          err: 'COOLDOWN',
          user: user,
          remaining: this.ms(timeout - (Date.now() - user.timeouts.work.getTime())),
        });
      }

      await this.db.set(`${this.key(userID, guildID)}.timeouts.work`, new Date());
      await this.db.add(`${this.key(userID, guildID)}.wallet`, money);

      return resolve({ err: null, user: (await this.fetch(userID, guildID)) as User });
    });
  }

  public daily(userID: string, guildID?: string, options?: WorkOptions): Promise<CollectResponse | null> {
    return new Promise(async (resolve) => {
      if (!userID || typeof userID !== 'string') throw new Error(Errors.FLAGS.USER_ID_STRING);
      if (guildID && typeof guildID !== 'string') throw new Error(Errors.FLAGS.GUILD_ID_STRING);
      if ((options && (typeof options.timeout !== 'number' || typeof options.money?.max !== 'number')) || typeof options?.money?.min !== 'number')
        throw new Error(Errors.FLAGS.MIN_MAX_AMOUNT);
      let user = await this.fetch(userID, guildID);
      if (!user) return resolve(null);
      let timeout = options?.timeout ?? 20 * 60 * 60 * 1000;
      let money = this.random(options?.money?.min ?? 150, options?.money?.max ?? 350);
      if (user.timeouts.work && new Date().getTime() - user.timeouts.work.getTime() < timeout) {
        return resolve({
          err: 'COOLDOWN',
          user: user,
          remaining: this.ms(timeout - (Date.now() - user.timeouts.work.getTime())),
        });
      }

      await this.db.set(`${this.key(userID, guildID)}.timeouts.work`, new Date());
      await this.db.add(`${this.key(userID, guildID)}.wallet`, money);

      return resolve({ err: null, user: (await this.fetch(userID, guildID)) as User });
    });
  }
}
