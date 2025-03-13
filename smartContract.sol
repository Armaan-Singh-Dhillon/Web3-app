// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnergyBilling {
    address public owner;
    mapping(address => uint256) public userEnergy; // Stores energy consumption per user
    mapping(address => uint256) public userBills; // Stores the bill amount per user

    uint256 public constant RATE_PER_KWH = 2; // Cost per kWh (Example: 2 Wei per kWh)

    event EnergyStored(address indexed user, uint256 energy);
    event BillPaid(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender; // Set contract deployer as owner
    }

    function storeEnergy(uint256 _totalEnergy) public {
        require(_totalEnergy > 0, "Energy must be greater than zero");

        userEnergy[msg.sender] += _totalEnergy;
        userBills[msg.sender] = userEnergy[msg.sender] * RATE_PER_KWH;

        emit EnergyStored(msg.sender, _totalEnergy);
    }

    function getBill() public view returns (uint256) {
        return userBills[msg.sender];
    }

    function payBill() public payable {
        uint256 billAmount = userBills[msg.sender];
        require(msg.value == billAmount, "Incorrect payment amount");

        userBills[msg.sender] = 0; // Reset bill after payment

        emit BillPaid(msg.sender, msg.value);
    }
}
