export const DEFAULT_CONTENT = {
  stats: [
    { num: "3", lbl: "Mentorship paths" },
    { num: "24hr", lbl: "Reply window" },
    { num: "Weekly", lbl: "New episodes" },
  ],
  socials: {
    instagram: "https://www.instagram.com/siobhanfredaodonnell/",
    instagramPodcast: "https://www.instagram.com/siobhanspodcast_pwp/",
    youtube: "https://www.youtube.com/@PowerWithoutPermission",
    spotify: "https://open.spotify.com/show/6zEBd39ZLkv2Br01n4gZGZ",
    facebook: "https://www.facebook.com/siobhan.odonnell3/",
    tiktok: "https://www.tiktok.com/@siobhanfredaodonn",
    apple: "",
    linkedin: "",
  },
  topics: [
    "Building a Brand That Doesn't Ask Permission",
    "Personal branding for founders who are done waiting",
    "Pricing and scaling to consistent 10K months",
    "Audience and content that compounds",
    "Power Without Permission Content Workshops — a hands-on session for teams and audiences",
  ],
  episodes: [
    {
      label: "Featured",
      title: "Permissionless Growth: The Playbook for Real Success",
      blurb: "Jessica Williamson — public figure, TEDx speaker, coach, and podcaster — on building in public without waiting to be picked.",
      url: "https://www.youtube.com/watch?v=kqPEhqxCMkM",
    },
    {
      label: "Featured",
      title: "The Pilates Gang Effect",
      blurb: "Perry Howell on how a brand becomes a room people refuse to leave.",
      url: "https://www.youtube.com/watch?v=Z_x7LdN9cyw",
    },
    {
      label: "Featured",
      title: "Her Story. Her Stand.",
      blurb: "Michelle Faye, CEO of OurStory & HerStory Foundation, on visibility, voice, and leadership.",
      url: "https://www.youtube.com/watch?v=n8-O35En_oU",
    },
  ],
  events: [],
  testimonials: [],
  guide: {
    title: "The 10K Month Permission Slip",
    subtitle: "Five moves for the month you stop waiting to be picked.",
    intro: "This is the working sheet the studio uses when an offer is real and the calendar is not. It is not a published book. Create a free login and the full sheet is yours — plus first word when a mentorship seat opens.",
    sections: [
      {
        title: "One offer",
        body: "Write one sentence: who it is for, what they leave with, and the price. If you have three offers, park two. The month only has room for the one you will actually say out loud.",
      },
      {
        title: "Three paid conversations",
        body: "Book three conversations with people who already spend money on this kind of help. Not followers. Buyers. Ask what they tried, what it cost, and what is still stuck.",
      },
      {
        title: "Four live touchpoints",
        body: "Put four dates on the calendar before the month starts: one podcast moment, one story, one email, one room. Showing up on a date beats waiting to feel ready.",
      },
      {
        title: "The ask",
        body: "Send one clear invitation before the offer feels finished. Name the seat, the price, and the date they start. The ask is the work.",
      },
      {
        title: "The number",
        body: "Split the month's cash target into four weeks. Track collected money, not hoped-for invoices. A 10K month is four weeks of collected decisions, not one perfect launch.",
      },
    ],
  },
};

const PREVIOUS_SOCIAL_DEFAULTS = {
  youtube: "https://www.youtube.com/playlist?list=PLW4UfEVvEMTAxhL7HoX3i7swJek4o3p6j",
};

export function mergeContent(stored) {
  const base = structuredClone(DEFAULT_CONTENT);
  const data = stored || {};
  const content = { ...base, ...data };
  const socials = { ...base.socials, ...(data.socials || {}) };
  for (const key of Object.keys(base.socials)) {
    const value = String(socials[key] || "").trim();
    socials[key] = !value || value === PREVIOUS_SOCIAL_DEFAULTS[key] ? base.socials[key] : value;
  }
  content.socials = socials;
  return content;
}

export const LEAD_TYPES = {
  newsletter: "List",
  guest: "Podcast guest",
  speaking: "Speaking",
  mentoring: "1:1 application",
  event: "Event list",
  testimonial: "Client story",
  member: "New login",
  contact: "Contact",
};

export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
