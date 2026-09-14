/**
 * Minutes content, in English and in the Urdu-English the committee
 * actually speaks. One shape, two fillings — sheet.tsx renders either.
 * Names follow the election result of 5 September 2026.
 */

export interface Person { name: string; note?: string }
export interface Named { head: string; text: string }
export interface Action { what: string; who: string; done?: boolean }
export interface Elected { n: number; name: string; votes: number; pct: number; isNew?: boolean }
export interface Committee { head: string; lead: string; members: string[] }

export interface MomContent {
  lang: "en" | "hi";
  langLabel: string;
  meeting: { kicker: string; title: string; ref: string;
             dateLabel: string; date: string;
             heldLabel: string; held: string;
             chairLabel: string; chair: string };
  roll: { total: number; present: number; absent: number };
  rollLabels: { total: string; present: string; absent: string };
  headings: { attendance: string; decisions: string; appointments: string;
              committees: string; responsibilities: string; actions: string;
              present: string; absent: string; election: string };
  present: Person[];
  absent: Person[];
  decisions: Named[];
  appointmentsLede: string;
  appointmentsCols: { post: string; name: string };
  appointments: { post: string; name: string }[];
  committeesLede: string;
  committees: Committee[];
  membersBlock: { head: string; names: string[] };
  responsibilities: Named[];
  actionsCols: { n: string; what: string; who: string };
  actions: Action[];
  election: {
    lede: string;
    stats: { v: string; l: string }[];
    cols: { n: string; name: string; votes: string; share: string };
    newTag: string;
  };
  elected: Elected[];
  close: string;
}

const ELECTED: Elected[] = [
  { n: 1,  name: "Akhtar Khan",                        votes: 92, pct: 84 },
  { n: 2,  name: "Irfan Anwar Khan",                   votes: 79, pct: 72 },
  { n: 3,  name: "Afzal Abdul Rahiman Khan Sarguro",   votes: 76, pct: 70 },
  { n: 4,  name: "Ibrahim Usman Sarguroh",             votes: 76, pct: 70 },
  { n: 5,  name: "Khalid A. Razzak Khan Sarguroh",     votes: 74, pct: 68 },
  { n: 6,  name: "Nisar Sarguroh",                     votes: 73, pct: 67 },
  { n: 7,  name: "Aslam Ahmed Khan",                   votes: 69, pct: 63 },
  { n: 8,  name: "Bilal Sarguroh",                     votes: 69, pct: 63 },
  { n: 9,  name: "Sadiq Latif Khan",                   votes: 66, pct: 61 },
  { n: 10, name: "Maqbool Pevekar",                    votes: 58, pct: 53 },
  { n: 11, name: "S. M. S. G. Khan",                   votes: 53, pct: 49 },
  { n: 12, name: "Gayasali Mahamood Khan S.",          votes: 49, pct: 45 },
  { n: 13, name: "Mukri Mohammed Hussain A.",          votes: 45, pct: 41, isNew: true },
  { n: 14, name: "Musaddiq Khan",                      votes: 44, pct: 40, isNew: true },
  { n: 15, name: "Abdul Qayyum Khan",                  votes: 41, pct: 38, isNew: true },
  { n: 16, name: "Shakeel Ahmed Abdul Samad",          votes: 38, pct: 35 },
  { n: 17, name: "Mubeen Mohiuddin Pavekar",           votes: 36, pct: 33, isNew: true },
];

/** The eleven who hold no office — they make up the Development Committee. */
const REST = [
  "Ibrahim Usman Sarguroh",
  "Khalid A. Razzak Khan Sarguroh",
  "Nisar Sarguroh",
  "Bilal Sarguroh",
  "Sadiq Latif Khan",
  "Maqbool Pevekar",
  "S. M. S. G. Khan (Shafi Saheb)",
  "Gayasali Mahamood Khan S.",
  "Mukri Mohammed Hussain A.",
  "Musaddiq Khan",
  "Shakeel Ahmed Abdul Samad",
];

/* ================================ ENGLISH ================================ */

export const EN: MomContent = {
  lang: "en",
  langLabel: "English",
  meeting: {
    kicker: "Management Committee",
    title: "Minutes of Meeting",
    ref: "PSWS/MOM/2026-27/01",
    dateLabel: "Date", date: "Sunday, 13 September 2026",
    heldLabel: "Held", held: "Online meeting on Google Meet",
    chairLabel: "In the chair", chair: "S. M. S. G. Khan (Shafi Saheb)",
  },
  roll: { total: 17, present: 13, absent: 4 },
  rollLabels: { total: "On the committee", present: "Present", absent: "Absent" },
  headings: {
    attendance: "Attendance",
    decisions: "Decisions and structure",
    appointments: "Office bearers",
    committees: "The three committees",
    responsibilities: "What each committee does",
    actions: "Action items",
    present: "Present", absent: "Absent",
    election: "The committee as elected",
  },
  present: [
    { name: "Akhtar Khan" },
    { name: "Irfan Anwar Khan" },
    { name: "Afzal Abdul Rahiman Khan Sarguro" },
    { name: "Khalid A. Razzak Khan Sarguroh" },
    { name: "Nisar Sarguroh" },
    { name: "Aslam Ahmed Khan" },
    { name: "Bilal Sarguroh" },
    { name: "Maqbool Pevekar" },
    { name: "S. M. S. G. Khan (Shafi Saheb)" },
    { name: "Gayasali Mahamood Khan S." },
    { name: "Mukri Mohammed Hussain A." },
    { name: "Musaddiq Khan" },
    { name: "Mubeen Mohiuddin Pavekar" },
  ],
  absent: [
    { name: "Ibrahim Usman Sarguroh" },
    { name: "Sadiq Latif Khan", note: "Sent his apology; committed to another programme" },
    { name: "Abdul Qayyum Khan", note: "Unwell; sent his apology. Accepted the post by message the next day" },
    { name: "Shakeel Ahmed Abdul Samad" },
  ],
  decisions: [
    { head: "A simpler structure",
      text: "The committee agreed unanimously to simplify the management structure, so that responsibilities are clear and everybody takes part." },
    { head: "Six offices",
      text: "President, General Secretary, Treasurer, and the heads of the three committees — Zakat, Development and Advisory." },
    { head: "Reporting",
      text: "All committee heads and members report directly to the President." },
    { head: "Joint Secretary deferred",
      text: "The proposal for a Joint Secretary was deferred. The structure will be looked at again after one year to see whether further roles are needed." },
    { head: "Term and review",
      text: "The office bearers serve for two years, with a review of the work after the first year." },
  ],
  appointmentsLede:
    "Appointed unanimously, for a term of two years.",
  appointmentsCols: { post: "Office", name: "Appointed" },
  appointments: [
    { post: "President", name: "Akhtar Khan" },
    { post: "General Secretary", name: "Irfan Anwar Khan" },
    { post: "Treasurer", name: "Abdul Qayyum Khan" },
    { post: "Head, Zakat Committee", name: "Afzal Abdul Rahiman Khan Sarguro" },
    { post: "Head, Development Committee", name: "Mubeen Mohiuddin Pavekar" },
    { post: "Head, Advisory Committee", name: "Aslam Ahmed Khan" },
  ],
  committeesLede:
    "Each committee is led by the office bearer named above. Every other elected member serves as a member of the Society, and takes part in the work of whichever committee needs them.",
  committees: [
    { head: "Zakat Committee", lead: "Afzal Abdul Rahiman Khan Sarguro", members: [] },
    { head: "Development Committee", lead: "Mubeen Mohiuddin Pavekar", members: [] },
    { head: "Advisory Committee", lead: "Aslam Ahmed Khan", members: [] },
  ],
  membersBlock: { head: "Members", names: REST },
  responsibilities: [
    { head: "General Secretary",
      text: "Manages all documentation, meeting notes and administrative matters, including building and keeping the contact database. Carries the website, the Society's online presence and the automation work, with the support of Afzal Saheb, Akhtar Saheb and the whole management team." },
    { head: "Zakat Committee",
      text: "Runs the collection and distribution of Zakat through the collection months, with dedicated support from the management team." },
    { head: "Development Committee",
      text: "Carries the village development works." },
    { head: "Working across committees",
      text: "Members are encouraged to take part in more than one committee, according to what they are good at and what the Society needs." },
  ],
  actionsCols: { n: "#", what: "Action", who: "With" },
  actions: [
    { what: "Confirm the Treasurer's acceptance of the position.", who: "Management", done: true },
    { what: "Create a form to collect email addresses and updated contact details from all members for the official record.", who: "General Secretary" },
    { what: "Announce the confirmed appointments in the general WhatsApp group once final approvals are secured.", who: "Management" },
  ],
  election: {
    lede: "The general election for Pewe was held on 5 September 2026. These are the seventeen the village returned, in the order the count placed them.",
    stats: [
      { v: "110", l: "Registered" },
      { v: "109", l: "Voted" },
      { v: "99.1%", l: "Turnout" },
      { v: "1,853", l: "Votes counted" },
    ],
    cols: { n: "#", name: "Member", votes: "Votes", share: "Share" },
    newTag: "New",
  },
  elected: ELECTED,
  close:
    "The meeting opened and closed with Tilawat-e-Quran by Shafi Saheb, and was adjourned with the closing dua led by Afzal Sarguro Saheb.",
};

/* =============================== HINGLISH =============================== */

export const HI: MomContent = {
  lang: "hi",
  langLabel: "Urdu-English",
  meeting: {
    kicker: "Management Committee",
    title: "Meeting ke Minutes",
    ref: "PSWS/MOM/2026-27/01",
    dateLabel: "Date", date: "Itwar, 13 September 2026",
    heldLabel: "Kahan", held: "Online meeting, Google Meet par",
    chairLabel: "Chairman", chair: "S. M. S. G. Khan (Shafi Saheb)",
  },
  roll: { total: 17, present: 13, absent: 4 },
  rollLabels: { total: "Committee mein total", present: "Aaye", absent: "Nahi aaye" },
  headings: {
    attendance: "Kaun aaya",
    decisions: "Faisle aur naya structure",
    appointments: "Kaun kya sambhalega",
    committees: "Teen committee",
    responsibilities: "Har committee ka kaam",
    actions: "Aage ke kaam",
    present: "Aaye", absent: "Nahi aaye",
    election: "Election mein chune gaye 17",
  },
  present: [
    { name: "Akhtar Khan" },
    { name: "Irfan Anwar Khan" },
    { name: "Afzal Abdul Rahiman Khan Sarguro" },
    { name: "Khalid A. Razzak Khan Sarguroh" },
    { name: "Nisar Sarguroh" },
    { name: "Aslam Ahmed Khan" },
    { name: "Bilal Sarguroh" },
    { name: "Maqbool Pevekar" },
    { name: "S. M. S. G. Khan (Shafi Saheb)" },
    { name: "Gayasali Mahamood Khan S." },
    { name: "Mukri Mohammed Hussain A." },
    { name: "Musaddiq Khan" },
    { name: "Mubeen Mohiuddin Pavekar" },
  ],
  absent: [
    { name: "Ibrahim Usman Sarguroh" },
    { name: "Sadiq Latif Khan", note: "Maafi bheji; doosre program mein masroof the" },
    { name: "Abdul Qayyum Khan", note: "Tabiyat theek nahi thi; maafi bheji. Agle din message se position accept ki" },
    { name: "Shakeel Ahmed Abdul Samad" },
  ],
  decisions: [
    { head: "Structure simple kiya",
      text: "Committee ne sab ne milkar faisla kiya ke management ka structure simple rakha jaye, taaki har kisi ko pata rahe kiski kya zimmedari hai aur sab hissa lein." },
    { head: "Chhe position",
      text: "President, General Secretary, Treasurer, aur teen committee ke head — Zakat, Development aur Advisory." },
    { head: "Reporting",
      text: "Saare committee head aur members seedha President ko report karenge." },
    { head: "Joint Secretary abhi nahi",
      text: "Joint Secretary ki baat filhaal rok di gayi. Ek saal baad structure dobara dekha jayega ke aur position ki zarurat hai ya nahi." },
    { head: "Term aur review",
      text: "Jo position par aaye hain unka term do saal ka hai, aur pehle saal ke baad kaam ka review hoga." },
  ],
  appointmentsLede:
    "Sab ki razamandi se, do saal ke term ke liye.",
  appointmentsCols: { post: "Position", name: "Kaun" },
  appointments: [
    { post: "President", name: "Akhtar Khan" },
    { post: "General Secretary", name: "Irfan Anwar Khan" },
    { post: "Treasurer", name: "Abdul Qayyum Khan" },
    { post: "Head, Zakat Committee", name: "Afzal Abdul Rahiman Khan Sarguro" },
    { post: "Head, Development Committee", name: "Mubeen Mohiuddin Pavekar" },
    { post: "Head, Advisory Committee", name: "Aslam Ahmed Khan" },
  ],
  committeesLede:
    "Har committee ka head upar diya gaya hai. Baaki jitne chune gaye members hain, woh Society ke members hain, aur jis committee ko zarurat ho wahan kaam mein hissa lenge.",
  committees: [
    { head: "Zakat Committee", lead: "Afzal Abdul Rahiman Khan Sarguro", members: [] },
    { head: "Development Committee", lead: "Mubeen Mohiuddin Pavekar", members: [] },
    { head: "Advisory Committee", lead: "Aslam Ahmed Khan", members: [] },
  ],
  membersBlock: { head: "Members", names: REST },
  responsibilities: [
    { head: "General Secretary",
      text: "Saare kaagzaat, meeting ke notes aur admin ka kaam dekhenge, aur members ka contact database banayenge aur sambhalenge. Website, online presence aur automation ka kaam bhi wahi sambhalenge — Afzal Saheb, Akhtar Saheb aur poori management team ki madad ke saath." },
    { head: "Zakat Committee",
      text: "Zakat ke mahinon mein collection aur distribution ka kaam khud sambhalegi, management team ki poori madad ke saath." },
    { head: "Development Committee",
      text: "Gaon ke development ke kaam sambhalegi." },
    { head: "Ek se zyada committee mein",
      text: "Members se guzarish hai ke jo jisme acha hai aur jahan Society ko zarurat hai, wahan ek se zyada committee mein hissa lein." },
  ],
  actionsCols: { n: "#", what: "Kaam", who: "Kis ke zimme" },
  actions: [
    { what: "Treasurer ki position ki acceptance confirm karna.", who: "Management", done: true },
    { what: "Sab members se email aur naya contact number lene ke liye ek form banana, record ke liye.", who: "General Secretary" },
    { what: "Final approval ke baad positions ka announcement aam WhatsApp group mein karna.", who: "Management" },
  ],
  election: {
    lede: "Pewe ka general election 5 September 2026 ko hua. Yeh hain woh sattrah jo gaon ne chune, count ke order mein.",
    stats: [
      { v: "110", l: "Registered" },
      { v: "109", l: "Vote diya" },
      { v: "99.1%", l: "Turnout" },
      { v: "1,853", l: "Vote gine gaye" },
    ],
    cols: { n: "#", name: "Member", votes: "Vote", share: "Hissa" },
    newTag: "Naya",
  },
  elected: ELECTED,
  close:
    "Meeting ka aaghaz aur ikhtitam Shafi Saheb ki Tilawat-e-Quran se hua, aur aakhir mein Afzal Sarguro Saheb ne dua karwayi.",
};
