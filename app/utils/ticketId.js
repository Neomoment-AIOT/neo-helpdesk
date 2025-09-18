// utils/ticketId.js
const ADJS = ["bright","calm","clear","swift","bold","fresh","lucky","sharp","green","blue","gold"];
const NOUNS = ["tiger","owl","eagle","fox","lion","wolf","dove","shark","falcon","bear"];

function pick(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

function pad(num, len = 3){
  return String(num).padStart(len, "0");
}

/**
 * Example: NM-quick-owl-042
 */
export function generateTicketId(){
  const adj = pick(ADJS);
  const noun = pick(NOUNS);
  const num = pad(Math.floor(Math.random() * 1000));
  return `NM-${adj}-${noun}-${num}`;
}
