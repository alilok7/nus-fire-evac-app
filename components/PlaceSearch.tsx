"use client";

import { useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";

type Props = {
  onPick: (result: { name: string; lat: number; lng: number }) => void;
};

export default function PlaceSearch({ onPick }: Props) {
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);

  return (
    <Autocomplete
      onLoad={(a) => (autoRef.current = a)}
      onPlaceChanged={() => {
        const place = autoRef.current?.getPlace();
        const loc = place?.geometry?.location;
        if (!place || !loc) return;

        onPick({
          name: place.name || place.formatted_address || "Checkpoint",
          lat: loc.lat(),
          lng: loc.lng(),
        });
      }}
    >
      <input
        placeholder="Search checkpoint on Google Maps…"
        className="border rounded-lg px-3 py-2 w-full"
      />
    </Autocomplete>
  );
}
