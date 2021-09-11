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
  private fm: FabricsManager;
  constructor(fm: FabricsManager, data: User) {
    this.level = data.fabric.level;
    this.xp = data.fabric.xp;
    this.employees = data.fabric.employees;

    this.collectable = true;
    this.latePayment = false;

    this.timeout = 1 * (this.level + 2);

    if (data.timeouts.fabric && !(new Date().getTime() - data.timeouts.fabric.getTime() > this.timeout * hour)) {
      this.collectable = false;
    }

    if (data.timeouts.fabricPayment && new Date().getTime() - data.timeouts.fabricPayment.getTime() > 7 * 24 * hour) {
      this.latePayment = true;
      this.collectable = false;
    }

    this.sold = data.fabric.soldPercentage ?? null;

    let soldMonthTimeout = this.sold ? Math.floor(this.sold / 10) * month + month : undefined;
    let soldTimeout = data.timeouts.soldPercentage && soldMonthTimeout && new Date().getTime() - data.timeouts.soldPercentage.getDate() > soldMonthTimeout ? true : false;

    if (this.sold && this.sold > 0 && soldTimeout && soldTimeout) {
      this.collectable = false;
    }

    this.lastCollect = data.timeouts.fabric ?? null;
    this.fabricPayment = data.timeouts.fabricPayment ?? null;

    this.user = data;
    this.fm = fm;
  }

  public get valutation(): number {
    return Math.floor(((365 * 24) / this.timeout) * this.receiveableMoney);
  }

  public get levelUpXP(): number {
    return Math.floor(this.level * this.level * 275);
  }

  public get receiveableMoney(): number {
    return Math.floor((this.employees * 5 + this.level * 100 + this.xp / 2) * 0.75);
  }

  public get valueToPay(): number {
    return Math.floor(this.level * (this.employees * 0.25) * 25);
  }

  public sellPrice(percentage: number): number {
    if (!(percentage > -1 && percentage <= 100)) throw new Error('Percentage should be a value between 0 and 100');
    return (this.valutation / 100) * percentage;
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
    let ePrice = 120 * this.level;
    return new Promise(async (resolve) => {
      let av = this.level * 20;
      if (this.employees >= av) {
        return resolve(this);
      } else {
        if (this.user.bank) {
          await this.fm.eco.removeMoney(ePrice, this.user.userID, this.user.guildID ?? undefined);
          await this.fm.eco.db.add(`${this.fm.eco.key(this.user.userID, this.user.guildID ?? undefined)}.fabric.employees`, 1);
        }
      }
      await this._update();
      return resolve(this);
    });
  }

  public pay(): Promise<Fabric> {
    return new Promise(async (resolve) => {
      if (this.valueToPay >= this.user.bank && this.latePayment !== false) {
        await this.fm.eco.removeMoney(this.valueToPay, this.user.userID, this.user.guildID ?? undefined);
        await this.fm.eco.db.set(`${this.fm.eco.key(this.user.userID, this.user.guildID ?? undefined)}.timeouts.fabricPayment`, new Date());
      }
      await this._update();
      return resolve(this);
    });
  }

  public reset(): Promise<Fabric> {
    return new Promise(async (resolve) => {
      await this.fm.eco.delete(this.user.userID, this.user.guildID);
      let raw = await this.fm.eco.ensure(this.user.userID, this.user.userID);
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
