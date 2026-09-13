/* A suggested piece, full width: the labor category, the requirements it covers, the savings equation, the pass line,
   the honesty label, why it is provisional, and one large Split off with a quiet Dismiss. Everything behind the figures
   is in "How we got this". Only potential_savings cards the server suggested render here. */
import { Badge, Button, Card, Stack } from '../../../shared/ui';
import type { SavingsCardView } from '../types';
import { CardDetails } from './details/CardDetails';
import { SavingsEquation } from './figures/SavingsEquation';
import { ThresholdPassLine } from './figures/ThresholdPassLine';
import { HonestyLabel } from './labels/HonestyLabel';
import { ProvisionalNote } from './labels/ProvisionalNote';
import './savingsCards.css';

interface HeroSavingsCardProps {
  card: SavingsCardView;
  // Null when Split off is allowed; otherwise the plain reason it isn't (not the owner any more, cap reached).
  splitBlockReason: string | null;
  onSplitOff: () => void;
  onDismiss: () => void;
  onOversightSaved: () => void;
}

/** Render one suggested piece as a hero card. */
export function HeroSavingsCard({ card, splitBlockReason, onSplitOff, onDismiss, onOversightSaved }: HeroSavingsCardProps): JSX.Element {
  return (
    <Card
      actions={<Badge size="md" tone="success">Suggested piece</Badge>}
      as="article"
      className="savings-hero"
      description={`${card.psc} · NAICS ${card.naics}`}
      padding="lg"
      title={card.labor_category}
      titleLevel={3}
    >
      <Stack gap={4}>
        <div>
          <p className="savings-hero__covers">Covers {card.inputs.requirements.length === 1 ? '1 requirement' : `${card.inputs.requirements.length} requirements`}:</p>
          <ul className="savings-requirements">
            {card.inputs.requirements.map((requirement) => <li key={requirement.key}>{requirement.text}</li>)}
          </ul>
        </div>
        <SavingsEquation card={card} size="lg" />
        <ThresholdPassLine card={card} />
        <HonestyLabel card={card} />
        <ProvisionalNote card={card} />
        <div className="savings-actions">
          <Button disabled={splitBlockReason !== null} onClick={onSplitOff} size="lg" variant="primary">Split off</Button>
          <Button onClick={onDismiss} variant="ghost">Dismiss</Button>
          {splitBlockReason ? <span className="ui-text-sm ui-text-muted">{splitBlockReason}</span> : null}
        </div>
        <CardDetails card={card} onOversightSaved={onOversightSaved} />
      </Stack>
    </Card>
  );
}
