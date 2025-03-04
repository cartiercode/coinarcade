let tronWeb;
let contractAddress = "YOUR_CONTRACT_ADDRESS_HERE"; // Replace later

async function initTron() {
    if (window.tronLink) {
        await window.tronLink.request({ method: 'tron_requestAccounts' });
        tronWeb = window.tronLink.tronWeb;
        document.getElementById('leaderboard').innerText = "TronLink Connected!";
        // Add contract init here once deployed
    } else {
        document.getElementById('leaderboard').innerText = "Please install TronLink!";
    }
}

window.addEventListener('load', initTron);
