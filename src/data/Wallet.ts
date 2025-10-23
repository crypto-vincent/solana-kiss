import { Pubkey, pubkeyFromBase58 } from "./Pubkey";
import { Signature, signatureFromBytes } from "./Signature";
import { TransactionPacket } from "./Transaction";

export type WalletAccount = {
  address: Pubkey;
  signMessage: (message: Uint8Array) => Promise<Signature>;
  signTransaction: (
    transactionPacket: TransactionPacket,
  ) => Promise<TransactionPacket>;
};

export type WalletProvider = {
  name: string;
  icon: string;
  connect: () => Promise<Array<WalletAccount>>;
  disconnect: () => Promise<void>;
};

// TODO (test) - somehow test this
let walletProvidersDiscovering = false;
const walletProvidersListeners = new Array<
  (walletProviders: Array<WalletProvider>) => void
>();

export const walletProvidersObservable = {
  subscribe: (
    onUpdatedWalletProviders: (walletProviders: Array<WalletProvider>) => void,
  ) => {
    if (!walletProvidersDiscovering) {
      walletProvidersDiscovering = true;
      walletProvidersDiscover();
    }
    walletProvidersListeners.push(onUpdatedWalletProviders);
    return () => {
      const index = walletProvidersListeners.indexOf(onUpdatedWalletProviders);
      if (index >= 0) {
        walletProvidersListeners.splice(index, 1);
      }
    };
  },
};

function walletProvidersDiscover() {
  if (window === undefined) {
    throw new Error("WalletProvider discovery requires a window object");
  }
  const walletProviders = new Array<WalletProvider>();
  function registerWalletObject(walletObject: any) {
    const walletProvider = makeWalletProvider(walletObject);
    if (walletProvider === undefined) {
      return;
    }
    // TODO - make this nicer with dedup/throttling
    walletProviders.push(walletProvider);
    for (const walletProvidersListener of walletProvidersListeners) {
      walletProvidersListener(walletProviders.slice());
    }
  }
  class AppReadyEvent extends Event {
    constructor() {
      super("wallet-standard:app-ready");
    }
    get detail() {
      return { register: registerWalletObject };
    }
  }
  window.addEventListener("wallet-standard:register-wallet", (event: any) => {
    event.detail({ register: registerWalletObject });
  });
  window.dispatchEvent(new AppReadyEvent());
}

// TODO - cleanup implementation and naming on those
function makeWalletProvider(walletObject: any): WalletProvider | undefined {
  if (!walletObject || !walletObject.chains || !walletObject.features) {
    return;
  }
  if (
    typeof walletObject.name !== "string" ||
    typeof walletObject.icon !== "string"
  ) {
    return;
  }
  for (const chain of walletObject.chains) {
    if (typeof chain === "string" && chain.startsWith("solana:")) {
      continue;
    }
    return;
  }
  const connect = getWalletFeatureFunction(walletObject, "standard", "connect");
  const disconnect = getWalletFeatureFunction(
    walletObject,
    "standard",
    "disconnect",
  );
  const signMessage = getWalletFeatureFunction(
    walletObject,
    "solana",
    "signMessage",
  );
  const signTransaction = getWalletFeatureFunction(
    walletObject,
    "solana",
    "signTransaction",
  );
  if (!connect || !disconnect || !signMessage || !signTransaction) {
    return;
  }
  return {
    name: walletObject.name,
    icon: walletObject.icon,
    connect: walletProviderConnect(connect, signMessage, signTransaction),
    disconnect: disconnect as () => Promise<void>,
  };
}

function getWalletFeatureFunction(
  walletObject: any,
  featureCategory: string,
  featureName: string,
): Function | undefined {
  const featureKey = `${featureCategory}:${featureName}`;
  const feature = walletObject.features[featureKey];
  if (!feature || !feature.version) {
    return undefined;
  }
  const callable = feature[featureName];
  if (typeof callable !== "function") {
    return undefined;
  }
  return callable;
}

function walletAccountSignMessage(
  walletAccountObject: any,
  providerSignMessage: Function,
) {
  return async (message: Uint8Array) => {
    const resultSignMessage = await providerSignMessage({
      account: walletAccountObject,
      message: message,
    });
    const signatureBytes = resultSignMessage[0]?.signature;
    if (!(signatureBytes instanceof Uint8Array)) {
      throw new Error("Invalid signature returned from wallet provider");
    }
    return signatureFromBytes(signatureBytes);
  };
}

function walletAccountSignTransaction(
  providerAccount: any,
  providerSignTransaction: Function,
) {
  return async (transactionPacket: TransactionPacket) => {
    const resultSignTransaction = await providerSignTransaction({
      account: providerAccount,
      transaction: transactionPacket,
    });
    const signedTransactionBytes = resultSignTransaction[0]?.signedTransaction;
    if (!(signedTransactionBytes instanceof Uint8Array)) {
      throw new Error("Invalid transaction returned from wallet provider");
    }
    return signedTransactionBytes as TransactionPacket;
  };
}

function walletProviderConnect(
  providerConnect: Function,
  providerSignMessage: Function,
  providerSignTransaction: Function,
) {
  return async () => {
    let providerAccounts: Array<any>;
    let resultConnectSilent: any = undefined;
    try {
      resultConnectSilent = await providerConnect({ silent: true });
    } catch (e) {
      console.log("WalletProvider: silent connect failed", e);
    }
    if (resultConnectSilent?.accounts) {
      providerAccounts = resultConnectSilent.accounts;
    } else {
      const resultConnectRegular = await providerConnect({ silent: false });
      if (resultConnectRegular?.accounts) {
        providerAccounts = resultConnectRegular.accounts;
      } else {
        throw new Error("No accounts returned from wallet");
      }
    }
    const walletAccounts = new Array<WalletAccount>();
    for (const providerAccount of providerAccounts) {
      walletAccounts.push({
        address: pubkeyFromBase58(providerAccount.address),
        signMessage: walletAccountSignMessage(
          providerAccount,
          providerSignMessage,
        ),
        signTransaction: walletAccountSignTransaction(
          providerAccount,
          providerSignTransaction,
        ),
      });
    }
    return walletAccounts;
  };
}
