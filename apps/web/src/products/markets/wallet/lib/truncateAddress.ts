export function truncateAddress(address: string, leading = 6, trailing = 4): string {
  if (address.length <= leading + trailing + 2) return address;
  return `${address.slice(0, leading)}…${address.slice(-trailing)}`;
}
