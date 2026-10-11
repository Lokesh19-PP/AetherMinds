import { ethers } from 'ethers';

export interface EthPublishResult {
  txHash: string;
  anchorId: number;
  chainId: number;
  contract: string;
}

const ROOT_ANCHOR_ABI = [
  'function publish(bytes32 batchKey, bytes32 root, uint32 leafCount) external returns (uint256)',
  'function batchToAnchorId(bytes32 batchKey) external view returns (uint256)',
  'function get(uint256 id) external view returns (bytes32 batchKey, bytes32 root, uint32 leafCount, uint64 timestamp)',
];

export async function publishToEthereum(input: {
  batchId: string;
  root: string;
  leafCount: number;
  rpcUrl?: string;
  contractAddress?: string;
  privateKey?: string;
}): Promise<EthPublishResult | null> {
  const rpcUrl = input.rpcUrl || process.env.ETH_RPC_URL || 'http://127.0.0.1:8545';
  const contractAddress = input.contractAddress || process.env.ETH_CONTRACT_ADDRESS;
  const privateKey =
    input.privateKey ||
    process.env.ETH_PUBLISHER_KEY ||
    // Default Hardhat account 0 private key
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

  if (!contractAddress) {
    // If no contract deployed or specified, return null
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, ROOT_ANCHOR_ABI, wallet);

    // Format batchKey & root as bytes32
    const batchKey = ethers.keccak256(ethers.toUtf8Bytes(input.batchId));
    const rootBytes32 = input.root.startsWith('0x') ? input.root : `0x${input.root}`;

    // 1. Check idempotency: see if already published on-chain
    try {
      const existingId = await contract.batchToAnchorId(batchKey);
      if (Number(existingId) > 0) {
        return {
          txHash: 'existing-anchor',
          anchorId: Number(existingId),
          chainId,
          contract: contractAddress,
        };
      }
    } catch {
      // ignore read error and proceed to publish
    }

    // 2. Publish new root
    const tx = await contract.publish(batchKey, rootBytes32, input.leafCount);
    const receipt = await tx.wait();

    // Query anchor id
    const anchorIdBig = await contract.batchToAnchorId(batchKey);
    const anchorId = Number(anchorIdBig);

    return {
      txHash: receipt.hash,
      anchorId,
      chainId,
      contract: contractAddress,
    };
  } catch (err: any) {
    console.warn(`[EthPublisher] Failed to anchor on Ethereum: ${err.message}`);
    throw err;
  }
}
