// Copyright (c) 2021 Curvegrid Inc.

// Copy and rename this file with the network name (development, test, staging, production) in
// place of "template", as appropriate. For example: deployment-config.staging.js
// DO NOT check credentials into source control.

const config = {
  // Private key of the deployer account, beginning with 0x
  deployerPrivateKey: '<DEPLOYER PRIVATE KEY>',

  // Full MultiBaas URL such as https://abc123.multibaas.com
  deploymentEndpoint: '<MULTIBAAS DEPLOYMENT FULL URL>',

  // Web3 endpoint
  // For Curvegrid Test Network, provision a web3 API key and paste it here
  // For Ethereum Mainnet, Sepolia Testnet, Polygon, etc. provide a URL including credentials from
  // a blockchain node provider (Infura, Chainstack, etc.)
  web3Endpoint: '<WEB3 ENDPOINT FULL URL>',

  // API key to access MultiBaas from deployer
  // Note that the API key MUST be part of the "Administrators" group
  // Create one on MultiBaas via navigation bar > Admin > API Keys
  apiKey: '<MULTIBAAS API KEY>',

  // The chain ID of the blockchain network
  // For example: Curvegrid test network = 2017072401, Ethereum Mainnet = 1, Sepolia = 11155111, Polygon Mainnet = 137, Polygon Mumbai = 80001
  // Only required if not specified in hardhat.config.js
  ethChainID: 2017072401,

  // The address of the HSM to be setup with signing permissions on the contract
  hsmAddress: "<HSM ADDRESS>",
};

module.exports = {
  config: config,
};
