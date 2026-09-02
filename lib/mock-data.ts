/**
 * ============================================================
 *  PROTOTYPE DATA — every row below is INVENTED.
 *  Nothing here is a real person, a real amount, or a real
 *  transaction. It exists so the screens have something
 *  believable to show before the database is built.
 *
 *  Structure mirrors the agreed Prisma schema, so replacing
 *  this file with real queries later is a swap, not a rewrite.
 * ============================================================
 */

export type Role = "ADMIN" | "COMMITTEE" | "MEMBER" | "AUDITOR";

export type PaymentMethod =
  | "CASH"
  | "UPI_GPAY"
  | "UPI_PHONEPE"
  | "BANK_TRANSFER"
  | "INTERNATIONAL_WIRE";

export type CampaignStatus = "ACTIVE" | "COMPLETED" | "EXPIRED";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "DISBURSED";
export type ProjectStatus = "PLANNED" | "TENDERING" | "IN_PROGRESS" | "COMPLETED";

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI_GPAY: "GPay",
  UPI_PHONEPE: "PhonePe",
  BANK_TRANSFER: "Bank Transfer",
  INTERNATIONAL_WIRE: "Intl. Wire",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  COMMITTEE: "Committee",
  MEMBER: "Member",
  AUDITOR: "Auditor",
};

/* ---------------------------------------------------------- */
/*  MEMBERS                                                    */
/* ---------------------------------------------------------- */

export interface Member {
  id: string;
  memberId: string;
  fullName: string;
  phone: string;
  role: Role;
  isRegistered: boolean;
  joinedYear: number;
  /** Where they actually live — drives the remittance picture. */
  based: "Pewe" | "Guhagar" | "Mumbai" | "Gulf" | "Pune" | "Ratnagiri";
  mohalla: string;
  duesPaid: boolean;
}

export const MEMBERS: Member[] = [
  { id: "m1",  memberId: "PSWS-001", fullName: "Abdul Rafiq Kazi",        phone: "+91 98220 41567", role: "ADMIN",     isRegistered: true,  joinedYear: 2015, based: "Pewe",      mohalla: "Masjid Aali",  duesPaid: true },
  { id: "m2",  memberId: "PSWS-002", fullName: "Ibrahim Yusuf Parkar",    phone: "+91 94235 88210", role: "COMMITTEE", isRegistered: true,  joinedYear: 2015, based: "Pewe",      mohalla: "Bazarpeth",    duesPaid: true },
  { id: "m3",  memberId: "PSWS-003", fullName: "Salim Hamid Mulla",       phone: "+91 90280 33471", role: "COMMITTEE", isRegistered: true,  joinedYear: 2015, based: "Guhagar",   mohalla: "Naka",         duesPaid: true },
  { id: "m4",  memberId: "PSWS-004", fullName: "Anwar Ismail Solkar",     phone: "+971 50 447 2019", role: "COMMITTEE", isRegistered: true, joinedYear: 2015, based: "Gulf",      mohalla: "Varchi Aali",  duesPaid: true },
  { id: "m5",  memberId: "PSWS-005", fullName: "Shakeel Ahmed Bhatkar",   phone: "+91 98679 20114", role: "AUDITOR",   isRegistered: true,  joinedYear: 2016, based: "Mumbai",    mohalla: "Khalchi Aali", duesPaid: true },
  { id: "m6",  memberId: "PSWS-006", fullName: "Mushtaq Ali Dalvi",       phone: "+91 93710 55829", role: "COMMITTEE", isRegistered: true,  joinedYear: 2016, based: "Pewe",      mohalla: "Masjid Aali",  duesPaid: true },
  { id: "m7",  memberId: "PSWS-007", fullName: "Firoz Abdul Jamadar",     phone: "+968 9142 6633",  role: "MEMBER",    isRegistered: true,  joinedYear: 2016, based: "Gulf",      mohalla: "Naka",         duesPaid: true },
  { id: "m8",  memberId: "PSWS-008", fullName: "Rukhsana Salim Kazi",     phone: "+91 88060 74412", role: "COMMITTEE", isRegistered: true,  joinedYear: 2017, based: "Pewe",      mohalla: "Masjid Aali",  duesPaid: true },
  { id: "m9",  memberId: "PSWS-009", fullName: "Javed Iqbal Nakhwa",      phone: "+91 97022 61130", role: "MEMBER",    isRegistered: true,  joinedYear: 2017, based: "Ratnagiri", mohalla: "Bazarpeth",    duesPaid: false },
  { id: "m10", memberId: "PSWS-010", fullName: "Nasir Hussain Tamboli",   phone: "+966 55 812 4470", role: "MEMBER",   isRegistered: true,  joinedYear: 2017, based: "Gulf",      mohalla: "Khalchi Aali", duesPaid: true },
  { id: "m11", memberId: "PSWS-011", fullName: "Zubair Ahmed Bagwan",     phone: "+91 99236 40085", role: "MEMBER",    isRegistered: true,  joinedYear: 2017, based: "Pewe",      mohalla: "Shaikh Wadi",  duesPaid: true },
  { id: "m12", memberId: "PSWS-012", fullName: "Sayyed Arif Hashmi",      phone: "+91 90496 12276", role: "MEMBER",    isRegistered: true,  joinedYear: 2018, based: "Mumbai",    mohalla: "Varchi Aali",  duesPaid: true },
  { id: "m13", memberId: "PSWS-013", fullName: "Fatima Ibrahim Parkar",   phone: "+91 91580 33902", role: "MEMBER",    isRegistered: true,  joinedYear: 2018, based: "Pewe",      mohalla: "Bazarpeth",    duesPaid: true },
  { id: "m14", memberId: "PSWS-014", fullName: "Imran Sadiq Khatib",      phone: "+974 3319 7742",  role: "MEMBER",    isRegistered: true,  joinedYear: 2018, based: "Gulf",      mohalla: "Naka",         duesPaid: true },
  { id: "m15", memberId: "PSWS-015", fullName: "Haroon Rashid Mestry",    phone: "+91 89838 20064", role: "MEMBER",    isRegistered: true,  joinedYear: 2018, based: "Pewe",      mohalla: "Masjid Aali",  duesPaid: false },
  { id: "m16", memberId: "PSWS-016", fullName: "Aslam Yunus Chougule",    phone: "+91 98901 47713", role: "MEMBER",    isRegistered: true,  joinedYear: 2018, based: "Mumbai",    mohalla: "Khalchi Aali", duesPaid: true },
  { id: "m17", memberId: "PSWS-017", fullName: "Zainab Anwar Solkar",     phone: "+971 55 209 8834", role: "MEMBER",   isRegistered: true,  joinedYear: 2019, based: "Gulf",      mohalla: "Varchi Aali",  duesPaid: true },
  { id: "m18", memberId: "PSWS-018", fullName: "Bilal Ahmed Kalsekar",    phone: "+91 70452 91108", role: "MEMBER",    isRegistered: true,  joinedYear: 2019, based: "Pewe",      mohalla: "Shaikh Wadi",  duesPaid: true },
  { id: "m19", memberId: "PSWS-019", fullName: "Sohail Mehmood Desai",    phone: "+91 96199 32450", role: "MEMBER",    isRegistered: true,  joinedYear: 2019, based: "Pune",      mohalla: "Bazarpeth",    duesPaid: true },
  { id: "m20", memberId: "PSWS-020", fullName: "Naseema Haroon Mestry",   phone: "+91 82370 66129", role: "MEMBER",    isRegistered: true,  joinedYear: 2019, based: "Pewe",      mohalla: "Masjid Aali",  duesPaid: true },
  { id: "m21", memberId: "PSWS-021", fullName: "Altaf Kasim Rukadikar",   phone: "+965 6604 2218",  role: "MEMBER",    isRegistered: true,  joinedYear: 2020, based: "Gulf",      mohalla: "Naka",         duesPaid: true },
  { id: "m22", memberId: "PSWS-022", fullName: "Wasim Akram Padwal",      phone: "+91 94044 87301", role: "MEMBER",    isRegistered: true,  joinedYear: 2020, based: "Guhagar",   mohalla: "Bazarpeth",    duesPaid: false },
  { id: "m23", memberId: "PSWS-023", fullName: "Amina Zubair Bagwan",     phone: "+91 90116 45520", role: "MEMBER",    isRegistered: true,  joinedYear: 2020, based: "Pewe",      mohalla: "Shaikh Wadi",  duesPaid: true },
  { id: "m24", memberId: "PSWS-024", fullName: "Sarfaraz Ali Ghadi",      phone: "+91 99674 11238", role: "MEMBER",    isRegistered: true,  joinedYear: 2020, based: "Mumbai",    mohalla: "Khalchi Aali", duesPaid: true },
  { id: "m25", memberId: "PSWS-025", fullName: "Mohsin Rafiq Kazi",       phone: "+971 52 663 4471", role: "MEMBER",   isRegistered: true,  joinedYear: 2021, based: "Gulf",      mohalla: "Masjid Aali",  duesPaid: true },
  { id: "m26", memberId: "PSWS-026", fullName: "Ilyas Abdul Dabholkar",   phone: "+91 88289 50037", role: "MEMBER",    isRegistered: true,  joinedYear: 2021, based: "Pewe",      mohalla: "Varchi Aali",  duesPaid: true },
  { id: "m27", memberId: "PSWS-027", fullName: "Shabana Javed Nakhwa",    phone: "+91 70308 22916", role: "MEMBER",    isRegistered: true,  joinedYear: 2021, based: "Ratnagiri", mohalla: "Bazarpeth",    duesPaid: true },
  { id: "m28", memberId: "PSWS-028", fullName: "Kamran Yusuf Shigwan",    phone: "+91 93262 70884", role: "MEMBER",    isRegistered: true,  joinedYear: 2021, based: "Pewe",      mohalla: "Naka",         duesPaid: false },
  { id: "m29", memberId: "PSWS-029", fullName: "Tanveer Ahmed Kadri",     phone: "+973 3664 1129",  role: "MEMBER",    isRegistered: true,  joinedYear: 2022, based: "Gulf",      mohalla: "Khalchi Aali", duesPaid: true },
  { id: "m30", memberId: "PSWS-030", fullName: "Rehana Aslam Chougule",   phone: "+91 98333 04471", role: "MEMBER",    isRegistered: true,  joinedYear: 2022, based: "Mumbai",    mohalla: "Shaikh Wadi",  duesPaid: true },
  { id: "m31", memberId: "PSWS-031", fullName: "Adnan Firoz Jamadar",     phone: "+91 91750 66280", role: "MEMBER",    isRegistered: true,  joinedYear: 2022, based: "Pewe",      mohalla: "Naka",         duesPaid: true },
  { id: "m32", memberId: "PSWS-032", fullName: "Yasmin Salim Mulla",      phone: "+91 89765 41093", role: "MEMBER",    isRegistered: true,  joinedYear: 2022, based: "Guhagar",   mohalla: "Masjid Aali",  duesPaid: true },
  { id: "m33", memberId: "PSWS-033", fullName: "Rizwan Iqbal Anjarlekar", phone: "+91 97696 23318", role: "MEMBER",    isRegistered: true,  joinedYear: 2023, based: "Mumbai",    mohalla: "Bazarpeth",    duesPaid: true },
  { id: "m34", memberId: "PSWS-034", fullName: "Sakina Bilal Kalsekar",   phone: "+91 70216 88450", role: "MEMBER",    isRegistered: true,  joinedYear: 2023, based: "Pewe",      mohalla: "Shaikh Wadi",  duesPaid: true },
  { id: "m35", memberId: "PSWS-035", fullName: "Naeem Hussain Patvekar",  phone: "+966 53 771 2264", role: "MEMBER",   isRegistered: true,  joinedYear: 2023, based: "Gulf",      mohalla: "Varchi Aali",  duesPaid: true },
  { id: "m36", memberId: "PSWS-036", fullName: "Junaid Arif Sayyed",      phone: "+91 94207 15586", role: "MEMBER",    isRegistered: true,  joinedYear: 2023, based: "Pewe",      mohalla: "Naka",         duesPaid: false },
  { id: "m37", memberId: "PSWS-037", fullName: "Khatija Ilyas Dabholkar", phone: "+91 88883 60217", role: "MEMBER",    isRegistered: true,  joinedYear: 2024, based: "Pewe",      mohalla: "Varchi Aali",  duesPaid: true },
  { id: "m38", memberId: "PSWS-038", fullName: "Ashfaq Nabi Mokashi",     phone: "+91 99209 74403", role: "MEMBER",    isRegistered: true,  joinedYear: 2024, based: "Mumbai",    mohalla: "Khalchi Aali", duesPaid: true },
  { id: "m39", memberId: "PSWS-039", fullName: "Muskan Tanveer Kadri",    phone: "+91 70587 31192", role: "MEMBER",    isRegistered: true,  joinedYear: 2024, based: "Pune",      mohalla: "Bazarpeth",    duesPaid: true },
  { id: "m40", memberId: "PSWS-040", fullName: "Shabbir Ahmed Konkani",   phone: "+971 56 330 7748", role: "MEMBER",   isRegistered: true,  joinedYear: 2024, based: "Gulf",      mohalla: "Masjid Aali",  duesPaid: true },
  { id: "m41", memberId: "PSWS-041", fullName: "Nikhat Sohail Desai",     phone: "+91 96578 20064", role: "MEMBER",    isRegistered: true,  joinedYear: 2025, based: "Pune",      mohalla: "Bazarpeth",    duesPaid: true },
  { id: "m42", memberId: "PSWS-042", fullName: "Mateen Abdul Kharadkar",  phone: "+91 90495 66713", role: "MEMBER",    isRegistered: true,  joinedYear: 2025, based: "Pewe",      mohalla: "Shaikh Wadi",  duesPaid: true },
  { id: "m43", memberId: "PSWS-043", fullName: "Farida Kamran Shigwan",   phone: "+91 82910 45528", role: "MEMBER",    isRegistered: true,  joinedYear: 2025, based: "Pewe",      mohalla: "Naka",         duesPaid: true },
  { id: "m44", memberId: "PSWS-044", fullName: "Rehan Sadiq Khatib",      phone: "+974 5518 2290",  role: "MEMBER",    isRegistered: true,  joinedYear: 2025, based: "Gulf",      mohalla: "Naka",         duesPaid: true },
  { id: "m45", memberId: "PSWS-045", fullName: "Hasina Mushtaq Dalvi",    phone: "+91 93727 80051", role: "MEMBER",    isRegistered: true,  joinedYear: 2026, based: "Pewe",      mohalla: "Masjid Aali",  duesPaid: true },
  { id: "m46", memberId: "PSWS-046", fullName: "Faisal Anwar Solkar",     phone: "+91 98192 33746", role: "MEMBER",    isRegistered: false, joinedYear: 2026, based: "Mumbai",    mohalla: "Varchi Aali",  duesPaid: false },
  { id: "m47", memberId: "PSWS-047", fullName: "Sameena Aslam Bhatkar",   phone: "+91 70669 12238", role: "MEMBER",    isRegistered: false, joinedYear: 2026, based: "Pewe",      mohalla: "Khalchi Aali", duesPaid: false },
  { id: "m48", memberId: "PSWS-048", fullName: "Owais Ibrahim Parkar",    phone: "+91 91367 55024", role: "MEMBER",    isRegistered: false, joinedYear: 2026, based: "Guhagar",   mohalla: "Bazarpeth",    duesPaid: false },
];

/** The roll is larger than the sample loaded into this prototype. */
export const MEMBER_ROLL = {
  total: 152,
  shownInPrototype: MEMBERS.length,
  registered: 147,
  unregistered: 5,
  duesPaidThisYear: 118,
  basedAbroad: 34,
  basedOutOfDistrict: 41,
};

/* ---------------------------------------------------------- */
/*  OFFICE BEARERS                                             */
/* ---------------------------------------------------------- */

export interface OfficeBearer {
  memberId: string;
  name: string;
  post: string;
  postMarathi: string;
  since: number;
}

export const OFFICE_BEARERS: OfficeBearer[] = [
  { memberId: "PSWS-001", name: "Abdul Rafiq Kazi",      post: "President",      postMarathi: "अध्यक्ष",       since: 2015 },
  { memberId: "PSWS-002", name: "Ibrahim Yusuf Parkar",  post: "Vice President", postMarathi: "उपाध्यक्ष",     since: 2019 },
  { memberId: "PSWS-003", name: "Salim Hamid Mulla",     post: "Secretary",      postMarathi: "सचिव",          since: 2015 },
  { memberId: "PSWS-006", name: "Mushtaq Ali Dalvi",     post: "Treasurer",      postMarathi: "खजिनदार",       since: 2021 },
  { memberId: "PSWS-008", name: "Rukhsana Salim Kazi",   post: "Welfare Officer", postMarathi: "कल्याण अधिकारी", since: 2022 },
  { memberId: "PSWS-004", name: "Anwar Ismail Solkar",   post: "Overseas Coordinator", postMarathi: "परदेश समन्वयक", since: 2018 },
  { memberId: "PSWS-005", name: "Shakeel Ahmed Bhatkar", post: "Internal Auditor", postMarathi: "अंतर्गत लेखापरीक्षक", since: 2020 },
];

/* ---------------------------------------------------------- */
/*  CAMPAIGNS  (including FLASH FUNDS — the urgent ones)       */
/* ---------------------------------------------------------- */

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  titleMarathi?: string;
  summary: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  donorCount: number;
  isFlashFund: boolean;
  deadline?: string;
  status: CampaignStatus;
  openedOn: string;
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    slug: "dialysis-support-yusuf-parkar",
    title: "Emergency Dialysis — Yusuf Parkar",
    summary: "Thrice-weekly dialysis at Ratnagiri for a founding member's father. Six months of treatment and transport.",
    description:
      "Yusuf Parkar (78) of Bazarpeth has been advised thrice-weekly dialysis at the district hospital in Ratnagiri, 62 km each way. The family has exhausted its savings on the first two months. The Society is raising six months of treatment cost together with shared transport, so that three other patients from Pewe and Palshet travelling for the same treatment can use the vehicle.",
    targetAmount: 480000,
    raisedAmount: 361500,
    donorCount: 74,
    isFlashFund: true,
    deadline: "2026-09-23",
    status: "ACTIVE",
    openedOn: "2026-08-14",
  },
  {
    id: "c2",
    slug: "monsoon-roof-repair-2026",
    title: "Monsoon Roof Repair — Six Households",
    summary: "Sheeting and rafters for six houses damaged in the August downpour at Khalchi Aali.",
    description:
      "Continuous rain in the second week of August brought down the roof sheeting on six houses in Khalchi Aali and Shaikh Wadi. Four families are presently living with relatives. Material has been quoted by two suppliers in Guhagar; labour is being contributed by village volunteers. Work must finish before the return showers in October.",
    targetAmount: 275000,
    raisedAmount: 275000,
    donorCount: 91,
    isFlashFund: true,
    deadline: "2026-08-28",
    status: "COMPLETED",
    openedOn: "2026-08-12",
  },
  {
    id: "c3",
    slug: "drinking-water-scheme",
    title: "Village Drinking Water Scheme",
    titleMarathi: "गाव पिण्याचे पाणी योजना",
    summary: "Borewell, overhead tank and distribution line to end the March–May water walk.",
    description:
      "Every summer between March and May the two open wells at Pewe fall below draw level and households walk to the Palshet side for drinking water. The Society has surveyed a borewell site behind the Urdu school, and proposes a 20,000-litre overhead tank with a gravity line covering Masjid Aali, Bazarpeth and Naka. Gram Panchayat has agreed to the land; the Society funds the works.",
    targetAmount: 1850000,
    raisedAmount: 1122000,
    donorCount: 138,
    isFlashFund: false,
    status: "ACTIVE",
    openedOn: "2026-04-18",
  },
  {
    id: "c4",
    slug: "masjid-roof-and-minaret",
    title: "Masjid Roof & Minaret Repair",
    summary: "Replacing the temporary sheeting over the prayer hall and restoring the minaret plaster.",
    description:
      "The sheet roof laid over the upper prayer hall in 2021 as a temporary measure has begun leaking at the joints, and salt-laden monsoon wind has stripped plaster from the minaret and the arcade band. The proposal covers new profiled sheeting on treated rafters, re-plastering of the arcade and jali screens, and repainting in the original ochre and cream.",
    targetAmount: 940000,
    raisedAmount: 617500,
    donorCount: 96,
    isFlashFund: false,
    status: "ACTIVE",
    openedOn: "2026-05-02",
  },
  {
    id: "c5",
    slug: "urdu-school-classroom",
    title: "Urdu Primary School — Classroom & Toilet Block",
    summary: "Two rooms and a girls' toilet block so classes 5 to 7 stop sharing one hall.",
    description:
      "The Urdu Primary School runs classes 1 to 7 in three rooms; classes 5, 6 and 7 currently share a single hall with cloth partitions. Attendance among girls falls sharply after class 5 for want of a usable toilet. The Society proposes two classrooms and a four-unit toilet block with a water connection from the new scheme.",
    targetAmount: 1420000,
    raisedAmount: 388000,
    donorCount: 52,
    isFlashFund: false,
    status: "ACTIVE",
    openedOn: "2026-06-11",
  },
  {
    id: "c6",
    slug: "ramzan-ration-1447",
    title: "Ramzan Ration Distribution 1447",
    summary: "Month's dry ration for 84 households across Pewe and three neighbouring wadis.",
    description:
      "The annual Ramzan ration covered 84 households with rice, wheat, dal, oil, sugar, dates and tea for the full month. Lists were verified by the ward representatives and cross-checked against the previous year to avoid duplication. Accounts were placed before the General Body in April.",
    targetAmount: 620000,
    raisedAmount: 668400,
    donorCount: 147,
    isFlashFund: false,
    status: "COMPLETED",
    openedOn: "2026-01-20",
  },
  {
    id: "c7",
    slug: "kabrastan-wall",
    title: "Kabrastan Boundary Wall",
    summary: "Laterite boundary wall and gate on the north and west sides.",
    description:
      "Cattle enter the burial ground from the north side where the wall never existed, and the west face has slumped after the 2025 rains. The proposal is a laterite block wall in the local manner, 340 running feet, with a steel gate matching the masjid compound.",
    targetAmount: 460000,
    raisedAmount: 460000,
    donorCount: 63,
    isFlashFund: false,
    status: "COMPLETED",
    openedOn: "2025-11-08",
  },
];

/* ---------------------------------------------------------- */
/*  DONATIONS LEDGER                                           */
/* ---------------------------------------------------------- */

export interface Donation {
  id: string;
  receiptNo: string;
  donorMemberId: string;
  donorName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  isBackdated: boolean;
  transactionDate: string;
  enteredOn: string;
  campaignSlug?: string;
  enteredBy: string;
}

export const DONATIONS: Donation[] = [
  { id: "d1",  receiptNo: "R-2627-0412", donorMemberId: "PSWS-004", donorName: "Anwar Ismail Solkar",   amount: 185000, paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "ENBD/2608/774120", isBackdated: false, transactionDate: "2026-08-30", enteredOn: "2026-08-31", campaignSlug: "dialysis-support-yusuf-parkar", enteredBy: "PSWS-006" },
  { id: "d2",  receiptNo: "R-2627-0411", donorMemberId: "PSWS-016", donorName: "Aslam Yunus Chougule",  amount: 25000,  paymentMethod: "UPI_GPAY",           transactionRef: "GP2608301142",     isBackdated: false, transactionDate: "2026-08-30", enteredOn: "2026-08-30", campaignSlug: "dialysis-support-yusuf-parkar", enteredBy: "PSWS-006" },
  { id: "d3",  receiptNo: "R-2627-0410", donorMemberId: "PSWS-010", donorName: "Nasir Hussain Tamboli", amount: 92000,  paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "SNB/2608/551903",  isBackdated: false, transactionDate: "2026-08-29", enteredOn: "2026-08-31", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d4",  receiptNo: "R-2627-0409", donorMemberId: "PSWS-011", donorName: "Zubair Ahmed Bagwan",   amount: 5100,   paymentMethod: "CASH",                                                  isBackdated: false, transactionDate: "2026-08-28", enteredOn: "2026-08-28", campaignSlug: "dialysis-support-yusuf-parkar", enteredBy: "PSWS-008" },
  { id: "d5",  receiptNo: "R-2627-0408", donorMemberId: "PSWS-024", donorName: "Sarfaraz Ali Ghadi",    amount: 31000,  paymentMethod: "UPI_PHONEPE",        transactionRef: "PP26082874410",    isBackdated: false, transactionDate: "2026-08-28", enteredOn: "2026-08-28", campaignSlug: "masjid-roof-and-minaret",       enteredBy: "PSWS-006" },
  { id: "d6",  receiptNo: "R-2627-0407", donorMemberId: "PSWS-025", donorName: "Mohsin Rafiq Kazi",     amount: 140000, paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "ADCB/2608/220914", isBackdated: false, transactionDate: "2026-08-26", enteredOn: "2026-08-27", campaignSlug: "masjid-roof-and-minaret",       enteredBy: "PSWS-006" },
  { id: "d7",  receiptNo: "R-2627-0406", donorMemberId: "PSWS-002", donorName: "Ibrahim Yusuf Parkar",  amount: 21000,  paymentMethod: "BANK_TRANSFER",      transactionRef: "NEFT/BOM/8841207", isBackdated: false, transactionDate: "2026-08-25", enteredOn: "2026-08-25", campaignSlug: "urdu-school-classroom",         enteredBy: "PSWS-006" },
  { id: "d8",  receiptNo: "R-2627-0405", donorMemberId: "PSWS-021", donorName: "Altaf Kasim Rukadikar", amount: 76000,  paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "NBK/2608/119237",  isBackdated: false, transactionDate: "2026-08-24", enteredOn: "2026-08-27", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d9",  receiptNo: "R-2627-0404", donorMemberId: "PSWS-013", donorName: "Fatima Ibrahim Parkar", amount: 3100,   paymentMethod: "CASH",                                                  isBackdated: false, transactionDate: "2026-08-23", enteredOn: "2026-08-23", campaignSlug: "monsoon-roof-repair-2026",      enteredBy: "PSWS-008" },
  { id: "d10", receiptNo: "R-2627-0403", donorMemberId: "PSWS-033", donorName: "Rizwan Iqbal Anjarlekar", amount: 51000, paymentMethod: "UPI_GPAY",          transactionRef: "GP2608220087",     isBackdated: false, transactionDate: "2026-08-22", enteredOn: "2026-08-22", campaignSlug: "monsoon-roof-repair-2026",      enteredBy: "PSWS-006" },
  { id: "d11", receiptNo: "R-2627-0402", donorMemberId: "PSWS-029", donorName: "Tanveer Ahmed Kadri",   amount: 64000,  paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "BBK/2608/440172",  isBackdated: false, transactionDate: "2026-08-21", enteredOn: "2026-08-24", campaignSlug: "monsoon-roof-repair-2026",      enteredBy: "PSWS-006" },
  { id: "d12", receiptNo: "R-2627-0401", donorMemberId: "PSWS-005", donorName: "Shakeel Ahmed Bhatkar", amount: 41000,  paymentMethod: "BANK_TRANSFER",      transactionRef: "IMPS/622708441",   isBackdated: false, transactionDate: "2026-08-20", enteredOn: "2026-08-20", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d13", receiptNo: "R-2627-0400", donorMemberId: "PSWS-007", donorName: "Firoz Abdul Jamadar",   amount: 58000,  paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "BM/2608/330556",   isBackdated: true,  transactionDate: "2026-07-29", enteredOn: "2026-08-19", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d14", receiptNo: "R-2627-0399", donorMemberId: "PSWS-018", donorName: "Bilal Ahmed Kalsekar",  amount: 2100,   paymentMethod: "UPI_PHONEPE",        transactionRef: "PP26081833029",    isBackdated: false, transactionDate: "2026-08-18", enteredOn: "2026-08-18", campaignSlug: "masjid-roof-and-minaret",       enteredBy: "PSWS-008" },
  { id: "d15", receiptNo: "R-2627-0398", donorMemberId: "PSWS-040", donorName: "Shabbir Ahmed Konkani", amount: 118000, paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "MASH/2608/771204", isBackdated: false, transactionDate: "2026-08-17", enteredOn: "2026-08-19", campaignSlug: "urdu-school-classroom",         enteredBy: "PSWS-006" },
  { id: "d16", receiptNo: "R-2627-0397", donorMemberId: "PSWS-030", donorName: "Rehana Aslam Chougule", amount: 11000,  paymentMethod: "UPI_GPAY",           transactionRef: "GP2608169920",     isBackdated: false, transactionDate: "2026-08-16", enteredOn: "2026-08-16", campaignSlug: "urdu-school-classroom",         enteredBy: "PSWS-006" },
  { id: "d17", receiptNo: "R-2627-0396", donorMemberId: "PSWS-035", donorName: "Naeem Hussain Patvekar", amount: 87000, paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "RJHI/2608/665301", isBackdated: false, transactionDate: "2026-08-15", enteredOn: "2026-08-17", campaignSlug: "monsoon-roof-repair-2026",      enteredBy: "PSWS-006" },
  { id: "d18", receiptNo: "R-2627-0395", donorMemberId: "PSWS-038", donorName: "Ashfaq Nabi Mokashi",   amount: 15000,  paymentMethod: "BANK_TRANSFER",      transactionRef: "NEFT/BOM/8829114", isBackdated: false, transactionDate: "2026-08-14", enteredOn: "2026-08-14", campaignSlug: "dialysis-support-yusuf-parkar", enteredBy: "PSWS-006" },
  { id: "d19", receiptNo: "R-2627-0394", donorMemberId: "PSWS-014", donorName: "Imran Sadiq Khatib",    amount: 44000,  paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "QNB/2608/118840",  isBackdated: false, transactionDate: "2026-08-12", enteredOn: "2026-08-14", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d20", receiptNo: "R-2627-0393", donorMemberId: "PSWS-045", donorName: "Hasina Mushtaq Dalvi",  amount: 1100,   paymentMethod: "CASH",                                                  isBackdated: false, transactionDate: "2026-08-11", enteredOn: "2026-08-11", campaignSlug: "masjid-roof-and-minaret",       enteredBy: "PSWS-008" },
  { id: "d21", receiptNo: "R-2627-0392", donorMemberId: "PSWS-017", donorName: "Zainab Anwar Solkar",   amount: 66000,  paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "ENBD/2608/330218", isBackdated: false, transactionDate: "2026-08-09", enteredOn: "2026-08-12", campaignSlug: "urdu-school-classroom",         enteredBy: "PSWS-006" },
  { id: "d22", receiptNo: "R-2627-0391", donorMemberId: "PSWS-019", donorName: "Sohail Mehmood Desai",  amount: 21000,  paymentMethod: "UPI_GPAY",           transactionRef: "GP2608074471",     isBackdated: false, transactionDate: "2026-08-07", enteredOn: "2026-08-07", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d23", receiptNo: "R-2627-0390", donorMemberId: "PSWS-044", donorName: "Rehan Sadiq Khatib",    amount: 39000,  paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "QIB/2608/990174",  isBackdated: false, transactionDate: "2026-08-05", enteredOn: "2026-08-08", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d24", receiptNo: "R-2627-0389", donorMemberId: "PSWS-026", donorName: "Ilyas Abdul Dabholkar", amount: 7500,   paymentMethod: "UPI_PHONEPE",        transactionRef: "PP26080411208",    isBackdated: false, transactionDate: "2026-08-04", enteredOn: "2026-08-04", campaignSlug: "masjid-roof-and-minaret",       enteredBy: "PSWS-008" },
  { id: "d25", receiptNo: "R-2627-0388", donorMemberId: "PSWS-001", donorName: "Abdul Rafiq Kazi",      amount: 51000,  paymentMethod: "BANK_TRANSFER",      transactionRef: "NEFT/BOM/8801552", isBackdated: false, transactionDate: "2026-08-02", enteredOn: "2026-08-02", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d26", receiptNo: "R-2627-0387", donorMemberId: "PSWS-012", donorName: "Sayyed Arif Hashmi",    amount: 18000,  paymentMethod: "UPI_GPAY",           transactionRef: "GP2607310092",     isBackdated: false, transactionDate: "2026-07-31", enteredOn: "2026-07-31", campaignSlug: "masjid-roof-and-minaret",       enteredBy: "PSWS-006" },
  { id: "d27", receiptNo: "R-2627-0386", donorMemberId: "PSWS-003", donorName: "Salim Hamid Mulla",     amount: 25000,  paymentMethod: "CASH",                                                  isBackdated: true,  transactionDate: "2026-06-19", enteredOn: "2026-07-28", campaignSlug: "urdu-school-classroom",         enteredBy: "PSWS-008" },
  { id: "d28", receiptNo: "R-2627-0385", donorMemberId: "PSWS-029", donorName: "Tanveer Ahmed Kadri",   amount: 71000,  paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "BBK/2607/220913",  isBackdated: false, transactionDate: "2026-07-26", enteredOn: "2026-07-29", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
  { id: "d29", receiptNo: "R-2627-0384", donorMemberId: "PSWS-032", donorName: "Yasmin Salim Mulla",    amount: 5100,   paymentMethod: "UPI_PHONEPE",        transactionRef: "PP26072266014",    isBackdated: false, transactionDate: "2026-07-22", enteredOn: "2026-07-22", campaignSlug: "masjid-roof-and-minaret",       enteredBy: "PSWS-008" },
  { id: "d30", receiptNo: "R-2627-0383", donorMemberId: "PSWS-004", donorName: "Anwar Ismail Solkar",   amount: 210000, paymentMethod: "INTERNATIONAL_WIRE", transactionRef: "ENBD/2607/118203", isBackdated: false, transactionDate: "2026-07-18", enteredOn: "2026-07-20", campaignSlug: "drinking-water-scheme",         enteredBy: "PSWS-006" },
];

/** The ledger continues beyond the sample loaded here. */
export const DONATION_ROLL = {
  entriesThisYear: 412,
  shownInPrototype: DONATIONS.length,
  backdatedPending: 2,
};

/* ---------------------------------------------------------- */
/*  PROJECTS & QUOTATIONS  (the procurement trail)             */
/* ---------------------------------------------------------- */

export interface Quotation {
  id: string;
  vendorName: string;
  vendorPlace: string;
  amount: number;
  documentName: string;
  receivedOn: string;
  isSelected: boolean;
  uploadedByMemberId: string;
  note?: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  titleMarathi?: string;
  description: string;
  budget: number;
  spent: number;
  status: ProjectStatus;
  startedOn: string;
  targetCompletion?: string;
  leadMemberId: string;
  fundedByCampaign?: string;
  quotations: Quotation[];
  milestones: { label: string; date?: string; done: boolean }[];
}

export const PROJECTS: Project[] = [
  {
    id: "p1",
    slug: "drinking-water-scheme",
    title: "Village Drinking Water Scheme",
    titleMarathi: "गाव पिण्याचे पाणी योजना",
    description:
      "Borewell behind the Urdu school, a 20,000-litre overhead tank, and a gravity distribution line covering Masjid Aali, Bazarpeth and Naka. Land cleared by Gram Panchayat resolution dated 12 May 2026.",
    budget: 1850000,
    spent: 742000,
    status: "IN_PROGRESS",
    startedOn: "2026-05-20",
    targetCompletion: "2027-02-28",
    leadMemberId: "PSWS-002",
    fundedByCampaign: "drinking-water-scheme",
    quotations: [
      { id: "q1", vendorName: "Sahyadri Borewells",       vendorPlace: "Chiplun",   amount: 1795000, documentName: "sahyadri-borewells-quote.pdf",  receivedOn: "2026-05-04", isSelected: true,  uploadedByMemberId: "PSWS-002", note: "Lowest of three. Agreed to stage payment against milestones." },
      { id: "q2", vendorName: "Konkan Aqua Works",        vendorPlace: "Ratnagiri", amount: 1912000, documentName: "konkan-aqua-quote.pdf",         receivedOn: "2026-05-06", isSelected: false, uploadedByMemberId: "PSWS-002" },
      { id: "q3", vendorName: "Vishwas Drilling & Pipes", vendorPlace: "Guhagar",   amount: 2040000, documentName: "vishwas-drilling-quote.pdf",    receivedOn: "2026-05-07", isSelected: false, uploadedByMemberId: "PSWS-006", note: "Includes 2-year AMC; committee felt AMC could be tendered separately." },
    ],
    milestones: [
      { label: "Site survey & water table test", date: "2026-05-24", done: true },
      { label: "Borewell drilled to 210 ft",     date: "2026-06-30", done: true },
      { label: "Tank foundation cast",            date: "2026-08-16", done: true },
      { label: "Overhead tank erected",           date: "2026-10-15", done: false },
      { label: "Distribution line laid",          date: "2026-12-20", done: false },
      { label: "Handover to Gram Panchayat",      date: "2027-02-28", done: false },
    ],
  },
  {
    id: "p2",
    slug: "masjid-roof-and-minaret",
    title: "Masjid Roof & Minaret Repair",
    description:
      "New profiled sheeting on treated rafters over the upper prayer hall, re-plastering of the arcade band and jali screens, and repainting in the original ochre and cream.",
    budget: 940000,
    spent: 168000,
    status: "TENDERING",
    startedOn: "2026-07-01",
    targetCompletion: "2027-01-31",
    leadMemberId: "PSWS-006",
    fundedByCampaign: "masjid-roof-and-minaret",
    quotations: [
      { id: "q4", vendorName: "Rajapur Roofing Co.",   vendorPlace: "Rajapur",  amount: 905000,  documentName: "rajapur-roofing-quote.pdf",  receivedOn: "2026-08-02", isSelected: false, uploadedByMemberId: "PSWS-006" },
      { id: "q5", vendorName: "M. A. Mestry & Sons",   vendorPlace: "Guhagar",  amount: 928000,  documentName: "ma-mestry-quote.pdf",        receivedOn: "2026-08-09", isSelected: false, uploadedByMemberId: "PSWS-015", note: "Local firm. Has done the compound wall in 2019 to satisfaction." },
      { id: "q6", vendorName: "Deccan Fabricators",    vendorPlace: "Chiplun",  amount: 1010000, documentName: "deccan-fabricators-quote.pdf", receivedOn: "2026-08-21", isSelected: false, uploadedByMemberId: "PSWS-006" },
    ],
    milestones: [
      { label: "Condition survey by engineer", date: "2026-07-14", done: true },
      { label: "Scaffolding erected",           date: "2026-08-20", done: true },
      { label: "Quotations opened",             date: "2026-09-08", done: false },
      { label: "Vendor selected",               done: false },
      { label: "Sheeting replaced",             done: false },
      { label: "Plaster & paint complete",      done: false },
    ],
  },
  {
    id: "p3",
    slug: "urdu-school-classroom",
    title: "Urdu Primary School — Classroom & Toilet Block",
    description:
      "Two classrooms and a four-unit girls' toilet block, with a water connection taken from the new village scheme.",
    budget: 1420000,
    spent: 0,
    status: "PLANNED",
    startedOn: "2026-06-11",
    targetCompletion: "2027-06-30",
    leadMemberId: "PSWS-008",
    fundedByCampaign: "urdu-school-classroom",
    quotations: [
      { id: "q7", vendorName: "Guhagar Construction",  vendorPlace: "Guhagar", amount: 1385000, documentName: "guhagar-construction-quote.pdf", receivedOn: "2026-08-25", isSelected: false, uploadedByMemberId: "PSWS-008" },
    ],
    milestones: [
      { label: "School committee approval",  date: "2026-06-28", done: true },
      { label: "Plan drawn & measured",      date: "2026-08-10", done: true },
      { label: "Third quotation awaited",    done: false },
      { label: "Foundation",                  done: false },
    ],
  },
  {
    id: "p4",
    slug: "kabrastan-wall",
    title: "Kabrastan Boundary Wall",
    description:
      "340 running feet of laterite block wall on the north and west sides, with a steel gate matching the masjid compound.",
    budget: 460000,
    spent: 447200,
    status: "COMPLETED",
    startedOn: "2025-12-02",
    targetCompletion: "2026-04-30",
    leadMemberId: "PSWS-003",
    fundedByCampaign: "kabrastan-wall",
    quotations: [
      { id: "q8",  vendorName: "M. A. Mestry & Sons",  vendorPlace: "Guhagar",  amount: 452000, documentName: "ma-mestry-kabrastan.pdf",  receivedOn: "2025-11-18", isSelected: true,  uploadedByMemberId: "PSWS-003" },
      { id: "q9",  vendorName: "Palshet Laterite",     vendorPlace: "Palshet",  amount: 468000, documentName: "palshet-laterite.pdf",     receivedOn: "2025-11-20", isSelected: false, uploadedByMemberId: "PSWS-003" },
      { id: "q10", vendorName: "Deccan Fabricators",   vendorPlace: "Chiplun",  amount: 511000, documentName: "deccan-kabrastan.pdf",     receivedOn: "2025-11-22", isSelected: false, uploadedByMemberId: "PSWS-006" },
    ],
    milestones: [
      { label: "Boundary re-measured with Talathi", date: "2025-12-10", done: true },
      { label: "North face built",                   date: "2026-02-14", done: true },
      { label: "West face rebuilt",                  date: "2026-03-28", done: true },
      { label: "Gate fitted & accounts closed",      date: "2026-04-22", done: true },
    ],
  },
  {
    id: "p5",
    slug: "solar-street-lights",
    title: "Solar Street Lights — Pewe to Guhagar Road",
    description:
      "Eighteen solar street lights along the 2.4 km stretch between the village and the Guhagar road junction, unlit since the line was cut in 2024.",
    budget: 630000,
    spent: 0,
    status: "PLANNED",
    startedOn: "2026-08-20",
    targetCompletion: "2027-03-31",
    leadMemberId: "PSWS-011",
    quotations: [],
    milestones: [
      { label: "Pole positions marked", done: false },
      { label: "Quotations invited",    done: false },
    ],
  },
  {
    id: "p6",
    slug: "patient-transport-vehicle",
    title: "Patient Transport Vehicle",
    description:
      "A shared vehicle for the Ratnagiri and Chiplun hospital runs, presently arranged privately at high cost by each family.",
    budget: 1150000,
    spent: 0,
    status: "PLANNED",
    startedOn: "2026-08-28",
    leadMemberId: "PSWS-004",
    quotations: [],
    milestones: [
      { label: "Usage survey among households", done: false },
      { label: "Running-cost model to committee", done: false },
    ],
  },
];

/* ---------------------------------------------------------- */
/*  ZAKAT & WELFARE REQUESTS                                   */
/* ---------------------------------------------------------- */

export const ZAKAT_CATEGORIES = [
  { key: "MEDICAL",  label: "Medical",         note: "Treatment, surgery, medicines, hospital travel" },
  { key: "STIPEND",  label: "Monthly Stipend", note: "Widows, elderly without support, disabled members" },
  { key: "SCHOOL",   label: "School Fees",     note: "Fees, uniforms, books, hostel for classes 1–12" },
  { key: "EMERGENCY", label: "Emergency",      note: "Fire, house collapse, sudden loss of earner" },
] as const;

export interface ZakatRequest {
  id: string;
  reference: string;
  applicantName: string;
  applicantMemberId?: string;
  mohalla: string;
  category: "MEDICAL" | "STIPEND" | "SCHOOL" | "EMERGENCY";
  amount: number;
  details: string;
  status: RequestStatus;
  approverMemberId?: string;
  submittedOn: string;
  decidedOn?: string;
  disbursedOn?: string;
  isRecurring?: boolean;
}

export const ZAKAT_REQUESTS: ZakatRequest[] = [
  { id: "z1",  reference: "ZR-2627-061", applicantName: "Sakina Yusuf Parkar",  mohalla: "Bazarpeth",    category: "MEDICAL",   amount: 68000, details: "Six months of dialysis transport share and medicines, in addition to the flash fund.", status: "PENDING",   submittedOn: "2026-08-29" },
  { id: "z2",  reference: "ZR-2627-060", applicantName: "Hamida Bi Shigwan",    mohalla: "Naka",         category: "STIPEND",   amount: 4000,  details: "Monthly stipend, widow, no earning member in household. Renewal of existing sanction.", status: "PENDING",   submittedOn: "2026-08-27", isRecurring: true },
  { id: "z3",  reference: "ZR-2627-059", applicantName: "Arshad Ilyas Kalsekar", mohalla: "Shaikh Wadi", category: "SCHOOL",    amount: 32000, details: "Class 11 science, junior college at Chiplun — fees and hostel for one term.", status: "PENDING",   submittedOn: "2026-08-26" },
  { id: "z4",  reference: "ZR-2627-058", applicantName: "Rashid Anwar Ghadi",   mohalla: "Khalchi Aali", category: "EMERGENCY", amount: 55000, details: "Kitchen roof collapsed in the August rain; family of six shifted to relative's house.", status: "APPROVED",  approverMemberId: "PSWS-008", submittedOn: "2026-08-18", decidedOn: "2026-08-21" },
  { id: "z5",  reference: "ZR-2627-057", applicantName: "Noorjahan Kadri",      mohalla: "Masjid Aali",  category: "MEDICAL",   amount: 24000, details: "Cataract surgery, both eyes, at the Ratnagiri eye camp with follow-up.", status: "DISBURSED", approverMemberId: "PSWS-008", submittedOn: "2026-08-10", decidedOn: "2026-08-13", disbursedOn: "2026-08-16" },
  { id: "z6",  reference: "ZR-2627-056", applicantName: "Ayesha Mohsin Dalvi",  mohalla: "Masjid Aali",  category: "SCHOOL",    amount: 18500, details: "Class 9 and class 7 — two children, fees, uniforms and books for the year.", status: "DISBURSED", approverMemberId: "PSWS-003", submittedOn: "2026-07-28", decidedOn: "2026-08-01", disbursedOn: "2026-08-05" },
  { id: "z7",  reference: "ZR-2627-055", applicantName: "Ismail Bapu Padwal",   mohalla: "Bazarpeth",    category: "STIPEND",   amount: 3500,  details: "Monthly stipend, 81 years, unable to work since stroke in 2024.", status: "DISBURSED", approverMemberId: "PSWS-008", submittedOn: "2026-07-20", decidedOn: "2026-07-23", disbursedOn: "2026-07-26", isRecurring: true },
  { id: "z8",  reference: "ZR-2627-054", applicantName: "Salma Rafiq Nakhwa",   mohalla: "Naka",         category: "MEDICAL",   amount: 145000, details: "Cardiac procedure advised at Pune. Requested full cost.", status: "REJECTED", approverMemberId: "PSWS-001", submittedOn: "2026-07-14", decidedOn: "2026-07-22" },
  { id: "z9",  reference: "ZR-2627-053", applicantName: "Junaid Aslam Bagwan",  mohalla: "Shaikh Wadi",  category: "SCHOOL",    amount: 26000, details: "ITI admission at Ratnagiri — first-year fee and tool kit.", status: "DISBURSED", approverMemberId: "PSWS-003", submittedOn: "2026-07-02", decidedOn: "2026-07-06", disbursedOn: "2026-07-10" },
  { id: "z10", reference: "ZR-2627-052", applicantName: "Zarina Bi Mokashi",    mohalla: "Varchi Aali",  category: "STIPEND",   amount: 4000,  details: "Monthly stipend, widow with two school-going children.", status: "DISBURSED", approverMemberId: "PSWS-008", submittedOn: "2026-06-24", decidedOn: "2026-06-27", disbursedOn: "2026-07-01", isRecurring: true },
  { id: "z11", reference: "ZR-2627-051", applicantName: "Abdul Latif Sutar",    mohalla: "Khalchi Aali", category: "EMERGENCY", amount: 40000, details: "Fishing boat engine seized; sole source of income for the household.", status: "APPROVED", approverMemberId: "PSWS-001", submittedOn: "2026-06-18", decidedOn: "2026-06-25" },
  { id: "z12", reference: "ZR-2627-050", applicantName: "Rukaiya Sayyed",       mohalla: "Bazarpeth",    category: "MEDICAL",   amount: 31000, details: "Delivery complications, private hospital at Guhagar, balance after insurance.", status: "DISBURSED", approverMemberId: "PSWS-008", submittedOn: "2026-06-05", decidedOn: "2026-06-08", disbursedOn: "2026-06-11" },
];

export const ZAKAT_SUMMARY = {
  requestsThisYear: 61,
  shownInPrototype: ZAKAT_REQUESTS.length,
  disbursedThisYear: 1284500,
  householdsHelped: 43,
  recurringStipends: 14,
  monthlyStipendOutgo: 51500,
  averageDecisionDays: 4.6,
};

/* ---------------------------------------------------------- */
/*  MEMBER SCORECARDS                                          */
/* ---------------------------------------------------------- */

export interface MemberScore {
  memberId: string;
  name: string;
  post?: string;
  year: number;
  tasksAssigned: number;
  tasksCompleted: number;
  avgExecutionDays: number;
  meetingsAttended: number;
  meetingsHeld: number;
  overallScore: number;
}

export const SCORECARDS: MemberScore[] = [
  { memberId: "PSWS-006", name: "Mushtaq Ali Dalvi",     post: "Treasurer",            year: 2026, tasksAssigned: 34, tasksCompleted: 33, avgExecutionDays: 2.1, meetingsAttended: 11, meetingsHeld: 11, overallScore: 96 },
  { memberId: "PSWS-008", name: "Rukhsana Salim Kazi",   post: "Welfare Officer",      year: 2026, tasksAssigned: 41, tasksCompleted: 39, avgExecutionDays: 2.8, meetingsAttended: 11, meetingsHeld: 11, overallScore: 94 },
  { memberId: "PSWS-002", name: "Ibrahim Yusuf Parkar",  post: "Vice President",       year: 2026, tasksAssigned: 27, tasksCompleted: 25, avgExecutionDays: 3.4, meetingsAttended: 10, meetingsHeld: 11, overallScore: 89 },
  { memberId: "PSWS-003", name: "Salim Hamid Mulla",     post: "Secretary",            year: 2026, tasksAssigned: 38, tasksCompleted: 34, avgExecutionDays: 4.0, meetingsAttended: 11, meetingsHeld: 11, overallScore: 88 },
  { memberId: "PSWS-001", name: "Abdul Rafiq Kazi",      post: "President",            year: 2026, tasksAssigned: 22, tasksCompleted: 20, avgExecutionDays: 3.9, meetingsAttended: 11, meetingsHeld: 11, overallScore: 87 },
  { memberId: "PSWS-004", name: "Anwar Ismail Solkar",   post: "Overseas Coordinator", year: 2026, tasksAssigned: 19, tasksCompleted: 17, avgExecutionDays: 5.2, meetingsAttended: 8,  meetingsHeld: 11, overallScore: 81 },
  { memberId: "PSWS-011", name: "Zubair Ahmed Bagwan",                                 year: 2026, tasksAssigned: 16, tasksCompleted: 13, avgExecutionDays: 6.1, meetingsAttended: 9,  meetingsHeld: 11, overallScore: 74 },
  { memberId: "PSWS-005", name: "Shakeel Ahmed Bhatkar", post: "Internal Auditor",     year: 2026, tasksAssigned: 12, tasksCompleted: 9,  avgExecutionDays: 7.5, meetingsAttended: 7,  meetingsHeld: 11, overallScore: 68 },
  { memberId: "PSWS-015", name: "Haroon Rashid Mestry",                                year: 2026, tasksAssigned: 14, tasksCompleted: 9,  avgExecutionDays: 8.8, meetingsAttended: 6,  meetingsHeld: 11, overallScore: 61 },
  { memberId: "PSWS-022", name: "Wasim Akram Padwal",                                  year: 2026, tasksAssigned: 11, tasksCompleted: 6,  avgExecutionDays: 11.2, meetingsAttended: 4, meetingsHeld: 11, overallScore: 48 },
];

/* ---------------------------------------------------------- */
/*  ANNOUNCEMENTS / NOTICE BOARD                               */
/* ---------------------------------------------------------- */

export interface Announcement {
  id: string;
  title: string;
  titleMarathi?: string;
  body: string;
  isNotice: boolean;
  postedOn: string;
  pinned?: boolean;
}

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "a1", title: "Annual General Body Meeting — 27 September 2026", titleMarathi: "वार्षिक सर्वसाधारण सभा",
    body: "The Annual General Body Meeting will be held at the Masjid hall on Sunday, 27 September 2026 at 10:00 a.m. Audited accounts for 2025–26, the water scheme progress report and election of two committee posts are on the agenda. Members abroad may join by telephone; the number will be circulated on the members' group two days prior.",
    isNotice: true, postedOn: "2026-08-31", pinned: true },
  { id: "a2", title: "Quotations for Masjid Roof to be Opened on 8 September",
    body: "Three quotations received for the roof and minaret work will be opened before the committee at 6:00 p.m. on 8 September. Any member may attend as an observer. The comparison sheet will be published on this board within two days of the opening.",
    isNotice: true, postedOn: "2026-08-28", pinned: true },
  { id: "a3", title: "Water Scheme — Tank Foundation Cast",
    body: "The foundation for the 20,000-litre overhead tank behind the Urdu school was cast on 16 August and has been left to cure. Erection of the tank is scheduled for October, after the heavy rain has passed. Photographs and the measurement book entry are with the Secretary.",
    isNotice: false, postedOn: "2026-08-19" },
  { id: "a4", title: "Zakat Applications for the Coming Year",
    body: "Applications under Medical, Monthly Stipend, School Fees and Emergency heads may be submitted to the Welfare Officer or to any ward representative. Applications are placed before the committee every second Friday. Existing stipend sanctions must be renewed once each year with a fresh declaration.",
    isNotice: true, postedOn: "2026-08-11" },
  { id: "a5", title: "Roof Repair Work Completed for Six Households",
    body: "Sheeting and rafters have been replaced for all six households in Khalchi Aali and Shaikh Wadi affected by the August rain. The campaign closed on 28 August having met its target; the small surplus has been carried to the general relief head with the committee's approval.",
    isNotice: false, postedOn: "2026-08-29" },
  { id: "a6", title: "Membership Renewal for 2026–27",
    body: "Annual membership dues of ₹1,200 for the year 2026–27 may be paid in cash to the Treasurer, by GPay or PhonePe to the Society number, or by bank transfer. Members abroad may remit along with their next contribution and note the purpose. 118 of 152 members have paid to date.",
    isNotice: true, postedOn: "2026-07-30" },
  { id: "a7", title: "Audited Accounts 2025–26 Filed with the Charity Commissioner",
    body: "The audited statement of accounts for 2025–26 was filed with the office of the Charity Commissioner, Ratnagiri, on 12 July 2026. Copies are available with the Secretary for inspection by any member on request.",
    isNotice: false, postedOn: "2026-07-14" },
];

/* ---------------------------------------------------------- */
/*  SPONSORS                                                   */
/* ---------------------------------------------------------- */

export interface Sponsor {
  id: string;
  businessName: string;
  proprietor: string;
  category: string;
  place: string;
  contactPhone: string;
  supportSince: number;
  isActive: boolean;
}

export const SPONSORS: Sponsor[] = [
  { id: "s1", businessName: "Guhagar Hardware & Cement",  proprietor: "Ibrahim Y. Parkar",   category: "Building material", place: "Guhagar",   contactPhone: "+91 94235 88210", supportSince: 2017, isActive: true },
  { id: "s2", businessName: "Al-Noor Trading LLC",        proprietor: "Anwar I. Solkar",     category: "General trading",   place: "Dubai, UAE", contactPhone: "+971 50 447 2019", supportSince: 2018, isActive: true },
  { id: "s3", businessName: "Konkan Agro Supplies",       proprietor: "Zubair A. Bagwan",    category: "Agriculture",       place: "Pewe",      contactPhone: "+91 99236 40085", supportSince: 2019, isActive: true },
  { id: "s4", businessName: "Bismillah Medical Stores",   proprietor: "Ilyas A. Dabholkar",  category: "Pharmacy",          place: "Guhagar",   contactPhone: "+91 88289 50037", supportSince: 2020, isActive: true },
  { id: "s5", businessName: "Sagar Bakery & Sweet Mart",  proprietor: "Kamran Y. Shigwan",   category: "Bakery",            place: "Guhagar",   contactPhone: "+91 93262 70884", supportSince: 2022, isActive: true },
  { id: "s6", businessName: "Ratnagiri Tyre House",       proprietor: "Sarfaraz A. Ghadi",   category: "Automotive",        place: "Ratnagiri", contactPhone: "+91 99674 11238", supportSince: 2023, isActive: false },
];

/* ---------------------------------------------------------- */
/*  DERIVED TOTALS — computed, so every screen agrees          */
/* ---------------------------------------------------------- */

export const TREASURY = {
  /** Full-year figures; the DONATIONS array above is a recent sample. */
  receiptsThisYear: 8642000,
  disbursementsThisYear: 5978000,
  get balance() { return this.receiptsThisYear - this.disbursementsThisYear; },
  openingBalance: 1240000,
  zakatHead: 1284500,
  projectHead: 3357200,
  reliefHead: 1336300,
};

export const RECEIPTS_BY_METHOD: { method: PaymentMethod; amount: number; count: number }[] = [
  { method: "INTERNATIONAL_WIRE", amount: 4128000, count: 74 },
  { method: "BANK_TRANSFER",      amount: 1876000, count: 88 },
  { method: "UPI_GPAY",           amount: 1204000, count: 121 },
  { method: "UPI_PHONEPE",        amount: 812000,  count: 96 },
  { method: "CASH",               amount: 622000,  count: 33 },
];

export const MONTHLY_RECEIPTS: { month: string; amount: number }[] = [
  { month: "Apr", amount: 921000 },
  { month: "May", amount: 1104000 },
  { month: "Jun", amount: 876000 },
  { month: "Jul", amount: 1612000 },
  { month: "Aug", amount: 2338000 },
  { month: "Sep", amount: 191000 },
];

export function activeCampaigns() {
  return CAMPAIGNS.filter((c) => c.status === "ACTIVE");
}

export function flashFunds() {
  return CAMPAIGNS.filter((c) => c.isFlashFund && c.status === "ACTIVE");
}

export function campaignBySlug(slug: string) {
  return CAMPAIGNS.find((c) => c.slug === slug);
}

export function pendingZakat() {
  return ZAKAT_REQUESTS.filter((r) => r.status === "PENDING");
}

export function memberById(memberId: string) {
  return MEMBERS.find((m) => m.memberId === memberId);
}
