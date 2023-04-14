declare global {
    interface Window {
        ethereum: any;
    }
}

export { }; // Required when using the `declare global` syntax in a module file

import { Configuration, EventQueriesApi, ContractsApi, EventQuery } from '@curvegrid/multibaas-sdk';
import { ethers } from 'ethers';

function convertSpriteToSVG(spriteData: number[], width: number, height: number, cellSize: number): string {
    const xmlns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(xmlns, 'svg');
    svg.setAttribute('width', (width * cellSize).toString());
    svg.setAttribute('height', (height * cellSize).toString());
    svg.setAttribute('viewBox', `0 0 ${width * cellSize} ${height * cellSize}`);
    svg.setAttribute('xmlns', xmlns);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const color = paletteColors[spriteData[index]];
            const rect = document.createElementNS(xmlns, 'rect');
            rect.setAttribute('x', (x * cellSize).toString());
            rect.setAttribute('y', (y * cellSize).toString());
            rect.setAttribute('width', cellSize.toString());
            rect.setAttribute('height', cellSize.toString());
            rect.setAttribute('fill', color);
            svg.appendChild(rect);
        }
    }

    return svg.outerHTML;
}

let selectedColor: string | null = null;

const canvas = document.getElementById('canvas') as HTMLElement;
const palette = document.getElementById('palette') as HTMLElement;
const clearButton = document.getElementById('clear') as HTMLButtonElement;

let paletteColors: string[];

let isDrawing = false;

// Create canvas
function createCanvas() {
    for (let i = 0; i < 256; i++) {
        const box = document.createElement('div');
        box.className = 'box';
        // default color is the first color in the palette
        box.style.backgroundColor = paletteColors[0];

        box.addEventListener('mousedown', () => {
            isDrawing = true;
            changeBoxColor(box);
        });

        box.addEventListener('mouseover', () => {
            if (isDrawing) {
                changeBoxColor(box);
            }
        });

        box.addEventListener('mouseup', () => {
            isDrawing = false;
        });

        canvas.appendChild(box);
    }
}

function changeBoxColor(box: HTMLElement): void {
    if (selectedColor === box.style.backgroundColor) {
        box.style.backgroundColor = '';
    } else {
        box.style.backgroundColor = selectedColor as string;
    }
}

// Clear canvas
function clearCanvas() {
    canvas.querySelectorAll('.box').forEach(box => (box as HTMLElement).style.backgroundColor = paletteColors[0]);
}

clearButton.addEventListener('click', () => {
    clearCanvas();
});

function rgbToHex(rgb: string): string {
    // Remove the "rgb(" prefix and ")" suffix, then split the string into an array of numbers
    const [r, g, b] = rgb.replace(/^rgb\(|\)$/g, '').split(',').map(Number);

    // Convert each number to a 2-digit hex string and concatenate them
    const hexColor = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;

    return hexColor.toUpperCase();
}

function getColorsFromCanvas(): number[] {
    const colorIndices: number[] = [];

    const canvasElements = document.getElementsByClassName("box");
    for (let i = 0; i < canvasElements.length; i++) {
        // Get the color of the box and convert it to a hex string from the RGB value 
        // that backgroundColor returns
        const color = (canvasElements[i] as HTMLElement).style.backgroundColor;
        const colorIndex = getColorIndex(rgbToHex(color));
        colorIndices.push(colorIndex);
    }

    // Return the color indices
    return colorIndices;
}

function colorIndicesToHex(colorIndices: number[]): string {
    let hexString = '';

    for (const index of colorIndices) {
        const hex = index.toString(16);
        hexString += hex.length === 1 ? '0' + hex : hex;
    }

    return hexString;
}

function getColorIndex(color: string): number {
    return paletteColors.indexOf(color);
}

// Mint sprite
document.getElementById('mint')?.addEventListener('click', async () => {
    // Get the address from the input field
    const address = (document.getElementById("wallet-address") as HTMLParagraphElement).innerText;

    // Get the color indices from the canvas
    const colors = colorIndicesToHex(getColorsFromCanvas());

    // Call the mintNFT function
    await mintNFT(address, colors);
});

async function waitForTransactionReceipt(
    provider: ethers.providers.Provider,
    transactionHash: string
): Promise<ethers.providers.TransactionReceipt> {
    // Wait for the transaction to be mined
    const receipt = await provider.waitForTransaction(transactionHash);

    return receipt;
}

interface MintResponse {
    txHash: string,
}

async function mintNFT(address: string, colors: string): Promise<void> {
    try {
        const response = await fetch(`${fileConfig.backendEndpoint || process.env.BACKEND_ENDPOINT || 'http://localhost:6789'}` + `/mint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address, colors }),
        });

        if (!response.ok) {
            throw new Error(`Mint failed: ${response.statusText}`);
        }

        // Log the tx hash that was submitted
        const decoded = await response.json() as MintResponse;
        console.log('Mint transaction submitted, tx hash: ' + decoded.txHash);

        // clear the canvas
        clearCanvas();

        // Wait for the transaction to be mined
        waitForTransactionReceipt(provider, decoded.txHash).then((receipt) => {
            console.log('Mint transaction confirmed, tx hash: ' + receipt.transactionHash);

            // refresh the sprites table
            displayMintedSprites().catch(error => {
                console.error('Error displaying minted sprites:', error);
            });
        });
    } catch (error) {
        console.error(`Error minting NFT: ${error}`);
    }
}

// Retrieve and process the config file
import fileConfig from './spritewrite.json';

// Configure the SDK using environment variables
const basePath = new URL('/api/v0', `${fileConfig.mbEndpoint || process.env.MB_HOSTNAME}`);
const config = new Configuration({
    basePath: basePath.toString(),
    accessToken: `${fileConfig.mbAPIKey || process.env.MB_API_KEY}`
});

const eventQueriesApi = new EventQueriesApi(config);
const contractsApi = new ContractsApi(config);

import _mintedNFTsQuery from './minted-nfts-query.json';
const mintedNFTsQuery = _mintedNFTsQuery as EventQuery;

async function fetchMintedSprites() {
    const resp = await eventQueriesApi.executeArbitraryEventQuery(0, 50, mintedNFTsQuery);
    return resp.data.result.rows;
}

function createTableRow(eventData: any): HTMLTableRowElement {
    const row = document.createElement('tr');
    const tokenIdCell = document.createElement('td');
    tokenIdCell.textContent = eventData.token_id;
    row.appendChild(tokenIdCell);

    const svgDataCell = document.createElement('td');
    const colors = JSON.parse(eventData.colors);
    const svgString = convertSpriteToSVG(colors, 16, 16, 5);
    svgDataCell.innerHTML = svgString;
    row.appendChild(svgDataCell);

    // Click the SVG in the table to load it into the canvas
    svgDataCell.addEventListener('click', () => {
        const canvasElements = document.getElementsByClassName("box");
        for (let i = 0; i < canvasElements.length; i++) {
            (canvasElements[i] as HTMLElement).style.backgroundColor = paletteColors[colors[i]];
        }
    });

    const ownerCell = document.createElement('td');
    ownerCell.textContent = eventData.owner;
    row.appendChild(ownerCell);

    const timestampCell = document.createElement('td');
    timestampCell.textContent = eventData.timestamp;
    row.appendChild(timestampCell);

    return row;
}

async function displayMintedSprites() {
    const tableBody = document.querySelector('#event-table tbody') as HTMLTableSectionElement;
    tableBody.innerHTML = '';
    const eventData = await fetchMintedSprites();

    eventData.forEach((event: any) => {
        const row = createTableRow(event);
        tableBody.appendChild(row);
    });
}

async function displayPalette() {
    // Fetch palette from the smart contract
    const payload = { args: [] };
    const resp = await contractsApi.callContractFunction('ethereum', 'sprite_write', 'sprite_write', 'colorCodes', payload);
    if (resp.data.result.kind === 'MethodCallResponse') {
        paletteColors = resp.data.result.output;
    } else {
        throw new Error(`Unexpected response type: ${resp.data.result.kind}`);
    }

    // Create palette container
    const paletteContainer = document.createElement('div');
    paletteContainer.className = 'palette-container';
    palette.appendChild(paletteContainer);

    // Create palette
    for (let row = 0; row < 4; row++) {
        const paletteRow = document.createElement('div');
        paletteRow.className = 'palette-row';

        for (let col = 0; col < 16; col++) {
            const colorIndex = row * 16 + col;
            const color = paletteColors[colorIndex];
            const colorBox = document.createElement('div');
            colorBox.className = 'color';
            colorBox.style.backgroundColor = color;
            colorBox.addEventListener('click', () => {
                selectedColor = color;
                palette.querySelectorAll('.color').forEach(c => (c as HTMLElement).style.borderWidth = '1px');
                colorBox.style.borderWidth = '3px';
            });
            paletteRow.appendChild(colorBox);
        }

        paletteContainer.appendChild(paletteRow);
    }

    createCanvas();

    displayMintedSprites().catch(error => {
        console.error('Error displaying minted sprites:', error);
    });
}

displayPalette().catch(error => {
    console.error('Error displaying palette:', error);
});

document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.ethereum !== "undefined") {
        provider = new ethers.providers.Web3Provider(window.ethereum);
    } else {
        console.error("No web3 provider detected.");
    }
});

let provider: ethers.providers.Web3Provider;
let signer: ethers.Signer | null;
let connected = false;

document.addEventListener("DOMContentLoaded", () => {
    const connectWalletButton = document.getElementById("connect-wallet") as HTMLButtonElement;
    const walletAddressElement = document.getElementById("wallet-address") as HTMLParagraphElement;

    connectWalletButton.addEventListener("click", async () => {
        if (!connected) {
            await connectWallet();
        } else {
            disconnectWallet();
        }
    });

    async function tryWalletOnLoad() {
        if (typeof window.ethereum !== "undefined") {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            try {
                signer = provider.getSigner();
                const address = await signer.getAddress();
                connected = true;
                walletAddressElement.innerText = address;
                connectWalletButton.innerText = "Disconnect Wallet";
            } catch (err) {
                console.error("Wallet not detected on load:", err);
            }
        }
    }

    async function connectWallet() {
        if (typeof window.ethereum !== "undefined") {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            try {
                await window.ethereum.request({ method: "eth_requestAccounts" });
                signer = provider.getSigner();
                const address = await signer.getAddress();
                connected = true;
                walletAddressElement.innerText = address;
                connectWalletButton.innerText = "Disconnect Wallet";
            } catch (err) {
                console.error("User rejected connection:", err);
            }
        } else {
            alert("Please install MetaMask or another compatible wallet to connect.");
        }
    }

    function disconnectWallet() {
        signer = null;
        connected = false;
        walletAddressElement.innerText = "Not connected";
        connectWalletButton.innerText = "Connect Wallet";
    }

    tryWalletOnLoad();
});