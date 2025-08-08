const express = require('express');
const router = express.Router();
const ExecutorAgent = require('../models/ExecutorAgent');
const Strategy = require('../models/Strategy');
const actionExecutionService = require('../services/actionExecutionService');

/**
 * @swagger
 * /api/executor-agents:
 *   get:
 *     summary: Get all executor agents for a user
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [created, configured, active, paused, stopped, error]
 *         description: Filter by agent status
 *     responses:
 *       200:
 *         description: List of executor agents
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    const agents = await ExecutorAgent.find(filter)
      .populate('linkedStrategyId', 'agentName primaryStrategy riskTolerance executionStatus')
      .populate('parentAgentId', 'name description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: agents,
      count: agents.length
    });

  } catch (error) {
    console.error('Error fetching executor agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch executor agents',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/executor-agents/{id}:
 *   get:
 *     summary: Get executor agent by ID
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Executor agent ID
 *     responses:
 *       200:
 *         description: Executor agent details
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const agent = await ExecutorAgent.findById(req.params.id)
      .populate('linkedStrategyId')
      .populate('parentAgentId')
      .populate('userId', 'name email');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Executor agent not found'
      });
    }

    res.json({
      success: true,
      data: agent
    });

  } catch (error) {
    console.error('Error fetching executor agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch executor agent',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/executor-agents/{id}/status:
 *   patch:
 *     summary: Update executor agent status
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Executor agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [created, configured, active, paused, stopped, error]
 *               autoExecute:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, autoExecute } = req.body;
    const agentId = req.params.id;

    const updateData = {};
    if (status) updateData.status = status;
    if (autoExecute !== undefined) updateData['executionSettings.autoExecute'] = autoExecute;

    const agent = await ExecutorAgent.findByIdAndUpdate(
      agentId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Executor agent not found'
      });
    }

    res.json({
      success: true,
      data: agent,
      message: `Agent status updated to ${status || 'unchanged'}`
    });

  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent status',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/executor-agents/{id}/execute-task:
 *   post:
 *     summary: Execute a specific task
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Executor agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskId:
 *                 type: string
 *               dryRun:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Task execution result
 *       404:
 *         description: Agent or task not found
 *       500:
 *         description: Server error
 */
router.post('/:id/execute-task', async (req, res) => {
  try {
    const { taskId, dryRun = true } = req.body;
    const agentId = req.params.id;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'taskId is required'
      });
    }

    const result = await actionExecutionService.executeTask(agentId, taskId, dryRun);

    res.json({
      success: true,
      data: result,
      message: `Task ${dryRun ? 'simulation' : 'execution'} completed`
    });

  } catch (error) {
    console.error('Error executing task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute task',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/executor-agents/{id}/monitor:
 *   post:
 *     summary: Monitor market and execute ready tasks
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Executor agent ID
 *     responses:
 *       200:
 *         description: Monitoring result
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.post('/:id/monitor', async (req, res) => {
  try {
    const agentId = req.params.id;
    
    const result = await actionExecutionService.monitorAndExecute(agentId);

    res.json({
      success: true,
      data: result,
      message: 'Market monitoring completed'
    });

  } catch (error) {
    console.error('Error monitoring market:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to monitor market',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/executor-agents/{id}/strategy:
 *   get:
 *     summary: Get linked strategy with action plan
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Executor agent ID
 *     responses:
 *       200:
 *         description: Strategy and action plan
 *       404:
 *         description: Agent or strategy not found
 *       500:
 *         description: Server error
 */
router.get('/:id/strategy', async (req, res) => {
  try {
    const agent = await ExecutorAgent.findById(req.params.id)
      .populate('linkedStrategyId');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Executor agent not found'
      });
    }

    if (!agent.linkedStrategyId) {
      return res.status(404).json({
        success: false,
        message: 'No strategy linked to this agent'
      });
    }

    const strategy = agent.linkedStrategyId;

    res.json({
      success: true,
      data: {
        strategy: {
          id: strategy._id,
          name: strategy.agentName,
          primaryStrategy: strategy.primaryStrategy,
          riskTolerance: strategy.riskTolerance,
          executionStatus: strategy.executionStatus,
          actionPlan: strategy.actionPlan,
          marketDataSnapshot: strategy.marketDataSnapshot,
          executionMetrics: strategy.executionMetrics
        },
        agent: {
          id: agent._id,
          name: agent.name,
          status: agent.status,
          executionState: agent.executionState,
          capabilities: agent.capabilities
        }
      }
    });

  } catch (error) {
    console.error('Error fetching strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch strategy',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/executor-agents/{id}/performance:
 *   get:
 *     summary: Get executor agent performance metrics
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Executor agent ID
 *     responses:
 *       200:
 *         description: Performance metrics
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/:id/performance', async (req, res) => {
  try {
    const agent = await ExecutorAgent.findById(req.params.id)
      .select('performance executionState.metrics name status');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Executor agent not found'
      });
    }

    res.json({
      success: true,
      data: {
        agentInfo: {
          id: agent._id,
          name: agent.name,
          status: agent.status
        },
        performance: agent.performance,
        executionMetrics: agent.executionState.metrics,
        summary: {
          successRate: agent.executionState.metrics.uptime || 0,
          totalExecutions: agent.executionState.metrics.totalTasksExecuted || 0,
          profitLoss: agent.performance.totalProfitLoss || 0,
          winRate: agent.performance.winRate || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/executor-agents/{id}/tasks:
 *   get:
 *     summary: Get all tasks for the agent's strategy
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Executor agent ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, scheduled, executed, failed, cancelled]
 *         description: Filter tasks by status
 *     responses:
 *       200:
 *         description: List of tasks
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/:id/tasks', async (req, res) => {
  try {
    const { status } = req.query;
    
    const agent = await ExecutorAgent.findById(req.params.id)
      .populate('linkedStrategyId');

    if (!agent || !agent.linkedStrategyId) {
      return res.status(404).json({
        success: false,
        message: 'Agent or linked strategy not found'
      });
    }

    const strategy = agent.linkedStrategyId;
    const allTasks = [];

    if (strategy.actionPlan && strategy.actionPlan.phases) {
      strategy.actionPlan.phases.forEach(phase => {
        if (phase.tasks) {
          phase.tasks.forEach(task => {
            allTasks.push({
              ...task,
              phaseNumber: phase.phaseNumber,
              phaseName: phase.phaseName,
              phaseDuration: phase.duration
            });
          });
        }
      });
    }

    // Filter by status if provided
    const filteredTasks = status ? 
      allTasks.filter(task => task.status === status) : 
      allTasks;

    res.json({
      success: true,
      data: {
        tasks: filteredTasks,
        summary: {
          total: allTasks.length,
          pending: allTasks.filter(t => t.status === 'pending').length,
          executed: allTasks.filter(t => t.status === 'executed').length,
          failed: allTasks.filter(t => t.status === 'failed').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/executor-agents/{id}:
 *   delete:
 *     summary: Delete executor agent
 *     tags: [ExecutorAgents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Executor agent ID
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const agent = await ExecutorAgent.findByIdAndDelete(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Executor agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Executor agent deleted successfully',
      data: { id: agent._id, name: agent.name }
    });

  } catch (error) {
    console.error('Error deleting executor agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete executor agent',
      error: error.message
    });
  }
});

module.exports = router;
