import { devnetWallets } from "@/lib/devnet-wallet-context";

const CONTRACT_NAME = "fundraising";
const PRICE_FEED_CONTRACT_NAME = "price-feed";

const DEPLOYER_ADDRESS =
  process.env.NEXT_PUBLIC_STACKS_NETWORK === "devnet"
    ? devnetWallets[0].stxAddress
    : process.env.NEXT_PUBLIC_STACKS_NETWORK === "testnet"
    ? process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER_TESTNET_ADDRESS
    : process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER_MAINNET_ADDRESS;

export const FUNDRAISING_CONTRACT = {
  address: DEPLOYER_ADDRESS,
  name: CONTRACT_NAME,
} as const;

export const PRICE_FEED_CONTRACT = {
  address: DEPLOYER_ADDRESS,
  name: PRICE_FEED_CONTRACT_NAME,
} as const;

export const getContractIdentifier = () => {
  return `${FUNDRAISING_CONTRACT.address}.${FUNDRAISING_CONTRACT.name}`;
};

export const getPriceFeedContractIdentifier = () => {
  return `${PRICE_FEED_CONTRACT.address}.${PRICE_FEED_CONTRACT.name}`;
};
