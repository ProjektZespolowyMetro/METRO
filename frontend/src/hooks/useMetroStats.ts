import { useMemo } from 'react';

export function useMetroStats(metroUsage: any, maintenanceCosts: any) {
    const ticketPriceUsd = 2.5;

    const totalDailyRides = useMemo(() => {
        if (!metroUsage) return 0;
        let sum = 0;
        for (const key of Object.keys(metroUsage)) {
            const arr = metroUsage[Number(key)];
            if (Array.isArray(arr)) {
                for (const v of arr) sum += Number(v) || 0;
            }
        }
        return sum;
    }, [metroUsage]);

    const dailyRevenue = totalDailyRides * ticketPriceUsd;
    const dailyCost = maintenanceCosts?.daily_cost_usd || 0;
    const dailyProfit = dailyRevenue - dailyCost;

    const formatShortUsd = (n: number) =>
        n.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        });

    return {
        dailyCost: formatShortUsd(dailyCost),
        dailyRevenue: formatShortUsd(dailyRevenue),
        dailyProfit: formatShortUsd(dailyProfit),
        rawProfit: dailyProfit,
    };
}
