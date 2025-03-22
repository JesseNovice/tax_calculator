// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {MockERC20} from "./mockerc.sol";
import {TaxVault} from "../create_tax_wallet.sol";
import {Test, console} from "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TaxVaultTest is Test {
    MockERC20 public mockerc;
    TaxVault public vault;

    uint256 constant STARTING_BALANCE = 20 ether;
    address constant OWNER =
        address(0x4Ad50Cf71B08C7c8907A8965c84f2c517573573E);

    function setUp() external {
        mockerc = new MockERC20("MockNZDD", "mNZDD");

        vm.startPrank(OWNER);
        vault = new TaxVault(IERC20(address(mockerc)));
        vm.stopPrank();

        vm.deal(OWNER, STARTING_BALANCE);
        mockerc.mint(OWNER, 100000);

        vm.prank(OWNER);
        mockerc.approve(address(vault), 100000);
    }

    function testDeposit() public {
        uint256 amount = 1000;

        vm.prank(OWNER);
        vault.deposit(amount);

        assertEq(mockerc.balanceOf(address(vault)), amount);
        assertEq(vault.getUserDeposit(OWNER), amount);
    }

    function testCheckBalance() public {
        uint256 amount = 1000;

        vm.prank(OWNER);
        vault.deposit(amount);

        uint256 balance = vault.getVaultBalance();
        console.log("Vault balance after deposit: %s", balance);
        assertEq(balance, amount);
    }

    function testWithdrawMyFunds() public {
        uint256 amount = 1000;

        vm.prank(OWNER);
        vault.deposit(amount);

        // Pre-check: balance in vault
        assertEq(mockerc.balanceOf(address(vault)), amount);
        assertEq(vault.getUserDeposit(OWNER), amount);

        vm.prank(OWNER);
        vault.withdrawMyFunds(amount);

        // After withdrawal
        assertEq(mockerc.balanceOf(address(vault)), 0);
        assertEq(mockerc.balanceOf(OWNER), 100000); // fully refunded
        assertEq(vault.getUserDeposit(OWNER), 0);
    }
}
