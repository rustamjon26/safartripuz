'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './QuickSearchBar.module.css';

export default function QuickSearchBar() {
  const router = useRouter();
  const [destination, setDestination] = useState('zomin');
  const [dateRange, setDateRange] = useState('');
  const [guests, setGuests] = useState('2 katta, 0 bola');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/login');
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.searchBar} onSubmit={handleSearch}>
        
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Qayerga</label>
          <div className={styles.selectWrapper}>
            <select 
              className={styles.select}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="zomin">Zomin, Jizzax viloyati</option>
              <option value="jizzax">Jizzax shahri</option>
              <option value="samarqand" disabled>Samarqand (🔜 Tez orada)</option>
              <option value="buxoro" disabled>Buxoro (🔜 Tez orada)</option>
            </select>
          </div>
        </div>
        
        <div className={styles.separator} />
        
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Sana</label>
          <input 
            type="text" 
            placeholder="Sanalarni tanlang" 
            className={styles.input}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
        </div>
        
        <div className={styles.separator} />
        
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Mehmonlar</label>
          <input 
            type="text" 
            placeholder="Odam soni" 
            className={styles.input}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          />
        </div>

        <button type="submit" className={styles.submitBtn}>
          <Search size={22} />
          Safar qidirish
        </button>
      </form>
    </div>
  );
}
