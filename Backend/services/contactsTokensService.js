const fs = require('fs');
const path = require('path');

class ContactsTokensService {
  constructor() {
    this.contactsPath = path.join(__dirname, '../config/contacts.json');
    this.tokensPath = path.join(__dirname, '../config/tokens.json');
    this.testnetSwapTokensPath = path.join(__dirname, '../config/tokenstestnetSwap.json');
    this.contacts = this.loadContacts();
    this.tokens = this.loadTokens();
    this.testnetSwapTokens = this.loadTestnetSwapTokens();
  }

  /**
   * Load contacts from JSON file
   */
  loadContacts() {
    try {
      const data = fs.readFileSync(this.contactsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
      return { contacts: {}, metadata: {} };
    }
  }

  /**
   * Load tokens from JSON file
   */
  loadTokens() {
    try {
      const data = fs.readFileSync(this.tokensPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading tokens:', error);
      return { tokens: {}, aliases: {}, metadata: {} };
    }
  }

  /**
   * Load testnet swap tokens from JSON file
   */
  loadTestnetSwapTokens() {
    try {
      const data = fs.readFileSync(this.testnetSwapTokensPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading testnet swap tokens:', error);
      return [];
    }
  }

  /**
   * Save contacts to JSON file
   */
  saveContacts() {
    try {
      this.contacts.metadata.lastUpdated = new Date().toISOString();
      this.contacts.metadata.totalContacts = Object.keys(this.contacts.contacts).length;
      fs.writeFileSync(this.contactsPath, JSON.stringify(this.contacts, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving contacts:', error);
      return false;
    }
  }

  /**
   * Save tokens to JSON file
   */
  saveTokens() {
    try {
      this.tokens.metadata.lastUpdated = new Date().toISOString();
      this.tokens.metadata.totalTokens = Object.keys(this.tokens.tokens).length;
      fs.writeFileSync(this.tokensPath, JSON.stringify(this.tokens, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving tokens:', error);
      return false;
    }
  }

  /**
   * Get list of supported swap tokens
   * @returns {Array} Array of supported swap token symbols and names
   */
  getSupportedSwapTokens() {
    if (!Array.isArray(this.testnetSwapTokens)) {
      return [];
    }
    
    return this.testnetSwapTokens
      .filter(token => token.symbol && token.name)
      .map(token => ({
        symbol: token.symbol,
        name: token.name,
        id: token.id
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /**
   * Get formatted list of supported swap token symbols
   * @returns {string} Comma-separated list of token symbols
   */
  getSupportedSwapTokensList() {
    const tokens = this.getSupportedSwapTokens();
    return tokens.map(t => t.symbol).join(', ');
  }

  /**
   * Validate if tokens are supported for swap operations
   * @param {string} fromToken - Source token symbol
   * @param {string} toToken - Destination token symbol
   * @returns {Object} Validation result with supported status and error messages
   */
  validateSwapTokens(fromToken, toToken) {
    const result = {
      isValid: true,
      warnings: [],
      recommendations: []
    };

    const supportedTokens = this.getSupportedSwapTokens();
    const supportedSymbols = supportedTokens.map(t => t.symbol.toUpperCase());
    
    const fromTokenUpper = fromToken ? fromToken.toUpperCase() : '';
    const toTokenUpper = toToken ? toToken.toUpperCase() : '';

    // Check if fromToken is supported
    if (fromToken && !supportedSymbols.includes(fromTokenUpper)) {
      result.isValid = false;
      result.warnings.push(`${fromToken} is not a supported token for swaps on SaucerSwap testnet.`);
    }

    // Check if toToken is supported
    if (toToken && !supportedSymbols.includes(toTokenUpper)) {
      result.isValid = false;
      result.warnings.push(`${toToken} is not a supported token for swaps on SaucerSwap testnet.`);
    }

    // Add recommendations if there are issues
    if (!result.isValid) {
      const topSupportedTokens = supportedTokens
        .slice(0, 10) // Get top 10 tokens
        .map(t => t.symbol)
        .join(', ');
      
      result.recommendations.push(
        `Please choose from the supported tokens: ${topSupportedTokens}. For a complete list, check the testnet swap documentation.`
      );
    }

    return result;
  }

  // ===================== CONTACTS METHODS =====================

  /**
   * Find contact by name (case-insensitive)
   */
  findContact(nameOrAddress) {
    if (!nameOrAddress) return null;

    const query = nameOrAddress.toLowerCase().trim();
    
    // First check if it's already an address format (0.0.xxxxx)
    if (/^0\.0\.\d+$/.test(nameOrAddress)) {
      // Look for contact with this address
      for (const [key, contact] of Object.entries(this.contacts.contacts)) {
        if (contact.address === nameOrAddress) {
          return { key, ...contact };
        }
      }
      // If not found in contacts, return as valid address
      return {
        key: nameOrAddress,
        name: nameOrAddress,
        address: nameOrAddress,
        type: 'address',
        category: 'unknown'
      };
    }

    // Search by name/key
    for (const [key, contact] of Object.entries(this.contacts.contacts)) {
      if (key.toLowerCase() === query || 
          contact.name.toLowerCase() === query ||
          contact.name.toLowerCase().includes(query)) {
        return { key, ...contact };
      }
    }

    return null;
  }

  /**
   * Get all contacts
   */
  getAllContacts() {
    return this.contacts.contacts;
  }

  /**
   * Add new contact
   */
  addContact(key, contactData) {
    try {
      this.contacts.contacts[key.toLowerCase()] = {
        name: contactData.name,
        address: contactData.address,
        type: contactData.type || 'friend',
        category: contactData.category || 'personal'
      };
      return this.saveContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      return false;
    }
  }

  /**
   * Update existing contact
   */
  updateContact(key, contactData) {
    try {
      const lowerKey = key.toLowerCase();
      if (this.contacts.contacts[lowerKey]) {
        this.contacts.contacts[lowerKey] = {
          ...this.contacts.contacts[lowerKey],
          ...contactData
        };
        return this.saveContacts();
      }
      return false;
    } catch (error) {
      console.error('Error updating contact:', error);
      return false;
    }
  }

  /**
   * Delete contact
   */
  deleteContact(key) {
    try {
      const lowerKey = key.toLowerCase();
      if (this.contacts.contacts[lowerKey]) {
        delete this.contacts.contacts[lowerKey];
        return this.saveContacts();
      }
      return false;
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  }

  // ===================== TOKENS METHODS =====================

  /**
   * Find token by name, symbol, or address (case-insensitive)
   * @param {string} nameOrSymbolOrId - Token name, symbol, or ID to search for
   * @param {boolean} forSwap - Whether this is for swap operations (uses testnet swap tokens)
   */
  findToken(nameOrSymbolOrId, forSwap = false) {
    if (!nameOrSymbolOrId) return null;

    const query = nameOrSymbolOrId.toLowerCase().trim();
    
    // Special handling for HBAR in swap operations
    if (forSwap && (query === 'hbar' || query === 'whbar')) {
      console.log(`🔄 Special HBAR handling for swap operation: ${query}`);
    }
    
    // Select the appropriate token source
    const tokensSource = forSwap ? this.testnetSwapTokens : this.tokens;
    
    // First check if it's already a token ID format (0.0.xxxxx)
    if (/^0\.0\.\d+$/.test(nameOrSymbolOrId)) {
      // Handle both array format and object format for tokens
      let tokensList = [];
      if (Array.isArray(tokensSource)) {
        tokensList = tokensSource;
      } else if (tokensSource && tokensSource.tokens) {
        tokensList = Object.values(tokensSource.tokens);
      }
      
      // Look for token with this ID
      const token = tokensList.find(t => t.id === nameOrSymbolOrId);
      if (token) {
        return { symbol: token.symbol, ...token };
      }
      
      // If not found in known tokens, return as unknown token
      return {
        symbol: nameOrSymbolOrId,
        name: `Token ${nameOrSymbolOrId}`,
        id: nameOrSymbolOrId,
        evmAddress: this.hederaIdToEvmAddress(nameOrSymbolOrId),
        decimals: 8, // default
        type: 'unknown',
        category: 'unknown'
      };
    }

    // Handle both array format and object format for tokens
    let tokensList = [];
    if (Array.isArray(tokensSource)) {
      tokensList = tokensSource;
      if (forSwap) {
        console.log(`📊 Testnet swap tokens loaded: ${tokensList.length} tokens available`);
        // Log a few sample tokens for debugging
        const samples = tokensList.slice(0, 5).map(t => `${t.symbol || 'NO_SYMBOL'} (${t.id || 'NO_ID'})`);
        console.log(`🔍 Sample tokens: ${samples.join(', ')}`);
      }
    } else if (tokensSource && tokensSource.tokens) {
      tokensList = Object.values(tokensSource.tokens);
    } else {
      console.warn('Tokens data is not in expected format:', typeof tokensSource, forSwap ? '(testnet swap tokens)' : '(regular tokens)');
      return null;
    }

    // Check aliases first (if they exist in object format and not using swap tokens)
    if (!forSwap && tokensSource.aliases && tokensSource.aliases[query]) {
      const symbol = tokensSource.aliases[query];
      const token = tokensList.find(t => t.symbol && t.symbol.toLowerCase() === symbol.toLowerCase());
      if (token) {
        return { symbol: token.symbol, ...token };
      }
    }

    // Search by symbol (exact match)
    const queryUpper = query.toUpperCase();
    let token = tokensList.find(t => t.symbol && t.symbol.toUpperCase() === queryUpper);
    if (token) {
      return { symbol: token.symbol, ...token };
    }

    // Search by name (exact match)
    token = tokensList.find(t => t.name && t.name.toLowerCase() === query);
    if (token) {
      return { symbol: token.symbol, ...token };
    }

    // Search by name (partial match)
    token = tokensList.find(t => t.name && t.name.toLowerCase().includes(query));
    if (token) {
      return { symbol: token.symbol, ...token };
    }

    return null;
  }

  /**
   * Get all tokens
   */
  getAllTokens(forSwap = true) {
    if (forSwap && Array.isArray(this.testnetSwapTokens)) {
      // Return testnet swap tokens in a format similar to regular tokens
      const tokensMap = {};
      this.testnetSwapTokens.forEach(token => {
        if (token.symbol && token.id) {
          tokensMap[token.symbol] = {
            name: token.name,
            symbol: token.symbol,
            id: token.id,
            decimals: token.decimals,
            category: token.category || 'unknown',
            type: 'token'
          };
        }
      });
      return tokensMap;
    }
    return this.tokens.tokens;
  }

  /**
   * Get all token aliases
   */
  getTokenAliases() {
    return this.tokens.aliases;
  }

  /**
   * Add new token
   */
  addToken(symbol, tokenData) {
    try {
      this.tokens.tokens[symbol.toUpperCase()] = {
        name: tokenData.name,
        symbol: symbol.toUpperCase(),
        id: tokenData.id,
        evmAddress: tokenData.evmAddress || this.hederaIdToEvmAddress(tokenData.id),
        decimals: tokenData.decimals || 8,
        type: tokenData.type || 'utility',
        category: tokenData.category || 'other'
      };
      return this.saveTokens();
    } catch (error) {
      console.error('Error adding token:', error);
      return false;
    }
  }

  /**
   * Update existing token
   */
  updateToken(symbol, tokenData) {
    try {
      const upperSymbol = symbol.toUpperCase();
      if (this.tokens.tokens[upperSymbol]) {
        this.tokens.tokens[upperSymbol] = {
          ...this.tokens.tokens[upperSymbol],
          ...tokenData
        };
        return this.saveTokens();
      }
      return false;
    } catch (error) {
      console.error('Error updating token:', error);
      return false;
    }
  }

  /**
   * Add token alias
   */
  addTokenAlias(alias, symbol) {
    try {
      this.tokens.aliases[alias.toLowerCase()] = symbol.toUpperCase();
      return this.saveTokens();
    } catch (error) {
      console.error('Error adding token alias:', error);
      return false;
    }
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Convert Hedera token ID to EVM address
   */
  hederaIdToEvmAddress(tokenId) {
    try {
      const parts = tokenId.split('.');
      if (parts.length !== 3 || parts[0] !== '0' || parts[1] !== '0') {
        throw new Error(`Invalid Hedera token ID format: ${tokenId}`);
      }
      
      const tokenNumber = parseInt(parts[2]);
      return '0x' + tokenNumber.toString(16).padStart(40, '0');
    } catch (error) {
      console.error('Error converting Hedera ID to EVM address:', error);
      return null;
    }
  }

  /**
   * Validate action arguments and return missing ones
   */
  validateActionArguments(actionType, args) {
    const requiredArgs = this.getRequiredArguments(actionType);
    const missing = [];
    const resolved = {};

    for (const argName of requiredArgs) {
      if (!args[argName] || args[argName] === '' || args[argName] === null) {
        missing.push(argName);
      } else {
        // Try to resolve contacts/tokens
        if (argName === 'recipient' || argName === 'to') {
          const contact = this.findContact(args[argName]);
          if (contact) {
            resolved[argName] = contact.address;
            resolved[argName + '_resolved'] = contact;
          } else {
            missing.push(argName);
          }
        } else if (argName === 'fromToken' || argName === 'toToken' || argName === 'inputToken' || argName === 'outputToken') {
          // Use testnet swap tokens for swap operations
          const isSwapToken = actionType === 'swap' || argName.includes('Token');
          console.log(`🔍 Looking for token: "${args[argName]}" (${argName}) in ${isSwapToken ? 'testnet swap tokens' : 'regular tokens'}`);
          const token = this.findToken(args[argName], isSwapToken);
          if (token) {
            console.log(`✅ Found token: ${token.symbol} (${token.id})`);
            resolved[argName] = token.symbol;
            resolved[argName + '_resolved'] = token;
          } else {
            console.log(`❌ Token not found: "${args[argName]}" - adding to missing list`);
            missing.push(argName);
          }
        } else {
          resolved[argName] = args[argName];
        }
      }
    }

    return {
      isValid: missing.length === 0,
      missing,
      resolved,
      requiredArgs
    };
  }

  /**
   * Get required arguments for each action type
   */
  getRequiredArguments(actionType) {
    const actionRequirements = {
      'transfer': ['recipient', 'amount'],
      'transferToken': ['recipient', 'tokenId', 'amount'],
      'swap': ['fromToken', 'toToken', 'amount'],
      'createAgent': ['name', 'description'],
      'deployContract': ['contractName', 'constructorArgs'],
      'associateToken': ['tokenId'],
      'createTopic': ['memo'],
      'sendMessage': ['topicId', 'message']
    };

    return actionRequirements[actionType] || [];
  }

  /**
   * Get possible values for combo boxes
   */
  getComboboxOptions(argName, forSwap = true) {
    switch (argName) {
      case 'recipient':
      case 'to':
        return Object.entries(this.contacts.contacts).map(([key, contact]) => ({
          value: contact.address,
          label: `${contact.name} (${contact.address})`,
          category: contact.category
        }));
      
      case 'fromToken':
      case 'toToken':
      case 'inputToken':
      case 'outputToken':
      case 'tokenId':
        // Use testnet swap tokens for swap-related operations
        const tokensSource = forSwap ? this.testnetSwapTokens : this.tokens;
        
        if (forSwap && Array.isArray(tokensSource)) {
          // Handle testnet swap tokens (array format)
          return tokensSource.map(token => ({
            value: token.id,
            label: `${token.name} (${token.symbol})`,
            category: token.category || 'unknown',
            symbol: token.symbol
          })).filter(token => token.symbol && token.id); // Filter out invalid entries
        } else if (tokensSource && tokensSource.tokens) {
          // Handle regular tokens (object format)
          return Object.entries(tokensSource.tokens).map(([symbol, token]) => ({
            value: token.id,
            label: `${token.name} (${symbol})`,
            category: token.category,
            symbol: symbol
          }));
        }
        
        return [];
      
      default:
        return [];
    }
  }

  /**
   * Get contacts by category
   */
  getContactsByCategory() {
    const categories = {};
    Object.entries(this.contacts.contacts).forEach(([key, contact]) => {
      if (!categories[contact.category]) {
        categories[contact.category] = [];
      }
      categories[contact.category].push({ key, ...contact });
    });
    return categories;
  }

  /**
   * Get tokens by category
   */
  getTokensByCategory(forSwap = true) {
    const categories = {};
    
    if (forSwap && Array.isArray(this.testnetSwapTokens)) {
      // Use testnet swap tokens
      this.testnetSwapTokens.forEach(token => {
        if (token.symbol && token.id) {
          const category = token.category || 'unknown';
          if (!categories[category]) {
            categories[category] = [];
          }
          categories[category].push({ 
            symbol: token.symbol, 
            name: token.name,
            id: token.id,
            decimals: token.decimals,
            category: category,
            type: 'token'
          });
        }
      });
    } else {
      // Use regular tokens
      Object.entries(this.tokens.tokens).forEach(([symbol, token]) => {
        if (!categories[token.category]) {
          categories[token.category] = [];
        }
        categories[token.category].push({ symbol, ...token });
      });
    }
    
    return categories;
  }
}

module.exports = ContactsTokensService;
