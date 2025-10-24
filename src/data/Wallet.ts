import { Pubkey, pubkeyFromBase58 } from "./Pubkey";
import { Signature, signatureFromBytes } from "./Signature";
import { TransactionPacket } from "./Transaction";

export type WalletAccount = {
  address: Pubkey;
  signMessage: (message: Uint8Array) => Promise<Signature>;
  // TODO - how to handle partial signing, because phantom already sends everything?
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
const walletProvidersCached = new Array<WalletProvider>();
const walletProvidersListeners = new Array<
  (walletProvider: WalletProvider) => void
>();

export function walletProvidersDiscover(
  onWalletProvider: (walletProvider: WalletProvider) => void,
) {
  for (const walletProvider of walletProvidersCached) {
    onWalletProvider(walletProvider);
  }
  walletProvidersListeners.push(onWalletProvider);
  if (!walletProvidersDiscovering) {
    walletProvidersDiscovering = true;
    walletProvidersEventDispatch();
  }
  return () => {
    const index = walletProvidersListeners.indexOf(onWalletProvider);
    if (index >= 0) {
      walletProvidersListeners.splice(index, 1);
    }
  };
}

function walletProvidersEventDispatch() {
  if (window === undefined) {
    throw new Error("WalletProvider discovery requires a window object");
  }
  function onWalletPlugin(walletPlugin: any) {
    const walletProvider = walletProviderFactory(walletPlugin);
    if (walletProvider === undefined) {
      return;
    }
    walletProvidersCached.push(walletProvider);
    for (const walletProvidersListener of walletProvidersListeners) {
      walletProvidersListener(walletProvider);
    }
  }
  class AppReadyEvent extends Event {
    constructor() {
      super("wallet-standard:app-ready");
    }
    get detail() {
      return { register: onWalletPlugin };
    }
  }
  window.addEventListener("wallet-standard:register-wallet", (event: any) => {
    event.detail({ register: onWalletPlugin });
  });
  window.dispatchEvent(new AppReadyEvent());
}

// TODO - cleanup implementation and naming on those
function walletProviderFactory(walletPlugin: any): WalletProvider | undefined {
  if (!walletPlugin || !walletPlugin.chains || !walletPlugin.features) {
    return;
  }
  if (
    typeof walletPlugin.name !== "string" ||
    typeof walletPlugin.icon !== "string"
  ) {
    return;
  }
  let supportsSolana = false;
  for (const chain of walletPlugin.chains) {
    if (typeof chain === "string" && chain.startsWith("solana:")) {
      supportsSolana = true;
    }
  }
  if (!supportsSolana) {
    return;
  }
  const walletConnectFunction = walletPluginFeatureFunction(
    walletPlugin,
    "standard",
    "connect",
  );
  const walletDisconnectFunction = walletPluginFeatureFunction(
    walletPlugin,
    "standard",
    "disconnect",
  );
  const walletSignMessageFunction = walletPluginFeatureFunction(
    walletPlugin,
    "solana",
    "signMessage",
  );
  const walletSignTransactionFunction = walletPluginFeatureFunction(
    walletPlugin,
    "solana",
    "signTransaction",
  );
  if (
    !walletConnectFunction ||
    !walletDisconnectFunction ||
    !walletSignMessageFunction ||
    !walletSignTransactionFunction
  ) {
    return;
  }
  return {
    name: walletPlugin.name,
    icon: walletPlugin.icon,
    connect: walletProviderConnectFactory(
      walletConnectFunction,
      walletSignMessageFunction,
      walletSignTransactionFunction,
    ),
    disconnect: walletDisconnectFunction as () => Promise<void>,
  };
}

function walletPluginFeatureFunction(
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

function walletProviderConnectFactory(
  walletConnectFunction: Function,
  walletSignMessageFunction: Function,
  walletSignTransactionFunction: Function,
) {
  return async () => {
    let walletAccountsObjects: Array<any>;
    let resultConnectSilent: any = undefined;
    try {
      resultConnectSilent = await walletConnectFunction({ silent: true });
    } catch (error) {
      console.log(
        "WalletProvider: silent connect failed, retrying non-silent",
        error,
      );
    }
    if (resultConnectSilent?.accounts) {
      walletAccountsObjects = resultConnectSilent.accounts;
    } else {
      const resultConnectRegular = await walletConnectFunction({
        silent: false,
      });
      if (resultConnectRegular?.accounts) {
        walletAccountsObjects = resultConnectRegular.accounts;
      } else {
        throw new Error("No accounts returned from wallet");
      }
    }
    const walletAccounts = new Array<WalletAccount>();
    for (const walletAccountObject of walletAccountsObjects) {
      walletAccounts.push(
        walletAccountFactory(
          walletAccountObject,
          walletSignMessageFunction,
          walletSignTransactionFunction,
        ),
      );
    }
    return walletAccounts;
  };
}

function walletAccountFactory(
  walletAccountObject: any,
  walletSignMessageFunction: Function,
  walletSignTransactionFunction: Function,
) {
  return {
    address: pubkeyFromBase58(walletAccountObject.address),
    signMessage: walletAccountSignMessageFactory(
      walletAccountObject,
      walletSignMessageFunction,
    ),
    signTransaction: walletAccountSignTransactionFactory(
      walletAccountObject,
      walletSignTransactionFunction,
    ),
  };
}

function walletAccountSignMessageFactory(
  walletAccountObject: any,
  walletSignMessageFunction: Function,
) {
  return async (message: Uint8Array) => {
    const resultSignMessage = await walletSignMessageFunction({
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

function walletAccountSignTransactionFactory(
  walletAccountObject: any,
  walletSignTransactionFunction: Function,
) {
  return async (transactionPacket: TransactionPacket) => {
    const resultSignTransaction = await walletSignTransactionFunction({
      account: walletAccountObject,
      transaction: transactionPacket,
    });
    const signedTransactionBytes = resultSignTransaction[0]?.signedTransaction;
    if (!(signedTransactionBytes instanceof Uint8Array)) {
      throw new Error("Invalid transaction returned from wallet provider");
    }
    return signedTransactionBytes as TransactionPacket;
  };
}
