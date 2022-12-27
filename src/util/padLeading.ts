export default function (zeroesCount: number, value: number) {
  const strValue = value.toString();
  const zeroesToPad = Math.max(0, zeroesCount - strValue.length);
  return '0'.repeat(zeroesToPad) + value;
}
