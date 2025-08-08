# Agent-User Integration Guide

This guide explains how to create and manage Hedera agents linked to users after the recent updates.

## Backend Changes

### Updated Controller: `simpleHederaAgentController.js`

**⚠️ DEPRECATED:** The `/api/agents/hedera` endpoint is no longer used in the client pipeline. 

**✅ RECOMMENDED:** Use `/api/agents/simple` for creating agents with Hedera wallets.

The controller now requires and handles `userId` for all agent operations:

#### 1. Create Agent (POST /api/agents/hedera) - DEPRECATED
```javascript
// Required fields
{
  "name": "Agent Name",
  "userId": "64f1a2b3c4d5e6f7g8h9i0j1", // MongoDB ObjectId
  "description": "Optional description",
  "hederaAccountId": "0.0.123456",
  "hederaPrivateKey": "private_key_here",
  "hederaPublicKey": "public_key_here"
}
```

#### 2. Get All Agents with User Filter (GET /api/agents/hedera)
```javascript
// Get all agents
GET /api/agents/hedera

// Get agents for specific user
GET /api/agents/hedera?userId=64f1a2b3c4d5e6f7g8h9i0j1
```

#### 3. Get Agents by User ID (GET /api/agents/hedera/user/:userId)
```javascript
// New endpoint for getting user's agents
GET /api/agents/hedera/user/64f1a2b3c4d5e6f7g8h9i0j1
```

### Response Format
All agent responses now include `userId`:
```javascript
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "name": "Agent Name",
    "description": "Agent description",
    "userId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "hederaAccountId": "0.0.123456",
    "hederaPublicKey": "public_key_here",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Frontend Integration

### Updated Components

#### 1. AgentCreationModal.tsx
Now uses real user ID from authentication:
```typescript
const { user } = useAuth();

const getUserId = () => {
  return user?.id || user?._id || null;
};

// In createAgent function
const userId = getUserId();
if (!userId) {
  setError('User not authenticated. Please log in first.');
  return;
}
```

#### 2. AuthWrapper.tsx
Handles agent creation after user registration:
```typescript
const handleCreateAgent = async (user: any) => {
  const agentData = await AuthService.createUserWithAgent({
    email: user.email,
    name: user.name,
    agentName: `${user.name} Agent`,
    userId: user.id // Pass the real userId
  });
};
```

### API Usage Examples

#### Creating an Agent from Frontend
```typescript
// Example: Create agent after user login
const createAgentForUser = async (userId: string, agentName: string) => {
  try {
    const response = await fetch('/api/agents/hedera', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: agentName,
        userId: userId,
        description: 'AI trading agent',
        // Hedera credentials would be generated or provided
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Agent created:', result.data);
      return result.data;
    }
  } catch (error) {
    console.error('Failed to create agent:', error);
  }
};
```

#### Fetching User's Agents
```typescript
// Example: Get all agents for a user
const getUserAgents = async (userId: string) => {
  try {
    const response = await fetch(`/api/agents/hedera/user/${userId}`);
    const result = await response.json();
    
    if (result.success) {
      console.log('User agents:', result.data);
      return result.data;
    }
  } catch (error) {
    console.error('Failed to fetch user agents:', error);
  }
};

// Alternative: Using query parameter
const getUserAgentsAlt = async (userId: string) => {
  try {
    const response = await fetch(`/api/agents/hedera?userId=${userId}`);
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to fetch user agents:', error);
  }
};
```

## Database Schema

### Agent Model
The Agent model already includes the userId field:
```javascript
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}
```

### User Model
The User model includes agent reference:
```javascript
{
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  }
}
```

## Security Considerations

1. **Authentication**: Always verify user authentication before creating agents
2. **Authorization**: Users should only access their own agents
3. **Private Keys**: Never return Hedera private keys in API responses
4. **Validation**: Validate userId format and existence before operations

## Error Handling

Common error scenarios:
```javascript
// Missing userId
{
  "success": false,
  "error": "Please provide a userId for the agent"
}

// User not authenticated
{
  "success": false,
  "error": "User not authenticated. Please log in first."
}

// Agent not found
{
  "success": false,
  "error": "Agent not found"
}
```

## Next Steps

1. **Authentication Middleware**: Add middleware to verify user ownership of agents
2. **Bulk Operations**: Add endpoints for bulk agent operations
3. **Agent Permissions**: Implement fine-grained permissions for agent actions
4. **Audit Trail**: Add logging for agent creation and modifications