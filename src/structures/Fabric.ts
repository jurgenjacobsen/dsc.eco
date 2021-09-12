import { User } from '../main/interfaces';
import { FabricsManager } from '../managers/FabricsManager';

let hour = 1 * 60 * 60 * 1000;
let month = 30 * 24 * hour;

export class Fabric {
  public level: number;
  public xp: number;
  public employees: number;
  public collectable: boolean;
  public latePayment: boolean;
  public lastCollect: Date | null;
  public fabricPayment: Date | null;
  public sold: number | null;
  public user: User;
  public timeout: number;
  public sellTimeout: number;
  private fm: FabricsManager;
  constructor(fm: FabricsManager, data: User) {
    this.level = data.fabric.level;
    this.xp = data.fabric.xp;
    this.employees = data.fabric.employees;

    this.timeout = 1 * (this.level + 2);

    this.collectable = true;
    this.latePayment = false;

    this.sold = data.fabric.soldPercentage;

    if (data.timeouts.fabric && !(new Date().getTime() - data.timeouts.fabric.getTime() > this.timeout * hour)) {
      this.collectable = false;
    }

    if (data.timeouts.fabricPayment && new Date().getTime() - data.timeouts.fabricPayment.getTime() > 7 * 24 * hour) {
      this.latePayment = true;
      this.collectable = false;
    }

    this.sellTimeout = this.level * 3 + 1;

    if (this.sold && data.timeouts.soldFabric && new Date().getTime() - data.timeouts.soldFabric.getTime() < this.sellTimeout * month) {
      this.collectable = false;
    }

    this.lastCollect = data.timeouts.fabric ?? null;
    this.fabricPayment = data.timeouts.fabricPayment ?? null;

    this.user = data;
    this.fm = fm;
  }

  public get valuation(): number {
    return Math.floor(((365 * 24) / this.timeout) * this.receiveableMoney);
  }

  public get levelUpXP(): number {
    return Math.floor(this.level * this.level * 275);
  }

  public get receiveableMoney(): number {
    return Math.floor((this.employees * 5 + this.level * 100 + this.xp / 2) * 0.75);
  }

  public get employeePrice(): number {
    return this.level * 150;
  }

  public get valueToPay(): number {
    let x = this.level * (this.employees * 0.25) * 25;
    let y = this.user.timeouts.fabricPayment ? (new Date().getTime() - this.user.timeouts.fabricPayment.getTime()) / (24 * hour) : false;
    let xy = y ? x + y * (this.level * 250) : x;
    return Math.floor(xy);
  }

  public sellPrice(percentage: number): number {
    if (!(percentage > -1 && percentage <= 100)) throw new Error('Percentage should be a value between 0 and 100');
    return (this.valuation / 100) * percentage;
  }

  public collect(): Promise<Fabric> {
    return new Promise(async (resolve) => {
      let gid = this.user.guildID;
      let uid = this.user.userID;
      if (this.collectable) {
        let xp = this.fm.eco.random(20, 35);
        await this.fm.eco.addMoney(this.receiveableMoney, uid, gid);
        await this.fm.eco.db.set(`${this.fm.eco.key(uid, gid)}.timeouts.fabric`, new Date());
        await this.fm.eco.db.add(`${this.fm.eco.key(uid, gid)}.fabric.xp`, xp);
        if (this.xp + xp >= this.levelUpXP) {
          await this.fm.eco.db.add(`${this.fm.eco.key(uid, gid)}.fabric.level`, 1);
        }
        await this._update();
        return resolve(this);
      } else {
        return resolve(this);
      }
    });
  }

  public hire(): Promise<Fabric> {
    return new Promise(async (resolve) => {
      let av = this.level * 20;
      if (this.employees >= av) {
        return resolve(this);
      } else {
        if (this.user.bank >= this.employeePrice) {
          await this.fm.eco.removeMoney(this.employeePrice, this.user.userID, this.user.guildID ?? undefined);
          await this.fm.eco.db.add(`${this.fm.eco.key(this.user.userID, this.user.guildID ?? undefined)}.fabric.employees`, 1);
        }
      }
      await this._update();
      return resolve(this);
    });
  }

  public pay(): Promise<Fabric> {
    return new Promise(async (resolve) => {
      if (this.valueToPay <= this.user.bank && this.latePayment) {
        await this.fm.eco.removeMoney(this.valueToPay, this.user.userID, this.user.guildID);
        await this.fm.eco.db.set(`${this.fm.eco.key(this.user.userID, this.user.guildID)}.timeouts.fabricPayment`, new Date());
      }
      await this._update();
      return resolve(this);
    });
  }

  public sell(percentage: number): Promise<Fabric | null> {
    return new Promise(async (resolve) => {
      if (this.sold) return resolve(null);
      if (!(percentage > -1 && percentage <= 100)) return resolve(null);

      let amount = this.sellPrice(percentage);

      await this.reset();
      await this.fm.eco.db.set(`${this.fm.eco.key(this.user.userID, this.user.guildID)}.timeouts.soldFabric`, new Date());
      await this.fm.eco.db.set(`${this.fm.eco.key(this.user.userID, this.user.guildID)}.fabric.soldPercentage`, percentage);
      await this.fm.eco.addMoney(amount, this.user.userID, this.user.guildID);
      await this._update();
      return resolve(this);
    });
  }

  public reset(): Promise<Fabric> {
    return new Promise(async (resolve) => {
      let raw = await this.fm.eco.db
        .set(`${this.fm.eco.key(this.user.userID, this.user.guildID)}.fabric`, { xp: 0, level: 1, employees: 0, soldPercentage: null })
        .then((r) => r.data);
      return resolve(new Fabric(this.fm, raw));
    });
  }

  private async _update() {
    let data = await this.fm.fetch(this.user.userID, this.user.guildID);
    this.xp = data?.xp ?? this.xp;
    this.level = data?.level ?? this.level;
    this.collectable = data?.collectable ?? this.collectable;
    this.employees = data?.employees ?? this.employees;
    this.fabricPayment = data?.fabricPayment ?? this.fabricPayment;
    this.lastCollect = data?.lastCollect ?? this.lastCollect;
    this.user = data?.user ?? this.user;
    return;
  }
}
