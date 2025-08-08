const hederaWalletService = require('../services/hederaWalletService');
const AgentModel = require('../models/Agent');

class AgentHederaUtils {
  /**
   * Assign Hedera credentials to an agent
   * @param {string} agentId - Agent MongoDB ID
   * @param {Object} options - Credential assignment options
   * @returns {Object} Assignment result
   */
  async assignHederaCredentials(agentId, options = {}) {
    try {
      const {
        useOperatorCredentials = false,
        createNewAccount = true,
        initialBalance = 10,
        encryptPrivateKey = true
      } = options;

      // Find the agent
      const agent = await AgentModel.findById(agentId).select('+hederaPrivateKey');
      if (!agent) {
        throw new Error('Agent not found');
      }

      let hederaCredentials;

      if (useOperatorCredentials) {
        // Use operator credentials from environment
        console.log('🔑 Assigning operator credentials to agent...');
        hederaCredentials = {
          accountId: process.env.HEDERA_ACCOUNT_ID,
          privateKey: process.env.HEDERA_PRIVATE_KEY,
          publicKey: process.env.HEDERA_PUBLIC_KEY || 'Not provided in env',
          isOperator: true
        };
      } else if (createNewAccount) {
        // Create new Hedera account
        console.log('🆕 Creating new Hedera account for agent...');
        const newAccount = await hederaWalletService.createNewAccount({
          initialBalance,
          memo: `Account for agent: ${agent.name} (${agent.agentUuid})`
        });

        hederaCredentials = {
          accountId: newAccount.accountId,
          privateKey: newAccount.privateKey,
          publicKey: newAccount.publicKey,
          transactionId: newAccount.transactionId,
          initialBalance: newAccount.initialBalance,
          isOperator: false
        };
      } else {
        throw new Error('Either useOperatorCredentials or createNewAccount must be true');
      }

      // Encrypt private key if requested
      let privateKeyToStore = hederaCredentials.privateKey;
      if (encryptPrivateKey && !useOperatorCredentials) {
        privateKeyToStore = hederaWalletService.encryptPrivateKey(hederaCredentials.privateKey);
        console.log('🔒 Private key encrypted for storage');
      }

      // Update agent with Hedera credentials
      agent.hederaAccountId = hederaCredentials.accountId;
      agent.hederaPrivateKey = privateKeyToStore;
      agent.hederaPublicKey = hederaCredentials.publicKey;

      // Add metadata if available
      if (hederaCredentials.transactionId) {
        agent.hederaAccountCreationTx = hederaCredentials.transactionId;
      }

      await agent.save();

      console.log(`✅ Hedera credentials assigned to agent: ${agent.name}`);
      console.log(`🏦 Account ID: ${hederaCredentials.accountId}`);
      console.log(`🔑 Public Key: ${hederaCredentials.publicKey.substring(0, 20)}...`);

      return {
        success: true,
        agent: {
          id: agent._id,
          name: agent.name,
          agentUuid: agent.agentUuid
        },
        hedera: {
          accountId: hederaCredentials.accountId,
          publicKey: hederaCredentials.publicKey,
          isOperator: hederaCredentials.isOperator,
          transactionId: hederaCredentials.transactionId,
          initialBalance: hederaCredentials.initialBalance
        },
        message: `Hedera credentials assigned to agent ${agent.name}`
      };

    } catch (error) {
      console.error('❌ Failed to assign Hedera credentials:', error);
      throw error;
    }
  }

  /**
   * Validate agent's Hedera credentials
   * @param {string} agentId - Agent MongoDB ID
   * @returns {Object} Validation result
   */
  async validateAgentCredentials(agentId) {
    try {
      const agent = await AgentModel.findById(agentId).select('+hederaPrivateKey');
      if (!agent) {
        throw new Error('Agent not found');
      }

      if (!agent.hederaAccountId || !agent.hederaPrivateKey) {
        return {
          valid: false,
          message: 'Agent does not have Hedera credentials configured'
        };
      }

      // Decrypt private key if needed
      let privateKey = agent.hederaPrivateKey;
      try {
        // Try to decrypt if it's encrypted
        privateKey = hederaWalletService.decryptPrivateKey(agent.hederaPrivateKey);
      } catch (decryptError) {
        // If decryption fails, assume it's already in plain text
        privateKey = agent.hederaPrivateKey;
      }

      // Validate credentials with Hedera network
      const isValid = await hederaWalletService.validateCredentials(
        agent.hederaAccountId,
        privateKey
      );

      return {
        valid: isValid,
        accountId: agent.hederaAccountId,
        publicKey: agent.hederaPublicKey,
        message: isValid ? 'Credentials are valid' : 'Credentials are invalid'
      };

    } catch (error) {
      console.error('❌ Failed to validate agent credentials:', error);
      return {
        valid: false,
        message: `Validation failed: ${error.message}`
      };
    }
  }

  /**
   * Get agent's decrypted private key
   * @param {string} agentId - Agent MongoDB ID
   * @returns {string} Decrypted private key
   */
  async getAgentPrivateKey(agentId) {
    try {
      const agent = await AgentModel.findById(agentId).select('+hederaPrivateKey');
      if (!agent) {
        throw new Error('Agent not found');
      }

      if (!agent.hederaPrivateKey) {
        throw new Error('Agent does not have a private key configured');
      }

      // Try to decrypt if it's encrypted
      try {
        return hederaWalletService.decryptPrivateKey(agent.hederaPrivateKey);
      } catch (decryptError) {
        // If decryption fails, assume it's already in plain text
        return agent.hederaPrivateKey;
      }

    } catch (error) {
      console.error('❌ Failed to get agent private key:', error);
      throw error;
    }
  }

  /**
   * Fund agent's account from operator
   * @param {string} agentId - Agent MongoDB ID
   * @param {number} amount - Amount in HBAR to transfer
   * @returns {Object} Transfer result
   */
  async fundAgentAccount(agentId, amount) {
    try {
      const agent = await AgentModel.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      if (!agent.hederaAccountId) {
        throw new Error('Agent does not have a Hedera account');
      }

      const result = await hederaWalletService.fundAccount(agent.hederaAccountId, amount);

      console.log(`✅ Funded agent ${agent.name} account with ${amount} HBAR`);

      return {
        ...result,
        agent: {
          id: agent._id,
          name: agent.name,
          accountId: agent.hederaAccountId
        }
      };

    } catch (error) {
      console.error('❌ Failed to fund agent account:', error);
      throw error;
    }
  }

  /**
   * Bulk assign Hedera credentials to multiple agents
   * @param {Array} agentIds - Array of agent MongoDB IDs
   * @param {Object} options - Assignment options
   * @returns {Object} Bulk assignment result
   */
  async bulkAssignCredentials(agentIds, options = {}) {
    try {
      const results = [];
      const errors = [];

      console.log(`🔄 Bulk assigning Hedera credentials to ${agentIds.length} agents...`);

      for (let i = 0; i < agentIds.length; i++) {
        const agentId = agentIds[i];
        console.log(`Processing agent ${i + 1}/${agentIds.length}...`);

        try {
          const result = await this.assignHederaCredentials(agentId, options);
          results.push(result);
          
          // Add delay to avoid rate limiting
          if (i < agentIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          errors.push({
            agentId,
            error: error.message
          });
        }
      }

      console.log(`✅ Bulk assignment completed: ${results.length} success, ${errors.length} errors`);

      return {
        success: true,
        results,
        errors,
        summary: {
          total: agentIds.length,
          successful: results.length,
          failed: errors.length
        }
      };

    } catch (error) {
      console.error('❌ Bulk assignment failed:', error);
      throw error;
    }
  }

  /**
   * Remove Hedera credentials from agent
   * @param {string} agentId - Agent MongoDB ID
   * @returns {Object} Removal result
   */
  async removeHederaCredentials(agentId) {
    try {
      const agent = await AgentModel.findById(agentId).select('+hederaPrivateKey');
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Store old credentials for logging
      const oldAccountId = agent.hederaAccountId;

      // Remove Hedera credentials
      agent.hederaAccountId = undefined;
      agent.hederaPrivateKey = undefined;
      agent.hederaPublicKey = undefined;
      agent.hederaAccountCreationTx = undefined;

      await agent.save();

      console.log(`✅ Hedera credentials removed from agent: ${agent.name}`);
      if (oldAccountId) {
        console.log(`🗑️  Removed account: ${oldAccountId}`);
      }

      return {
        success: true,
        agent: {
          id: agent._id,
          name: agent.name,
          agentUuid: agent.agentUuid
        },
        removedAccountId: oldAccountId,
        message: `Hedera credentials removed from agent ${agent.name}`
      };

    } catch (error) {
      console.error('❌ Failed to remove Hedera credentials:', error);
      throw error;
    }
  }

  /**
   * List all agents with their Hedera credential status
   * @returns {Array} List of agents with credential status
   */
  async listAgentsWithCredentialStatus() {
    try {
      const agents = await AgentModel.find({ isActive: true })
        .select('name agentUuid role hederaAccountId hederaPublicKey')
        .lean();

      const agentsWithStatus = agents.map(agent => ({
        id: agent._id,
        name: agent.name,
        agentUuid: agent.agentUuid,
        role: agent.role,
        hasHederaCredentials: !!(agent.hederaAccountId),
        hederaAccountId: agent.hederaAccountId || null,
        hederaPublicKey: agent.hederaPublicKey ? 
          `${agent.hederaPublicKey.substring(0, 20)}...` : null
      }));

      const summary = {
        total: agentsWithStatus.length,
        withCredentials: agentsWithStatus.filter(a => a.hasHederaCredentials).length,
        withoutCredentials: agentsWithStatus.filter(a => !a.hasHederaCredentials).length
      };

      return {
        agents: agentsWithStatus,
        summary
      };

    } catch (error) {
      console.error('❌ Failed to list agents with credential status:', error);
      throw error;
    }
  }
}

// Export singleton instance
const agentHederaUtils = new AgentHederaUtils();
module.exports = agentHederaUtils;