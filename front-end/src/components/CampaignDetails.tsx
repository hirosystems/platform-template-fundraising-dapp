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
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import { CAMPAIGN_SUBTITLE, CAMPAIGN_TITLE } from "@/constants/campaign";
import StyledMarkdown from "./StyledMarkdown";
import { useCampaignInfo } from "@/hooks/useCampaignInfo";

export default function CampaignDetails({
  images,
  markdownContent,
}: {
  images: string[];
  markdownContent: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideSize = useBreakpointValue({ base: "100%", md: "500px" });

  const { data: campaignInfo } = useCampaignInfo();
  console.log({ campaignInfo });

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

  // example campaign stats - you'll want to replace these with real data
  const campaignStats = {
    raised: 15000,
    goal: 50000,
    donors: 123,
    daysLeft: 15,
  };

  const progress = (campaignStats.raised / campaignStats.goal) * 100;

  return (
    <Container maxW="container.xl" py="8">
      <Flex direction="column" gap="8">
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
            <Flex direction="column" gap={6}>
              <SimpleGrid columns={2} spacing={4}>
                <Stat>
                  <StatLabel>Raised</StatLabel>
                  <StatNumber>
                    ${campaignStats.raised.toLocaleString()}
                  </StatNumber>
                  <StatHelpText>
                    of ${campaignStats.goal.toLocaleString()} goal
                  </StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Contributors</StatLabel>
                  <StatNumber>{campaignStats.donors}</StatNumber>
                  <StatHelpText>
                    {campaignStats.daysLeft} days left
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
                  // handle donation logic
                }}
              >
                Contribute Now
              </Button>
            </Flex>
          </Box>
        </SimpleGrid>

        {/* Markdown content */}
        <Box className="markdown-content">
          <StyledMarkdown>{markdownContent}</StyledMarkdown>
        </Box>
      </Flex>
    </Container>
  );
}
