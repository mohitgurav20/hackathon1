const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Will be updated after deployment

const abi = [
    "function bid(bytes32 _blindedBid) external payable",
    "function reveal(uint[] calldata _values, bool[] calldata _fakes, bytes32[] calldata _secrets) external",
    "function withdraw() external",
    "function auctionEnd() external",
    "function beneficiary() public view returns (address)",
    "function biddingEnd() public view returns (uint)",
    "function revealEnd() public view returns (uint)",
    "function ended() public view returns (bool)",
    "function highestBidder() public view returns (address)",
    "function highestBid() public view returns (uint)",
    "event AuctionEnded(address winner, uint highestBid)",
    "event BidRevealed(address bidder, uint value)"
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
    if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.BrowserProvider(window.ethereum);
        
        // Attempt to connect if already authorized
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            connectWallet(accounts[0]);
        }
    } else {
        connectWalletBtn.innerText = "Please install MetaMask!";
    }
}

async function connectWallet(accountObj) {
    if (!accountObj) {
        try {
            await provider.send("eth_requestAccounts", []);
        } catch (err) {
            console.error(err);
            return;
        }
    }
    signer = await provider.getSigner();
    const address = await signer.getAddress();
    connectWalletBtn.innerText = address.substring(0, 6) + "..." + address.substring(address.length - 4);
    
    if(CONTRACT_ADDRESS) {
        contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        contractAddressSpan.innerText = CONTRACT_ADDRESS;
        updateDashboard();
    }
}

connectWalletBtn.addEventListener('click', () => connectWallet());

async function updateDashboard() {
    if(!contract) return;
    try {
        const bEnd = await contract.biddingEnd();
        const rEnd = await contract.revealEnd();
        const isEnded = await contract.ended();
        const hBidder = await contract.highestBidder();
        const hBid = await contract.highestBid();
        
        const now = Math.floor(Date.now() / 1000);
        
        biddingEndSpan.innerText = new Date(Number(bEnd) * 1000).toLocaleString();
        revealEndSpan.innerText = new Date(Number(rEnd) * 1000).toLocaleString();
        
        if (isEnded) {
            auctionStatusSpan.innerText = "Ended";
            auctionStatusSpan.style.background = "#dc3545";
        } else if (now < Number(bEnd)) {
            auctionStatusSpan.innerText = "Bidding Phase (Commit)";
            auctionStatusSpan.style.background = "#007bff";
        } else if (now >= Number(bEnd) && now < Number(rEnd)) {
            auctionStatusSpan.innerText = "Reveal Phase";
            auctionStatusSpan.style.background = "#28a745";
        } else {
            auctionStatusSpan.innerText = "Awaiting Finalization";
            auctionStatusSpan.style.background = "#ffc107";
            auctionStatusSpan.style.color = "#000";
        }

        if (hBidder !== ethers.ZeroAddress) {
            highestBidderSpan.innerText = hBidder.substring(0, 6) + "...";
            highestBidSpan.innerText = ethers.formatEther(hBid);
        } else {
            highestBidderSpan.innerText = "No bids yet";
            highestBidSpan.innerText = "0";
        }
    } catch (err) {
        console.error("Dashboard update error", err);
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
    if(!contract) return alert("Connect wallet and ensure contract is deployed");
    
    const bidAmount = document.getElementById('bidAmount').value;
    const secret = document.getElementById('bidSecret').value;
    const depositAmount = document.getElementById('depositAmount').value;
    const isFake = document.getElementById('isFake').checked;

    try {
        const blindedBid = getBlindedBid(bidAmount, isFake, secret);
        const tx = await contract.bid(blindedBid, {
            value: ethers.parseEther(depositAmount.toString())
        });
        alert("Transaction submitted! Waiting for confirmation...");
        await tx.wait();
        alert("Bid committed successfully!");
        updateDashboard();
    } catch (err) {
        console.error(err);
        alert("Error committing bid: " + (err.reason || err.message));
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
