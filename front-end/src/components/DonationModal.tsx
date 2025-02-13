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
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  NumberInput,
  NumberInputField,
  useToast,
  HStack,
  VStack,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useContext } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import {
  isDevnetEnvironment,
  isTestnetEnvironment,
} from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { ConnectWalletButton } from "./ConnectWallet";

export default function DonationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => undefined;
}) {
  const { mainnetAddress, testnetAddress } = useContext(HiroWalletContext);
  const { currentWallet: devnetWallet } = useDevnetWallet();
  const currentWalletAddress = isDevnetEnvironment()
    ? devnetWallet?.stxAddress
    : isTestnetEnvironment()
    ? testnetAddress
    : mainnetAddress;

  const { data: previousDonation } = useExistingDonation(currentWalletAddress);
  const hasMadePreviousDonation =
    previousDonation &&
    (previousDonation?.stxAmount > 0 || previousDonation?.sbtcAmount > 0);

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

  const handleSubmit = () => {
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

    // Here you would typically handle the donation submission
    toast({
      title: "Thank you!",
      description: `Processing donation of $${amount}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Make a Contribution</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap="3">
            <Box>
              <ConnectWalletButton />
            </Box>
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
                <Text fontSize="xl" fontWeight="bold" textAlign="center">
                  Choose Contribution Amount
                </Text>

                <HStack spacing={4} justify="center" wrap="wrap">
                  {presetAmounts.map((amount) => (
                    <Button
                      key={amount}
                      size="lg"
                      variant={selectedAmount === amount ? "solid" : "outline"}
                      colorScheme="blue"
                      onClick={() => handlePresetClick(amount)}
                    >
                      ${amount}
                    </Button>
                  ))}
                </HStack>

                <Text textAlign="center" fontSize="md">
                  Or enter custom amount:
                </Text>

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

                <Button
                  colorScheme="green"
                  size="lg"
                  onClick={handleSubmit}
                  isDisabled={!selectedAmount && !customAmount}
                >
                  Donate ${selectedAmount || customAmount || "0"}
                </Button>
              </VStack>
            </Box>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
