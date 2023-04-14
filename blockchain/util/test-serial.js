const { TASK_TEST, TASK_COMPILE } = require('hardhat/builtin-tasks/task-names');
const { HardhatPluginError } = require('hardhat/plugins');
const globby = require('globby');

/**
 * Returns a list of test files to pass to mocha.
 * @param  {String}   files   file or glob
 * @return {String[]}         list of files to pass to mocha
 */
function getTestFilePaths(files) {
  const target = globby.sync([files]);

  // Buidler/Hardhat supports js & ts
  const testregex = /.*\.(js|ts)$/;
  return target.filter((f) => f.match(testregex) != null);
}

/**
 * Serial test task implementation
 * `npx mocha` runs too slowly without the --parallel flag
 * This task runs test files one at a time instead of feeding the entire test file array at once
 * @param  {HardhatUserArgs} args
 * @param  {HardhatEnv} env
 */
async function testSerial(args, env) {
  let error;
  let failedTests = 0;
  try {
    // Merge non-null flags into hardhatArguments
    const flags = {};
    for (const key of Object.keys(args)) {
      if (args[key] && args[key].length) {
        flags[key] = args[key];
      }
    }
    env.hardhatArguments = Object.assign(env.hardhatArguments, flags);

    await env.run(TASK_COMPILE);

    // ==============
    // Server launch
    // ==============
    const network = setupHardhatNetwork(env);

    const accounts = await network.provider.send('eth_accounts', []);

    // Set default account (if not already configured)
    if (!network.config.from) {
      network.config.from = accounts[0];
    }

    // ======
    // Tests
    // ======
    const testfiles = args.testfiles ? getTestFilePaths(args.testfiles) : getTestFilePaths('test/*');
    for (let i = 0; i < testfiles.length; i += 1) {
      try {
        failedTests += await env.run(TASK_TEST, { testFiles: [testfiles[i]] });
      } catch (e) {
        error = e;
      }
    }
  } catch (e) {
    error = e;
  }

  if (error !== undefined) throw new HardhatPluginError(error);
  if (failedTests > 0) {
    console.log('failed tests:', failedTests);
  }
}

function setupHardhatNetwork(env) {
  const { createProvider } = require('hardhat/internal/core/providers/construction');
  const { HARDHAT_NETWORK_NAME } = require('hardhat/plugins');

  const networkName = HARDHAT_NETWORK_NAME;

  const isHardhatEVM = true;

  const networkConfig = env.network.config;

  const provider = createProvider(networkName, networkConfig, env.config.paths, env.artifacts);

  return configureNetworkEnv(env, networkName, networkConfig, provider, isHardhatEVM);
}

function configureNetworkEnv(env, networkName, networkConfig, provider, isHardhatEVM) {
  env.config.networks[networkName] = networkConfig;
  env.config.defaultNetwork = networkName;

  env.network = Object.assign(env.network, {
    name: networkName,
    config: networkConfig,
    provider: provider,
    isHardhatEVM: isHardhatEVM,
  });

  env.ethereum = provider;

  // Return a reference so we can set the from account
  return env.network;
}

module.exports = {
  testSerial,
};
