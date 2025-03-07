pragma solidity ^0.8.0;

interface ITRC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract GalagaLeaderboard {
    address public owner;
    address public automationAddress;
    uint256 public trxPrizePool;
    uint256 public trxEntryFee = 4 * 10**6; // 4 TRX (adjustable)
    uint256 public stablecoinEntryFee = 1 * 10**6; // 1 USDT/USDC
    uint256 public lastResetTimestamp;
    uint256 public constant RESET_INTERVAL = 24 hours;
    uint256 public constant TARGET_HOUR_UTC = 12; // 12:00 UTC

    ITRC20 public usdtToken = ITRC20(0xa614f803B6FD780986A42c78Ec9c7f77e6dEd13C); // TRON Mainnet USDT
    ITRC20 public usdcToken = ITRC20(0xCaC7Ffa42cD773bF4E7eC6eE0D5C91eB76F5f735); // TRON Mainnet USDC (verify!)
    uint256 public maxLeaderboardSize = 10;

    struct PlayerScore {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    PlayerScore[] public leaderboard;
    mapping(address => bool) public hasPaid;
    mapping(address => uint256) public lifetimePoints; // Tracks total points for paid plays

    event ScoreSubmitted(address indexed player, uint256 score, uint256 lifetimePoints);
    event EntryFeePaid(address indexed player, string token, uint256 amount);
    event PrizeDistributed(address indexed player, string token, uint256 amount);
    event LeaderboardReset(uint256 timestamp);
    event ErrorLogged(address indexed sender, string message);

    constructor(address _automationAddress) {
        owner = msg.sender;
        automationAddress = _automationAddress;
        lastResetTimestamp = block.timestamp;
    }

    modifier onlyOwnerOrAutomation() {
        require(msg.sender == owner || msg.sender == automationAddress, "Not authorized");
        _;
    }

    // Pay with TRX
    function payEntryFeeWithTRX() external payable {
        require(msg.value >= trxEntryFee, "Insufficient TRX fee");
        require(!hasPaid[msg.sender], "Already paid for a session");
        
        trxPrizePool += msg.value;
        hasPaid[msg.sender] = true;
        emit EntryFeePaid(msg.sender, "TRX", msg.value);
    }

    // Pay with USDT
    function payEntryFeeWithUSDT() external {
        require(!hasPaid[msg.sender], "Already paid for a session");
        require(usdtToken.transferFrom(msg.sender, address(this), stablecoinEntryFee), "USDT transfer failed");
        
        hasPaid[msg.sender] = true;
        emit EntryFeePaid(msg.sender, "USDT", stablecoinEntryFee);
    }

    // Pay with USDC
    function payEntryFeeWithUSDC() external {
        require(!hasPaid[msg.sender], "Already paid for a session");
        require(usdcToken.transferFrom(msg.sender, address(this), stablecoinEntryFee), "USDC transfer failed");
        
        hasPaid[msg.sender] = true;
        emit EntryFeePaid(msg.sender, "USDC", stablecoinEntryFee);
    }

    // Submit score (only paid plays update lifetime points and leaderboard)
    function submitScore(uint256 _score) external {
        if (hasPaid[msg.sender]) {
            hasPaid[msg.sender] = false;
            lifetimePoints[msg.sender] += _score; // Only paid plays add to lifetime points
            leaderboard.push(PlayerScore(msg.sender, _score, block.timestamp));
            sortLeaderboard();
            if (leaderboard.length > maxLeaderboardSize) leaderboard.pop();
            emit ScoreSubmitted(msg.sender, _score, lifetimePoints[msg.sender]);
        }
        // Free plays do nothing on-chain
    }

    // Sort leaderboard
    function sortLeaderboard() private {
        for (uint i = 0; i < leaderboard.length - 1; i++) {
            for (uint j = 0; j < leaderboard.length - i - 1; j++) {
                if (leaderboard[j].score < leaderboard[j + 1].score) {
                    (leaderboard[j], leaderboard[j + 1]) = (leaderboard[j + 1], leaderboard[j]);
                }
            }
        }
    }

    // Check if reset is due
    function canReset() public view returns (bool) {
        uint256 currentTime = block.timestamp;
        uint256 timeSinceEpoch = currentTime % (24 hours);
        uint256 targetTime = TARGET_HOUR_UTC * 1 hours;
        
        return (currentTime >= lastResetTimestamp + RESET_INTERVAL) && 
               (timeSinceEpoch >= targetTime);
    }

    // Reset and distribute
    function resetAndDistribute() external onlyOwnerOrAutomation {
        require(canReset(), "Reset not due yet");

        if (leaderboard.length > 0) {
            uint256 trxBalance = address(this).balance;
            uint256 usdtBalance = usdtToken.balanceOf(address(this));
            uint256 usdcBalance = usdcToken.balanceOf(address(this));

            if (trxBalance > 0 || usdtBalance > 0 || usdcBalance > 0) {
                uint256 trxOwnerShare = trxBalance * 10 / 100;
                uint256 usdtOwnerShare = usdtBalance * 10 / 100;
                uint256 usdcOwnerShare = usdcBalance * 10 / 100;

                uint256 trxDistributable = trxBalance - trxOwnerShare;
                uint256 usdtDistributable = usdtBalance - usdtOwnerShare;
                uint256 usdcDistributable = usdcBalance - usdcOwnerShare;

                uint256[10] memory payoutPercentages = [
                    uint256(25), 20, 15, 10, 8, 6, 4, 3, 2, 1
                ];

                for (uint i = 0; i < leaderboard.length && i < 10; i++) {
                    address player = leaderboard[i].player;
                    if (trxDistributable > 0) {
                        uint256 trxAmount = (trxDistributable * payoutPercentages[i]) / 90;
                        (bool sentTRX, ) = player.call{value: trxAmount}("");
                        if (sentTRX) emit PrizeDistributed(player, "TRX", trxAmount);
                    }
                    if (usdtDistributable > 0) {
                        uint256 usdtAmount = (usdtDistributable * payoutPercentages[i]) / 90;
                        if (usdtToken.transfer(player, usdtAmount)) emit PrizeDistributed(player, "USDT", usdtAmount);
                    }
                    if (usdcDistributable > 0) {
                        uint256 usdcAmount = (usdcDistributable * payoutPercentages[i]) / 90;
                        if (usdcToken.transfer(player, usdcAmount)) emit PrizeDistributed(player, "USDC", usdcAmount);
                    }
                }
            }
        }

        delete leaderboard;
        lastResetTimestamp = block.timestamp;
        emit LeaderboardReset(block.timestamp);
    }

    // Log error (restricted)
    function logError(string memory _message) external onlyOwnerOrAutomation {
        emit ErrorLogged(msg.sender, _message);
    }

    // View leaderboard
    function getLeaderboard() external view returns (PlayerScore[] memory) {
        return leaderboard;
    }

    // Check eligibility
    function isPlayerEligible(address _player) external view returns (bool) {
        return hasPaid[_player];
    }

    // Get lifetime points
    function getLifetimePoints(address _player) external view returns (uint256) {
        return lifetimePoints[_player];
    }

    // Update TRX entry fee
    function setTRXEntryFee(uint256 _newFee) external {
        require(msg.sender == owner, "Only owner");
        require(_newFee > 0, "Fee must be positive");
        trxEntryFee = _newFee;
    }

    // Withdraw TRX
    function withdrawTRX() external {
        require(msg.sender == owner, "Only owner");
        uint256 balance = address(this).balance;
        (bool sent, ) = owner.call{value: balance}("");
        require(sent, "Failed to withdraw TRX");
    }

    // Withdraw USDT/USDC
    function withdrawTokens(address _token) external {
        require(msg.sender == owner, "Only owner");
        ITRC20 token = ITRC20(_token);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(owner, balance), "Token withdrawal failed");
    }
}
