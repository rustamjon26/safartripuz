export type TripBuilderDrawerTab = "hotel" | "homestay" | "guide" | "transport";

export type TripBuilderTabEventDetail = {
  tab: TripBuilderDrawerTab;
  open?: boolean;
};

export const TRIP_BUILDER_TAB_EVENT = "trip-builder-tab" as const;

export function dispatchTripBuilderTab(tab: TripBuilderDrawerTab) {
  window.dispatchEvent(
    new CustomEvent<TripBuilderTabEventDetail>(TRIP_BUILDER_TAB_EVENT, {
      detail: { tab, open: true },
    }),
  );
}
