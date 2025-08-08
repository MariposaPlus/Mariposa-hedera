require("dotenv").config();
const { Client, PrivateKey, AccountCreateTransaction, Hbar } = require('@hashgraph/sdk');
const crypto = require('crypto');

class HederaWalletService {
  constructor() {
    this.operatorClient = null;
    this.initialized = false;
  }

  /**
   * Initialize the operator client using environment variables
   */
  async initializeOperatorClient() {
    if (this.initialized) {
      return this.operatorClient;
    }

    try {
      const network = process.env.HEDERA_NETWORK || 'testnet';
      const operatorAccountId = process.env.HEDERA_ACCOUNT_ID;
      const operatorPrivateKey = process.env.HEDERA_PRIVATE_KEY;

      if (!operatorAccountId || !operatorPrivateKey) {
        throw new Error('Operator credentials not found in environment variables');
      }

      // Create client for the appropriate network
      if (network === 'mainnet') {
        this.operatorClient = Client.forMainnet();
      } else if (network === 'testnet') {
        this.operatorClient = Client.forTestnet();
      } else {
        throw new Error(`Unsupported network: ${network}`);
      }

      // Set operator account
      this.operatorClient.setOperator(operatorAccountId, operatorPrivateKey);
      
      // Set default fees
      this.operatorClient.setDefaultMaxTransactionFee(new Hbar(100));
      this.operatorClient.setDefaultMaxQueryPayment(new Hbar(50));

      this.initialized = true;
      console.log(`✅ Hedera operator client initialized for ${network} network`);
      console.log(`🔑 Operator Account: ${operatorAccountId}`);

      return this.operatorClient;
    } catch (error) {
      console.error('❌ Failed to initialize Hedera operator client:', error);
      throw error;
    }
  }

  /**
   * Generate a new ECDSA key pair
   * @returns {Object} Generated key pair with private and public keys
   */
  generateNewKeyPair() {
    try {
      const privateKey = PrivateKey.generateECDSA();
      const publicKey = privateKey.publicKey;

      return {
        privateKey: privateKey.toStringDer(),
        publicKey: publicKey.toStringDer(),
        privateKeyRaw: privateKey.toStringRaw(),
        publicKeyRaw: publicKey.toStringRaw()
      };
    } catch (error) {
      console.error('❌ Failed to generate key pair:', error);
      throw error;
    }
  }

  /**
   * Create a new Hedera account
   * @param {Object} options - Account creation options
   * @returns {Object} Created account information
   */
  async createNewAccount(options = {}) {
    try {
      await this.initializeOperatorClient();

      const {
        initialBalance = 10, // HBAR
        memo = 'Agent account created by Hedera Wallet Service'
      } = options;

      // Generate new key pair for the account
      const keyPair = this.generateNewKeyPair();
      const privateKey = PrivateKey.fromStringDer(keyPair.privateKey);
      const publicKey = privateKey.publicKey;

      console.log('🔑 Generated new key pair for account');
      console.log(`📋 Public Key: ${publicKey.toStringDer()}`);

      // Create the account
      const createAccountTx = new AccountCreateTransaction()
        .setKey(publicKey)
        .setInitialBalance(Hbar.fromString(`${initialBalance}`))
        .setAccountMemo(memo)
        .freezeWith(this.operatorClient);

      // Sign and submit the transaction
      const createAccountTxResponse = await createAccountTx.execute(this.operatorClient);
      const createAccountReceipt = await createAccountTxResponse.getReceipt(this.operatorClient);
      const newAccountId = createAccountReceipt.accountId;

      console.log(`✅ New account created: ${newAccountId.toString()}`);
      console.log(`💰 Initial balance: ${initialBalance} HBAR`);

      return {
        accountId: newAccountId.toString(),
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        privateKeyRaw: keyPair.privateKeyRaw,
        publicKeyRaw: keyPair.publicKeyRaw,
        initialBalance,
        transactionId: createAccountTxResponse.transactionId.toString(),
        memo
      };

    } catch (error) {
      console.error('❌ Failed to create new account:', error);
      throw error;
    }
  }

  /**
   * Create multiple accounts in batch
   * @param {number} count - Number of accounts to create
   * @param {Object} options - Account creation options
   * @returns {Array} Array of created account information
   */
  async createMultipleAccounts(count, options = {}) {
    try {
      const accounts = [];
      console.log(`🔄 Creating ${count} new Hedera accounts...`);

      for (let i = 0; i < count; i++) {
        console.log(`Creating account ${i + 1}/${count}...`);
        const accountOptions = {
          ...options,
          memo: `${options.memo || 'Batch created account'} #${i + 1}`
        };
        
        const account = await this.createNewAccount(accountOptions);
        accounts.push(account);
        
        // Add small delay to avoid rate limiting
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ Successfully created ${count} accounts`);
      return accounts;

    } catch (error) {
      console.error('❌ Failed to create multiple accounts:', error);
      throw error;
    }
  }

  /**
   * Get operator account information
   * @returns {Object} Operator account details
   */
  getOperatorAccountInfo() {
    return {
      accountId: process.env.HEDERA_ACCOUNT_ID,
      network: process.env.HEDERA_NETWORK || 'testnet',
      hasPrivateKey: !!process.env.HEDERA_PRIVATE_KEY,
      isInitialized: this.initialized
    };
  }

  /**
   * Encrypt private key for storage
   * @param {string} privateKey - Private key to encrypt
   * @param {string} encryptionKey - Encryption key (optional, uses env var)
   * @returns {string} Encrypted private key (format: iv:encrypted)
   */
  encryptPrivateKey(privateKey, encryptionKey = null) {
    try {
      const key = encryptionKey || process.env.WALLET_ENCRYPTION_KEY || 'default-encryption-key';
      
      // Create a 32-byte key from the password using SHA-256
      const keyBuffer = crypto.createHash('sha256').update(key).digest();
      
      // Generate random IV (16 bytes for CBC)
      const iv = crypto.randomBytes(16);
      
      // Create cipher using the correct modern API
      const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
      
      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return format: iv:encrypted
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('❌ Failed to encrypt private key:', error);
      throw error;
    }
  }

  /**
   * Decrypt private key for use
   * @param {string} encryptedPrivateKey - Encrypted private key (format: iv:encrypted)
   * @param {string} encryptionKey - Encryption key (optional, uses env var)
   * @returns {string} Decrypted private key
   */
  decryptPrivateKey(encryptedPrivateKey, encryptionKey = null) {
    try {
      const key = encryptionKey || process.env.WALLET_ENCRYPTION_KEY || 'default-encryption-key';
      
      // Create a 32-byte key from the password using SHA-256
      const keyBuffer = crypto.createHash('sha256').update(key).digest();
      
      // Split the encrypted data
      const parts = encryptedPrivateKey.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted private key format. Expected format: iv:encrypted');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Create decipher using the correct modern API
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Failed to decrypt private key:', error);
      throw error;
    }
  }

  /**
   * Validate Hedera account credentials
   * @param {string} accountId - Account ID to validate
   * @param {string} privateKey - Private key to validate
   * @returns {boolean} True if credentials are valid
   */
  async validateCredentials(accountId, privateKey) {
    try {
      const testClient = Client.forTestnet().setOperator(accountId, privateKey);
      
      // Try to get account info to validate credentials
      const { AccountInfoQuery } = require('@hashgraph/sdk');
      await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(testClient);

      console.log(`✅ Credentials validated for account: ${accountId}`);
      return true;
    } catch (error) {
      console.error(`❌ Invalid credentials for account: ${accountId}`, error.message);
      return false;
    }
  }

  /**
   * Fund an account from operator account
   * @param {string} targetAccountId - Account to fund
   * @param {number} amount - Amount in HBAR to transfer
   * @returns {Object} Transfer result
   */
  async fundAccount(targetAccountId, amount) {
    try {
      await this.initializeOperatorClient();

      const { TransferTransaction, AccountId } = require('@hashgraph/sdk');
      
      const transferTx = new TransferTransaction()
        .addHbarTransfer(process.env.HEDERA_ACCOUNT_ID, new Hbar(-amount))
        .addHbarTransfer(AccountId.fromString(targetAccountId), new Hbar(amount))
        .freezeWith(this.operatorClient);

      const transferResponse = await transferTx.execute(this.operatorClient);
      const transferReceipt = await transferResponse.getReceipt(this.operatorClient);

      console.log(`✅ Funded account ${targetAccountId} with ${amount} HBAR`);

      return {
        success: true,
        transactionId: transferResponse.transactionId.toString(),
        status: transferReceipt.status.toString(),
        fromAccount: process.env.HEDERA_ACCOUNT_ID,
        toAccount: targetAccountId,
        amount,
        unit: 'HBAR'
      };

    } catch (error) {
      console.error('❌ Failed to fund account:', error);
      throw error;
    }
  }
}

// Export singleton instance
const hederaWalletService = new HederaWalletService();
module.exports = hederaWalletService;