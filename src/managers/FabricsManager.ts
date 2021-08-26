import { Data } from 'dsc.db';
import { Economy } from '../main/Economy';
import { FabricsCache, GuildFabricsCache } from '../main/interfaces';
import { Fabric } from '../structures/Fabric';

export class FabricsManager {
  public eco: Economy;
  public cache: FabricsCache;
  public guilds: GuildFabricsCache;
  constructor(eco: Economy) {
    this.eco = eco;

    this.cache = new Map();
    this.guilds = new Map();

    setInterval(() => this.__update(), 15 * 60 * 1000);
  }

  public fetch(userID: string, guildID?: string): Promise<Fabric | null> {
    return new Promise(async (resolve) => {
      let user = await this.eco.fetch(userID, guildID);
      if (!user) return resolve(null);
      return resolve(new Fabric(this, user));
    });
  }

  private async __update() {
    let users = await this.eco.list();
    users?.forEach((u) => {
      let f = new Fabric(this, u);
      this.cache.set(u.userID, f);
    });

    let guilds = await (this.eco.db.schema.find() as Promise<Data[]>);
    let gids: string[] = [];
    guilds.forEach((g) => {
      if (!gids.includes(g.data.guildID) && g.data.guildID !== null) gids.push(g.data.guildID);
    });

    if (gids.length > 2048) return;

    gids.forEach(async (id) => {
      let gUsers = await this.eco.list(id);
      gUsers?.forEach((u) => {
        let f = new Fabric(this, u);
        let l = this.guilds.get(id);
        if (l) {
          l = l.set(f.user.userID, f);
          this.guilds.set(id, l);
        } else {
          l = new Map();
          l = l.set(f.user.userID, f);
          this.guilds.set(id, l);
        }
      });
    });
  }
}
