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
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import { CAMPAIGN_SUBTITLE, CAMPAIGN_TITLE } from "@/constants/campaign";
import StyledMarkdown from "./StyledMarkdown";
import { useCampaignInfo } from "@/hooks/campaignQueries";
import { useCurrentBlock } from "@/hooks/chainQueries";
import { format } from "timeago.js";
import DonationModal from "./DonationModal";

export default function CampaignDetails({
  images,
  markdownContent,
}: {
  images: string[];
  markdownContent: string;
}) {
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
                  </Stat>
                  <Stat>
                    <StatLabel>Contributions</StatLabel>
                    <StatNumber>{campaignInfo?.donationCount}</StatNumber>
                    <StatHelpText>
                      <Flex direction="column">
                        <Box>
                          {blocksLeft.toLocaleString()} blocks left
                          <Tooltip
                            label={
                              <Flex direction="column" gap="1">
                                <Box>Started: Block #{campaignInfo?.start}</Box>
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
