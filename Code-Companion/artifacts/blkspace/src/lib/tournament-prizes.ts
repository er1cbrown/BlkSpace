export interface PrizeLadder {
  firstWb: number;
  secondWb: number;
  thirdCosmeticId: string;
  freeClothingTitle: string;
  freeClothingBlurb: string;
}

export function describeLadder(ladder: PrizeLadder): string {
  return `1st ${ladder.firstWb} WB · 2nd ${ladder.secondWb} WB · 3rd ${ladder.thirdCosmeticId}`;
}
