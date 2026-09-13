/* A listing's price, or the words "Price not disclosed" when the poster hid it (the default for new tasks and pieces).
   Never a zero or a dash: an undisclosed price is a choice the poster made, and it reads as one. */
import { MoneyDisplay } from './MoneyDisplay';

interface ListedPriceProps {
  amountMinor: number | null;
  currency: string;
}

/** Render the formatted price, or the undisclosed label. */
export function ListedPrice({ amountMinor, currency }: ListedPriceProps): JSX.Element {
  if (amountMinor === null) {
    return <span className="ui-text-muted">Price not disclosed</span>;
  }
  return <MoneyDisplay amountMinor={amountMinor} currency={currency} />;
}
