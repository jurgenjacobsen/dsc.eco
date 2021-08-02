import { Client, ColorResolvable, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { Economy } from "./Economy";

export class Store {
  public config: StoreConfig;
  public eco: Economy;
  private bot: Client;
  constructor(bot: Client, eco: Economy, config: StoreConfig) {

    this.config = config;
    this.eco = eco;
    this.bot = bot;

    bot.on('interactionCreate', (i) => {
      if(!i.isButton()) return;
      if(i.channelId !== this.config.channelID) return;

      let _embed = i.message.embeds[0];
      if(!_embed) return;
      let _itemID = _embed.footer?.text;
      let _item = this.eco.items.find((i) => i.id === _itemID);
      if(!_item) return;
      if(i.customId.startsWith('ITEM_') && i.customId.endsWith('_BUY')) {
        this.eco.buy(i.user.id, _item.id, i.guildId as string)
        .then((res) => {
          if(res.success) return i.deferUpdate();
        });
      }
    });
  }

  public publish(itemID: string, custom: PublishCustomOptions) {
    return new Promise(async (resolve, reject) => {
      let item = this.eco.items.find((i) => i.id === itemID);
      if(!item) return reject(`Item doesn't exists!`);
      let channel = this.bot.channels.cache.get(this.config.channelID) as TextChannel;
      if(!channel) return reject('Channel not found!');

      let embed = new MessageEmbed()
      .setColor(custom.embedColor)
      .setFooter(item.id)
      .setAuthor(item.name);
      
      if(custom.imageURL) embed.setImage(custom.imageURL);
      if(item.description) embed.setDescription(item.description);
      if(item.roleID) embed.addField(`Cargo`, `<@&${item.roleID}>`);

      let valueBtn = new MessageButton().setCustomId(`ITEM_${item.id}_VALUE`).setDisabled(true).setStyle('DANGER').setLabel(`${custom.priceLabel ? custom.priceLabel : 'Price'} ${item.price}`);
      let buyBtn = new MessageButton().setCustomId(`ITEM_${item.id}_BUY`).setStyle('SUCCESS').setLabel(`${custom.buyLabel ? custom.buyLabel : 'Buy'}`);
      let row = new MessageActionRow().addComponents([valueBtn, buyBtn]);

      channel.send({
        embeds: [embed],
        components: [row],
      });
    });
  }
}

export interface StoreConfig {
  guildID: string;
  channelID: string;
}

export interface PublishCustomOptions {
  embedColor: ColorResolvable;
  buyLabel: string;
  priceLabel: string;
  imageURL?: string;
}