const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('json2csv');
const csvToJson = require('./csv_to_json');

const apiKey = '1HBE41JCM6XI5MNXAHBE6YWWWFWZ8VI39B';
const walletAddress = '0x4Ad50Cf71B08C7c8907A8965c84f2c517573573E';
const walletAddressLowerCase = walletAddress.toLowerCase();
const zeroAddress = '0x0000000000000000000000000000000000000000';

const tokenAddress = '0xE91d143072fc5e92e6445f18aa35DBd43597340c';

const walletOutputFile = path.resolve(__dirname, 'wllet_output.json');
const fiatBuysFile = path.resolve(__dirname, 'output.json');
const taxableCsvFile = path.resolve(__dirname, 'taxable_transactions.csv');
const taxableCacheFile = path.resolve(__dirname, 'taxable_cache.json');

async function getTransactions(address, tokenAddress) {
  const url = `https://api-sepolia.etherscan.io/api?module=account&action=tokentx&address=${address}&contractaddress=${tokenAddress}&apikey=${apiKey}`;

  try {
    const response = await axios.get(url);
    const transactions = response.data.result;

    const filteredTransactions = transactions.filter(tx =>
      tx.from.toLowerCase() === address.toLowerCase() ||
      tx.to.toLowerCase() === address.toLowerCase()
    );

    fs.writeFileSync(walletOutputFile, JSON.stringify(filteredTransactions, null, 2));
    console.log(`✅ Saved ${filteredTransactions.length} on-chain transactions to ${walletOutputFile}`);
    return filteredTransactions;
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    return [];
  }
}

function identifyTaxableIncome(transactions, fiatBuys, cachedHashes, walletAddresses) {
  const taxable = [];
  const nonTaxable = [];
  const unmatchedBuys = [];

  const walletSet = new Set(walletAddresses.map(addr => addr.toLowerCase()));
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  // Filter incoming mints
  const incomingMints = transactions
    .filter(tx =>
      walletSet.has(tx.to.toLowerCase()) &&
      tx.from.toLowerCase() === zeroAddress &&
      !cachedHashes.includes(tx.hash)
    )
    .sort((a, b) => Number(a.timeStamp) - Number(b.timeStamp));

  // Filter and sort fiat buys
  const sortedFiatBuys = fiatBuys
    .filter(buy =>
      buy.type?.toLowerCase() === 'buy' &&
      buy.tokenSymbol === 'NZDD'
    )
    .sort((a, b) => Number(a.timeStamp) - Number(b.timeStamp));

  const usedBuys = new Set();

  incomingMints.forEach((tx) => {
    // Normalize value
    const txValue = Number(tx.value) / 10 ** Number(tx.tokenDecimal);

    // Find the first fiat buy that matches in value ±1% and hasn't been used
    const matchIndex = sortedFiatBuys.findIndex(buy => {
      const buyValue = Number(buy.toAmount);
      const withinTolerance = Math.abs(buyValue - txValue) / txValue < 0.01; // ±1%
      return (
        !usedBuys.has(buy.hash) &&
        Number(buy.timeStamp) < Number(tx.timeStamp) &&
        withinTolerance
      );
    });

    const matchedBuy = matchIndex !== -1 ? sortedFiatBuys[matchIndex] : null;

    if (matchedBuy) {
      usedBuys.add(matchedBuy.hash);
    }

    const result = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: txValue,
      token: tx.tokenSymbol,
      timeStamp: tx.timeStamp,
      utcDate: new Date(Number(tx.timeStamp) * 1000).toISOString(),
      taxable: !matchedBuy,
      reason: matchedBuy
        ? 'Matched with fiat buy (timestamp + value) — not taxable.'
        : 'No matching fiat buy — likely taxable income.',
      fromAmount: matchedBuy?.fromAmount || '',
      fromSymbol: matchedBuy?.fromSymbol || ''
    };

    if (matchedBuy) {
      nonTaxable.push(result);
    } else {
      taxable.push(result);
    }
  });

  // Any unmatched fiat buys?
  sortedFiatBuys.forEach(buy => {
    if (!usedBuys.has(buy.hash)) {
      unmatchedBuys.push(buy);
    }
  });

  // Handle non-zero incoming txs from unknown addresses
  const otherIncoming = transactions.filter(tx =>
    walletSet.has(tx.to.toLowerCase()) &&
    tx.from.toLowerCase() !== zeroAddress &&
    !cachedHashes.includes(tx.hash)
  );

  otherIncoming.forEach(tx => {
    const priorSent = transactions.find(prev =>
      prev.to.toLowerCase() === tx.from.toLowerCase() &&
      Number(prev.timeStamp) < Number(tx.timeStamp)
    );

    const isTaxable = !priorSent;
    const reason = isTaxable
      ? 'Received from another wallet without prior outgoing — likely income.'
      : 'Likely return transfer — not taxable.';

    const result = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: Number(tx.value) / 10 ** Number(tx.tokenDecimal),
      token: tx.tokenSymbol,
      timeStamp: tx.timeStamp,
      utcDate: new Date(Number(tx.timeStamp) * 1000).toISOString(),
      taxable: isTaxable,
      reason
    };

    if (isTaxable) {
      taxable.push(result);
    } else {
      nonTaxable.push(result);
    }
  });

  return { taxable, nonTaxable, unmatchedBuys };
}


function writeToCsv(data, filepath) {
  if (!data.length) return;

  const csv = parse(data, {
    fields: ['hash', 'from', 'to', 'value', 'token', 'timeStamp', 'utcDate', 'fromAmount', 'fromSymbol', 'reason']
  });

  fs.writeFileSync(filepath, csv);
  console.log(`📄 Taxable transactions saved to ${filepath}`);
}

function updateCache(newTaxable) {
  let cachedHashes = [];
  if (fs.existsSync(taxableCacheFile)) {
    const raw = fs.readFileSync(taxableCacheFile);
    cachedHashes = JSON.parse(raw);
  }

  const allHashes = [...new Set([...cachedHashes, ...newTaxable.map(tx => tx.hash)])];
  fs.writeFileSync(taxableCacheFile, JSON.stringify(allHashes, null, 2));
}

(async () => {

const getfiatBuys = await csvToJson();
console.log('💰 Fiat buys loaded:', getfiatBuys.length);

  const transactions = await getTransactions(walletAddress, tokenAddress);
  const fiatBuys = JSON.parse(fs.readFileSync(fiatBuysFile, 'utf-8'));
  const cachedHashes = fs.existsSync(taxableCacheFile)
    ? JSON.parse(fs.readFileSync(taxableCacheFile))
    : [];

  const walletAddresses = [walletAddress]; // add more if needed
  const { taxable, nonTaxable, unmatchedBuys } = identifyTaxableIncome(transactions, fiatBuys, cachedHashes, walletAddresses);

  if (taxable.length) {
    writeToCsv(taxable, taxableCsvFile);
    updateCache(taxable);
  } else {
    console.log('📭 No new taxable transactions found.');
  }

  if (unmatchedBuys.length) {
    fs.writeFileSync(path.resolve(__dirname, 'unmatched_fiat_buys.json'), JSON.stringify(unmatchedBuys, null, 2));
    console.log('📤 Unmatched fiat buys exported to unmatched_fiat_buys.json');
  }

  console.log(`✅ New taxable: ${taxable.length}`);
  console.log(`🧾 Non-taxable this run: ${nonTaxable.length}`);
})();

