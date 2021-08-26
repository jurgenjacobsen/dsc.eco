import { ItemBuyCallback, ItemData } from '../main/interfaces';

export class Item {
  public id: string;
  public price: number;
  public name: string;
  public description?: string;
  public callback?: ItemBuyCallback;
  constructor(data: ItemData) {
    this.id = data.id;
    this.price = data.price;
    this.name = data.name;
    this.description = data.description ? data.description : undefined;
    if (data.callback) {
      if (typeof data.callback !== 'function') throw new Error('Item buy callback should be a function');
    }
  }
}
