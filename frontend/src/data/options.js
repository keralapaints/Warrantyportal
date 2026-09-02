// PLACEHOLDER for PRODUCTS and QUANTITIES — replace when you have the real lists.
// DISTRICTS and OUTLETS_BY_DISTRICT below are real, from the outlet list you sent
// (KERALA_PAINTS_GUEST_OUTLETS_LIST_02_09_2026.xlsx).

export const DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
  "Mahe",
  "Tamil Nadu",
];

// Outlets grouped by district, so the outlet dropdown only shows outlets
// that actually belong to the selected district.
export const OUTLETS_BY_DISTRICT = {
  "Thiruvananthapuram": [
    "Factory outlet (Attingal)",
    "INMAX INTERIORS (Kazhakoottam Corporation)",
    "INMAX INTERIORS (Balaramapuram Panchayuath)",
  ],
  "Kollam": [
    "Factory outlet (Kottarakkara)",
    "V & S  Traders (Sooranad  Panchayath)",
    "Colournest paints (Velinallur Panchayath)",
    "F & S TRADERS (Adhichanallor Panchayath)",
    "HIRA GROUP (Pathanapuram Panchayath)",
    "Colournest paints (Alayamon Panchayath)",
    "CITY PAINTS & HARDWARES (Kalluvathukkal  Panchayath)",
  ],
  "Pathanamthitta": [
    "Factory outlet (Poomkavu)",
  ],
  "Alappuzha": [
    "Factory outlet (Alappuzha)",
    "MEZZAN (Chengannur Panchayath)",
    "STEEL WORLD (Nooranad Panchayath)",
  ],
  "Kottayam": [
    "Factory outlet (Kottayam Logos Jn)",
  ],
  "Idukki": [
    "Factory outlet (Adimali)",
    "Factory outlet (Kattappana)",
    "Factory outlet (Thodupuzha)",
  ],
  "Ernakulam": [
    "Factory outlet (Edappally)",
  ],
  "Thrissur": [
    "Factory outlet (Chalakkudy)",
    "KK BROTHERS (Guruvayoor Municipality)",
  ],
  "Palakkad": [
    "Factory outlet (Kalpathy)",
    "PR KUTHANNUR (Kuthannur Panchayath)",
    "NEXUS SEVEN (Pattambi Municipality)",
    "SHAMA TRADERS (Alanalloor Panchayath)",
    "RGK  KERALA  PAINT (Nemmara Panchayath)",
  ],
  "Malappuram": [
    "Factory outlet (Kuttippuram)",
    "Factory outlet (Makkaraparambu)",
    "OASIS HARDWARES (Nannambra  Panchayath)",
    "SN SONS (Thalakkad Panchayath)",
    "NOVARA (Perinthalmanna Municipality)",
    "MARHABA G SHOPPEE (Angadippuram Panchayath)",
    "PAINT HUB (Parappanagadi Panchayath)",
  ],
  "Wayanad": [
    "Factory outlet (Meenagadi)",
    "COLOUR NEST (Kalpetta Municipality)",
    "WHITE HOUSE (Vythiri Panchayath)",
    "VKS (Vellamunda Panchayath)",
  ],
  "Kozhikode": [
    "Factory outlet (Chemancherry)",
    "ES AGENCIES (Kuttiyadi Panchayath)",
    "7 SHADES (Kozhikode Corporation (Pottammal))",
    "7 SHADES (Kozhikode Corporation (Meecham))",
    "YES WE ASSOSIACTES (Nadapuram Panchayath)",
    "F S AGENCIES (Kunnummal Panchayath)",
    "RAIN BOW PAINTS (Eramala Panchayath)",
  ],
  "Mahe": [
    "FRENCH TRADING (Mahe Panchayath)",
  ],
  "Kannur": [
    "Factory outlet (Irikkur - Nayattupara)",
    "PBS GROUP (Panoor Municipality)",
    "B STAR TRADING (Cherupuzha Panchayath)",
    "MYM TRADERS (Cheruthazham Panchayath)",
    "KVS PAINTS (Peralassery Panchayath)",
  ],
  "Kasaragod": [
    "Factory outlet (Kanhangad)",
    "HNM MARKETING (Chengala Panchayath)",
    "AMS INFINITY WORLS (Chemnad Panchayath)",
    "ABM  PAINTS & HARDWARES (Ajanur Panchayath)",
  ],
  "Tamil Nadu": [
    "Factory outlet (Coimbatore)",
  ],
};

// TODO: replace with the real Kerala Paints product list.
export const PRODUCTS = [
  "Interior Emulsion",
  "Exterior Emulsion",
  "Enamel Paint",
  "Primer",
  "Wood Finish / Varnish",
  "Putty",
  "Distemper",
  "Texture Coating",
];

// TODO: replace with the real packaging sizes Kerala Paints sells.
export const QUANTITIES = [
  "1 Ltr",
  "4 Ltr",
  "10 Ltr",
  "20 Ltr",
  "1 Kg",
  "5 Kg",
  "10 Kg",
];