//SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import {MockERC20} from "./mockerc.sol";
import {VM} from "forge-std/VM.sol";
import {taxWallet} from "../create_tax_wallet.sol";
import {Script} from "forge-std/Script.sol";
import {Test, console} from "forge-std/Test.sol";

contract SendToTaxWalletTest is Test {
    MockERC20 public mockerc;
    uint256 constant STARTING_BALANCE = 20 ether;
    address constant OWNER =
        address(0x4Ad50Cf71B08C7c8907A8965c84f2c517573573E);
    taxWallet public wallet;

    function setUp() external {
        mockerc = new MockERC20("MockNZDD", "mNZDD");
        vm.deal(address(OWNER), STARTING_BALANCE);
        mockerc.mint(OWNER, 100000);
        vm.startPrank(OWNER);
        mockerc.approve(address(this), 100000);
        vm.stopPrank();
        wallet = new taxWallet();
    }

    function testSendToTaxWallet() public {
        uint256 amount = 1000;
        vm.prank(OWNER);
        wallet.depositNZDD(address(mockerc), amount);
        vm.stopPrank();
        assertEq(mockerc.balanceOf(address(wallet)), amount);
    }
}
