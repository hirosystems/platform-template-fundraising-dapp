import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { TransactionsApi } from "@stacks/blockchain-api-client";
import { getApi, getStacksUrl } from "@/lib/stacks-api";
import { FUNDRAISING_CONTRACT } from "@/constants/fundraising";

interface CampaignInfo {
  start: number;
  goal: number;
  totalStx: number;
  totalSbtc: number;
  usdValue: number;
}

export const useCampaignInfo = (): UseQueryResult<CampaignInfo> => {
  const api = getApi(getStacksUrl()).smartContractsApi;
  return useQuery<CampaignInfo>({
    queryKey: ["campaignInfo"],
    queryFn: async () => {
      const response = await api.callReadOnlyFunction({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "get-campaign-info",
        readOnlyFunctionArgs: {
          sender: FUNDRAISING_CONTRACT.address || "",
          arguments: [],
        },
      });
      return response as unknown as CampaignInfo;
    },
    retry: false,
  });
};

interface CampaignDonation {
  stxAmount: number;
  sbtcAmount: number;
}

export const useExistingDonation = (
  address?: string
): UseQueryResult<CampaignDonation> => {
  const api = getApi(getStacksUrl()).smartContractsApi;
  return useQuery<CampaignDonation>({
    queryKey: ["campaignDonations", address],
    queryFn: async () => {
      if (!address) throw new Error("Address is required");

      const stxResponse = await api.callReadOnlyFunction({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "get-stx-donation",
        readOnlyFunctionArgs: {
          sender: FUNDRAISING_CONTRACT.address || "",
          arguments: [address],
        },
      });

      const sbtcResponse = await api.callReadOnlyFunction({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "get-sbtc-donation",
        readOnlyFunctionArgs: {
          sender: FUNDRAISING_CONTRACT.address || "",
          arguments: [address],
        },
      });

      return {
        stxAmount: parseInt(stxResponse.result || "", 10),
        sbtcAmount: parseInt(sbtcResponse.result || "", 10),
      };
    },
    enabled: !!address,
    retry: false,
  });
};

// Continuously query a transaction by txId until it is confirmed
export const useGetTxId = (api: TransactionsApi, txId: string) => {
  return useQuery({
    queryKey: ["nftHoldingsByTxId", txId],
    queryFn: async () => {
      if (!txId) throw new Error("txId is required");
      return api.getTransactionById({ txId });
    },
    enabled: !!txId,
    refetchInterval: (data) => {
      // @ts-expect-error tx_status exists
      return data?.tx_status === "pending" ? 5000 : false;
    },
    retry: false,
    refetchIntervalInBackground: true,
  });
};
