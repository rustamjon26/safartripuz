import { NextResponse } from 'next/server';

export async function GET() {
  const destinations = [
    { id: 1, title: 'Samarqand', desc: 'Registon maydoni, Go\'ri Amir maqbarasi va boshqa qadimiy obidalar.', image: '' },
    { id: 2, title: 'Buxoro', desc: 'Ark qal\'asi, Minorai Kalon va qadimiy savdo gumbazlari.', image: '' },
    { id: 3, title: 'Xiva', desc: 'Ichan Qal\'a - ochiq osmon ostidagi butun bir shahar-muzey.', image: '' },
    { id: 4, title: 'Toshkent', desc: 'Zamonaviy poytaxtning gavjum va go\'zal maskanlari.', image: '' },
  ];
  
  // Simulate delay
  await new Promise(r => setTimeout(r, 500));
  
  return NextResponse.json({ destinations });
}
