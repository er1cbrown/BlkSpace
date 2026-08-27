// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TimelockAdmin
/// @notice Governance skeleton: delayed admin calls. Not a token-voting DAO yet.
/// @dev Intended as `admin` on BI9 and StakeVault so a single key cannot mint instantly.
///      `setMinDelay` and `transferAdmin` are themselves delayed (onlySelf) so an EOA
///      cannot zero the delay and mint in one transaction on HyperEVM mainnet.
contract TimelockAdmin {
    /// @notice Floor for `minDelay`. Matches tokenomics: no instant admin mint.
    uint256 public constant MIN_DELAY_FLOOR = 2 days;

    uint256 public minDelay;
    address public admin;

    struct Call {
        address target;
        uint256 value;
        bytes data;
        uint64 eta;
        bool executed;
        bool canceled;
    }

    uint256 public nextId;
    mapping(uint256 => Call) public calls;

    event AdminTransferred(address indexed previous, address indexed next);
    event MinDelaySet(uint256 previous, uint256 next);
    event Proposed(
        uint256 indexed id, address indexed target, uint256 value, bytes data, uint64 eta
    );
    event Canceled(uint256 indexed id);
    event Executed(uint256 indexed id);

    error NotAdmin();
    error NotSelf();
    error ZeroAddress();
    error UnknownCall();
    error AlreadyDone();
    error NotReady();
    error CallFailed();
    error DelayTooShort();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /// @dev Config changes that weaken the timelock must go through `propose`/`execute`.
    modifier onlySelf() {
        if (msg.sender != address(this)) revert NotSelf();
        _;
    }

    constructor(address admin_, uint256 minDelay_) {
        if (admin_ == address(0)) revert ZeroAddress();
        if (minDelay_ < MIN_DELAY_FLOOR) revert DelayTooShort();
        admin = admin_;
        minDelay = minDelay_;
    }

    function transferAdmin(address next) external onlySelf {
        if (next == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, next);
        admin = next;
    }

    function setMinDelay(uint256 next) external onlySelf {
        if (next < MIN_DELAY_FLOOR) revert DelayTooShort();
        emit MinDelaySet(minDelay, next);
        minDelay = next;
    }

    function propose(address target, uint256 value, bytes calldata data)
        external
        onlyAdmin
        returns (uint256 id)
    {
        if (target == address(0)) revert ZeroAddress();
        id = nextId++;
        uint64 eta = uint64(block.timestamp + minDelay);
        calls[id] = Call({
            target: target,
            value: value,
            data: data,
            eta: eta,
            executed: false,
            canceled: false
        });
        emit Proposed(id, target, value, data, eta);
    }

    function cancel(uint256 id) external onlyAdmin {
        Call storage c = calls[id];
        if (c.target == address(0)) revert UnknownCall();
        if (c.executed || c.canceled) revert AlreadyDone();
        c.canceled = true;
        emit Canceled(id);
    }

    function execute(uint256 id) external onlyAdmin {
        Call storage c = calls[id];
        if (c.target == address(0)) revert UnknownCall();
        if (c.executed || c.canceled) revert AlreadyDone();
        if (block.timestamp < c.eta) revert NotReady();
        c.executed = true;
        (bool ok, bytes memory ret) = c.target.call{value: c.value}(c.data);
        if (!ok) {
            if (ret.length > 0) {
                // Bubble the inner revert so callers see BI9/StakeVault errors, not CallFailed.
                assembly {
                    revert(add(ret, 32), mload(ret))
                }
            }
            revert CallFailed();
        }
        emit Executed(id);
    }

    receive() external payable {}
}
