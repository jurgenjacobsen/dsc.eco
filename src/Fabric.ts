import { Economy, UserData } from "./Economy";

export class FabricManager {
  public eco: Economy;
  constructor(eco: Economy) {
    this.eco = eco;
  }

  public fetch(userID: string): Promise<Fabric> {
    return new Promise(async (resolve) => {
      let data: UserData = await this.eco.db.ensure(userID);
      if(!data.fabric.lastPayment) {
        this.eco.db.set(`${userID}.fabric.lastPayment`, new Date());
      };
      return resolve(new Fabric(data));
    });
  }

  public pay(userID: string): Promise<Fabric> {
    return new Promise(async (resolve) => {
      let fabric = await this.fetch(userID);
      
      let valueToPay = fabric.valueToPay();

      if(fabric.latePayment) {
        this.eco.substract(userID, valueToPay);
      }
      
      fabric.latePayment = false;
      resolve(fabric);
    });
  }

  public collect(userID: string, timeout=1*60*60*1000): Promise<Collect> {
    return new Promise(async (resolve) => {
      let data = await this.eco.db.fetch(userID);
      let fabric: Fabric = new Fabric(data);

      if(fabric.latePayment) return resolve({fabric: fabric, received: 0, levelUp: false, err: true });
      if(fabric.lastCollectIncome) {
        if(new Date().getTime() - fabric.lastCollectIncome.getTime() < (timeout * fabric.level)) {
          return resolve({ fabric: fabric, received: 0, levelUp: false, err: true });
        }
      }

      let valueToReceive = fabric.valueToReceive();
      let xp = Math.floor(this.eco.random(10, 19));
      let lvlup = false;

      let nxp = fabric.getNeededXP();
      data = await this.eco.db.add(`${userID}.fabric.xp`, xp); fabric = new Fabric(data);
      if(fabric.xp >= nxp) {
        await this.eco.db.add(`${userID}.fabric.level`, 1);
        await this.eco.db.subtract(`${userID}.fabric.xp`, nxp);
        lvlup = true;
      };

      data = await this.eco.give(userID, valueToReceive);
      
      resolve({ fabric: new Fabric(data), received: valueToReceive, levelUp: lvlup, err: false });
    });
  }
}

export interface Collect {
  fabric: Fabric;
  received: number;
  levelUp: boolean;
  err: boolean;
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

  public getNeededXP(): number {
    return (this.level * this.level * 200);
  }

  public valueToReceive(): number {
    return Math.floor((((this.level) * (this.employees * 0.25) * 100) / 2) + (this.xp * 0.25));
  }

  public valueToPay(): number {
    return Math.floor((((this.level * 0.5) * (this.employees * 0.5) * 100) / 2));
  }
}