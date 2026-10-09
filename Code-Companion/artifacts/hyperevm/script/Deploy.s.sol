// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BI9} from "../src/BI9.sol";
import {StakeVault} from "../src/StakeVault.sol";
import {TimelockAdmin} from "../src/TimelockAdmin.sol";

/// @notice Deploys timelock (admin), BI9 with mint disabled (cap 0), and StakeVault.
/// @dev No WeixBucks wiring. Set cap + minter later via TimelockAdmin.propose.
///
///      Chain-agnostic rehearsal script. Use against a local Anvil instance or a testnet to
///      work out addresses and confirm the constructor arguments before touching mainnet.
///      For Ethereum mainnet use `DeployMainnet.s.sol`, which additionally refuses any
///      chain id other than 1 and asserts cap == 0 and minter == address(0) afterwards.
///
///      This script deliberately has NO chain guard. It is a rehearsal tool. Anything
///      irreversible must go through DeployMainnet.
contract Deploy is Script {
    function run() external {
        uint256 delay = vm.envOr("TIMELOCK_DELAY", uint256(2 days));
        address admin = vm.envOr("TIMELOCK_ADMIN", address(0));
        if (admin == address(0)) admin = msg.sender;
        if (delay < 2 days) revert("Deploy: delay below 2-day floor");

        vm.startBroadcast();
        TimelockAdmin tl = new TimelockAdmin(admin, delay);
        BI9 token = new BI9(address(tl), 0);
        if (token.cap() != 0) revert("Deploy: BI9 cap must be 0");
        StakeVault vault = new StakeVault(address(tl), token);
        vm.stopBroadcast();

        _log(tl, token, vault, admin, delay, block.chainid);
        _writeLastRun(tl, token, vault, admin, delay, block.chainid);
    }

    function _log(
        TimelockAdmin tl,
        BI9 token,
        StakeVault vault,
        address admin,
        uint256 delay,
        uint256 chainId
    ) internal view {
        console2.log("chainId", chainId);
        console2.log("TimelockAdmin", address(tl));
        console2.log("BI9", address(token));
        console2.log("StakeVault", address(vault));
        console2.log("timelock admin (EOA proposer)", admin);
        console2.log("min delay (seconds)", delay);
        console2.log("BI9 cap (0 = mint disabled)", token.cap());
        console2.log("network: rehearsal only - use DeployMainnet.s.sol for chain 1");
    }

    function _writeLastRun(
        TimelockAdmin tl,
        BI9 token,
        StakeVault vault,
        address admin,
        uint256 delay,
        uint256 chainId
    ) internal {
        string memory json = string.concat(
            "{\n",
            '  "network": "rehearsal",\n',
            '  "chainId": ',
            vm.toString(chainId),
            ",\n",
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
        console2.log("wrote deployments/last-run.json (rehearsal - do not publish these addresses)");
    }
}
