import { Client } from "discord.js";
import { Database } from "dsc.db";
import _ from 'lodash';
import { Base } from "./Base";
import { FabricManager } from "./Fabric";

export class Economy extends Base {
  public db: Database;
  public roles: Role[];
  public items: Item[];
  private defaultData: UserData;
  private bot: Client;
  constructor(bot: Client, options: EconomyOptions, custom?: EconomyCustom) {
    super();

    this.roles = [];
    this.items = [];
    this.defaultData = {
      money: 0,
      roles: [],
      items: [],
      work: {
        xp: 0,
        level: 1,
      },
      timeouts: {
        work: null,
        fabricIncome: null,
      },
      fabric: {
        xp: 0,
        level: 1,
        employees: 1,
        lastPayment: null,
      }
    };

    this.db = new Database({
      mongoURL: options.mongoURL,
      collection: 'ECONOMY',
      connectionOptions: {
        user: options.mongoUser,
        pass: options.mongoPass,
      },
      defaultData: this.defaultData,
    });
    
    this.bot = bot;

    custom?.roles?.map((obj) => {
      if(this.roles.find((x) => x.id === obj.id)) throw new Error(`There's an existing roles with the same ID!`);
      this.roles.push(obj);
    });

    custom?.items?.map((obj) => {
      if(this.items.find((x) => x.id === obj.id)) throw new Error(`There's an existing roles with the same ID!`);
      this.items.push(obj);
    });
  }

  public get fabrics(): FabricManager {
    return new FabricManager(this);;
  }

  public random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  public getNeededXP(lvl: number): number {
    return (lvl * lvl * 100) / 2;
  };

  public leaderboard(limit?: number): Promise<LeaderboardUser[]> {
    return new Promise(async (resolve) => {
      let data = await this.db.all();
      let arr: LeaderboardUser[] = [];
      data.sort((a, b) => b.data.money - a.data.money).forEach((obj, i) => {
        arr.push({
          pos: i + 1,
          money: isNaN(obj.data.money) ? 0 : obj.data.money,
          userID: `${obj.ID}`,
        });
      });
      if(typeof limit === 'number' && limit > 0) resolve(arr.slice(0, limit));
      resolve(arr);
    });
  }

  public all(): Promise<any> {
    return new Promise(async (resolve) => {
      let data = await this.db.all();
      resolve(data);
    });
  }

  public resetUser(userID: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let data = await this.db.fetch(userID);
      if(!data) return reject(`User doesn't exist!`);
      await this.db.set(userID, this.defaultData);
      resolve();
    });
  }
  
  public deleteUser(userID: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let data = await this.db.fetch(userID);
      if(!data) return reject(`User doesn't exist!`);
      await this.db.delete(userID);
      resolve();
    });
  }

  public setMoney(userID: string, amount: number): Promise<UserData> {
    return new Promise(async (resolve, reject) => {
      if(typeof amount !== 'number') reject('Amount must be a number!');
      let data = await this.db.ensure(userID);
      if(!data) return reject(`User not found!`)
      let _new = await this.db.set(`${userID}.money`, amount);
      resolve(_new);
    });
  }

  public give(userID: string, amount: number): Promise<UserData> {
    return new Promise(async (resolve, reject) => {
      if(typeof amount !== 'number') reject('Amount must be positive to be given!');
      let data = await this.db.ensure(userID);
      if(!data) return reject(`User not found!`);
      let _new = await this.db.add(`${userID}.money`, amount);
      resolve(_new);
    });
  }

  public substract(userID: string, amount: number): Promise<UserData> {
    return new Promise(async (resolve, reject) => {
      if(typeof amount !== 'number') reject('Amount must be positive to be removed!');
      let data = await this.db.fetch(userID);
      if(!data) return reject(`User not found!`);
      let _new = await this.db.subtract(`${userID}.money`, amount);
      resolve(_new);
    });
  }

  public fetch(userID: string): Promise<UserData> {
    return new Promise(async (resolve, reject) => {
      let data = await this.db.ensure(userID);
      resolve(data);
    })
  }

  public addRole(userID: string, roleID: string): Promise<UserData> {
    return new Promise(async (resolve) => {
      let data: UserData = await this.db.fetch(userID);
      if(data.roles.includes(roleID)) return resolve(data);
      data = await this.db.push(`${userID}.roles`, roleID);
      resolve(data);
    });
  }

  public removeRole(userID: string, roleID: string): Promise<UserData> {
    return new Promise(async (resolve) => {
      let data: UserData = await this.db.pull(`${userID}.roles`, roleID);
      resolve(data);
    });
  }

  public giveItem(userID: string, itemID: string): Promise<UserData> {
    return new Promise(async (resolve) => {
      let data: UserData = await this.db.push(`${userID}.items`, itemID);
      resolve(data);
    });
  }

  public removeItem(userID: string, itemID: string): Promise<UserData> {
    return new Promise(async (resolve) => {
      let data: UserData = await this.db.pull(`${userID}.items`, itemID, false);
      resolve(data);
    });
  }

  public buy(userID: string, itemID: string, guildID: string): Promise<BuyResponse> {
    return new Promise(async (resolve, reject) => {
      let item = this.items.find((x) => x.id === itemID);
      if(!item) return reject('Item not found!');
      if(!guildID && item.roleID) return reject('To buy an item with roleID propertie you should provide an guildID');
      let data: UserData = await this.db.fetch(userID);
      if(item.minlvl && (data.work.level < item.minlvl)) return resolve({ err: 'MIN_LEVEL' });
      if(item.price > data.money) return resolve({ err: 'NOT_ENOUGH_MONEY' });
      await this.db.subtract(`${userID}.money`, item.price);
      if(item.roleID) {
        let guild = await this.bot.guilds.cache.get(guildID);
        let member = guild?.members.cache.get(userID);
        await member?.roles.add(item.roleID);
      };
      data = await this.db.push(`${userID}.items`, itemID);
      resolve({ err: false, success: true, data: data });
      this.emit('buy', userID, data, item);
      if(item.callback) item.callback(this, userID, data);
    });
  }

  public spawn(quality=25): Item | null {
    if(this.items.length < 1) throw new Error(`I cannot spawn an item if there's no items to choose`);
    let items = this.items.filter((i) => (i.quality * 10) <= quality);
    if(items.length < 1) throw new Error(`There's no items to choose from with this quality`);
    return _.sample(items) ?? null;
  }

  public work(userID: string, timeout = 6 * 60 * 60 * 1000, amount = { min: 50, max: 150 }): Promise<WorkResponse> {
    return new Promise(async (resolve, reject) => {
      let data: UserData = await this.db.ensure(userID);
      let xp = this.random(12, 21);
      let money = this.random(amount.min ?? 50, amount.max ?? 150);
      let lvlUp = false;
      if(!data) reject('User not found!');

      if(data.timeouts.work) {
        if(new Date().getTime() - data.timeouts.work.getTime() < timeout) {
          return resolve({ err: 'COOL_DOWN', lastWork: data.timeouts.work });
        }
      };
      await this.db.set(`${userID}.timeouts.work`, new Date());
      if(this.roles.find((x) => data.roles.includes(x.id))) {
        let h = [];
        for(let r of data.roles) {
          let role = this.roles.find((x) => x.id === r);
          if(role?.hours) {
            for(let hr of role.hours) {
              h.push({hour: hr, roleID: role.id});
            }
          }
        }

        if(h.length !== 0) {
          let now = new Date().getHours();
          if(h.find((x) => (x.hour as number) === now)) {
            xp = Math.floor(xp * 1.25);
          } else {
            xp = Math.floor(xp / 3);
          }
        } else {
          xp = xp;
        }

        let nowRole = h.find((x) => (x.hour as number) = (new Date().getHours()));
        if(nowRole) {
          let role = this.roles.find((r) => r.id === nowRole?.roleID);
          if(role) {
            money = this.random(role.salary.min, role.salary.max);
          }
        }
      } else {
        xp = 0;
      }
      let neededXP = this.getNeededXP(data.work.level);
      data = await this.db.add(`${userID}.work.xp`, xp);
      if(data.work.xp >= neededXP) {
        await this.db.add(`${userID}.work.level`, 1);
        await this.db.subtract(`${userID}.work.xp`, neededXP);
        lvlUp = true;
      }

      data = await this.db.add(`${userID}.money`, Math.floor(money));
      resolve({ err: false, levelUp: lvlUp, received: Math.floor(money), userdata: data });
    });
  }
}

export interface UserData {
  money: number;
  roles: string[];
  items: string[];
  work: {
    xp: number;
    level: number;
  }
  timeouts: {
    work: Date | null;
    fabricIncome: Date | null;
  };
  fabric: {
    xp: number;
    level: number;
    employees: number;
    lastPayment: Date | null;
  }
};

export interface Item {
  id: string;
  name: string;
  description?: string;
  price: number;
  quality: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  minlvl?: number;
  roleID?: string;
  callback?: ItemCallback;
}

export interface Role {
  id: string;
  name: string;
  salary: {
    min: number;
    max: number;
  };
  hours?: Hour[];
}

export interface LeaderboardUser {
  userID: string;
  pos: number;
  money: number;
};

export interface EconomyOptions {
  mongoURL: string;
  mongoUser: string;
  mongoPass: string;
}

export interface EconomyCustom {
  roles?: Role[];
  items?: Item[];
}

export interface WorkResponse {
  err: WorkErr | false;
  levelUp?: boolean;
  received?: number;
  userdata?: UserData;
  lastWork?: Date;
}

export interface BuyResponse {
  err: BuyErr | false;
  success?: boolean;
  data?: any;
}

export interface ItemCallback {
  (eco: Economy, userID: string, userData: UserData): Promise<any | void>;
}

export type BuyErr = 'MIN_LEVEL' | 'NOT_ENOUGH_MONEY';
export type Hour = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;
export type WorkErr = 'COOL_DOWN';