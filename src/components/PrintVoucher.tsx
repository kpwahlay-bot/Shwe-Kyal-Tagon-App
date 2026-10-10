import React from 'react';
import { POSCustomerVoucherModal, POSCustomerVoucherModalProps, VoucherPrintType } from './POSCustomerVoucherModal';

export type { VoucherPrintType, POSCustomerVoucherModalProps as PrintVoucherProps };

/**
 * PrintVoucher Component
 * Dual Print Mode Voucher handling:
 * - 'invoice': Format 1: Commercial Invoice (Default) with full letterhead, logo, and device/IMEI details.
 * - 'receipt': Format 2: Receipt (Tax-Safe Version) with generic descriptions, hidden letterhead & logo,
 *              label "Receipt No", and "INV" replaced with "RCP".
 */
export const PrintVoucher: React.FC<POSCustomerVoucherModalProps> = (props) => {
  return <POSCustomerVoucherModal {...props} />;
};

export default PrintVoucher;
