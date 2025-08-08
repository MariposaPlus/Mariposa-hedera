# Hedera Agent Kit Service

A comprehensive service for interacting with Hedera Hashgraph using the `hedera-agent-kit` package. This service provides agent-specific tools for creating tokens, managing consensus topics, handling evaluations, and performing balance queries.

## Features

- 🪙 **Fungible Token Creation** - Create custom tokens on Hedera
- 📝 **Consensus Topics** - Create and manage HCS topics for messaging
- 💰 **Balance Queries** - Query HBAR balances for accounts
- 🎯 **Evaluation System** - Complete candidate evaluation pipeline with HCS-11 standard
- 🔧 **Agent-Specific Toolkits** - Each agent uses their own Hedera credentials
- 🧪 **Comprehensive Testing** - Full test suite included

## Prerequisites

- Node.js 16+
- MongoDB database
- Hedera testnet account (for testing)
- Environment variables configured

## Environment Variables

```bash
# Hedera Configuration
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=302e020100300506032b65700422042...
HEDERA_PUBLIC_KEY=302a300506032b65700321001f8b8e...
HEDERA_NETWORK=testnet

# MongoDB
MONGODB_URI=mongodb://localhost:27017/meraposa
```

## Installation

The `hedera-agent-kit` is already included in the project dependencies:

```bash
npm install
```

## Models

### Agent Model Extensions

The Agent model has been extended with Hedera-specific fields:

```javascript
{
  // ... existing fields
  avatarName: String,           // Agent's avatar name
  role: String,                 // Agent's role (e.g., "HR Specialist")
  hederaAccountId: String,      // Hedera account ID
  hederaPrivateKey: String,     // Hedera private key (encrypted)
  hederaPublicKey: String,      // Hedera public key
}
```

### EvaluationTopic Model

New model for managing candidate evaluations:

```javascript
{
  topicId: String,              // Hedera topic ID
  company: String,              // Company name
  postId: String,               // Job post ID
  candidateName: String,        // Candidate name
  candidateId: String,          // Candidate ID
  topicMemo: String,            // HCS topic memo
  createdBy: String,            // Agent who created the topic
  status: String,               // 'active', 'completed', 'cancelled'
  evaluations: [EvaluationSchema], // Array of evaluations
  finalResult: FinalResultSchema   // Final evaluation result
}
```

## API Endpoints

### Basic Operations

#### Get Available Tools
```http
GET /hedera-tools/tools?agentId=AGENT_ID
```

#### Get Client Information
```http
GET /hedera-tools/client-info
```

### Balance Operations

#### Get HBAR Balance
```http
GET /hedera-tools/balance?accountId=0.0.123456&agentId=AGENT_ID
```

#### Get Agent's Balance
```http
GET /hedera-tools/my-balance?agentId=AGENT_ID
```

### Token Operations

#### Create Fungible Token
```http
POST /hedera-tools/create-token
Content-Type: application/json

{
  "name": "Test Token",
  "symbol": "TEST",
  "decimals": 2,
  "initialSupply": 1000,
  "agentId": "AGENT_ID",
  "treasuryAccount": "0.0.123456"
}
```

### Topic Operations

#### Create Topic
```http
POST /hedera-tools/create-topic
Content-Type: application/json

{
  "memo": "Test topic for messaging",
  "agentId": "AGENT_ID",
  "adminKey": "PUBLIC_KEY_STRING",
  "submitKey": "PUBLIC_KEY_STRING"
}
```

#### Submit Message
```http
POST /hedera-tools/submit-message
Content-Type: application/json

{
  "topicId": "0.0.123456",
  "message": "Hello, Hedera!",
  "agentId": "AGENT_ID"
}
```

### Evaluation System

#### Create Evaluation Topic
```http
POST /hedera-tools/create-evaluation-topic
Content-Type: application/json

{
  "company": "TechCorp Inc",
  "postId": "job-123",
  "candidateName": "John Doe",
  "candidateId": "candidate-456",
  "agentId": "AGENT_ID"
}
```

#### Submit Evaluation
```http
POST /hedera-tools/submit-evaluation-message
Content-Type: application/json

{
  "topicId": "0.0.123456",
  "agentId": "AGENT_ID",
  "evaluation": {
    "passed": true,
    "score": 85,
    "feedback": "Strong technical skills",
    "interviewNotes": "Excellent problem-solving abilities"
  }
}
```

#### Send Validation Message
```http
POST /hedera-tools/send-validation-message
Content-Type: application/json

{
  "topicId": "0.0.123456",
  "agentId": "AGENT_ID",
  "evaluation": {
    "passed": false,
    "score": 65,
    "feedback": "Needs improvement in communication",
    "interviewNotes": "Technical knowledge is good but soft skills need work"
  }
}
```

#### Get Evaluation Topic
```http
GET /hedera-tools/evaluation-topic/0.0.123456
```

#### Get Evaluation Topics
```http
GET /hedera-tools/evaluation-topics?company=TechCorp&status=active
```

## Usage Examples

### Service Usage

```javascript
const hederaAgentKitService = require('./services/hederaAgentKitService');

// Create a token
const tokenResult = await hederaAgentKitService.createFungibleToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 2,
  initialSupply: 1000,
  agentId: 'agent_mongodb_id'
});

// Create an evaluation topic
const topicResult = await hederaAgentKitService.createEvaluationTopic({
  company: 'TechCorp',
  postId: 'job-123',
  candidateName: 'Jane Doe',
  agentId: 'agent_mongodb_id'
});

// Submit evaluation
const evalResult = await hederaAgentKitService.submitEvaluationMessage({
  topicId: topicResult.topicId,
  agentId: 'agent_mongodb_id',
  evaluation: {
    passed: true,
    score: 90,
    feedback: 'Excellent candidate',
    interviewNotes: 'Strong technical and soft skills'
  }
});
```

### Controller Integration

Add the routes to your main Express app:

```javascript
const express = require('express');
const hederaAgentKitRoutes = require('./routes/hederaAgentKit');

const app = express();

// Add Hedera Agent Kit routes
app.use('/hedera-tools', hederaAgentKitRoutes);
```

## Testing

### Run All Tests

```bash
node Backend/test-hedera-agent-kit.js
```

### Test Features

The test suite covers:

- ✅ Available tools retrieval
- ✅ Balance queries (agent and account-specific)
- ✅ Topic creation and messaging
- ✅ Token creation
- ✅ Evaluation topic management
- ✅ Evaluation message submission
- ✅ Validation message sending
- ✅ Error handling scenarios

### Test Configuration

Modify test configuration in `test-hedera-agent-kit.js`:

```javascript
const TEST_CONFIG = {
  MONGODB_URI: 'mongodb://localhost:27017/meraposa-test',
  TEST_AGENT: {
    // ... agent configuration
  },
  TEST_EVALUATION: {
    // ... evaluation test data
  }
};
```

## HCS-11 Standard

The evaluation system implements the HCS-11 standard for agent validation messages:

```json
{
  "standard": "HCS-11",
  "type": "agent_validation",
  "agentProfile": {
    "name": "HR Agent",
    "avatarName": "HR Assistant",
    "role": "HR Specialist",
    "accountId": "0.0.123456"
  },
  "evaluation": {
    "topicId": "0.0.789012",
    "candidate": "John Doe",
    "company": "TechCorp",
    "postId": "job-123",
    "result": {
      "passed": true,
      "score": 85,
      "feedback": "Strong technical skills",
      "interviewNotes": "Excellent problem-solving"
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "coordinatorMessage": {
    "to": "coordinator_agent",
    "action": "candidate_approved",
    "summary": "HR Specialist evaluation: PASSED (Score: 85)"
  }
}
```

## Security Considerations

1. **Private Key Storage**: Agent private keys are stored with `select: false` by default
2. **Environment Variables**: Sensitive credentials should be in environment variables
3. **Network Isolation**: Use testnet for testing, mainnet for production
4. **Agent Permissions**: Each agent uses their own Hedera credentials

## Error Handling

The service provides comprehensive error handling:

- Missing required parameters
- Invalid agent IDs
- Hedera network errors
- Database connection issues
- Malformed public keys

## Performance Considerations

- **Lazy Client Initialization**: Hedera clients are created on-demand
- **Network Timeouts**: 10-second timeout for better performance
- **Connection Pooling**: MongoDB connections are pooled
- **Parallel Operations**: Multiple operations can run concurrently

## Troubleshooting

### Common Issues

1. **"Agent not found"**
   - Verify the agent exists in the database
   - Check the agent ID format

2. **"Agent does not have Hedera credentials"**
   - Ensure `hederaAccountId` and `hederaPrivateKey` are set
   - Verify the credentials are valid

3. **"Tool not found"**
   - Check if the hedera-agent-kit is properly installed
   - Verify the toolkit initialization

4. **Network errors**
   - Ensure Hedera credentials are valid for testnet
   - Check network connectivity
   - Verify account has sufficient HBAR balance

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=hedera-agent-kit
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.