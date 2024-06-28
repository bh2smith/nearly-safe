import dotenv from "dotenv";
import { ethers } from "ethers";
import { NearEthAdapter, MultichainContract } from "near-ca";
import { getNearSignature } from "./near";
import { getSafeOpHash, loadSafeKit } from "./alt-safe";
import { EthSafeSignature } from "@safe-global/protocol-kit";

dotenv.config();
const { ERC4337_BUNDLER_URL, ETH_RPC } = process.env;

export async function main() {
  const provider = new ethers.JsonRpcProvider(ETH_RPC);
  const nearAdapter = await NearEthAdapter.fromConfig({
    mpcContract: await MultichainContract.fromEnv(),
  });
  const signer = ethers.getAddress(nearAdapter.address);
  console.log(`NearEth Adapter: ${nearAdapter.nearAccountId()} <> ${signer}`);

  const safeKit = await loadSafeKit(ETH_RPC!, ERC4337_BUNDLER_URL!, signer);
  const safeAddress = await safeKit.protocolKit.getAddress();
  console.log("Safe Address:", safeAddress);

  const safeOp = await safeKit.createTransaction({
    transactions: [{ to: signer as string, value: "1", data: "0x69" }],
  });
  console.log("SafeOp", safeOp);

  const safeOpHash = await getSafeOpHash(provider, safeKit, safeOp);
  console.log("SafeOpHash", safeOpHash);

  const signature = await getNearSignature(nearAdapter, safeOpHash);
  safeOp.addSignature(new EthSafeSignature(signer, signature));
  console.log("Executing...");
  const userOpHash = await safeKit.executeTransaction({ executable: safeOp });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
