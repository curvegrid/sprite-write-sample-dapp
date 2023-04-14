const { expect } = require('chai');
const { ethers } = require('hardhat');

let spriteWrite;

beforeEach(async function () {
  const SpriteWrite = await ethers.getContractFactory('SpriteWrite');
  spriteWrite = await ethers.deploy(SpriteWrite, []);
  await spriteWrite.deployed();
});

describe('Sprite Write', function () {
  it('Should return the name and symbol', async function () {
    expect(await spriteWrite.name()).to.equal('Sprite Write!');
    expect(await spriteWrite.symbol()).to.equal('SPRITEWRITE');
  });
});
