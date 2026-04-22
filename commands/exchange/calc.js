const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const axios = require('axios');

const COIN_IDS = {
  LTC: 'litecoin',
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

const FIAT_SYMBOLS = ['PAYPAL', 'CASHAPP', 'EUR', 'USD'];

const getPriceUSD = async (coin) => {
  const id = COIN_IDS[coin];
  if (!id) return null;
  const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
  return res.data[id]?.usd || null;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchange-calc')
    .setDescription('Calculer un échange entre deux devises')
    .addStringOption(opt =>
      opt.setName('from').setDescription('Devise source (LTC, BTC, ETH, PAYPAL...)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('to').setDescription('Devise cible (LTC, BTC, ETH, PAYPAL...)').setRequired(true))
    .addNumberOption(opt =>
      opt.setName('amount').setDescription('Montant à convertir').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    const from = interaction.options.getString('from').toUpperCase();
    const to = interaction.options.getString('to').toUpperCase();
    const amount = interaction.options.getNumber('amount');

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const excConf = config?.exchangeConfig || { feePercent: 5, minAmount: 5, maxAmount: 5000 };

    if (amount < excConf.minAmount || amount > excConf.maxAmount) {
      return interaction.editReply({ content: `❌ Montant invalide. Min: **${excConf.minAmount}** / Max: **${excConf.maxAmount}**` });
    }

    const pairKey = `${from}_${to}`;
    const feePercent = excConf.customFees?.get?.(pairKey) ?? excConf.feePercent ?? 5;

    let fromUSD = 1;
    let toUSD = 1;

    if (!FIAT_SYMBOLS.includes(from)) {
      fromUSD = await getPriceUSD(from);
      if (!fromUSD) return interaction.editReply({ content: `❌ Devise **${from}** non reconnue.` });
    }
    if (!FIAT_SYMBOLS.includes(to)) {
      toUSD = await getPriceUSD(to);
      if (!toUSD) return interaction.editReply({ content: `❌ Devise **${to}** non reconnue.` });
    }

    const amountInUSD = amount * fromUSD;
    const rawResult = amountInUSD / toUSD;
    const fee = rawResult * (feePercent / 100);
    const finalResult = rawResult - fee;

    const embed = new EmbedBuilder()
      .setTitle('💱 Calculateur d\'échange')
      .setColor(0xF1C40F)
      .addFields(
        { name: 'Vous envoyez', value: `**${amount} ${from}**`, inline: true },
        { name: 'Vous recevez', value: `**${finalResult.toFixed(8)} ${to}**`, inline: true },
        { name: 'Frais', value: `${feePercent}% (${fee.toFixed(8)} ${to})`, inline: true },
        { name: 'Taux', value: `1 ${from} = ${(fromUSD / toUSD).toFixed(8)} ${to}`, inline: false },
      )
      .setFooter({ text: 'Taux en temps réel via CoinGecko • Ohio Paradise' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
