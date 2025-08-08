# AI Agent Usage Examples

## Overview
The AI Agent provides crypto buy/sell strategy expertise for SEI network DEX trading with **conversation memory**. It analyzes user messages to extract investment intent and provides comprehensive strategies with specific dollar amounts for both long-term holding and short-term trading, while maintaining continuity across conversations.

## Endpoints

### 1. Chat with AI Agent
**Endpoint:** `POST /api/agent/chat`

```json
{
  "message": "I want to start trading on SEI network with moderate risk tolerance"
}
```

### 2. Get SEI Network Prices
**Endpoint:** `GET /api/agent/prices`

Returns current prices for supported tokens on SEI network.

### 3. Generate Buy/Sell Strategy from Message (with Memory)
**Endpoint:** `POST /api/agent/strategy`

The AI analyzes your message and generates a complete buy/sell strategy with specific dollar amounts and holding recommendations. **The system remembers previous conversations** to provide continuity.

### 4. Get Memory History
**Endpoint:** `GET /api/agent/memory?limit=5`

Retrieve conversation history for the current session.

## Memory-Enhanced Strategy Generation

### Initial Conversation - Example 1
```json
{
  "message": "I want to invest $1000 in BTC and ETH for long-term holding. I prefer conservative approach and can add $200 monthly."
}
```

**Response includes:**
```json
{
  "success": true,
  "data": {
    "strategy": {
      "analysis": "The user is interested in long-term holding with conservative approach, initial investment of $1000 with $200 monthly additions...",
      "userMessage": "I've created a conservative long-term strategy for you. Start with $600 in BTC and $300 in ETH, then add $120 monthly to BTC and $80 to ETH...",
      "actionPlan": [
        {
          "action": "BUY $600 worth of BTC on SEI DEX for long-term holding",
          "actionType": "BUY",
          "dollarAmount": "$600.00",
          "ref": "BUY_BTC_1234567890"
        }
      ]
    },
    "sessionId": "127.0.0.1_Mozilla_5.0_Chrome_120.0",
    "memoryContext": "No previous interactions",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Follow-up Conversation - Example 2
```json
{
  "message": "I want to add more to my BTC position. Market seems to be dipping."
}
```

**Response with Memory Context:**
```json
{
  "success": true,
  "data": {
    "strategy": {
      "analysis": "Based on your previous conservative long-term strategy with $600 BTC and $300 ETH, you're now looking to add more BTC during this market dip. This aligns with your dollar-cost averaging approach...",
      "userMessage": "Great timing! Since you already have $600 in BTC from our previous strategy, this dip is a good opportunity to add more. I recommend buying an additional $200-300 BTC to take advantage of the lower prices while staying within your conservative approach...",
      "actionPlan": [
        {
          "action": "BUY $250 worth of BTC on current dip for long-term holding",
          "actionType": "BUY",
          "dollarAmount": "$250.00",
          "ref": "BUY_BTC_DIP_1234567891",
          "reasoning": "Adding to existing BTC position during market dip, consistent with previous conservative strategy"
        }
      ]
    },
    "sessionId": "127.0.0.1_Mozilla_5.0_Chrome_120.0",
    "memoryContext": "Previous interactions considered",
    "timestamp": "2024-01-15T11:15:00.000Z"
  }
}
```

### Memory History Response
**GET /api/agent/memory?limit=3**

```json
{
  "success": true,
  "data": {
    "sessionId": "127.0.0.1_Mozilla_5.0_Chrome_120.0",
    "memories": [
      {
        "timestamp": "2024-01-15T11:15:00.000Z",
        "userIntent": "I want to add more to my BTC position. Market seems to be dipping.",
        "strategyType": "long_holding",
        "budget": 250,
        "actions": "BUY $250 USDC/BTC (long-term)",
        "summary": "Added to existing BTC position during market dip, consistent with conservative strategy",
        "outcome": "pending"
      },
      {
        "timestamp": "2024-01-15T10:30:00.000Z",
        "userIntent": "I want to invest $1000 in BTC and ETH for long-term holding. Conservative approach.",
        "strategyType": "long_holding",
        "budget": 1000,
        "actions": "BUY $600 USDC/BTC (long-term), BUY $300 USDC/ETH (long-term)",
        "summary": "Created conservative long-term strategy with BTC and ETH focus",
        "outcome": "pending"
      }
    ],
    "count": 2,
    "timestamp": "2024-01-15T11:20:00.000Z"
  }
}
```

## Advanced Memory Examples

### Example 3: Strategy Evolution
**First Request:**
```json
{
  "message": "I'm new to crypto and want to start safely. I have $500 to invest."
}
```

**AI Response:** Creates beginner-friendly strategy with small positions.

**Second Request (later):**
```json
{
  "message": "I'm feeling more confident now. Can I increase my risk level and add more coins?"
}
```

**AI Response with Memory:** "I see you started with our conservative $500 strategy. Since you're feeling more confident, let's gradually increase your exposure. I recommend adding SEI tokens to your existing BTC/ETH positions and increasing your monthly contributions..."

### Example 4: Strategy Correction
**First Request:**
```json
{
  "message": "I want aggressive short-term trading with $2000. High risk tolerance."
}
```

**AI Response:** Creates aggressive short-term strategy.

**Second Request:**
```json
{
  "message": "Actually, I think I want to focus more on long-term holding instead."
}
```

**AI Response with Memory:** "I understand you want to shift from the aggressive short-term strategy we discussed earlier to a long-term approach. Let's convert your $2000 into a more stable long-term holding strategy..."

## Memory Features

### 1. **Conversation Continuity**
- References previous strategies and recommendations
- Builds upon past decisions and outcomes
- Maintains context across multiple interactions

### 2. **Strategy Evolution**
- Tracks changes in user preferences over time
- Adjusts recommendations based on previous experiences
- Suggests modifications to existing strategies

### 3. **Budget Tracking**
- Remembers previous investments and allocations
- Provides cumulative portfolio view
- Suggests additions based on existing positions

### 4. **Session Management**
- Automatic session identification based on IP and User-Agent
- Persistent memory across browser sessions
- Configurable memory limits (default: 5 recent interactions)

## Memory Data Structure

Each memory entry contains:
- **Timestamp:** When the interaction occurred
- **User Intent:** Original user message
- **Strategy Type:** long_holding, short_trading, or mixed
- **Budget:** Total dollar amount involved
- **Actions:** Summary of buy/sell actions
- **Summary:** AI-generated summary of the strategy
- **Outcome:** pending, executed, or cancelled

## Implementation Benefits

### 1. **Personalized Recommendations**
- AI learns user preferences over time
- Reduces redundant explanations
- Provides context-aware advice

### 2. **Portfolio Continuity**
- Maintains awareness of existing positions
- Suggests complementary investments
- Avoids contradictory recommendations

### 3. **Risk Management**
- Tracks user's risk tolerance evolution
- Provides warnings for inconsistent strategies
- Maintains appropriate risk levels

### 4. **Better User Experience**
- No need to repeat previous context
- Faster strategy generation
- More natural conversation flow

## Technical Implementation

### Memory Storage
- MongoDB database with indexed sessions
- Efficient querying by sessionId and timestamp
- Automatic cleanup of old memories (optional)

### Session Management
- IP + User-Agent based session identification
- Configurable session timeouts
- Support for authenticated users (future)

### AI Integration
- Memory context included in every strategy prompt
- Structured memory summaries for AI consumption
- Contextual analysis and response generation

## Testing Memory Features

1. **Test Conversation Flow:**
   - Make initial strategy request
   - Make follow-up request referencing previous strategy
   - Check memory endpoint for conversation history

2. **Test Strategy Evolution:**
   - Start with conservative strategy
   - Gradually increase risk tolerance
   - Observe how AI adapts recommendations

3. **Test Budget Tracking:**
   - Make initial investment request
   - Request portfolio additions
   - Verify AI considers existing positions

Use the Swagger UI at `/api-docs` to test all memory-enhanced endpoints and see how conversation context improves strategy recommendations over time. 