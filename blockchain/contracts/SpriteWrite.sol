// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "operator-filter-registry/src/UpdatableOperatorFilterer.sol";
import {CANONICAL_OPERATOR_FILTER_REGISTRY_ADDRESS, CANONICAL_CORI_SUBSCRIPTION} from "operator-filter-registry/src/lib/Constants.sol";

contract SpriteWrite is
    ERC721,
    ERC721Royalty,
    ERC721Burnable,
    AccessControl,
    Ownable,
    UpdatableOperatorFilterer
{
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 constant SPRITE_SIZE = 256;

    struct Sprite {
        uint8[SPRITE_SIZE] colors;
    }

    Sprite[] sprites;

    uint256 public totalSupply;

    event MintedSprite(address indexed to, uint256 indexed tokenId, uint8[SPRITE_SIZE] colors);

    constructor()
        ERC721("Sprite Write!", "SPRITEWRITE")
        UpdatableOperatorFilterer(
            CANONICAL_OPERATOR_FILTER_REGISTRY_ADDRESS,
            CANONICAL_CORI_SUBSCRIPTION,
            true
        )
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function checkColors(uint8[SPRITE_SIZE] memory _colors) internal pure {
        for (uint i = 0; i < SPRITE_SIZE; i++) {
            require(_colors[i] < 64, "Invalid color");
        }
    }

    /// @notice Mints a new sprite.
    /// @param _colorsHex The colors of the sprite as a consolidated hex string.
    /// @param _to The address to mint the sprite to.
    function safeMint(string memory _colorsHex, address _to) public onlyRole(MINTER_ROLE) {
        uint8[SPRITE_SIZE] memory _colors = parseColorIndices(_colorsHex);
        checkColors(_colors);
        Sprite memory newSprite = Sprite(_colors);
        uint256 newItemId = sprites.length;
        sprites.push(newSprite);
        _safeMint(_to, newItemId);
        emit MintedSprite(_to, newItemId, _colors);
    }

    function parseColorIndices(
        string memory hexString
    ) internal pure returns (uint8[SPRITE_SIZE] memory colorIndices) {
        bytes memory hexBytes = bytes(hexString);
        require(hexBytes.length == SPRITE_SIZE * 2, "Invalid color indices hex string");

        for (uint i = 0; i < hexBytes.length; i += 2) {
            uint8 index = uint8(parseInt(hexBytes[i])) * 16 + uint8(parseInt(hexBytes[i + 1]));
            colorIndices[i / 2] = uint8(index);
        }

        return colorIndices;
    }

    function parseInt(bytes1 b) internal pure returns (uint8) {
        if (uint8(b) >= 48 && uint8(b) <= 57) {
            return uint8(b) - 48;
        } else if (uint8(b) >= 65 && uint8(b) <= 70) {
            return uint8(b) - 65 + 10;
        } else if (uint8(b) >= 97 && uint8(b) <= 102) {
            return uint8(b) - 97 + 10;
        } else {
            revert("Invalid hex character");
        }
    }

    /// @notice Gets the sprite with the given ID.
    /// @param _tokenId The ID of the sprite.
    /// @return sprite The sprite.
    function getSprite(uint256 _tokenId) external view returns (Sprite memory sprite) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
        return sprites[_tokenId];
    }

    /// @notice Gets the sprite SVG image with the given ID.
    /// @param _tokenId The ID of the sprite.
    /// @return svg The SVG image.
    function getSpriteImageURI(uint256 _tokenId) external view returns (string memory) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
        Sprite storage sprite = sprites[_tokenId];
        return
            string(
                abi.encodePacked(
                    "data:image/svg+xml;base64,",
                    Base64.encode(bytes(generateSVG(sprite)))
                )
            );
    }

    /// @notice Gets the NFT metadata of the sprite with the given ID.
    /// @param tokenId The ID of the sprite.
    /// @return uri The NFT metadata.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        Sprite storage sprite = sprites[tokenId];
        string memory svg = generateSVG(sprite);

        string memory uri = string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(
                    bytes(
                        string(
                            abi.encodePacked(
                                '{"name": "Sprite #',
                                tokenId.toString(),
                                '", "description": "This is a sprite!", "image_data": "data:image/svg+xml;base64,',
                                Base64.encode(bytes(svg)),
                                '"}'
                            )
                        )
                    )
                )
            )
        );

        return uri;
    }

    function generateSVG(Sprite storage sprite) internal view returns (string memory) {
        string
            memory header = '<svg width="320" height="320" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">';
        string memory footer = "</svg>";

        string memory rects = "";
        for (uint i = 0; i < 256; i++) {
            uint8 color = sprite.colors[i];
            string memory colorCode = getColorCode(color);

            rects = string(
                abi.encodePacked(
                    rects,
                    '<rect x="',
                    (i % 16).toString(),
                    '" y="',
                    (i / 16).toString(),
                    '" width="1" height="1" fill="',
                    colorCode,
                    '"/>'
                )
            );
        }

        return string(abi.encodePacked(header, rects, footer));
    }

    string[64] private palette = [
        "#FFFFFF",
        "#000000",
        "#C0C0C0",
        "#808080",
        "#800000",
        "#FF0000",
        "#800080",
        "#FF00FF",
        "#008000",
        "#00FF00",
        "#808000",
        "#FFFF00",
        "#000080",
        "#0000FF",
        "#008080",
        "#00FFFF",
        "#A0522D",
        "#D2691E",
        "#CD853F",
        "#F4A460",
        "#8B4513",
        "#A52A2A",
        "#B22222",
        "#DC143C",
        "#FF4500",
        "#2E8B57",
        "#ADFF2F",
        "#7FFF00",
        "#32CD32",
        "#3CB371",
        "#00FA9A",
        "#00FF7F",
        "#BDB76B",
        "#F0E68C",
        "#FFFACD",
        "#EEE8AA",
        "#B8860B",
        "#DAA520",
        "#FFD700",
        "#808000",
        "#556B2F",
        "#6B8E23",
        "#7CFC00",
        "#7FFF00",
        "#228B22",
        "#008000",
        "#006400",
        "#2E8B57",
        "#66CDAA",
        "#3CB371",
        "#20B2AA",
        "#48D1CC",
        "#40E0D0",
        "#00CED1",
        "#7FFFD4",
        "#4682B4",
        "#B0C4DE",
        "#87CEEB",
        "#1E90FF",
        "#6495ED",
        "#4169E1",
        "#0000CD",
        "#000080",
        "#191970"
    ];

    /// @notice Gets the color codes of the palette.
    /// @return colorCodes The color codes.
    function colorCodes() external view returns (string[64] memory) {
        return palette;
    }

    function getColorCode(uint8 colorIndex) internal view returns (string memory) {
        return palette[colorIndex];
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(_from, _to, _tokenId, _batchSize);

        if (_from == address(0)) {
            totalSupply++;
        }
        if (_to == address(0)) {
            totalSupply--;
        }
    }

    // ERC2981 Secondary sale royalties.
    event RoyaltyInfoSet(address royaltyReceiver, uint256 royaltyNumerator);

    function setRoyaltyInfo(
        address _royaltyReceiver,
        uint96 _royaltyNumerator
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(_royaltyReceiver, _royaltyNumerator);
        emit RoyaltyInfoSet(_royaltyReceiver, _royaltyNumerator);
    }

    // The following functions are required by OperatorFilterer.
    function setApprovalForAll(
        address operator,
        bool approved
    ) public override onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    function approve(
        address operator,
        uint256 tokenId
    ) public override onlyAllowedOperatorApproval(operator) {
        super.approve(operator, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function owner()
        public
        view
        virtual
        override(Ownable, UpdatableOperatorFilterer)
        returns (address)
    {
        return Ownable.owner();
    }

    function _burn(uint256 _tokenId) internal override(ERC721Royalty, ERC721) {
        super._burn(_tokenId);
    }
}
