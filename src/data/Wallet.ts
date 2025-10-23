import { Pubkey, pubkeyFromBase58 } from "./Pubkey";
import { Signature, signatureFromBytes } from "./Signature";
import { TransactionPacket } from "./Transaction";

export type WalletAccount = {
  address: Pubkey;
  signBytes: (data: Uint8Array) => Promise<Signature>;
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

export function walletProviderList(): Array<WalletProvider> {
  if (walletProvidersCached !== undefined) {
    return walletProvidersCached;
  }
  walletProvidersCached = new Array<WalletProvider>();
  class AppReadyEvent extends Event {
    constructor() {
      super("wallet-standard:app-ready");
    }
    get detail() {
      return {
        register: (walletObject: any) => {
          const walletProvider = makeWalletProvider(walletObject);
          if (walletProvider === undefined) {
            return;
          }
          walletProvidersCached!.push(walletProvider);
        },
      };
    }
  }
  if (window === undefined) {
    throw new Error("Wallet discovery requires a window object");
  }
  window.dispatchEvent(new AppReadyEvent());
  return walletProvidersCached;
}

let walletProvidersCached: Array<WalletProvider> | undefined = undefined;

// TODO - cleanup and naming on those
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

function walletAccountSignBytes(
  walletAccountObject: any,
  providerSignMessage: Function,
) {
  return async (data: Uint8Array) => {
    const resultSignMessage = await providerSignMessage({
      account: walletAccountObject,
      message: data,
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
    const signedTransactionPacket = resultSignTransaction[0]?.signedTransaction;
    if (!(signedTransactionPacket instanceof Uint8Array)) {
      throw new Error("Invalid transaction returned from wallet provider");
    }
    return signedTransactionPacket as TransactionPacket;
  };
}

function walletProviderConnect(
  providerConnect: Function,
  providerSignMessage: Function,
  providerSignTransaction: Function,
) {
  return async () => {
    let providerAccounts: Array<any>;
    const resultConnectSilent = await providerConnect({ silent: true });
    if (!resultConnectSilent.accounts) {
      const resultConnectRegular = await providerConnect({ silent: false });
      if (!resultConnectRegular.accounts) {
        throw new Error("No accounts returned from wallet");
      } else {
        providerAccounts = resultConnectRegular.accounts;
      }
    } else {
      providerAccounts = resultConnectSilent.accounts;
    }
    console.log("provider accounts", providerAccounts);
    const walletAccounts = new Array<WalletAccount>();
    for (const providerAccount of providerAccounts) {
      walletAccounts.push({
        address: pubkeyFromBase58(providerAccount.address),
        signBytes: walletAccountSignBytes(providerAccount, providerSignMessage),
        signTransaction: walletAccountSignTransaction(
          providerAccount,
          providerSignTransaction,
        ),
      });
    }
    return walletAccounts;
  };
}
