"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ListingForm from "../../../_components/ListingForm";

export default function EditHomeStayListingPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/homestay/host/listings/${params.id}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setInitial(data.data);
        }
      } finally {
        setLoading(false);
      }
    }
    if (params.id) void load();
  }, [params.id]);

  if (loading) {
    return <div className="p-10 text-center text-slate-400 font-bold">Loading...</div>;
  }

  if (!initial) {
    return <div className="p-10 text-center text-red-500 font-bold">Listing not found</div>;
  }

  return <ListingForm mode="edit" initial={initial} />;
}
