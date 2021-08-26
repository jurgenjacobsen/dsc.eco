import { Economy } from '../main/Economy';
import { Item } from './Item';

export class Store {
  public eco: Economy;
  public items: Item[];
  constructor(eco: Economy) {
    this.eco = eco;
    this.items = [];
  }

  public addItems(items: Item | Item[]): Store {
    if (
      !items ||
      (Array.isArray(items)
        ? items.map((i) => {
            if (i instanceof Item) throw new Error('This is not instance of Item');
          })
        : !(items instanceof Item))
    )
      throw new Error("Item(s) aren't instance of Item");
    if (Array.isArray(items)) {
      items.forEach((y) => {
        this.items.push(y);
      });
    } else {
      this.items.push(items);
    }
    return this;
  }

  public removeItems(ids: string | string[]): Store {
    if (
      !ids ||
      (Array.isArray(ids)
        ? ids.map((i) => {
            if (typeof i !== 'string') throw new Error('This is not instance of Item');
          })
        : !(typeof ids !== 'string'))
    )
      throw new Error("Item(s) aren't instance of Item");

    if (Array.isArray(ids)) {
      ids.forEach((id) => {
        this.items = this.items.filter((y) => y.id !== id);
      });
    } else {
      this.items = this.items.filter((y) => y.id !== ids);
    }
    return this;
  }
}
