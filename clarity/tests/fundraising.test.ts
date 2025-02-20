import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";
import { initSimnet } from "@hirosystems/clarinet-sdk";

const simnet = await initSimnet();

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const donor1 = accounts.get("wallet_1")!;

const stxPrice = 100; // $1 STX price in cents
const btcPrice = 100000000; // $100k BTC price in cents

function getCurrentStxBalance(address: string) {
  const assetsMap = simnet.getAssetsMap();
  return assetsMap.get("STX")?.get(address) || BigInt(0);
}

describe("fundraising campaign", () => {
  const initPrices = async () => {
    const response = await simnet.callPublicFn(
      "price-feed",
      "update-prices",
      [Cl.uint(stxPrice), Cl.uint(btcPrice)],
      deployer
    );
    const block = simnet.burnBlockHeight;
    return { response, block };
  };
  // helper to set up a basic campaign
  const initCampaign = async (goal: number) => {
    const response = await simnet.callPublicFn(
      "fundraising",
      "initialize-campaign",
      [Cl.uint(goal), Cl.uint(0)],
      deployer
    );
    const block = simnet.burnBlockHeight;

    return { response, block };
  };

  it("initializes with valid goal", async () => {
    const { response: priceResponse } = await initPrices();
    expect(priceResponse.result).toBeOk(Cl.bool(true));

    const { response } = await initCampaign(100000);
    expect(response.result).toBeOk(Cl.bool(true));
  });

  it("accepts STX donations during campaign", async () => {
    await initPrices();
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

  // TODO: write sBTC tests when there is a way to fund simnet wallets with sBTC

  // it("accepts sBTC donations during campaign", async () => {
  //   // Mint some sBTC for the donor
  //   const mintResponse = await simnet.callPublicFn(
  //     "sbtc-token",
  //     "protocol-mint",
  //     [Cl.uint(70000), Cl.principal(donor2), Cl.buffer(new Uint8Array([0]))],
  //     deployer
  //   );
  //   expect(mintResponse.result).toBeOk(Cl.bool(true));

  // const { response: priceResponse } = await initPrices(100000);
  // expect(priceResponse.result).toBeOk(Cl.bool(true));

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

  it("prevents non-owner from initializing campaign", async () => {
    const response = await simnet.callPublicFn(
      "fundraising",
      "initialize-campaign",
      [Cl.uint(100000), Cl.uint(0)],
      donor1
    );
    expect(response.result).toBeErr(Cl.uint(100)); // err-not-authorized
  });

  it("allows multiple donations from same donor", async () => {
    await initPrices();
    await initCampaign(100000);

    // first donation
    await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(5000)],
      donor1
    );

    // second donation
    await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(3000)],
      donor1
    );

    const getDonationResponse = await simnet.callReadOnlyFn(
      "fundraising",
      "get-stx-donation",
      [Cl.principal(donor1)],
      donor1
    );
    expect(getDonationResponse.result).toBeOk(Cl.uint(8000));
  });

  it("prevents donations after campaign ends", async () => {
    await initPrices();
    const { block } = await initCampaign(100000);

    // move past campaign duration
    await simnet.mineEmptyBlocks(4321);
    // ensure prices are up to date
    await initPrices();

    const response = await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(5000)],
      donor1
    );
    expect(response.result).toBeErr(Cl.uint(101)); // err-campaign-ended
  });

  it("prevents withdrawal before campaign ends", async () => {
    await initPrices();
    await initCampaign(10000);

    // make a donation to meet goal
    await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(15000)],
      donor1
    );

    const response = await simnet.callPublicFn(
      "fundraising",
      "withdraw",
      [],
      deployer
    );
    expect(response.result).toBeErr(Cl.uint(104)); // err-campaign-not-ended
  });

  it("allows withdrawal when goal met and campaign ended", async () => {
    await initPrices();
    await initCampaign(10000);

    const originalDeployerBalance = getCurrentStxBalance(deployer);
    const donationAmount = BigInt(15000000000); // Donation in microstacks = 15,000 stx

    // make a donation to meet goal
    await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(donationAmount)],
      donor1
    );

    // move past campaign duration
    await simnet.mineEmptyBlocks(4321);
    // ensure prices are up to date
    await initPrices();

    const response = await simnet.callPublicFn(
      "fundraising",
      "withdraw",
      [],
      deployer
    );

    expect(response.result).toBeOk(Cl.bool(true));

    expect(getCurrentStxBalance(deployer)).toEqual(
      originalDeployerBalance + donationAmount
    );
  });

  it("prevents withdrawal when goal not met", async () => {
    await initPrices();
    await initCampaign(100000);

    // make a small donation that won't meet goal
    await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(5000)],
      donor1
    );

    // move past campaign duration
    await simnet.mineEmptyBlocks(4321);
    // ensure prices are up to date
    await initPrices();

    const response = await simnet.callPublicFn(
      "fundraising",
      "withdraw",
      [],
      deployer
    );
    expect(response.result).toBeErr(Cl.uint(102)); // err-goal-not-met
  });

  it("allows one refund when goal not met and campaign ended", async () => {
    await initPrices();
    await initCampaign(100000);

    const originalDonorBalance = getCurrentStxBalance(donor1);
    const donationAmount = BigInt(5000000000); // Donation in microstacks = 5,000 stx

    // make a donation, but don't meet the goal
    await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(donationAmount)],
      donor1
    );

    // verify that funds have been transferred out of the donor's account
    expect(getCurrentStxBalance(donor1)).toEqual(
      originalDonorBalance - donationAmount
    );

    // move past campaign duration
    await simnet.mineEmptyBlocks(4321);
    // ensure prices are up to date
    await initPrices();

    const response = await simnet.callPublicFn(
      "fundraising",
      "refund",
      [],
      donor1
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // verify funds were restored
    expect(getCurrentStxBalance(donor1)).toEqual(originalDonorBalance);

    // verify donation was cleared
    const getDonationResponse = await simnet.callReadOnlyFn(
      "fundraising",
      "get-stx-donation",
      [Cl.principal(donor1)],
      donor1
    );
    expect(getDonationResponse.result).toBeOk(Cl.uint(0));

    // request another refund, verify that donor's balance stays the same
    await simnet.callPublicFn("fundraising", "refund", [], donor1);
    expect(getCurrentStxBalance(donor1)).toEqual(originalDonorBalance);
  });

  it("prevents refund when goal is met", async () => {
    await initPrices();
    await initCampaign(10000);

    // make a donation that meets goal
    await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(15000000000)], // donation in microstacks
      donor1
    );

    // move past campaign duration
    await simnet.mineEmptyBlocks(4321);
    // ensure prices are up to date
    await initPrices();

    const response = await simnet.callPublicFn(
      "fundraising",
      "refund",
      [],
      donor1
    );
    expect(response.result).toBeErr(Cl.uint(105)); // err-goal-met
  });

  it("returns campaign info correctly", async () => {
    await initPrices();
    const { block } = await initCampaign(100000);

    const response = await simnet.callReadOnlyFn(
      "fundraising",
      "get-campaign-info",
      [],
      deployer
    );

    expect(response.result.value).toEqual(
      Cl.tuple({
        start: Cl.uint(block),
        end: Cl.uint(block + 4320),
        goal: Cl.uint(100000),
        totalStx: Cl.uint(0),
        totalSbtc: Cl.uint(0),
        usdValue: Cl.uint(0),
        donationCount: Cl.uint(0),
        isExpired: Cl.bool(false),
        isWithdrawn: Cl.bool(false),
        isGoalMet: Cl.bool(false),
      })
    );

    // check again after a donation
    const donationAmount = BigInt(5000000000); // 5000 STX, in microstacks
    await simnet.callPublicFn(
      "fundraising",
      "donate-stx",
      [Cl.uint(donationAmount)],
      donor1
    );

    const response2 = await simnet.callReadOnlyFn(
      "fundraising",
      "get-campaign-info",
      [],
      deployer
    );

    expect(response2.result.value).toEqual(
      Cl.tuple({
        start: Cl.uint(block),
        end: Cl.uint(block + 4320),
        goal: Cl.uint(100000),
        totalStx: Cl.uint(donationAmount),
        totalSbtc: Cl.uint(0),
        usdValue: Cl.uint(5000), // 5000 STX = $5000 in this example
        donationCount: Cl.uint(1),
        isExpired: Cl.bool(false),
        isWithdrawn: Cl.bool(false),
        isGoalMet: Cl.bool(false),
      })
    );

    // move past campaign duration
    await simnet.mineEmptyBlocks(4321);
    // ensure prices are up to date
    await initPrices();

    // Verify campaign shows expired
    const response3 = await simnet.callReadOnlyFn(
      "fundraising",
      "get-campaign-info",
      [],
      deployer
    );

    expect(response3.result.value).toEqual(
      Cl.tuple({
        start: Cl.uint(block),
        end: Cl.uint(block + 4320),
        goal: Cl.uint(100000),
        totalStx: Cl.uint(donationAmount),
        totalSbtc: Cl.uint(0),
        usdValue: Cl.uint(5000), // 5000 STX = $5000 in this example
        donationCount: Cl.uint(1),
        isExpired: Cl.bool(true),
        isWithdrawn: Cl.bool(false),
        isGoalMet: Cl.bool(false),
      })
    );
  });
});
