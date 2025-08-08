# SaucerSwap Plugin Integration

Complete integration of SaucerSwap V2 with the `/api/agent/route` endpoint for natural language swap execution on Hedera.

## 🎯 **Overview**

This plugin enables users to execute token swaps on SaucerSwap through natural language prompts. When a user sends a swap request, the system automatically:

1. **Detects** swap intent from natural language
2. **Parses** swap parameters (tokens, amounts, slippage)
3. **Validates** token support and associations
4. **Executes** the swap using SaucerSwap V2 contracts
5. **Returns** transaction results and confirmation

## 🏗️ **Architecture**

### Core Components

#### 1. **SaucerSwapService** (`services/saucerSwapService.js`)
- **Purpose**: Core service for SaucerSwap V2 integration
- **Features**:
  - Contract interaction using ethers.js and Hedera SDK
  - Token association management
  - Slippage calculation and protection
  - Multi-call transaction encoding
  - Gas optimization

#### 2. **Message Classification** (`services/messageClassificationService.js`)
- **Enhanced with swap detection**:
  - Pattern matching for swap intents
  - Multi-language support (swap, exchange, convert, trade)
  - Token symbol extraction
  - Amount parsing with decimal support

#### 3. **Actions Processing** (`services/actionsProcessingService.js`)
- **Swap-specific handling**:
  - Specialized swap execution flow
  - Agent Hedera client integration
  - Real transaction execution
  - Error handling and fallbacks

## 🔧 **Technical Implementation**

### SaucerSwap Contract Integration

```javascript
// Contract Configuration
const SAUCERSWAP_ROUTER = '0.0.1414040'; // SaucerSwapV2SwapRouter
const FACTORY_CONTRACT = '0.0.1197038';  // SaucerSwapV2Factory

// Supported swap functions
- exactInput: Known input amount, minimum output
- exactOutput: Known output amount, maximum input
- multicall: Batched operations with refund
```

### Smart Contract Execution

```javascript
// Example swap execution
const swapParams = {
  path: routeDataWithFee,           // Encoded route path
  recipient: recipientAddress,       // User's account
  deadline: deadline,               // Unix timestamp
  amountOut: outputAmount,          // Expected output
  amountInMaximum: inputTinybarMax  // Maximum input (with slippage)
};

// Encode multiple functions
const swapEncoded = abiInterface.encodeFunctionData('exactOutput', [params]);
const refundEncoded = abiInterface.encodeFunctionData('refundETH');
const multiCallData = abiInterface.encodeFunctionData('multicall', [
  [swapEncoded, refundEncoded]
]);

// Execute with Hedera SDK
const response = await new ContractExecuteTransaction()
  .setPayableAmount(Hbar.from(inputTinybarMax, HbarUnit.Tinybar))
  .setContractId(SAUCERSWAP_ROUTER)
  .setGas(300000)
  .setFunctionParameters(hexToUint8Array(multiCallData))
  .execute(client);
```

## 🗣️ **Natural Language Support**

### Supported Patterns

```javascript
// Basic swap patterns
"swap 100 HBAR for USDC"
"exchange 50 SAUCE to HBAR"  
"convert 1000 USDC to SAUCE"
"trade HBAR for USDC"

// Natural language variants
"I want to swap 100 HBAR to USDC"
"Can you exchange my SAUCE for HBAR?"
"Convert all my USDC to SAUCE"
"Use SaucerSwap to trade tokens"
```

### Token Detection

```javascript
// Supported tokens on Hedera
const SUPPORTED_TOKENS = {
  'HBAR': '0.0.0',           // Native HBAR
  'WHBAR': '0.0.1456986',    // Wrapped HBAR
  'USDC': '0.0.456858',      // USD Coin
  'USDT': '0.0.651855',      // Tether USD
  'SAUCE': '0.0.731861',     // SaucerSwap Token
  'DOVU': '0.0.723464',      // DOVU
  'GRELF': '0.0.2286568'     // GRELF
};
```

## 🚀 **API Integration**

### Using the `/api/agent/route` Endpoint

```bash
POST http://localhost:5001/api/agent/route
Content-Type: application/json

{
  "message": "swap 100 HBAR for USDC",
  "userId": "user_123",
  "agentId": "agent_456", 
  "execute": true
}
```

### Response Structure

```json
{
  "success": true,
  "data": {
    "type": "actions",
    "subtype": "swap", 
    "result": {
      "userMessage": "I'll execute your swap of 100 HBAR for USDC...",
      "actionPlan": {
        "action": "swap",
        "fromToken": "HBAR",
        "toToken": "USDC", 
        "amount": 100,
        "steps": [
          "Check token associations",
          "Calculate optimal route",
          "Execute swap transaction",
          "Confirm completion"
        ]
      },
      "execution": {
        "success": true,
        "transactionId": "0.0.12345@1234567890.123456789",
        "swapType": "exactInput",
        "actualAmount": "1420.50",
        "gasUsed": 285000
      }
    },
    "status": "completed"
  }
}
```

## 🔄 **Execution Flow**

### 1. **Message Classification**
```javascript
// Input: "swap 100 HBAR for USDC"
// Output: { type: 'actions', actionSubtype: 'swap', confidence: 0.9 }
```

### 2. **Swap Intent Parsing**
```javascript
// Extracted details:
{
  isSwap: true,
  fromToken: 'HBAR',
  toToken: 'USDC', 
  amount: 100,
  confidence: 0.9
}
```

### 3. **Agent Preparation**
```javascript
// Get agent's Hedera client
// Verify token associations
// Calculate slippage and routes
```

### 4. **Transaction Execution**
```javascript
// Prepare swap parameters
// Encode contract calls
// Execute on SaucerSwap V2
// Return transaction results
```

## 🛡️ **Safety Features**

### Slippage Protection
```javascript
// Default 0.5% slippage tolerance
const slippageMultiplier = (100 - slippageTolerance) / 100;
const minimumOutput = expectedOutput * slippageMultiplier;
```

### Token Association Validation
```javascript
// Automatic token association
await new TokenAssociateTransaction()
  .setAccountId(recipientAccount)
  .setTokenIds([outputTokenId])
  .execute(client);
```

### Gas Management
```javascript
// Optimized gas limits
const gasLimit = 300000; // Sufficient for most swaps
```

### Transaction Validation
```javascript
// Verify transaction success
const record = await response.getRecord(client);
const result = record.contractFunctionResult;
const actualAmount = result.getResult(['uint256'])[0];
```

## 📊 **Monitoring & Analytics**

### Transaction Tracking
```javascript
{
  transactionId: "0.0.12345@1234567890.123456789",
  swapType: "exactInput",
  inputToken: "HBAR",
  outputToken: "USDC", 
  actualAmount: "1420.50",
  gasUsed: 285000,
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Performance Metrics
```javascript
{
  executionTime: "2.5s",
  priceImpact: "0.12%",
  slippageUsed: "0.3%",
  routeOptimality: "optimal"
}
```

## 🧪 **Testing**

### Unit Tests Coverage
- ✅ Swap intent detection (9 test patterns)
- ✅ Token validation and mapping
- ✅ Amount parsing with decimals
- ✅ Slippage calculation
- ✅ Contract parameter encoding
- ✅ Error handling and fallbacks

### Integration Tests
- ✅ End-to-end message processing
- ✅ Agent Hedera client creation
- ✅ Token association checking
- ✅ Transaction simulation
- ✅ Response formatting

## 🚀 **Usage Examples**

### Basic Swap
```bash
# User says: "swap 100 HBAR for USDC"
# System executes: exactInput swap with 0.5% slippage
# Result: ~1420 USDC received
```

### Complex Swap with Custom Slippage
```bash
# User says: "exchange 1000 SAUCE to HBAR with 1% slippage"
# System executes: exactInput with 1% tolerance
# Result: Transaction with custom slippage protection
```

### Multi-Token Detection
```bash
# User says: "I want to convert all my USDC to SAUCE tokens"
# System detects: USDC → SAUCE swap intent
# Prompts for: Specific amount confirmation
```

## 🔮 **Future Enhancements**

### Advanced Features
1. **Multi-hop routing** for better prices
2. **Liquidity aggregation** across pools
3. **Price impact warnings** for large swaps
4. **MEV protection** strategies
5. **Limit order** functionality

### Integration Expansions
1. **Cross-chain swaps** via bridges
2. **Yield farming** integration
3. **Portfolio rebalancing** automation
4. **DCA (Dollar Cost Averaging)** strategies
5. **Arbitrage opportunities** detection

## 📞 **Support & Troubleshooting**

### Common Issues

**Issue**: Token not found
```javascript
// Solution: Check supported tokens list
const supportedTokens = saucerSwapService.getSupportedTokens();
```

**Issue**: Insufficient balance
```javascript
// Solution: Verify account balance before swap
const balance = await new AccountBalanceQuery()
  .setAccountId(accountId)
  .execute(client);
```

**Issue**: Slippage too high
```javascript
// Solution: Adjust slippage tolerance
const customSlippage = 1.0; // 1% instead of 0.5%
```

### Error Codes
- `SWAP_001`: Invalid token pair
- `SWAP_002`: Insufficient balance
- `SWAP_003`: Slippage exceeded
- `SWAP_004`: Transaction failed
- `SWAP_005`: Token association required

## 🎉 **Deployment Status**

### ✅ **Ready for Production**
- Core swap functionality implemented
- Natural language processing integrated
- Error handling and validation complete
- Transaction safety measures active
- Comprehensive testing passed

### 🔗 **Dependencies**
- `ethers` (v6+): Contract interaction
- `@hashgraph/sdk`: Hedera network integration
- `together-ai`: AI message classification (optional)

The SaucerSwap plugin is now fully integrated and ready for users to execute token swaps through natural language prompts via the `/api/agent/route` endpoint!