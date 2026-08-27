// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BI9} from "../src/BI9.sol";

contract BI9Test is Test {
    BI9 internal token;
    address internal admin = address(0xA11CE);
    address internal minter = address(0xB1);
    address internal user = address(0xC0);

    function setUp() public {
        token = new BI9(admin, 0);
        vm.prank(admin);
        token.setMinter(minter);
    }

    function test_metadata() public view {
        assertEq(token.name(), "BLACKINCCOIN");
        assertEq(token.symbol(), "BI9");
        assertEq(token.decimals(), 18);
    }

    function test_mintRevertsWhenCapZero() public {
        vm.prank(minter);
        vm.expectRevert(BI9.MintDisabled.selector);
        token.mint(user, 1 ether);
    }

    function test_nonMinterCannotMint() public {
        vm.prank(admin);
        token.setCap(100 ether);
        vm.prank(user);
        vm.expectRevert(BI9.NotMinter.selector);
        token.mint(user, 1 ether);
    }

    function test_mintRespectsCap() public {
        vm.prank(admin);
        token.setCap(5 ether);
        vm.startPrank(minter);
        token.mint(user, 5 ether);
        vm.expectRevert(BI9.CapExceeded.selector);
        token.mint(user, 1);
        vm.stopPrank();
        assertEq(token.totalSupply(), 5 ether);
        assertEq(token.balanceOf(user), 5 ether);
    }

    function test_pauseBlocksTransfer() public {
        vm.prank(admin);
        token.setCap(10 ether);
        vm.prank(minter);
        token.mint(user, 1 ether);

        vm.prank(admin);
        token.pause();

        vm.prank(user);
        vm.expectRevert(BI9.PausedError.selector);
        token.transfer(admin, 1);
    }

    function test_userCanBurn() public {
        vm.prank(admin);
        token.setCap(10 ether);
        vm.prank(minter);
        token.mint(user, 2 ether);
        vm.prank(user);
        token.burn(2 ether);
        assertEq(token.totalSupply(), 0);
    }

    function test_setCapBelowSupplyReverts() public {
        vm.prank(admin);
        token.setCap(10 ether);
        vm.prank(minter);
        token.mint(user, 4 ether);
        vm.prank(admin);
        vm.expectRevert(BI9.CapExceeded.selector);
        token.setCap(3 ether);
    }
}
