import { PurchaseRecord } from "../types";

export const CANONICAL_PURCHASES: PurchaseRecord[] = [
  {
    "id": "po-1790591976563",
    "date": "2026-09-28",
    "invoiceNo": "6000007",
    "supplierName": "UC",
    "supplierPhone": "09456776543",
    "branchId": "branch-1",
    "branchName": "ရွှေကြယ်တံခွန် (Shop 1)",
    "itemName": "Samsung A09 8/256GB (3 pcs)",
    "brand": "Samsung",
    "model": "Samsung A09 8/256GB",
    "sku": "SS0140",
    "category": "Smartphones & Tablets",
    "warranty": "1 Year Official",
    "unitCost": 900000,
    "quantity": 3,
    "totalAmount": 2700000,
    "paidAmount": 2700000,
    "remainingDebt": 0,
    "paymentStatus": "PAID",
    "paymentMethod": "Cash In Hand (HQ / Main Register)",
    "dueDate": "2026-10-05",
    "autoAddToInventory": true,
    "items": [
      {
        "id": "line-1790591976563-0",
        "itemName": "Samsung A09 8/256GB",
        "brand": "Samsung",
        "model": "Samsung A09 8/256GB",
        "category": "Smartphones & Tablets",
        "sku": "SS0140",
        "inventoryItemId": "inv-1790569133645-1",
        "warranty": "1 Year Official",
        "unitCost": 900000,
        "quantity": 3,
        "totalCost": 2700000,
        "imeiList": [
          "34567898765445",
          "567890987654",
          "34567898765454"
        ],
        "isExistingModel": true
      }
    ],
    "imeiList": [
      "34567898765445",
      "567890987654",
      "34567898765454"
    ],
    "serialNumbers": [
      "34567898765445",
      "567890987654",
      "34567898765454"
    ],
    "notes": "RMA Debt Deduction: 900,000 MMK (RET-SUP-2609-001)",
    "paymentHistory": [
      {
        "id": "pay-1790592006236",
        "date": "2026-09-28",
        "amount": 1000000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Daw Su Myat Win",
        "notes": "PO Debt Settlement: 6000007",
        "createdAt": "2026-09-28T10:40:06.236Z"
      },
      {
        "id": "pay-1790594520364",
        "date": "2026-09-28",
        "amount": 800000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe",
        "notes": "PO Debt Settlement: 6000007",
        "createdAt": "2026-09-28T11:22:00.364Z"
      }
    ],
    "recordedBy": "Daw Su Myat Win",
    "createdAt": "2026-09-28T10:39:36.563Z",
    "inventoryItemId": "inv-1790569133645-1"
  },
  {
    "id": "po-1790569133644",
    "date": "2026-09-28",
    "invoiceNo": "6000006",
    "supplierName": "UC",
    "supplierPhone": "09456776543",
    "branchId": "branch-1",
    "branchName": "ရွှေကြယ်တံခွန် (Shop 1)",
    "itemName": "samsung A80 8/256GB (2 pcs), Samsung A09 8/256GB (2 pcs)",
    "brand": "Samsung",
    "model": "samsung A80 8/256GB",
    "sku": "SS0139",
    "category": "Smartphones & Tablets",
    "warranty": "1 Year Official",
    "unitCost": 750000,
    "quantity": 4,
    "totalAmount": 3300000,
    "paidAmount": 3300000,
    "remainingDebt": 0,
    "paymentStatus": "PAID",
    "paymentMethod": "Cash In Hand (HQ / Main Register)",
    "accountId": "acc-cash-hq",
    "dueDate": "2026-09-29",
    "autoAddToInventory": true,
    "items": [
      {
        "id": "line-1790569133644-0",
        "itemName": "samsung A80 8/256GB",
        "brand": "Samsung",
        "model": "samsung A80 8/256GB",
        "category": "Smartphones & Tablets",
        "sku": "SS0139",
        "inventoryItemId": "inv-1790566036910-1",
        "warranty": "1 Year Official",
        "unitCost": 750000,
        "quantity": 2,
        "totalCost": 1500000,
        "imeiList": [
          "34567898765"
        ],
        "isExistingModel": true
      },
      {
        "id": "line-1790569133644-1",
        "itemName": "Samsung A09 8/256GB",
        "brand": "Samsung",
        "model": "Samsung A09 8/256GB",
        "category": "Smartphones & Tablets",
        "sku": "SS0140",
        "inventoryItemId": "inv-1790569133645-1",
        "warranty": "1 Year Official",
        "unitCost": 900000,
        "quantity": 2,
        "totalCost": 1800000,
        "imeiList": [
          "345678987654"
        ],
        "isExistingModel": false
      }
    ],
    "installments": [
      {
        "id": "inst-1790569126683-1",
        "installmentNo": 1,
        "dueDate": "2026-09-29",
        "amount": 900000,
        "isPaid": true,
        "notes": "DAILY Installment #1 of 2 • Paid on 2026-09-28",
        "paidDate": "2026-09-28",
        "paidAccountId": "acc-cash-hq"
      },
      {
        "id": "inst-1790569126683-2",
        "installmentNo": 2,
        "dueDate": "2026-09-30",
        "amount": 900000,
        "isPaid": false,
        "notes": "DAILY Installment #2 of 2 • Partially paid (100000 Ks) on 2026-09-28 • Partially paid (800000 Ks) on 2026-09-28"
      }
    ],
    "imeiList": [
      "34567898765",
      "345678987654"
    ],
    "serialNumbers": [
      "34567898765",
      "345678987654"
    ],
    "notes": "",
    "paymentHistory": [
      {
        "id": "pay-1790569133644",
        "date": "2026-09-28",
        "amount": 1500000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe (Finance & Policy)",
        "notes": "Initial Down Payment on Purchase",
        "createdAt": "2026-09-28T04:18:53.644Z"
      },
      {
        "id": "pay-1790591794578",
        "date": "2026-09-28",
        "amount": 1000000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Daw Su Myat Win",
        "notes": "PO Debt Settlement: 6000006",
        "createdAt": "2026-09-28T10:36:34.578Z"
      },
      {
        "id": "pay-1790594832898",
        "date": "2026-09-28",
        "amount": 800000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe",
        "notes": "PO Debt Settlement: 6000006",
        "createdAt": "2026-09-28T11:27:12.898Z"
      }
    ],
    "recordedBy": "Yamin Nwe (Finance & Policy)",
    "createdAt": "2026-09-28T04:18:53.644Z",
    "inventoryItemId": "inv-1790566036910-1"
  },
  {
    "id": "po-1790566036909",
    "date": "2026-09-28",
    "invoiceNo": "6000005",
    "supplierName": "UC",
    "supplierPhone": "09456776543",
    "branchId": "branch-1",
    "branchName": "ရွှေကြယ်တံခွန် (Shop 1)",
    "itemName": "A07 (6/128)purple (1 pcs), samsung A80 8/256GB (1 pcs), samsung A56 6/256GB (2 pcs)",
    "brand": "Samsung",
    "model": "A07 (6/128)purple",
    "sku": "SS70",
    "category": "Smartphones & Tablets",
    "warranty": "1 Year Official",
    "unitCost": 500000,
    "quantity": 4,
    "totalAmount": 2700000,
    "paidAmount": 2600000,
    "remainingDebt": 100000,
    "paymentStatus": "PARTIAL",
    "paymentMethod": "Cash In Hand (HQ / Main Register)",
    "accountId": "acc-cash-hq",
    "dueDate": "2026-09-28",
    "autoAddToInventory": true,
    "items": [
      {
        "id": "line-1790566036907-0",
        "itemName": "A07 (6/128)purple",
        "brand": "Samsung",
        "model": "A07 (6/128)purple",
        "category": "Smartphones & Tablets",
        "sku": "SS70",
        "inventoryItemId": "item-import-1790056543672-129-st3p",
        "warranty": "1 Year Official",
        "unitCost": 500000,
        "quantity": 1,
        "totalCost": 500000,
        "imeiList": [],
        "isExistingModel": true
      },
      {
        "id": "line-1790566036908-1",
        "itemName": "samsung A80 8/256GB",
        "brand": "Samsung",
        "model": "samsung A80 8/256GB",
        "category": "Smartphones & Tablets",
        "sku": "SS0139",
        "inventoryItemId": "inv-1790566036910-1",
        "warranty": "1 Year Official",
        "unitCost": 800000,
        "quantity": 1,
        "totalCost": 800000,
        "imeiList": [],
        "isExistingModel": false
      },
      {
        "id": "line-1790566036909-2",
        "itemName": "samsung A56 6/256GB",
        "brand": "Samsung",
        "model": "samsung A56 6/256GB",
        "category": "Smartphones & Tablets",
        "sku": "SS0139",
        "inventoryItemId": "inv-1790566036910-1",
        "warranty": "1 Year Official",
        "unitCost": 700000,
        "quantity": 2,
        "totalCost": 1400000,
        "imeiList": [],
        "isExistingModel": false
      }
    ],
    "installments": [
      {
        "id": "inst-1790565920093-1",
        "installmentNo": 1,
        "dueDate": "2026-09-28",
        "amount": 212500,
        "isPaid": true,
        "notes": "Installment #1 of 8 • Paid on 2026-09-28",
        "paidDate": "2026-09-28",
        "paidAccountId": "acc-cash-hq"
      },
      {
        "id": "inst-1790565920093-2",
        "installmentNo": 2,
        "dueDate": "2026-09-29",
        "amount": 212500,
        "isPaid": true,
        "notes": "Installment #2 of 8 • Paid on 2026-09-28",
        "paidDate": "2026-09-28",
        "paidAccountId": "acc-cash-hq"
      },
      {
        "id": "inst-1790565920093-3",
        "installmentNo": 3,
        "dueDate": "2026-09-30",
        "amount": 212500,
        "isPaid": true,
        "notes": "Installment #3 of 8 • Paid on 2026-09-28",
        "paidDate": "2026-09-28",
        "paidAccountId": "acc-cash-hq"
      },
      {
        "id": "inst-1790565920093-4",
        "installmentNo": 4,
        "dueDate": "2026-10-01",
        "amount": 212500,
        "isPaid": true,
        "notes": "Installment #4 of 8 • Paid on 2026-09-28",
        "paidDate": "2026-09-28",
        "paidAccountId": "acc-cash-hq"
      },
      {
        "id": "inst-1790565920093-5",
        "installmentNo": 5,
        "dueDate": "2026-10-02",
        "amount": 212500,
        "isPaid": true,
        "notes": "Installment #5 of 8 • Paid on 2026-09-28",
        "paidDate": "2026-09-28",
        "paidAccountId": "acc-cash-hq"
      },
      {
        "id": "inst-1790565920093-6",
        "installmentNo": 6,
        "dueDate": "2026-10-03",
        "amount": 212500,
        "isPaid": true,
        "notes": "Installment #6 of 8 • Paid on 2026-09-28",
        "paidDate": "2026-09-28",
        "paidAccountId": "acc-cash-hq"
      },
      {
        "id": "inst-1790565920093-7",
        "installmentNo": 7,
        "dueDate": "2026-10-04",
        "amount": 212500,
        "isPaid": true,
        "notes": "Installment #7 of 8 • Paid on 2026-09-28",
        "paidDate": "2026-09-28",
        "paidAccountId": "acc-cash-hq"
      },
      {
        "id": "inst-1790565920093-8",
        "installmentNo": 8,
        "dueDate": "2026-10-05",
        "amount": 212500,
        "isPaid": false,
        "notes": "Installment #8 of 8 • Partially paid (12500 Ks) on 2026-09-28 • Partially paid (100000 Ks) on 2026-09-28"
      }
    ],
    "notes": "",
    "paymentHistory": [
      {
        "id": "pay-1790566036909",
        "date": "2026-09-28",
        "amount": 1000000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe (Finance & Policy)",
        "notes": "Initial Down Payment on Purchase",
        "createdAt": "2026-09-28T03:27:16.909Z"
      },
      {
        "id": "pay-1790570891361",
        "date": "2026-09-28",
        "amount": 1500000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe (Finance & Policy)",
        "notes": "Installment #1 Payment",
        "createdAt": "2026-09-28T04:48:11.361Z"
      },
      {
        "id": "pay-1790590206208",
        "date": "2026-09-28",
        "amount": 100000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Daw Su Myat Win",
        "notes": "PO Debt Settlement: 6000005",
        "createdAt": "2026-09-28T10:10:06.208Z"
      }
    ],
    "recordedBy": "Yamin Nwe (Finance & Policy)",
    "createdAt": "2026-09-28T03:27:16.909Z",
    "inventoryItemId": "item-import-1790056543672-129-st3p"
  },
  {
    "id": "po-1790487562323",
    "date": "2026-09-27",
    "invoiceNo": "6000004",
    "supplierName": "UC",
    "supplierPhone": "09456776543",
    "branchId": "branch-sys2",
    "branchName": "System II",
    "itemName": "samsung Flip 7 8/256Gb",
    "brand": "Samsung",
    "model": "samsung Flip 7 8/256Gb",
    "sku": "SS0138",
    "inventoryItemId": "inv-1790391051960",
    "category": "Smartphones & Tablets",
    "warranty": "1 Year Official",
    "unitCost": 3500000,
    "quantity": 3,
    "totalAmount": 10500000,
    "paidAmount": 3000000,
    "remainingDebt": 7500000,
    "paymentStatus": "PARTIAL",
    "paymentMethod": "Cash In Hand (HQ / Main Register)",
    "accountId": "acc-cash-hq",
    "dueDate": "2026-10-07",
    "autoAddToInventory": true,
    "notes": "",
    "paymentHistory": [
      {
        "id": "pay-1790487562324",
        "date": "2026-09-27",
        "amount": 3000000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe (Finance & Policy)",
        "notes": "Initial Down Payment on Purchase",
        "createdAt": "2026-09-27T05:39:22.324Z"
      }
    ],
    "recordedBy": "Yamin Nwe (Finance & Policy)",
    "createdAt": "2026-09-27T05:39:22.324Z"
  },
  {
    "id": "po-1790391051959",
    "date": "2026-09-26",
    "invoiceNo": "6000003",
    "supplierName": "UC",
    "supplierPhone": "09456776543",
    "branchId": "branch-1",
    "branchName": "ရွှေကြယ်တံခွန် (Shop 1)",
    "itemName": "samsung Flip 7 8/256Gb",
    "brand": "Samsung",
    "model": "samsung Flip 7 8/256Gb",
    "sku": "SS0138",
    "inventoryItemId": "inv-1790391051960",
    "category": "Smartphones & Tablets",
    "warranty": "1 Year Official",
    "unitCost": 3500000,
    "quantity": 3,
    "totalAmount": 10500000,
    "paidAmount": 500000,
    "remainingDebt": 10000000,
    "paymentStatus": "PARTIAL",
    "paymentMethod": "Cash In Hand (HQ / Main Register)",
    "dueDate": "2026-10-03",
    "autoAddToInventory": true,
    "imeiList": [
      "3456789876543",
      "34567890987654",
      "456789876543"
    ],
    "serialNumbers": [
      "3456789876543",
      "34567890987654",
      "456789876543"
    ],
    "notes": "",
    "paymentHistory": [
      {
        "id": "pay-1790666932505",
        "date": "2026-09-29",
        "amount": 500000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe (Finance & Policy)",
        "notes": "nnn",
        "createdAt": "2026-09-29T07:28:52.505Z"
      }
    ],
    "recordedBy": "Daw Su Myat Win",
    "createdAt": "2026-09-26T02:50:51.959Z"
  },
  {
    "id": "po-1790243451482",
    "date": "2026-09-24",
    "invoiceNo": "6000002",
    "supplierName": "oppo",
    "supplierPhone": "",
    "branchId": "branch-1",
    "branchName": "ရွှေကြယ်တံခွန် (Shop 1)",
    "itemName": "A6x(4/128) blue",
    "brand": "A6x(4/128)",
    "model": "A6x(4/128) blue",
    "sku": "A6X0001",
    "category": "Smartphones & Tablets",
    "warranty": "1 Year Official",
    "unitCost": 50000,
    "quantity": 5,
    "totalAmount": 250000,
    "paidAmount": 250000,
    "remainingDebt": 0,
    "paymentStatus": "PAID",
    "paymentMethod": "Cash In Hand (HQ / Main Register)",
    "dueDate": "2026-10-01",
    "autoAddToInventory": true,
    "notes": "",
    "paymentHistory": [
      {
        "id": "pay-1790667140465",
        "date": "2026-09-29",
        "amount": 250000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe (Finance & Policy)",
        "notes": "Debt settlement installment",
        "createdAt": "2026-09-29T07:32:20.465Z"
      }
    ],
    "recordedBy": "Yamin Nwe (Finance & Policy)",
    "createdAt": "2026-09-24T09:50:51.482Z"
  },
  {
    "id": "po-1790242401045",
    "date": "2026-09-24",
    "invoiceNo": "6000001",
    "supplierName": "UC",
    "supplierPhone": "09456776543",
    "branchId": "branch-1",
    "branchName": "ရွှေကြယ်တံခွန် (Shop 1)",
    "itemName": "A07(6/128)green",
    "brand": "Samsung",
    "model": "A07(6/128)green",
    "sku": "SS71",
    "inventoryItemId": "item-import-1790056552905-111-t1s1",
    "category": "Smartphones & Tablets",
    "warranty": "1 Year Official",
    "unitCost": 584000,
    "quantity": 15,
    "totalAmount": 8760000,
    "paidAmount": 8760000,
    "remainingDebt": 0,
    "paymentStatus": "PAID",
    "paymentMethod": "Cash In Hand (HQ / Main Register)",
    "dueDate": "2026-10-01",
    "autoAddToInventory": true,
    "notes": "",
    "paymentHistory": [
      {
        "id": "pay-1790666972673",
        "date": "2026-09-29",
        "amount": 760000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe (Finance & Policy)",
        "notes": "k",
        "createdAt": "2026-09-29T07:29:32.673Z"
      },
      {
        "id": "pay-1790667098873",
        "date": "2026-09-29",
        "amount": 8000000,
        "paymentMethod": "Cash In Hand (HQ / Main Register)",
        "accountId": "acc-cash-hq",
        "recordedBy": "Yamin Nwe (Finance & Policy)",
        "notes": "d",
        "createdAt": "2026-09-29T07:31:38.873Z"
      }
    ],
    "recordedBy": "Yamin Nwe (Finance & Policy)",
    "createdAt": "2026-09-24T09:33:21.045Z"
  }
];
