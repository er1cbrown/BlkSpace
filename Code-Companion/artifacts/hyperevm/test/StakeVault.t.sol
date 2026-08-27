// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BI9} from "../src/BI9.sol";
import {StakeVault} from "../src/StakeVault.sol";

contract StakeVaultTest is Test {
    BI9 internal token;
    StakeVault internal vault;
    address internal admin = address(0xA11CE);
    address internal user = address(0xC0);

    function setUp() public {
        token = new BI9(admin, 1_000 ether);
        vm.prank(admin);
        token.setMinter(admin);
        vault = new StakeVault(admin, token);
        vm.deal(user, 200 ether);
    }

    function test_stakeHypeSetsTierAndDiscount() public {
        vm.prank(user);
        vault.stakeHype{value: 10 ether}();
        assertEq(vault.tierOf(user), 2);
        assertEq(vault.feeDiscountBps(user), 25);
    }

    function test_unstakeCooldownThenClaim() public {
        vm.prank(user);
        vault.stakeHype{value: 1 ether}();

        vm.prank(user);
        vault.queueUnstakeHype(1 ether);
        assertEq(vault.tierOf(user), 0);

        vm.prank(user);
        vm.expectRevert(StakeVault.NotUnlocked.selector);
        vault.claimHype();

        vm.warp(block.timestamp + 7 days);
        uint256 before = user.balance;
        vm.prank(user);
        vault.claimHype();
        assertEq(user.balance, before + 1 ether);
    }

    function test_noYieldFunction() public view {
        // StakeVault has no reward / harvest / drip entrypoint. This test documents that
        // staking is a sleeve, not a savings product.
        assertEq(vault.feeDiscountBps(address(0xDEAD)), 0);
    }

    function test_stakeAndUnstakeBi9() public {
        vm.prank(admin);
        token.mint(user, 8 ether);
        vm.startPrank(user);
        token.approve(address(vault), 8 ether);
        vault.stakeBi9(8 ether);
        vault.queueUnstakeBi9(8 ether);
        vm.warp(block.timestamp + 7 days);
        vault.claimBi9();
        vm.stopPrank();
        assertEq(token.balanceOf(user), 8 ether);
    }

    function test_receiveRejectsBareHype() public {
        vm.prank(user);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertFalse(ok);
    }
}
