import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // 10 minutes bidding, 10 minutes reveal
  const biddingTime = 600; 
  const revealTime = 600; 
  const beneficiary = deployer.address;

  const BlindAuction = await hre.ethers.getContractFactory("BlindAuction");
  const auction = await BlindAuction.deploy(biddingTime, revealTime, beneficiary);

  await auction.waitForDeployment();

  console.log("BlindAuction deployed to:", await auction.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
