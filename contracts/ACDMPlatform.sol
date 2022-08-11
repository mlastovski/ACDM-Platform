//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./interfaces/IACDMToken.sol";
import "./interfaces/IXXXToken.sol";
import "./interfaces/IUniswapV2Router02.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ACDMPlatform is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private orderId;

    IACDMToken private acdm;
    IXXXToken private xxx;
    IUniswapV2Router02 private uniswapV2Router;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant REGISTERED_ROLE = keccak256("REGISTERED_ROLE");

    address public constant uniswapV2RouterAddress = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant wethAddress = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
    address public xxxTokenAddress;
    address public owner;

    uint8 public refererTradeFee;
    uint8 public firstRefererSaleFee;
    uint8 public secondRefererSaleFee;

    uint256 public constant INITIAL_SALE_VOLUME = 100000 * 1e6;
    uint256 public constant INITIAL_PRICE = 1e13;

    uint256 public currentPrice;
    uint256 public tradedVolume;
    uint256 public currentSaleVolume;
    uint256 public totalFeesCollected;

    uint256 private saleRoundFinishTimestamp;
    uint256 private tradeRoundFinishTimestamp;

    struct Order {
        address seller;
        uint256 price;
        uint256 available;
    }

    enum RoundStatus {
        onNone,
        onSale,
        onTrade
    }

    RoundStatus public status;

    mapping(uint256 => Order) private orders;
    mapping(address => address) private refererOf;

    event Registered(
        address account,
        address referer
    );

    event RoundStarted(
        uint256 finishTimestamp,
        RoundStatus round
    );

    event Sold(
        address buyer,
        uint256 amount
    );

    event NewOrder(
        uint256 id,
        address seller,
        uint256 price,
        uint256 amount
    );

    event OrderRemoved(
        uint256 id,
        uint256 available
    );

    event OrderRedeemed(
        uint256 id,
        address buyer
    );

    event OrderUpdated(
        uint256 id,
        uint256 available
    );

    modifier saleInProgress {
        require(
            saleRoundFinishTimestamp > block.timestamp,
            "Sale round is over"
        );
        _;
    }

    modifier saleOver {
        require(
            saleRoundFinishTimestamp < block.timestamp,
            "Sale round is in progress"
        );
        _;
    }

    modifier tradeInProgress {
        require(
            tradeRoundFinishTimestamp > block.timestamp,
            "Trade round is over"
        );
        _;
    }

    modifier tradeOver {
        require(
            tradeRoundFinishTimestamp < block.timestamp,
            "Trade round is in progress"
        );
        _;
    }

    constructor(
        address _acdm,
        address _xxx,
        address _dao
    ) 
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        grantRole(DAO_ROLE, _dao);

        acdm = IACDMToken(_acdm);
        xxx = IXXXToken(_xxx);
        uniswapV2Router = IUniswapV2Router02(uniswapV2RouterAddress);

        xxxTokenAddress = _xxx;
        owner = msg.sender;

        status = RoundStatus.onNone;

        refererTradeFee = 25;
        firstRefererSaleFee = 50;
        secondRefererSaleFee = 30;
    }

    function startSaleRound() external tradeOver saleOver {
        require(
            status == RoundStatus.onTrade || 
            status == RoundStatus.onNone, 
            "Wrong round status"
        );

        saleRoundFinishTimestamp = block.timestamp + 3 days;
        status = RoundStatus.onSale;

        currentPrice > 0 
            ? currentPrice = calculateNextPrice(currentPrice) 
            : currentPrice = INITIAL_PRICE;
        
        tradedVolume > 0 
            ? currentSaleVolume = ((tradedVolume * 1e6) / currentPrice) 
            : currentSaleVolume = INITIAL_SALE_VOLUME;

        acdm.mint(address(this), currentSaleVolume);

        emit RoundStarted(saleRoundFinishTimestamp, status);
    }

    function buyACDM() external payable onlyRole(REGISTERED_ROLE) saleInProgress {
        uint256 amount = ((msg.value * 1e6) / currentPrice);

        require(
            amount <= currentSaleVolume,
            "Amount cannot exceed currentSaleVolume"
        );

        if (amount == currentSaleVolume) {
            saleRoundFinishTimestamp = block.timestamp;
        }

        currentSaleVolume -= amount;

        acdm.transfer(msg.sender, amount);
        rewardReferers(
            msg.sender, 
            msg.value, 
            firstRefererSaleFee, 
            secondRefererSaleFee
        );

        emit Sold(msg.sender, amount);
    }

    function startTradeRound() external tradeOver saleOver {
        require(status == RoundStatus.onSale, "Wrong round status");
        
        if (currentSaleVolume > 0) {
            acdm.burn(address(this), currentSaleVolume);
        }

        tradeRoundFinishTimestamp = block.timestamp + 3 days;
        status = RoundStatus.onTrade;
        tradedVolume = 0;

        emit RoundStarted(tradeRoundFinishTimestamp, status);
    }

    function addOrder(
        uint256 price, 
        uint256 amount
    ) 
        external 
        onlyRole(REGISTERED_ROLE) 
        tradeInProgress 
    {
        acdm.transferFrom(msg.sender, address(this), amount);

        Order storage o = orders[orderId.current()];
        o.seller = msg.sender;
        o.price = price;
        o.available = amount;

        emit NewOrder(orderId.current(), msg.sender, price, amount);

        orderId.increment();
    }

    function removeOrder(uint256 id) external {
        Order storage o = orders[id];
        require(o.seller == msg.sender, "You are not a seller");

        acdm.transfer(o.seller, o.available);

        emit OrderRemoved(id, o.available);

        o.available = 0;
    }

    function redeemOrder(
        uint256 id
    ) 
        external 
        payable 
        onlyRole(REGISTERED_ROLE) 
        tradeInProgress 
        saleOver 
    {
        Order storage o = orders[id];
        uint256 amount = (msg.value * 1e6) / o.price;

        require(o.available > 0, "Order is redeemed");
        require(o.available >= amount, "Not enough available");

        o.available -= amount;

        acdm.transfer(msg.sender, amount);
        rewardReferers(
            o.seller, 
            msg.value, 
            refererTradeFee, 
            refererTradeFee
        );

        tradedVolume += msg.value;

        if (o.available == 0) {
            emit OrderRedeemed(id, msg.sender);
        } else {
            emit OrderUpdated(id, o.available);
        }
    }

    function register(address referer) external {
        require(!hasRole(REGISTERED_ROLE, msg.sender), "Already registered");

        if (referer == address(0)) {
            _grantRole(REGISTERED_ROLE, msg.sender);
        } else {
            require(hasRole(REGISTERED_ROLE, referer), "Referer not registered");

            _grantRole(REGISTERED_ROLE, msg.sender);

            refererOf[msg.sender] = referer;
        }

        _grantRole(REGISTERED_ROLE, msg.sender);

        emit Registered(msg.sender, refererOf[msg.sender]);
    }

    function modifyRefererTradeFees(uint8 fee) external onlyRole(DAO_ROLE) {
        refererTradeFee = fee;
    }

    function modifyRefererSaleFees(
        uint8 _firstFee, 
        uint8 _secondFee
    ) 
        external 
        onlyRole(DAO_ROLE) 
    {
        firstRefererSaleFee = _firstFee;
        secondRefererSaleFee = _secondFee;
    }

    function withdrawFeesCollected() external onlyRole(DAO_ROLE) nonReentrant {
        payable(owner).transfer(totalFeesCollected);
        totalFeesCollected = 0;
    }

    function buyAndBurnXXX() external onlyRole(DAO_ROLE) {
        address[] memory path = new address[](2);
        path[0] = wethAddress;
        path[1] = xxxTokenAddress;
        uint256[] memory minOutAmounts = uniswapV2Router.getAmountsOut(totalFeesCollected, path);

        uniswapV2Router.swapExactETHForTokens{ value: totalFeesCollected }(
            minOutAmounts[1],
            path,
            address(this),
            block.timestamp
        );

        totalFeesCollected = 0;
        xxx.burn(address(this), minOutAmounts[1]);
    }

    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount = address(this).balance - totalFeesCollected;
        payable(msg.sender).transfer(amount);
    }

    function rewardReferers(
        address sender, 
        uint256 value, 
        uint256 firstFee, 
        uint256 secondFee
    )
        private
    {
        uint256 totalFirstFee = (value * firstFee) / 1000;
        uint256 totalSecondFee = (value * secondFee) / 1000;
        address senderReferer = refererOf[sender];

        if (senderReferer != address(0)) {
            payable(senderReferer).transfer(totalFirstFee);

            address secondReferer = refererOf[senderReferer];

            if (secondReferer != address(0)) {
                payable(secondReferer).transfer(totalSecondFee);
            } else {
                totalFeesCollected += totalSecondFee;
            }

        } else {
            totalFeesCollected += totalFirstFee + totalSecondFee;
        }
    }

    function calculateNextPrice(uint256 price) private pure returns (uint256) {
        return ((price * 103) / 100) + 4e12;
    }
}
