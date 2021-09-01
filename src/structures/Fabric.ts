import { EcoUser } from '../main/interfaces';
import { FabricsManager } from '../managers/FabricsManager';
import { User } from './User';

let hour = 1 * 60 * 60 * 1000;

export class Fabric {
  public level: number;
  public xp: number;
  public employees: number;
  public collectable: boolean;
  public latePayment: boolean;
  public lastCollect: Date | null;
  public fabricPayment: Date | null;
  public user: User;
  private fm: FabricsManager;
  constructor(fm: FabricsManager, data: User) {
    this.level = data.fabric.level;
    this.xp = data.fabric.xp;
    this.employees = data.fabric.employees;

    this.collectable = true;
    this.latePayment = false;
    if (data.timeouts.fabricPayment && new Date().getTime() - data.timeouts.fabricPayment.getTime() > 7 * 24 * 60 * 60 * 1000) {
      this.latePayment = true;
    }

    if (data.timeouts.fabricCollect && !(new Date().getTime() - data.timeouts.fabricCollect.getTime() > hour * (this.level + 1) + hour)) {
      this.collectable = false;
    } else if (this.latePayment) {
      this.collectable = false;
    }

    this.lastCollect = data.timeouts.fabricCollect ?? null;
    this.fabricPayment = data.timeouts.fabricPayment ?? null;

    this.user = data;
    this.fm = fm;
  }

  public get levelUpXP(): number {
    return Math.floor(this.level * 2.5 * 100);
  }

  public get receiveableMoney(): number {
    return Math.floor(5 * (this.level ^ 2) + 50 * this.level + 100 - this.xp + this.employees * 1.5);
  }

  public get valueToPay(): number {
    return Math.floor(this.level * (this.employees * 0.5) * 100);
  }

  public collect(): Promise<Fabric> {
    return new Promise(async (resolve) => {
      let gid = this.user.guildID ?? undefined;
      let uid = this.user.userID;
      if (this.collectable) {
        let xp = this.fm.eco.random(20, 35);
        await this.fm.eco.addMoney(this.receiveableMoney, uid, gid ?? undefined);
        await this.fm.eco.db.set(`${this.fm.eco.key(uid, gid ?? undefined)}.timeouts.fabricCollect`, new Date());
        await this.fm.eco.db.add(`${this.fm.eco.key(uid, gid ?? undefined)}.fabric.xp`, xp);
        if (this.xp >= this.levelUpXP) {
          await this.fm.eco.db.add(`${this.fm.eco.key(uid, gid ?? undefined)}.fabric.level`, 1);
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
