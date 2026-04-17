import Link from 'next/link';
import { Star, MapPin, Building2, Car, Users } from 'lucide-react';
import styles from './Cards.module.css';

export function DestinationCard({ title, desc, link = '/trip-builder' }: { title: string, desc: string, link?: string }) {
  return (
    <Link href={link} className={styles.destCard}>
      <div className={styles.destImage} />
      <div className={styles.destInfo}>
        <h3 className={styles.destTitle}>{title}</h3>
        <p className={styles.destDesc}>{desc}</p>
      </div>
    </Link>
  );
}

export function ServiceCard({ type, title, desc }: { type: 'hotel' | 'taxi' | 'guide', title: string, desc: string }) {
  const icons = {
    hotel: <Building2 size={32} />,
    taxi: <Car size={32} />,
    guide: <Users size={32} />,
  };
  
  return (
    <div className={styles.serviceCard}>
      <div className={styles.serviceIcon}>
        {icons[type]}
      </div>
      <h3 className={styles.serviceTitle}>{title}</h3>
      <p className={styles.serviceDesc}>{desc}</p>
    </div>
  );
}

export function PartnerCard({ name, rating, location }: { name: string, rating: number, location: string }) {
  return (
    <div className={styles.partnerCard}>
      <div className={styles.partnerLogo}>{name.charAt(0)}</div>
      <h3 className={styles.partnerName}>{name}</h3>
      <div className={styles.partnerMeta}>
        <Star size={14} fill="var(--warning)" color="var(--warning)" />
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{rating}</span>
        <span style={{ margin: '0 4px' }}>•</span>
        <MapPin size={14} />
        {location}
      </div>
    </div>
  );
}
