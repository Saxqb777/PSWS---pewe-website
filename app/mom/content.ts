/**
 * Minutes content, in both the English and the Hinglish the committee
 * actually speaks. One shape, two fillings — the sheet component renders
 * either. The next set of minutes is an edit here and nowhere else.
 */

export interface Person { name: string; note?: string }
export interface Named { head: string; text: string }
export interface Action { what: string; who: string; done?: boolean }

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
              responsibilities: string; actions: string;
              present: string; absent: string; open: string };
  present: Person[];
  absent: Person[];
  openQuestions: Named[];
  decisions: Named[];
  appointmentsLede: string;
  appointmentsCols: { post: string; name: string; note: string };
  appointments: { post: string; name: string; note?: string }[];
  responsibilities: Named[];
  actionsCols: { n: string; what: string; who: string };
  actions: Action[];
  close: string;
  signRoles: { chair: string; secretary: string };
}

/* ---------------------------------------------------------------- */

export const EN: MomContent = {
  lang: "en",
  langLabel: "English",
  meeting: {
    kicker: "Management Committee",
    title: "Minutes of Meeting",
    ref: "PSWS/MOM/2026-27/01",
    dateLabel: "Date", date: "Saturday, 13 September 2026",
    heldLabel: "Held", held: "Online meeting",
    chairLabel: "In the chair", chair: "S. M. S. G. Khan Saheb (Shafi Saheb)",
  },
  roll: { total: 17, present: 13, absent: 4 },
  rollLabels: { total: "On the committee", present: "Present", absent: "Absent" },
  headings: {
    attendance: "Attendance",
    decisions: "Decisions and structural changes",
    appointments: "Leadership appointments",
    responsibilities: "Committee responsibilities",
    actions: "Action items",
    present: "Present", absent: "Absent",
    open: "To be settled",
  },
  present: [
    { name: "Akhtar Khan Saheb" },
    { name: "Irfan Anwar Saheb" },
    { name: "Afzal Sarguro Saheb" },
    { name: "S. M. S. G. Khan Saheb (Shafi Saheb)" },
    { name: "Aslam Khan Saheb" },
    { name: "Gayasali Khan Saheb" },
    { name: "Nisar Sarguroh Saheb" },
    { name: "Mohammad Husain Saheb" },
    { name: "Mussadiq Saheb" },
    { name: "Khalid Saheb" },
    { name: "Makbool Saheb" },
    { name: "Bilal Saheb" },
    { name: "Mubin Pewekar Saheb" },
  ],
  absent: [
    { name: "Sadiq Latif Saheb" },
    { name: "Ibrahim Usman Saheb" },
    { name: "Abdul Qayum Saheb", note: "Unwell; sent his apology. Accepted the post by message the next day" },
    { name: "Shakeel Saheb" },
  ],
  openQuestions: [
    {
      head: "The fourteenth attendee",
      text: "The meeting showed fourteen people connected at one point, while thirteen members are named above. The fourteenth is to be identified and these minutes corrected accordingly.",
    },
    {
      head: "Recording",
      text: "The link to the meeting recording has not yet been circulated. To be shared with the minutes.",
    },
  ],
  decisions: [
    { head: "Streamlined hierarchy",
      text: "The committee agreed unanimously to simplify the management hierarchy, so that responsibilities are clear and participation is active." },
    { head: "Six core positions",
      text: "The structure will consist of President, General Secretary, Treasurer, and three Committee Heads — Zakat, Development and Advisory." },
    { head: "Reporting",
      text: "All committee heads and members report directly to the President." },
    { head: "Joint Secretary deferred",
      text: "The proposal for a Joint Secretary was deferred. The structure will be reviewed after one year to determine whether further roles are required." },
    { head: "Tenure and review",
      text: "The appointed leadership serves a term of two years, with a performance review after the first year." },
  ],
  appointmentsLede:
    "The following members were nominated and appointed unanimously to the six core positions, for a term of two years.",
  appointmentsCols: { post: "Position", name: "Appointed", note: "Note" },
  appointments: [
    { post: "President", name: "Akhtar Khan Saheb" },
    { post: "General Secretary", name: "Irfan Anwar Saheb" },
    { post: "Treasurer", name: "Abdul Qayum Raza Khan Saheb",
      note: "Appointed in absentia; accepted by message to the committee on 14 September 2026" },
    { post: "Head, Zakat Committee", name: "Afzal Sarguro Saheb" },
    { post: "Head, Development Committee", name: "Mubin Mohiddin Khan Saheb" },
    { post: "Head, Advisory Committee", name: "Aslam Ahmad Khan Saheb" },
  ],
  responsibilities: [
    { head: "General administration",
      text: "The General Secretary manages all documentation, meeting notes and administrative matters, including building and maintaining the contact database." },
    { head: "Zakat Committee",
      text: "Actively manages the collection and distribution of Zakat through the collection months, with dedicated support from the management team." },
    { head: "Development Committee",
      text: "Manages the website, online presence and connections, and drives the automation work." },
    { head: "Cross-committee support",
      text: "Members are encouraged to take part across more than one committee, according to their own expertise and the needs of the Society." },
  ],
  actionsCols: { n: "#", what: "Action", who: "With" },
  actions: [
    { what: "Confirm the Treasurer's acceptance of the position.", who: "Management", done: true },
    { what: "Identify the fourteenth attendee and correct these minutes.", who: "General Secretary" },
    { what: "Circulate the link to the meeting recording.", who: "General Secretary" },
    { what: "Create a form to collect email addresses and updated contact details from all members for the official record.", who: "General Secretary" },
    { what: "Distribute these minutes to all members.", who: "General Secretary" },
    { what: "Announce the confirmed appointments in the general WhatsApp group once final approvals are secured.", who: "Management" },
  ],
  close:
    "The meeting opened and closed with Tilawat-e-Quran by Shafi Saheb, and was adjourned with the closing dua led by Afzal Sarguro Saheb.",
  signRoles: { chair: "Chair of the meeting", secretary: "General Secretary" },
};

/* ---------------------------------------------------------------- */

export const HI: MomContent = {
  lang: "hi",
  langLabel: "Hinglish",
  meeting: {
    kicker: "Management Committee",
    title: "Meeting ke Minutes",
    ref: "PSWS/MOM/2026-27/01",
    dateLabel: "Tareekh", date: "Sanivar, 13 September 2026",
    heldLabel: "Kahan", held: "Online meeting",
    chairLabel: "Sadarat", chair: "S. M. S. G. Khan Saheb (Shafi Saheb)",
  },
  roll: { total: 17, present: 13, absent: 4 },
  rollLabels: { total: "Committee mein kul", present: "Hazir", absent: "Ghair-hazir" },
  headings: {
    attendance: "Hazri",
    decisions: "Faisle aur naya dhancha",
    appointments: "Zimmedariyon ki taqseem",
    responsibilities: "Committee ki zimmedariyan",
    actions: "Karne ke kaam",
    present: "Hazir", absent: "Ghair-hazir",
    open: "Abhi tay hona baaki",
  },
  present: [
    { name: "Akhtar Khan Saheb" },
    { name: "Irfan Anwar Saheb" },
    { name: "Afzal Sarguro Saheb" },
    { name: "S. M. S. G. Khan Saheb (Shafi Saheb)" },
    { name: "Aslam Khan Saheb" },
    { name: "Gayasali Khan Saheb" },
    { name: "Nisar Sarguroh Saheb" },
    { name: "Mohammad Husain Saheb" },
    { name: "Mussadiq Saheb" },
    { name: "Khalid Saheb" },
    { name: "Makbool Saheb" },
    { name: "Bilal Saheb" },
    { name: "Mubin Pewekar Saheb" },
  ],
  absent: [
    { name: "Sadiq Latif Saheb" },
    { name: "Ibrahim Usman Saheb" },
    { name: "Abdul Qayum Saheb", note: "Tabiyat theek nahi thi; maafi bheji. Agle din message se ohda qubool kiya" },
    { name: "Shakeel Saheb" },
  ],
  openQuestions: [
    { head: "Chaudhvan kaun tha",
      text: "Meeting mein ek waqt 14 log jude hue the, lekin upar 13 members ke naam hain. Chaudhvan kaun tha yeh maloom karke in minutes mein durusti ki jaye." },
    { head: "Recording",
      text: "Meeting ki recording ka link abhi tak share nahi hua hai. Minutes ke saath bheja jaye." },
  ],
  decisions: [
    { head: "Dhancha aasan kiya gaya",
      text: "Committee ne ittefaq se faisla kiya ke management ka dhancha aasan kiya jaye, taake zimmedariyan saaf rahein aur sab ki shirkat rahe." },
    { head: "Chhe buniyadi ohde",
      text: "Dhanche mein rahenge — President, General Secretary, Khazanchi, aur teen Committee Heads: Zakat, Development aur Advisory." },
    { head: "Reporting",
      text: "Saare committee heads aur members seedha President ko report karenge." },
    { head: "Joint Secretary abhi nahi",
      text: "Joint Secretary ki tajweez filhaal rok di gayi. Ek saal baad dhanche par nazar-e-sani hogi ke aur ohde chahiye ya nahi." },
    { head: "Muddat aur jaiza",
      text: "Muqarrar ki gayi qayadat do saal ke liye hai, aur pehle saal ke baad kaam ka jaiza liya jayega." },
  ],
  appointmentsLede:
    "Neeche diye gaye members ko ittefaq-e-raay se chhe buniyadi ohdon par, do saal ki muddat ke liye muqarrar kiya gaya.",
  appointmentsCols: { post: "Ohda", name: "Muqarrar hue", note: "Note" },
  appointments: [
    { post: "President", name: "Akhtar Khan Saheb" },
    { post: "General Secretary", name: "Irfan Anwar Saheb" },
    { post: "Khazanchi (Treasurer)", name: "Abdul Qayum Raza Khan Saheb",
      note: "Ghair-hazri mein muqarrar; 14 September 2026 ko message se qubool kiya" },
    { post: "Head, Zakat Committee", name: "Afzal Sarguro Saheb" },
    { post: "Head, Development Committee", name: "Mubin Mohiddin Khan Saheb" },
    { post: "Head, Advisory Committee", name: "Aslam Ahmad Khan Saheb" },
  ],
  responsibilities: [
    { head: "Aam intezamiya",
      text: "General Secretary saare kaagzaat, meeting ke notes aur intezami kaam dekhenge, jismein members ka contact database banana aur sambhalna bhi shamil hai." },
    { head: "Zakat Committee",
      text: "Zakat ke mahinon mein Zakat ki wusooli aur taqseem ka kaam khud dekhegi, management team ki poori madad ke saath." },
    { head: "Development Committee",
      text: "Website, online kaam aur raabte dekhegi, aur automation ka kaam aage badhayegi." },
    { head: "Ek dusre ki madad",
      text: "Members se guzarish hai ke apni salahiyat aur Society ki zarurat ke mutabiq ek se zyada committee mein hissa lein." },
  ],
  actionsCols: { n: "#", what: "Kaam", who: "Kis ke zimme" },
  actions: [
    { what: "Khazanchi ke ohde ki qubooliyat ki tasdeeq karna.", who: "Management", done: true },
    { what: "Chaudhvan hazir kaun tha yeh maloom karke minutes durust karna.", who: "General Secretary" },
    { what: "Meeting ki recording ka link sab ko bhejna.", who: "General Secretary" },
    { what: "Sab members se email aur naya contact number lene ke liye ek form banana, record ke liye.", who: "General Secretary" },
    { what: "Yeh minutes sab members ko bhejna.", who: "General Secretary" },
    { what: "Aakhri manzoori ke baad ohdon ka elaan aam WhatsApp group mein karna.", who: "Management" },
  ],
  close:
    "Meeting ka aaghaz aur ikhtitam Shafi Saheb ki Tilawat-e-Quran se hua, aur aakhir mein Afzal Sarguro Saheb ne dua karwayi.",
  signRoles: { chair: "Meeting ke sadar", secretary: "General Secretary" },
};
