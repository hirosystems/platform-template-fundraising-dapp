"use client";
import {
  Container,
  Box,
  IconButton,
  Image,
  Text,
  Flex,
  useBreakpointValue,
  Heading,
  Progress,
  Button,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
} from "@chakra-ui/icons";
import { useContext, useEffect, useState } from "react";
import { CAMPAIGN_SUBTITLE, CAMPAIGN_TITLE } from "@/constants/campaign";
import StyledMarkdown from "./StyledMarkdown";
import { useCampaignInfo, useExistingDonation } from "@/hooks/campaignQueries";
import { useCurrentBlock } from "@/hooks/chainQueries";
import { format } from "timeago.js";
import DonationModal from "./DonationModal";
import HiroWalletContext from "./HiroWalletProvider";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import {
  executeContractCall,
  isDevnetEnvironment,
  isTestnetEnvironment,
} from "@/lib/contract-utils";
import { satsToSbtc, ustxToStx } from "@/lib/currency-utils";
import { FUNDRAISING_CONTRACT } from "@/constants/contracts";
import { getRefundTx, getWithdrawTx } from "@/lib/campaign-utils";
import { getStacksNetworkString } from "@/lib/stacks-api";
import { openContractCall } from "@stacks/connect";

export default function CampaignDetails({
  images,
  markdownContent,
}: {
  images: string[];
  markdownContent: string;
}) {
  const { mainnetAddress, testnetAddress } = useContext(HiroWalletContext);
  const { currentWallet: devnetWallet } = useDevnetWallet();
  const currentWalletAddress = isDevnetEnvironment()
    ? devnetWallet?.stxAddress
    : isTestnetEnvironment()
    ? testnetAddress
    : mainnetAddress;

  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const slideSize = useBreakpointValue({ base: "100%", md: "500px" });

  const { data: campaignInfo, error: campaignFetchError } = useCampaignInfo();
  const { data: currentBlock } = useCurrentBlock();

  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);

  const progress = campaignInfo
    ? (campaignInfo.usdValue / campaignInfo.goal) * 100
    : 0;

  const blocksLeft = campaignInfo ? campaignInfo?.end - (currentBlock || 0) : 0;
  const secondsLeft = blocksLeft * 15; // estimate each block is 15 seconds
  const secondsLeftTimestamp = new Date(Date.now() - secondsLeft * 1000);

  const { data: previousDonation } = useExistingDonation(currentWalletAddress);

  const hasMadePreviousDonation =
    previousDonation &&
    (previousDonation?.stxAmount > 0 || previousDonation?.sbtcAmount > 0);

  const toast = useToast();

  const handleRefund = async () => {
    const doSuccessToast = (txid: string) => {
      toast({
        title: "Refund requested",
        description: (
          <Flex direction="column" gap="4">
            <Box fontSize="xs">
              Transaction ID: <strong>{txid}</strong>
            </Box>
          </Flex>
        ),
        status: "success",
        isClosable: true,
        duration: 30000,
      });
    };

    try {
      const txOptions = getRefundTx(
        getStacksNetworkString(),
        currentWalletAddress || ""
      );

      // Devnet uses direct call, Testnet/Mainnet needs to prompt with browser extension
      if (isDevnetEnvironment()) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        doSuccessToast(txid);
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => {
            doSuccessToast(data.txId);
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
        description: "Failed to request refund",
        status: "error",
      });
    }
  };

  const handleWithdraw = async () => {
    const doSuccessToast = (txid: string) => {
      toast({
        title: "Withdraw requested",
        description: (
          <Flex direction="column" gap="4">
            <Box fontSize="xs">
              Transaction ID: <strong>{txid}</strong>
            </Box>
          </Flex>
        ),
        status: "success",
        isClosable: true,
        duration: 30000,
      });
    };

    try {
      const txOptions = getWithdrawTx(
        getStacksNetworkString(),
        currentWalletAddress || ""
      );

      // Devnet uses direct call, Testnet/Mainnet needs to prompt with browser extension
      if (isDevnetEnvironment()) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        doSuccessToast(txid);
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => {
            doSuccessToast(data.txId);
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
        description: "Failed to request refund",
        status: "error",
      });
    }
  };

  return (
    <Container maxW="container.xl" py="8">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading>{CAMPAIGN_TITLE}</Heading>
          <Text>{CAMPAIGN_SUBTITLE}</Text>
        </Flex>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} alignItems="start">
          {/* Left column: Image carousel */}
          <Box position="relative" width="full" overflow="hidden">
            <Flex width={slideSize} mx="auto" position="relative">
              <Image
                src={images[currentIndex]}
                alt={`Campaign image ${currentIndex + 1}`}
                objectFit="cover"
                width="full"
                height="auto"
              />
              <IconButton
                aria-label="Previous image"
                icon={<ChevronLeftIcon boxSize="5" />}
                onClick={prevSlide}
                position="absolute"
                left="2"
                top="50%"
                transform="translateY(-50%)"
                colorScheme="gray"
                rounded="full"
              />
              <IconButton
                aria-label="Next image"
                icon={<ChevronRightIcon boxSize="5" />}
                onClick={nextSlide}
                position="absolute"
                right="2"
                top="50%"
                transform="translateY(-50%)"
                colorScheme="gray"
                rounded="full"
              />
              <Text
                position="absolute"
                bottom="2"
                right="2"
                bg="blackAlpha.700"
                color="white"
                px="2"
                py="1"
                rounded="md"
                fontSize="sm"
              >
                {currentIndex + 1} / {images.length}
              </Text>
            </Flex>
          </Box>

          {/* Right column: Campaign stats & donation */}
          <Box p={6} borderRadius="lg" borderWidth="1px">
            {campaignInfo ? (
              <Flex direction="column" gap={6}>
                <SimpleGrid columns={2} spacing={4}>
                  <Stat>
                    <StatLabel>Raised</StatLabel>
                    <StatNumber>
                      ${campaignInfo?.usdValue?.toLocaleString()}
                    </StatNumber>
                    <StatHelpText>
                      of ${campaignInfo?.goal?.toLocaleString()} goal
                    </StatHelpText>
                    {campaignInfo?.isGoalMet ? (
                      <StatHelpText color="green.700">
                        <Tooltip label="Since crypto prices can fluctuate, the fundraiser is considered successful if the USD goal is met at any point during the campaign.">
                          <CheckCircleIcon mr="0.5" mt="-0.5" /> This campaign
                          met its goal!
                        </Tooltip>
                      </StatHelpText>
                    ) : null}
                  </Stat>
                  <Stat>
                    <StatLabel>Contributions</StatLabel>
                    <StatNumber>{campaignInfo?.donationCount}</StatNumber>
                    <StatHelpText>
                      {campaignInfo?.isExpired ? (
                        <Flex direction="column">
                          <Box>
                            Campaign expired
                            <Tooltip
                              label={
                                <Flex direction="column" gap="1">
                                  <Box>
                                    Expired at: Block #{campaignInfo?.end}
                                  </Box>
                                  <Box>Current: Block #{currentBlock}</Box>
                                </Flex>
                              }
                            >
                              <InfoIcon ml="1.5" mt="-3px" />
                            </Tooltip>
                          </Box>
                        </Flex>
                      ) : (
                        <Flex direction="column">
                          <Box>
                            {blocksLeft.toLocaleString()} blocks left
                            <Tooltip
                              label={
                                <Flex direction="column" gap="1">
                                  <Box>
                                    Started: Block #{campaignInfo?.start}
                                  </Box>
                                  <Box>Ends: Block #{campaignInfo?.end}</Box>
                                  <Box>Current: Block #{currentBlock}</Box>
                                </Flex>
                              }
                            >
                              <InfoIcon ml="1.5" mt="-3px" />
                            </Tooltip>
                          </Box>
                          <Box>
                            (About{" "}
                            {format(secondsLeftTimestamp)?.replace(" ago", "")})
                          </Box>
                        </Flex>
                      )}
                    </StatHelpText>
                  </Stat>
                </SimpleGrid>

                <Box>
                  <Progress
                    value={progress}
                    size="lg"
                    colorScheme="green"
                    borderRadius="full"
                  />
                </Box>

                {campaignInfo?.isExpired ? (
                  <Flex direction="column" gap="2">
                    <Box>
                      This fundraiser has ended.{" "}
                      {campaignInfo?.isGoalMet
                        ? "It met its goal!"
                        : "It did not meet its goal. Contributors are eligible for a refund."}
                    </Box>
                    {hasMadePreviousDonation ? (
                      <Alert mb="4">
                        <Box>
                          <AlertTitle>
                            You contributed to this fundraiser.
                          </AlertTitle>
                          <AlertDescription>
                            <Box>
                              STX:{" "}
                              {Number(
                                ustxToStx(previousDonation?.stxAmount)
                              ).toFixed(2)}
                            </Box>
                            <Box>
                              sBTC:{" "}
                              {satsToSbtc(previousDonation?.sbtcAmount).toFixed(
                                8
                              )}
                            </Box>
                          </AlertDescription>
                          <Box mt="4">
                            {campaignInfo?.isGoalMet ? (
                              <Box>
                                Thanks for your contribution! This fundraiser
                                met its funding goal. 🎉
                              </Box>
                            ) : (
                              <Button
                                colorScheme="green"
                                onClick={handleRefund}
                              >
                                Request a Refund
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Alert>
                    ) : null}
                    {currentWalletAddress === FUNDRAISING_CONTRACT.address ? (
                      <Alert mb="4">
                        <Box>
                          <AlertTitle>This is your fundraiser.</AlertTitle>
                          <AlertDescription>
                            {campaignInfo?.isGoalMet ? (
                              <>
                                <Box mb="1">
                                  Congratulations on meeting your funding goal!
                                </Box>
                                {campaignInfo.isWithdrawn ? (
                                  <Box>
                                    You have already withdrawn the funds. Good
                                    luck!
                                  </Box>
                                ) : (
                                  <Button
                                    colorScheme="green"
                                    onClick={handleWithdraw}
                                  >
                                    Withdraw funds
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Box>
                                Sorry, you did not meet your funding goal, so
                                you are not eligible to withdraw the funds.
                                Funds will be refunded to the contributors.
                              </Box>
                            )}
                          </AlertDescription>
                        </Box>
                      </Alert>
                    ) : null}
                  </Flex>
                ) : (
                  <Flex direction="column" gap="4">
                    <Button
                      size="lg"
                      colorScheme="green"
                      width="full"
                      onClick={() => {
                        setIsDonationModalOpen(true);
                      }}
                    >
                      Contribute Now
                    </Button>
                    <Box fontSize="xs">
                      <Box mb="2">
                        <strong>All-or-nothing</strong>: If the campaign
                        doesn&apos;t meet its funding goal, contributors will be
                        eligible for a refund.
                      </Box>
                      <Box>
                        STX and sBTC prices can fluctuate. This fundraiser is
                        considered successful if the USD goal is met{" "}
                        <strong>at any point</strong> during the campaign.
                      </Box>
                    </Box>
                  </Flex>
                )}
              </Flex>
            ) : campaignFetchError ? (
              <Box>
                <Alert status="warning">
                  <Box>
                    <AlertTitle>Campaign Data Unavailable</AlertTitle>
                    <AlertDescription>
                      Unable to retrieve campaign data from the blockchain. This
                      could be due to network issues or the campaign may no
                      longer exist.
                    </AlertDescription>
                  </Box>
                </Alert>
              </Box>
            ) : (
              <Box w="full" textAlign="center">
                <Spinner size="lg" />
              </Box>
            )}
          </Box>
        </SimpleGrid>

        {/* Markdown content */}
        <StyledMarkdown>{markdownContent}</StyledMarkdown>
      </Flex>
      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => {
          setIsDonationModalOpen(false);
        }}
      />
    </Container>
  );
}
