import type { Certificate } from "../types/certificate";

export const certificatesSeed: Certificate[] = [
  {
    id: "CERT-2026-001",
    supplier: "ООО «Боргойский продукт»",
    product: "Боргойская баранина, партия №241",
    issueDate: "2026-04-18",
    status: "Подтвержден",
    blockchain: "0xA71C...91EF",
    hash: "91f5e2c8a7b1...e18f",
    authority: "Лаборатория ветеринарного контроля",
  },
  {
    id: "CERT-2026-002",
    supplier: "КФХ «Степной двор»",
    product: "Боргойская баранина, партия №242",
    issueDate: "2026-04-19",
    status: "На проверке",
    blockchain: "0xB22D...12A0",
    hash: "ab62d4ee93ac...ab19",
    authority: "Региональный центр сертификации",
  },
  {
    id: "CERT-2026-003",
    supplier: "ООО «Мясной стандарт»",
    product: "Боргойская баранина, партия №243",
    issueDate: "2026-04-20",
    status: "Есть расхождения",
    blockchain: "0xF193...77D1",
    hash: "dd22b7f6aa30...91bc",
    authority: "Лаборатория ветеринарного контроля",
  },
];