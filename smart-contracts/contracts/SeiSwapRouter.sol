// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interface for DragonSwap V2 Router (based on the provided contract)
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

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);

    function exactInput(ExactInputParams calldata params)
        external
        payable
        returns (uint256 amountOut);

    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external
        payable
        returns (uint256 amountIn);
}

// Interface for DragonSwap V2 Factory
interface IDragonSwapV2Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
}

// Interface for WSEI (Wrapped SEI)
interface IWSEI {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}

/**
 * @title SeiSwapRouter
 * @dev A simplified wrapper contract for DragonSwap V2 Router on SEI network
 * @notice Provides easy-to-use functions for swapping SEI and ERC20 tokens
 */
contract SeiSwapRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // DragonSwap V2 Router address on SEI mainnet
    address public constant DRAGONSWAP_ROUTER = 0x11DA6463D6Cb5a03411Dbf5ab6f6bc3997Ac7428;
    
    // DragonSwap V2 Factory address on SEI mainnet
    address public constant DRAGONSWAP_FACTORY = 0x179D9a5592Bc77050796F7be28058c51cA575df4;
    
    // WSEI address on SEI mainnet
    address public constant WSEI = 0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7;
    
    // Default fee tier (0.3%)
    uint24 public constant DEFAULT_FEE = 3000;
    
    // Default deadline offset (20 minutes)
    uint256 public constant DEFAULT_DEADLINE_OFFSET = 1200;

    // Available fee tiers (in basis points: 100 = 0.01%, 500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
    uint24[4] public FEE_TIERS = [100, 500, 3000, 10000];

    IDragonSwapV2Router private immutable dragonSwapRouter;
    IDragonSwapV2Factory private immutable dragonSwapFactory;
    IWSEI private immutable wsei;

    // Events
    event SeiToTokenSwap(
        address indexed user,
        address indexed tokenOut,
        uint256 seiAmountIn,
        uint256 tokenAmountOut,
        uint24 fee
    );

    event TokenToSeiSwap(
        address indexed user,
        address indexed tokenIn,
        uint256 tokenAmountIn,
        uint256 seiAmountOut,
        uint24 fee
    );

    event TokenToTokenSwap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 tokenAmountIn,
        uint256 tokenAmountOut,
        uint24 fee
    );

    event PoolFound(
        address indexed tokenA,
        address indexed tokenB,
        uint24 fee,
        address poolAddress
    );

    // Custom errors
    error InsufficientOutput();
    error SwapFailed();
    error InvalidAmount();
    error InvalidToken();
    error DeadlineExceeded();
    error NoPoolExists();
    error InsufficientAllowance();

    constructor() Ownable(msg.sender) {
        dragonSwapRouter = IDragonSwapV2Router(DRAGONSWAP_ROUTER);
        dragonSwapFactory = IDragonSwapV2Factory(DRAGONSWAP_FACTORY);
        wsei = IWSEI(WSEI);
    }

    /**
     * @dev Initialize the contract by approving WSEI to router
     * @notice Call this after deployment to set up approvals
     */
    function initialize() external onlyOwner {
        // Approve WSEI to router for gas efficiency
        IERC20(WSEI).approve(DRAGONSWAP_ROUTER, type(uint256).max);
    }

    /**
     * @dev Find the minimum fee tier for a token pair that has an existing pool
     * @param tokenIn The address of the input token
     * @param tokenOut The address of the output token
     * @return minFee The minimum fee tier, or 0 if no pool exists
     */
    function findMinFee(address tokenIn, address tokenOut) external view returns (uint24 minFee) {
        for (uint256 i = 0; i < 4; i++) {
            address poolAddress = dragonSwapFactory.getPool(tokenIn, tokenOut, FEE_TIERS[i]);
            if (poolAddress != address(0)) {
                return FEE_TIERS[i];
            }
        }
        return 0; // No pool found
    }

    /**
     * @dev Find the pool address for a specific token pair and fee
     * @param tokenIn The address of the input token
     * @param tokenOut The address of the output token
     * @param fee The fee tier
     * @return poolAddress The address of the pool, or address(0) if no pool exists
     */
    function findPool(address tokenIn, address tokenOut, uint24 fee) external view returns (address poolAddress) {
        return dragonSwapFactory.getPool(tokenIn, tokenOut, fee);
    }

    /**
     * @dev Get all available pools for a token pair
     * @param tokenIn The address of the input token
     * @param tokenOut The address of the output token
     * @return pools Array of pool addresses for each fee tier
     * @return fees Array of corresponding fee tiers
     */
    function getAllPools(address tokenIn, address tokenOut) 
        external 
        view 
        returns (address[] memory pools, uint24[] memory fees) 
    {
        pools = new address[](4);
        fees = new uint24[](4);
        
        for (uint256 i = 0; i < 4; i++) {
            pools[i] = dragonSwapFactory.getPool(tokenIn, tokenOut, FEE_TIERS[i]);
            fees[i] = FEE_TIERS[i];
        }
    }

    /**
     * @dev Swap SEI for ERC20 token with automatic fee detection
     * @param tokenOut Address of the token to receive
     * @param amountOutMinimum Minimum amount of tokens to receive
     * @return amountOut Amount of tokens received
     */
    function swapSeiToToken(
        address tokenOut,
        uint256 amountOutMinimum
    ) external payable nonReentrant returns (uint256 amountOut) {
        if (msg.value == 0) revert InvalidAmount();
        if (tokenOut == address(0) || tokenOut == WSEI) revert InvalidToken();

        // Find the minimum fee tier for this pair
        uint24 fee = this.findMinFee(WSEI, tokenOut);
        if (fee == 0) revert NoPoolExists();

        return _swapSeiToToken(tokenOut, amountOutMinimum, fee);
    }

    /**
     * @dev Swap SEI for ERC20 token with specific fee
     * @param tokenOut Address of the token to receive
     * @param amountOutMinimum Minimum amount of tokens to receive
     * @param fee Pool fee tier (100 = 0.01%, 500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
     * @return amountOut Amount of tokens received
     */
    function swapSeiToTokenWithFee(
        address tokenOut,
        uint256 amountOutMinimum,
        uint24 fee
    ) external payable nonReentrant returns (uint256 amountOut) {
        if (msg.value == 0) revert InvalidAmount();
        if (tokenOut == address(0) || tokenOut == WSEI) revert InvalidToken();

        // Verify pool exists
        address poolAddress = dragonSwapFactory.getPool(WSEI, tokenOut, fee);
        if (poolAddress == address(0)) revert NoPoolExists();

        return _swapSeiToToken(tokenOut, amountOutMinimum, fee);
    }

    /**
     * @dev Internal function to swap SEI for ERC20 token
     */
    function _swapSeiToToken(
        address tokenOut,
        uint256 amountOutMinimum,
        uint24 fee
    ) internal returns (uint256 amountOut) {
        // Wrap SEI to WSEI
        wsei.deposit{value: msg.value}();

        // Approve WSEI to router if not already done
        uint256 currentAllowance = IERC20(WSEI).allowance(address(this), DRAGONSWAP_ROUTER);
        if (currentAllowance < msg.value) {
            IERC20(WSEI).approve(DRAGONSWAP_ROUTER, type(uint256).max);
        }

        // Prepare swap parameters
        IDragonSwapV2Router.ExactInputSingleParams memory params = IDragonSwapV2Router
            .ExactInputSingleParams({
                tokenIn: WSEI,
                tokenOut: tokenOut,
                fee: fee,
                recipient: msg.sender,
                deadline: block.timestamp + DEFAULT_DEADLINE_OFFSET,
                amountIn: msg.value,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        // Execute swap
        try dragonSwapRouter.exactInputSingle(params) returns (uint256 _amountOut) {
            amountOut = _amountOut;
            emit SeiToTokenSwap(msg.sender, tokenOut, msg.value, amountOut, fee);
        } catch {
            // If swap fails, return SEI to user
            wsei.withdraw(msg.value);
            payable(msg.sender).transfer(msg.value);
            revert SwapFailed();
        }
    }

    /**
     * @dev Swap ERC20 token for SEI with automatic fee detection
     * @param tokenIn Address of the token to swap
     * @param amountIn Amount of tokens to swap
     * @param amountOutMinimum Minimum amount of SEI to receive
     * @return amountOut Amount of SEI received
     */
    function swapTokenToSei(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();
        if (tokenIn == address(0) || tokenIn == WSEI) revert InvalidToken();

        // Find the minimum fee tier for this pair
        uint24 fee = this.findMinFee(tokenIn, WSEI);
        if (fee == 0) revert NoPoolExists();

        return _swapTokenToSei(tokenIn, amountIn, amountOutMinimum, fee);
    }

    /**
     * @dev Swap ERC20 token for SEI with specific fee
     * @param tokenIn Address of the token to swap
     * @param amountIn Amount of tokens to swap
     * @param amountOutMinimum Minimum amount of SEI to receive
     * @param fee Pool fee tier
     * @return amountOut Amount of SEI received
     */
    function swapTokenToSeiWithFee(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 fee
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();
        if (tokenIn == address(0) || tokenIn == WSEI) revert InvalidToken();

        // Verify pool exists
        address poolAddress = dragonSwapFactory.getPool(tokenIn, WSEI, fee);
        if (poolAddress == address(0)) revert NoPoolExists();

        return _swapTokenToSei(tokenIn, amountIn, amountOutMinimum, fee);
    }

    /**
     * @dev Internal function to swap ERC20 token for SEI
     */
    function _swapTokenToSei(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 fee
    ) internal returns (uint256 amountOut) {
        // Check allowance
        uint256 allowance = IERC20(tokenIn).allowance(msg.sender, address(this));
        if (allowance < amountIn) revert InsufficientAllowance();

        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve router if needed
        uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), DRAGONSWAP_ROUTER);
        if (currentAllowance < amountIn) {
            IERC20(tokenIn).approve(DRAGONSWAP_ROUTER, type(uint256).max);
        }

        // Prepare swap parameters
        IDragonSwapV2Router.ExactInputSingleParams memory params = IDragonSwapV2Router
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: WSEI,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp + DEFAULT_DEADLINE_OFFSET,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        // Execute swap
        try dragonSwapRouter.exactInputSingle(params) returns (uint256 wSeiReceived) {
            // Unwrap WSEI to SEI and send to user
            wsei.withdraw(wSeiReceived);
            payable(msg.sender).transfer(wSeiReceived);
            
            amountOut = wSeiReceived;
            emit TokenToSeiSwap(msg.sender, tokenIn, amountIn, amountOut, fee);
        } catch {
            // If swap fails, return tokens to user
            IERC20(tokenIn).safeTransfer(msg.sender, amountIn);
            revert SwapFailed();
        }
    }

    /**
     * @dev Swap one ERC20 token for another with automatic fee detection
     * @param tokenIn Address of the token to swap
     * @param tokenOut Address of the token to receive
     * @param amountIn Amount of tokens to swap
     * @param amountOutMinimum Minimum amount of tokens to receive
     * @return amountOut Amount of tokens received
     */
    function swapTokenToToken(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidToken();
        if (tokenIn == tokenOut) revert InvalidToken();

        // Find the minimum fee tier for this pair
        uint24 fee = this.findMinFee(tokenIn, tokenOut);
        if (fee == 0) revert NoPoolExists();

        return _swapTokenToToken(tokenIn, tokenOut, amountIn, amountOutMinimum, fee);
    }

    /**
     * @dev Swap one ERC20 token for another with specific fee
     * @param tokenIn Address of the token to swap
     * @param tokenOut Address of the token to receive
     * @param amountIn Amount of tokens to swap
     * @param amountOutMinimum Minimum amount of tokens to receive
     * @param fee Pool fee tier
     * @return amountOut Amount of tokens received
     */
    function swapTokenToTokenWithFee(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 fee
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidToken();
        if (tokenIn == tokenOut) revert InvalidToken();

        // Verify pool exists
        address poolAddress = dragonSwapFactory.getPool(tokenIn, tokenOut, fee);
        if (poolAddress == address(0)) revert NoPoolExists();

        return _swapTokenToToken(tokenIn, tokenOut, amountIn, amountOutMinimum, fee);
    }

    /**
     * @dev Internal function to swap one ERC20 token for another
     */
    function _swapTokenToToken(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 fee
    ) internal returns (uint256 amountOut) {
        // Check allowance
        uint256 allowance = IERC20(tokenIn).allowance(msg.sender, address(this));
        if (allowance < amountIn) revert InsufficientAllowance();

        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve router if needed
        uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), DRAGONSWAP_ROUTER);
        if (currentAllowance < amountIn) {
            IERC20(tokenIn).approve(DRAGONSWAP_ROUTER, type(uint256).max);
        }

        // Prepare swap parameters
        IDragonSwapV2Router.ExactInputSingleParams memory params = IDragonSwapV2Router
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: msg.sender,
                deadline: block.timestamp + DEFAULT_DEADLINE_OFFSET,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        // Execute swap
        try dragonSwapRouter.exactInputSingle(params) returns (uint256 _amountOut) {
            amountOut = _amountOut;
            emit TokenToTokenSwap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee);
        } catch {
            // If swap fails, return tokens to user
            IERC20(tokenIn).safeTransfer(msg.sender, amountIn);
            revert SwapFailed();
        }
    }

    /**
     * @dev Execute exactOutputSingle swap - swap as little as possible for exact output
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token
     * @param amountOut Exact amount of output tokens desired
     * @param amountInMaximum Maximum amount of input tokens to spend
     * @param fee Pool fee tier
     * @return amountIn Actual amount of input tokens spent
     */
    function exactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 amountInMaximum,
        uint24 fee
    ) external payable nonReentrant returns (uint256 amountIn) {
        if (amountOut == 0 || amountInMaximum == 0) revert InvalidAmount();
        
        // Handle SEI input
        if (msg.value > 0) {
            if (tokenIn != WSEI) revert InvalidToken();
            if (msg.value < amountInMaximum) revert InvalidAmount();
            
            // Wrap SEI to WSEI
            wsei.deposit{value: amountInMaximum}();
            
            // Approve WSEI to router
            uint256 currentAllowance = IERC20(WSEI).allowance(address(this), DRAGONSWAP_ROUTER);
            if (currentAllowance < amountInMaximum) {
                IERC20(WSEI).approve(DRAGONSWAP_ROUTER, type(uint256).max);
            }
        } else {
            // Handle ERC20 input
            if (tokenIn == address(0)) revert InvalidToken();
            
            // Check allowance
            uint256 allowance = IERC20(tokenIn).allowance(msg.sender, address(this));
            if (allowance < amountInMaximum) revert InsufficientAllowance();
            
            // Transfer tokens from user
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountInMaximum);
            
            // Approve router
            uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), DRAGONSWAP_ROUTER);
            if (currentAllowance < amountInMaximum) {
                IERC20(tokenIn).approve(DRAGONSWAP_ROUTER, type(uint256).max);
            }
        }

        // Prepare swap parameters
        IDragonSwapV2Router.ExactOutputSingleParams memory params = IDragonSwapV2Router
            .ExactOutputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee == 0 ? DEFAULT_FEE : fee,
                recipient: msg.sender,
                deadline: block.timestamp + DEFAULT_DEADLINE_OFFSET,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum,
                sqrtPriceLimitX96: 0
            });

        // Execute swap
        try dragonSwapRouter.exactOutputSingle(params) returns (uint256 _amountIn) {
            amountIn = _amountIn;
            
            // Return unused tokens/SEI
            uint256 refundAmount = amountInMaximum - amountIn;
            if (refundAmount > 0) {
                if (msg.value > 0) {
                    // Refund unused WSEI as SEI
                    wsei.withdraw(refundAmount);
                    payable(msg.sender).transfer(refundAmount);
                } else {
                    // Refund unused ERC20 tokens
                    IERC20(tokenIn).safeTransfer(msg.sender, refundAmount);
                }
            }
        } catch {
            // If swap fails, return all tokens/SEI to user
            if (msg.value > 0) {
                wsei.withdraw(amountInMaximum);
                payable(msg.sender).transfer(amountInMaximum);
            } else {
                IERC20(tokenIn).safeTransfer(msg.sender, amountInMaximum);
            }
            revert SwapFailed();
        }
    }

    /**
     * @dev Multi-hop swap using encoded path
     * @param path Encoded path for multi-hop swap
     * @param amountIn Amount of tokens to swap
     * @param amountOutMinimum Minimum amount of tokens to receive
     * @return amountOut Amount of tokens received
     */
    function swapMultiHop(
        bytes calldata path,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external payable nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0 && msg.value == 0) revert InvalidAmount();

        // For SEI input, wrap to WSEI first
        if (msg.value > 0) {
            wsei.deposit{value: msg.value}();
            amountIn = msg.value;
            
            // Approve WSEI to router if not already done
            uint256 currentAllowance = IERC20(WSEI).allowance(address(this), DRAGONSWAP_ROUTER);
            if (currentAllowance < amountIn) {
                IERC20(WSEI).approve(DRAGONSWAP_ROUTER, type(uint256).max);
            }
        }

        IDragonSwapV2Router.ExactInputParams memory params = IDragonSwapV2Router
            .ExactInputParams({
                path: path,
                recipient: msg.sender,
                deadline: block.timestamp + DEFAULT_DEADLINE_OFFSET,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });

        amountOut = dragonSwapRouter.exactInput(params);
    }

    /**
     * @dev Create a new pool for a token pair
     * @param tokenA First token address
     * @param tokenB Second token address  
     * @param fee Fee tier for the pool
     * @return pool Address of the created pool
     */
    function createPool(address tokenA, address tokenB, uint24 fee) external onlyOwner returns (address pool) {
        pool = dragonSwapFactory.createPool(tokenA, tokenB, fee);
        emit PoolFound(tokenA, tokenB, fee, pool);
    }

    /**
     * @dev Get quote for swap (view function for estimation)
     * @notice This is a simple estimation and may not be accurate
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external view returns (uint256 amountOut) {
        // This would require implementing a quoter contract or oracle
        // For now, return 0 as placeholder
        // In production, you'd want to integrate with DragonSwap's quoter
        return 0;
    }

    /**
     * @dev Emergency function to recover stuck tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    /**
     * @dev Update token approval for router
     */
    function updateApproval(address token) external onlyOwner {
        IERC20(token).approve(DRAGONSWAP_ROUTER, type(uint256).max);
    }

    /**
     * @dev Get the fee tiers array
     */
    function getFeeTiers() external pure returns (uint24[] memory) {
        uint24[] memory feeTiers = new uint24[](4);
        feeTiers[0] = 100;   // 0.01%
        feeTiers[1] = 500;   // 0.05%
        feeTiers[2] = 3000;  // 0.3%
        feeTiers[3] = 10000; // 1%
        return feeTiers;
    }

    // Function to receive SEI
    receive() external payable {}
} 