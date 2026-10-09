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

    /// @notice The cap is a one-way ratchet: exactly one activation raise, then only decreases.
    /// @dev This is the load-bearing dilution guarantee for anyone holding BI9. A cap can be
    ///      raised exactly once, from the 0 that deploys start at, and never again. Matches
    ///      BKSPC's `ConvertConfig.cap` so both assets carry the same guarantee.
    function test_capActivatesOnceThenOnlyDecreases() public {
        // 0 -> N is the single permitted raise.
        vm.prank(admin);
        token.setCap(1_000 ether);
        assertEq(token.cap(), 1_000 ether);

        // N -> N' where N' < N is a decrease.
        vm.prank(admin);
        token.setCap(600 ether);
        assertEq(token.cap(), 600 ether);
    }

    function test_capCannotBeRaisedAfterActivation() public {
        vm.prank(admin);
        token.setCap(10 ether);

        vm.prank(admin);
        vm.expectRevert(BI9.CapCannotIncrease.selector);
        token.setCap(1_000_000 ether);

        assertEq(token.cap(), 10 ether);
    }

    /// @notice Lowering back to 0 is refused, because 0 is the not-yet-activated sentinel.
    /// @dev Without this, governance could lower the cap to 0 and then raise it again,
    ///      defeating the ratchet entirely.
    function test_capCannotReturnToZeroAfterActivation() public {
        vm.prank(admin);
        token.setCap(10 ether);

        vm.prank(admin);
        vm.expectRevert(BI9.InvalidCap.selector);
        token.setCap(0);

        assertEq(token.cap(), 10 ether);
    }

    /// @notice A zero cap cannot be "set" to zero — that would be a silent no-op.
    function test_settingCapToZeroBeforeActivationReverts() public {
        vm.prank(admin);
        vm.expectRevert(BI9.InvalidCap.selector);
        token.setCap(0);
    }

    function test_nonAdminCannotChangeCap() public {
        vm.prank(admin);
        token.setCap(10 ether);

        vm.startPrank(user);
        vm.expectRevert(BI9.NotAdmin.selector);
        token.setCap(1_000_000 ether);
        vm.expectRevert(BI9.NotAdmin.selector);
        token.setCap(5 ether);
        vm.stopPrank();

        assertEq(token.cap(), 10 ether);
    }

    /// @notice `setMinter` has no zero-address check.
    /// @dev Setting `minter` to the zero address bricks minting. That is fail-closed rather
    ///      than unsafe, and it is recoverable because `setMinter` can be called again. The
    ///      asymmetry with `setPauser`/`transferAdmin`, which do reject zero, is deliberate
    ///      and pinned here so nobody "fixes" it into an inconsistency by accident.
    function test_setMinterToZeroDisablesMinting() public {
        vm.prank(admin);
        token.setCap(100 ether);
        assertEq(token.minter(), minter);

        vm.prank(admin);
        token.setMinter(address(0));
        assertEq(token.minter(), address(0));

        vm.prank(minter);
        vm.expectRevert(BI9.NotMinter.selector);
        token.mint(user, 1 ether);

        // Recoverable by admin.
        vm.prank(admin);
        token.setMinter(minter);
        vm.prank(minter);
        token.mint(user, 1 ether);
        assertEq(token.totalSupply(), 1 ether);
    }

    function test_setMinterRejectsNonAdmin() public {
        vm.prank(user);
        vm.expectRevert(BI9.NotAdmin.selector);
        token.setMinter(user);
    }

    /// @notice `pauser` can pause but cannot unpause; only `admin` can.
    /// @dev On a live deploy `admin` is a TimelockAdmin, so an emergency pause is
    ///      effectively irreversible for at least `minDelay` (2 days). That is a
    ///      fail-safe direction for a token that donors hold, but it is an incident-response
    ///      cost worth knowing about: a pause triggered by a bug cannot be undone quickly.
    function test_pauserCanPauseButOnlyAdminCanUnpause() public {
        address pauser = address(0xFA05E);

        vm.prank(admin);
        token.setPauser(pauser);

        vm.prank(pauser);
        token.pause();
        assertTrue(token.paused());

        vm.prank(pauser);
        vm.expectRevert(BI9.NotAdmin.selector);
        token.unpause();

        vm.prank(admin);
        token.unpause();
        assertFalse(token.paused());
    }

    function test_pauseRequiresPauserOrAdmin() public {
        vm.prank(user);
        vm.expectRevert(BI9.NotPauser.selector);
        token.pause();
    }

    /// @notice A mint is blocked while paused only for transfers, not for minting.
    /// @dev Pinned because it is arguably surprising: pausing does not stop the minter from
    ///      issuing new supply. If that is not intended, `mint` needs `whenNotPaused`.
    function test_mintStillWorksWhilePaused() public {
        vm.prank(admin);
        token.setCap(10 ether);
        vm.prank(admin);
        token.pause();

        vm.prank(minter);
        token.mint(user, 1 ether);
        assertEq(token.balanceOf(user), 1 ether);
    }

    function test_burnCannotExceedBalance() public {
        vm.prank(admin);
        token.setCap(10 ether);
        vm.prank(minter);
        token.mint(user, 1 ether);

        vm.prank(user);
        vm.expectRevert(BI9.InsufficientBalance.selector);
        token.burn(2 ether);

        assertEq(token.totalSupply(), 1 ether);
    }

    function test_transferFromRequiresAllowance() public {
        address spender = address(0x5);
        vm.prank(admin);
        token.setCap(10 ether);
        vm.prank(minter);
        token.mint(user, 1 ether);

        vm.prank(spender);
        vm.expectRevert(BI9.InsufficientAllowance.selector);
        token.transferFrom(user, spender, 1 ether);
    }

    function test_transferFromSpendsAllowance() public {
        address spender = address(0x5);
        vm.prank(admin);
        token.setCap(10 ether);
        vm.prank(minter);
        token.mint(user, 2 ether);

        vm.prank(user);
        token.approve(spender, 1 ether);

        vm.prank(spender);
        token.transferFrom(user, spender, 0.4 ether);

        assertEq(token.balanceOf(spender), 0.4 ether);
        assertEq(token.allowance(user, spender), 0.6 ether);
    }

    /// @notice `approve` overwrites rather than accumulating.
    /// @dev Non-standard: there is no `increaseAllowance`. Pinned so integrators do not
    ///      assume additive semantics.
    function test_approveOverwritesRatherThanAccumulates() public {
        address a = address(0x1);
        address b = address(0x2);

        vm.prank(user);
        token.approve(a, 5 ether);
        vm.prank(user);
        token.approve(b, 7 ether);

        assertEq(token.allowance(user, a), 5 ether);
        assertEq(token.allowance(user, b), 7 ether);
    }
}
