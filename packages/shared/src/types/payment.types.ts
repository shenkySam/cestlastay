import { InvoiceStatus, PaymentMethod, PaymentStatus } from '../constants/statuses';

export interface IInvoiceItem {
  id: string;
  invoiceId: string;
  serviceRequestId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IInvoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  items?: IInvoiceItem[];
}

export interface IPayment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  stripePaymentId?: string;
  transactionId?: string;
  receiptUrl?: string;
  processedAt?: string;
  createdAt: string;
}
