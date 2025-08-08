const { ethers } = require("hardhat");

/**
 * Fetches current gas fee data from Sei network
 * @param {ethers.providers.Provider} provider - The ethers provider
 * @returns {Object} Gas fee data with maxFeePerGas and maxPriorityFeePerGas
 */
async function fetchGasFees(provider) {
  try {
    // Get current gas price using ethers v6 API
    const feeData = await provider.getFeeData();
    console.log("Fee Data from network:");
    console.log("- Gas Price:", feeData.gasPrice?.toString() || "null");
    console.log("- Max Fee Per Gas:", feeData.maxFeePerGas?.toString() || "null");
    console.log("- Max Priority Fee Per Gas:", feeData.maxPriorityFeePerGas?.toString() || "null");

    // Try to get fee history for more detailed EIP-1559 style fees
    try {
      const feeHistory = await provider.send("eth_feeHistory", [
        "0x1", // 1 block
        "latest", // latest block
        [50] // 50th percentile
      ]);

      if (feeHistory && feeHistory.baseFeePerGas && feeHistory.baseFeePerGas.length > 0) {
        const baseFee = BigInt(feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1]);
        const maxPriorityFeePerGas = feeHistory.reward && feeHistory.reward[0] && feeHistory.reward[0][0] 
          ? BigInt(feeHistory.reward[0][0]) 
          : BigInt(0);
        
        const maxFeePerGas = baseFee + maxPriorityFeePerGas;

        console.log("Fee History Data:");
        console.log("- Base Fee:", baseFee.toString());
        console.log("- Max Priority Fee from history:", maxPriorityFeePerGas.toString());
        console.log("- Max Fee calculated:", maxFeePerGas.toString());

        return {
          maxFeePerGas: "0x" + maxFeePerGas.toString(16),
          maxPriorityFeePerGas: "0x" + maxPriorityFeePerGas.toString(16),
          gasPrice: feeData.gasPrice || 0
        };
      }
    } catch (feeHistoryError) {
      console.log("Fee history not available:", feeHistoryError.message);
    }

    // Use feeData from provider
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      console.log("Using EIP-1559 fees from provider");
      return {
        maxFeePerGas: "0x" + feeData.maxFeePerGas.toString(16),
        maxPriorityFeePerGas: "0x" + feeData.maxPriorityFeePerGas.toString(16),
        gasPrice: feeData.gasPrice || 0
      };
    }

    // Fallback to legacy gas price method
    if (feeData.gasPrice) {
      if (feeData.gasPrice === 0n) {
        console.log("Network returns 0 gas price, using Sei-specific settings");
        return {
          maxFeePerGas: "0x0",
          maxPriorityFeePerGas: "0x0",
          gasPrice: 0
        };
      } else {
        console.log("Using legacy gas price");
        return {
          maxFeePerGas: "0x" + feeData.gasPrice.toString(16),
          maxPriorityFeePerGas: "0x0",
          gasPrice: feeData.gasPrice
        };
      }
    }

    // Ultimate fallback
    console.log("No fee data available, using Sei defaults");
    return {
      maxFeePerGas: "0x0",
      maxPriorityFeePerGas: "0x0",
      gasPrice: 0
    };

  } catch (error) {
    console.warn("Error fetching gas fees:", error.message);
    console.log("Falling back to Sei default values");
    
    // Fallback to Sei defaults
    return {
      maxFeePerGas: "0x0",
      maxPriorityFeePerGas: "0x0",
      gasPrice: 0
    };
  }
}

/**
 * Gets gas configuration object for transactions
 * @param {ethers.providers.Provider} provider - The ethers provider
 * @param {number} gasLimit - The gas limit for the transaction
 * @returns {Object} Gas configuration object
 */
async function getGasConfig(provider, gasLimit = 300000) {
  const fees = await fetchGasFees(provider);
  
  const config = {
    gasLimit: gasLimit
  };

  // Use EIP-1559 style fees if available and non-zero
  if (fees.maxFeePerGas !== "0x0" || fees.maxPriorityFeePerGas !== "0x0") {
    config.maxFeePerGas = fees.maxFeePerGas;
    config.maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
  } else {
    // Use legacy gas price for Sei
    config.gasPrice = fees.gasPrice;
  }

  console.log("Gas configuration:", config);
  return config;
}

/**
 * Enhanced gas estimation with Sei-specific optimizations
 * @param {ethers.Contract} contract - The contract instance
 * @param {string} method - The method name
 * @param {Array} params - The method parameters
 * @param {Object} overrides - Transaction overrides
 * @returns {Object} Enhanced gas configuration
 */
async function estimateGasWithFees(contract, method, params = [], overrides = {}) {
  try {
    // Estimate gas for the specific method
    const estimatedGas = await contract[method].estimateGas(...params, overrides);
    const gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer
    
    console.log(`Gas estimation for ${method}:`);
    console.log("- Estimated:", estimatedGas.toString());
    console.log("- With buffer:", gasLimit.toString());

    // Get current fees
    const fees = await fetchGasFees(contract.runner.provider);
    
    const config = {
      gasLimit: gasLimit,
      ...overrides
    };

    // Apply fee configuration
    if (fees.maxFeePerGas !== "0x0" || fees.maxPriorityFeePerGas !== "0x0") {
      config.maxFeePerGas = fees.maxFeePerGas;
      config.maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
    } else {
      config.gasPrice = fees.gasPrice;
    }

    return config;
  } catch (error) {
    console.warn("Gas estimation failed:", error.message);
    return await getGasConfig(contract.runner.provider, 500000); // Fallback with higher limit
  }
}

module.exports = {
  fetchGasFees,
  getGasConfig,
  estimateGasWithFees
}; 