// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TaxVault {
    IERC20 public immutable nzdd_token;

    // Tracks total tax deposited per user
    mapping(address => uint256) public taxPerUser;

    constructor(IERC20 _token) {
        nzdd_token = _token;
    }

    // Anyone can deposit tokens into the vault. Their balance is tracked.
    function deposit(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than zero");
        require(
            nzdd_token.allowance(msg.sender, address(this)) >= _amount,
            "Token allowance too low"
        );

        bool success = nzdd_token.transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        require(success, "Token transfer failed");

        taxPerUser[msg.sender] += _amount;
    }

    // Allows individual users to withdraw their own deposits
    function withdrawMyFunds(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than zero");
        require(taxPerUser[msg.sender] >= _amount, "Insufficient user balance");

        taxPerUser[msg.sender] -= _amount;

        bool success = nzdd_token.transfer(msg.sender, _amount);
        require(success, "Token withdrawal failed");
    }

    // View vault's total token balance
    function getVaultBalance() external view returns (uint256) {
        return nzdd_token.balanceOf(address(this));
    }

    // View how much a specific user has deposited
    function getUserDeposit(address user) external view returns (uint256) {
        return taxPerUser[user];
    }
}
