/* The Message section of the bid form: an optional note that only the listing owner reads (the public leaderboard
   carries no messages in either bidding mode). */
import { Card, Field, Input } from '../../../../shared/ui';

interface MessageFieldProps {
  message: string;
  onChange: (message: string) => void;
}

/** Render the message card. */
export function MessageField({ message, onChange }: MessageFieldProps): JSX.Element {
  return (
    <Card title="Message">
      {/* Kept a single-line input: a textarea would start sending line breaks the owner's views don't render. */}
      <Field hint="Optional. Only the owner sees it." label="Message to the owner">
        <Input onChange={(event) => onChange(event.target.value)} placeholder="e.g. We already clean two buildings on your block." value={message} />
      </Field>
    </Card>
  );
}
