import { useState, useEffect } from 'react';
import { Loader2, MapPin } from 'lucide-react';

interface ClientLocationProps {
    ip: string | null;
}

export const ClientLocation = ({ ip }: ClientLocationProps) => {
    const [location, setLocation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!ip) return;

        const fetchLocation = async () => {
            setLoading(true);
            try {
                const response = await fetch(`https://ipapi.co/${ip}/json/`);
                if (!response.ok) throw new Error('Failed to fetch location');

                const data = await response.json();
                if (data.error) throw new Error(data.reason || 'Location not found');

                setLocation(`${data.city}, ${data.country_name}`);
            } catch (err) {
                console.error('Error fetching location:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchLocation();
    }, [ip]);

    if (!ip) return null;

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Fetching location...</span>
            </div>
        );
    }

    if (error || !location) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span>Unknown Location</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3 text-primary" />
            <span>{location}</span>
        </div>
    );
};
