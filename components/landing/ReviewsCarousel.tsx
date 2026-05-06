'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Star } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';
import styles from './ReviewsCarousel.module.css';
import {
  FEATURED_REVIEWS_FALLBACK,
  type FeaturedReview,
} from '@/lib/featuredReviewsFallback';

export default function ReviewsCarousel() {
  const [reviews, setReviews] = useState<FeaturedReview[]>(
    () => [...FEATURED_REVIEWS_FALLBACK],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/reviews/featured');
        const json = (await res.json()) as { reviews?: FeaturedReview[] };
        const next = json.reviews;
        if (!cancelled && Array.isArray(next) && next.length > 0) {
          setReviews(next);
        }
      } catch {
        /* keep fallback */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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
            {reviews.map((review) => (
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
                  <p className={styles.text}>&ldquo;{review.text}&rdquo;</p>
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
