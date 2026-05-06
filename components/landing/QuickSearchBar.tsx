'use client';

import { useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './QuickSearchBar.module.css';
import 'react-datepicker/dist/react-datepicker.css';

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtIso(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DESTINATIONS = [
  { slug: 'zomin', label: 'Zomin' },
  { slug: 'jizzax', label: 'Jizzax' },
  { slug: 'samarqand', label: 'Samarqand' },
  { slug: 'buxoro', label: 'Buxoro' },
  { slug: 'toshkent', label: 'Toshkent' },
  { slug: 'xiva', label: 'Xiva' },
] as const;

type TabId = 'hotel' | 'homestay' | 'taxi' | 'guide';

export default function QuickSearchBar() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('hotel');

  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const defaultEnd = useMemo(() => addDays(tomorrow, 2), [tomorrow]);

  const [destination, setDestination] = useState('zomin');
  const [startDate, setStartDate] = useState<Date | null>(tomorrow);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
  const [guests, setGuests] = useState(2);

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');

  const [excursionDate, setExcursionDate] = useState<Date | null>(tomorrow);
  const [groupSize, setGroupSize] = useState(2);

  const destLabel =
    DESTINATIONS.find((d) => d.slug === destination)?.label ?? destination;

  const dateRangeLabel =
    startDate && endDate
      ? `${fmtIso(startDate)} — ${fmtIso(endDate)}`
      : startDate
        ? fmtIso(startDate)
        : '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (tab === 'hotel') {
      const q = new URLSearchParams();
      q.set('city', destLabel);
      if (startDate) q.set('checkIn', fmtIso(startDate));
      if (endDate) q.set('checkOut', fmtIso(endDate));
      q.set('guests', String(guests));
      router.push(`/hotels?${q.toString()}`);
      return;
    }

    if (tab === 'homestay') {
      const q = new URLSearchParams();
      q.set('city', destLabel);
      if (startDate) q.set('checkIn', fmtIso(startDate));
      if (endDate) q.set('checkOut', fmtIso(endDate));
      q.set('guests', String(guests));
      router.push(`/homestay?${q.toString()}`);
      return;
    }

    if (tab === 'taxi') {
      const q = new URLSearchParams();
      if (pickup.trim()) q.set('pickup', pickup.trim());
      if (dropoff.trim()) q.set('dropoff', dropoff.trim());
      router.push(`/taxi${q.toString() ? `?${q.toString()}` : ''}`);
      return;
    }

    const q = new URLSearchParams();
    q.set('city', destLabel);
    if (excursionDate) q.set('date', fmtIso(excursionDate));
    q.set('groupSize', String(groupSize));
    router.push(`/guide?${q.toString()}`);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'hotel'}
          className={`${styles.tab} ${tab === 'hotel' ? styles.tabActive : ''}`}
          onClick={() => setTab('hotel')}
        >
          Mehmonxona
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'homestay'}
          className={`${styles.tab} ${tab === 'homestay' ? styles.tabActive : ''}`}
          onClick={() => setTab('homestay')}
        >
          Uy joy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'taxi'}
          className={`${styles.tab} ${tab === 'taxi' ? styles.tabActive : ''}`}
          onClick={() => setTab('taxi')}
        >
          Taxi
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'guide'}
          className={`${styles.tab} ${tab === 'guide' ? styles.tabActive : ''}`}
          onClick={() => setTab('guide')}
        >
          Ekskursiya
        </button>
      </div>

      <form className={styles.searchBar} onSubmit={handleSubmit}>
        {(tab === 'hotel' || tab === 'homestay') && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Qayerga</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.separator} />
            <div className={`${styles.fieldGroup} ${styles.dateField}`}>
              <label className={styles.label}>Sana</label>
              <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  const [s, en] = update as [Date | null, Date | null];
                  setStartDate(s);
                  setEndDate(en);
                }}
                monthsShown={2}
                dateFormat="dd.MM.yyyy"
                placeholderText="Sanalarni tanlang"
                className={styles.input}
                wrapperClassName={styles.datePickerWrap}
                calendarClassName={styles.dateCalendar}
                popperClassName={styles.datePopper}
                minDate={new Date()}
              />
              {dateRangeLabel ? (
                <span className={styles.dateHint}>{dateRangeLabel}</span>
              ) : null}
            </div>
            <div className={styles.separator} />
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Mehmonlar</label>
              <input
                type="number"
                min={1}
                className={styles.input}
                value={guests}
                onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </>
        )}

        {tab === 'taxi' && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Qayerdan</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Jo'nash manzili"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </div>
            <div className={styles.separator} />
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Qayerga</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Yetib borish manzili"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
            </div>
          </>
        )}

        {tab === 'guide' && (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Shahar</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.separator} />
            <div className={`${styles.fieldGroup} ${styles.dateField}`}>
              <label className={styles.label}>Sana</label>
              <DatePicker
                selected={excursionDate}
                onChange={(d: Date | null) => setExcursionDate(d)}
                dateFormat="dd.MM.yyyy"
                placeholderText="Sanani tanlang"
                className={styles.input}
                wrapperClassName={styles.datePickerWrap}
                minDate={new Date()}
              />
            </div>
            <div className={styles.separator} />
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Guruh</label>
              <input
                type="number"
                min={1}
                className={styles.input}
                value={groupSize}
                onChange={(e) =>
                  setGroupSize(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </div>
          </>
        )}

        <button type="submit" className={styles.submitBtn}>
          <Search size={22} />
          Safar qidirish
        </button>
      </form>
    </div>
  );
}
