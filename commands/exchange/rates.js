const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchange-rates')
    .setDescription('Afficher les taux de change actuels'),

  async execute(interaction) {
    await interaction.deferReply();

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const activePairs = config?.exchangeConfig?.activePairs || ['LTC_PAYPAL', 'BTC_PAYPAL', 'ETH_PAYPAL'];

    const coins = ['bitcoin', 'litecoin', 'ethereum'];
    const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=usd&include_24hr_change=true`);
    const prices = res.data;

    const coinMap = { BTC: 'bitcoin', LTC: 'litecoin', ETH: 'ethereum' };

    const fields = [];
    for (const pair of activePairs) {
      const [from, to] = pair.split('_');
      const coinId = coinMap[from];
      if (!coinId) continue;
      const price = prices[coinId]?.usd;
      const change = prices[coinId]?.usd_24h_change?.toFixed(2);
      if (price) {
        const arrow = change >= 0 ? '📈' : '📉';
        fields.push({ name: `${from} → ${to}`, value: `$${price.toLocaleString('en-US')} ${arrow} ${change}% (24h)`, inline: true });
      }
    }

    const feePercent = config?.exchangeConfig?.feePercent ?? 5;

    const embed = new EmbedBuilder()
      .setTitle('📊 Taux de Change — Ohio Paradise')
      .setColor(0x2ECC71)
      .addFields(...fields)
      .addFields({ name: '⚙️ Frais globaux', value: `${feePercent}%`, inline: false })
      .setFooter({ text: 'Source: CoinGecko • Mis à jour maintenant' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
