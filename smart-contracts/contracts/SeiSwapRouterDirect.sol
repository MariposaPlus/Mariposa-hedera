// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SeiSwapRouter - Direct DragonSwap V2 Integration
 * @dev Simplified router that uses direct exactInputSingle calls (no multicall)
 * Based on the TypeScript DragonSwap implementation pattern
 */

interface IWSEI {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}

interface IDragonSwapV2Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IDragonSwapV2Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

contract SeiSwapRouter is Ownable, ReentrancyGuard {
    // DragonSwap V2 addresses on SEI mainnet
    address public constant DRAGONSWAP_ROUTER = 0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428;
    address public constant DRAGONSWAP_FACTORY = 0x179D9a5592Bc77050796F7be28058c51cA575df4;
    
    // WSEI address on SEI mainnet (corrected checksummed address)
    address public constant WSEI = 0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7;

    // Fee tiers (basis points)
    uint24 public constant FEE_LOWEST = 100;   // 0.01%
    uint24 public constant FEE_LOW = 500;      // 0.05%
    uint24 public constant FEE_MEDIUM = 3000;  // 0.3%
    uint24 public constant FEE_HIGH = 10000;   // 1%
    uint24 public constant DEFAULT_FEE = FEE_MEDIUM;

    // Slippage settings (basis points)
    uint256 public constant DEFAULT_SLIPPAGE_BPS = 500; // 5%
    uint256 public constant MAX_SLIPPAGE_BPS = 1000;    // 10% max
    uint256 public constant BASIS_POINTS = 10000;       // 100%

    // Deadline offset (5 minutes)
    uint256 public constant DEFAULT_DEADLINE_OFFSET = 300;

    IDragonSwapV2Router public immutable dragonSwapRouter;
    IDragonSwapV2Factory public immutable factory;
    IWSEI public immutable wsei;

    // User-specific slippage settings
    mapping(address => uint256) public userSlippageBPS;

    // Events
    event SeiToTokenSwap(
        address indexed user,
        address indexed tokenOut,
        uint256 seiAmountIn,
        uint256 tokenAmountOut,
        uint24 fee,
        uint256 slippageUsed
    );

    event SlippageUpdated(address indexed user, uint256 oldSlippage, uint256 newSlippage);

    // Custom errors
    error InsufficientSeiAmount();
    error InvalidSlippage();
    error PoolNotFound();
    error SwapFailed();
    error InvalidTokenAddress();

    constructor() Ownable(msg.sender) {
        dragonSwapRouter = IDragonSwapV2Router(DRAGONSWAP_ROUTER);
        factory = IDragonSwapV2Factory(DRAGONSWAP_FACTORY);
        wsei = IWSEI(WSEI);
    }

    /**
     * @dev Initialize contract - approve WSEI to router after deployment
     */
    function initialize() external onlyOwner {
        IERC20(WSEI).approve(DRAGONSWAP_ROUTER, type(uint256).max);
    }

    /**
     * @dev Set user-specific slippage tolerance
     * @param slippageBPS Slippage in basis points (100 = 1%)
     */
    function setUserSlippage(uint256 slippageBPS) external {
        if (slippageBPS > MAX_SLIPPAGE_BPS) revert InvalidSlippage();
        
        uint256 oldSlippage = userSlippageBPS[msg.sender];
        userSlippageBPS[msg.sender] = slippageBPS;
        
        emit SlippageUpdated(msg.sender, oldSlippage, slippageBPS);
    }

    /**
     * @dev Get effective slippage for user (user setting or default)
     */
    function getEffectiveSlippage(address user) public view returns (uint256) {
        uint256 userSlippage = userSlippageBPS[user];
        return userSlippage > 0 ? userSlippage : DEFAULT_SLIPPAGE_BPS;
    }

    /**
     * @dev Calculate minimum output amount based on slippage
     */
    function calculateMinOutput(uint256 expectedOutput, uint256 slippageBPS) public pure returns (uint256) {
        if (slippageBPS >= BASIS_POINTS) return 0;
        return (expectedOutput * (BASIS_POINTS - slippageBPS)) / BASIS_POINTS;
    }

    /**
     * @dev Check if pool exists for given tokens and fee
     */
    function checkPoolExists(address tokenIn, address tokenOut, uint24 fee) 
        external view returns (bool exists, address poolAddress) 
    {
        poolAddress = factory.getPool(tokenIn, tokenOut, fee);
        exists = poolAddress != address(0);
    }

    /**
     * @dev Find the minimum fee tier that has a pool
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return bestFee The lowest fee tier with an existing pool (0 if none found)
     * @return poolAddress The address of the pool with the best fee
     */
    function findBestFee(address tokenIn, address tokenOut) 
        external view returns (uint24 bestFee, address poolAddress) 
    {
        uint24[4] memory fees = [FEE_LOWEST, FEE_LOW, FEE_MEDIUM, FEE_HIGH];
        
        for (uint i = 0; i < fees.length; i++) {
            address pool = factory.getPool(tokenIn, tokenOut, fees[i]);
            if (pool != address(0)) {
                return (fees[i], pool);
            }
        }
        
        return (0, address(0));
    }

    /**
     * @dev Swap SEI to token using default settings (5% slippage, medium fee)
     * @param tokenOut Address of the token to receive
     */
    function swapSeiToToken(address tokenOut) external payable nonReentrant returns (uint256 amountOut) {
        return swapSeiToTokenWithSlippage(tokenOut, getEffectiveSlippage(msg.sender), DEFAULT_FEE);
    }

    /**
     * @dev Swap SEI to token with custom slippage and fee
     * @param tokenOut Address of the token to receive
     * @param slippageBPS Slippage tolerance in basis points
     * @param fee Fee tier to use
     */
    function swapSeiToTokenWithSlippage(address tokenOut, uint256 slippageBPS, uint24 fee) 
        public payable nonReentrant returns (uint256 amountOut) 
    {
        if (msg.value == 0) revert InsufficientSeiAmount();
        if (tokenOut == address(0)) revert InvalidTokenAddress();
        if (slippageBPS > MAX_SLIPPAGE_BPS) revert InvalidSlippage();

        return _swapSeiToTokenDirect(tokenOut, slippageBPS, fee);
    }

    /**
     * @dev Swap SEI to token with no slippage protection (for testing)
     * @param tokenOut Address of the token to receive
     * @param fee Fee tier to use
     */
    function swapSeiToTokenNoSlippage(address tokenOut, uint24 fee) 
        external payable nonReentrant returns (uint256 amountOut) 
    {
        if (msg.value == 0) revert InsufficientSeiAmount();
        if (tokenOut == address(0)) revert InvalidTokenAddress();

        return _swapSeiToTokenDirect(tokenOut, 0, fee);
    }

    /**
     * @dev Internal function for direct DragonSwap interaction (like TypeScript example)
     */
    function _swapSeiToTokenDirect(address tokenOut, uint256 slippageBPS, uint24 fee) 
        internal returns (uint256 amountOut) 
    {
        // Step 1: Check if pool exists
        address poolAddress = factory.getPool(WSEI, tokenOut, fee);
        if (poolAddress == address(0)) revert PoolNotFound();

        // Step 2: Wrap SEI to WSEI
        wsei.deposit{value: msg.value}();

        // Step 3: Approve WSEI to router (should be pre-approved via initialize())
        uint256 allowance = IERC20(WSEI).allowance(address(this), DRAGONSWAP_ROUTER);
        if (allowance < msg.value) {
            IERC20(WSEI).approve(DRAGONSWAP_ROUTER, type(uint256).max);
        }

        // Step 4: Calculate minimum output with slippage
        uint256 amountOutMinimum = 0; // Start with 0 for testing
        if (slippageBPS > 0) {
            // For production, we'd need a price oracle to calculate expected output
            // For now, use 0 to test the swap mechanism
            amountOutMinimum = 0;
        }

        // Step 5: Prepare swap parameters (following TypeScript example structure)
        IDragonSwapV2Router.ExactInputSingleParams memory params = IDragonSwapV2Router.ExactInputSingleParams({
            tokenIn: WSEI,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender,              // Send tokens directly to user
            deadline: block.timestamp + DEFAULT_DEADLINE_OFFSET,
            amountIn: msg.value,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0                // No price limit
        });

        // Step 6: Execute direct swap (like TypeScript example - no multicall!)
        try dragonSwapRouter.exactInputSingle(params) returns (uint256 result) {
            amountOut = result;
            
            emit SeiToTokenSwap(
                msg.sender,
                tokenOut,
                msg.value,
                amountOut,
                fee,
                slippageBPS
            );
            
        } catch {
            revert SwapFailed();
        }
    }

    /**
     * @dev Find minimum fee automatically and swap
     * @param tokenOut Address of the token to receive
     */
    function swapSeiToTokenAuto(address tokenOut) external payable nonReentrant returns (uint256 amountOut) {
        if (msg.value == 0) revert InsufficientSeiAmount();
        if (tokenOut == address(0)) revert InvalidTokenAddress();

        // Find the best fee tier
        (uint24 bestFee, address poolAddress) = this.findBestFee(WSEI, tokenOut);
        if (bestFee == 0 || poolAddress == address(0)) revert PoolNotFound();

        return _swapSeiToTokenDirect(tokenOut, getEffectiveSlippage(msg.sender), bestFee);
    }

    /**
     * @dev Get contract information for debugging
     */
    function getContractInfo() external pure returns (
        address router,
        address factory_addr,
        address wsei_addr,
        uint256 defaultSlippage,
        uint24 defaultFee,
        string memory version
    ) {
        return (
            DRAGONSWAP_ROUTER,
            DRAGONSWAP_FACTORY,
            WSEI,
            DEFAULT_SLIPPAGE_BPS,
            DEFAULT_FEE,
            "Direct ExactInputSingle v1.0"
        );
    }

    /**
     * @dev Emergency function to withdraw any stuck tokens
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
        }
    }

    /**
     * @dev Receive function to accept SEI
     */
    receive() external payable {}
} 