import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const donor1 = accounts.get("wallet_1")!;
const donor2 = accounts.get("wallet_2")!;

describe("fundraising campaign", () => {
  // helper to set up a basic campaign
  const initCampaign = async (goal: number) => {
    const block = simnet.blockHeight;
    const response = await simnet.callPublicFn(
      "fundraising",
      "initialize-campaign",
      [Cl.uint(goal)],
      deployer
    );
    return { response, block };
  };

  it("initializes with valid goal", async () => {
    const { response } = await initCampaign(100000);
    expect(response.result).toBeOk(Cl.bool(true));
  });

  it("accepts STX donations during campaign", async () => {
    await initCampaign(100000);
    const response = await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(5000)],
      donor1
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // verify donation was recorded
    const getDonationResponse = await simnet.callReadOnlyFn(
      "fundraising",
      "get-stx-donation",
      [Cl.principal(donor1)],
      donor1
    );
    expect(getDonationResponse.result).toBeOk(Cl.uint(5000));
  });

  // TODO: figure this out
  // it("accepts sBTC donations during campaign", async () => {
  //   // Mint some sBTC for the donor
  //   const mintResponse = await simnet.callPublicFn(
  //     "sbtc-token",
  //     "protocol-mint",
  //     [Cl.uint(70000), Cl.principal(donor2), Cl.buffer(new Uint8Array([0]))],
  //     deployer
  //   );
  //   expect(mintResponse.result).toBeOk(Cl.bool(true));

  //   await initCampaign(100000);
  //   const response = await simnet.callPublicFn(
  //     "fundraising",
  //     "donate-sbtc",
  //     [Cl.uint(700)],
  //     donor2
  //   );
  //   console.log(JSON.stringify(response, null, 2));

  //   expect(response.result).toBeOk(Cl.bool(true));

  //   // verify donation was recorded
  //   const getDonationResponse = await simnet.callReadOnlyFn(
  //     "fundraising",
  //     "get-sbtc-donation",
  //     [Cl.principal(donor1)],
  //     donor2
  //   );
  //   expect(getDonationResponse.result).toBeOk(Cl.uint(700));
  // });
});
