require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
const path = require('path');

const { types } = require('hardhat/config');
const { testSerial } = require('./util/test-serial');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// Test serial
task(
  'testserial',
  'Run tests in serial order. Workaround for the proper-lockfile intermittent failure during parallel testing',
)
  .addOptionalParam('testfiles', 'Test files to run', '', types.string)
  .setAction(testSerial);

// Hardhat configuration
const solidityConfig = {
  version: '0.8.19',
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  },
};

if (process.env.HARDHAT_NETWORK) {
  // only process the full config if HARDHAT_NETWORK is defined (i.e., if we want to deploy)
  require('hardhat-multibaas-plugin');

  // Retrieve and process the config file
  const CONFIG_FILE = path.join(__dirname, `./deployment-config.${process.env.HARDHAT_NETWORK || 'development'}`);
  const { config } = require(CONFIG_FILE);

  // You need to export an object to set up your config
  // Go to https://hardhat.org/config/ to learn more

  /**
   * @type import('hardhat/config').HardhatUserConfig
   */
  module.exports = {
    networks: {
      development: {
        url: `${config.deploymentEndpoint}/web3/${config.apiKey}`,
        chainId: config.ethChainID,
        accounts: [config.deployerPrivateKey],
      },
      testing: {
        // shared development MultiBaas deployment on the Curvegrid Test Network
        url: config.web3Endpoint,
        chainId: config.ethChainID,
        accounts: [config.deployerPrivateKey],
      },
      staging: {
        // shared integration MultiBaas deployment on a public test network
        url: config.web3Endpoint,
        chainId: config.ethChainID,
        accounts: [config.deployerPrivateKey],
      },
      production: {
        // production MultiBaas deployment
        url: config.web3Endpoint,
        chainId: config.ethChainID,
        accounts: [config.deployerPrivateKey],
      },
    },
    mbConfig: {
      apiKey: config.apiKey,
      host: config.deploymentEndpoint,
      allowUpdateAddress: ['development', 'testing', 'staging'],
      allowUpdateContract: ['development', 'testing', 'staging'],
    },
    solidity: solidityConfig,
  };
} else {
  // HRE (Hardhat Runtime Environment, i.e., we're likely testing and not deploying)
  require('solidity-coverage');
  module.exports = {
    networks: {
      hardhat: {
        ...(process.env.COVERAGE && {
          allowUnlimitedContractSize: true,
        }),
      },
    },
    solidity: solidityConfig,
  };
}
