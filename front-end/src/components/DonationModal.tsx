import { useExistingDonation } from "@/hooks/campaignQueries";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  NumberInput,
  NumberInputField,
  useToast,
  HStack,
  VStack,
  RadioGroup,
  Radio,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useContext } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import {
  executeContractCall,
  isDevnetEnvironment,
  isTestnetEnvironment,
} from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { ConnectWalletButton } from "./ConnectWallet";
import { DevnetWalletButton } from "./DevnetWalletButton";
import { getContributeSbtcTx, getContributeStxTx } from "@/lib/campaign-utils";
import { getStacksNetworkString } from "@/lib/stacks-api";
import {
  btcToSats,
  stxToUstx,
  usdToSbtc,
  usdToStx,
  useCurrentPrices,
} from "@/lib/currency-utils";
import { openContractCall } from "@stacks/connect";

export default function DonationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => undefined;
}) {
  const { mainnetAddress, testnetAddress } = useContext(HiroWalletContext);
  const {
    currentWallet: devnetWallet,
    wallets: devnetWallets,
    setCurrentWallet: setDevnetWallet,
  } = useDevnetWallet();
  const currentWalletAddress = isDevnetEnvironment()
    ? devnetWallet?.stxAddress
    : isTestnetEnvironment()
    ? testnetAddress
    : mainnetAddress;

  const { data: previousDonation } = useExistingDonation(currentWalletAddress);
  const { data: prices } = useCurrentPrices();

  const hasMadePreviousDonation =
    previousDonation &&
    (previousDonation?.stxAmount > 0 || previousDonation?.sbtcAmount > 0);

  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stx");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const toast = useToast();

  const presetAmounts = [10, 25, 50, 100];

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    const amount = selectedAmount || Number(customAmount);

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Handle donation
    try {
      const txOptions =
        paymentMethod === "sbtc"
          ? getContributeSbtcTx(getStacksNetworkString(), {
              address: currentWalletAddress || "",
              amount: Math.round(
                btcToSats(usdToSbtc(amount, prices?.sbtc || 0))
              ),
            })
          : getContributeStxTx(getStacksNetworkString(), {
              address: currentWalletAddress || "",
              amount: Math.round(
                Number(stxToUstx(usdToStx(amount, prices?.stx || 0)))
              ),
            });

      // Devnet uses direct call, Testnet/Mainnet needs to prompt with browser extension
      if (isDevnetEnvironment()) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        toast({
          title: "Thank you!",
          description: `Processing donation of $${amount}. Transaction broadcast with ID: ${txid}`,
          status: "success",
          duration: 3000,
        });
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => {
            toast({
              title: "Thank you!",
              description: `Processing donation of $${amount}. Transaction broadcast with ID: ${data.txId}`,
              status: "success",
              duration: 3000,
            });
          },
          onCancel: () => {
            toast({
              title: "Cancelled",
              description: "Transaction was cancelled",
              status: "info",
              duration: 3000,
            });
          },
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to make contribution",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Make a Contribution</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap="3">
            {!currentWalletAddress ? (
              <Flex
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                align="center"
                justify="center"
                direction="column"
                gap="4"
              >
                <Box>Please connect a STX wallet to make a contribution.</Box>
                {isDevnetEnvironment() ? (
                  <DevnetWalletButton
                    currentWallet={devnetWallet}
                    wallets={devnetWallets}
                    onWalletSelect={setDevnetWallet}
                  />
                ) : (
                  <ConnectWalletButton />
                )}
              </Flex>
            ) : (
              <>
                {hasMadePreviousDonation ? (
                  <Alert>
                    <Box>
                      <AlertTitle>
                        You&apos;ve contributed to this campaign before
                      </AlertTitle>
                      <AlertDescription>
                        <Box>STX: {previousDonation?.stxAmount}</Box>
                        <Box>sBTC: {previousDonation?.sbtcAmount}</Box>
                      </AlertDescription>
                    </Box>
                  </Alert>
                ) : null}
                <Box mx="auto" p={6} borderWidth="1px" borderRadius="lg">
                  <VStack spacing={6} align="stretch">
                    <Text fontSize="lg" fontWeight="bold">
                      Choose Payment Method
                    </Text>

                    <RadioGroup
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                    >
                      <div>
                        <Radio value="stx" id="stx">
                          STX
                        </Radio>
                      </div>
                      <div>
                        <Radio value="sbtc" id="sbtc">
                          sBTC
                        </Radio>
                      </div>
                    </RadioGroup>

                    <Text fontSize="lg" fontWeight="bold">
                      Choose Contribution Amount
                    </Text>

                    <HStack spacing={4} justify="center" wrap="wrap">
                      {presetAmounts.map((amount) => (
                        <Button
                          key={amount}
                          size="lg"
                          variant={
                            selectedAmount === amount ? "solid" : "outline"
                          }
                          colorScheme="blue"
                          onClick={() => handlePresetClick(amount)}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </HStack>

                    <Text fontSize="md">Or enter custom amount:</Text>

                    <NumberInput
                      min={1}
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                    >
                      <NumberInputField
                        placeholder="Enter amount"
                        textAlign="center"
                        fontSize="lg"
                      />
                    </NumberInput>

                    <Flex direction="column" gap="1">
                      <Button
                        colorScheme="green"
                        size="lg"
                        onClick={handleSubmit}
                        isDisabled={
                          (!selectedAmount && !customAmount) || isLoading
                        }
                        isLoading={isLoading}
                      >
                        Donate ${selectedAmount || customAmount || "0"}
                      </Button>
                      <Box mx="auto" fontSize="sm" fontWeight="bold">
                        (≈
                        {paymentMethod === "stx"
                          ? `${usdToStx(
                              Number(selectedAmount || customAmount || "0"),
                              prices?.stx || 0
                            ).toFixed(2)} STX`
                          : `${usdToSbtc(
                              Number(selectedAmount || customAmount || "0"),
                              prices?.sbtc || 0
                            ).toFixed(8)} sBTC`}
                        )
                      </Box>
                    </Flex>
                  </VStack>
                </Box>
              </>
            )}
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
