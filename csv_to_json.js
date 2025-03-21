// csv_to_json.js
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { DateTime } = require('luxon');

const inputFile = path.resolve(__dirname, 'Mock_Easy_Crypto_Buy.csv');
const outputFile = path.resolve(__dirname, 'output.json');

const walletAddress = '0x4Ad50Cf71B08C7c8907A8965c84f2c517573573E';
const tokenDecimal = 6;

function csvToJson() {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(inputFile)
      .pipe(csv())
      .on('data', (data) => {
        const nzt = DateTime.fromFormat(data.Date, 'yyyy-MM-dd HH:mm:ss', { zone: 'Pacific/Auckland' });

        if (!nzt.isValid) {
          console.warn(`❗ Invalid date: ${data.Date}`);
          return;
        }

        const utcTimestamp = Math.floor(nzt.toUTC().toSeconds());
        const isBuy = data['Type'].toLowerCase() === 'buy';

        const etherscanTx = {
          hash: data['Order ID'] || '',
          from: isBuy ? '0x0000000000000000000000000000000000000000' : walletAddress.toLowerCase(),
          to: walletAddress.toLowerCase(),
          value: String(Number(data['To amount']) * 10 ** tokenDecimal),
          tokenSymbol: data['To symbol'],
          tokenName: 'New Zealand Digital Dollar',
          tokenDecimal: String(tokenDecimal),
          timeStamp: String(utcTimestamp),
          utcDate: nzt.toUTC().toISO(),
          type: data['Type'],
          fromSymbol: data['From symbol'],
          toSymbol: data['To symbol'],
          fromAmount: data['From amount'],
          toAmount: data['To amount'],
        };

        results.push(etherscanTx);
      })
      .on('end', () => {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`✅ Saved ${results.length} transactions to ${outputFile}`);
        resolve(results);
      })
      .on('error', reject);
  });
}

module.exports = csvToJson;
