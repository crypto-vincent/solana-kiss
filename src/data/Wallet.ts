import { Pubkey, pubkeyFromBase58 } from "./Pubkey";
import { rxBehaviourSubject, RxObservable } from "./Rx";
import { Signature, signatureFromBytes } from "./Signature";
import { TransactionPacket, transactionPacketFromBytes } from "./Transaction";

/** Wallet Standard–compatible wallet provider plugin for Solana. */
export type WalletProvider = {
  /** Human-readable display name of the wallet (e.g. `"Phantom"`). */
  name: string;
  /** Data-URL icon image for the wallet, used for display in wallet-selection UIs. */
  icon: string;
  /** Observable list of connected {@link WalletAccount}s. */
  accounts: RxObservable<Array<WalletAccount>>;
  /**
   * Requests user to connect and grant access to accounts.
   * @param options.silent - Skip approval dialog if already connected.
   * @returns Approved {@link WalletAccount}s.
   */
  connect: (options?: { silent?: boolean }) => Promise<Array<WalletAccount>>;
  /** Disconnects the wallet and revokes account access. */
  disconnect: () => Promise<void>;
};

/** Single wallet account capable of signing messages and transactions. */
export type WalletAccount = {
  /** The public key of this account on the Solana network. */
  address: Pubkey;
  /**
   * Signs an arbitrary message.
   * @param message - Raw bytes to sign.
   * @returns {@link Signature}.
   */
  signMessage: (message: Uint8Array) => Promise<Signature>;
  /**
   * Signs a transaction packet, filling the appropriate signature slot.
   * @param transactionPacket - Unsigned (or partially signed) transaction.
   * @returns Updated {@link TransactionPacket}.
   */
  signTransaction: (
    transactionPacket: TransactionPacket,
  ) => Promise<TransactionPacket>;
};

/**
 * Observable list of all discovered {@link WalletProvider}s.
 * Discovery begins lazily on first subscription via `wallet-standard:app-ready`.
 */
export const walletProviders: RxObservable<Array<WalletProvider>> = {
  subscribe: (listener) => {
    if (!walletProvidersDiscovering) {
      walletProvidersDiscovering = true;
      walletProvidersDiscovery();
    }
    return walletProvidersSubject.subscribe(listener);
  },
};

let walletProvidersDiscovering = false;
const walletProvidersSubject = rxBehaviourSubject(new Array<WalletProvider>());

function walletProvidersDiscovery() {
  if (globalThis.window === undefined) {
    return;
  }
  class AppReadyEvent extends Event {
    constructor() {
      super("wallet-standard:app-ready");
    }
    get detail() {
      return { register: walletProviderRegister };
    }
  }
  globalThis.window.addEventListener(
    "wallet-standard:register-wallet",
    (event: any) => {
      event.detail({ register: walletProviderRegister });
    },
  );
  globalThis.window.dispatchEvent(new AppReadyEvent());
}

function walletProviderRegister(walletPlugin: any) {
  const walletProvider = walletProviderFactory(walletPlugin);
  if (walletProvider === undefined) {
    return;
  }
  walletProvidersSubject.notify([
    ...walletProvidersSubject.get(),
    walletProvider,
  ]);
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
  const walletEventOnFunction = walletPluginFeatureFunction(
    walletPlugin,
    "standard:events",
    "on",
  );
  const walletDisconnectFunction = walletPluginFeatureFunction(
    walletPlugin,
    "standard:disconnect",
    "disconnect",
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
    !walletEventOnFunction ||
    !walletSignMessageFunction ||
    !walletSignTransactionFunction
  ) {
    return;
  }
  const walletAccountsSubject = rxBehaviourSubject(new Array<WalletAccount>());
  walletEventOnFunction("change", async (changed: any) => {
    if (!changed?.accounts) {
      return;
    }
    walletAccountsSubject.notify(
      changed.accounts.map((walletAccountObject: any) => {
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
    disconnect: walletDisconnectFunction
      ? (walletDisconnectFunction as () => Promise<void>)
      : async () => {},
    __adapter: walletPlugin,
  } as WalletProvider;
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
  return async (options?: { silent?: boolean }) => {
    const result = await walletConnectFunction({
      silent: options?.silent ?? false,
    });
    if (!result?.accounts) {
      throw new Error("WalletProvider: connect failed");
    }
    return result.accounts.map((walletAccountObject: any) => {
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
    return transactionPacketFromBytes(signedTransactionBytes);
  };
}
