/**
 * Society constants — taken from the official letterhead and seal.
 * Anything here is REAL. Everything in mock-data.ts is invented.
 */

export const SOCIETY = {
  shortName: "PSWS",
  name: "Pewe Social Welfare Society",
  nameMarathi: "पेवे सोशल वेल्फेअर सोसायटी",
  nameUrdu: "پیوے سوشل ولفیئر سوسائٹی",

  registrationNo: "F/3584/RTG",
  societyRegNo: "MH/5602/RTG",
  foundedYear: 2015,

  address: {
    line1: "At & Post Pewe",
    line2: "Taluka Guhagar",
    line3: "Dist. Ratnagiri",
    state: "Maharashtra",
    country: "India",
    pin: "415703",
  },

  phone: "+91 2359 247253",
  phoneHref: "tel:+912359247253",
  email: "office@pewe-sws.org",
  website: "www.pewe-sws.org",

  /**
   * HERO ARTWORK
   * ------------
   * "engraving" — the drawn Konkan scene (current, no photo needed).
   * "photo"     — layered photographs.
   *
   * To switch to photos: drop these four files into public/images/hero/
   * and change heroMode to "photo". Nothing else needs touching.
   *   sky.jpg      distant sky + cloud
   *   ridge.jpg    the Sahyadri hills behind          (transparent PNG better)
   *   building.jpg the community building itself      (transparent PNG better)
   *   fore.jpg     palms + boundary wall in front     (transparent PNG better)
   *
   * A single un-layered photo also works — name it hero.jpg and set
   * heroMode to "photo-flat".
   */
  heroMode: "band" as "engraving" | "photo" | "photo-flat" | "band",
} as const;

/** Fiscal year the prototype is showing. */
export const FISCAL_YEAR = "2026–27";

/** Every screen in the prototype is fed from mock-data.ts, not a database. */
export const IS_PROTOTYPE = true;
