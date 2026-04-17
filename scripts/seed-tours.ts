import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.tourPackage.deleteMany()
  
  const tours = [
    {
      title: "Zomin Tog'lariga Qishki Ekstrim",
      description: "Zomin milliy bog'ining eng toza havosidan bahramand bo'ling va qorli cho'qqilarda ekstrim his eting. Oshpazlik darslari, ot mingish va kanatda sayr qamrab olingan.",
      destination: "Zomin",
      days: 3,
      nights: 2,
      price: 1500000.00,
      category: "Ekstremal",
      imageUrl: "https://images.unsplash.com/photo-1548777123-e81c38eabd16?q=80&w=1000&auto=format&fit=crop",
      highlights: ["Ot minish", "Kanat sayri", "Olov atrofida gulxan"]
    },
    {
      title: "Samarqand - Tarixiy Buyuk Ipak Yo'li",
      description: "Registon maydoni, Go'ri Amir, va boshqa qadimiy obidalarga sayohat. Profesional gid bilan Samarqand shahrining shonli tarixi sirlarini oching.",
      destination: "Samarqand",
      days: 2,
      nights: 1,
      price: 900000.00,
      category: "Tarixiy",
      imageUrl: "https://images.unsplash.com/photo-1632738472851-404323c8e404?q=80&w=1000&auto=format&fit=crop",
      highlights: ["Registon sayri", "Shohi Zinda", "Siyob bozori"]
    },
    {
      title: "Chorvoq-Chimyon Oilaviy Dam Olish",
      description: "Tog' yon bag'ridagi eng shinam kottejlardan birida yaqinlaringiz bilan unutilmas hordiq. Barcha qulayliklar bilan ta'minlangan.",
      destination: "Toshkent (Viloyat)",
      days: 4,
      nights: 3,
      price: 3200000.00,
      category: "Oilaviy",
      imageUrl: "https://images.unsplash.com/photo-1506461883276-594a12b11dc3?q=80&w=1000&auto=format&fit=crop",
      highlights: ["Chorvoq qayiqda", "Amirsoy kanat", "Barbeque kechasi"]
    },
    {
      title: "Buxoro - Muqaddas Qadamjolar",
      description: "Ettita pir hamda qadimiy Buxoro ko'chalarida ziyorat safarlari. Tasavvuf tarixi, ajoyib oshxona, va mahalliy san'at bilan tanishish.",
      destination: "Buxoro",
      days: 5,
      nights: 4,
      price: 1800000.00,
      category: "Ziyorat",
      imageUrl: "https://images.unsplash.com/photo-1629854497551-51dece0d46d5?q=80&w=1000&auto=format&fit=crop",
      highlights: ["Etti Pir qadamjolari", "Minorai Kalon", "Eski shahar sayri"]
    }
  ]

  for (const tour of tours) {
    await prisma.tourPackage.create({ data: tour })
  }
  
  console.log("Mock Tours seeded explicitly!")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
