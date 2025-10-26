import { Pubkey, pubkeyFromBase58 } from "./Pubkey";
import { rxBehaviourSubject, RxObservable } from "./Rx";
import { Signature, signatureFromBytes } from "./Signature";
import { TransactionPacket } from "./Transaction";

export type WalletProvider = {
  name: string;
  icon: string;
  accounts: RxObservable<Array<WalletAccount>>;
  connect: () => Promise<Array<WalletAccount>>;
  disconnect: () => Promise<void>;
};

export type WalletAccount = {
  address: Pubkey;
  signMessage: (message: Uint8Array) => Promise<Signature>;
  // TODO - how to handle partial signing, because phantom already sends everything?
  signTransaction: (
    transactionPacket: TransactionPacket,
  ) => Promise<TransactionPacket>;
};

const walletProvidersSubject = rxBehaviourSubject<Array<WalletProvider>>([]);
let walletProvidersDiscovering = false;

export const walletProviders: RxObservable<Array<WalletProvider>> = {
  subscribe: (listener) => {
    if (!walletProvidersDiscovering) {
      walletProvidersDiscovering = true;
      walletProvidersDiscovery();
    }
    return walletProvidersSubject.subscribe(listener);
  },
};

function walletProvidersDiscovery() {
  if (globalThis.window === undefined) {
    return;
  }
  function walletPluginRegister(walletPlugin: any) {
    const walletProvider = walletProviderFactory(walletPlugin);
    if (walletProvider === undefined) {
      return;
    }
    walletProvidersSubject.notify([
      ...walletProvidersSubject.get(),
      walletProvider,
    ]);
  }
  class AppReadyEvent extends Event {
    constructor() {
      super("wallet-standard:app-ready");
    }
    get detail() {
      return { register: walletPluginRegister };
    }
  }
  globalThis.window.addEventListener(
    "wallet-standard:register-wallet",
    (event: any) => {
      event.detail({ register: walletPluginRegister });
    },
  );
  globalThis.window.dispatchEvent(new AppReadyEvent());
}

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
    "standard:connect",
    "connect",
  );
  const walletDisconnectFunction = walletPluginFeatureFunction(
    walletPlugin,
    "standard:disconnect",
    "disconnect",
  );
  const walletOnChangeFunction = walletPluginFeatureFunction(
    walletPlugin,
    "standard:events",
    "on",
  );
  const walletSignMessageFunction = walletPluginFeatureFunction(
    walletPlugin,
    "solana:signMessage",
    "signMessage",
  );
  const walletSignTransactionFunction = walletPluginFeatureFunction(
    walletPlugin,
    "solana:signTransaction",
    "signTransaction",
  );
  if (
    !walletConnectFunction ||
    !walletDisconnectFunction ||
    !walletOnChangeFunction ||
    !walletSignMessageFunction ||
    !walletSignTransactionFunction
  ) {
    return;
  }
  const walletAccountsSubject = rxBehaviourSubject(new Array<WalletAccount>());
  walletOnChangeFunction("change", async (changed: any) => {
    if (changed.accounts === undefined) {
      return;
    }
    const walletAccountsObjects = changed.accounts;
    walletAccountsSubject.notify(
      walletAccountsObjects.map((walletAccountObject: any) => {
        return walletAccountFactory(
          walletAccountObject,
          walletSignMessageFunction,
          walletSignTransactionFunction,
        );
      }),
    );
  });
  return {
    name: walletPlugin.name,
    icon: walletPlugin.icon,
    accounts: walletAccountsSubject,
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
  featureName: string,
  featureCallKey: string,
): Function | undefined {
  const feature = walletObject.features[featureName];
  if (!feature || !feature.version) {
    return undefined;
  }
  const callable = feature[featureCallKey];
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
    let walletAccountsObjects = [];
    let resultConnectSilent: any = undefined;
    try {
      resultConnectSilent = await Promise.race([
        walletConnectFunction({ silent: true }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Silent connect timed out")), 1000),
        ),
      ]);
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
    return walletAccountsObjects.map((walletAccountObject: any) => {
      return walletAccountFactory(
        walletAccountObject,
        walletSignMessageFunction,
        walletSignTransactionFunction,
      );
    });
  };
}

function walletAccountFactory(
  walletAccountObject: any,
  walletSignMessageFunction: Function,
  walletSignTransactionFunction: Function,
): WalletAccount {
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
