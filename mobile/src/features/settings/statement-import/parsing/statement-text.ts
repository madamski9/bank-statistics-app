const windows1250Letters: Record<number, string> = {
  0x8c: 'Ś',
  0x8f: 'Ź',
  0x9c: 'ś',
  0x9f: 'ź',
  0xa0: ' ',
  0xa3: 'Ł',
  0xa5: 'Ą',
  0xaf: 'Ż',
  0xb3: 'ł',
  0xb9: 'ą',
  0xbf: 'ż',
  0xc6: 'Ć',
  0xca: 'Ę',
  0xd1: 'Ń',
  0xd3: 'Ó',
  0xe6: 'ć',
  0xea: 'ę',
  0xf1: 'ń',
  0xf3: 'ó',
};

const replacementCharacter = '�';

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

function decodeWindows1250(bytes: Uint8Array): string {
  let text = '';

  for (const byte of bytes) {
    text += byte < 0x80 ? String.fromCharCode(byte) : (windows1250Letters[byte] ?? replacementCharacter);
  }

  return text;
}

export function decodeStatementBytes(bytes: Uint8Array): string {
  const utf8 = decodeUtf8(bytes);
  const text = utf8.includes(replacementCharacter) ? decodeWindows1250(bytes) : utf8;

  return text.replace(/^﻿/, '');
}
