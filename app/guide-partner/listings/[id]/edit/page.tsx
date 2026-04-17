"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GuideListingForm from "../../../_components/ListingForm";

type GuideListingInitial = {
  id: string;
  title: string;
  description: string;
  category: "CITY_TOUR" | "NATURE" | "HISTORY" | "ADVENTURE" | "FOOD" | "CUSTOM";
  languages: string[];
  pricePerHour: number;
  minHours: number;
  maxHours: number;
  maxGroupSize: number;
  meetingPoint: string;
  images: string[];
  region?: string;
  duration?: string;
};

export default function EditGuideListingPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<GuideListingInitial | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/guide/partner/listings/${params.id}`);
        const data = await res.json();
        if (res.ok && data.success) setInitial(data.data);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) void load();
  }, [params.id]);

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Loading...</div>;
  if (!initial) return <div className="p-10 text-center text-red-500 font-bold">Listing not found</div>;

  return <GuideListingForm mode="edit" initial={initial} />;
}
