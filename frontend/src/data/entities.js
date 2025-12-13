// Entity Models

export class SystemUser {
  constructor(id, username, password, role) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.role = role; // admin, procurement_manager, customer
  }
}

export class Product {
  constructor(id, name, description, price, quantity, category, status) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = price;
    this.quantity = quantity;
    this.category = category;
    this.status = status; // available, unavailable
  }
}

export class Order {
  constructor(id, userId, items, status, createdAt, totalAmount) {
    this.id = id;
    this.userId = userId;
    this.items = items;
    this.status = status; // pending, approved, rejected, completed
    this.createdAt = createdAt;
    this.totalAmount = totalAmount;
  }
}

export class Log {
  constructor(id, userId, action, description, createdAt) {
    this.id = id;
    this.userId = userId;
    this.action = action;
    this.description = description;
    this.createdAt = createdAt;
  }
}
