import { Economy } from '../main/Economy';
import { EcoUser } from '../main/interfaces';
import { Item } from './Item';

export class User {
  public userID: string;
  public guildID?: string;
  public wallet: number;
  public bank: number;
  public inventory: Item[];
  public timeouts: { [key: string]: Date | null };
  public fabric: any;
  constructor(eco: Economy, data: EcoUser) {
    this.userID = data.userID;
    this.guildID = data.guildID ?? undefined;
    this.wallet = data.wallet;
    this.bank = data.bank;
    this.inventory = eco.store.items.filter((i) => !data.inventory.includes(i.id));
    this.timeouts = data.timeouts;
    this.fabric = data.fabric;
  }
}
