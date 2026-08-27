// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BI9} from "../src/BI9.sol";
import {StakeVault} from "../src/StakeVault.sol";
import {TimelockAdmin} from "../src/TimelockAdmin.sol";

/// @notice HyperEVM **mainnet** (chain id 999) deploy. Mint stays off.
/// @dev Requires TIMELOCK_ADMIN. Refuses any other chain. Cap is always 0.
///      Does not convert WeixBucks. Does not set a minter.
contract DeployMainnet is Script {
    uint256 internal constant HYPEREVM_MAINNET = 999;

    error WrongChain(uint256 got);
    error AdminRequired();
    error DelayTooShort(uint256 got);
    error CapMustStayZero();

    function run() external {
        if (block.chainid != HYPEREVM_MAINNET) revert WrongChain(block.chainid);

        uint256 delay = vm.envOr("TIMELOCK_DELAY", uint256(2 days));
        if (delay < 2 days) revert DelayTooShort(delay);

        address admin = vm.envAddress("TIMELOCK_ADMIN");
        if (admin == address(0)) revert AdminRequired();

        vm.startBroadcast();
        TimelockAdmin tl = new TimelockAdmin(admin, delay);
        BI9 token = new BI9(address(tl), 0);
        if (token.cap() != 0) revert CapMustStayZero();
        if (token.minter() != address(0)) revert CapMustStayZero();
        StakeVault vault = new StakeVault(address(tl), token);
        vm.stopBroadcast();

        console2.log("HyperEVM MAINNET deploy");
        console2.log("chainId", block.chainid);
        console2.log("TimelockAdmin", address(tl));
        console2.log("BI9", address(token));
        console2.log("StakeVault", address(vault));
        console2.log("proposer EOA (TIMELOCK_ADMIN)", admin);
        console2.log("min delay (seconds)", delay);
        console2.log("cap", token.cap());
        console2.log("minter", token.minter());
        console2.log("NEXT: copy deployments/last-run.json -> deployments/mainnet.json");
        console2.log("THEN: set VITE_BI9_ADDRESS / VITE_STAKE_VAULT / VITE_TIMELOCK in the app");
        console2.log("DO NOT setCap or setMinter without a reviewed, delayed propose.");

        string memory json = string.concat(
            "{\n",
            '  "network": "hyperevm-mainnet",\n',
            '  "chainId": 999,\n',
            '  "rpc": "https://rpc.hyperliquid.xyz/evm",\n',
            '  "explorer": "https://hyperevmscan.io",\n',
            '  "timelock": "',
            vm.toString(address(tl)),
            '",\n',
            '  "bi9": "',
            vm.toString(address(token)),
            '",\n',
            '  "stakeVault": "',
            vm.toString(address(vault)),
            '",\n',
            '  "admin": "',
            vm.toString(admin),
            '",\n',
            '  "minDelay": ',
            vm.toString(delay),
            ",\n",
            '  "cap": 0,\n',
            '  "mintDisabled": true,\n',
            '  "weixBucksConvertible": false\n',
            "}\n"
        );
        vm.writeFile("deployments/last-run.json", json);
    }
}
