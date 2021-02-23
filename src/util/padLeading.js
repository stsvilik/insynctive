export default function(zeroesCount, value) {
    const strValue = value.toString();
    const zeroesToPad = Math.max(0, zeroesCount - strValue.length);
    return "0".repeat(zeroesToPad) + value;
}
