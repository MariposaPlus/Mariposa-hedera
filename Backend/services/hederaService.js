const { 
  Client, 
  AccountId, 
  PrivateKey, 
  AccountInfoQuery, 
  AccountBalanceQuery,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenAssociateTransaction,
  TransferTransaction,
  TokenInfoQuery,
  Hbar,
  HbarUnit
} = require('@hashgraph/sdk');

class HederaService {
  constructor() {
    this.client = null;
    this.operatorAccountId = null;
    this.operatorPrivateKey = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Hedera client with environment variables
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

      const network = process.env.HEDERA_NETWORK || 'testnet';
      const accountId = process.env.HEDERA_ACCOUNT_ID;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;

      if (!accountId || !privateKey) {
        throw new Error('Hedera account ID and private key must be provided in environment variables');
      }

      // Create client for the appropriate network
      if (network === 'mainnet') {
        this.client = Client.forMainnet();
      } else if (network === 'testnet') {
        this.client = Client.forTestnet();
      } else {
        throw new Error(`Unsupported network: ${network}`);
      }

      // Set operator account
      this.operatorAccountId = AccountId.fromString(accountId);
      this.operatorPrivateKey = PrivateKey.fromString(privateKey);
      
      this.client.setOperator(this.operatorAccountId, this.operatorPrivateKey);

      // Set default max transaction fee and query payment
      this.client.setDefaultMaxTransactionFee(new Hbar(100));
      this.client.setDefaultMaxQueryPayment(new Hbar(50));

      this.isInitialized = true;
      console.log(`✅ Hedera client initialized for ${network} network`);
      console.log(`🔑 Operator Account: ${accountId}`);

    } catch (error) {
      console.error('❌ Failed to initialize Hedera client:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   * @param {string} accountId - Account ID to query
   * @returns {Object} Account balance information
   */
  async getAccountBalance(accountId = null) {
    await this.initialize();
    
    try {
      const targetAccountId = accountId ? AccountId.fromString(accountId) : this.operatorAccountId;
      
      const balance = await new AccountBalanceQuery()
        .setAccountId(targetAccountId)
        .execute(this.client);

      return {
        accountId: targetAccountId.toString(),
        hbarBalance: balance.hbars.toTinybars().toString(),
        hbarBalanceFormatted: balance.hbars.toString(),
        tokens: balance.tokens ? Object.fromEntries(balance.tokens) : {}
      };
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }

  /**
   * Get account information
   * @param {string} accountId - Account ID to query
   * @returns {Object} Account information
   */
  async getAccountInfo(accountId = null) {
    await this.initialize();
    
    try {
      const targetAccountId = accountId ? AccountId.fromString(accountId) : this.operatorAccountId;
      
      const info = await new AccountInfoQuery()
        .setAccountId(targetAccountId)
        .execute(this.client);

      return {
        accountId: targetAccountId.toString(),
        balance: info.balance.toString(),
        key: info.key.toString(),
        isDeleted: info.isDeleted,
        proxyAccountId: info.proxyAccountId ? info.proxyAccountId.toString() : null,
        proxyReceived: info.proxyReceived.toString(),
        receiverSigRequired: info.isReceiverSignatureRequired,
        expirationTime: info.expirationTime ? info.expirationTime.toDate() : null
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }

  /**
   * Transfer HBAR between accounts
   * @param {string} toAccountId - Recipient account ID
   * @param {number} amount - Amount in HBAR
   * @returns {Object} Transaction result
   */
  async transferHbar(toAccountId, amount) {
    await this.initialize();
    
    try {
      const transaction = new TransferTransaction()
        .addHbarTransfer(this.operatorAccountId, new Hbar(-amount))
        .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount))
        .freezeWith(this.client);

      const signedTransaction = await transaction.sign(this.operatorPrivateKey);
      const txResponse = await signedTransaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      return {
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString(),
        from: this.operatorAccountId.toString(),
        to: toAccountId,
        amount: amount,
        unit: 'HBAR'
      };
    } catch (error) {
      console.error('Error transferring HBAR:', error);
      throw error;
    }
  }

  /**
   * Create a new token
   * @param {Object} tokenConfig - Token configuration
   * @returns {Object} Token creation result
   */
  async createToken(tokenConfig) {
    await this.initialize();
    
    try {
      const {
        name,
        symbol,
        decimals = 8,
        initialSupply = 1000000,
        tokenType = 'FUNGIBLE_COMMON',
        treasury = null
      } = tokenConfig;

      const treasuryAccountId = treasury ? AccountId.fromString(treasury) : this.operatorAccountId;
      const treasuryKey = this.operatorPrivateKey;

      const transaction = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setDecimals(decimals)
        .setInitialSupply(initialSupply)
        .setTokenType(tokenType === 'NFT' ? TokenType.NonFungibleUnique : TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTreasuryAccountId(treasuryAccountId)
        .setAdminKey(treasuryKey)
        .setSupplyKey(treasuryKey)
        .freezeWith(this.client);

      const signedTransaction = await transaction.sign(treasuryKey);
      const txResponse = await signedTransaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      return {
        transactionId: txResponse.transactionId.toString(),
        tokenId: receipt.tokenId.toString(),
        status: receipt.status.toString(),
        name,
        symbol,
        decimals,
        initialSupply,
        treasuryAccountId: treasuryAccountId.toString()
      };
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }

  /**
   * Get token information
   * @param {string} tokenId - Token ID to query
   * @returns {Object} Token information
   */
  async getTokenInfo(tokenId) {
    await this.initialize();
    
    try {
      const info = await new TokenInfoQuery()
        .setTokenId(tokenId)
        .execute(this.client);

      return {
        tokenId: info.tokenId.toString(),
        name: info.name,
        symbol: info.symbol,
        decimals: info.decimals,
        totalSupply: info.totalSupply.toString(),
        treasuryAccountId: info.treasuryAccountId.toString(),
        adminKey: info.adminKey ? info.adminKey.toString() : null,
        supplyKey: info.supplyKey ? info.supplyKey.toString() : null,
        freezeKey: info.freezeKey ? info.freezeKey.toString() : null,
        wipeKey: info.wipeKey ? info.wipeKey.toString() : null,
        kycKey: info.kycKey ? info.kycKey.toString() : null,
        isDeleted: info.isDeleted,
        defaultFreezeStatus: info.defaultFreezeStatus ? info.defaultFreezeStatus.toString() : null,
        defaultKycStatus: info.defaultKycStatus ? info.defaultKycStatus.toString() : null,
        tokenType: info.tokenType.toString(),
        supplyType: info.supplyType.toString(),
        maxSupply: info.maxSupply ? info.maxSupply.toString() : null,
        expirationTime: info.expirationTime ? info.expirationTime.toDate() : null,
        autoRenewAccountId: info.autoRenewAccountId ? info.autoRenewAccountId.toString() : null,
        autoRenewPeriod: info.autoRenewPeriod ? info.autoRenewPeriod.seconds.toString() : null
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw error;
    }
  }

  /**
   * Associate token with account
   * @param {string} accountId - Account to associate token with
   * @param {string} tokenId - Token to associate
   * @param {string} accountPrivateKey - Private key of the account
   * @returns {Object} Transaction result
   */
  async associateToken(accountId, tokenId, accountPrivateKey) {
    await this.initialize();
    
    try {
      const transaction = new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(accountId))
        .setTokenIds([tokenId])
        .freezeWith(this.client);

      const signedTransaction = await transaction.sign(PrivateKey.fromString(accountPrivateKey));
      const txResponse = await signedTransaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      return {
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString(),
        accountId,
        tokenId
      };
    } catch (error) {
      console.error('Error associating token:', error);
      throw error;
    }
  }

  /**
   * Check if client is initialized
   * @returns {boolean} Initialization status
   */
  isClientInitialized() {
    return this.isInitialized;
  }

  /**
   * Get current network
   * @returns {string} Current network name
   */
  getCurrentNetwork() {
    return process.env.HEDERA_NETWORK || 'testnet';
  }

  /**
   * Get operator account info
   * @returns {Object} Operator account information
   */
  getOperatorInfo() {
    return {
      accountId: this.operatorAccountId ? this.operatorAccountId.toString() : null,
      network: this.getCurrentNetwork(),
      isInitialized: this.isInitialized
    };
  }
}

// Export singleton instance
const hederaService = new HederaService();
module.exports = hederaService;