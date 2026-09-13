// How many SMS a text costs at the carrier. A single character outside the
// GSM 03.38 alphabet (Arabic, "ç", "ê", "’", emoji…) switches the whole message
// to UCS-2, which drops a part from 160 to 70 characters — common here, where
// messages are often in Arabic or accented French. Multipart messages lose a
// few characters per part to the header that stitches them back together.

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
// These take two slots each (escape + character).
const GSM_EXTENDED = "^{}\\[~]|€\f";

export function countSmsSegments(text: string): number {
  if (!text) return 1;

  let gsmLength = 0;
  let isGsm = true;
  for (const char of text) {
    if (GSM_BASIC.includes(char)) gsmLength += 1;
    else if (GSM_EXTENDED.includes(char)) gsmLength += 2;
    else {
      isGsm = false;
      break;
    }
  }

  if (isGsm) return gsmLength <= 160 ? 1 : Math.ceil(gsmLength / 153);
  // UCS-2 is counted in UTF-16 code units, which is exactly String.length.
  return text.length <= 70 ? 1 : Math.ceil(text.length / 67);
}
