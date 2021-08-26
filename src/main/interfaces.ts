import { Database, Options } from 'dsc.db';
import { Fabric } from '../structures/Fabric';
import { MSFormat } from './Base';

export interface EconomyOptions {
  db: Database | Options;
}

export interface EcoUser {
  userID: string;
  guildID: string | null;
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

export interface WorkOptions {
  timeout?: number;
  money?: {
    min?: number;
    max?: number;
  };
}

export type WorkErr = 'COOLDOWN' | null;

export interface WorkResponse {
  err: WorkErr;
  user: EcoUser;
  remaining?: MSFormat;
}

export interface LeaderboardUser {
  pos: number;
  userID: string;
  guildID: string | null;
  bank: number;
  wallet: number;
}

export interface LeaderboardOptions {
  guildID?: string;
  limit?: number;
}

export type FabricsCache = Map<string, Fabric>;
export type GuildFabricsCache = Map<string, FabricsCache>;
