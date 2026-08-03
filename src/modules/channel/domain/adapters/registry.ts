import type { ChannelAdapter } from "../adapter";
import type { OtaProviderKey } from "../types";
import { createStubAdapter } from "./stub-adapter";

const adapters: Record<OtaProviderKey, ChannelAdapter> = {
  booking: createStubAdapter("booking"),
  expedia: createStubAdapter("expedia"),
  airbnb: createStubAdapter("airbnb"),
};

export function getChannelAdapter(providerKey: string): ChannelAdapter {
  const key = providerKey as OtaProviderKey;
  const adapter = adapters[key];
  if (!adapter) {
    throw new Error(`No channel adapter for provider: ${providerKey}`);
  }
  return adapter;
}

export function isOtaProviderKey(key: string): key is OtaProviderKey {
  return key === "booking" || key === "expedia" || key === "airbnb";
}
