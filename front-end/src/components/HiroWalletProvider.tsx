"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppConfig, showConnect, UserSession } from "@stacks/connect";

const appConfig = new AppConfig(["store_write", "publish_data"]);
export const userSession = new UserSession({ appConfig });

interface HiroWallet {
  isWalletOpen: boolean;
  isWalletConnected: boolean;
  testnetAddress: string | null;
  mainnetAddress: string | null;
  authenticate: () => void;
  disconnect: () => void;
}

const HiroWalletContext = createContext<HiroWallet>({
  isWalletOpen: false,
  isWalletConnected: false,
  testnetAddress: null,
  mainnetAddress: null,
  authenticate: () => {},
  disconnect: () => {},
});
export default HiroWalletContext;

interface ProviderProps {
  children: ReactNode | ReactNode[];
}
export const HiroWalletProvider: FC<ProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(
    mounted && userSession.isUserSignedIn()
  );
  useEffect(() => {
    setMounted(true);
    setIsWalletConnected(mounted && userSession.isUserSignedIn());
  }, [mounted]);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const authenticate = useCallback(() => {
    setIsWalletOpen(true);
    showConnect({
      appDetails: {
        name: "Hiro",
        icon: `${window.location.origin}/logo512.png`,
      },
      redirectTo: "/",
      onFinish: async () => {
        setIsWalletOpen(false);
        setIsWalletConnected(userSession.isUserSignedIn());
      },
      onCancel: () => {
        setIsWalletOpen(false);
      },
      userSession,
    });
  }, []);

  const disconnect = useCallback(() => {
    userSession.signUserOut(window.location?.toString());
  }, []);

  const testnetAddress = isWalletConnected
    ? userSession.loadUserData().profile.stxAddress.testnet
    : null;
  const mainnetAddress = isWalletConnected
    ? userSession.loadUserData().profile.stxAddress.mainnet
    : null;

  const hiroWalletContext = useMemo(
    () => ({
      authenticate,
      disconnect,
      isWalletOpen,
      isWalletConnected,
      testnetAddress,
      mainnetAddress,
    }),
    [
      authenticate,
      disconnect,
      isWalletOpen,
      isWalletConnected,
      mainnetAddress,
      testnetAddress,
    ]
  );

  return (
    <HiroWalletContext.Provider value={hiroWalletContext}>
      {children}
    </HiroWalletContext.Provider>
  );
};
