"use client";

import {
  Box,
  Button,
  Container,
  Flex,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { useContext } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import { isDevnetEnvironment } from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { DevnetWalletButton } from "./DevnetWalletButton";
import { formatStxAddress } from "@/lib/address-utils";

export const Navbar = () => {
  const { isWalletConnected, authenticate, disconnect } =
    useContext(HiroWalletContext);
  const { currentWallet, wallets, setCurrentWallet } = useDevnetWallet();
  console.log({ currentWallet });

  return (
    <Box as="nav" bg="white" boxShadow="sm">
      <Container maxW="container.xl">
        <Flex justify="space-between" h={16} align="center">
          <Flex align="center">
            <Flex
              bg="white"
              borderRadius="md"
              border="2px"
              borderColor="gray.700"
              letterSpacing="-.05em"
              fontSize="xl"
              fontWeight="bold"
              w="52px"
              h="52px"
              justify="center"
              align="center"
              color="gray.900"
              shrink="0"
            >
              /-/
            </Flex>
            <Link href="/" textDecoration="none">
              <Box fontSize="lg" fontWeight="bold" color="gray.900" ml={4}>
                Fundraising
              </Box>
            </Link>
          </Flex>
          <Flex align="center" gap={4}>
            {isDevnetEnvironment() ? (
              <DevnetWalletButton
                currentWallet={currentWallet}
                wallets={wallets}
                onWalletSelect={setCurrentWallet}
              />
            ) : isWalletConnected ? (
              <Menu>
                <MenuButton as={Button} colorScheme="gray">
                  <Flex gap="2" align="center">
                    <Box>Connected:</Box>
                    <Box>
                      {formatStxAddress(currentWallet?.stxAddress || "")}
                    </Box>
                  </Flex>
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={disconnect}>Disconnect Wallet</MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button onClick={authenticate}>Connect Wallet</Button>
            )}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};
