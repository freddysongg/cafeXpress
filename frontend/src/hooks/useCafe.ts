import { useState, useEffect } from 'react';
import { CafeRecommendation } from '../services/api';

export const useCafe = (id: string | undefined) => {
  const [cafe, setCafe] = useState<CafeRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCafe = async () => {
      if (!id) {
        setError('No cafe ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/recommendations/${id}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch cafe details');
        }
        const data = await response.json();
        setCafe(data);
      } catch (err) {
        setError('Failed to load cafe details');
        console.error('Error fetching cafe:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCafe();
  }, [id]);

  return { cafe, loading, error };
};
