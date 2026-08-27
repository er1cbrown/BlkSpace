// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BI9} from "../src/BI9.sol";
import {TimelockAdmin} from "../src/TimelockAdmin.sol";

contract TimelockAdminTest is Test {
    TimelockAdmin internal tl;
    BI9 internal token;
    address internal admin = address(0xA11CE);

    function setUp() public {
        tl = new TimelockAdmin(admin, 2 days);
        token = new BI9(address(tl), 0);
    }

    function test_cannotSetCapBeforeDelay() public {
        bytes memory data = abi.encodeWithSelector(BI9.setCap.selector, 100 ether);
        vm.prank(admin);
        uint256 id = tl.propose(address(token), 0, data);
        vm.prank(admin);
        vm.expectRevert(TimelockAdmin.NotReady.selector);
        tl.execute(id);
    }

    function test_setCapAfterDelay() public {
        bytes memory data = abi.encodeWithSelector(BI9.setCap.selector, 100 ether);
        vm.prank(admin);
        uint256 id = tl.propose(address(token), 0, data);
        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        tl.execute(id);
        assertEq(token.cap(), 100 ether);
    }

    function test_cancelBlocksExecute() public {
        bytes memory data = abi.encodeWithSelector(BI9.setCap.selector, 1 ether);
        vm.prank(admin);
        uint256 id = tl.propose(address(token), 0, data);
        vm.prank(admin);
        tl.cancel(id);
        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        vm.expectRevert(TimelockAdmin.AlreadyDone.selector);
        tl.execute(id);
    }

    function test_nonAdminCannotPropose() public {
        vm.expectRevert(TimelockAdmin.NotAdmin.selector);
        tl.propose(address(token), 0, bytes(""));
    }

    function test_constructorRejectsDelayBelowFloor() public {
        vm.expectRevert(TimelockAdmin.DelayTooShort.selector);
        new TimelockAdmin(admin, 2 days - 1);
    }

    function test_eoaCannotSetMinDelayDirectly() public {
        vm.prank(admin);
        vm.expectRevert(TimelockAdmin.NotSelf.selector);
        tl.setMinDelay(3 days);
    }

    function test_eoaCannotTransferAdminDirectly() public {
        vm.prank(admin);
        vm.expectRevert(TimelockAdmin.NotSelf.selector);
        tl.transferAdmin(address(0xB0B));
    }

    function test_setMinDelayAfterDelay() public {
        bytes memory data = abi.encodeWithSelector(TimelockAdmin.setMinDelay.selector, 3 days);
        vm.prank(admin);
        uint256 id = tl.propose(address(tl), 0, data);
        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        tl.execute(id);
        assertEq(tl.minDelay(), 3 days);
    }

    function test_cannotLowerDelayBelowFloorEvenViaTimelock() public {
        bytes memory data = abi.encodeWithSelector(TimelockAdmin.setMinDelay.selector, 1 days);
        vm.prank(admin);
        uint256 id = tl.propose(address(tl), 0, data);
        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        vm.expectRevert(TimelockAdmin.DelayTooShort.selector);
        tl.execute(id);
    }

    function test_transferAdminAfterDelay() public {
        address next = address(0xB0B);
        bytes memory data = abi.encodeWithSelector(TimelockAdmin.transferAdmin.selector, next);
        vm.prank(admin);
        uint256 id = tl.propose(address(tl), 0, data);
        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        tl.execute(id);
        assertEq(tl.admin(), next);
        vm.prank(admin);
        vm.expectRevert(TimelockAdmin.NotAdmin.selector);
        tl.propose(address(token), 0, bytes(""));
    }
}
