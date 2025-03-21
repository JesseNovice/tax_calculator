// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IERC20 {
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

contract taxWallet {
    address public i_owner;

    constructor() {
        i_owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Only owner can call this function");
        _;
    }

    function depositNZDD(
        address _tokenAddress,
        uint256 _amount
    ) external onlyOwner {
        require(_amount > 0, "Amount must be greater than zero");

        IERC20 token = IERC20(_tokenAddress);
        require(
            token.allowance(msg.sender, address(this)) >= _amount,
            "Token allowance too low"
        );

        bool success = token.transferFrom(msg.sender, address(this), _amount);
        require(success, "Token transfer failed");
    }

    function withdrawNZDD(
        address _tokenAddress,
        uint256 _tokenAmount
    ) external onlyOwner {
        require(_tokenAmount > 0, "Amount must be greater than zero");

        IERC20 token = IERC20(_tokenAddress);
        bool success = token.transfer(msg.sender, _tokenAmount);
        require(success, "Token withdrawal failed");
    }
}
