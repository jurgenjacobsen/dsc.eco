export class Item {
  public id: string;
  constructor(data: ItemData) {
    this.id = data.id;
  }
}

export interface ItemData {
  id: string;
}
