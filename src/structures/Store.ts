import { MessageActionRow, MessageButton, MessageEmbed, MessageOptions } from 'discord.js';
import { Economy } from '../main/Economy';
import { CustomPublish, Receipt } from '../main/interfaces';
import { Item } from './Item';

export class Store {
  public eco: Economy;
  public items: Item[];
  constructor(eco: Economy) {
    this.eco = eco;
    this.items = [];

    if (Array.isArray(this.eco.options.items)) {
      this.eco.options.items.forEach((i) => {
        if (i instanceof Item) {
          if (this.items.find((si) => si.id === i.id)) throw new Error(`There's an existing item with the same ID on the Store`);
          this.items.push(i);
        } else {
          throw new Error('Each item for the store should be a instance of <Item>');
        }
      });
    }
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

  public buy(itemID: string, userID: string, guildID?: string): Promise<Receipt> {
    return new Promise(async (resolve) => {
      if (typeof userID !== 'string') throw new Error('userID should be a string');
      if (guildID && typeof guildID !== 'string') throw new Error('guildID should be a string');
      if (typeof itemID !== 'string') throw new Error('itemID should be a string!');
      let item = this.items.find((i) => i.id === itemID);
      if (!item) throw new Error('Item not found');
      let user = await this.eco.fetch(userID, guildID);
      if (!user) return resolve({ userID: userID, guildID: guildID, err: 'USER_NOT_FOUND' });
      let total_user_balance = user.bank + user.wallet;
      if (total_user_balance >= item.price) {
        if (item.price > user.wallet) {
          let toPayOnTheBank = item.price - user.wallet;
          await this.eco.removeMoney(toPayOnTheBank, userID, guildID);
          await this.eco.db.subtract(`${this.eco.key(userID, guildID)}.wallet`, user.wallet);
        } else {
          await this.eco.db.subtract(`${this.eco.key(userID, guildID)}.wallet`, item.price);
        }
      } else {
        return resolve({ userID, guildID, err: 'NOT_ENOUGH_MONEY' });
      }
      return resolve({ userID, guildID, err: null });
    });
  }

  public publish(itemID: string, custom: CustomPublish): Promise<MessageOptions | null> {
    return new Promise(async (resolve) => {
      if (typeof itemID !== 'string') throw new Error('itemID should be a string');
      let item = this.items.find((i) => i.id === itemID);
      if (!item) throw new Error('Item not found');
      let e = new MessageEmbed()
        .setColor(custom.color)
        .setFooter(item.id)
        .setAuthor(item.name)
        .setImage(custom.banner ?? '');
      if (item.description) e.setDescription(item.description);
      return resolve({
        embeds: [e],
        components: [
          new MessageActionRow().addComponents([
            new MessageButton()
              .setCustomId(`ITEM_${item.id}_VALUE`)
              .setDisabled(true)
              .setStyle('DANGER')
              .setLabel(`${typeof custom.labels?.price === 'string' ? custom.labels.price : 'Price'} ${item.price}`),
            new MessageButton()
              .setCustomId(`ITEM_${item.id}_BUY`)
              .setStyle('SUCCESS')
              .setLabel(`${typeof custom.labels?.buy === 'string' ? custom.labels.buy : 'Buy'}`),
          ]),
        ],
      });
    });
  }
}
