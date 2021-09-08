import { ColorResolvable } from 'discord.js';
import { Database, Options } from 'dsc.db';
import { Fabric } from '../structures/Fabric';
import { Item } from '../structures/Item';
import { MSFormat } from './Base';
import { Economy } from './Economy';

export interface EconomyOptions {
  db: Database<User> | Options;
  items?: Item[];
}

export interface User {
  userID: string;
  guildID?: string;
  wallet: number;
  bank: number;
  inventory: string[];
  timeouts: {
    [key: string]: Date | null;
  };
  fabric: {
    xp: number;
    level: number;
    employees: number;
  };
}

export interface CollectOptions {
  timeout?: number;
  money?: {
    min?: number;
    max?: number;
  };
}

export type CollectErr = 'COOLDOWN' | null;

export interface CollectResponse {
  err: CollectErr;
  user: User;
  remaining?: MSFormat;
}

export interface LeaderboardUser {
  pos: number;
  userID: string;
  guildID?: string | null;
  bank: number;
  wallet: number;
}

export interface LeaderboardOptions {
  guildID?: string;
  limit?: number;
}

export type BuyErr = 'NOT_ENOUGH_MONEY' | 'USER_NOT_FOUND' | null;
export interface Receipt {
  userID: string;
  guildID?: string;
  err: BuyErr;
}

export type FabricsCache = Map<string, Fabric>;
export type GuildFabricsCache = Map<string, FabricsCache>;

export interface ItemData {
  id: string;
  price: number;
  name: string;
  description?: string;
  callback?: ItemBuyCallback;
}

export interface ItemBuyCallback {
  (eco: Economy, user: User): Promise<any> | any;
}

export interface CustomPublish {
  labels?: {
    buy?: string;
    price?: string;
  };
  banner?: string;
  color: ColorResolvable;
}
