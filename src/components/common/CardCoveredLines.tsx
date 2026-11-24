import { Typography } from 'antd';
import type { PaymentDetail } from '@/types/member';
import { formatAmount } from '@/utils/format';

interface CardCoveredLinesProps {
  readonly sessionCoveredAmount?: number;
  readonly paymentDetails?: readonly PaymentDetail[];
}

function sumMemberCardAmount(paymentDetails: readonly PaymentDetail[]): number {
  return paymentDetails
    .filter((d) => d.paymentType === 'member_card')
    .reduce((sum, d) => sum + d.amount, 0);
}

export default function CardCoveredLines({
  sessionCoveredAmount = 0,
  paymentDetails = [],
}: CardCoveredLinesProps) {
  const memberCardAmount = sumMemberCardAmount(paymentDetails);
  if (sessionCoveredAmount <= 0 && memberCardAmount <= 0) {
    return null;
  }
  return (
    <div>
      {sessionCoveredAmount > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          次卡核销 ¥{formatAmount(sessionCoveredAmount)}
        </Typography.Text>
      )}
      {memberCardAmount > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          会员卡 ¥{formatAmount(memberCardAmount)}
        </Typography.Text>
      )}
    </div>
  );
}
