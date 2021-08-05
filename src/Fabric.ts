import { MessageAttachment } from "discord.js";
import { Economy, UserData } from "./Economy";

export class FabricManager {
  public eco: Economy;
  constructor(eco: Economy) {
    this.eco = eco;
  }

  public fetch(userID: string): Promise<Fabric> {
    return new Promise(async (resolve) => {
      let data = await this.eco.db.ensure(userID);
      return resolve(new Fabric(data));
    });
  }
}

export class Fabric {
  public xp: number;
  public level: number;
  public latePayment: boolean;
  public employees: number;
  public lastPayment: Date | null;
  public lastCollectIncome: Date | null;
  constructor(data: UserData) {
    this.xp = data.fabric.xp;
    this.level = data.fabric.level;
    this.employees = data.fabric.employees;
    this.lastPayment = data.fabric.lastPayment;
    this.lastCollectIncome = data.timeouts.fabricIncome;
    this.latePayment = false;

    if(this.lastPayment && ((new Date().getTime() - this.lastPayment.getTime()) > 7 * 24 * 60 * 60 * 1000)) {
      this.latePayment = true;
    }
  }

  public render(): MessageAttachment {
    return new MessageAttachment(`../assets/${this.level}.png`, 'fabric.png');
  }
}