import { Database } from 'dsc.db';
import { EventEmitter } from 'events';
import { User } from './interfaces';
import { EconomyOptions } from './interfaces';

export class Base extends EventEmitter {
  public options: EconomyOptions;
  public db: Database<User>;
  constructor(options: EconomyOptions) {
    super();

    this.options = options;
    this.db = options.db instanceof Database ? options.db : new Database(options.db);
  }

  public ms(ms: number): MSFormat {
    let apply = ms > 0 ? Math.floor : Math.ceil;
    return {
      days: apply(ms / 86400000),
      hours: apply(ms / 3600000) % 24,
      minutes: apply(ms / 60000) % 60,
      seconds: apply(ms / 1000) % 60,
      milliseconds: apply(ms) % 1000,
      microseconds: apply(ms * 1000) % 1000,
      nanoseconds: apply(ms * 1e6) % 1000,
    };
  }

  public getNeededXP(lvl: number, xp: number): number {
    return (5 * (lvl ^ 2) + 50 * lvl + 100 - xp) * 3;
  }

  public random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
  }

  public key(userID: string, guildID?: string): string {
    return `${userID}${guildID ? `_${guildID}` : ''}`;
  }
}

export interface MSFormat {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  microseconds: number;
  nanoseconds: number;
}
