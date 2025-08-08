import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  // DragonSwap V2 Configuration (SEI Mainnet)
  DRAGONSWAP_V2_SWAP_ROUTER_ADDRESS: process.env.DRAGONSWAP_V2_SWAP_ROUTER_ADDRESS || "0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428",
  DRAGONSWAP_V2_FACTORY_ADDRESS: process.env.DRAGONSWAP_V2_FACTORY_ADDRESS || "0x179D9a5592Bc77050796F7be28058c51cA575df4",
  
  // Network Configuration
  RPC_URL: process.env.RPC_URL || "https://evm-rpc.sei-apis.com/",
  
  // Private key (you need to set this in your environment)
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  
  // Token Addresses (SEI Mainnet)
  WSEI_ADDRESS: process.env.WSEI_ADDRESS || "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7",
  USDT_ADDRESS: process.env.USDT_ADDRESS || "0x9151434b16b9763660705744891fa906f660ecc5"
}; 