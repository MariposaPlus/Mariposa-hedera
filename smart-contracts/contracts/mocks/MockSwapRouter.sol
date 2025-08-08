// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockSwapRouter {
    using SafeERC20 for IERC20;

    // Simple mock that returns 1:1 swaps for testing
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(deadline >= block.timestamp, "MockSwapRouter: expired");
        require(path.length >= 2, "MockSwapRouter: invalid path");
        
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        
        // Simple 1:1 ratio for testing
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amounts[i-1]; // 1:1 swap ratio
        }
        
        require(amounts[amounts.length - 1] >= amountOutMin, "MockSwapRouter: insufficient output");
        
        // Transfer tokens
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(path[path.length - 1]).safeTransfer(to, amounts[amounts.length - 1]);
    }

    function swapExactNativeForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts) {
        require(deadline >= block.timestamp, "MockSwapRouter: expired");
        require(path.length >= 2, "MockSwapRouter: invalid path");
        require(msg.value > 0, "MockSwapRouter: insufficient input");
        
        amounts = new uint[](path.length);
        amounts[0] = msg.value;
        
        // Simple 1:1 ratio for testing
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amounts[i-1]; // 1:1 swap ratio
        }
        
        require(amounts[amounts.length - 1] >= amountOutMin, "MockSwapRouter: insufficient output");
        
        // Transfer output token
        IERC20(path[path.length - 1]).safeTransfer(to, amounts[amounts.length - 1]);
    }

    function swapExactTokensForNative(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(deadline >= block.timestamp, "MockSwapRouter: expired");
        require(path.length >= 2, "MockSwapRouter: invalid path");
        
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        
        // Simple 1:1 ratio for testing
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amounts[i-1]; // 1:1 swap ratio
        }
        
        require(amounts[amounts.length - 1] >= amountOutMin, "MockSwapRouter: insufficient output");
        
        // Transfer input token
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Send native token (ETH/SEI)
        payable(to).transfer(amounts[amounts.length - 1]);
    }

    function getAmountsOut(uint amountIn, address[] calldata path)
        external pure returns (uint[] memory amounts) {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        
        // Simple 1:1 ratio for testing
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amounts[i-1];
        }
    }

    // Allow contract to receive ETH/SEI
    receive() external payable {}
} 