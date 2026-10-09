// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BLACKINCCOIN (BI9)
/// @notice A BlkSpace ERC-20, chain-agnostic. Deployed to Ethereum (chain 1); retained
///         as a secondary asset. The canonical on-chain asset is BKSPC on Solana --
///         see docs/canonical-chain-decision.md.
/// @dev No public mint. No WeixBucks conversion. Cap of 0 keeps minting disabled.
///      Admin is expected to be a TimelockAdmin, not an EOA, on any live deploy.
contract BI9 {
    string public constant name = "BLACKINCCOIN";
    string public constant symbol = "BI9";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    /// @notice Maximum supply. Zero means mint is disabled until governance sets a cap.
    uint256 public cap;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public admin;
    address public minter;
    address public pauser;
    bool public paused;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event CapSet(uint256 previous, uint256 next);
    event MinterSet(address indexed previous, address indexed next);
    event PauserSet(address indexed previous, address indexed next);
    event AdminTransferred(address indexed previous, address indexed next);
    event Paused(address account);
    event Unpaused(address account);

    error NotAdmin();
    error NotMinter();
    error NotPauser();
    error PausedError();
    error CapExceeded();
    error MintDisabled();
    error CapCannotIncrease();
    error InvalidCap();
    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedError();
        _;
    }

    constructor(address admin_, uint256 cap_) {
        if (admin_ == address(0)) revert ZeroAddress();
        admin = admin_;
        pauser = admin_;
        cap = cap_;
        // Live deploys pass cap 0 and TimelockAdmin as admin_.
        // There is no WeixBucks parameter and never will be.
    }

    /// @notice Set the supply ceiling.
    /// @dev The cap is a **one-way ratchet**. `cap == 0` is the "not yet activated"
    ///      sentinel that deploys start from, so exactly one activation raise is allowed
    ///      (0 -> N). Once a non-zero cap exists it can only be lowered, and never returned
    ///      to 0 — that would reopen activation and let the ceiling climb again.
    ///
    ///      A non-zero cap alone does not enable minting: `minter` starts as `address(0)`
    ///      and minting needs a separate timelocked `setMinter`. So the intended sequence
    ///      is deploy(cap 0, minter 0) -> setCap(N) -> setMinter(addr), each via its own
    ///      delayed proposal.
    ///
    ///      This matches BKSPC's `ConvertConfig.cap`, which is also monotonically
    ///      decreasing, so the two assets cannot end up with different dilution guarantees.
    function setCap(uint256 newCap) external onlyAdmin {
        if (cap != 0) {
            // Reverting to 0 would make `cap != 0` false again and reopen activation.
            if (newCap == 0) revert InvalidCap();
            if (newCap > cap) revert CapCannotIncrease();
        } else if (newCap == 0) {
            revert InvalidCap();
        }
        if (newCap < totalSupply) revert CapExceeded();
        uint256 previous = cap;
        cap = newCap;
        emit CapSet(previous, newCap);
    }

    function setMinter(address next) external onlyAdmin {
        emit MinterSet(minter, next);
        minter = next;
    }

    function setPauser(address next) external onlyAdmin {
        if (next == address(0)) revert ZeroAddress();
        emit PauserSet(pauser, next);
        pauser = next;
    }

    function transferAdmin(address next) external onlyAdmin {
        if (next == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, next);
        admin = next;
    }

    function pause() external {
        if (msg.sender != pauser && msg.sender != admin) revert NotPauser();
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Governance mint only. There is no WeixBucks hook.
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter();
        if (to == address(0)) revert ZeroAddress();
        if (cap == 0) revert MintDisabled();
        uint256 nextSupply = totalSupply + amount;
        if (nextSupply > cap) revert CapExceeded();
        totalSupply = nextSupply;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) external {
        uint256 bal = balanceOf[msg.sender];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[msg.sender] = bal - amount;
            totalSupply -= amount;
        }
        emit Transfer(msg.sender, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external whenNotPaused returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount)
        external
        whenNotPaused
        returns (bool)
    {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = allowed - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}
