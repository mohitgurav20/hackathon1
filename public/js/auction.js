const CONTRACT_ADDRESS = "0xc3e5cb6a077abc151549f9c7d11408c3149392b4";
const USE_DEMO_DATA = true; // Set to false to use real blockchain data

const abi = [
    { "inputs": [{ "internalType": "bytes32", "name": "_blindedBid", "type": "bytes32" }], "name": "bid", "outputs": [], "stateMutability": "payable", "type": "function" },
    { "inputs": [{ "internalType": "uint256[]", "name": "_values", "type": "uint256[]" }, { "internalType": "bool[]", "name": "_fakes", "type": "bool[]" }, { "internalType": "bytes32[]", "name": "_secrets", "type": "bytes32[]" }], "name": "reveal", "outputs": [], "stateMutability": "external", "type": "function" },
    { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "external", "type": "function" },
    { "inputs": [], "name": "auctionEnd", "outputs": [], "stateMutability": "external", "type": "function" },
    { "inputs": [], "name": "biddingEnd", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "revealEnd", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "ended", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "highestBidder", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "highestBid", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

let provider;
let signer;
let contract;

const connectWalletBtn = document.getElementById('connectWalletBtn');
const contractAddressSpan = document.getElementById('contractAddress');
const auctionStatusSpan = document.getElementById('auctionStatus');
const biddingEndSpan = document.getElementById('biddingEnd');
const revealEndSpan = document.getElementById('revealEnd');
const highestBidderSpan = document.getElementById('highestBidder');
const highestBidSpan = document.getElementById('highestBid');

const commitForm = document.getElementById('commitForm');
const revealForm = document.getElementById('revealForm');
const withdrawBtn = document.getElementById('withdrawBtn');

async function init() {
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        // Sync with existing connection
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            await connectWallet();
        }
    } else {
        connectWalletBtn.innerText = "Install MetaMask";
    }
}

async function connectWallet() {
    try {
        signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        connectWalletBtn.innerText = address.substring(0, 6) + "..." + address.substring(address.length - 4);
        
        if(CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith("0x")) {
            contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
            contractAddressSpan.innerText = CONTRACT_ADDRESS;
            // Wait a moment for network sync
            setTimeout(updateDashboard, 500);
        }
    } catch (err) {
        console.error("Connection error", err);
    }
}

connectWalletBtn.addEventListener('click', () => connectWallet());

function enterDemoMode(reason) {
    console.log("Demo Mode Activated:", reason);
    auctionStatusSpan.innerText = "Live: Bidding Phase (Demo)";
    auctionStatusSpan.className = "status-badge status-active";
    contractAddressSpan.innerText = CONTRACT_ADDRESS + " (Simulated)";
    biddingEndSpan.innerText = new Date(Date.now() + 3600000).toLocaleString();
    revealEndSpan.innerText = new Date(Date.now() + 7200000).toLocaleString();
    highestBidderSpan.innerText = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    highestBidSpan.innerText = "1.4250 ETH";
}

async function updateDashboard() {
    if (USE_DEMO_DATA) return enterDemoMode("Forced");
    if(!contract) return;
    try {
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === "0x") return enterDemoMode("No Code at Address");

        const [bEnd, rEnd, isEnded, hBidder, hBid] = await Promise.all([
            contract.biddingEnd(), contract.revealEnd(), contract.ended(),
            contract.highestBidder(), contract.highestBid()
        ]);
        
        const now = Math.floor(Date.now() / 1000);
        biddingEndSpan.innerText = new Date(Number(bEnd) * 1000).toLocaleString();
        revealEndSpan.innerText = new Date(Number(rEnd) * 1000).toLocaleString();
        
        if (isEnded) {
            auctionStatusSpan.innerText = "Ended";
            auctionStatusSpan.className = "status-badge status-danger";
        } else if (now < Number(bEnd)) {
            auctionStatusSpan.innerText = "Bidding Phase (Commit)";
            auctionStatusSpan.className = "status-badge status-active";
        } else {
            auctionStatusSpan.innerText = "Reveal Phase";
            auctionStatusSpan.className = "status-badge status-active";
        }

        if (hBidder !== ethers.ZeroAddress) {
            highestBidderSpan.innerText = hBidder;
            highestBidSpan.innerText = ethers.formatEther(hBid);
        }
    } catch (err) {
        enterDemoMode(err.message);
    }
}

// Helper to hash the bid locally
function getBlindedBid(valueEth, fake, secretStr) {
    const valueWei = ethers.parseEther(valueEth.toString());
    const secretBytes = ethers.encodeBytes32String(secretStr);
    
    // Equivalent to keccak256(abi.encodePacked(value, fake, secret))
    return ethers.solidityPackedKeccak256(
        ['uint256', 'bool', 'bytes32'],
        [valueWei, fake, secretBytes]
    );
}

commitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bidAmount = document.getElementById('bidAmount').value;
    const secret = document.getElementById('bidSecret').value;
    const depositAmount = document.getElementById('depositAmount').value;
    const isFake = document.getElementById('isFake').checked;

    const btn = commitForm.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Encrypting Bid...";

    try {
        if (!contract) {
            // DEMO MODE
            setTimeout(() => {
                showToast("Demo: Bid committed successfully!", "success");
                btn.disabled = false;
                btn.innerText = "Submit Blind Bid";
                commitForm.reset();
            }, 1500);
            return;
        }

        const blindedBid = getBlindedBid(bidAmount, isFake, secret);
        const tx = await contract.bid(blindedBid, {
            value: ethers.parseEther(depositAmount.toString())
        });
        showToast("Transaction sent! Pending...", "info");
        await tx.wait();
        showToast("Bid committed successfully!", "success");
        updateDashboard();
        commitForm.reset();
    } catch (err) {
        console.error(err);
        showToast("Error: " + (err.reason || err.message), "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit Blind Bid";
    }
});

revealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = document.getElementById('revealAmount').value;
    const secret = document.getElementById('revealSecret').value;

    const btn = revealForm.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Verifying Hash...";

    try {
        if (!contract) {
            // DEMO MODE
            setTimeout(() => {
                showToast("Demo: Bid revealed successfully!", "success");
                btn.disabled = false;
                btn.innerText = "Verify & Reveal";
                revealForm.reset();
            }, 1500);
            return;
        }

        // Standard reveal logic
        const valueWei = ethers.parseEther(amount.toString());
        const secretBytes = ethers.encodeBytes32String(secret);
        
        // Note: This contract expects arrays for reveal (if user has multiple bids)
        // For simplicity we send a 1-item array for the current session
        const tx = await contract.reveal([valueWei], [false], [secretBytes]);
        showToast("Revealing... Please wait.", "info");
        await tx.wait();
        showToast("Bid revealed successfully!", "success");
        updateDashboard();
        revealForm.reset();
    } catch (err) {
        console.error(err);
        showToast("Error: " + (err.reason || err.message), "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Verify & Reveal";
    }
});

withdrawBtn.addEventListener('click', async () => {
    if (!contract) return showToast("Demo: Withdrawal initiated! Check your wallet.", "success");
    
    try {
        const tx = await contract.withdraw();
        showToast("Withdrawal pending...", "info");
        await tx.wait();
        showToast("Withdrawal successful!", "success");
        updateDashboard();
    } catch (err) {
        console.error(err);
        showToast("Error: " + (err.reason || err.message), "error");
    }
});

revealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!contract) return;

    const revealAmount = document.getElementById('revealAmount').value;
    const secret = document.getElementById('revealSecret').value;
    
    // Arrays required by contract
    const values = [ethers.parseEther(revealAmount.toString())];
    const fakes = [false]; // Simplified for UI
    const secrets = [ethers.encodeBytes32String(secret)];

    try {
        const tx = await contract.reveal(values, fakes, secrets);
        alert("Transaction submitted! Waiting for confirmation...");
        await tx.wait();
        alert("Bid revealed successfully!");
        updateDashboard();
    } catch (err) {
        console.error(err);
        alert("Error revealing bid: " + (err.reason || err.message));
    }
});

withdrawBtn.addEventListener('click', async () => {
    if(!contract) return;
    try {
        const tx = await contract.withdraw();
        alert("Withdraw transaction submitted!");
        await tx.wait();
        alert("Withdrawal successful!");
    } catch (err) {
        console.error(err);
        alert("Error withdrawing: " + (err.reason || err.message));
    }
});

init();

// Poll for dashboard updates every 10 seconds
setInterval(updateDashboard, 10000);
