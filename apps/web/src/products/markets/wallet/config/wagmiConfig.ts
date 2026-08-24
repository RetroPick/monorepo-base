// MARKETS_CUSTODY: wagmi config — user keys remain in wallet extension only

import { cookieStorage, createStorage, http } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { Config } from "wagmi";

import { getReownProjectId } from "./runtimeEnv";
import { MARKETS_DEFAULT_NETWORK, MARKETS_WALLET_NETWORKS, POLYGON_CHAIN_ID } from "./chains";

export const marketsProjectId = getReownProjectId();

const transports: Record<number, ReturnType<typeof http>> = {
  [POLYGON_CHAIN_ID]: http(),
};

let adapterSingleton: WagmiAdapter | undefined;

export function getMarketsWagmiAdapter(): WagmiAdapter {
  if (!adapterSingleton) {
    adapterSingleton = new WagmiAdapter({
      storage: createStorage({
        storage: typeof window !== "undefined" ? window.localStorage : cookieStorage,
      }),
      ssr: true,
      projectId: marketsProjectId,
      networks: MARKETS_WALLET_NETWORKS,
      transports,
    });
  }
  return adapterSingleton;
}

export function getMarketsWagmiConfig(): Config {
  return getMarketsWagmiAdapter().wagmiConfig as Config;
}

/** @deprecated prefer getMarketsWagmiConfig() — kept for provider wiring */
export const marketsWagmiConfig = new Proxy({} as Config, {
  get(_target, prop, receiver) {
    return Reflect.get(getMarketsWagmiConfig() as object, prop, receiver);
  },
});

export const marketsWagmiAdapter = new Proxy({} as WagmiAdapter, {
  get(_target, prop, receiver) {
    return Reflect.get(getMarketsWagmiAdapter() as object, prop, receiver);
  },
});

export const marketsAppDefaultNetwork = MARKETS_DEFAULT_NETWORK;
