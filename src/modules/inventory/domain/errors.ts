export class InsufficientInventoryError extends Error {
  readonly code = "INSUFFICIENT_INVENTORY" as const;

  constructor(message = "Tanlangan sanalarda bo'sh xonalar yetarli emas") {
    super(message);
    this.name = "InsufficientInventoryError";
  }
}

export class InventoryNotProvisionedError extends Error {
  readonly code = "INVENTORY_NOT_PROVISIONED" as const;

  constructor(message = "Inventory qatorlari topilmadi") {
    super(message);
    this.name = "InventoryNotProvisionedError";
  }
}

export class InventoryLockError extends Error {
  readonly code = "INVENTORY_LOCK" as const;

  constructor(message = "Inventory bandligi; qayta urinib ko'ring") {
    super(message);
    this.name = "InventoryLockError";
  }
}

export class InventoryNegativeError extends Error {
  readonly code = "INVENTORY_NEGATIVE" as const;

  constructor(message = "availableRooms cannot go below 0") {
    super(message);
    this.name = "InventoryNegativeError";
  }
}
