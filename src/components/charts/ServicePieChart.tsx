import { Pie } from '@ant-design/charts';

export interface ServiceRevenueItem {
  category: string;
  amount: number;
}

interface ServicePieChartProps {
  data: ServiceRevenueItem[];
}

export default function ServicePieChart(props: ServicePieChartProps) {
  return (
    <Pie
      data={props.data}
      angleField="amount"
      colorField="category"
      label={{
        text: (datum: ServiceRevenueItem) => `${datum.category}: ${(datum.amount / 100).toFixed(2)}元`,
      }}
      tooltip={{
        items: [
          (datum: ServiceRevenueItem) => ({
            name: datum.category,
            value: `${(datum.amount / 100).toFixed(2)}元`,
          }),
        ],
      }}
      legend={{
        color: {
          title: false,
          position: 'right',
          rowPadding: 4,
        },
      }}
      height={280}
    />
  );
}
