import { Address } from './location';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  NOT_REQUIRED = 'not_required',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export interface Payment {
  amount: number;
  method: string;
  status: PaymentStatus;
  transactionId?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  totalAmount: number;
  price: number;
  status: OrderStatus;
  pickupAddress: Address;
  dropoffAddress: Address;
  vehicleId: string;
  estimatedTime: string;
  distance: number;
  payment: Payment;
  paymentMethod: string;
  createdAt?: Date;
  updatedAt?: Date;
} 