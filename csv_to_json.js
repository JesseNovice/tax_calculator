// csvToJson.js



const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { DateTime } = require('luxon');

// Path to your CSV file
const inputFile = path.resolve(__dirname, 'Mock_Easy_Crypto_Buy.csv');
const outputFile = path.resolve(__dirname, 'output.json');

const results = [];

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (data) => {
    // Assume the date field is called "date"
    const nzt = DateTime.fromFormat(data.Date, 'yyyy-MM-dd HH:mm:ss', { zone: 'Pacific/Auckland' });

    if (nzt.isValid) {
      data.utcDate = nzt.toUTC().toISO(); // UTC ISO string
      data.utcTimestamp = Math.floor(nzt.toUTC().toSeconds()); // UTC timestamp in seconds
    } else {
      console.warn(`❗ Invalid date format: ${data.date}`);
    }

    results.push(data);
  })
  .on('end', () => {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`✅ Converted dates to UTC and saved to ${outputFile}`);
  });

