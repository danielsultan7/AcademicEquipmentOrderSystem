// Mock data service
import { SystemUser, Product, Order, Log } from './entities';

export const mockUsers = [
  new SystemUser(1, 'admin', 'admin123', 'admin'),
  new SystemUser(2, 'john_pm', 'pm123', 'procurement_manager'),
  new SystemUser(3, 'customer_user', 'customer123', 'customer'),
];

export const mockProducts = [
  new Product(1, 'Microscope', 'Advanced optical microscope', 499.99, 5, 'Lab Equipment', 'available'),
  new Product(2, 'Projector', 'HD Digital Projector', 899.99, 3, 'Audio Visual', 'available'),
  new Product(3, 'Bunsen Burner', 'Laboratory Bunsen burner', 49.99, 20, 'Lab Equipment', 'available'),
  new Product(4, 'Oscilloscope', 'Digital oscilloscope', 1299.99, 2, 'Electronics', 'available'),
  new Product(5, 'Spectrometer', 'UV-Vis Spectrometer', 2499.99, 1, 'Lab Equipment', 'available'),
];

export const mockOrders = [
  new Order(1, 3, [{ productId: 1, quantity: 1, price: 499.99 }], 'pending', new Date('2025-11-20'), 499.99),
  new Order(2, 3, [{ productId: 3, quantity: 2, price: 49.99 }], 'approved', new Date('2025-11-18'), 99.98),
];

export const mockLogs = [
  new Log(1, 1, 'LOGIN', 'Admin logged in', new Date('2025-11-26T10:00:00')),
  new Log(2, 2, 'ORDER_CREATED', 'Order #1 created', new Date('2025-11-26T09:30:00')),
  new Log(3, 1, 'PRODUCT_UPDATED', 'Product #1 quantity updated', new Date('2025-11-26T08:15:00')),
];
