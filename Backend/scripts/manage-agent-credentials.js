/**
 * Hedera Agent Credential Management Script
 * 
 * This script helps manage Hedera credentials for agents.
 * It can assign operator credentials, create new accounts, and validate existing credentials.
 */

require("dotenv").config();
const mongoose = require('mongoose');
const agentHederaUtils = require('../utils/agentHederaUtils');
const hederaWalletService = require('../services/hederaWalletService');
const AgentModel = require('../models/Agent');

class AgentCredentialManager {
  constructor() {
    this.connected = false;
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    if (this.connected) return;

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/meraposa';
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      console.log('✅ Connected to MongoDB');
      this.connected = true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Display operator information
   */
  displayOperatorInfo() {
    console.log('\n🔑 Hedera Operator Information');
    console.log('===============================');
    
    const operatorInfo = hederaWalletService.getOperatorAccountInfo();
    console.log(`Network: ${operatorInfo.network}`);
    console.log(`Account ID: ${operatorInfo.accountId || 'Not configured'}`);
    console.log(`Has Private Key: ${operatorInfo.hasPrivateKey ? 'Yes' : 'No'}`);
    console.log(`Client Initialized: ${operatorInfo.isInitialized ? 'Yes' : 'No'}`);
    
    if (!operatorInfo.accountId || !operatorInfo.hasPrivateKey) {
      console.log('\n⚠️  Operator credentials not fully configured!');
      console.log('Please set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in your .env file');
    }
  }

  /**
   * List all agents and their credential status
   */
  async listAgentCredentials() {
    console.log('\n📋 Agent Hedera Credential Status');
    console.log('==================================');
    
    try {
      const result = await agentHederaUtils.listAgentsWithCredentialStatus();
      
      console.log(`\nSummary: ${result.summary.total} total agents`);
      console.log(`✅ With credentials: ${result.summary.withCredentials}`);
      console.log(`❌ Without credentials: ${result.summary.withoutCredentials}`);
      console.log('');

      if (result.agents.length === 0) {
        console.log('No agents found in the database.');
        return;
      }

      result.agents.forEach((agent, index) => {
        const status = agent.hasHederaCredentials ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${agent.name} (${agent.role})`);
        console.log(`   ID: ${agent.id}`);
        console.log(`   UUID: ${agent.agentUuid}`);
        if (agent.hasHederaCredentials) {
          console.log(`   Account: ${agent.hederaAccountId}`);
          console.log(`   Public Key: ${agent.hederaPublicKey}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to list agent credentials:', error.message);
    }
  }

  /**
   * Assign operator credentials to a specific agent
   */
  async assignOperatorCredentials(agentId) {
    try {
      console.log(`\n🔑 Assigning operator credentials to agent: ${agentId}`);
      
      const result = await agentHederaUtils.assignHederaCredentials(agentId, {
        useOperatorCredentials: true,
        encryptPrivateKey: false
      });

      console.log('✅ Operator credentials assigned successfully!');
      console.log(`Agent: ${result.agent.name}`);
      console.log(`Account ID: ${result.hedera.accountId}`);
      console.log(`Public Key: ${result.hedera.publicKey.substring(0, 50)}...`);

    } catch (error) {
      console.error('❌ Failed to assign operator credentials:', error.message);
    }
  }

  /**
   * Create new Hedera account for an agent
   */
  async createNewAccountForAgent(agentId, initialBalance = 10) {
    try {
      console.log(`\n🆕 Creating new Hedera account for agent: ${agentId}`);
      console.log(`Initial balance: ${initialBalance} HBAR`);
      
      const result = await agentHederaUtils.assignHederaCredentials(agentId, {
        useOperatorCredentials: false,
        createNewAccount: true,
        initialBalance,
        encryptPrivateKey: true
      });

      console.log('✅ New account created successfully!');
      console.log(`Agent: ${result.agent.name}`);
      console.log(`Account ID: ${result.hedera.accountId}`);
      console.log(`Transaction ID: ${result.hedera.transactionId}`);
      console.log(`Initial Balance: ${result.hedera.initialBalance} HBAR`);

    } catch (error) {
      console.error('❌ Failed to create new account:', error.message);
    }
  }

  /**
   * Validate credentials for a specific agent
   */
  async validateAgentCredentials(agentId) {
    try {
      console.log(`\n🔍 Validating credentials for agent: ${agentId}`);
      
      const result = await agentHederaUtils.validateAgentCredentials(agentId);
      
      if (result.valid) {
        console.log('✅ Credentials are valid!');
        console.log(`Account ID: ${result.accountId}`);
        console.log(`Public Key: ${result.publicKey?.substring(0, 50)}...`);
      } else {
        console.log('❌ Credentials are invalid!');
        console.log(`Reason: ${result.message}`);
      }

    } catch (error) {
      console.error('❌ Failed to validate credentials:', error.message);
    }
  }

  /**
   * Remove credentials from an agent
   */
  async removeAgentCredentials(agentId) {
    try {
      console.log(`\n🗑️  Removing credentials from agent: ${agentId}`);
      
      const result = await agentHederaUtils.removeHederaCredentials(agentId);
      
      console.log('✅ Credentials removed successfully!');
      console.log(`Agent: ${result.agent.name}`);
      if (result.removedAccountId) {
        console.log(`Removed Account: ${result.removedAccountId}`);
      }

    } catch (error) {
      console.error('❌ Failed to remove credentials:', error.message);
    }
  }

  /**
   * Bulk assign operator credentials to all agents without credentials
   */
  async bulkAssignOperatorCredentials() {
    try {
      console.log('\n🔄 Bulk assigning operator credentials...');
      
      // Get agents without credentials
      const credentialStatus = await agentHederaUtils.listAgentsWithCredentialStatus();
      const agentsWithoutCredentials = credentialStatus.agents
        .filter(agent => !agent.hasHederaCredentials)
        .map(agent => agent.id);

      if (agentsWithoutCredentials.length === 0) {
        console.log('✅ All agents already have credentials!');
        return;
      }

      console.log(`Found ${agentsWithoutCredentials.length} agents without credentials`);
      
      const result = await agentHederaUtils.bulkAssignCredentials(
        agentsWithoutCredentials,
        {
          useOperatorCredentials: true,
          encryptPrivateKey: false
        }
      );

      console.log('\n✅ Bulk assignment completed!');
      console.log(`Successful: ${result.summary.successful}`);
      console.log(`Failed: ${result.summary.failed}`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => {
          console.log(`   - Agent ${error.agentId}: ${error.error}`);
        });
      }

    } catch (error) {
      console.error('❌ Bulk assignment failed:', error.message);
    }
  }

  /**
   * Interactive command line interface
   */
  async runInteractive() {
    await this.initialize();
    
    console.log('\n🌟 Hedera Agent Credential Manager');
    console.log('==================================');
    
    this.displayOperatorInfo();
    
    // Simple menu system
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const showMenu = () => {
      console.log('\n📋 Available Commands:');
      console.log('1. List agent credentials');
      console.log('2. Assign operator credentials to agent');
      console.log('3. Create new account for agent');
      console.log('4. Validate agent credentials');
      console.log('5. Remove agent credentials');
      console.log('6. Bulk assign operator credentials');
      console.log('7. Show operator info');
      console.log('0. Exit');
      console.log('');
    };

    const processCommand = async (command) => {
      switch (command.trim()) {
        case '1':
          await this.listAgentCredentials();
          break;
        case '2':
          rl.question('Enter agent ID: ', async (agentId) => {
            await this.assignOperatorCredentials(agentId.trim());
            showMenu();
            rl.prompt();
          });
          return;
        case '3':
          rl.question('Enter agent ID: ', (agentId) => {
            rl.question('Enter initial balance (HBAR, default 10): ', async (balance) => {
              const initialBalance = parseFloat(balance) || 10;
              await this.createNewAccountForAgent(agentId.trim(), initialBalance);
              showMenu();
              rl.prompt();
            });
          });
          return;
        case '4':
          rl.question('Enter agent ID: ', async (agentId) => {
            await this.validateAgentCredentials(agentId.trim());
            showMenu();
            rl.prompt();
          });
          return;
        case '5':
          rl.question('Enter agent ID: ', async (agentId) => {
            await this.removeAgentCredentials(agentId.trim());
            showMenu();
            rl.prompt();
          });
          return;
        case '6':
          await this.bulkAssignOperatorCredentials();
          break;
        case '7':
          this.displayOperatorInfo();
          break;
        case '0':
          console.log('👋 Goodbye!');
          rl.close();
          await mongoose.connection.close();
          process.exit(0);
          break;
        default:
          console.log('❌ Invalid command. Please try again.');
      }
      
      showMenu();
      rl.prompt();
    };

    rl.on('line', processCommand);
    
    showMenu();
    rl.prompt();
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.connected) {
      await mongoose.connection.close();
      this.connected = false;
    }
  }
}

// Command line execution
if (require.main === module) {
  const manager = new AgentCredentialManager();
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run interactive mode
    manager.runInteractive().catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
  } else {
    // Run specific command
    manager.initialize().then(async () => {
      const command = args[0];
      
      switch (command) {
        case 'list':
          await manager.listAgentCredentials();
          break;
        case 'operator-info':
          manager.displayOperatorInfo();
          break;
        case 'assign-operator':
          if (args[1]) {
            await manager.assignOperatorCredentials(args[1]);
          } else {
            console.error('❌ Agent ID required: node manage-agent-credentials.js assign-operator AGENT_ID');
          }
          break;
        case 'create-account':
          if (args[1]) {
            const balance = parseFloat(args[2]) || 10;
            await manager.createNewAccountForAgent(args[1], balance);
          } else {
            console.error('❌ Agent ID required: node manage-agent-credentials.js create-account AGENT_ID [BALANCE]');
          }
          break;
        case 'validate':
          if (args[1]) {
            await manager.validateAgentCredentials(args[1]);
          } else {
            console.error('❌ Agent ID required: node manage-agent-credentials.js validate AGENT_ID');
          }
          break;
        case 'bulk-assign':
          await manager.bulkAssignOperatorCredentials();
          break;
        default:
          console.log('❌ Unknown command. Available commands:');
          console.log('  list, operator-info, assign-operator, create-account, validate, bulk-assign');
      }
      
      await manager.close();
      process.exit(0);
    }).catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
  }
}

module.exports = AgentCredentialManager;