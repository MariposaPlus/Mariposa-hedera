const ethers = require('ethers');
const {
  ContractExecuteTransaction,
  TokenAssociateTransaction,
  Hbar,
  HbarUnit,
  AccountBalanceQuery,
  TokenId
} = require('@hashgraph/sdk');
const ContactsTokensService = require('./contactsTokensService');

// SaucerSwap Router V2 ABI (from actual deployed contract)
const SAUCERSWAP_ABI = [
  // Constructor
  "constructor(address _factory, address _WHBAR)",
  
  // View functions
  "function WHBAR() view returns (address)",
  "function factory() view returns (address)",
  "function owner() view returns (address)",
  "function whbar() view returns (address)",
  
  // Association function (CRITICAL for Hedera tokens)
  "function associateSwapRouterToToken(address token)",
  
  // Swap functions (exactly as in ABI)
  "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function exactOutput((bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum)) external payable returns (uint256 amountIn)",
  "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)",
  
  // Payment and utility functions
  "function refundETH() external payable",
  "function unwrapWHBAR(uint256 amountMinimum, address recipient) external payable",
  "function unwrapWHBARWithFee(uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) external payable",
  "function sweepToken(address token, uint256 amountMinimum, address recipient) external payable",
  "function sweepTokenWithFee(address token, uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) external payable",
  
  // Multicall
  "function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)",
  
  // Uniswap V3 callback
  "function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes _data)",
  
  // Ownership
  "function transferOwnership(address newOwner)",
  "function renounceOwnership()",
  
  // Events
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  
  // Errors
  "error AssociateFail(int256 respCode)",
  "error RespCode(int32 respCode)"
];

class SaucerSwapService {
  constructor() {
    this.swapRouterContractId = '0.0.1414040'; // SaucerSwapV2SwapRouter
    this.factoryContractId = '0.0.1197038'; // SaucerSwapV2Factory
    this.abiInterface = new ethers.Interface(SAUCERSWAP_ABI);
    this.contactsTokensService = new ContactsTokensService();
    
    // Initialize token mappings
    this.initializeTokenMappings();
  }

  /**
   * Initialize common token mappings
   */
  initializeTokenMappings() {
    this.commonTokens = {
      'HBAR': {
        id: '0.0.0',
        evmAddress: '0x0000000000000000000000000000000000000000' // Native HBAR
      },
      'WHBAR': {
        id: '0.0.1456986',
        evmAddress: this.hederaTokenIdToEvmAddress('0.0.1456986')
      },
      'USDC': {
        id: '0.0.456858',
        evmAddress: this.hederaTokenIdToEvmAddress('0.0.456858')
      },
      'USDT': {
        id: '0.0.651855',
        evmAddress: this.hederaTokenIdToEvmAddress('0.0.651855')
      },
      'SAUCE': {
        id: '0.0.731861',
        evmAddress: this.hederaTokenIdToEvmAddress('0.0.731861')
      },
      'DOVU': {
        id: '0.0.723464',
        evmAddress: this.hederaTokenIdToEvmAddress('0.0.723464')
      },
      'GRELF': {
        id: '0.0.2286568',
        evmAddress: this.hederaTokenIdToEvmAddress('0.0.2286568')
      }
    };
  }

  /**
   * Convert Hedera token ID to EVM address format
   * @param {string} tokenId - Hedera token ID (e.g., "0.0.456858")
   * @returns {string} EVM address format
   */
  hederaTokenIdToEvmAddress(tokenId) {
    // Extract the token number from the token ID
    const parts = tokenId.split('.');
    if (parts.length !== 3 || parts[0] !== '0' || parts[1] !== '0') {
      throw new Error(`Invalid Hedera token ID format: ${tokenId}`);
    }
    
    const tokenNumber = parseInt(parts[2]);
    // Convert to 40-character hex address (20 bytes)
    return '0x' + tokenNumber.toString(16).padStart(40, '0');
  }

  /**
   * Convert address to EVM format (handles both Hedera account IDs and existing EVM addresses)
   * @param {string} address - Address in any format
   * @returns {string} EVM address format
   */
  convertToEvmAddress(address) {
    if (!address) {
      throw new Error('Address is required');
    }
    
    // If already in EVM format (0x...), return as is
    if (address.startsWith('0x') && address.length === 42) {
      return address;
    }
    
    // If it's a Hedera account ID format (0.0.xxxxxx), convert it
    if (/^0\.0\.\d+$/.test(address)) {
      return this.hederaTokenIdToEvmAddress(address);
    }
    
    // If it's just a number, treat it as account number
    if (/^\d+$/.test(address)) {
      return '0x' + parseInt(address).toString(16).padStart(40, '0');
    }
    
    throw new Error(`Invalid address format: ${address}. Expected Hedera account ID (0.0.xxxxx) or EVM address (0x...)`);
  }

  /**
   * Execute a swap transaction using SaucerSwap
   * @param {Object} swapParams - Swap parameters
   * @param {Object} client - Hedera client
   * @returns {Object} Swap execution result
   */
  async executeSwap(swapParams, client) {
    try {
      console.log('🔄 Executing SaucerSwap transaction:', swapParams);

      const {
        inputToken,
        outputToken,
        amountIn,
        amountOut,
        swapType, // 'exactInput' or 'exactOutput'
        recipient,
        slippageTolerance = 2.0, // 2.0% default slippage (more realistic for volatile markets)
        deadline = Math.floor(Date.now() / 1000) + 1200 // 20 minutes from now
      } = swapParams;

      // Convert recipient address from Hedera account ID to EVM address format
      const recipientEvmAddress = this.convertToEvmAddress(recipient);
      
      // Validate and get token information
      const inputTokenInfo = this.getTokenInfo(inputToken);
      const outputTokenInfo = this.getTokenInfo(outputToken);

      if (!inputTokenInfo || !outputTokenInfo) {
        throw new Error(`Unsupported token pair: ${inputToken} -> ${outputToken}`);
      }

      // Check token associations and router associations
      await this.ensureTokenAssociation(recipient, outputTokenInfo.id, client);
      await this.ensureRouterTokenAssociation(inputTokenInfo, outputTokenInfo, client);

      // Determine if this is a simple (single hop) swap or complex (multi-hop) swap
      const isSimpleSwap = true; // For now, assume single hop - you can enhance this logic later
      
      // Prepare swap parameters based on swap type
      let swapParams_contract;
      let payableAmount = Hbar.from(0);
      let actualSwapType = swapType;

      console.log(`🔄 Preparing ${swapType} swap:`);
      console.log(`  Input: ${inputTokenInfo.symbol} (${amountIn})`);
      console.log(`  Output: ${outputTokenInfo.symbol} (${amountOut})`);
      console.log(`  Slippage: ${slippageTolerance}%`);

      if (swapType === 'exactInput') {
        const amountOutMinimum = this.calculateMinimumOutput(amountOut, slippageTolerance);
        
        if (isSimpleSwap) {
          // Use exactInputSingle for better gas efficiency
          actualSwapType = 'exactInputSingle';
          swapParams_contract = {
            tokenIn: inputTokenInfo.address,
            tokenOut: outputTokenInfo.address,
            fee: 3000, // 0.3% fee tier
            recipient: recipientEvmAddress,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0 // No price limit
          };
        } else {
          // Use exactInput for multi-hop swaps
          const routePath = this.buildRoutePath(inputTokenInfo, outputTokenInfo);
          swapParams_contract = {
            path: routePath,
            recipient: recipientEvmAddress,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum
          };
        }

        console.log(`  exactInput - AmountIn: ${amountIn}, MinimumOut: ${amountOutMinimum}`);

        // If input token is HBAR, set payable amount
        if (inputToken === 'HBAR' || inputToken === 'WHBAR') {
          payableAmount = Hbar.from(amountIn, HbarUnit.Tinybar);
        }
      } else { // exactOutput
        const amountInMaximum = this.calculateMaximumInput(amountIn, slippageTolerance);
        
        if (isSimpleSwap) {
          // Use exactOutputSingle for better gas efficiency
          actualSwapType = 'exactOutputSingle';
          swapParams_contract = {
            tokenIn: inputTokenInfo.address,
            tokenOut: outputTokenInfo.address,
            fee: 3000, // 0.3% fee tier
            recipient: recipientEvmAddress,
            deadline: deadline,
            amountOut: amountOut,
            amountInMaximum: amountInMaximum,
            sqrtPriceLimitX96: 0 // No price limit
          };
        } else {
          // Use exactOutput for multi-hop swaps
          const routePath = this.buildRoutePath(inputTokenInfo, outputTokenInfo);
          swapParams_contract = {
            path: this.reverseRoutePath(routePath), // Reverse path for exactOutput
            recipient: recipientEvmAddress,
            deadline: deadline,
            amountOut: amountOut,
            amountInMaximum: amountInMaximum
          };
        }

        console.log(`  exactOutput - AmountOut: ${amountOut}, MaximumIn: ${amountInMaximum}`);

        // If input token is HBAR, set payable amount
        if (inputToken === 'HBAR' || inputToken === 'WHBAR') {
          payableAmount = Hbar.from(amountInMaximum, HbarUnit.Tinybar);
        }
      }

      // Encode swap function using the actual swap type (single vs multi-hop)
      const swapEncoded = this.abiInterface.encodeFunctionData(actualSwapType, [swapParams_contract]);
    
      // For HBAR swaps, include WHBAR unwrapping
      const callsToExecute = [swapEncoded];
      if (inputToken === 'HBAR' || inputToken === 'WHBAR' || outputToken === 'HBAR' || outputToken === 'WHBAR') {
        // Add WHBAR unwrapping for HBAR output
        const unwrapEncoded = this.abiInterface.encodeFunctionData('unwrapWHBAR', [0, recipientEvmAddress]);
        callsToExecute.push(unwrapEncoded);
      }
      
      // Add refund call for any remaining ETH/HBAR
      const refundEncoded = this.abiInterface.encodeFunctionData('refundETH', []);
      callsToExecute.push(refundEncoded);

      // Prepare multicall
      const encodedData = this.abiInterface.encodeFunctionData('multicall', [callsToExecute]);
      const encodedDataAsUint8Array = this.hexToUint8Array(encodedData);

      // Execute the transaction with higher gas limit
      const transaction = new ContractExecuteTransaction()
        .setContractId(this.swapRouterContractId)
        .setGas(500000) // Increased gas limit for complex swaps
        .setFunctionParameters(encodedDataAsUint8Array);

      if (payableAmount.toTinybars() > 0) {
        transaction.setPayableAmount(payableAmount);
      }

      console.log('📤 Submitting swap transaction...');
      const response = await transaction.execute(client);
      
      // Get transaction record
    const record = await response.getRecord(client);
    const result = record.contractFunctionResult;
      
      if (!result) {
        throw new Error('Contract execution failed - no result returned');
      }

      // Parse result based on swap type
    const values = result.getResult(['uint256']);
      const actualAmount = values[0];

      console.log('✅ SaucerSwap executed successfully');

      return {
        success: true,
        transactionId: response.transactionId.toString(),
        swapType: actualSwapType,
        originalSwapType: swapType,
        inputToken: inputToken,
        outputToken: outputToken,
        actualAmount: actualAmount.toString(),
        gasUsed: record.contractFunctionResult?.gasUsed || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ SaucerSwap execution failed:', error);
    return {
        success: false,
        error: error.message,
      timestamp: new Date().toISOString()
    };
    }
  }

  /**
   * Ensure token is associated with the account
   */
  async ensureTokenAssociation(accountId, tokenId, client) {
    try {
      // Skip association for HBAR
      if (tokenId === '0.0.0') return;

      console.log(`🔗 Checking token association: ${tokenId} for ${accountId}`);
      
      // Check if token is already associated
      const balanceQuery = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(client);

      const hasToken = balanceQuery.tokens && balanceQuery.tokens.get(TokenId.fromString(tokenId));
      
      if (!hasToken) {
        console.log(`🔗 Associating token ${tokenId} with account ${accountId}`);
        
        const associateTransaction = await new TokenAssociateTransaction()
          .setAccountId(accountId)
          .setTokenIds([TokenId.fromString(tokenId)])
          .execute(client);

        await associateTransaction.getReceipt(client);
        console.log('✅ Token association successful');
      }
    } catch (error) {
      console.error('❌ Token association failed:', error);
      throw new Error(`Failed to associate token ${tokenId}: ${error.message}`);
    }
  }

  /**
   * Ensure router is associated with tokens (critical for SaucerSwap V2)
   */
  async ensureRouterTokenAssociation(inputTokenInfo, outputTokenInfo, client) {
    try {
      console.log('🔗 Ensuring router token associations...');
      
      const tokensToAssociate = [];
      
      // Add input token if not HBAR
      if (inputTokenInfo.id !== '0.0.0' && !inputTokenInfo.isWrappedHBAR) {
        tokensToAssociate.push(inputTokenInfo.address);
      }
      
      // Add output token if not HBAR
      if (outputTokenInfo.id !== '0.0.0' && !outputTokenInfo.isWrappedHBAR) {
        tokensToAssociate.push(outputTokenInfo.address);
      }
      
      // Associate each token with the router
      for (const tokenAddress of tokensToAssociate) {
        console.log(`🔗 Associating router with token: ${tokenAddress}`);
        
        const associateData = this.abiInterface.encodeFunctionData('associateSwapRouterToToken', [tokenAddress]);
        const associateDataAsUint8Array = this.hexToUint8Array(associateData);
        
        const associateTransaction = new ContractExecuteTransaction()
          .setContractId(this.swapRouterContractId)
          .setGas(200000)
          .setFunctionParameters(associateDataAsUint8Array);
        
        try {
          const response = await associateTransaction.execute(client);
          await response.getReceipt(client);
          console.log(`✅ Router association successful for token: ${tokenAddress}`);
        } catch (error) {
          // Association might already exist, log but don't fail
          console.log(`ℹ️ Router association for ${tokenAddress}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Router token association failed:', error);
      // Don't throw here as association might already exist
      console.log('⚠️ Continuing with swap despite association warning...');
    }
  }

  /**
   * Normalize token (handle both symbols and token IDs)
   */
  normalizeToken(token) {
    if (!token) return null;
    
    // If it's a token ID (0.0.xxxxxx), return as is
    if (/^0\.0\.\d+$/.test(token)) {
      return token;
    }
    
    // Otherwise, convert to uppercase symbol
    return token.toUpperCase();
  }

      /**
   * Get token information by symbol or token ID
   * Note: HBAR is automatically converted to WHBAR for SaucerSwap
   */
  getTokenInfo(tokenIdentifier) {
    if (!tokenIdentifier) return null;
    
    // First try to get token info from testnet swap tokens
    try {
      const tokenInfo = this.contactsTokensService.findToken(tokenIdentifier, true); // forSwap = true
      if (tokenInfo && tokenInfo.id) {
        console.log(`✅ SaucerSwap found token ${tokenIdentifier} in testnet swap tokens: ${tokenInfo.id}`);
        return {
          symbol: tokenInfo.symbol || tokenIdentifier,
          id: tokenInfo.id,
          address: tokenInfo.evmAddress || this.hederaTokenIdToEvmAddress(tokenInfo.id)
        };
      }
    } catch (error) {
      console.warn('⚠️ Error finding token in testnet swap tokens:', error);
    }
    
    // If it's a token ID, convert to EVM address
    if (/^0\.0\.\d+$/.test(tokenIdentifier)) {
      // Special handling for native HBAR - convert to WHBAR for swaps
      if (tokenIdentifier === '0.0.0') {
        // Try to get WHBAR from testnet tokens first
        try {
          const whbarInfo = this.contactsTokensService.findToken('WHBAR', true);
          if (whbarInfo && whbarInfo.id) {
            return {
              symbol: 'WHBAR',
              id: whbarInfo.id,
              address: whbarInfo.evmAddress || this.hederaTokenIdToEvmAddress(whbarInfo.id),
              isWrappedHBAR: true
            };
          }
        } catch (error) {
          console.warn('⚠️ Error finding WHBAR in testnet tokens, using fallback');
        }
        
        // Fallback to hardcoded WHBAR
        return {
          symbol: 'WHBAR',
          id: this.commonTokens['WHBAR'].id,
          address: this.commonTokens['WHBAR'].evmAddress,
          isWrappedHBAR: true
        };
      }
      
      return {
        symbol: tokenIdentifier, // Use token ID as symbol for unknown tokens
        id: tokenIdentifier,
        address: this.hederaTokenIdToEvmAddress(tokenIdentifier)
      };
    }
    
    // Otherwise, look up by symbol
    const symbol = tokenIdentifier.toUpperCase();
    
    // Special handling for HBAR - convert to WHBAR for swaps
    if (symbol === 'HBAR') {
      // Try to get WHBAR from testnet tokens first
      try {
        const whbarInfo = this.contactsTokensService.findToken('WHBAR', true);
        if (whbarInfo && whbarInfo.id) {
          return {
            symbol: 'WHBAR',
            id: whbarInfo.id,
            address: whbarInfo.evmAddress || this.hederaTokenIdToEvmAddress(whbarInfo.id),
            isWrappedHBAR: true
          };
        }
      } catch (error) {
        console.warn('⚠️ Error finding WHBAR in testnet tokens, using fallback');
      }
      
      // Fallback to hardcoded WHBAR
      return {
        symbol: 'WHBAR',
        id: this.commonTokens['WHBAR'].id,
        address: this.commonTokens['WHBAR'].evmAddress,
        isWrappedHBAR: true
      };
    }
    
    // Fallback to hardcoded tokens if not found in testnet tokens
    if (this.commonTokens[symbol]) {
      console.log(`⚠️ SaucerSwap using fallback token mapping for ${symbol}`);
      return {
        symbol: symbol,
        id: this.commonTokens[symbol].id,
        address: this.commonTokens[symbol].evmAddress
      };
    }
    
    return null;
  }

  /**
   * Build route path for the swap (simplified - single hop)
   */
  buildRoutePath(inputToken, outputToken) {
    // For simplicity, using a default fee tier of 0.3% (3000)
    // In a production environment, you'd determine the best route
    const fee = 3000; // 0.3% fee tier
    
    // Encode path: tokenA + fee + tokenB
    const path = ethers.solidityPacked(
      ['address', 'uint24', 'address'],
      [inputToken.address, fee, outputToken.address]
    );
    
    return path;
  }

  /**
   * Reverse route path for exactOutput swaps
   */
  reverseRoutePath(path) {
    // For exactOutput, we need to reverse the token order
    // Path format: token0 + fee + token1
    // Reversed: token1 + fee + token0
    
    if (!path || path.length !== 43) { // 20 bytes + 3 bytes + 20 bytes = 43 bytes total
      console.warn('⚠️ Invalid path length for reversal, using original path');
      return path;
    }
    
    try {
      // Extract components: first 20 bytes (token0), next 3 bytes (fee), last 20 bytes (token1)
      const token0 = path.slice(0, 42);  // 20 bytes = 40 hex chars + '0x' = 42 chars
      const fee = path.slice(42, 48);    // 3 bytes = 6 hex chars
      const token1 = path.slice(48);     // remaining 20 bytes = 40 hex chars
      
      // Reverse: token1 + fee + token0
      const reversedPath = token1 + fee + token0.slice(2); // Remove '0x' from token0
      
      console.log('🔄 Path reversed for exactOutput swap');
      return '0x' + reversedPath;
      
    } catch (error) {
      console.warn('⚠️ Error reversing path, using original:', error.message);
      return path;
    }
  }

  /**
   * Calculate minimum output with slippage tolerance
   */
  calculateMinimumOutput(expectedAmount, slippageTolerance) {
    // Validate inputs
    if (!expectedAmount || expectedAmount <= 0) {
      throw new Error('Expected amount must be positive');
    }
    if (slippageTolerance < 0 || slippageTolerance > 50) {
      throw new Error('Slippage tolerance must be between 0% and 50%');
    }
    
    const slippageMultiplier = (100 - slippageTolerance) / 100;
    const minimumOutput = Math.floor(expectedAmount * slippageMultiplier);
    
    console.log(`💱 Slippage calculation - Expected: ${expectedAmount}, Tolerance: ${slippageTolerance}%, Minimum: ${minimumOutput}`);
    
    return minimumOutput;
  }

  /**
   * Calculate maximum input with slippage tolerance
   */
  calculateMaximumInput(expectedAmount, slippageTolerance) {
    // Validate inputs
    if (!expectedAmount || expectedAmount <= 0) {
      throw new Error('Expected amount must be positive');
    }
    if (slippageTolerance < 0 || slippageTolerance > 50) {
      throw new Error('Slippage tolerance must be between 0% and 50%');
    }
    
    const slippageMultiplier = (100 + slippageTolerance) / 100;
    const maximumInput = Math.floor(expectedAmount * slippageMultiplier);
    
    console.log(`💱 Slippage calculation - Expected: ${expectedAmount}, Tolerance: ${slippageTolerance}%, Maximum: ${maximumInput}`);
    
    return maximumInput;
  }

  /**
   * Get recommended slippage tolerance based on market conditions
   * @param {string} inputToken - Input token symbol
   * @param {string} outputToken - Output token symbol
   * @returns {number} Recommended slippage percentage
   */
  getRecommendedSlippage(inputToken, outputToken) {
    // Higher slippage for volatile or less liquid pairs
    const volatileTokens = ['SAUCE', 'DOVU', 'GRELF'];
    const stableTokens = ['USDC', 'USDT'];
    
    const isInputVolatile = volatileTokens.includes(inputToken?.toUpperCase());
    const isOutputVolatile = volatileTokens.includes(outputToken?.toUpperCase());
    const isStablePair = stableTokens.includes(inputToken?.toUpperCase()) && 
                        stableTokens.includes(outputToken?.toUpperCase());
    
    if (isStablePair) {
      return 0.5; // Low slippage for stable pairs
    } else if (isInputVolatile || isOutputVolatile) {
      return 5.0; // Higher slippage for volatile tokens
    } else {
      return 2.0; // Standard slippage for main tokens
    }
  }

  /**
   * Convert hex string to Uint8Array
   */
  hexToUint8Array(hexString) {
    // Remove '0x' prefix if present
    const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    
    // Convert to Uint8Array
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    
    return bytes;
  }

  /**
   * Parse swap intent from user message using LLM ONLY
   */
  async parseSwapIntentWithLLM(message) {
    try {
      console.log('🤖 Using Together AI LLM to parse swap intent:', message);
      
      const systemPrompt = `You are an intelligent swap intent parser for a DeFi platform on Hedera testnet. Parse user messages to extract swap details with high accuracy.

CRITICAL PARSING RULES:
1. NORMALIZE all token symbols to UPPERCASE (hbar → HBAR, sauce → SAUCE, usdc → USDC)
2. Common testnet tokens: HBAR, WHBAR, USDC, USDT, SAUCE, DOVU, GRELF, WETH, WBTC
3. Token IDs are in format: 0.0.xxxxxx (e.g., 0.0.5133110, 0.0.1183558)
4. When user says "token tokenid X" or "token id X" or "tokenid X", extract X as the actual destination token
5. Ignore filler words: "token", "to", "for", "with", "that", "the"
6. Extract amounts if specified, otherwise set to null
7. Be very careful to distinguish between token symbols and token IDs
8. ALWAYS extract token symbols in UPPERCASE format for consistency

EXAMPLE PARSING:
- "swap 1 HBAR to USDC" → fromToken: "HBAR", toToken: "USDC", amount: 1
- "swap 1 hbar to sauce" → fromToken: "HBAR", toToken: "SAUCE", amount: 1
- "trade 50 usdc for sauce" → fromToken: "USDC", toToken: "SAUCE", amount: 50
- "swap 1 Hbar to token tokenid 0.0.5133110" → fromToken: "HBAR", toToken: "0.0.5133110", amount: 1
- "exchange 100 SAUCE for token id 0.0.456858" → fromToken: "SAUCE", toToken: "0.0.456858", amount: 100
- "trade HBAR to tokenid 0.0.123456" → fromToken: "HBAR", toToken: "0.0.123456", amount: null
- "swap my tokens" → NOT a valid swap (missing specific tokens)

Return ONLY valid JSON (no explanation text):
{
  "isSwap": boolean,
  "fromToken": "symbol or token ID (UPPERCASE if symbol)",
  "toToken": "symbol or token ID (UPPERCASE if symbol)", 
  "amount": number or null,
  "confidence": number (0-1)
}`;

      const userPrompt = `Parse this swap message: "${message}"

Return only the JSON object.`;

      // Ensure Together AI is available - try global first, then create local instance
     let togetherAI = global.togetherAI;
      console.log(process.env.TOGETHER_API_KEY);
      if (process.env.TOGETHER_API_KEY) {
        console.log('🔧 Global Together AI not available, creating local instance...');
        try {
          const Together = require('together-ai').default;
          togetherAI = new Together({
            apiKey: process.env.TOGETHER_API_KEY
          });
          console.log('✅ Local Together AI instance created successfully');
        } catch (error) {
          throw new Error(`Failed to create Together AI instance: ${error.message}`);
        }
      }
      
      if (!togetherAI) {
        throw new Error('Together AI not available. Please check TOGETHER_API_KEY environment variable.');
      }

      const response = await togetherAI.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 250,
        temperature: 0.1, // Low temperature for consistent parsing
        top_p: 0.9,
        repetition_penalty: 1.0
      });

      const content = response.choices[0]?.message?.content?.trim();
      console.log('🔍 Raw LLM response:', content);

      if (!content) {
        throw new Error('No response from LLM');
      }

      // Extract JSON from the response (more robust parsing)
      let jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        // Try to find JSON even if wrapped in markdown
        jsonMatch = content.match(/```(?:json)?\n?(\{[\s\S]*?\})\n?```/);
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1];
        }
      }

      if (!jsonMatch) {
        throw new Error(`No valid JSON found in LLM response: ${content}`);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the parsed result
      if (typeof parsed.isSwap !== 'boolean') {
        throw new Error('Invalid LLM response: missing or invalid isSwap field');
      }

      console.log('✅ LLM successfully parsed swap intent:', parsed);
      
      return {
        ...parsed,
        rawMessage: message,
        parsingMethod: 'llm',
        llmResponse: content
      };
      
    } catch (error) {
      console.error('❌ LLM parsing error:', error.message);
      
      // Return a clear error response instead of fallback
      return {
        isSwap: false,
        error: `LLM parsing failed: ${error.message}`,
        rawMessage: message,
        parsingMethod: 'failed',
        confidence: 0
      };
    }
  }

  /**
   * Parse swap intent from user message using regex (DEPRECATED - use LLM only)
   */
  parseSwapIntentRegex(message) {
    console.warn('⚠️ DEPRECATED: parseSwapIntentRegex should not be used. Use parseSwapIntentWithLLM instead.');
    // Return empty result to force use of LLM
    return {
      isSwap: false,
      error: 'Regex parsing deprecated - use LLM parsing',
      parsingMethod: 'deprecated'
    };
  }

  // DEPRECATED: Legacy regex parsing (removing all regex code)
  _legacyRegexParsing(message) {
    // This method is kept for reference but should never be called
    const lowerMessage = message.toLowerCase();
    
    // Multiple swap patterns to catch various formats including token IDs
    const patterns = [
      // Special patterns for "token tokenid X" and "token id X" formats
      /swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+token\s+(?:token)?id\s+(\d+\.\d+\.\d+)/i,  // "swap 1 HBAR to token tokenid 0.0.5133110"
      /swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+token\s+(\d+\.\d+\.\d+)/i,                 // "swap 1 HBAR to token 0.0.5133110"
      /exchange\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+token\s+(?:token)?id\s+(\d+\.\d+\.\d+)/i, // "exchange 100 HBAR for token id 0.0.456858"
      /trade\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+token\s+(?:token)?id\s+(\d+\.\d+\.\d+)/i,    // "trade 50 SAUCE to token tokenid 0.0.123456"
      /convert\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+token\s+(?:token)?id\s+(\d+\.\d+\.\d+)/i,  // "convert 1000 USDC to token id 0.0.456858"
      
      // Patterns without "token" prefix
      /swap\s+(\d+(?:\.\d+)?)\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i, // "swap 100 0.0.123456 for 0.0.789012"
      /swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,           // "swap 100 HBAR for 0.0.5133110"
      /swap\s+(\d+(?:\.\d+)?)\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\w+)/i,           // "swap 100 0.0.5133110 for HBAR"
      /swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,                     // "swap 100 HBAR for USDC"
      /exchange\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,       // "exchange 50 SAUCE to 0.0.5133110"
      /exchange\s+(\d+(?:\.\d+)?)\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\w+)/i,       // "exchange 50 0.0.5133110 to HBAR"
      /exchange\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,                 // "exchange 50 SAUCE to HBAR"
      /convert\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,        // "convert 1000 USDC to 0.0.5133110"
      /convert\s+(\d+(?:\.\d+)?)\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\w+)/i,        // "convert 1000 0.0.5133110 to USDC"
      /convert\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,                  // "convert 1000 USDC to SAUCE"
      /trade\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,          // "trade 100 HBAR for 0.0.5133110"
      /trade\s+(\d+(?:\.\d+)?)\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\w+)/i,          // "trade 100 0.0.5133110 for HBAR"
      /trade\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,                    // "trade 100 HBAR for USDC"
      
      // Patterns without amounts but with "token" prefix
      /swap\s+(\w+)\s+(?:for|to)\s+token\s+(?:token)?id\s+(\d+\.\d+\.\d+)/i,      // "swap HBAR to token tokenid 0.0.5133110"
      /swap\s+(\w+)\s+(?:for|to)\s+token\s+(\d+\.\d+\.\d+)/i,                     // "swap HBAR to token 0.0.5133110"
      /exchange\s+(\w+)\s+(?:for|to)\s+token\s+(?:token)?id\s+(\d+\.\d+\.\d+)/i,  // "exchange SAUCE to token id 0.0.456858"
      /trade\s+(\w+)\s+(?:for|to)\s+token\s+(?:token)?id\s+(\d+\.\d+\.\d+)/i,     // "trade HBAR to token tokenid 0.0.123456"
      
      // Patterns without amounts and without "token" prefix
      /swap\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,                   // "swap 0.0.123456 for 0.0.789012"
      /swap\s+(\w+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,                             // "swap HBAR for 0.0.5133110"
      /swap\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\w+)/i,                             // "swap 0.0.5133110 for HBAR"
      /swap\s+(\w+)\s+(?:for|to)\s+(\w+)/i,                                       // "swap HBAR for USDC"
      /exchange\s+(\w+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,                         // "exchange SAUCE to 0.0.5133110"
      /exchange\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\w+)/i,                         // "exchange 0.0.5133110 to HBAR"
      /exchange\s+(\w+)\s+(?:for|to)\s+(\w+)/i,                                   // "exchange SAUCE to HBAR"
      /convert\s+(\w+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,                          // "convert USDC to 0.0.5133110"
      /convert\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\w+)/i,                          // "convert 0.0.5133110 to USDC"
      /convert\s+(\w+)\s+(?:for|to)\s+(\w+)/i,                                    // "convert USDC to SAUCE"
      /trade\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,                  // "trade 0.0.123456 for 0.0.789012"
      /trade\s+(\w+)\s+(?:for|to)\s+(\d+\.\d+\.\d+)/i,                            // "trade HBAR for 0.0.5133110"
      /trade\s+(\d+\.\d+\.\d+)\s+(?:for|to)\s+(\w+)/i,                            // "trade 0.0.5133110 for HBAR"
      /trade\s+(\w+)\s+(?:for|to)\s+(\w+)/i                                       // "trade HBAR for USDC"
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        let amount, fromToken, toToken;
        
        // Determine the structure based on match groups
        if (match.length === 4) {
          // 4 groups = amount + fromToken + toToken
          [, amount, fromToken, toToken] = match;
        } else if (match.length === 3) {
          // 3 groups = fromToken + toToken (no amount)
          [, fromToken, toToken] = match;
          amount = null;
        }

        return {
          isSwap: true,
          fromToken: fromToken ? this.normalizeToken(fromToken) : null,
          toToken: toToken ? this.normalizeToken(toToken) : null,
          amount: amount ? parseFloat(amount) : null,
          swapType: 'exactInput',
          rawMessage: message,
          confidence: 0.9
        };
      }
    }

    // Check for general swap keywords without specific format
    const swapKeywords = ['swap', 'exchange', 'convert', 'trade', 'saucerswap'];
    const hasSwapKeyword = swapKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasSwapKeyword) {
      // Look for token mentions (symbols and token IDs)
      const tokenSymbolPattern = /\b(hbar|usdc|usdt|sauce|whbar|dovu|grelf|btc|eth)\b/gi;
      const tokenIdPattern = /\b0\.0\.\d+\b/g;
      
      const tokenSymbols = message.match(tokenSymbolPattern) || [];
      const tokenIds = message.match(tokenIdPattern) || [];
      
      // Combine all found tokens
      const allTokens = [...tokenSymbols, ...tokenIds];
      
      if (allTokens.length >= 2) {
        return {
          isSwap: true,
          fromToken: this.normalizeToken(allTokens[0]),
          toToken: this.normalizeToken(allTokens[1]),
          amount: null,
          swapType: 'exactInput',
          rawMessage: message,
          confidence: 0.7
        };
      } else if (allTokens.length === 1) {
        return {
          isSwap: true,
          fromToken: this.normalizeToken(allTokens[0]),
          toToken: null,
          amount: null,
          swapType: 'exactInput',
          rawMessage: message,
          confidence: 0.6
        };
      }
    }
    
    return {
      isSwap: false,
      rawMessage: message,
      confidence: 0
    };
  }

  /**
   * Verify router configuration by calling view functions
   */
  async verifyRouterConfiguration(client) {
    try {
      console.log('🔍 Verifying SaucerSwap Router V2 configuration...');
      
      // Get WHBAR address from router
      const whbarQuery = this.abiInterface.encodeFunctionData('WHBAR', []);
      const whbarQueryAsUint8Array = this.hexToUint8Array(whbarQuery);
      
      const whbarResponse = await new ContractExecuteTransaction()
        .setContractId(this.swapRouterContractId)
        .setGas(100000)
        .setFunctionParameters(whbarQueryAsUint8Array)
        .execute(client);
      
      const whbarRecord = await whbarResponse.getRecord(client);
      if (whbarRecord.contractFunctionResult) {
        const whbarAddress = whbarRecord.contractFunctionResult.getAddress(0);
        console.log(`✅ Router WHBAR address: ${whbarAddress}`);
      }
      
      // Get factory address from router
      const factoryQuery = this.abiInterface.encodeFunctionData('factory', []);
      const factoryQueryAsUint8Array = this.hexToUint8Array(factoryQuery);
      
      const factoryResponse = await new ContractExecuteTransaction()
        .setContractId(this.swapRouterContractId)
        .setGas(100000)
        .setFunctionParameters(factoryQueryAsUint8Array)
        .execute(client);
      
      const factoryRecord = await factoryResponse.getRecord(client);
      if (factoryRecord.contractFunctionResult) {
        const factoryAddress = factoryRecord.contractFunctionResult.getAddress(0);
        console.log(`✅ Router factory address: ${factoryAddress}`);
      }
      
      return {
        success: true,
        message: 'Router configuration verified successfully'
      };
      
    } catch (error) {
      console.error('❌ Router configuration verification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get supported tokens list
   */
  getSupportedTokens() {
    return Object.keys(this.commonTokens);
  }

  /**
   * Estimate swap output (simplified)
   */
  async estimateSwapOutput(inputToken, outputToken, amountIn) {
    // This would integrate with SaucerSwap's quoter contract
    // For now, returning a mock estimate
    return {
      estimatedOutput: amountIn * 0.95, // Mock 5% slippage
      minimumOutput: amountIn * 0.90,
      priceImpact: 0.5,
      fee: amountIn * 0.003 // 0.3% fee
    };
  }
}

module.exports = SaucerSwapService;