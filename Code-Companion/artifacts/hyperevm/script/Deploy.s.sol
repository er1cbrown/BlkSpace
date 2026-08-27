// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BI9} from "../src/BI9.sol";
import {StakeVault} from "../src/StakeVault.sol";
import {TimelockAdmin} from "../src/TimelockAdmin.sol";

/// @notice Deploys timelock (admin), BI9 with mint disabled (cap 0), and StakeVault.
/// @dev No WeixBucks wiring. Set cap + minter later via TimelockAdmin.propose.
///      Testnet / Anvil default. For chain 999 use `DeployMainnet.s.sol`.
contract Deploy is Script {
    uint256 internal constant HYPEREVM_TESTNET = 998;

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
        _writeLastRun(tl, token, vault, admin, delay);
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
        if (chainId == HYPEREVM_TESTNET) {
            console2.log("network: HyperEVM testnet");
        }
    }

    function _writeLastRun(
        TimelockAdmin tl,
        BI9 token,
        StakeVault vault,
        address admin,
        uint256 delay
    ) internal {
        string memory json = string.concat(
            "{\n",
            '  "chainId": ',
            vm.toString(block.chainid),
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
            '  "mintDisabled": true\n',
            "}\n"
        );
        vm.writeFile("deployments/last-run.json", json);
        console2.log("wrote deployments/last-run.json; copy to testnet.json or mainnet.json after review");
    }
}
