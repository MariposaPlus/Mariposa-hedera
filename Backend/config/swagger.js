const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mariposa Backend API',
      version: '1.0.0',
      description: 'A comprehensive Node.js Express API with MongoDB, authentication, and AI-powered crypto DCA expert agent',
      contact: {
        name: 'API Support',
        email: 'support@mariposa.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'https://api.mariposa.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'User name',
              maxLength: 50
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              default: 'user',
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              default: true,
              description: 'Whether user is active'
            },
            avatar: {
              type: 'string',
              description: 'User avatar URL'
            }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'description', 'price', 'category', 'brand', 'countInStock', 'createdBy'],
          properties: {
            id: {
              type: 'string',
              description: 'Product ID'
            },
            name: {
              type: 'string',
              description: 'Product name',
              maxLength: 100
            },
            description: {
              type: 'string',
              description: 'Product description',
              maxLength: 500
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Product price'
            },
            category: {
              type: 'string',
              enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'other'],
              description: 'Product category'
            },
            brand: {
              type: 'string',
              description: 'Product brand'
            },
            countInStock: {
              type: 'number',
              minimum: 0,
              description: 'Stock count'
            },
            rating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              default: 0,
              description: 'Product rating'
            },
            numReviews: {
              type: 'number',
              default: 0,
              description: 'Number of reviews'
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Product images'
            },
            isFeatured: {
              type: 'boolean',
              default: false,
              description: 'Whether product is featured'
            },
            isActive: {
              type: 'boolean',
              default: true,
              description: 'Whether product is active'
            },
            createdBy: {
              type: 'string',
              description: 'User ID who created the product'
            }
          }
        },
        AIResponse: {
          type: 'object',
          properties: {
            analysis: {
              type: 'string',
              description: 'AI analysis of the user situation'
            },
            strategy: {
              type: 'string',
              description: 'Recommended DCA strategy'
            },
            actionPlan: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: {
                    type: 'number',
                    description: 'Step number'
                  },
                  action: {
                    type: 'string',
                    description: 'Action description'
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Action priority'
                  },
                                     timeframe: {
                     type: 'string',
                     enum: ['immediate', 'short-term', 'long-term'],
                     description: 'Action timeframe'
                   },
                   ref: {
                     type: 'string',
                     description: 'Unique reference ID for bot execution'
                   },
                   dexAction: {
                     type: 'string',
                     enum: ['swap', 'add_liquidity', 'remove_liquidity', 'stake', 'setup'],
                     description: 'DEX action type'
                   },
                   tokenPair: {
                     type: 'string',
                     description: 'Token pair for the action'
                   },
                   amount: {
                     type: 'string',
                     description: 'Amount or percentage for the action'
                   },
                   network: {
                     type: 'string',
                     description: 'Blockchain network',
                     example: 'sei'
                   }
              }
            }
          },
          riskAssessment: {
            type: 'string',
            description: 'Risk analysis'
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of recommendations'
          },
          marketInsights: {
            type: 'string',
            description: 'Current market insights'
          },
          nextSteps: {
            type: 'string',
            description: 'What the user should do next'
          }
        },
        IntelligentAgentRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'Natural language description of investment goals and preferences',
              example: 'I want to start a conservative DCA strategy with $2000 monthly investing in Bitcoin and Ethereum for long-term holding. I prefer low-risk accumulation.',
              minLength: 10,
              maxLength: 2000
            },
            userId: {
              type: 'string',
              description: 'User ID (optional, defaults to anonymous)',
              example: 'user123'
            }
          }
        },
        ExtractedAgentParameters: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'AI-generated agent name based on user message',
              example: 'Conservative BTC-ETH DCA Agent'
            },
            description: {
              type: 'string',
              description: 'AI-generated description of the strategy',
              example: 'Conservative DCA strategy for long-term Bitcoin and Ethereum accumulation'
            },
            primaryStrategy: {
              type: 'string',
              enum: ['DCA', 'momentum_trading', 'swing_trading', 'hodl', 'arbitrage', 'scalping', 'memecoin', 'yield_farming', 'spot_trading', 'futures_trading', 'custom'],
              description: 'AI-selected primary trading strategy',
              example: 'DCA'
            },
            riskTolerance: {
              type: 'string',
              enum: ['conservative', 'moderate', 'aggressive'],
              description: 'AI-detected risk tolerance from user message',
              example: 'conservative'
            },
            defaultBudget: {
              type: 'number',
              description: 'AI-extracted or suggested budget amount in USD',
              example: 2000
            },
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              description: 'AI-recommended investment frequency',
              example: 'monthly'
            },
            preferredTokens: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['BTC', 'ETH', 'SEI', 'USDC', 'USDT', 'DAI']
              },
              description: 'AI-selected preferred tokens for trading',
              example: ['BTC', 'ETH', 'SEI']
            },
            maxPositionSize: {
              type: 'number',
              description: 'AI-calculated maximum position size in USD',
              example: 4000
            },
            stopLossPercentage: {
              type: 'number',
              description: 'AI-recommended stop loss percentage',
              example: 10
            },
            takeProfitPercentage: {
              type: 'number',
              description: 'AI-recommended take profit percentage',
              example: 20
            },
            customPrompt: {
              type: 'string',
              description: 'Custom instructions extracted from user message',
              example: 'Focus on long-term accumulation with conservative risk management'
            },
            extractedIntent: {
              type: 'string',
              description: 'AI-understanding of what the user wants to achieve',
              example: 'Long-term wealth building through systematic crypto accumulation'
            },
            suggestedActions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    description: 'Specific action description',
                    example: 'BUY $1200 worth of BTC for long-term holding'
                  },
                  actionType: {
                    type: 'string',
                    enum: ['BUY', 'SELL', 'HOLD', 'STAKE', 'SWAP', 'FARM', 'LEND', 'BORROW', 'BRIDGE', 'MINT', 'BURN'],
                    description: 'Type of trading action',
                    example: 'BUY'
                  },
                  tokenPair: {
                    type: 'string',
                    description: 'Trading pair for the action',
                    example: 'USDC/BTC'
                  },
                  percentage: {
                    type: 'string',
                    description: 'Percentage of budget for this action',
                    example: '60%'
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Action priority level',
                    example: 'high'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'AI explanation for why this action is recommended',
                    example: 'Bitcoin as primary store of value for conservative strategy'
                  }
                }
              },
              description: 'AI-generated list of specific actions to take'
            },
            marketInsights: {
              type: 'string',
              description: 'AI analysis of current market conditions relevant to the strategy',
              example: 'Current market conditions favor long-term accumulation strategies'
            },
            riskAssessment: {
              type: 'string',
              description: 'AI assessment of the strategy risk level',
              example: 'Conservative risk approach suitable for steady wealth building'
            }
          }
        },
        AgentMemoryReference: {
          type: 'object',
          properties: {
            defaultAgentMemory: {
              type: 'string',
              description: 'Memory ID for the default agent interaction',
              example: 'memory_id_1'
            },
            agentMemory: {
              type: 'string',
              description: 'Memory ID for the newly created agent',
              example: 'memory_id_2'
            }
          }
        },
        IntelligentAgentResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                agent: {
                  $ref: '#/components/schemas/Agent'
                },
                extractedParameters: {
                  $ref: '#/components/schemas/ExtractedAgentParameters'
                },
                memories: {
                  $ref: '#/components/schemas/AgentMemoryReference'
                },
                suggestedActions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      action: {
                        type: 'string',
                        example: 'BUY $1200 worth of BTC for long-term holding'
                      },
                      actionType: {
                        type: 'string',
                        example: 'BUY'
                      },
                      tokenPair: {
                        type: 'string',
                        example: 'USDC/BTC'
                      },
                      percentage: {
                        type: 'string',
                        example: '60%'
                      },
                      priority: {
                        type: 'string',
                        example: 'high'
                      },
                      reasoning: {
                        type: 'string',
                        example: 'Bitcoin as primary store of value'
                      }
                    }
                  }
                },
                marketInsights: {
                  type: 'string',
                  example: 'Current market conditions favor long-term accumulation strategies'
                },
                riskAssessment: {
                  type: 'string',
                  example: 'Conservative risk approach suitable for steady wealth building'
                },
                message: {
                  type: 'string',
                  example: 'Intelligent DCA agent created successfully using AI analysis'
                },
                note: {
                  type: 'string',
                  description: 'Optional note when fallback analysis is used',
                  example: 'Created using fallback analysis due to AI service issues'
                }
              }
            }
          }
        },
        Agent: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Agent ID',
              example: '60d5ecb54b5d4c001f3a8b25'
            },
            name: {
              type: 'string',
              description: 'Agent name',
              example: 'Conservative BTC-ETH DCA Agent'
            },
            description: {
              type: 'string',
              description: 'Agent description',
              example: 'Conservative DCA strategy for long-term accumulation'
            },
            userId: {
              type: 'string',
              description: 'User ID who owns the agent',
              example: 'user123'
            },
            primaryStrategy: {
              type: 'string',
              enum: ['DCA', 'momentum_trading', 'swing_trading', 'hodl', 'arbitrage', 'scalping', 'memecoin', 'yield_farming', 'spot_trading', 'futures_trading', 'custom'],
              description: 'Primary trading strategy',
              example: 'DCA'
            },
            configuration: {
              type: 'object',
              properties: {
                defaultBudget: {
                  type: 'number',
                  description: 'Default budget amount in USD',
                  example: 2000
                },
                frequency: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly'],
                  description: 'Investment frequency',
                  example: 'monthly'
                },
                riskTolerance: {
                  type: 'string',
                  enum: ['conservative', 'moderate', 'aggressive'],
                  description: 'Risk tolerance level',
                  example: 'conservative'
                },
                preferredTokens: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['BTC', 'ETH', 'SEI', 'USDC', 'USDT', 'DAI']
                  },
                  description: 'Preferred tokens for trading',
                  example: ['BTC', 'ETH', 'SEI']
                },
                maxPositionSize: {
                  type: 'number',
                  description: 'Maximum position size in USD',
                  example: 4000
                },
                stopLossPercentage: {
                  type: 'number',
                  description: 'Stop loss percentage',
                  example: 10
                },
                takeProfitPercentage: {
                  type: 'number',
                  description: 'Take profit percentage',
                  example: 20
                },
                customPrompt: {
                  type: 'string',
                  description: 'Custom strategy instructions',
                  example: 'Focus on long-term accumulation'
                }
              }
            }
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the agent is active',
              example: true
            },
            isApproved: {
              type: 'boolean',
              description: 'Whether the agent is approved to begin work',
              example: false
            },
            canBeginWork: {
              type: 'boolean',
              description: 'Whether the agent can begin trading work',
              example: false
            },
            walletId: {
              type: 'string',
              description: 'Associated wallet ID',
              example: '60d5ecb54b5d4c001f3a8b26'
            },
            walletAddress: {
              type: 'string',
              description: 'Associated wallet address',
              example: '0xE4c28c59FD0EFa18cB3b19F986cF16BB07214a88'
            },
            totalInteractions: {
              type: 'number',
              description: 'Total number of interactions',
              example: 0
            },
            totalBudgetManaged: {
              type: 'number',
              description: 'Total budget managed by agent',
              example: 0
            },
            lastInteraction: {
              type: 'string',
              format: 'date-time',
              description: 'Last interaction timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Agent creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Agent last update timestamp'
            }
          }
        },
        GeneratedStrategy: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'AI-generated agent name',
              example: 'MemeCoin Alpha Hunter'
            },
            description: {
              type: 'string',
              description: 'Strategy description',
              example: 'Aggressive memecoin strategy focusing on emerging tokens'
            },
            primaryStrategy: {
              type: 'string',
              enum: ['DCA', 'momentum_trading', 'swing_trading', 'hodl', 'arbitrage', 'scalping', 'memecoin', 'yield_farming', 'spot_trading', 'futures_trading', 'custom'],
              description: 'Primary trading strategy',
              example: 'memecoin'
            },
            riskTolerance: {
              type: 'string',
              enum: ['conservative', 'moderate', 'aggressive'],
              description: 'Risk tolerance level',
              example: 'aggressive'
            },
            defaultBudget: {
              type: 'number',
              description: 'Suggested budget amount',
              example: 2000
            },
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              description: 'Optimal trading frequency',
              example: 'daily'
            },
            portfolioAllocation: {
              type: 'object',
              description: 'Token allocation strategy',
              additionalProperties: {
                type: 'object',
                properties: {
                  symbol: {
                    type: 'string',
                    example: 'DOGE'
                  },
                  percentage: {
                    type: 'string',
                    example: '40%'
                  },
                  reasoning: {
                    type: 'string',
                    example: 'Established memecoin with strong community'
                  }
                }
              }
            },
            maxPositionSize: {
              type: 'number',
              description: 'Maximum position size',
              example: 4000
            },
            stopLossPercentage: {
              type: 'number',
              description: 'Stop loss percentage',
              example: 15
            },
            takeProfitPercentage: {
              type: 'number',
              description: 'Take profit percentage',
              example: 50
            },
            portfolioManagementPlan: {
              type: 'object',
              properties: {
                initialSetup: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      step: {
                        type: 'number',
                        example: 1
                      },
                      action: {
                        type: 'string',
                        example: 'Buy initial DOGE position'
                      },
                      actionType: {
                        type: 'string',
                        enum: ['BUY', 'SELL', 'HOLD', 'STAKE', 'SWAP', 'FARM', 'LEND', 'BORROW', 'BRIDGE', 'MINT', 'BURN'],
                        example: 'BUY'
                      },
                      tokenPair: {
                        type: 'string',
                        example: 'USDC/DOGE'
                      },
                      percentage: {
                        type: 'string',
                        example: '40%'
                      },
                      priority: {
                        type: 'string',
                        enum: ['high', 'medium', 'low'],
                        example: 'high'
                      },
                      reasoning: {
                        type: 'string',
                        example: 'Establish core memecoin position'
                      }
                    }
                  }
                },
                monitoringFrequency: {
                  type: 'string',
                  example: 'hourly'
                },
                rebalancingRules: {
                  type: 'object',
                  description: 'Rules for portfolio rebalancing'
                }
              }
            },
            marketInsights: {
              type: 'string',
              description: 'Current market analysis'
            },
            riskAssessment: {
              type: 'string',
              description: 'Risk analysis for the strategy'
            },
            strategyAdvantages: {
              type: 'string',
              description: 'Strategy advantages'
            },
            potentialDrawbacks: {
              type: 'string',
              description: 'Potential strategy limitations'
            },
            successMetrics: {
              type: 'string',
              description: 'Success measurement criteria'
            }
          }
        },
        ApprovalStatus: {
          type: 'object',
          properties: {
            isApproved: {
              type: 'boolean',
              description: 'Whether the agent is approved',
              example: false
            },
            canBeginWork: {
              type: 'boolean',
              description: 'Whether the agent can begin work',
              example: false
            },
            requiresApproval: {
              type: 'boolean',
              description: 'Whether approval is required',
              example: true
            },
            note: {
              type: 'string',
              description: 'Additional approval information',
              example: 'Agent requires approval before starting work'
            }
          }
        },
        WalletInfo: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Wallet address',
              example: '0xE4c28c59FD0EFa18cB3b19F986cF16BB07214a88'
            },
            walletId: {
              type: 'string',
              description: 'Wallet ID',
              example: '60d5ecb54b5d4c001f3a8b26'
            },
            network: {
              type: 'string',
              description: 'Blockchain network',
              example: 'sei'
            },
            status: {
              type: 'string',
              enum: ['created', 'pending', 'failed'],
              description: 'Wallet creation status',
              example: 'created'
            }
          }
        },
        CryptoPrice: {
          type: 'object',
          properties: {
            price: {
              type: 'number',
              description: 'Current price'
            },
            change24h: {
              type: 'number',
              description: '24-hour price change percentage'
            },
            marketCap: {
              type: 'number',
              description: 'Market capitalization'
            },
            network: {
              type: 'string',
              description: 'Blockchain network',
              example: 'sei'
            },
            type: {
              type: 'string',
              enum: ['native', 'wrapped', 'stablecoin'],
              description: 'Token type'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: {
                    type: 'string',
                    description: 'Error message'
                  },
                  param: {
                    type: 'string',
                    description: 'Parameter that caused the error'
                  }
                }
              }
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './index.js'], // Path to the API files
};

const specs = swaggerJSDoc(options);

module.exports = specs; 