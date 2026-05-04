// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts@4.9.6/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.9.6/access/Ownable.sol";
contract DQToken is ERC20, Ownable {
    constructor() ERC20("DeepQuest", "DQ") {
        _mint(msg.sender, 100_000_000_000 * 10**18);
    }
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    function burnFrom(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
