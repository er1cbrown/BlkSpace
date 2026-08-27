// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BI9} from "./BI9.sol";

/// @title StakeVault
/// @notice HYPE (native) + BI9 staking sleeves for BLKSHI fee tiers / collateral / protocol roles.
/// @dev There is no reward mint and no WeixBucks path. Unstake uses a cooldown so the stake
///      can actually back a position. Tier thresholds are placeholders until markets exist.
contract StakeVault {
    BI9 public immutable bi9;
    address public admin;

    uint256 public unstakeDelay = 7 days;

    // Placeholder tiers from docs/blkshi.md — governance may retune; not a yield promise.
    uint256 public tier1Hype = 1 ether;
    uint256 public tier2Hype = 10 ether;
    uint256 public tier3Hype = 100 ether;
    uint16 public tier1DiscountBps = 10;
    uint16 public tier2DiscountBps = 25;
    uint16 public tier3DiscountBps = 50;

    struct Position {
        uint256 hypeStaked;
        uint256 bi9Staked;
        uint256 hypePending;
        uint256 bi9Pending;
        uint64 hypeUnlockAt;
        uint64 bi9UnlockAt;
    }

    mapping(address => Position) public positions;

    event AdminTransferred(address indexed previous, address indexed next);
    event UnstakeDelaySet(uint256 previous, uint256 next);
    event TiersSet(uint256 t1, uint256 t2, uint256 t3, uint16 d1, uint16 d2, uint16 d3);
    event HypeStaked(address indexed user, uint256 amount, uint256 total);
    event Bi9Staked(address indexed user, uint256 amount, uint256 total);
    event HypeUnstakeQueued(address indexed user, uint256 amount, uint64 unlockAt);
    event Bi9UnstakeQueued(address indexed user, uint256 amount, uint64 unlockAt);
    event HypeClaimed(address indexed user, uint256 amount);
    event Bi9Claimed(address indexed user, uint256 amount);

    error NotAdmin();
    error ZeroAmount();
    error InsufficientStake();
    error UnlockPending();
    error NotUnlocked();
    error TransferFailed();
    error ZeroAddress();
    error BadTiers();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address admin_, BI9 bi9_) {
        if (admin_ == address(0) || address(bi9_) == address(0)) revert ZeroAddress();
        admin = admin_;
        bi9 = bi9_;
    }

    function transferAdmin(address next) external onlyAdmin {
        if (next == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, next);
        admin = next;
    }

    function setUnstakeDelay(uint256 next) external onlyAdmin {
        emit UnstakeDelaySet(unstakeDelay, next);
        unstakeDelay = next;
    }

    function setTiers(
        uint256 t1,
        uint256 t2,
        uint256 t3,
        uint16 d1,
        uint16 d2,
        uint16 d3
    ) external onlyAdmin {
        if (t1 == 0 || t2 <= t1 || t3 <= t2) revert BadTiers();
        if (d1 > d2 || d2 > d3 || d3 > 10_000) revert BadTiers();
        tier1Hype = t1;
        tier2Hype = t2;
        tier3Hype = t3;
        tier1DiscountBps = d1;
        tier2DiscountBps = d2;
        tier3DiscountBps = d3;
        emit TiersSet(t1, t2, t3, d1, d2, d3);
    }

    /// @notice Lock native HYPE (gas token on HyperEVM). No yield is minted.
    function stakeHype() external payable {
        if (msg.value == 0) revert ZeroAmount();
        Position storage p = positions[msg.sender];
        p.hypeStaked += msg.value;
        emit HypeStaked(msg.sender, msg.value, p.hypeStaked);
    }

    function stakeBi9(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (!bi9.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        Position storage p = positions[msg.sender];
        p.bi9Staked += amount;
        emit Bi9Staked(msg.sender, amount, p.bi9Staked);
    }

    /// @notice Move HYPE out of the active sleeve into a cooldown queue. One pending unstake at a time.
    function queueUnstakeHype(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        Position storage p = positions[msg.sender];
        if (p.hypePending != 0) revert UnlockPending();
        if (p.hypeStaked < amount) revert InsufficientStake();
        unchecked {
            p.hypeStaked -= amount;
        }
        p.hypePending = amount;
        p.hypeUnlockAt = uint64(block.timestamp + unstakeDelay);
        emit HypeUnstakeQueued(msg.sender, amount, p.hypeUnlockAt);
    }

    function queueUnstakeBi9(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        Position storage p = positions[msg.sender];
        if (p.bi9Pending != 0) revert UnlockPending();
        if (p.bi9Staked < amount) revert InsufficientStake();
        unchecked {
            p.bi9Staked -= amount;
        }
        p.bi9Pending = amount;
        p.bi9UnlockAt = uint64(block.timestamp + unstakeDelay);
        emit Bi9UnstakeQueued(msg.sender, amount, p.bi9UnlockAt);
    }

    function claimHype() external {
        Position storage p = positions[msg.sender];
        uint256 amount = p.hypePending;
        if (amount == 0) revert ZeroAmount();
        if (block.timestamp < p.hypeUnlockAt) revert NotUnlocked();
        p.hypePending = 0;
        p.hypeUnlockAt = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit HypeClaimed(msg.sender, amount);
    }

    function claimBi9() external {
        Position storage p = positions[msg.sender];
        uint256 amount = p.bi9Pending;
        if (amount == 0) revert ZeroAmount();
        if (block.timestamp < p.bi9UnlockAt) revert NotUnlocked();
        p.bi9Pending = 0;
        p.bi9UnlockAt = 0;
        if (!bi9.transfer(msg.sender, amount)) revert TransferFailed();
        emit Bi9Claimed(msg.sender, amount);
    }

    /// @return tier 0–3 based on *active* HYPE stake (pending unstake does not count).
    function tierOf(address user) public view returns (uint8) {
        uint256 h = positions[user].hypeStaked;
        if (h >= tier3Hype) return 3;
        if (h >= tier2Hype) return 2;
        if (h >= tier1Hype) return 1;
        return 0;
    }

    /// @notice Fee discount in bps. Informational for BLKSHI; this contract pays no yield.
    function feeDiscountBps(address user) external view returns (uint16) {
        uint8 t = tierOf(user);
        if (t == 3) return tier3DiscountBps;
        if (t == 2) return tier2DiscountBps;
        if (t == 1) return tier1DiscountBps;
        return 0;
    }

    receive() external payable {
        revert ZeroAmount();
    }
}
