// Set your Etherscan API key here
const apiKey = '1HBE41JCM6XI5MNXAHBE6YWWWFWZ8VI39B';
const axios = require('axios');

// Function to get transactions for a provided address
async function getTransactions(address, tokenAddress) {
    const url = `https://api-sepolia.etherscan.io/api?module=account&action=tokentx&address=${address}&contractaddress=${tokenAddress}&apikey=${apiKey}`;

    try {
        const response = await axios.get(url);
        const transactions = response.data.result;

        // Filter transactions where the address is either 'from' or 'to'
        const filteredTransactions = transactions.filter(tx => 
            tx.from.toLowerCase() === address.toLowerCase() || 
            tx.to.toLowerCase() === address.toLowerCase()
        );

        return filteredTransactions;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

// Example Usage
let walletAddress = '0x4Ad50Cf71B08C7c8907A8965c84f2c517573573E'; // Replace with the wallet address to query
let placeholderTokenAddress = '0xE91d143072fc5e92e6445f18aa35DBd43597340c'; // Replace with the placeholder token contract address

getTransactions(walletAddress, placeholderTokenAddress).then(transactions => {
    console.log('Filtered Transactions:', transactions);
});

