let tronWeb;
let contract;
const contractAddress = "YOUR_CONTRACT_ADDRESS_HERE"; // Replace with your deployed address after deployment

async function initTron() {
    if (window.tronLink) {
        await window.tronLink.request({ method: 'tron_requestAccounts' });
        tronWeb = window.tronLink.tronWeb;
        contract = await tronWeb.contract().at(contractAddress);
        document.getElementById('leaderboard').innerText = "Connected to TronLink!";
        updateLeaderboard();
    } else {
        document.getElementById('leaderboard').innerText = "Please install TronLink!";
    }
}

async function payForLeaderboard(tokenType) {
    try {
        if (tokenType === 'TRX') {
            const fee = await contract.trxEntryFee().call();
            await contract.payEntryFeeWithTRX().send({ callValue: fee, shouldPollResponse: true });
        } else if (tokenType === 'USDT') {
            await contract.payEntryFeeWithUSDT().send({ shouldPollResponse: true });
        } else if (tokenType === 'USDC') {
            await contract.payEntryFeeWithUSDC().send({ shouldPollResponse: true });
        }
        alert(`Payment successful with ${tokenType}! Your next game counts toward the leaderboard.`);
        document.getElementById('payButtonTRX').disabled = true;
        document.getElementById('payButtonUSDT').disabled = true;
        document.getElementById('payButtonUSDC').disabled = true;
    } catch (error) {
        console.error("Payment error:", error);
        alert("Payment failed!");
    }
}

async function submitScore(score) {
    try {
        const isEligible = await contract.isPlayerEligible(tronWeb.defaultAddress.hex).call();
        if (isEligible) {
            await contract.submitScore(score).send({ shouldPollResponse: true });
            console.log("Score submitted:", score);
            updateLeaderboard();
            document.getElementById('payButtonTRX').disabled = false;
            document.getElementById('payButtonUSDT').disabled = false;
            document.getElementById('payButtonUSDC').disabled = false;
        } else {
            console.log("Score not submitted (free play):", score);
        }
    } catch (error) {
        console.error("Submission error:", error);
    }
}

async function updateLeaderboard() {
    try {
        const leaderboard = await contract.getLeaderboard().call();
        let leaderboardText = "Leaderboard:\n";
        leaderboard.forEach((entry, i) => {
            leaderboardText += `${i + 1}. ${tronWeb.address.fromHex(entry.player)}: ${entry.score}\n`;
        });
        document.getElementById('leaderboard').innerText = leaderboardText;
    } catch (error) {
        console.error("Leaderboard fetch error:", error);
    }
}

window.addEventListener('load', initTron);
window.submitScore = submitScore;

// New code starts here
function shareScore() {
    const score = window.currentScore || 0;
    const tweetText = `I scored ${score} in Galaga on CoinArcade! Play now at https://cartiercode.github.io/coinarcade/ #Galaga #Tron #CoinArcade`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank');
}

function resetShareButton() {
    document.getElementById('shareButton').style.display = 'none';
}
