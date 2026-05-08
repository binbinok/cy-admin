import { Line } from '@ant-design/charts';
import type { RevenueTrend } from '@/types/finance';

interface RevenueLineChartProps {
  data: RevenueTrend[];
}

export default function RevenueLineChart(props: RevenueLineChartProps) {
  return (
    <Line
      data={props.data}
      xField="date"
      yField="amount"
      axis={{
        y: {
          labelFormatter: (value: string) => `${(Number(value) / 100).toFixed(2)}`,
        },
      }}
      tooltip={{
        items: [
          (datum: RevenueTrend) => ({
            name: '收入（元）',
            value: (datum.amount / 100).toFixed(2),
          }),
        ],
      }}
      point={{
        shapeField: 'circle',
        sizeField: 4,
      }}
      smooth
      height={280}
    />
  );
}
