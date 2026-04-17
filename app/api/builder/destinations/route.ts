import { NextResponse } from "next/server";

export async function GET() {
  const destinations = [
    { id: "samarkand", title: "Samarqand" },
    { id: "bukhara", title: "Buxoro" },
    { id: "khiva", title: "Xiva" },
    { id: "tashkent", title: "Toshkent" },
    { id: "jizzax", title: "Jizzax" },
    { id: "zomin", title: "Zomin" },
  ];

  return NextResponse.json(destinations);
}
