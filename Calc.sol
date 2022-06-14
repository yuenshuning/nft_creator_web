// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "ERC721Creator.sol";

contract Calc{

  uint count;

  function add(uint a, uint b) public returns(uint){
    count++;
    return a + b;
  }

    function getCount() public view returns (uint){
        return count;
    }
}