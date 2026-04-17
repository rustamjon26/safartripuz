'use client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Star } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';
import styles from './ReviewsCarousel.module.css';

const REVIEWS = [
  {
    id: 1,
    author: "Dilnoza, Toshkent",
    text: "Zomin — hayotimda ko'rgan eng go'zal joy. SafarTrip bilan bron qilish juda oson bo'ldi, mehmonxona ajoyib edi!",
    destination: "🏔️ Zomin",
    date: "Avgust 2024"
  },
  {
    id: 2,
    author: "Malika, Andijon",
    text: "Jizzax tarixi haqida hech narsa bilmas edim. Gidimiz barcha narsalarni shunday qiziqarli qilib aytdiki, yana bormoqchiman.",
    destination: "🌆 Jizzax",
    date: "Sentyabr 2024"
  },
  {
    id: 3,
    author: "Jasur, Namangan",
    text: "Oilam bilan Zomin ko'liga bordik. Bolalar suvda o'ynashdi, biz dam oldik. Hayotimizning eng yaxshi ta'tili bo'ldi.",
    destination: "🏔️ Zomin",
    date: "Iyul 2024"
  },
  {
    id: 4,
    author: "Odilbek, Xorazm",
    text: "Hammasi bir joyda jamlangani qulay ekan. Vaqtni tejab, ishonchli xizmatlardan foydalandik. Kattakon rahmat!",
    destination: "🌆 Jizzax",
    date: "Oktyabr 2024"
  }
];

export default function ReviewsCarousel() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={`${styles.title} font-display`}>Ularning gaplari bizning eng katta mukofotimiz</h2>
        
        <div className={styles.carouselWrapper}>
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true, el: '.custom-pagination' }}
            style={{ paddingBottom: '30px' }}
          >
            {REVIEWS.map(review => (
              <SwiperSlide key={review.id} style={{ height: 'auto' }}>
                <div className={styles.reviewCard}>
                  <div className={styles.header}>
                    <div className={styles.avatar}>{review.author.charAt(0)}</div>
                    <div className={styles.authorInfo}>
                      <div className={styles.authorName}>{review.author}</div>
                      <div className={styles.destinationBadge}>{review.destination}</div>
                    </div>
                  </div>
                  <div className={styles.stars}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                  </div>
                  <p className={styles.text}>"{review.text}"</p>
                  <div className={styles.date}>{review.date}</div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="custom-pagination" style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', gap: '8px' }}></div>
        </div>
      </div>
    </section>
  );
}
