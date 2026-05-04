// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts@4.9.6/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts@4.9.6/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
contract DQCard is ERC721Enumerable, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    uint256 public constant CARD_A = 1;
    uint256 public constant CARD_B = 2;
    uint256 public constant CARD_C = 3;
    uint256 public totalA;
    uint256 public totalB;
    uint256 public totalC;
    uint256 public constant MAX_A = 1000;
    uint256 public constant MAX_B = 500;
    uint256 public constant MAX_C = 100;
    uint256 public constant PRICE_A = 500 ether;
    uint256 public constant PRICE_B = 1500 ether;
    uint256 public constant PRICE_C = 5000 ether;
    mapping(uint256 => uint256) public cardType;
    mapping(address => EnumerableSet.UintSet) private _holderTokens;
    constructor() ERC721("DQ Card", "DQC") {}
    function mintByOwner(address to, uint256 _type) external onlyOwner {
        _mintCard(to, _type);
    }
    function mintBatchByOwner(address[] calldata to, uint256[] calldata _types) external onlyOwner {
        require(to.length == _types.length, "length mismatch");
        for (uint i = 0; i < to.length; i++) {
            _mintCard(to[i], _types[i]);
        }
    }
    function _mintCard(address to, uint256 _type) internal {
        require(_type >= CARD_A && _type <= CARD_C, "invalid type");
        if (_type == CARD_A) {
            require(totalA < MAX_A, "A card sold out");
            totalA++;
        } else if (_type == CARD_B) {
            require(totalB < MAX_B, "B card sold out");
            totalB++;
        } else {
            require(totalC < MAX_C, "C card sold out");
            totalC++;
        }
        uint256 tokenId = totalSupply() + 1;
        _safeMint(to, tokenId);
        cardType[tokenId] = _type;
        _holderTokens[to].add(tokenId);
    }
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        if (batchSize > 1) {
            revert("ERC721Enumerable: consecutive transfers not supported");
        }
        if (from != address(0)) {
            _holderTokens[from].remove(firstTokenId);
        }
        if (to != address(0)) {
            _holderTokens[to].add(firstTokenId);
        }
    }
    function getCardPrice(uint256 _type) public pure returns (uint256) {
        if (_type == CARD_A) return PRICE_A;
        if (_type == CARD_B) return PRICE_B;
        return PRICE_C;
    }
}
