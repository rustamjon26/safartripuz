'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginWithNext } from '@/lib/authLinks';
import styles from './SearchBar.module.css';

export default function SearchBar() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [guests, setGuests] = useState('2 katta, 0 bola');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (destination) {
      router.push(
        loginWithNext(`/trip-builder?dest=${encodeURIComponent(destination)}`),
      );
    } else {
      // Show error state (for later)
      alert('Iltimos, manzilni kiriting');
    }
  };

  return (
    <form className={styles.searchBar} onSubmit={handleSearch}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Qayerga</label>
        <input 
          type="text" 
          placeholder="Manzilni kiriting" 
          className={styles.input}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
      </div>
      
      <div className={styles.separator} />
      
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Qachon</label>
        <input 
          type="text" 
          placeholder="Sana qo'shish" 
          className={styles.input}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        />
      </div>
      
      <div className={styles.separator} />
      
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Kimlar</label>
        <input 
          type="text" 
          placeholder="Mehmonlar" 
          className={styles.input}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        />
      </div>

      <button type="submit" className={styles.submitBtn}>
        <Search size={20} />
        Qidirish
      </button>
    </form>
  );
}
