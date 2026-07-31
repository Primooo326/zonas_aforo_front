'use client';

import flatpickr from 'flatpickr';
import { useEffect, useRef } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  minTime?: string;
  maxTime?: string;
  placeholder?: string;
}

export default function TimePicker({
  value,
  onChange,
  minTime,
  maxTime,
  placeholder = 'HH:MM',
}: TimePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const fp = flatpickr(el, {
      enableTime: true,
      noCalendar: true,
      dateFormat: 'H:i',
      time_24hr: true,
      defaultDate: value || undefined,
      onChange: (_selectedDates, dateStr) => onChangeRef.current(dateStr),
    });
    fpRef.current = fp;

    return () => {
      fp.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    if (minTime !== undefined) fp.set('minTime', minTime);
    if (maxTime !== undefined) fp.set('maxTime', maxTime);
  }, [minTime, maxTime]);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    const current = fp.selectedDates[0];
    const currentStr = current ? fp.formatDate(current, 'H:i') : '';
    if (currentStr !== value) {
      if (!value) {
        fp.clear();
      } else {
        fp.setDate(value, false);
      }
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      className="input input-bordered"
      placeholder={placeholder}
      value={value}
      readOnly
    />
  );
}
